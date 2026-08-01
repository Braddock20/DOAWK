/* media.js — media library grid (photos, videos, voice notes, files) */
(function (global) {
  'use strict';
  const { h, fmtBytes } = window.Util;
  const Icons = window.Icons;
  const Store = window.Store;

  let activeFilter = 'all';

  function mount() {
    const grid = document.getElementById('mediaGrid');
    grid.innerHTML = '';
    const scroll = document.getElementById('mediaScroll');

    // Filter strip
    const filters = h('div', { class: 'search-bar', style: { paddingBottom: '0' } }, [
      h('div', { class: 'filters' }, [
        filterChip('all', 'All', Icons.apps()),
        filterChip('image', 'Photos', Icons.image()),
        filterChip('video', 'Videos', Icons.media()),
        filterChip('audio', 'Audio', Icons.mic()),
        filterChip('voice_note', 'Voice', Icons.mic()),
        filterChip('file', 'Files', Icons.doc()),
        filterChip('apk', 'APK', Icons.download()),
      ]),
    ]);
    scroll.insertBefore(filters, grid);

    const items = collect();
    if (!items.length) {
      grid.appendChild(h('div', { class: 'empty', style: { gridColumn: '1 / -1' } }, [
        h('div', { class: 'glyph' }, [Icons.media()]),
        h('h3', { text: 'No media yet' }),
        h('p', { text: 'Attach photos, voice notes, and files to your entries to see them here.' }),
      ]));
      return;
    }
    items.forEach((it) => grid.appendChild(renderTile(it)));
  }

  function filterChip(id, label, icon) {
    return h('button', { class: 'chip' + (activeFilter === id ? ' active' : ''), onclick: () => { activeFilter = id; mount(); } }, [icon, ' ' + label]);
  }

  function collect() {
    const out = [];
    for (const p of Store.state.timeline) {
      for (const m of (p.media || [])) {
        if (activeFilter !== 'all' && m.type !== activeFilter) continue;
        out.push({ m, p });
      }
    }
    out.sort((a, b) => new Date(b.m.created_at) - new Date(a.m.created_at));
    return out;
  }

  function renderTile({ m, p }) {
    const tile = h('div', { class: 'tile ' + m.type });
    if (m.type === 'image') {
      const img = new Image();
      img.alt = m.filename || '';
      img.loading = 'lazy';
      img.src = Util.makeThumbUrl ? Util.makeThumbUrl(m.url, 360) : m.url;
      tile.appendChild(img);
    } else if (m.type === 'video') {
      const v = document.createElement('video');
      v.src = m.url; v.muted = true; v.playsInline = true; v.preload = 'metadata';
      v.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      v.addEventListener('loadeddata', () => { try { v.currentTime = 0.05; } catch {} }, { once: true });
      tile.appendChild(v);
    } else if (m.type === 'audio' || m.type === 'voice_note') {
      tile.appendChild(h('div', { style: { fontSize: '12px', color: 'var(--text-dim)' }, text: '♪ ' + (m.filename || 'voice') }));
    } else {
      tile.appendChild(h('div', { style: { fontSize: '12px' }, text: m.filename?.split('.').pop()?.toUpperCase() || 'FILE' }));
    }
    tile.appendChild(h('div', { class: 'overlay' }, [
      h('div', { class: 'icon-top' }, [iconFor(m.type), m.mime_type?.split('/')[1]?.toUpperCase() || '']),
      h('div', { class: 'meta', text: fmtBytes(m.size) }),
    ]));
    tile.addEventListener('click', () => Feed.openLightbox(m));
    return tile;
  }
  function iconFor(t) {
    if (t === 'image') return h('span', { html: '📷' });
    if (t === 'video') return h('span', { html: '🎬' });
    if (t === 'audio' || t === 'voice_note') return h('span', { html: '🎙' });
    return h('span', { html: '📄' });
  }

  global.Media = { mount };
})(window);
