/* feed.js — Threads-style timeline, newest at the BOTTOM */
(function (global) {
  'use strict';
  const { h, esc, linkify, smartTime, dayHeader, fmtBytes, fmtDur, copy, saveAs, toast, ls, uid, sheet, closeSheet, confirm } = global.U;
  const S = global.S;
  const I = global.I;

  let loading = false;

  function mount() {}

  function getScroll() { return document.getElementById('scroll-home'); }

  function isMe(post) {
    return (post.id.charCodeAt(0) % 2) === 0;
  }

  function initials(name) {
    return (name || '?').trim().slice(0, 1).toUpperCase();
  }

  async function refresh() {
    const sc = getScroll();
    if (!sc) return;
    sc.innerHTML = '';
    const feed = h('div', { class: 'feed' });
    sc.appendChild(feed);
    S.posts = []; S.cursor = null; S.done = false; S.byId = {};
    await loadMore(feed);
    // Scroll so the newest post is fully visible at the bottom
    requestAnimationFrame(() => scrollToBottom(sc, true));
    initScroll(feed);
  }

  // Scroll the newest post into view, fully visible above the composer
  function scrollToBottom(sc, smooth) {
    const last = sc.querySelector('.card:last-of-type') || sc.querySelector('.day-stamp:last-of-type') || sc.lastElementChild;
    if (last) {
      last.scrollIntoView({ block: 'end', behavior: smooth ? 'auto' : 'auto' });
    } else {
      sc.scrollTop = sc.scrollHeight;
    }
  }

  async function loadMore(feed) {
    if (loading || S.done) return;
    loading = true;
    try {
      const { posts, next_cursor } = await A.list(S.cursor, 20);
      for (const p of posts) S.upsert(p);
      S.cursor = next_cursor; S.done = next_cursor == null;
      render(feed);
    } catch (e) { toast('Couldn\'t load: ' + e.message, 'error'); }
    finally { loading = false; }
  }

  function initScroll(feed) {
    const sc = getScroll();
    if (!sc || sc.dataset.inited) return;
    sc.dataset.inited = '1';
    sc.addEventListener('scroll', () => { if (sc.scrollTop < 60) loadMore(feed); });
  }

  function render(feed) {
    if (!feed) feed = getScroll()?.querySelector('.feed');
    if (!feed) return;
    feed.innerHTML = '';
    if (!S.posts.length) {
      feed.appendChild(h('div', { class: 'empty' }, [
        h('div', { html: iconSvg('M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z M8 9h8 M8 13h8 M8 17h5') }),
        h('h3', { text: 'Your journal is empty' }),
        h('p', { text: 'Write your first thought, attach a photo, or record a voice note below.' }),
      ]));
      return;
    }
    let lastDay = '';
    for (const post of S.posts) {
      const d = new Date(post.created_at).toDateString();
      if (d !== lastDay) { feed.appendChild(h('div', { class: 'day-stamp', text: dayHeader(post.created_at) })); lastDay = d; }
      feed.appendChild(renderPost(post));
    }
    if (S.done) feed.appendChild(h('div', { class: 'end-mark', text: '— you\'ve reached the start —' }));
  }

  /* ---------- Card (Threads-style) ---------- */
  function renderPost(post, { parent, depth = 0 } = {}) {
    const me = isMe(post);
    const pinned = S.isPinned(post.id);
    const card = h('article', { class: 'card' + (pinned ? ' pinned' : ''), dataset: { id: post.id } });

    // Avatar
    const av = h('div', { class: 'avatar-col' });
    const avBubble = h('div', { class: 'avatar' + (me ? ' me' : '') });
    if (S.avatar && me) { const img = new Image(); img.src = S.avatar; avBubble.appendChild(img); }
    else if (me) avBubble.appendChild(h('span', { text: initials(S.displayName) }));
    else avBubble.appendChild(h('span', { text: '·' }));
    av.appendChild(avBubble);
    card.appendChild(av);

    // Body
    const body = h('div', { class: 'body-col' });

    // Quote (if reply)
    if (parent) {
      const txt = parent.content || (parent.media?.length ? `[${parent.media[0].type}]` : 'Post');
      body.appendChild(h('div', { class: 'quote', onclick: (e) => { e.stopPropagation(); openThread(parent.id); } }, [
        h('div', { class: 'qh', text: 'Replying to ' + (parent.id.charCodeAt(0) % 2 === 0 ? (S.displayName || 'You') : 'self') }),
        h('div', { class: 'qb', text: txt }),
      ]));
    }

    // Header row: name + handle + time
    const r1 = h('div', { class: 'row1' }, [
      h('span', { class: 'name', text: me ? (S.displayName || 'You') : 'You' }),
      h('span', { class: 'handle', text: me ? '@you' : '@me' }),
      h('span', { class: 'dot-sep', text: '·' }),
      h('span', { class: 'time-ago', text: smartTime(post.created_at) }),
      pinned ? h('span', { class: 'pin-badge', text: '★ Pinned' }) : null,
      h('button', { class: 'menu-btn', onclick: (e) => { e.stopPropagation(); openActions(post, me); }, title: 'More' }, [I.more(18)]),
    ]);
    body.appendChild(r1);

    // Text
    if (post.content) {
      const t = h('div', { class: 'text' });
      t.innerHTML = linkify(post.content);
      body.appendChild(t);
    }

    // Media
    if (post.media?.length) body.appendChild(renderMedia(post.media));

    // Tags
    if (post.tags?.length) {
      const tags = h('div', { class: 'tags' });
      for (const t of post.tags) tags.appendChild(h('span', { class: 'tag', text: t }));
      body.appendChild(tags);
    }

    // Actions
    const replyCount = countReplies(post);
    const acts = h('div', { class: 'actions' }, [
      h('button', { title: 'Reply', onclick: (e) => { e.stopPropagation(); Composer.setReply(post); App.go('home'); setTimeout(() => document.getElementById('cText')?.focus(), 30); } }, [I.reply(18), replyCount > 0 ? h('span', { text: replyCount }) : null]),
      h('button', { title: pinned ? 'Unpin' : 'Pin', class: 'pin' + (pinned ? ' on' : ''), onclick: (e) => { e.stopPropagation(); S.pin(post.id); toast(pinned ? 'Unpinned' : 'Pinned', '', 1200); App.refreshCounts(); render(); } }, [pinned ? I.pinOn(18) : I.pin(18)]),
      h('button', { title: 'Open thread', onclick: (e) => { e.stopPropagation(); openThread(post.id); } }, [I.media(18)]),
      h('button', { title: 'More', onclick: (e) => { e.stopPropagation(); openActions(post, me); } }, [I.more(18)]),
    ]);
    body.appendChild(acts);

    // Open thread on body click
    body.addEventListener('click', (e) => {
      if (e.target.closest('.actions') || e.target.closest('.quote') || e.target.closest('.tag') || e.target.closest('.media-cell') || e.target.closest('.play')) return;
      openThread(post.id);
    });
    body.addEventListener('contextmenu', (e) => { e.preventDefault(); openActions(post, me); });
    let pressT;
    body.addEventListener('touchstart', () => { pressT = setTimeout(() => openActions(post, me), 600); }, { passive: true });
    body.addEventListener('touchend', () => clearTimeout(pressT));
    body.addEventListener('touchmove', () => clearTimeout(pressT));

    card.appendChild(body);

    if (depth > 0) {
      const wrap = h('div', { class: 'children' }, [card]);
      return wrap;
    }
    return card;
  }

  function countReplies(post) {
    let n = 0;
    function walk(arr) { for (const r of arr) { n++; if (r.replies?.length) walk(r.replies); } }
    if (post.replies?.length) walk(post.replies);
    return n;
  }

  function renderMedia(media) {
    const n = media.length;
    const cls = n === 1 ? 'c1' : n === 2 ? 'c2' : n === 3 ? 'c3' : 'c4';
    const grid = h('div', { class: 'media ' + cls });
    for (let i = 0; i < media.length; i++) grid.appendChild(renderCell(media[i], i, n));
    return grid;
  }

  function renderCell(m, i, total) {
    if (m.type === 'image') {
      const cell = h('div', { class: 'media-cell' + (total === 1 ? ' tall' : ''), onclick: (e) => { e.stopPropagation(); openLightbox(m); } });
      const img = new Image();
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = m.filename || '';
      img.src = thumb(m.url, 600);
      cell.appendChild(img);
      return cell;
    }
    if (m.type === 'video') {
      const cell = h('div', { class: 'media-cell', onclick: (e) => { e.stopPropagation(); openLightbox(m); } });
      const v = document.createElement('video');
      v.src = m.url; v.muted = true; v.playsInline = true; v.preload = 'metadata';
      v.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      v.addEventListener('loadeddata', () => { try { v.currentTime = 0.05; } catch {} }, { once: true });
      cell.appendChild(v);
      cell.appendChild(h('div', { class: 'play' }, [h('div', { class: 'g', html: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16l14-8z"/></svg>' })]));
      return cell;
    }
    if (m.type === 'audio' || m.type === 'voice_note') return renderAudio(m);
    return renderFile(m);
  }

  function renderAudio(m) {
    const wrap = h('div', { class: 'audio-row' });
    const play = h('button', { class: 'play' }, [I.play(16)]);
    const wave = h('div', { class: 'wave' });
    for (let i = 0; i < 28; i++) {
      const px = 4 + Math.round(Math.random() * 16);
      wave.appendChild(h('span', { style: { height: px + 'px' } }));
    }
    const time = h('div', { class: 'tm', text: '—' });
    const audio = new Audio(m.url);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => { time.textContent = fmtDur(audio.duration); });
    play.addEventListener('click', (e) => {
      e.stopPropagation();
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
    return h('div', { class: 'media-cell file', onclick: (e) => { e.stopPropagation(); saveAs(m.url, m.filename || 'file'); } }, [
      h('div', { class: 'ic' }, [I.file(18)]),
      h('div', { style: { flex: '1', minWidth: '0' } }, [
        h('div', { class: 'nm', text: m.filename || 'file' }),
        h('div', { class: 'sz', text: fmtBytes(m.size) }),
      ]),
    ]);
  }

  function thumb(url, w) {
    if (!url) return url;
    try { const u = new URL(url); u.searchParams.set('w', String(w)); u.searchParams.set('q', '70'); return u.toString(); }
    catch { return url; }
  }

  function openThread(id) { S.threadId = id; App.go('thread'); }

  function openActions(post, me) {
    const pinned = S.isPinned(post.id);
    sheet([
      h('h2', { text: 'Entry' }),
      h('button', { class: 'item', onclick: () => { closeSheet(document.querySelector('.scrim')); Composer.setReply(post); App.go('home'); setTimeout(() => document.getElementById('cText')?.focus(), 30); } }, [I.reply(20), h('span', { text: 'Reply' })]),
      h('button', { class: 'item', onclick: () => { closeSheet(document.querySelector('.scrim')); S.pin(post.id); toast(pinned ? 'Unpinned' : 'Pinned', '', 1200); App.refreshCounts(); render(); } }, [pinned ? I.pinOn(20) : I.pin(20), h('span', { text: pinned ? 'Unpin' : 'Pin' })]),
      h('button', { class: 'item', onclick: () => { closeSheet(document.querySelector('.scrim')); openThread(post.id); } }, [I.media(20), h('span', { text: 'Open thread' })]),
      h('button', { class: 'item', onclick: () => { closeSheet(document.querySelector('.scrim')); copy((post.content || '') + (post.tags?.length ? '\n#' + post.tags.join(' #') : '')).then((ok) => toast(ok ? 'Copied' : 'Copy failed', ok ? 'success' : 'error')); } }, [I.copy(20), h('span', { text: 'Copy text' })]),
      h('button', { class: 'item', onclick: () => { closeSheet(document.querySelector('.scrim')); editPost(post); } }, [I.edit(20), h('span', { text: 'Edit' })]),
      h('button', { class: 'item', onclick: () => { closeSheet(document.querySelector('.scrim')); const blob = new Blob([JSON.stringify(post, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); saveAs(url, 'post_' + post.id + '.json'); URL.revokeObjectURL(url); } }, [I.export_(20), h('span', { text: 'Export as JSON' })]),
      h('button', { class: 'item danger', onclick: () => { closeSheet(document.querySelector('.scrim')); confirmDelete(post); } }, [I.trash(20), h('span', { text: 'Delete' })]),
    ]);
  }

  async function editPost(post) {
    const ta = h('textarea', { rows: '5', style: { minHeight: '100px', resize: 'vertical' } });
    ta.value = post.content || '';
    const tagsInp = h('input', { type: 'text', placeholder: 'comma,separated,tags', value: (post.tags || []).join(', ') });
    const s = sheet([
      h('h2', { text: 'Edit entry' }),
      h('div', { style: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' } }, [ta, tagsInp]),
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
      const a = document.createElement('audio'); a.src = m.url; a.controls = true; a.autoplay = true; stage.appendChild(a);
    } else {
      stage.appendChild(h('a', { href: m.url, target: '_blank', rel: 'noopener', text: 'Open ' + (m.filename || 'file'), style: { color: '#fff' } }));
    }
    back.append(top, stage);
    document.body.appendChild(back);
    back.addEventListener('click', (e) => { if (e.target === back) back.remove(); });
  }

  function iconSvg(d) {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.5'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = '<path d="' + d + '"/>';
    return s;
  }

  global.Feed = { mount, refresh, render, renderPost, openThread, openLightbox };
})(window);
