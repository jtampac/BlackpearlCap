/* =====================================================================
   Black Pearl Capital — World map component
   Equirectangular dotted map (hand-authored land mask) with great-circle
   style capital-flow arcs. Pure SVG, no dependencies.
   ===================================================================== */
window.BPC = window.BPC || {};
(function (BPC) {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var COLS = 60;
  var ROWS_TOP = 1, ROWS_BOT = 23;
  var NROWS = ROWS_BOT - ROWS_TOP + 1;
  var LAT_TOP = 84, LAT_BOT = -54;
  var VBW = 1000;
  var VBH = Math.round(VBW * (LAT_TOP - LAT_BOT) / 360); /* = 383 */

  /* Hand-authored land mask: row -> inclusive [startCol, endCol] ranges.
     6-degree cells; verified to read as Earth with offices on land. */
  var LAND = {
    1:  [[8,13],[22,25],[33,33]],
    2:  [[6,16],[21,26],[40,46],[50,55]],
    3:  [[4,18],[20,26],[31,33],[35,58]],
    4:  [[3,19],[21,25],[27,27],[30,59]],
    5:  [[5,20],[28,59]],
    6:  [[6,20],[28,59]],
    7:  [[8,19],[27,59]],
    8:  [[8,18],[27,54]],
    9:  [[8,18],[27,53]],
    10: [[10,15],[27,52]],
    11: [[11,19],[27,51]],
    12: [[13,19],[27,51]],
    13: [[14,19],[27,51]],
    14: [[16,24],[27,40],[44,50]],
    15: [[16,24],[28,40],[45,55]],
    16: [[16,24],[29,41],[45,55]],
    17: [[17,24],[30,41],[47,55]],
    18: [[17,23],[30,41],[46,55]],
    19: [[17,23],[31,39],[47,55]],
    20: [[17,22],[31,37],[48,55]],
    21: [[17,21],[53,53],[57,58]],
    22: [[17,20],[57,58]],
    23: [[17,19]]
  };

  var OFFICES = [
    { id: "geneva", city: "Geneva", region: "Headquarters", country: "Switzerland",
      entity: "Black Pearl Capital SA", lon: 6.14, lat: 46.20, coords: "46.20\u00B0N 6.14\u00B0E",
      tz: "Europe/Zurich", phone: "+41 22 505 6202", tel: "+41225056202",
      address: ["Rue Muzy 7", "CH-1207 Geneva", "Switzerland"] },
    { id: "cayman", city: "Cayman Islands", region: "Registered Office", country: "Grand Cayman",
      entity: "Black Pearl Capital Ltd", lon: -81.38, lat: 19.29, coords: "19.29\u00B0N 81.38\u00B0W",
      tz: "America/Cayman", phone: "+1 345 769 7494", tel: "+13457697494",
      address: ["Fifth Floor, Zephyr House", "122 Mary Street", "George Town KY1-1206, Grand Cayman"] },
    { id: "dubai", city: "Dubai", region: "Middle East", country: "United Arab Emirates",
      entity: "Black Pearl Capital LLC", lon: 55.30, lat: 25.20, coords: "25.20\u00B0N 55.30\u00B0E",
      tz: "Asia/Dubai", phone: "+971 4 568 6236", tel: "+97145686236",
      address: ["Suite 2608, Al Manara Tower", "Business Bay", "Dubai, United Arab Emirates"] },
    { id: "hongkong", city: "Hong Kong", region: "Asia Pacific", country: "Hong Kong SAR",
      entity: "Black Pearl Capital Ltd", lon: 114.17, lat: 22.32, coords: "22.32\u00B0N 114.17\u00B0E",
      tz: "Asia/Hong_Kong", phone: "+852 274 37566", tel: "+85227437566",
      address: ["206 Wing Hing Industrial Building", "499 Castle Peak Road, Cheung Sha Wan", "Kowloon, Hong Kong"] }
  ];

  /* Capital-flow network, anchored on the Geneva headquarters. */
  var ARCS = [
    ["geneva", "cayman"],
    ["geneva", "dubai"],
    ["geneva", "hongkong"],
    ["dubai", "hongkong"]
  ];

  function byId(id) {
    for (var i = 0; i < OFFICES.length; i++) { if (OFFICES[i].id === id) return OFFICES[i]; }
    return null;
  }
  function proj(lon, lat) {
    return {
      x: (lon + 180) / 360 * VBW,
      y: (LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * VBH
    };
  }
  function el(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); }
    return n;
  }

  BPC.OFFICES = OFFICES;
  /* Position (in %) for an HTML marker layer overlaid on the map box. */
  BPC.pctPos = function (lon, lat) {
    return {
      left: (lon + 180) / 360 * 100,
      top: (LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * 100
    };
  };

  BPC.buildWorldMap = function (svg, opts) {
    opts = opts || {};
    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var suffix = opts.idSuffix || Math.random().toString(36).slice(2, 7);

    svg.setAttribute("viewBox", "0 0 " + VBW + " " + VBH);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("aria-hidden", "true");
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    /* defs: arc gradient */
    var defs = el("defs", {});
    var grad = el("linearGradient", { id: "arcGrad-" + suffix, x1: "0", y1: "0", x2: "1", y2: "0" });
    grad.appendChild(el("stop", { offset: "0%",  "stop-color": "#C2A56A", "stop-opacity": "0" }));
    grad.appendChild(el("stop", { offset: "50%", "stop-color": "#DCC692", "stop-opacity": "0.85" }));
    grad.appendChild(el("stop", { offset: "100%","stop-color": "#C2A56A", "stop-opacity": "0" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    /* graticule — faint cartographic grid */
    var grid = el("g", { class: "map-grid" });
    var lon, lat;
    for (lon = -150; lon <= 150; lon += 30) {
      var gx = proj(lon, 0).x;
      grid.appendChild(el("line", { x1: gx.toFixed(1), y1: "0", x2: gx.toFixed(1), y2: VBH }));
    }
    for (lat = 60; lat >= -30; lat -= 30) {
      var gy = proj(0, lat).y;
      grid.appendChild(el("line", { x1: "0", y1: gy.toFixed(1), x2: VBW, y2: gy.toFixed(1) }));
    }
    svg.appendChild(grid);

    /* land dots */
    var dots = el("g", { class: "map-dots" });
    var r;
    for (r = ROWS_TOP; r <= ROWS_BOT; r++) {
      var ranges = LAND[r];
      if (!ranges) continue;
      for (var i = 0; i < ranges.length; i++) {
        for (var c = ranges[i][0]; c <= ranges[i][1]; c++) {
          var cx = (c + 0.5) / COLS * VBW;
          var cy = (r - ROWS_TOP + 0.5) / NROWS * VBH;
          dots.appendChild(el("circle", { class: "map-dot", cx: cx.toFixed(1), cy: cy.toFixed(1), r: "1.7" }));
        }
      }
    }
    svg.appendChild(dots);

    /* arcs + travelling capital-flow packets */
    var arcs = el("g", { class: "map-arcs" });
    for (var a = 0; a < ARCS.length; a++) {
      var p1 = proj(byId(ARCS[a][0]).lon, byId(ARCS[a][0]).lat);
      var p2 = proj(byId(ARCS[a][1]).lon, byId(ARCS[a][1]).lat);
      var mx = (p1.x + p2.x) / 2;
      var my = (p1.y + p2.y) / 2;
      var dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      var lift = Math.min(dist * 0.28, 120) + 16;
      var cy2 = my - lift;
      var d = "M" + p1.x.toFixed(1) + " " + p1.y.toFixed(1) +
              " Q" + mx.toFixed(1) + " " + cy2.toFixed(1) +
              " " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
      var routeId = "route-" + suffix + "-" + a;
      var rg = el("g", { class: "route", "data-a": ARCS[a][0], "data-b": ARCS[a][1] });
      rg.appendChild(el("path", {
        id: routeId, class: "arc-line", d: d, "pathLength": "100",
        stroke: "url(#arcGrad-" + suffix + ")"
      }));
      if (!reduced) {
        var comet = el("path", { class: "arc-comet", d: d, pathLength: "100" });
        comet.style.animationDelay = (a * 1.25) + "s";
        rg.appendChild(comet);

        var dur = (3.6 + a * 0.5).toFixed(1);
        var flow = el("circle", { class: "route-flow", r: "2.4" });
        var mo = el("animateMotion", {
          dur: dur + "s", repeatCount: "indefinite", begin: (a * 0.9) + "s",
          calcMode: "spline", keyTimes: "0;1", keySplines: "0.4 0 0.2 1", rotate: "auto"
        });
        var mp = el("mpath", {});
        mp.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + routeId);
        mp.setAttribute("href", "#" + routeId);
        mo.appendChild(mp);
        var fo = el("animate", {
          attributeName: "opacity", values: "0;1;1;0", keyTimes: "0;0.12;0.85;1",
          dur: dur + "s", begin: (a * 0.9) + "s", repeatCount: "indefinite"
        });
        flow.appendChild(mo); flow.appendChild(fo);
        rg.appendChild(flow);
      }
      arcs.appendChild(rg);
    }
    svg.appendChild(arcs);

    /* decorative glowing hubs (hero only) */
    if (opts.hubs) {
      var hubs = el("g", { class: "map-hubs" });
      for (var h = 0; h < OFFICES.length; h++) {
        var p = proj(OFFICES[h].lon, OFFICES[h].lat);
        hubs.appendChild(el("circle", { class: "hub-core", cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: "2.6" }));
        if (!reduced) {
          var ring = el("circle", { class: "hub-ring", cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: "3" });
          var an = el("animate", {
            attributeName: "r", values: "3;14", dur: "3.4s",
            begin: (h * 0.6) + "s", repeatCount: "indefinite", calcMode: "spline",
            keySplines: "0.22 1 0.36 1", keyTimes: "0;1"
          });
          var ao = el("animate", {
            attributeName: "opacity", values: "0.6;0", dur: "3.4s",
            begin: (h * 0.6) + "s", repeatCount: "indefinite"
          });
          ring.appendChild(an); ring.appendChild(ao);
          hubs.appendChild(ring);
        }
      }
      svg.appendChild(hubs);
    }
  };
})(window.BPC);
