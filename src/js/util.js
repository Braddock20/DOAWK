/* util.js — small helpers */
(function (global) {
  'use strict';
  const U = {};

  U.h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  };

  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.linkify = (text) => {
    const e = U.esc(text);
    return e.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  };

  U.ls = {
    get(k, d = null) { try { const v = localStorage.getItem('gj:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('gj:' + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem('gj:' + k); } catch {} },
  };

  U.uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);

  U.fmtBytes = (b) => {
    if (!b && b !== 0) return '';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0, n = b;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(n < 10 ? 1 : 0)) + ' ' + u[i];
  };

  U.smartTime = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const n = new Date();
    const sameDay = d.toDateString() === n.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const yest = new Date(n); yest.setDate(n.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    const w = (n - d) < 7 * 86400e3;
    if (w) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  U.dayHeader = (iso, now = new Date()) => {
    const d = new Date(iso);
    if (d.toDateString() === now.toDateString()) return 'Today';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    const diff = (now - d) / 86400e3;
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  U.fmtDur = (s) => {
    if (!s && s !== 0) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  U.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement('textarea'); ta.value = text;
      ta.style.cssText = 'position:fixed;top:-100px;left:0;';
      document.body.appendChild(ta); ta.select();
      try { return document.execCommand('copy'); } finally { ta.remove(); }
    }
  };

  U.saveAs = (url, name) => {
    const a = document.createElement('a'); a.href = url; a.download = name || 'file';
    document.body.appendChild(a); a.click(); a.remove();
  };

  U.sha256 = async (str) => {
    const buf = new TextEncoder().encode(str);
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  U.toast = (msg, type = '', ms = 2400) => {
    let host = document.querySelector('.toasts');
    if (!host) { host = U.h('div', { class: 'toasts' }); document.body.appendChild(host); }
    const t = U.h('div', { class: 'toast ' + type }, msg);
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; }, ms - 250);
    setTimeout(() => t.remove(), ms);
  };

  U.sheet = (content, title) => {
    const scrim = U.h('div', { class: 'scrim open' });
    const sheet = U.h('div', { class: 'sheet' });
    if (title) sheet.appendChild(U.h('h2', { text: title }));
    if (Array.isArray(content)) content.forEach(c => c && sheet.appendChild(c));
    else sheet.appendChild(content);
    scrim.appendChild(sheet);
    scrim.addEventListener('click', (e) => { if (e.target === scrim) U.closeSheet(scrim); });
    document.body.appendChild(scrim);
    return scrim;
  };

  U.closeSheet = (s) => { if (!s) return; s.classList.remove('open'); setTimeout(() => s.remove(), 150); };

  U.confirm = ({ title, body, confirmText = 'Confirm', danger = false } = {}) => new Promise((resolve) => {
    const el = U.h('div', {}, [
      U.h('h2', { text: title || 'Are you sure?' }),
      body ? U.h('p', { class: 'muted', style: { margin: '0 16px 8px', fontSize: '13px' }, text: body }) : null,
      U.h('div', { class: 'actions' }, [
        U.h('button', { class: 'ghost', text: 'Cancel', onclick: () => { U.closeSheet(s); resolve(false); } }),
        U.h('button', { class: danger ? 'danger' : 'primary', text: confirmText, onclick: () => { U.closeSheet(s); resolve(true); } }),
      ]),
    ]);
    const s = U.sheet(el);
  });

  global.U = U;
})(window);
