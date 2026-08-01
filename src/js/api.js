/* api.js — fetch wrapper for Glass Journal API */
(function (global) {
  'use strict';

  const DEFAULT_BASE = 'https://thread-07jf.onrender.com';
  const STORAGE_KEY = 'gj:apiBase';

  // Map server error codes to human messages
  function humanizeError(code) {
    if (!code) return '';
    const map = {
      empty_post: 'Write some text or attach a file first.',
      parent_not_found: 'The post you\'re replying to was deleted.',
      has_replies: 'Delete the replies first, then the original post.',
      unsupported_media: 'This file type isn\'t supported by the server.',
      missing_file: 'No file was received by the server.',
      expected_multipart: 'Upload failed (bad format). Try again.',
      file_too_large: 'File is too large (max 500MB).',
      missing_query: 'Type something to search for.',
      storage_upload_failed: 'Server storage rejected the upload. Try again.',
      internal_error: 'Server error. Try again in a moment.',
      not_found: 'Not found.',
    };
    return map[code] || code;
  }

  const Api = {
    getBase() {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE;
    },
    setBase(url) {
      if (url && url.trim()) localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
      else localStorage.removeItem(STORAGE_KEY);
    },

    async req(path, { method = 'GET', json, form, signal } = {}) {
      const base = Api.getBase();
      const init = { method, headers: {}, signal };
      let body;
      if (json !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        body = JSON.stringify(json);
      } else if (form) {
        body = form;
      }
      const res = await fetch(base + path, init);
      const text = await res.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch { data = text; }
      }
      if (!res.ok) {
        const err = new Error(humanizeError(data && data.error) || (data && data.error) || ('http_' + res.status));
        err.status = res.status;
        err.body = data;
        throw err;
      }
      return data;
    },

    /* health */       H: () => Api.req('/health'),
    /* posts list */   listPosts: (cursor, limit = 20) => Api.req('/posts?limit=' + limit + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')),
    /* post detail */  getPost:  (id) => Api.req('/posts/' + id),
    /* create post */  createPost: (payload) => Api.req('/posts', { method: 'POST', json: payload }),
    /* update post */  updatePost: (id, payload) => Api.req('/posts/' + id, { method: 'PATCH', json: payload }),
    /* delete post */  deletePost: (id) => Api.req('/posts/' + id, { method: 'DELETE' }),

    /* search */       search: (params) => {
      const q = new URLSearchParams();
      if (params.q)    q.set('q', params.q);
      if (params.tag)  q.set('tag', params.tag);
      if (params.type) q.set('type', params.type);
      if (params.limit) q.set('limit', String(params.limit));
      return Api.req('/posts/search?' + q.toString());
    },

    /* by tag */       byTag: (tag) => Api.req('/posts/tags/' + encodeURIComponent(tag)),

    /* upload */       upload: (file, postId, onProgress) => {
      return new Promise((resolve, reject) => {
        const fd = new FormData();
        if (postId) fd.append('post_id', postId);
        fd.append('file', file, file.name);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', Api.getBase() + '/media/upload');
        if (onProgress) xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); });
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch (e) { reject(new Error('bad_response')); }
          } else {
            let body = null; try { body = JSON.parse(xhr.responseText); } catch {}
            const err = new Error(humanizeError(body && body.error) || ('http_' + xhr.status));
            err.status = xhr.status; err.body = body; reject(err);
          }
        };
        xhr.onerror = () => reject(new Error('network — check your connection'));
        xhr.send(fd);
      });
    },
    allowedMimes: () => Api.req('/media/allowed-mimes'),
  };

  global.Api = Api;
  global.Api.humanizeError = humanizeError;
})(window);
