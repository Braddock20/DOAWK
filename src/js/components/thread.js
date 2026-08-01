/* thread.js — single post with nested replies (depth up to 3) */
(function (global) {
  'use strict';
  const { h, smartStamp, toast, linkify } = window.Util;
  const Store = window.Store;
  const Icons = window.Icons;

  let currentId = null;

  async function mount(id) {
    currentId = id;
    const host = document.getElementById('threadScroll');
    host.innerHTML = '';
    host.appendChild(h('div', { class: 'ptr show', text: 'Loading thread…' }));
    try {
      const { post } = await Api.getPost(id);
      Store.upsertPost(post);
      Store.setReplies(id, post.replies || []);
      render(post);
    } catch (e) {
      host.innerHTML = '';
      host.appendChild(h('div', { class: 'empty' }, [
        h('div', { class: 'glyph' }, [Icons.info()]),
        h('h3', { text: 'Thread not found' }),
        h('p', { text: e.body?.error || e.message }),
        h('button', { class: 'tab', onclick: () => App.switchTab('home') }, 'Back to Home'),
      ]));
    }
  }

  async function refresh() {
    if (!currentId) return;
    try {
      const { post } = await Api.getPost(currentId);
      Store.upsertPost(post);
      Store.setReplies(currentId, post.replies || []);
      render(post);
    } catch {}
  }

  function render(root) {
    const host = document.getElementById('threadScroll');
    host.innerHTML = '';
    const feed = h('div', { class: 'feed' });

    // Back button
    const back = h('button', { class: 'chip-btn', style: { margin: '4px 6px' }, onclick: () => App.switchTab('home') }, [Icons.arrowUp(), 'Back']);
    feed.appendChild(back);

    feed.appendChild(Feed.renderPost(root, { isMe: root.id.charCodeAt(0) % 2 === 0 }));

    // Reply count
    const total = countAll(root.replies || []);
    if (total > 0) {
      feed.appendChild(h('div', { class: 'day-divider', text: total + ' repl' + (total === 1 ? 'y' : 'ies') }));
    }

    // Render nested replies
    const renderLevel = (parent, replies, depth) => {
      const wrap = h('div', { class: 'thread-children' });
      replies.forEach((r) => {
        wrap.appendChild(Feed.renderPost(r, { isMe: r.id.charCodeAt(0) % 2 === 0, isReply: true, depth, parent }));
        if (r.replies && r.replies.length) renderLevel(r, r.replies, depth + 1);
      });
      return wrap;
    };
    if (root.replies?.length) feed.appendChild(renderLevel(root, root.replies, 1));

    // Reply composer at bottom
    const replyBox = h('div', { class: 'composer', style: { position: 'static', margin: '14px 6px 0', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)' } }, [
      h('div', { class: 'row' }, [
        h('div', { class: 'input-wrap' }, [
          (() => {
            const t = h('textarea', { rows: '1', placeholder: 'Reply to this entry…' });
            t.style.cssText = 'width:100%;border:0;outline:0;resize:none;background:transparent;color:var(--text);font:inherit;line-height:1.4;padding:8px 0;';
            t.addEventListener('input', () => { t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; });
            t.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(t.value, t); }
            });
            return t;
          })(),
        ]),
        h('button', { class: 'send', title: 'Send', onclick: (e) => { const t = e.currentTarget.parentNode.querySelector('textarea'); send(t.value, t); } }, [Icons.send()]),
      ]),
    ]);
    feed.appendChild(replyBox);

    host.appendChild(feed);
    host.scrollTop = 0;
  }

  function countAll(replies) {
    let n = 0;
    function walk(r) { for (const x of r) { n++; if (x.replies?.length) walk(x.replies); } }
    walk(replies);
    return n;
  }

  async function send(text, ta) {
    const content = (text || '').trim();
    if (!content) { toast('Type a reply first', 'error'); return; }
    try {
      await Api.createPost({ content, parentId: currentId });
      ta.value = ''; ta.style.height = 'auto';
      await refresh();
      toast('Reply sent', 'success', 1200);
    } catch (e) {
      toast('Reply failed: ' + (e.body?.error || e.message), 'error');
    }
  }

  global.Thread = { mount, refresh };
})(window);
