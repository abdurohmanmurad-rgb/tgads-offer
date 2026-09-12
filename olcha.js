/* olcha.js — o'z analitikamiz. window.OLCHA.url bo'sh bo'lsa hech nima yubormaydi. */
(function (win, doc) {
  "use strict";

  var C = win.OLCHA || {};
  var URL_ = C.url || "";
  var SAYT = C.sayt || "sayt";
  var KALIT = C.kalit || "";

  var FLUSH_MS = 5000, FLUSH_SONI = 15, NAVBAT_MAX = 60;
  var navbat = [], taymer = null, bir_martalar = {};

  var SESSIYA = (function () {
    try {
      var s = sessionStorage.getItem("olcha_s");
      if (s) return s;
      var y = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem("olcha_s", y);
      return y;
    } catch (e) {
      return "s" + Date.now().toString(36);
    }
  })();

  function utm() {
    try {
      var p = new URLSearchParams(location.search), o = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
        if (p.get(k)) o[k] = p.get(k);
      });
      return o;
    } catch (e) { return {}; }
  }

  function yubor(shoshilinch) {
    if (!navbat.length) return;
    var tana = JSON.stringify({
      amal: "olcha", sayt: SAYT, kalit: KALIT, sessiya: SESSIYA, hodisalar: navbat
    });
    navbat = [];
    clearTimeout(taymer); taymer = null;

    if (!URL_) { console.debug("[olcha] url yo'q:", tana.slice(0, 200)); return; }

    try {
      if (shoshilinch && navigator.sendBeacon) {
        navigator.sendBeacon(URL_, new Blob([tana], { type: "text/plain;charset=utf-8" }));
        return;
      }
    } catch (e) {}

    fetch(URL_, {
      method: "POST", mode: "no-cors", keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: tana
    })["catch"](function () {});
  }

  function olcha(hodisa, qoshimcha, bir_marta) {
    if (bir_marta) {
      if (bir_martalar[hodisa]) return;
      bir_martalar[hodisa] = 1;
    }
    if (navbat.length >= NAVBAT_MAX) return;
    navbat.push({
      hodisa: hodisa,
      vaqt: new Date().toISOString(),
      yol: location.pathname,
      qoshimcha: qoshimcha || {}
    });
    if (navbat.length >= FLUSH_SONI) { yubor(false); return; }
    if (!taymer) taymer = setTimeout(function () { yubor(false); }, FLUSH_MS);
  }

  win.olcha = olcha;
  win.olchaYubor = function () { yubor(true); };

  /* --- avtomatik hodisalar --- */

  olcha("page_view", {
    ekran: (win.innerWidth || 0) + "x" + (win.innerHeight || 0),
    referrer: doc.referrer || "",
    utm: utm()
  }, true);

  var bosqichlar = [25, 50, 75, 100], korilgan = {};
  win.addEventListener("scroll", function () {
    var h = doc.documentElement;
    var balandlik = (h.scrollHeight - h.clientHeight) || 1;
    var foiz = Math.round((win.pageYOffset / balandlik) * 100);
    bosqichlar.forEach(function (b) {
      if (foiz >= b && !korilgan[b]) { korilgan[b] = 1; olcha("scroll_" + b, {}, true); }
    });
  }, { passive: true });

  [15, 30, 60, 120, 300].forEach(function (s) {
    setTimeout(function () { olcha("hold_" + s, {}, true); }, s * 1000);
  });

  doc.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("button,a,[data-olcha]");
    if (!el) return;
    var nom = el.getAttribute("data-olcha") || el.id ||
      (el.textContent || "").trim().slice(0, 40) || el.tagName.toLowerCase();
    olcha("bosildi", { tugma: nom });
  }, true);

  win.addEventListener("error", function (e) {
    olcha("js_xato", { xabar: String(e.message || "").slice(0, 200) }, true);
  });

  win.addEventListener("pagehide", function () { olcha("chiqdi", {}); yubor(true); });
})(window, document);
