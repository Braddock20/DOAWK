/* pins.js — pinned entries */
(function (global) {
  'use strict';
  const { h } = window.Util;
  const Icons = window.Icons;
  const Store = window.Store;
  const ls = window.Util.ls;

  function mount() {
    const host = document.getElementById('pinFeed');
    host.innerHTML = '';
    const scroll = document.getElementById('pinsScroll');
    scroll.querySelector('.ptr.show')?.remove();

    const ids = ls.get('pins', []) || [];
    const posts = ids.map((id) => Store.state.byId[id]).filter(Boolean);
    if (!posts.length) {
      host.appendChild(h('div', { class: 'empty' }, [
        h('div', { class: 'glyph' }, [Icons.pinSolid()]),
        h('h3', { text: 'Nothing pinned yet' }),
        h('p', { text: 'Tap the pin icon on any entry to keep it here for quick access.' }),
      ]));
      return;
    }
    posts.forEach((p) => host.appendChild(Feed.renderPost(p, { isMe: p.id.charCodeAt(0) % 2 === 0 })));
  }

  global.Pins = { mount };
})(window);
