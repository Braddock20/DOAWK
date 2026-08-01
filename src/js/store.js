/* store.js — in-memory store + persistent user prefs (settings, pins, drafts, password gate) */
(function (global) {
  'use strict';

  const Store = {
    state: {
      // runtime
      timeline: [],         // top-level posts newest-last (chat order)
      timelineCursor: null, // next_cursor from server
      timelineDone: false,
      repliesById: {},      // id -> Post with nested replies
      byId: {},             // id -> Post (raw)
      tags: {},             // tag -> count
      mediaByPost: {},      // postId -> Media[] (latest known)
      suggestions: { tags: [], types: [] },
      // prefs
      theme: 'dark',
      accent: 'auto',
      bg: null,             // background image dataURL or null
      displayName: 'You',
      avatar: null,         // dataURL
      mePronoun: 'me',
      locked: true,         // password gate
      passwordHash: null,   // sha256(password + salt)
      passwordSalt: null,
      // session
      filterTag: null,
      filterType: null,
      query: '',
      activeTab: 'home',
    },
    listeners: new Set(),

    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    emit() { this.listeners.forEach((fn) => fn(this.state)); },

    set(patch) {
      Object.assign(this.state, patch);
      this.emit();
    },

    /* ---------- persistence of prefs (NOT posts — those come from server) ---------- */
    hydrate() {
      const ls = window.Util.ls;
      const saved = ls.get('prefs', null);
      if (saved) Object.assign(this.state, saved);

      // Refresh locks
      this.state.locked = !!this.state.passwordHash;
    },
    persistPrefs() {
      const { timeline, timelineCursor, timelineDone, repliesById, byId, tags, mediaByPost, suggestions, ...prefs } = this.state;
      window.Util.ls.set('prefs', prefs);
    },

    /* ---------- timeline helpers (chat order = oldest first, newest at bottom) ---------- */
    upsertPost(post) {
      if (!post || !post.id) return;
      this.state.byId[post.id] = post;
      const idx = this.state.timeline.findIndex((p) => p.id === post.id);
      if (idx >= 0) this.state.timeline[idx] = post;
      else this.state.timeline.push(post);
      this.recomputeTags();
    },
    removePost(id) {
      this.state.timeline = this.state.timeline.filter((p) => p.id !== id);
      delete this.state.byId[id];
      delete this.state.repliesById[id];
      this.recomputeTags();
    },
    setReplies(id, repliesTree) {
      this.state.repliesById[id] = repliesTree;
    },
    recomputeTags() {
      const t = {};
      for (const p of this.state.timeline) {
        for (const tag of (p.tags || [])) t[tag] = (t[tag] || 0) + 1;
      }
      this.state.tags = t;
    },

    /* ---------- media cache invalidation (signed URLs expire in 1h) ---------- */
    isUrlFresh(url) {
      // Heuristic: signed URL has X-Amz-Date / X-Amz-Expires. We just re-fetch after 50min.
      if (!url) return false;
      const c = window.Util.ls.get('mediaCache:' + url, null);
      if (!c) return false;
      return (Date.now() - c) < 50 * 60 * 1000;
    },
    markUrlFresh(url) { window.Util.ls.set('mediaCache:' + url, Date.now()); },

    /* ---------- password gate ---------- */
    async setPassword(pw) {
      if (!pw) {
        this.state.passwordHash = null; this.state.passwordSalt = null;
      } else {
        this.state.passwordSalt = window.Util.uid('s');
        this.state.passwordHash = await window.Util.sha256(pw + ':' + this.state.passwordSalt);
      }
      this.state.locked = !!this.state.passwordHash;
      this.persistPrefs();
    },
    async verifyPassword(pw) {
      if (!this.state.passwordHash) return true;
      const h = await window.Util.sha256(pw + ':' + this.state.passwordSalt);
      return h === this.state.passwordHash;
    },
  };

  global.Store = Store;
})(window);
