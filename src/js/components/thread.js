/* thread.js — post detail with nested replies */
(function (global) {
  'use strict';
  const { h, toast, linkify, smartTime, fmtDur, sheet, closeSheet } = global.U;
  const S = global.S;
  const I = global.I;

  function mount() {}
  async function refresh() {
    if (!S.threadId) return;
    const sc = document.getElementById('scroll-thread');
    sc.innerHTML = '';
    sc.appendChild(h('div', { class: 'empty' }, [h('div', { class: 'spinner' })]));
    try {
      const { post } = await A.get(S.threadId);
      S.upsert(post);
      const wrap = h('div', { class: 'feed' });
      wrap.appendChild(h('div', { style: { padding: '8px 14px' } }, [h('button', { class: 'btn-icon', onclick: () => App.go('home') }, [I.back(22)])]));
      wrap.appendChild(Feed.renderPost(post, { isMe: post.id.charCodeAt(0) % 2 === 0 }));
      if (post.replies?.length) {
        wrap.appendChild(h('div', { class: 'day', text: post.replies.length + ' repl' + (post.replies.length === 1 ? 'y' : 'ies') }));
        const renderLevel = (parent, replies) => {
          const c = h('div', { class: 'children' });
          for (const r of replies) {
            c.appendChild(Feed.renderPost(r, { isMe: r.id.charCodeAt(0) % 2 === 0, parent, depth: 1 }));
            if (r.replies?.length) c.appendChild(renderLevel(r, r.replies));
          }
          return c;
        };
        wrap.appendChild(renderLevel(post, post.replies));
      }
      // quick reply box
      const replyBox = h('div', { class: 'composer', style: { position: 'sticky', bottom: 0, margin: '14px 0 0' } }, [
        (() => {
          const r = h('div', { class: 'row' });
          const ta = h('textarea', { rows: '1', placeholder: 'Reply…' });
          ta.style.cssText = 'flex:1;border:0;outline:0;resize:none;background:rgba(0,0,0,.04);border-radius:20px;padding:10px 14px;font:inherit;color:inherit;min-height:40px;max-height:120px;';
          ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
          ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(ta); } });
          const sb = h('button', { class: 'btn-send', onclick: () => send(ta) }, [I.send(18)]);
          r.append(ta, sb);
          return r;
        })(),
      ]);
      wrap.appendChild(replyBox);
      sc.innerHTML = '';
      sc.appendChild(wrap);
    } catch (e) {
      sc.innerHTML = '';
      sc.appendChild(h('div', { class: 'empty' }, [h('h3', { text: 'Thread not found' }), h('p', { text: e.message })]));
    }
  }
  async function send(ta) {
    const text = (ta.value || '').trim();
    if (!text) return;
    try {
      await A.create({ content: text, parentId: S.threadId });
      ta.value = ''; ta.style.height = 'auto';
      await refresh();
      toast('Reply sent', 'success', 1000);
    } catch (e) { toast('Reply failed: ' + e.message, 'error'); }
  }
  global.Thread = { mount, refresh };
})(window);
