/* util.js — small helpers used everywhere */
(function (global) {
  'use strict';

  const Util = {};

  Util.h = (tag, props = {}, children = []) => {
    const el = document.createElement(tag);
    for (const k in props) {
      if (k === 'class') el.className = props[k];
      else if (k === 'style' && typeof props[k] === 'object') Object.assign(el.style, props[k]);
      else if (k === 'dataset' && typeof props[k] === 'object') Object.assign(el.dataset, props[k]);
      else if (k === 'html') el.innerHTML = props[k];
      else if (k === 'text') el.textContent = props[k];
      else if (k.startsWith('on') && typeof props[k] === 'function') el.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else if (k in el) { try { el[k] = props[k]; } catch { el.setAttribute(k, props[k]); } }
      else el.setAttribute(k, props[k]);
    }
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null || c === false) return;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return el;
  };

  Util.uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  Util.fmtBytes = (b) => {
    if (!b && b !== 0) return '';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0; let n = b;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n.toFixed(0) : n.toFixed(n < 10 ? 1 : 0)) + ' ' + u[i];
  };

  Util.fmtTime = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  Util.fmtDate = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };
  Util.fmtDateTime = (iso) => Util.fmtDate(iso) + ' · ' + Util.fmtTime(iso);
  Util.smartStamp = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return Util.fmtTime(iso);
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    const within = (now - d) < 7 * 86400e3;
    if (within) return d.toLocaleDateString([], { weekday: 'short' });
    return Util.fmtDate(iso);
  };

  Util.fmtDuration = (sec) => {
    if (!sec && sec !== 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  Util.debounce = (fn, wait = 200) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait); };
  };
  Util.throttle = (fn, wait = 200) => {
    let last = 0; let t;
    return (...args) => {
      const now = Date.now();
      const r = () => { last = now; fn.apply(null, args); };
      if (now - last >= wait) r();
      else { clearTimeout(t); t = setTimeout(r, wait - (now - last)); }
    };
  };

  Util.escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  Util.linkify = (text) => {
    const esc = Util.escapeHtml(text);
    return esc.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  };

  Util.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  Util.nowIso = () => new Date().toISOString();

  Util.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); return true; } catch { return false; } finally { ta.remove(); }
    }
  };

  // Download a blob/url to the device
  Util.saveAs = (url, filename) => {
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'file';
    document.body.appendChild(a); a.click(); a.remove();
  };

  // Make a thumbnail URL by appending CDN-friendly query params.
  // Falls back to the original URL if the server doesn't honor the params.
  Util.makeThumbUrl = (url, w = 320) => {
    if (!url) return url;
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(w));
      u.searchParams.set('q', '70');
      u.searchParams.set('auto', 'format');
      return u.toString();
    } catch { return url; }
  };

  // Hashing (SHA-256) for password verification, returns hex
  Util.sha256 = async (str) => {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // LocalStorage with namespace
  Util.ls = {
    get: (k, fallback = null) => {
      try { const v = localStorage.getItem('gj:' + k); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set: (k, v) => { try { localStorage.setItem('gj:' + k, JSON.stringify(v)); } catch {} },
    remove: (k) => { try { localStorage.removeItem('gj:' + k); } catch {} },
  };

  // Toast
  Util.toast = (msg, type = '', ms = 2400) => {
    let host = document.querySelector('.toast-wrap');
    if (!host) {
      host = Util.h('div', { class: 'toast-wrap' });
      document.body.appendChild(host);
    }
    const t = Util.h('div', { class: 'toast ' + (type || '') }, msg);
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = 'all .25s'; }, ms - 250);
    setTimeout(() => t.remove(), ms);
  };

  // Modal helpers
  Util.openModal = (contentEl) => {
    const back = Util.h('div', { class: 'modal-back open' });
    const modal = Util.h('div', { class: 'modal' });
    modal.appendChild(Util.h('div', { class: 'grip' }));
    modal.appendChild(contentEl);
    back.appendChild(modal);
    back.addEventListener('click', (e) => { if (e.target === back) Util.closeModal(back); });
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('open'));
    return back;
  };
  Util.closeModal = (back) => { if (!back) return; back.classList.remove('open'); setTimeout(() => back.remove(), 200); };

  // Confirm sheet
  Util.confirm = ({ title, body, confirmText = 'Confirm', danger = false }) => new Promise((resolve) => {
    const el = Util.h('div', {}, [
      Util.h('h2', { text: title || 'Are you sure?' }),
      body ? Util.h('p', { class: 'muted', style: { margin: '0 18px 8px', fontSize: '13px', lineHeight: '1.5' }, text: body }) : null,
      Util.h('div', { class: 'actions' }, [
        Util.h('button', { class: 'ghost', text: 'Cancel', onclick: () => { Util.closeModal(back); resolve(false); } }),
        Util.h('button', { class: danger ? 'danger' : 'primary', text: confirmText, onclick: () => { Util.closeModal(back); resolve(true); } }),
      ]),
    ]);
    const back = Util.openModal(el);
  });

  global.Util = Util;
})(window);
