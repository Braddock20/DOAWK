/* dom.js — minimal icon set */
(function (global) {
  'use strict';
  const I = {};
  const NS = 'http://www.w3.org/2000/svg';
  function mk(children, size = 22, sw = 1.8) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', size);
    s.setAttribute('height', size);
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', sw);
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    if (Array.isArray(children)) {
      children.forEach(c => {
        const el = document.createElementNS(NS, c.t || 'path');
        for (const k in c) {
          if (k === 't') continue;
          el.setAttribute(k === 'd' ? 'd' : k, c[k]);
        }
        s.appendChild(el);
      });
    } else {
      s.innerHTML = children;
    }
    return s;
  }
  I.mk = mk;
  I.home   = (s) => mk('<path d="M3 11 12 3l9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>', s);
  I.search = (s) => mk('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', s);
  I.pin    = (s) => mk('<path d="M12 17v5"/><path d="M9 10v-2a3 3 0 0 1 3-3 3 3 0 0 1 3 3v2l3 3H6z"/>', s);
  I.pinOn  = (s) => { const x = mk('<path d="M12 17v5"/><path d="M9 10v-2a3 3 0 0 1 3-3 3 3 0 0 1 3 3v2l3 3H6z"/>', s); x.setAttribute('fill', 'currentColor'); return x; };
  I.tag    = (s) => mk('<path d="M20 13 13 20 4 11V4h7l9 9z"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/>', s);
  I.media  = (s) => mk('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><path d="m21 16-5-5-9 9"/>', s);
  I.gear   = (s) => mk('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.8a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2l-2.4-.8-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.8a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.8 2-3.4-2-1.5c0-.4.1-.8.1-1.2z"/>', s);
  I.plus   = (s) => mk('<path d="M12 5v14M5 12h14"/>', s);
  I.send   = (s) => mk('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>', s);
  I.mic    = (s) => mk('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4M8 22h8"/>', s);
  I.attach = (s) => mk('<path d="m21 12-8 8a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/>', s);
  I.play   = (s) => { const x = mk('<path d="M6 4v16l14-8z"/>', s); x.setAttribute('fill', 'currentColor'); x.setAttribute('stroke', 'none'); return x; };
  I.close  = (s) => mk('<path d="M18 6 6 18M6 6l12 12"/>', s);
  I.back   = (s) => mk('<path d="m15 6-6 6 6 6"/>', s);
  I.more   = (s) => mk('<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>', s);
  I.trash  = (s) => mk('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', s);
  I.edit   = (s) => mk('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>', s);
  I.copy   = (s) => mk('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', s);
  I.export_= (s) => mk('<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v7H3V3h7"/>', s);
  I.user   = (s) => mk('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', s);
  I.lock   = (s) => mk('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', s);
  I.image  = (s) => mk('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5-9 9"/>', s);
  I.video  = (s) => mk('<rect x="3" y="6" width="14" height="12" rx="2"/><path d="m21 8-4 4 4 4z"/>', s);
  I.file   = (s) => mk('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', s);
  I.moon   = (s) => mk('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>', s);
  I.sun    = (s) => mk('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>', s);
  I.refresh= (s) => mk('<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>', s);
  I.check  = (s) => mk('<path d="m20 6-11 11-5-5"/>', s);
  I.reply  = (s) => mk('<path d="m9 17-5-5 5-5"/><path d="M4 12h11a5 5 0 0 1 5 5v3"/>', s);
  I.bookmark = (s) => mk('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>', s);
  I.flame  = (s) => mk('<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-1 1-1 3"/>', s);
  global.I = I;
})(window);
