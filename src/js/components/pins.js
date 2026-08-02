/* pins.js */
(function (global) {
  'use strict';
  const { h } = global.U;
  const S = global.S;
  const I = global.I;

  function mount() {}
  function refresh() {
    const sc = document.getElementById('scroll-pins');
    sc.innerHTML = '';
    const ids = (global.U.ls.get('pins', []) || []);
    const posts = ids.map((id) => S.byId[id]).filter(Boolean);
    if (!posts.length) {
      sc.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'No pinned entries' }), h('p', { text: 'Tap the pin on any entry to keep it here.' })]));
      return;
    }
    const feed = h('div', { class: 'feed' });
    for (const p of posts) feed.appendChild(Feed.renderPost(p, { isMe: p.id.charCodeAt(0) % 2 === 0 }));
    sc.appendChild(feed);
  }
  global.Pins = { mount, refresh };
})(window);
