/* media.js — media library */
(function (global) {
  'use strict';
  const { h, fmtBytes } = global.U;
  const S = global.S;
  const I = global.I;

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'image', label: 'Photos' },
    { id: 'video', label: 'Videos' },
    { id: 'audio', label: 'Audio' },
    { id: 'voice_note', label: 'Voice' },
    { id: 'file', label: 'Files' },
  ];
  let active = 'all';

  function mount() {}
  function refresh() {
    const sc = document.getElementById('scroll-media');
    sc.innerHTML = '';

    const filterBar = h('div', { class: 'grid-filter' });
    for (const f of FILTERS) {
      filterBar.appendChild(h('button', { class: 'chip' + (active === f.id ? ' on' : ''), onclick: () => { active = f.id; refresh(); } }, f.label));
    }
    sc.appendChild(filterBar);

    const items = collect();
    if (!items.length) {
      sc.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'No media yet' }), h('p', { text: 'Photos, videos, and audio you attach will appear here.' })]));
      return;
    }
    const grid = h('div', { class: 'grid' });
    for (const it of items) grid.appendChild(tile(it));
    sc.appendChild(grid);
  }

  function collect() {
    const out = [];
    for (const p of S.posts) for (const m of (p.media || [])) if (active === 'all' || m.type === active) out.push({ m, p });
    out.sort((a, b) => new Date(b.m.created_at) - new Date(a.m.created_at));
    return out;
  }

  function tile({ m }) {
    const t = h('div', { class: 'tile ' + m.type, onclick: () => Feed.openLightbox(m) });
    if (m.type === 'image') {
      const img = new Image();
      img.loading = 'lazy'; img.alt = m.filename || '';
      img.src = thumb(m.url, 320);
      t.appendChild(img);
    } else if (m.type === 'video') {
      const v = document.createElement('video');
      v.src = m.url; v.muted = true; v.playsInline = true; v.preload = 'metadata';
      v.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      v.addEventListener('loadeddata', () => { try { v.currentTime = 0.05; } catch {} }, { once: true });
      t.appendChild(v);
    } else if (m.type === 'audio' || m.type === 'voice_note') {
      t.appendChild(I.mic(28));
    } else {
      t.appendChild(h('div', { style: { fontSize: '11px' }, text: m.filename?.split('.').pop()?.toUpperCase() || 'FILE' }));
    }
    t.appendChild(h('div', { class: 'ov', text: fmtBytes(m.size) }));
    return t;
  }

  function thumb(url, w) {
    try { const u = new URL(url); u.searchParams.set('w', String(w)); u.searchParams.set('q', '65'); return u.toString(); } catch { return url; }
  }

  global.MediaLib = { mount, refresh };
})(window);
