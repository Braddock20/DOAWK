/* api.js — minimal fetch wrapper for Glass Journal API */
(function (global) {
  'use strict';
  const BASE = 'https://thread-07jf.onrender.com';

  function humanize(code) {
    if (!code) return '';
    const m = {
      empty_post: 'Write something first.',
      parent_not_found: 'Reply target was deleted.',
      has_replies: 'Delete the replies first.',
      unsupported_media: 'This file type is not allowed by the server.',
      missing_file: 'No file received.',
      expected_multipart: 'Upload format error.',
      file_too_large: 'File too large (max 500MB).',
      missing_query: 'Type a search term.',
      storage_upload_failed: 'Server storage error. Try again.',
      internal_error: 'Server error. Try again.',
      not_found: 'Not found.',
    };
    return m[code] || code;
  }

  async function req(path, opts = {}) {
    const init = { method: opts.method || 'GET', headers: {} };
    if (opts.json !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.json);
    }
    const res = await fetch(BASE + path, init);
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!res.ok) {
      const e = new Error(humanize(data && data.error) || ('http_' + res.status));
      e.status = res.status; e.body = data; e.code = data && data.error;
      throw e;
    }
    return data;
  }

  const A = {
    list:   (cursor, limit = 20) => req('/posts?limit=' + limit + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')),
    get:    (id) => req('/posts/' + id),
    create: (data) => req('/posts', { method: 'POST', json: data }),
    update: (id, data) => req('/posts/' + id, { method: 'PATCH', json: data }),
    del:    (id) => req('/posts/' + id, { method: 'DELETE' }),
    search: ({ q, tag, type, limit = 50 }) => {
      const p = new URLSearchParams();
      if (q) p.set('q', q); if (tag) p.set('tag', tag); if (type) p.set('type', type);
      p.set('limit', String(limit));
      return req('/posts/search?' + p.toString());
    },
    byTag:  (tag) => req('/posts/tags/' + encodeURIComponent(tag)),
    upload: (file, postId, onProgress) => new Promise((resolve, reject) => {
      const fd = new FormData();
      if (postId) fd.append('post_id', postId);
      fd.append('file', file, file.name);
      const x = new XMLHttpRequest();
      x.open('POST', BASE + '/media/upload');
      if (onProgress) x.upload.addEventListener('progress', (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); });
      x.onload = () => {
        if (x.status >= 200 && x.status < 300) {
          try { resolve(JSON.parse(x.responseText)); } catch { reject(new Error('bad_response')); }
        } else {
          let body = null; try { body = JSON.parse(x.responseText); } catch {}
          const e = new Error(humanize(body && body.error) || ('http_' + x.status));
          e.status = x.status; e.body = body; e.code = body && body.error;
          reject(e);
        }
      };
      x.onerror = () => reject(new Error('network'));
      x.send(fd);
    }),
    humanize,
  };
  global.A = A;
})(window);
