/* composer.js — sticky bottom chat input. Text + attachments + tags + voice note. */
(function (global) {
  'use strict';
  const { h, toast, ls, debounce, copy, fmtBytes } = window.Util;
  const Icons = window.Icons;
  const Store = window.Store;

  const ALLOWED = [
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/quicktime','video/webm','video/x-matroska','video/x-msvideo',
    'audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav','audio/x-wav','audio/aac','audio/flac','audio/x-m4a',
    'application/vnd.android.package-archive','application/java-archive',
    'application/pdf','application/zip','application/x-zip-compressed',
  ];
  // Common but NOT in the server's allow-list — we'll convert these to JPEG before uploading.
  const CONVERT_TO_JPEG = ['image/heic', 'image/heif', 'image/avif', 'image/tiff', 'image/bmp'];

  const state = {
    files: [],          // { id, file, name, mime, size, progress, uploaded, mediaId, error, thumb }
    tags: [],
    replyTo: null,      // post being replied to
    sending: false,
  };

  let hostEl = null, taEl = null, fileInputEl = null, tagsWrapEl = null;

  function mount(host) {
    if (hostEl) return;
    hostEl = host;
    hostEl.innerHTML = '';

    const composer = h('div', { class: 'composer' });
    const replyBar = h('div', { id: 'composerReply', style: { display: 'none', padding: '4px 12px 0', fontSize: '12px', color: 'var(--text-dim)' } });
    const attsWrap = h('div', { class: 'attachments' });
    const row = h('div', { class: 'row' });

    const tools = h('div', { class: 'tools' }, [
      attachBtn(),
      micBtn(),
    ]);
    const inputWrap = h('div', { class: 'input-wrap' });
    taEl = h('textarea', { id: 'composerText', rows: '1', placeholder: 'Write a thought…' });
    taEl.addEventListener('input', autoresize);
    taEl.addEventListener('keydown', onKey);

    const meta = h('div', { class: 'input-meta' });
    tagsWrapEl = h('div', { class: 'tags' });
    const tagInput = h('input', { class: 'tag-input', placeholder: '#tag', maxlength: 24 });
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
        e.preventDefault();
        const v = tagInput.value.trim().replace(/^#/, '').toLowerCase();
        if (v && !state.tags.includes(v) && state.tags.length < 10) state.tags.push(v);
        tagInput.value = '';
        renderTags();
      } else if (e.key === 'Backspace' && !tagInput.value && state.tags.length) {
        state.tags.pop(); renderTags();
      }
    });
    meta.append(tagsWrapEl, tagInput);

    inputWrap.append(taEl, meta);

    const sendBtn = h('button', { class: 'send', id: 'composerSend', title: 'Send (Enter)' }, [Icons.send()]);
    sendBtn.addEventListener('click', submit);

    row.append(tools, inputWrap, sendBtn);
    composer.append(replyBar, attsWrap, row);
    hostEl.appendChild(composer);

    // File picker
    fileInputEl = h('input', { type: 'file', multiple: true, accept: 'image/*,video/*,audio/*,application/pdf,application/zip,application/vnd.android.package-archive,.heic,.heif', style: { display: 'none' } });
    fileInputEl.addEventListener('change', () => {
      const files = Array.from(fileInputEl.files || []);
      files.forEach(addFile);
      fileInputEl.value = '';
    });
    document.body.appendChild(fileInputEl);

    renderReply();
    renderTags();
  }

  function attachBtn() {
    return h('button', { class: 'icon-btn', title: 'Attach files', onclick: () => fileInputEl.click() }, [Icons.attach()]);
  }
  function micBtn() {
    return h('button', { class: 'icon-btn', title: 'Record voice note', onclick: () => Recorder.open() }, [Icons.mic()]);
  }

  function autoresize() {
    taEl.style.height = 'auto';
    taEl.style.height = Math.min(140, taEl.scrollHeight) + 'px';
  }
  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function addFile(file) {
    if (!file) return;
    // iOS sometimes gives empty mime for camera-roll images — guess it from extension.
    let mime = file.type;
    if (!mime) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const guess = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4a: 'audio/x-m4a', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', pdf: 'application/pdf', zip: 'application/zip', apk: 'application/vnd.android.package-archive' };
      mime = guess[ext] || '';
      try { Object.defineProperty(file, 'type', { value: mime, configurable: true }); } catch {}
    }

    if (CONVERT_TO_JPEG.includes(mime)) {
      // Heic/avif/tiff → JPEG (server doesn't accept them).
      convertToJpeg(file).then((converted) => {
        const entry = makeEntry(converted, converted.name);
        state.files.push(entry);
        renderAttachments();
        toast('Converted to JPEG for upload', '', 1500);
      }).catch((e) => {
        toast('Couldn\'t convert image: ' + e.message, 'error');
      });
      return;
    }

    if (!ALLOWED.includes(mime)) {
      toast('Unsupported file type: ' + (mime || 'unknown') + ' — server allows: jpg, png, gif, webp, svg, mp4, mov, webm, mp3, m4a, wav, pdf, zip, apk', 'error', 5000);
      return;
    }
    if (file.size > 500 * 1024 * 1024) { toast('File too large (>500MB)', 'error'); return; }

    const entry = makeEntry(file, file.name);
    state.files.push(entry);
    renderAttachments();
  }

  function makeEntry(file, name) {
    return { id: Util.uid('f'), file, name, mime: file.type, size: file.size, progress: 0, uploaded: false, error: null, mediaId: null };
  }

  // Convert HEIC/HEIF/AVIF/TIFF/BMP to JPEG using a canvas.
  // This works because iOS Safari decodes HEIC natively into an <img>.
  async function convertToJpeg(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('decode failed'));
        i.src = url;
      });
      // Downscale if huge (camera images can be 12MP+)
      const max = 2048;
      const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
      if (!blob) throw new Error('canvas toBlob failed');
      const newName = (file.name.replace(/\.[^.]+$/, '') || 'image') + '.jpg';
      return new File([blob], newName, { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function removeFile(id) {
    const i = state.files.findIndex((f) => f.id === id);
    if (i >= 0) {
      if (state.files[i]._objectUrl) URL.revokeObjectURL(state.files[i]._objectUrl);
      state.files.splice(i, 1);
      renderAttachments();
    }
  }

  function renderAttachments() {
    const attsWrap = hostEl.querySelector('.attachments');
    attsWrap.innerHTML = '';
    state.files.forEach((f) => {
      const tile = h('div', { class: 'att', title: f.name });
      if (f.mime.startsWith('image/')) {
        const img = document.createElement('img');
        if (f._objectUrl) URL.revokeObjectURL(f._objectUrl);
        f._objectUrl = URL.createObjectURL(f.file);
        img.src = f._objectUrl;
        tile.appendChild(img);
      } else {
        tile.appendChild(h('div', { class: 'lbl', text: f.name.slice(0, 22) + (f.name.length > 22 ? '…' : '') + '\n' + fmtBytes(f.size) }));
      }
      tile.appendChild(h('button', { class: 'x', onclick: () => removeFile(f.id), text: '×' }));
      if (!f.uploaded) {
        const p = h('div', { class: 'progress' }, [h('i', { style: { width: Math.round(f.progress * 100) + '%' } })]);
        tile.appendChild(p);
      }
      attsWrap.appendChild(tile);
    });
  }

  function renderTags() {
    if (!tagsWrapEl) return;
    tagsWrapEl.innerHTML = '';
    state.tags.forEach((t, i) => {
      const pill = h('span', { class: 'tag-pill' }, [
        '#' + t,
        h('button', { onclick: () => { state.tags.splice(i, 1); renderTags(); }, text: '×' }),
      ]);
      tagsWrapEl.appendChild(pill);
    });
  }

  function renderReply() {
    const bar = document.getElementById('composerReply');
    if (!bar) return;
    if (state.replyTo) {
      bar.style.display = 'block';
      bar.innerHTML = '';
      const t = state.replyTo.content || '[media]';
      bar.append(
        h('div', {}, [
          h('span', { text: 'Replying to: ' }),
          h('strong', { text: t.length > 60 ? t.slice(0, 60) + '…' : t }),
        ]),
        h('button', { class: 'icon-btn', style: { marginLeft: 'auto' }, onclick: clearReply, title: 'Cancel reply' }, [Icons.close()])
      );
    } else {
      bar.style.display = 'none';
    }
  }

  function setReply(post) {
    state.replyTo = post;
    renderReply();
  }
  function clearReply() {
    state.replyTo = null;
    renderReply();
  }

  function reset() {
    state.files = []; state.tags = []; state.replyTo = null;
    if (taEl) { taEl.value = ''; autoresize(); }
    renderAttachments(); renderTags(); renderReply();
  }

  /* ---------- submit flow (two-step: post then attach) ---------- */
  async function submit() {
    if (state.sending) return;
    const content = (taEl.value || '').trim();
    if (!content && state.files.length === 0) { toast('Write something or attach a file', 'error'); return; }

    state.sending = true;
    const sendBtn = document.getElementById('composerSend');
    if (sendBtn) sendBtn.disabled = true;
    try {
      // 1) Create the post
      const { post } = await Api.createPost({
        content: content || null,
        parentId: state.replyTo ? state.replyTo.id : null,
        tags: state.tags.slice(0, 10),
      });
      Store.upsertPost(post);

      // 2) Upload each file with post_id
      for (const f of state.files) {
        try {
          await Api.upload(f.file, post.id, (frac) => { f.progress = frac; renderAttachments(); });
          f.uploaded = true; f.progress = 1;
        } catch (e) {
          f.error = e.body?.error || e.message;
          toast('Upload failed: ' + f.name + ' (' + f.error + ')', 'error', 4000);
        }
      }
      renderAttachments();

      // 3) Refetch to get the media list (don't trust POST response per spec)
      try {
        const { post: fresh } = await Api.getPost(post.id);
        Store.upsertPost(fresh);
        if (state.replyTo && state.replyTo.id) {
          const { post: parentFresh } = await Api.getPost(state.replyTo.id);
          Store.setReplies(state.replyTo.id, parentFresh.replies || []);
        }
      } catch {}

      reset();
      App.refreshTabBadges();
      // Force re-render
      Feed.render();
      // If we're in a thread, refresh
      if (window.Thread && document.querySelector('.view[data-view="thread"].active')) Thread.refresh();

      // Scroll to bottom only if user is already near the bottom (chat-app feel)
      const s = document.getElementById('homeScroll');
      if (s) {
        const nearBottom = (s.scrollHeight - s.scrollTop - s.clientHeight) < 200;
        if (nearBottom) s.scrollTop = s.scrollHeight;
      }

      toast('Entry saved', 'success', 1500);
    } catch (e) {
      toast('Couldn\'t post: ' + (e.body?.detail || e.message), 'error', 5000);
    } finally {
      state.sending = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  global.Composer = { mount, setReply, clearReply, reset, addFile };
})(window);
