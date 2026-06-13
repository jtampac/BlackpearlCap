/* =====================================================================
   Black Pearl Capital — scroll reveals & animated counters
   ===================================================================== */
window.BPC = window.BPC || {};
(function (BPC) {
  "use strict";

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  BPC.initReveals = function () {
    var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  };

  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function animateCount(node) {
    var target = parseFloat(node.getAttribute("data-target"));
    var decimals = parseInt(node.getAttribute("data-decimals") || "0", 10);
    var dur = 1900;
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var val = target * easeOutExpo(p);
      node.textContent = val.toLocaleString("en-US", {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
      });
      if (p < 1) requestAnimationFrame(frame);
      else node.textContent = target.toLocaleString("en-US", {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
      });
    }
    requestAnimationFrame(frame);
  }

  BPC.initCounters = function () {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-target]"));
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) {
        var d = parseInt(n.getAttribute("data-decimals") || "0", 10);
        n.textContent = parseFloat(n.getAttribute("data-target"))
          .toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animateCount(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (n) { io.observe(n); });
  };
})(window.BPC);
