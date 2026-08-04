/* composer.js — bottom composer: text + attachments + voice + tags */
(function (global) {
  'use strict';
  const { h, toast, uid, fmtBytes, sheet, closeSheet, confirm } = global.U;
  const S = global.S;
  const I = global.I;

  const ALLOWED = new Set([
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/quicktime','video/webm','video/x-matroska','video/x-msvideo',
    'audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav','audio/x-wav','audio/aac','audio/flac','audio/x-m4a',
    'application/vnd.android.package-archive','application/java-archive',
    'application/pdf','application/zip','application/x-zip-compressed',
  ]);
  const CONVERT = new Set(['image/heic','image/heif','image/avif','image/tiff','image/bmp']);

  const state = { files: [], tags: [], replyTo: null, sending: false };
  let host, ta, fileInput, attsEl, tagsEl, replyEl, sendBtn;

  function mount(el) {
    host = el;
    host.innerHTML = '';
    host.className = 'composer';

    replyEl = h('div', { class: 'reply-bar', style: { display: 'none' } });
    attsEl = h('div', { class: 'atts' });
    tagsEl = h('div', { class: 'tags-row' });

    const tagInput = h('input', { type: 'text', placeholder: 'add tag…', maxlength: '24' });
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
    tagsEl.appendChild(tagInput);

    ta = h('textarea', { id: 'cText', rows: '1', placeholder: 'Write a thought…' });
    ta.addEventListener('input', autoresize);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    });

    sendBtn = h('button', { class: 'btn-send', title: 'Send', onclick: submit }, [I.send(18)]);
    const attBtn = h('button', { class: 'btn-icon', title: 'Attach files', onclick: () => fileInput.click() }, [I.attach(22)]);
    const micBtn = h('button', { class: 'btn-icon', title: 'Voice note', onclick: () => Recorder.open() }, [I.mic(22)]);

    fileInput = h('input', { type: 'file', multiple: true, accept: 'image/*,video/*,audio/*,application/pdf,application/zip,application/vnd.android.package-archive', style: { display: 'none' } });
    fileInput.addEventListener('change', () => {
      for (const f of Array.from(fileInput.files || [])) addFile(f);
      fileInput.value = '';
    });
    document.body.appendChild(fileInput);

    const row = h('div', { class: 'row' }, [attBtn, ta, sendBtn, micBtn]);

    host.append(replyEl, attsEl, row, tagsEl);

    renderReply(); renderTags(); renderAtts();
  }

  function autoresize() {
    ta.style.height = 'auto';
    ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
  }

  function addFile(file) {
    if (!file) return;
    let mime = file.type;
    if (!mime) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const g = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', heic:'image/heic', heif:'image/heif', mp4:'video/mp4', mov:'video/quicktime', webm:'video/webm', m4a:'audio/x-m4a', mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', pdf:'application/pdf', zip:'application/zip', apk:'application/vnd.android.package-archive' };
      mime = g[ext] || '';
      try { Object.defineProperty(file, 'type', { value: mime, configurable: true }); } catch {}
    }
    if (CONVERT.has(mime)) {
      convertToJpeg(file).then((out) => {
        state.files.push({ id: uid('f'), file: out, name: out.name, mime: 'image/jpeg', size: out.size, progress: 0, uploaded: false });
        renderAtts();
        toast('Converted HEIC to JPEG', '', 1500);
      }).catch((e) => toast('Couldn\'t convert image: ' + e.message, 'error'));
      return;
    }
    if (!ALLOWED.has(mime)) {
      toast('Type "' + (mime || 'unknown') + '" not allowed. Use jpg/png/gif/webp, mp4/mov/webm, mp3/m4a/wav, pdf, zip, or apk.', 'error', 5000);
      return;
    }
    if (file.size > 500 * 1024 * 1024) { toast('File too large (>500MB)', 'error'); return; }
    state.files.push({ id: uid('f'), file, name: file.name, mime, size: file.size, progress: 0, uploaded: false });
    renderAtts();
  }

  function removeFile(id) {
    const i = state.files.findIndex((f) => f.id === id);
    if (i >= 0) { if (state.files[i]._objUrl) URL.revokeObjectURL(state.files[i]._objUrl); state.files.splice(i, 1); renderAtts(); }
  }

  function renderAtts() {
    attsEl.innerHTML = '';
    for (const f of state.files) {
      const tile = h('div', { class: 'att' });
      if (f.mime.startsWith('image/')) {
        const img = new Image();
        if (f._objUrl) URL.revokeObjectURL(f._objUrl);
        f._objUrl = URL.createObjectURL(f.file);
        img.src = f._objUrl;
        tile.appendChild(img);
      } else {
        tile.appendChild(h('div', { class: 'lbl', text: f.name + '\n' + fmtBytes(f.size) }));
      }
      tile.appendChild(h('button', { class: 'x', text: '×', onclick: () => removeFile(f.id) }));
      if (!f.uploaded && f.progress > 0) tile.appendChild(h('div', { class: 'pr' }, [h('i', { style: { width: (f.progress * 100) + '%' } })]));
      attsEl.appendChild(tile);
    }
  }

  function renderTags() {
    // keep tag input as the last child
    tagsEl.querySelectorAll('.pill').forEach((n) => n.remove());
    const input = tagsEl.querySelector('input');
    state.tags.forEach((t, i) => {
      const pill = h('span', { class: 'pill' }, ['#' + t, h('button', { text: '×', onclick: () => { state.tags.splice(i, 1); renderTags(); } })]);
      tagsEl.insertBefore(pill, input);
    });
  }

  function setReply(post) {
    state.replyTo = post;
    renderReply();
  }
  function clearReply() { state.replyTo = null; renderReply(); }

  function renderReply() {
    if (!replyEl) return;
    if (state.replyTo) {
      replyEl.style.display = 'flex';
      replyEl.innerHTML = '';
      const txt = state.replyTo.content || '[media]';
      replyEl.append(
        h('span', { text: 'Replying: ' + (txt.length > 50 ? txt.slice(0, 50) + '…' : txt) }),
        h('button', { class: 'btn-icon', style: { width: '24px', height: '24px', marginLeft: 'auto' }, onclick: clearReply }, [I.close(16)]),
      );
    } else { replyEl.style.display = 'none'; }
  }

  function reset() {
    state.files = []; state.tags = []; state.replyTo = null;
    ta.value = ''; autoresize();
    renderAtts(); renderTags(); renderReply();
  }

  async function convertToJpeg(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode failed')); i.src = url; });
      const max = 2048;
      const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * r);
      const h = Math.round(img.naturalHeight * r);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
      if (!blob) throw new Error('toBlob failed');
      const name = (file.name.replace(/\.[^.]+$/, '') || 'image') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg' });
    } finally { URL.revokeObjectURL(url); }
  }

  async function submit() {
    if (state.sending) return;
    const text = (ta.value || '').trim();
    if (!text && !state.files.length) { toast('Write something or attach a file', 'error'); return; }
    state.sending = true;
    sendBtn.disabled = true;
    try {
      const { post } = await A.create({ content: text || null, parentId: state.replyTo ? state.replyTo.id : null, tags: state.tags.slice(0, 10) });
      S.upsert(post);
      for (const f of state.files) {
        try {
          await A.upload(f.file, post.id, (frac) => { f.progress = frac; renderAtts(); });
          f.uploaded = true; f.progress = 1;
        } catch (e) { toast('Upload failed for ' + f.name + ': ' + e.message, 'error', 4000); }
      }
      // Refetch to get the media
      try { const { post: fresh } = await A.get(post.id); S.upsert(fresh); } catch {}
      if (state.replyTo) {
        try { const { post: parentFresh } = await A.get(state.replyTo.id); S.upsert(parentFresh); } catch {}
      }
      reset();
      // re-render the active view, then scroll the newest post into full view
      if (S.active === 'home') {
        Feed.refresh();
        requestAnimationFrame(() => {
          const sc = document.getElementById('scroll-home');
          if (sc) {
            const last = sc.querySelector('.card:last-of-type');
            if (last) last.scrollIntoView({ block: 'end' });
            else sc.scrollTop = sc.scrollHeight;
          }
        });
      } else if (S.active === 'thread') Thread.refresh();
      App.refreshCounts();
      toast('Saved', 'success', 1200);
    } catch (e) {
      toast('Couldn\'t post: ' + e.message, 'error', 4000);
    } finally {
      state.sending = false;
      sendBtn.disabled = false;
    }
  }

  global.Composer = { mount, addFile, setReply, clearReply, reset, submit };
})(window);
