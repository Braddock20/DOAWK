/* feed.js — main chat-style timeline. Newest at the BOTTOM (like a chat app). */
(function (global) {
  'use strict';
  const { h, fmtTime, fmtDate, smartStamp, fmtBytes, fmtDuration, debounce, escapeHtml, linkify, copy, saveAs, toast, ls, uid } = window.Util;
  const Store = window.Store;
  const Icons = window.Icons;

  let scrollEl = null, feedEl = null, mounted = false, loading = false, reachedEnd = false;

  function mount() {
    if (!mounted) {
      scrollEl = document.getElementById('homeScroll');
      feedEl   = document.getElementById('feed');
      // IntersectionObserver: load more when scrolled to top (oldest direction)
      // Chat order: oldest first, newest at bottom. User scrolls up to see older.
      // In a chat app, you load older by scrolling UP.
      scrollEl.addEventListener('scroll', onScroll);
      mounted = true;
    }
  }

  function onScroll() {
    if (loading || reachedEnd) return;
    if (scrollEl.scrollTop < 100) {
      loadOlder();
    }
  }

  async function loadOlder() {
    if (loading || Store.state.timelineDone) return;
    loading = true;
    try {
      const { posts, next_cursor } = await Api.listPosts(Store.state.timelineCursor, 20);
      const newOnes = posts.filter((p) => !Store.state.byId[p.id]);
      newOnes.forEach((p) => Store.upsertPost(p));
      Store.state.timelineCursor = next_cursor;
      Store.state.timelineDone = next_cursor == null;
      render({ appendTop: true });
    } catch (e) {
      toast('Couldn\'t load older entries: ' + (e.body?.error || e.message), 'error');
    } finally {
      loading = false;
    }
  }

  async function refresh() {
    if (!feedEl) mount();
    // Reset and load fresh
    Store.state.timeline = [];
    Store.state.timelineCursor = null;
    Store.state.timelineDone = false;
    Store.state.byId = {};
    try {
      const { posts, next_cursor } = await Api.listPosts(null, 20);
      posts.forEach((p) => Store.upsertPost(p));
      Store.state.timelineCursor = next_cursor;
      Store.state.timelineDone = next_cursor == null;
      render();
      // Scroll to bottom (newest)
      requestAnimationFrame(() => { scrollEl.scrollTop = scrollEl.scrollHeight; });
    } catch (e) {
      toast('Couldn\'t load timeline: ' + (e.body?.error || e.message), 'error');
      render();
    }
  }

  function render({ appendTop = false } = {}) {
    if (!feedEl) return;
    const filterTag = Store.state.filterTag;
    const list = Store.state.timeline.filter((p) => !filterTag || (p.tags || []).includes(filterTag));
    // group by day for divider chips
    feedEl.innerHTML = '';
    if (list.length === 0) {
      feedEl.appendChild(renderEmpty());
    } else {
      let lastDay = null;
      const frag = document.createDocumentFragment();
      list.forEach((post, i) => {
        const day = new Date(post.created_at).toDateString();
        if (day !== lastDay) {
          frag.appendChild(h('div', { class: 'day-divider', text: prettyDayHeader(day, new Date()) }));
          lastDay = day;
        }
        const node = renderPost(post, { isMe: isMePost(post) });
        frag.appendChild(node);
      });
      feedEl.appendChild(frag);
    }

    if (Store.state.timelineDone && list.length > 0) {
      feedEl.appendChild(h('div', { class: 'ptr show', text: '— You\'ve reached the beginning of your journal —' }));
    }
  }

  function prettyDayHeader(day, now) {
    const d = new Date(day);
    const today = new Date(now); today.setHours(0,0,0,0);
    const yest = new Date(today); yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    const diff = (today - d) / 86400e3;
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  }

  function isMePost(p) {
    // The API is single-user. We render the user ("me") on the right when their
    // avatar/displayName is set OR for the local "diary" feel, alternate them.
    // To keep it social-app style, we randomly alternate based on id for visual variety.
    if (Store.state.displayName && Store.state.displayName !== 'You') return true;
    return (p.id.charCodeAt(0) % 2) === 0;
  }

  function renderEmpty() {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'glyph' }, [Icons.bookmark()]),
      h('h3', { text: 'Start your journal' }),
      h('p', { text: 'Write your first thought. Add photos, voice notes, or files. Everything stays private on this device.' }),
      h('button', { class: 'tab', style: { marginTop: '8px', cursor: 'pointer' }, onclick: () => document.getElementById('composerText')?.focus() }, 'Write something'),
    ]);
  }

  /* ---------- Post rendering ---------- */
  function renderPost(post, { isMe = false, isReply = false, depth = 0, parent = null } = {}) {
    const isPinned = isPinned_(post.id);
    const el = h('article', {
      class: 'post' + (isMe ? ' is-me' : '') + (isPinned ? ' is-pinned' : ''),
      dataset: { id: post.id, postId: post.id },
    });

    // Optional reply-quote
    if (parent) {
      const quoteText = parent.content || (parent.media?.length ? `[${parent.media[0].type}]` : 'Post');
      el.appendChild(h('div', { class: 'reply-quote', onclick: () => App.switchTab('thread', { threadId: parent.id }) }, [
        h('div', {}, [
          h('div', { class: 'who', text: 'Replying to entry' }),
          h('div', { class: 'what', text: quoteText }),
        ]),
      ]));
    }

    // Bubble
    if (post.content) {
      const bubble = h('div', { class: 'bubble' });
      bubble.innerHTML = linkify(post.content);
      el.appendChild(bubble);
    }

    // Media
    if (post.media && post.media.length) {
      el.appendChild(renderMediaGrid(post.media));
    }

    // Tags
    if (post.tags && post.tags.length) {
      el.appendChild(h('div', { class: 'reactions' }, post.tags.map((t) =>
        h('span', { class: 'tag-chip', text: '#' + t, onclick: () => { Store.set({ filterTag: t }); switchToHomeWithFilter(); } })
      )));
    }

    // Meta + actions
    const meta = h('div', { class: 'meta' }, [
      h('span', { text: smartStamp(post.created_at) }),
      post.updated_at && post.updated_at !== post.created_at ? h('span', { class: 'edited', text: '· edited' }) : null,
      isPinned ? h('span', { class: 'pin-dot', title: 'Pinned' }) : null,
    ]);
    el.appendChild(meta);

    const actions = h('div', { class: 'post-actions' }, [
      h('button', { title: 'Reply', onclick: (e) => { e.stopPropagation(); openReplyTo(post); } }, [Icons.reply(), 'Reply']),
      h('button', { title: 'Pin',   onclick: (e) => { e.stopPropagation(); togglePin(post.id); } }, [isPinned ? Icons.pinSolid() : Icons.pin(), isPinned ? 'Pinned' : 'Pin']),
      h('button', { title: 'More',  onclick: (e) => { e.stopPropagation(); openPostMenu(post, isMe); } }, [Icons.more()]),
    ]);
    el.appendChild(actions);

    // Long-press / right-click to open thread
    el.addEventListener('click', (e) => {
      if (e.target.closest('.post-actions') || e.target.closest('.reply-quote') || e.target.closest('.media-cell') || e.target.closest('.tag-chip')) return;
      openThread(post.id);
    });
    bindLongPress(el, () => openPostMenu(post, isMe));

    return el;
  }

  function switchToHomeWithFilter() {
    App.switchTab('home');
  }

  function isPinned_(id) { return (ls.get('pins', []) || []).includes(id); }
  function togglePin(id) {
    const arr = ls.get('pins', []) || [];
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1); else arr.unshift(id);
    ls.set('pins', arr);
    toast(idx >= 0 ? 'Unpinned' : 'Pinned', '', 1200);
    render();
    App.refreshTabBadges();
  }

  /* ---------- Reply quote affordance ---------- */
  function openReplyTo(post) {
    Composer.setReply(post);
    App.switchTab('home');
    requestAnimationFrame(() => document.getElementById('composerText')?.focus());
  }

  /* ---------- Post actions menu ---------- */
  function openPostMenu(post, isMe) {
    const back = Util.openModal(h('div', {}, [
      h('h2', { text: 'Entry actions' }),
      h('div', { class: 'menu-list' }, [
        h('button', { class: 'menu-item', onclick: () => { Util.closeModal(back); openThread(post.id); } }, [Icons.apps(), 'Open thread']),
        h('button', { class: 'menu-item', onclick: () => { Util.closeModal(back); togglePin(post.id); } }, [isPinned_(post.id) ? Icons.pinSolid() : Icons.pin(), isPinned_(post.id) ? 'Unpin' : 'Pin to top']),
        h('button', { class: 'menu-item', onclick: () => { Util.closeModal(back); copyPost(post); } }, [Icons.copy(), 'Copy text']),
        h('button', { class: 'menu-item', onclick: () => { Util.closeModal(back); shareOrDownloadMedia(post); } }, [Icons.share(), 'Share / download media']),
        h('button', { class: 'menu-item', onclick: () => { Util.closeModal(back); editPost(post); } }, [Icons.edit(), 'Edit content & tags']),
        h('button', { class: 'menu-item', onclick: () => { Util.closeModal(back); exportPost(post); } }, [Icons.export(), 'Export as JSON']),
        h('button', { class: 'menu-item', onclick: () => { Util.closeModal(back); confirmDelete(post); } }, [Icons.trash(), h('span', { class: 'danger-text', text: 'Delete entry' })]),
      ]),
    ]));
  }

  function copyPost(p) {
    const txt = (p.content || '') + (p.media?.length ? '\n[media: ' + p.media.map(m => m.url).join(', ') + ']' : '') + (p.tags?.length ? '\n#' + p.tags.join(' #') : '');
    copy(txt).then((ok) => toast(ok ? 'Copied' : 'Copy failed', ok ? 'success' : 'error'));
  }
  function shareOrDownloadMedia(p) {
    if (!p.media?.length) { toast('No media to share', 'error'); return; }
    p.media.forEach((m) => saveAs(m.url, m.filename || ('media_' + m.id)));
    toast('Downloading ' + p.media.length + ' file(s)', 'success');
  }
  function exportPost(p) {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    saveAs(url, 'post_' + p.id + '.json');
    URL.revokeObjectURL(url);
  }

  async function editPost(p) {
    const ta = h('textarea', { rows: 5, style: { width: '100%', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', resize: 'vertical' } });
    ta.value = p.content || '';
    const tags = h('input', { type: 'text', placeholder: 'tags, comma separated', value: (p.tags || []).join(', '), style: { width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', marginTop: '10px' } });
    const back = Util.openModal(h('div', {}, [
      h('h2', { text: 'Edit entry' }),
      h('div', { style: { padding: '0 18px' } }, [ta, tags]),
      h('p', { class: 'muted', style: { padding: '8px 18px 0', fontSize: '12px' }, text: 'Media cannot be edited; delete and repost if needed.' }),
      h('div', { class: 'actions' }, [
        h('button', { class: 'ghost', text: 'Cancel', onclick: () => Util.closeModal(back) }),
        h('button', { class: 'primary', text: 'Save', onclick: async () => {
          const content = ta.value.trim() || null;
          const tagArr = tags.value.split(',').map((s) => s.trim().toLowerCase().replace(/^#/, '')).filter(Boolean).slice(0, 10);
          try {
            const updated = await Api.updatePost(p.id, { content, tags: tagArr });
            Store.upsertPost(updated);
            render();
            Util.closeModal(back);
            toast('Saved', 'success');
          } catch (e) {
            toast('Save failed: ' + (e.body?.error || e.message), 'error');
          }
        }}),
      ]),
    ]));
  }

  async function confirmDelete(p) {
    const ok = await Util.confirm({ title: 'Delete this entry?', body: 'This will also delete attached media. This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await Api.deletePost(p.id);
      Store.removePost(p.id);
      render();
      toast('Deleted', 'success');
    } catch (e) {
      if (e.status === 409 && e.body?.reply_ids?.length) {
        const ok2 = await Util.confirm({ title: 'Delete ' + e.body.reply_ids.length + ' replies first?', body: 'This entry has replies that must be deleted before the entry can be removed.', confirmText: 'Delete all', danger: true });
        if (ok2) {
          for (const rid of e.body.reply_ids) {
            try { await Api.deletePost(rid); Store.removePost(rid); } catch {}
          }
          try { await Api.deletePost(p.id); Store.removePost(p.id); toast('Deleted', 'success'); render(); }
          catch (e2) { toast('Delete failed: ' + (e2.body?.error || e2.message), 'error'); }
        }
      } else {
        toast('Delete failed: ' + (e.body?.error || e.message), 'error');
      }
    }
  }

  function openThread(id) {
    App.switchTab('thread', { threadId: id });
  }

  function bindLongPress(el, fn) {
    let t;
    const start = (e) => { t = setTimeout(() => fn(), 600); };
    const cancel = () => clearTimeout(t);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
  }

  /* ---------- Media grid (with thumbnail system to reduce data usage) ---------- */
  function renderMediaGrid(media) {
    const n = media.length;
    const cols = n === 1 ? 'cols-1' : n === 2 ? 'cols-2' : n === 3 ? 'cols-3' : 'cols-4';
    const grid = h('div', { class: 'media-grid ' + cols });
    media.forEach((m) => grid.appendChild(renderMediaCell(m)));
    return grid;
  }

  function renderMediaCell(m) {
    if (m.type === 'image') {
      const cell = h('div', { class: 'media-cell' });
      const img = new Image();
      img.loading = 'lazy'; img.alt = m.filename || '';
      img.dataset.full = m.url;
      img.dataset.id = m.id;
      // Thumbnail strategy: try to load a smaller-sized version of the same URL
      // by appending a query param. If the server/CDN supports it, it returns
      // a smaller image; if not, we fall back to the full URL but still get lazy
      // loading and decoding=async. Plus, we use a tiny placeholder while loading.
      const thumbUrl = makeThumbUrl(m.url, 320);
      img.src = thumbUrl;
      img.decoding = 'async';
      cell.appendChild(img);
      // Open lightbox
      cell.addEventListener('click', () => openLightbox(m));
      return cell;
    }
    if (m.type === 'video') {
      const cell = h('div', { class: 'media-cell' });
      // Show first-frame as a poster (no full download).
      const v = document.createElement('video');
      v.src = m.url; v.preload = 'metadata'; v.muted = true; v.playsInline = true;
      v.addEventListener('loadeddata', () => {
        try { v.currentTime = Math.min(0.1, (v.duration || 1) * 0.02); } catch {}
      }, { once: true });
      v.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      cell.appendChild(v);
      cell.appendChild(h('div', { class: 'play' }, [h('div', { class: 'glyph' }, [Icons.play({ fill: '#111' })])]));
      cell.addEventListener('click', () => openLightbox(m));
      return cell;
    }
    if (m.type === 'audio' || m.type === 'voice_note') {
      return renderAudioStrip(m);
    }
    // APK / file / other
    return renderFileTile(m);
  }

  function makeThumbUrl(url, w) {
    if (!url) return url;
    try {
      const u = new URL(url);
      // Many CDNs support ?w=, ?width=, /w_/. Try generic query.
      u.searchParams.set('w', String(w));
      u.searchParams.set('q', '70');
      u.searchParams.set('auto', 'format');
      return u.toString();
    } catch { return url; }
  }

  function renderAudioStrip(m) {
    const strip = h('div', { class: 'audio-strip' });
    const btn = h('button', { class: 'play-btn' }, [Icons.play({ fill: 'currentColor' })]);
    const wave = h('div', { class: 'wave' });
    for (let i = 0; i < 28; i++) {
      const px = 4 + Math.round(Math.random() * 22);
      wave.appendChild(h('span', { style: { height: px + 'px' } }));
    }
    const dur = h('div', { class: 'dur', text: '—' });
    const audio = new Audio(m.url);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => { dur.textContent = fmtDuration(audio.duration); });
    btn.addEventListener('click', async () => {
      if (audio.paused) { audio.play(); btn.innerHTML = ''; btn.appendChild(pauseSvg()); }
      else { audio.pause(); btn.innerHTML = ''; btn.appendChild(Icons.play({ fill: 'currentColor' })); }
    });
    audio.addEventListener('ended', () => { btn.innerHTML = ''; btn.appendChild(Icons.play({ fill: 'currentColor' })); });
    strip.append(btn, wave, dur);
    return strip;
  }
  function pauseSvg() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '18'); s.setAttribute('height', '18'); s.setAttribute('fill', 'currentColor');
    s.innerHTML = '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
    return s;
  }

  function renderFileTile(m) {
    const ext = (m.filename?.split('.').pop() || '').toUpperCase().slice(0, 4);
    const cell = h('div', { class: 'media-cell file-icon', title: m.filename });
    cell.appendChild(h('div', { class: 'ic' }, [fileTypeSvg(m.mime_type)]));
    cell.appendChild(h('div', { class: 'lbl', text: m.filename }));
    cell.appendChild(h('div', { class: 'sz', text: fmtBytes(m.size) + (ext ? ' · ' + ext : '') }));
    cell.addEventListener('click', () => { saveAs(m.url, m.filename || 'file'); });
    return cell;
  }
  function fileTypeSvg(mime) {
    if (mime?.includes('zip')) return Icons.apps();
    if (mime?.includes('pdf')) return Icons.doc();
    return Icons.doc();
  }

  /* ---------- Lightbox ---------- */
  function openLightbox(m) {
    const back = h('div', { class: 'lightbox open' });
    const top = h('div', { class: 'topbar' }, [
      h('button', { onclick: () => back.remove() }, [Icons.close()]),
      h('div', { class: 'name', text: m.filename || m.type }),
      h('button', { onclick: () => saveAs(m.url, m.filename || ('media_' + m.id)) }, [Icons.download()]),
    ]);
    const stage = h('div', { class: 'stage' });
    if (m.type === 'image') {
      const img = new Image();
      img.alt = m.filename || '';
      img.src = m.url;
      stage.appendChild(img);
    } else if (m.type === 'video') {
      const v = document.createElement('video');
      v.src = m.url; v.controls = true; v.autoplay = true; v.playsInline = true;
      stage.appendChild(v);
    } else if (m.type === 'audio' || m.type === 'voice_note') {
      const a = document.createElement('audio'); a.src = m.url; a.controls = true; a.autoplay = true;
      stage.appendChild(a);
    } else {
      const a = h('a', { href: m.url, target: '_blank', rel: 'noopener', text: 'Open ' + (m.filename || 'file') });
      stage.appendChild(a);
    }
    back.append(top, stage);
    document.body.appendChild(back);
    back.addEventListener('click', (e) => { if (e.target === back) back.remove(); });
  }

  global.Feed = { mount, refresh, render, renderPost, openLightbox, openThread, isPinned_ };
})(window);
