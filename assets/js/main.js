/* =====================================================================
   Black Pearl Capital — orchestration (v2)
   ===================================================================== */
(function () {
  "use strict";
  var BPC = window.BPC || {};
  var OFFICES = BPC.OFFICES || [];

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function officeById(id) {
    for (var i = 0; i < OFFICES.length; i++) { if (OFFICES[i].id === id) return OFFICES[i]; }
    return null;
  }
  function fmtTime(tz) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz
      }).format(new Date());
    } catch (e) { return "--:--"; }
  }
  function updateClocks() {
    var els = document.querySelectorAll("[data-tz]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i], t = fmtTime(el.getAttribute("data-tz"));
      if (el.classList.contains("contact-card__time")) el.textContent = "Local time " + t;
      else el.textContent = t;
    }
  }

  ready(function () {

    /* ---- Hero entrance ---- */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { document.body.classList.add("is-loaded"); });
    });

    /* ---- Navigation ---- */
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav__toggle");
    var prog = document.createElement("div");
    prog.className = "scroll-prog"; prog.setAttribute("aria-hidden", "true");
    prog.innerHTML = "<span></span>";
    document.body.appendChild(prog);
    var progBar = prog.firstChild;
    var onScroll = function () {
      if (window.scrollY > 24) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progBar.style.transform = "scaleX(" + (h > 0 ? Math.min(window.scrollY / h, 1) : 0) + ")";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    document.querySelectorAll(".nav__links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    });

    /* ---- Active section highlight ---- */
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav__links a[href^='#']"));
    var secs = links.map(function (l) { return document.querySelector(l.getAttribute("href")); }).filter(Boolean);
    if ("IntersectionObserver" in window && secs.length) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (l) {
              l.classList.toggle("is-active", l.getAttribute("href") === "#" + en.target.id);
            });
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      secs.forEach(function (s) { sio.observe(s); });
    }

    /* ---- Maps ---- */
    var heroSvg = document.getElementById("hero-map");
    if (heroSvg && BPC.buildWorldMap) BPC.buildWorldMap(heroSvg, { hubs: true, idSuffix: "hero" });
    var mapSvg = document.getElementById("presence-map");
    if (mapSvg && BPC.buildWorldMap) BPC.buildWorldMap(mapSvg, { idSuffix: "presence" });
    var contactSvg = document.getElementById("contact-map");
    if (contactSvg && BPC.buildWorldMap) BPC.buildWorldMap(contactSvg, { idSuffix: "contact" });

    /* ---- Marker builder ---- */
    function tipHTML(o) {
      return '<span class="marker__tip"><strong>' + o.city + '</strong>' +
             '<span>' + o.entity + '<br>' + o.coords + '</span></span>';
    }
    function buildMarkers(container, opts) {
      opts = opts || {};
      if (!container || !BPC.pctPos) return;
      OFFICES.forEach(function (o, idx) {
        var pos = BPC.pctPos(o.lon, o.lat);
        var m = document.createElement("button");
        m.className = "marker"; m.type = "button";
        m.style.left = pos.left + "%"; m.style.top = pos.top + "%";
        m.style.setProperty("--mi", idx);
        m.setAttribute("data-office", o.id);
        m.setAttribute("aria-label", o.city + " office \u2014 " + o.entity);
        m.innerHTML =
          '<span class="marker__ring"></span><span class="marker__ring r2"></span>' +
          '<span class="marker__dot"></span><span class="marker__hit"></span>' + tipHTML(o);
        m.addEventListener("mouseenter", function () { opts.onHover && opts.onHover(o.id, true); });
        m.addEventListener("mouseleave", function () { opts.onHover && opts.onHover(o.id, false); });
        m.addEventListener("focus", function () { opts.onHover && opts.onHover(o.id, true); });
        m.addEventListener("blur", function () { opts.onHover && opts.onHover(o.id, false); });
        if (opts.onSelect) m.addEventListener("click", function () { opts.onSelect(o.id); });
        container.appendChild(m);
      });
    }

    /* ---- Presence: hover link, select + zoom, detail panel ---- */
    var mapWrap = document.querySelector(".presence .map-wrap");
    var mapZoom = document.getElementById("map-zoom");
    var presenceMarkers = document.getElementById("map-markers");
    var offices = document.getElementById("offices");
    var detail = document.getElementById("office-detail");
    var resetBtn = document.getElementById("map-reset");
    var selectedId = null;

    function pMarker(id) { return presenceMarkers ? presenceMarkers.querySelector('.marker[data-office="' + id + '"]') : null; }
    function pOffice(id) { return offices ? offices.querySelector('.office[data-office="' + id + '"]') : null; }

    function lightRoutes(svg, id, on) {
      if (!svg) return;
      var routes = svg.querySelectorAll('.route[data-a="' + id + '"], .route[data-b="' + id + '"]');
      for (var i = 0; i < routes.length; i++) routes[i].classList.toggle("is-lit", on);
    }

    function setHover(id, on) {
      var keep = (id === selectedId);
      var mk = pMarker(id), of = pOffice(id);
      if (mk) mk.classList.toggle("is-active", on || keep);
      if (of) of.classList.toggle("is-active", on || keep);
      lightRoutes(mapSvg, id, on || keep);
    }
    function detailHTML(o) {
      if (!o) {
        return '<span class="office-detail__region">Global Network</span>' +
          '<div class="office-detail__city">Four jurisdictions</div>' +
          '<p class="office-detail__entity">Geneva &middot; Cayman Islands &middot; Dubai &middot; Hong Kong</p>' +
          '<address>A single capital-flow network spanning Europe, the Americas, the Middle East and Asia Pacific. Select an office to explore it in detail.</address>';
      }
      return '<span class="office-detail__region">' + o.region + '</span>' +
        '<div class="office-detail__city">' + o.city + '</div>' +
        '<p class="office-detail__entity">' + o.entity + '</p>' +
        '<address>' + o.address.join("<br>") + '</address>' +
        '<div class="office-detail__row">' +
          '<span class="office-detail__clock"><span>Local time</span> <b class="t" data-tz="' + o.tz + '">--:--</b></span>' +
          '<a class="tel" href="tel:' + o.tel + '">' + o.phone + '</a>' +
        '</div>';
    }
    function renderDetail(o) { if (detail) { detail.innerHTML = detailHTML(o); updateClocks(); } }

    function selectOffice(id) {
      var o = officeById(id); if (!o) return;
      if (selectedId && selectedId !== id) setHover(selectedId, false);
      selectedId = id;
      setHover(id, true);
      if (mapZoom && BPC.pctPos) {
        var pos = BPC.pctPos(o.lon, o.lat);
        mapZoom.style.transformOrigin = pos.left + "% " + pos.top + "%";
        mapZoom.style.transform = "scale(2)";
      }
      if (mapWrap) mapWrap.classList.add("is-zoomed");
      if (resetBtn) resetBtn.hidden = false;
      renderDetail(o);
    }
    function resetMap() {
      if (selectedId) setHover(selectedId, false);
      selectedId = null;
      if (mapZoom) { mapZoom.style.transform = ""; mapZoom.style.transformOrigin = "50% 45%"; }
      if (mapWrap) mapWrap.classList.remove("is-zoomed");
      if (resetBtn) resetBtn.hidden = true;
      renderDetail(null);
    }

    buildMarkers(presenceMarkers, {
      onHover: setHover,
      onSelect: function (id) { (selectedId === id) ? resetMap() : selectOffice(id); }
    });
    if (offices) {
      offices.querySelectorAll(".office").forEach(function (of) {
        var id = of.getAttribute("data-office");
        of.addEventListener("mouseenter", function () { setHover(id, true); });
        of.addEventListener("mouseleave", function () { setHover(id, false); });
        of.addEventListener("focus", function () { setHover(id, true); });
        of.addEventListener("blur", function () { setHover(id, false); });
        of.addEventListener("click", function () { (selectedId === id) ? resetMap() : selectOffice(id); });
      });
    }
    if (resetBtn) resetBtn.addEventListener("click", resetMap);
    renderDetail(null);

    /* ---- Contact map markers (decorative, hover only) ---- */
    var contactMarkers = document.getElementById("contact-markers");
    buildMarkers(contactMarkers, {
      onHover: function (id, on) {
        var mk = contactMarkers.querySelector('.marker[data-office="' + id + '"]');
        if (mk) mk.classList.toggle("is-active", on);
        lightRoutes(contactSvg, id, on);
      }
    });

    /* ---- Portfolio sector filtering ---- */
    var pfGrid = document.getElementById("pf-grid");
    var pfEmpty = document.getElementById("pf-empty");
    if (pfGrid) {
      var filters = document.querySelectorAll(".pf-filter");
      var cards = Array.prototype.slice.call(pfGrid.querySelectorAll(".pf-card"));
      filters.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var f = btn.getAttribute("data-filter");
          filters.forEach(function (b) { b.classList.toggle("is-on", b === btn); });
          var shown = 0;
          cards.forEach(function (card) {
            var sec = card.getAttribute("data-sector");
            var summary = card.classList.contains("pf-card--summary");
            var show = (f === "all") ? true : (sec === f && !summary);
            card.classList.toggle("is-hidden", !show);
            if (show) {
              shown++;
              card.classList.remove("pf-in");
              void card.offsetWidth;
              card.classList.add("pf-in");
            }
          });
          if (pfEmpty) pfEmpty.hidden = shown !== 0;
        });
      });
    }

    /* ---- Map reveal choreography + idle highlight ---- */
    var prefersReduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function revealOnce(el) {
      if (!el || !("IntersectionObserver" in window)) { el && el.classList.add("is-revealed"); return; }
      var o = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("is-revealed"); o.unobserve(e.target); }
        });
      }, { threshold: 0.25 });
      o.observe(el);
    }
    revealOnce(mapWrap);
    revealOnce(document.querySelector(".contact__map"));

    var idleTimer = null, idleIdx = 0, userTouched = false;
    function stopIdle() {
      userTouched = true;
      if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
      OFFICES.forEach(function (o) { if (o.id !== selectedId) setHover(o.id, false); });
    }
    function startIdle() {
      if (prefersReduced || userTouched || idleTimer || !presenceMarkers) return;
      idleTimer = setInterval(function () {
        if (userTouched || selectedId) return;
        OFFICES.forEach(function (o) { setHover(o.id, false); });
        var o = OFFICES[idleIdx % OFFICES.length];
        setHover(o.id, true);
        idleIdx++;
      }, 2400);
    }
    if (mapWrap && "IntersectionObserver" in window) {
      var idleObs = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { e.isIntersecting ? startIdle() : (idleTimer && (clearInterval(idleTimer), idleTimer = null)); });
      }, { threshold: 0.3 });
      idleObs.observe(mapWrap);
      var ps = document.querySelector(".presence__layout");
      ["pointerdown", "mouseenter", "focusin"].forEach(function (ev) {
        ps && ps.addEventListener(ev, stopIdle, { once: true });
      });
    }

    /* ---- Components ---- */
    if (BPC.initReveals) BPC.initReveals();
    if (BPC.initCounters) BPC.initCounters();

    /* ---- Live clocks ---- */
    updateClocks();
    setInterval(updateClocks, 1000);

    /* ---- Footer year ---- */
    var yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();
  });
})();
