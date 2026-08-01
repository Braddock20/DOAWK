/* tags.js — tag cloud + tag feed */
(function (global) {
  'use strict';
  const { h, toast } = window.Util;
  const Icons = window.Icons;
  const Store = window.Store;

  function mount() {
    const cloud = document.getElementById('tagCloud');
    cloud.innerHTML = '';
    const entries = Object.entries(Store.state.tags).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      cloud.appendChild(h('div', { class: 'empty' }, [
        h('div', { class: 'glyph' }, [Icons.tag()]),
        h('h3', { text: 'No tags yet' }),
        h('p', { text: 'Add tags to your entries to organize themes, moods, and moments.' }),
      ]));
      return;
    }
    entries.forEach(([tag, n]) => {
      const pill = h('button', { class: 'pill', onclick: () => openTag(tag) }, [
        '#' + tag, h('span', { class: 'ct', text: n }),
      ]);
      cloud.appendChild(pill);
    });
  }

  async function openTag(tag) {
    const scroll = document.getElementById('tagsScroll');
    scroll.innerHTML = '';
    scroll.appendChild(h('div', { class: 'ptr show', text: 'Loading #' + tag + '…' }));
    try {
      const { posts } = await Api.byTag(tag);
      scroll.innerHTML = '';
      const top = h('div', { class: 'row', style: { padding: '12px 14px' } }, [
        h('button', { class: 'chip-btn', onclick: () => mount(), title: 'Back' }, ['← All tags']),
        h('h2', { style: { margin: '0 0 0 8px', fontSize: '18px' }, text: '#' + tag }),
        h('span', { class: 'spacer' }),
        h('span', { class: 'muted', text: posts.length + ' entries' }),
      ]);
      scroll.appendChild(top);
      const feed = h('div', { class: 'feed' });
      const allById = { ...Store.state.byId };
      posts.forEach((p) => allById[p.id] = p);
      posts.forEach((p) => {
        const parent = p.parent_id ? allById[p.parent_id] : null;
        feed.appendChild(Feed.renderPost(p, { isMe: p.id.charCodeAt(0) % 2 === 0, parent: parent || undefined }));
      });
      scroll.appendChild(feed);
    } catch (e) {
      scroll.innerHTML = '';
      scroll.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'Couldn\'t load tag' }), h('p', { text: e.body?.error || e.message })]));
    }
  }

  global.Tags = { mount };
})(window);
