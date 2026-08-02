/* feed.js — chat-style feed, newest at the BOTTOM */
(function (global) {
  'use strict';
  const { h, esc, linkify, smartTime, dayHeader, fmtBytes, fmtDur, copy, saveAs, toast, ls, uid, sheet, closeSheet, confirm } = global.U;
  const S = global.S;
  const I = global.I;

  let scrollEl, feedEl, loading = false;

  function mount() { /* shell is set up by app.js; this is a no-op */ }

  function getScroll() { return document.getElementById('scroll-home'); }

  function pickMe(post) {
    // alternate for visual variety, but consistent per post id
    return (post.id.charCodeAt(0) % 2) === 0;
  }

  async function refresh() {
    scrollEl = getScroll();
    if (!scrollEl) return;
    feedEl = document.createElement('div');
    feedEl.className = 'feed';
    scrollEl.innerHTML = '';
    scrollEl.appendChild(feedEl);
    S.posts = []; S.cursor = null; S.done = false; S.byId = {};
    await loadMore();
    // scroll to bottom (newest)
    requestAnimationFrame(() => { scrollEl.scrollTop = scrollEl.scrollHeight; });
  }

  async function loadMore() {
    if (loading || S.done) return;
    loading = true;
    try {
      const { posts, next_cursor } = await A.list(S.cursor, 20);
      for (const p of posts) S.upsert(p);
      S.cursor = next_cursor; S.done = next_cursor == null;
      render();
    } catch (e) { toast('Couldn\'t load: ' + e.message, 'error'); }
    finally { loading = false; }
  }

  function render() {
    if (!feedEl) return;
    feedEl.innerHTML = '';
    if (!S.posts.length) {
      feedEl.appendChild(h('div', { class: 'empty' }, [
        h('div', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>' }),
        h('h3', { text: 'No entries yet' }),
        h('p', { text: 'Write your first thought, attach a photo, or record a voice note.' }),
      ]));
      return;
    }
    let lastDay = '';
    const frag = document.createDocumentFragment();
    for (const post of S.posts) {
      const day = new Date(post.created_at).toDateString();
      if (day !== lastDay) { frag.appendChild(h('div', { class: 'day', text: dayHeader(post.created_at) })); lastDay = day; }
      frag.appendChild(renderPost(post, { isMe: pickMe(post) }));
    }
    feedEl.appendChild(frag);
    if (S.done) feedEl.appendChild(h('div', { class: 'day', text: '— end —' }));
  }

  function renderPost(post, { isMe, parent, depth = 0 } = {}) {
    const me = isMe !== undefined ? isMe : pickMe(post);
    const pinned = S.isPinned(post.id);
    const row = h('div', { class: 'bubble-row' + (me ? ' me' : '') });

    const inner = h('div', { style: { maxWidth: '85%' } });
    if (parent) {
      const txt = parent.content || (parent.media?.length ? `[${parent.media[0].type}]` : 'Post');
      inner.appendChild(h('div', { class: 'quote', onclick: () => openThread(parent.id) }, [
        h('div', { class: 'who', text: 'Replying' }),
        h('div', { class: 'what', text: txt }),
      ]));
    }
    if (post.content) {
      const b = h('div', { class: 'bubble' });
      b.innerHTML = linkify(post.content);
      inner.appendChild(b);
    }
    if (post.media?.length) inner.appendChild(renderMedia(post.media));
    if (post.tags?.length) {
      const tags = h('div', { class: 'tags' });
      for (const t of post.tags) tags.appendChild(h('span', { class: 'tag', text: '#' + t, onclick: () => { S.filterTag = t; App.go('home'); } }));
      inner.appendChild(tags);
    }
    const meta = h('div', { class: 'meta' }, [
      h('span', { text: smartTime(post.created_at) }),
      post.updated_at && post.updated_at !== post.created_at ? h('span', { class: 'dot' }) : null,
      post.updated_at && post.updated_at !== post.created_at ? h('span', { text: 'edited' }) : null,
      pinned ? h('span', { class: 'pin', text: '★ pinned' }) : null,
    ]);
    inner.appendChild(meta);

    inner.addEventListener('click', (e) => {
      if (e.target.closest('.quote') || e.target.closest('.tag') || e.target.closest('.media-cell') || e.target.closest('.play')) return;
      openActions(post, me);
    });
    inner.addEventListener('contextmenu', (e) => { e.preventDefault(); openActions(post, me); });
    let pressTimer;
    inner.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openActions(post, me), 600); }, { passive: true });
    inner.addEventListener('touchend', () => clearTimeout(pressTimer));
    inner.addEventListener('touchmove', () => clearTimeout(pressTimer));

    row.appendChild(inner);
    if (depth > 0) {
      const wrap = h('div', { class: 'children' }, [row]);
      return wrap;
    }
    return row;
  }

  function renderMedia(media) {
    const n = media.length;
    const cls = n === 1 ? 'c1' : n === 2 ? 'c2' : n === 3 ? 'c3' : 'c4';
    const grid = h('div', { class: 'media ' + cls });
    for (const m of media) grid.appendChild(renderCell(m));
    return grid;
  }

  function renderCell(m) {
    if (m.type === 'image') {
      const cell = h('div', { class: 'media-cell', onclick: () => openLightbox(m) });
      const img = new Image();
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = m.filename || '';
      img.src = thumb(m.url, 320);
      cell.appendChild(img);
      return cell;
    }
    if (m.type === 'video') {
      const cell = h('div', { class: 'media-cell', onclick: () => openLightbox(m) });
      const v = document.createElement('video');
      v.src = m.url; v.muted = true; v.playsInline = true; v.preload = 'metadata';
      v.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      v.addEventListener('loadeddata', () => { try { v.currentTime = 0.05; } catch {} }, { once: true });
      cell.appendChild(v);
      cell.appendChild(h('div', { class: 'play', html: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16l14-8z"/></svg>' }));
      return cell;
    }
    if (m.type === 'audio' || m.type === 'voice_note') return renderAudio(m);
    return renderFile(m);
  }

  function renderAudio(m) {
    const wrap = h('div', { class: 'audio' });
    const play = h('button', { class: 'play' }, [I.play(16)]);
    const wave = h('div', { class: 'wave' });
    for (let i = 0; i < 24; i++) {
      const px = 4 + Math.round(Math.random() * 16);
      wave.appendChild(h('span', { style: { height: px + 'px' } }));
    }
    const time = h('div', { class: 'time', text: '—' });
    const audio = new Audio(m.url);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => { time.textContent = fmtDur(audio.duration); });
    play.addEventListener('click', () => {
      if (audio.paused) { audio.play().catch(() => {}); play.innerHTML = ''; play.appendChild(pauseIcon()); }
      else { audio.pause(); play.innerHTML = ''; play.appendChild(I.play(16)); }
    });
    audio.addEventListener('ended', () => { play.innerHTML = ''; play.appendChild(I.play(16)); });
    wrap.append(play, wave, time);
    return wrap;
  }

  function pauseIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '16'); s.setAttribute('height', '16'); s.setAttribute('fill', 'currentColor');
    s.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
    return s;
  }

  function renderFile(m) {
    const cell = h('div', { class: 'file', onclick: () => saveAs(m.url, m.filename || 'file') }, [
      h('div', { class: 'ic' }, [I.file(18)]),
      h('div', { style: { flex: '1', minWidth: '0' } }, [
        h('div', { class: 'name', text: m.filename || 'file' }),
        h('div', { class: 'sz', text: fmtBytes(m.size) }),
      ]),
    ]);
    return cell;
  }

  function thumb(url, w) {
    if (!url) return url;
    try { const u = new URL(url); u.searchParams.set('w', String(w)); u.searchParams.set('q', '65'); return u.toString(); }
    catch { return url; }
  }

  function openThread(id) { S.threadId = id; App.go('thread'); }

  function openActions(post, me) {
    const pinned = S.isPinned(post.id);
    const items = [
      item(I.reply(20), 'Reply', () => { Composer.setReply(post); App.go('home'); setTimeout(() => document.getElementById('cText')?.focus(), 30); }),
      item(pinned ? I.pinOn(20) : I.pin(20), pinned ? 'Unpin' : 'Pin', () => { S.pin(post.id); toast(pinned ? 'Unpinned' : 'Pinned', '', 1200); App.refreshCounts(); render(); }),
      item(I.copy(20), 'Copy text', () => { copy((post.content || '') + (post.tags?.length ? '\n#' + post.tags.join(' #') : '')).then((ok) => toast(ok ? 'Copied' : 'Copy failed', ok ? 'success' : 'error')); }),
      item(I.media(20), 'Open thread', () => openThread(post.id)),
      item(I.edit(20), 'Edit', () => editPost(post)),
      item(I.export_(20), 'Export as JSON', () => {
        const blob = new Blob([JSON.stringify(post, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        saveAs(url, 'post_' + post.id + '.json'); URL.revokeObjectURL(url);
      }),
      item(I.trash(20), 'Delete', () => confirmDelete(post), true),
    ];
    sheet(items, 'Entry');
  }

  function item(icon, label, onclick, danger) {
    return h('button', { class: 'item' + (danger ? ' danger' : ''), onclick }, [icon, h('span', { text: label })]);
  }

  async function editPost(post) {
    const ta = h('textarea', { rows: '5', style: { minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' } });
    ta.value = post.content || '';
    const tagsInp = h('input', { type: 'text', placeholder: 'comma,separated,tags', value: (post.tags || []).join(', ') });
    const wrap = h('div', { style: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' } }, [ta, tagsInp]);
    const s = sheet([
      h('h2', { text: 'Edit entry' }),
      wrap,
      h('div', { class: 'actions' }, [
        h('button', { class: 'ghost', text: 'Cancel', onclick: () => closeSheet(s) }),
        h('button', { class: 'primary', text: 'Save', onclick: async () => {
          const content = ta.value.trim() || null;
          const tagArr = tagsInp.value.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean).slice(0, 10);
          try {
            const updated = await A.update(post.id, { content, tags: tagArr });
            S.upsert(updated);
            render();
            closeSheet(s);
            toast('Saved', 'success');
          } catch (e) { toast('Save failed: ' + e.message, 'error'); }
        }}),
      ]),
    ]);
  }

  async function confirmDelete(post) {
    const ok = await confirm({ title: 'Delete this entry?', body: 'Media will be removed too. This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await A.del(post.id);
      S.remove(post.id);
      render();
      toast('Deleted', 'success');
      App.refreshCounts();
    } catch (e) {
      if (e.status === 409 && e.body?.reply_ids?.length) {
        const ok2 = await confirm({ title: 'Delete ' + e.body.reply_ids.length + ' replies first?', confirmText: 'Delete all', danger: true });
        if (!ok2) return;
        for (const rid of e.body.reply_ids) { try { await A.del(rid); S.remove(rid); } catch {} }
        try { await A.del(post.id); S.remove(post.id); render(); toast('Deleted', 'success'); } catch (e2) { toast('Delete failed: ' + e2.message, 'error'); }
      } else { toast('Delete failed: ' + e.message, 'error'); }
    }
  }

  function openLightbox(m) {
    const back = h('div', { class: 'lightbox open' });
    const top = h('div', { class: 'top' }, [
      h('button', { class: 'btn-icon', style: { color: '#fff' }, onclick: () => back.remove() }, [I.close(22)]),
      h('div', { class: 'name', text: m.filename || m.type }),
      h('button', { class: 'btn-icon', style: { color: '#fff' }, onclick: () => saveAs(m.url, m.filename || 'file') }, [I.export_(22)]),
    ]);
    const stage = h('div', { class: 'stage' });
    if (m.type === 'image') {
      const img = new Image(); img.src = m.url; img.alt = m.filename || ''; stage.appendChild(img);
    } else if (m.type === 'video') {
      const v = document.createElement('video'); v.src = m.url; v.controls = true; v.autoplay = true; v.playsInline = true; stage.appendChild(v);
    } else if (m.type === 'audio' || m.type === 'voice_note') {
      const a = document.createElement('audio'); a.src = m.url; a.controls = true; a.autoplay = true; a.style.width = '90%'; stage.appendChild(a);
    } else {
      stage.appendChild(h('a', { href: m.url, target: '_blank', rel: 'noopener', text: 'Open ' + (m.filename || 'file'), style: { color: '#fff' } }));
    }
    back.append(top, stage);
    document.body.appendChild(back);
    back.addEventListener('click', (e) => { if (e.target === back) back.remove(); });
  }

  // Initialise infinite scroll: load older as user scrolls up
  function initScroll() {
    const sc = getScroll();
    if (!sc || sc.dataset.inited) return;
    sc.dataset.inited = '1';
    sc.addEventListener('scroll', () => { if (sc.scrollTop < 60) loadMore(); });
  }

  global.Feed = { mount, refresh, render, renderPost, openThread, openLightbox, initScroll };
})(window);
