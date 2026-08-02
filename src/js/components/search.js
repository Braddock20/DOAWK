/* search.js */
(function (global) {
  'use strict';
  const { h, toast, ls, smartTime } = global.U;
  const S = global.S;
  const I = global.I;

  const TYPES = [
    { id: '', label: 'All', icon: () => I.media(14) },
    { id: 'image', label: 'Photos', icon: () => I.image(14) },
    { id: 'video', label: 'Videos', icon: () => I.video(14) },
    { id: 'audio', label: 'Audio', icon: () => I.mic(14) },
    { id: 'voice_note', label: 'Voice', icon: () => I.mic(14) },
    { id: 'file', label: 'Files', icon: () => I.file(14) },
  ];
  let state = { q: '', type: '' };

  function mount() {
    const sc = document.getElementById('scroll-search');
    sc.innerHTML = '';
    const bar = h('div', { class: 'search-bar' });
    const inp = h('input', { type: 'text', placeholder: 'Search entries, tags…', value: state.q, oninput: (e) => { state.q = e.target.value; runSearch(); } });
    const field = h('div', { class: 'field' }, [I.search(18), inp, state.q ? h('button', { class: 'btn-icon', style: { width: '28px', height: '28px' }, onclick: () => { state.q = ''; state.type = ''; mount(); } }, [I.close(16)]) : null]);
    const filters = h('div', { class: 'filters' });
    for (const t of TYPES) {
      const chip = h('button', { class: 'chip' + (state.type === t.id ? ' on' : ''), onclick: () => { state.type = t.id; mount(); } }, [t.icon(), ' ' + t.label]);
      filters.appendChild(chip);
    }
    bar.append(field, filters);
    sc.appendChild(bar);

    const out = h('div', { class: 'scroll', style: { flex: '1' } });
    sc.appendChild(out);

    if (state.q || state.type) runSearch();
    else renderSuggestions(out);
    setTimeout(() => inp.focus(), 50);
  }

  let searchTimer;
  function runSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(_run, 200);
  }
  async function _run() {
    const sc = document.getElementById('scroll-search');
    const out = sc.querySelector('.scroll:last-child') || sc.lastElementChild;
    out.innerHTML = '<div class="empty"><div class="spinner"></div></div>';
    try {
      const { posts } = await A.search({ q: state.q, type: state.type, limit: 50 });
      out.innerHTML = '';
      if (!posts.length) { out.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'No results' }), h('p', { text: 'Try different words or filters.' })])); return; }
      out.appendChild(h('div', { class: 'day', text: posts.length + ' result' + (posts.length === 1 ? '' : 's') }));
      const feed = h('div', { class: 'feed' });
      const allById = { ...S.byId };
      posts.forEach((p) => allById[p.id] = p);
      for (const p of posts) {
        const parent = p.parent_id ? allById[p.parent_id] : null;
        feed.appendChild(Feed.renderPost(p, { isMe: p.id.charCodeAt(0) % 2 === 0, parent: parent || undefined }));
      }
      out.appendChild(feed);
    } catch (e) {
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'Search failed' }), h('p', { text: e.message })]));
    }
  }

  function renderSuggestions(out) {
    out.innerHTML = '';
    const s = h('div', { class: 'suggest' });
    const tags = Object.entries(S.tags).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (tags.length) {
      s.appendChild(h('h4', { text: 'Tags' }));
      for (const [t, n] of tags) {
        s.appendChild(h('button', { class: 'item', onclick: () => { state.q = t; mount(); } }, [
          h('div', { class: 'ic' }, [I.tag(16)]),
          h('div', { class: 'body' }, [h('div', { class: 't', text: '#' + t }), h('div', { class: 's', text: n + ' entr' + (n === 1 ? 'y' : 'ies') })]),
        ]));
      }
    }
    const recent = S.posts.slice(-8).reverse();
    if (recent.length) {
      s.appendChild(h('h4', { text: 'Recent' }));
      for (const p of recent) {
        const preview = (p.content || (p.media?.length ? '[' + p.media[0].type + ']' : 'Entry')).slice(0, 60);
        s.appendChild(h('button', { class: 'item', onclick: () => Feed.openThread(p.id) }, [
          h('div', { class: 'ic' }, [I.bookmark(16)]),
          h('div', { class: 'body' }, [h('div', { class: 't', text: preview || 'Entry' }), h('div', { class: 's', text: smartTime(p.created_at) })]),
        ]));
      }
    }
    if (!tags.length && !recent.length) {
      s.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'Search your journal' }), h('p', { text: 'Find entries by word, tag, or media type.' })]));
    }
    out.appendChild(s);
  }

  global.Search = { mount, refresh: mount };
})(window);
