/* search.js — search bar with suggestions, type filter chips, results feed */
(function (global) {
  'use strict';
  const { h, debounce, escapeHtml, linkify, smartStamp, toast } = window.Util;
  const Store = window.Store;
  const Icons = window.Icons;

  const TYPES = [
    { id: '',          label: 'All',     icon: () => Icons.apps() },
    { id: 'image',     label: 'Photos',  icon: () => Icons.image() },
    { id: 'video',     label: 'Videos',  icon: () => Icons.media() },
    { id: 'audio',     label: 'Audio',   icon: () => Icons.mic() },
    { id: 'voice_note',label: 'Voice',   icon: () => Icons.mic() },
    { id: 'file',      label: 'Files',   icon: () => Icons.doc() },
    { id: 'apk',       label: 'APK',     icon: () => Icons.download() },
  ];

  let state = { q: '', type: '' };

  function mount() {
    const bar = document.getElementById('searchBar');
    bar.innerHTML = '';
    const field = h('div', { class: 'field' }, [
      Icons.search(),
      h('input', { id: 'searchInput', placeholder: 'Search entries, tags, files…', value: state.q, oninput: (e) => onInput(e.target.value) }),
      state.q ? h('button', { class: 'icon-btn', style: { width: '32px', height: '32px', borderRadius: '10px' }, onclick: clearAll, title: 'Clear' }, [Icons.close()]) : null,
    ]);
    const filters = h('div', { class: 'filters' });
    TYPES.forEach((t) => {
      const chip = h('button', { class: 'chip' + (state.type === t.id ? ' active' : ''), onclick: () => { state.type = t.id; mount(); runSearch(); } }, [t.icon(), ' ' + t.label]);
      filters.appendChild(chip);
    });
    bar.append(field, filters);

    if (!state.q && !state.type) renderSuggestions();
    else runSearch();

    setTimeout(() => document.getElementById('searchInput')?.focus(), 30);
  }

  function clearAll() { state = { q: '', type: '' }; mount(); }
  const onInput = debounce((v) => { state.q = v.trim(); if (!state.q) { mount(); return; } runSearch(); }, 200);

  async function runSearch() {
    const out = document.getElementById('searchResults');
    out.innerHTML = '';
    out.appendChild(h('div', { class: 'ptr show', text: 'Searching…' }));
    try {
      const params = {};
      if (state.q) params.q = state.q;
      if (state.type) params.type = state.type;
      params.limit = 50;
      const { posts } = await Api.search(params);
      out.innerHTML = '';
      if (!posts.length) { out.appendChild(emptyResults()); return; }
      out.appendChild(h('div', { class: 'ptr show', text: posts.length + ' result' + (posts.length === 1 ? '' : 's') }));
      const feed = h('div', { class: 'feed' });
      // build parent chain for "reply to" preview
      const allById = { ...Store.state.byId };
      posts.forEach((p) => allById[p.id] = p);
      posts.forEach((p) => {
        const parent = p.parent_id ? allById[p.parent_id] : null;
        feed.appendChild(Feed.renderPost(p, { isMe: p.id.charCodeAt(0) % 2 === 0, parent: parent || undefined }));
      });
      out.appendChild(feed);
    } catch (e) {
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'Search failed' }), h('p', { text: e.body?.error || e.message })]));
    }
  }

  function emptyResults() {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'glyph' }, [Icons.search()]),
      h('h3', { text: 'No matches' }),
      h('p', { text: 'Try a different word or filter.' }),
    ]);
  }

  function renderSuggestions() {
    const out = document.getElementById('searchResults');
    out.innerHTML = '';
    const host = h('div', { class: 'suggest-list' });

    // Top tags
    const tags = Object.entries(Store.state.tags).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (tags.length) {
      host.appendChild(h('h4', { text: 'Tags' }));
      tags.forEach(([t, n]) => {
        host.appendChild(h('button', { class: 'suggest-item', onclick: () => { state.q = t; mount(); runSearch(); } }, [
          h('div', { class: 'glyph' }, [Icons.tag()]),
          h('div', { class: 'body' }, [h('div', { class: 'ttl', text: '#' + t }), h('div', { class: 'sub', text: n + ' entr' + (n === 1 ? 'y' : 'ies') })]),
        ]));
      });
    }

    // Recent entries (preview)
    const recent = Store.state.timeline.slice(-8).reverse();
    if (recent.length) {
      host.appendChild(h('h4', { text: 'Recent' }));
      recent.forEach((p) => {
        const preview = (p.content || (p.media?.length ? '[' + p.media[0].type + ']' : 'Entry')).slice(0, 60);
        host.appendChild(h('button', { class: 'suggest-item', onclick: () => Feed.openThread(p.id) }, [
          h('div', { class: 'glyph' }, [Icons.clock()]),
          h('div', { class: 'body' }, [h('div', { class: 'ttl', text: preview || 'Entry' }), h('div', { class: 'sub', text: smartStamp(p.created_at) })]),
        ]));
      });
    }

    if (!tags.length && !recent.length) {
      host.appendChild(h('div', { class: 'empty' }, [
        h('div', { class: 'glyph' }, [Icons.search()]),
        h('h3', { text: 'Find anything' }),
        h('p', { text: 'Search your entries, filter by media type, or jump back into a tag.' }),
      ]));
    }

    out.appendChild(host);
  }

  global.Search = { mount };
})(window);
