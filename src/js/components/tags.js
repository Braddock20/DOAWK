/* tags.js — tag cloud + tag feed */
(function (global) {
  'use strict';
  const { h, toast } = global.U;
  const S = global.S;
  const I = global.I;

  function mount() {}
  function refresh() {
    const sc = document.getElementById('scroll-tags');
    sc.innerHTML = '';
    const entries = Object.entries(S.tags).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      sc.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'No tags yet' }), h('p', { text: 'Add tags to your entries to organize themes and moments.' })]));
      return;
    }
    const cloud = h('div', { class: 'tag-cloud' });
    for (const [tag, n] of entries) {
      cloud.appendChild(h('button', { class: 'pill', onclick: () => openTag(tag) }, ['#' + tag, h('span', { class: 'ct', text: n })]));
    }
    sc.appendChild(cloud);
  }

  async function openTag(tag) {
    const sc = document.getElementById('scroll-tags');
    sc.innerHTML = '<div class="empty"><div class="spinner"></div></div>';
    try {
      const { posts } = await A.byTag(tag);
      sc.innerHTML = '';
      const top = h('div', { style: { padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' } }, [
        h('button', { class: 'btn-icon', onclick: () => refresh() }, [I.back(22)]),
        h('h2', { style: { margin: '0', fontSize: '17px' }, text: '#' + tag }),
        h('div', { style: { marginLeft: 'auto', fontSize: '12px', opacity: '.6' }, text: posts.length + ' entries' }),
      ]);
      sc.appendChild(top);
      const feed = h('div', { class: 'feed' });
      const allById = { ...S.byId };
      posts.forEach((p) => allById[p.id] = p);
      for (const p of posts) {
        const parent = p.parent_id ? allById[p.parent_id] : null;
        feed.appendChild(Feed.renderPost(p, { isMe: p.id.charCodeAt(0) % 2 === 0, parent: parent || undefined }));
      }
      sc.appendChild(feed);
    } catch (e) { toast('Tag failed: ' + e.message, 'error'); refresh(); }
  }
  global.Tags = { mount, refresh };
})(window);
