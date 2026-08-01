/* dom.js — icons and small DOM factories */
(function (global) {
  'use strict';

  const I = {};

  // 24x24 stroke icons (heroicons-style). Returns an <svg> element.
  I.svg = (children, opts = {}) => {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', opts.sw || '1.7');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    if (opts.size) { s.setAttribute('width', opts.size); s.setAttribute('height', opts.size); }
    if (opts.class) s.setAttribute('class', opts.class);
    if (opts.fill) s.setAttribute('fill', opts.fill);
    children.split('|').forEach((path) => {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', path.trim());
      s.appendChild(p);
    });
    return s;
  };

  I.home      = (o) => I.svg('M3 11.5 12 4l9 7.5|M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9', o);
  I.search    = (o) => I.svg('M11 4a7 7 0 1 0 4.95 11.95L20 20|M16 16l4 4', o);
  I.pin       = (o) => I.svg('M15 4l5 5M13 6l5 5-7 7-3-3-4 4 4-4-3-3 7-7z|M9 14l-5 5', o);
  I.pinSolid  = (o) => { o = { ...o, fill: 'currentColor' }; return I.svg('M14 4l6 6-3 3-3-3-4 4 3 3-4 4-3-3 4-4-3-3 4-4 3 3 3-3z', o); };
  I.tag       = (o) => I.svg('M20.59 13.41 13 21l-9-9V4h8l8.59 8.59a2 2 0 0 1 0 2.82z|M7 7h.01', o);
  I.media     = (o) => I.svg('M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z|M21 15l-5-5L5 21', o);
  I.settings  = (o) => I.svg('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z', o);
  I.plus      = (o) => I.svg('M12 5v14|M5 12h14', o);
  I.send      = (o) => I.svg('M3 11.5 21 12 3 12.5|M3 12 21 4|M3 12 21 20', o);
  I.mic       = (o) => I.svg('M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z|M19 11a7 7 0 0 1-14 0|M12 18v4|M8 22h8', o);
  I.attach    = (o) => I.svg('M21 11.5 12.5 20a5 5 0 0 1-7-7L13 5.5a3.5 3.5 0 0 1 5 5L9.5 19', o);
  I.image     = (o) => I.svg('M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z|M21 15l-5-5L5 21', o);
  I.reply     = (o) => I.svg('M9 17l-5-5 5-5|M4 12h11a5 5 0 0 1 5 5v3', o);
  I.edit      = (o) => I.svg('M12 20h9|M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z', o);
  I.trash     = (o) => I.svg('M3 6h18|M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6|M10 11v6|M14 11v6', o);
  I.more      = (o) => I.svg('M12 5h.01|M12 12h.01|M12 19h.01', o);
  I.close     = (o) => I.svg('M18 6 6 18|M6 6l12 12', o);
  I.arrowDown = (o) => I.svg('M12 5v14|M5 12l7 7 7-7', o);
  I.arrowUp   = (o) => I.svg('M12 19V5|M5 12l7-7 7 7', o);
  I.chevron   = (o) => I.svg('M9 6l6 6-6 6', o);
  I.play      = (o) => I.svg('M5 3v18l15-9L5 3z', o);
  I.download  = (o) => I.svg('M12 3v12|M7 10l5 5 5-5|M5 21h14', o);
  I.copy      = (o) => I.svg('M9 9h11v11H9z|M5 15V5a2 2 0 0 1 2-2h10', o);
  I.share     = (o) => I.svg('M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8|M16 6l-4-4-4 4|M12 2v13', o);
  I.refresh   = (o) => I.svg('M3 12a9 9 0 0 1 15.5-6.4L21 8|M21 3v5h-5|M21 12a9 9 0 0 1-15.5 6.4L3 16|M3 21v-5h5', o);
  I.lock      = (o) => I.svg('M5 11h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z|M7 11V7a5 5 0 0 1 10 0v4', o);
  I.unlock    = (o) => I.svg('M5 11h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z|M7 11V7a5 5 0 0 1 9.9-1', o);
  I.user      = (o) => I.svg('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', o);
  I.export    = (o) => I.svg('M14 3h7v7|M10 14 21 3|M21 14v7H3V3h7', o);
  I.eye       = (o) => I.svg('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', o);
  I.eyeOff    = (o) => I.svg('M17.94 17.94A10.06 10.06 0 0 1 12 19c-6.5 0-10-7-10-7a18.7 18.7 0 0 1 4.06-5.94|M9.9 4.24A9.84 9.84 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19|M14.12 14.12a3 3 0 1 1-4.24-4.24|M2 2l20 20', o);
  I.filter    = (o) => I.svg('M3 4h18l-7 9v6l-4 2v-8L3 4z', o);
  I.bookmark  = (o) => I.svg('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z', o);
  I.apps      = (o) => I.svg('M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5', o);
  I.install   = (o) => I.svg('M12 3v12|M7 10l5 5 5-5|M5 21h14', o);
  I.theme     = (o) => I.svg('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z', o);
  I.clock     = (o) => I.svg('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2', o);
  I.info      = (o) => I.svg('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 16v-4|M12 8h.01', o);
  I.flame     = (o) => I.svg('M8.5 14a4 4 0 0 0 7 0c0-2-3-3-3-7 0 0-2 2-3 4-1 0-1-1-1-3 0 0-4 4 0 6z|M12 22a7 7 0 0 1-7-7c0-3 2-4 2-4', o);
  I.check     = (o) => I.svg('M20 6 9 17l-5-5', o);
  I.x         = (o) => I.svg('M18 6 6 18|M6 6l12 12', o);
  I.heart     = (o) => I.svg('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', o);
  I.link      = (o) => I.svg('M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1|M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1', o);
  I.calendar  = (o) => I.svg('M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M16 2v4|M8 2v4|M3 10h18', o);
  I.doc       = (o) => I.svg('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8', o);

  global.Icons = I;
})(window);
