/* store.js — state + persistence */
(function (global) {
  'use strict';
  const S = {
    posts: [],          // timeline (oldest -> newest)
    cursor: null,
    done: false,
    byId: {},
    tags: {},
    // prefs
    theme: 'light',
    displayName: 'You',
    avatar: null,
    bg: null,
    pwHash: null,
    pwSalt: null,
    active: 'home',
  };
  const fns = new Set();
  S.on = (f) => { fns.add(f); return () => fns.delete(f); };
  S.emit = () => fns.forEach((f) => f(S));

  S.hydrate = () => {
    const p = global.U.ls.get('prefs', {});
    Object.assign(S, p);
  };
  S.save = () => {
    const { posts, cursor, done, byId, tags, ...prefs } = S;
    global.U.ls.set('prefs', prefs);
  };

  S.upsert = (post) => {
    if (!post || !post.id) return;
    S.byId[post.id] = post;
    const i = S.posts.findIndex((p) => p.id === post.id);
    if (i >= 0) S.posts[i] = post; else S.posts.push(post);
    S.recomputeTags();
  };
  S.remove = (id) => {
    S.posts = S.posts.filter((p) => p.id !== id);
    delete S.byId[id];
    S.recomputeTags();
  };
  S.recomputeTags = () => {
    const t = {};
    for (const p of S.posts) for (const tag of (p.tags || [])) t[tag] = (t[tag] || 0) + 1;
    S.tags = t;
  };

  S.pin = (id) => {
    const arr = global.U.ls.get('pins', []) || [];
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.unshift(id);
    global.U.ls.set('pins', arr);
  };
  S.isPinned = (id) => (global.U.ls.get('pins', []) || []).includes(id);

  S.setPw = async (pw) => {
    if (!pw) { S.pwHash = null; S.pwSalt = null; }
    else { S.pwSalt = global.U.uid('s'); S.pwHash = await global.U.sha256(pw + ':' + S.pwSalt); }
    S.save();
  };
  S.checkPw = async (pw) => {
    if (!S.pwHash) return true;
    return (await global.U.sha256(pw + ':' + S.pwSalt)) === S.pwHash;
  };

  global.S = S;
})(window);
