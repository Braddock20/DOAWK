/* install.js — small helper. The install banner is in app.js. This module adds the
 * iOS-specific hint and a one-time welcome. */
(function (global) {
  'use strict';
  const { h, ls, toast } = window.Util;
  const Icons = window.Icons;

  function maybeShowIosHint() {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isIos || isStandalone || ls.get('iosHintShown', false)) return;
    ls.set('iosHintShown', true);
    setTimeout(() => {
      toast('Tip: tap Share → "Add to Home Screen" to install', '', 6000);
    }, 1800);
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(maybeShowIosHint, 1500));
  global.Install = { maybeShowIosHint };
})(window);
