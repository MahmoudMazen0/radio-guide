/* ============================================================
   M1 · interactive tank simulator
   Plain JS, no dependencies — static-site friendly.

   Physics
     parallel RLC driven by the current the test loop induces:
       H(f) = V / V_peak = 1 / sqrt(1 + Q²(u − 1/u)²),  u = f / f0
       f0   = 1 / (2π √(L · (C + C_stray)))
     ring-down at TP1:
       v(t) = e^(−ω0 t / 2Q) · cos(ω0 t)   →  1/e after Q/π cycles

   Drawn with SVG *classes* (never hardcoded hex) so the dark theme
   comes for free from the --svg-* tokens in style.css.
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var plot = document.getElementById('simPlot');
  if (!plot) return;                       /* page without the widget */

  /* ---------- helpers ---------- */
  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function fmtHz(f) {
    if (f >= 1e6) return (f / 1e6).toFixed(2) + ' MHz';
    if (f >= 1e3) return (f / 1e3).toFixed(1) + ' kHz';
    return f.toFixed(0) + ' Hz';
  }

  /* f0 = 1 / (2π√(LC)) — L in µH, C in pF, result in Hz */
  function f0of(L, C) {
    return 1 / (2 * Math.PI * Math.sqrt(Math.max(L, 1e-6) * 1e-6 * Math.max(C, 1e-6) * 1e-12));
  }
  /* C that tunes L to f — L in µH, result in pF */
  function Cfor(L, f) {
    return 1 / (4 * Math.PI * Math.PI * f * f * L * 1e-6) * 1e12;
  }
  function H(f, f0, Q) {
    var u = f / f0, d = u - 1 / u;
    return 1 / Math.sqrt(1 + Q * Q * d * d);
  }
  function dB(h) { return 20 * Math.log(Math.max(h, 1e-12)) / Math.LN10; }

  var DEFAULTS = { L: 291.5, C: 130, Q: 6.9, stray: 0 };
  var REDUCE = !!(window.matchMedia &&
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var BAND = { lo: 530e3, hi: 1700e3 };
  var CH = 9e3;        /* Region 1 medium-wave channel raster */
  var TARGET = 819e3;  /* Table 4 — what the maths predicted  */
  var BENCH = 623e3;   /* Table 5 — what the bench fitted     */
  var GHOST_Q = 30;    /* "a good coil" reference curve       */

  var st = { L: DEFAULTS.L, C: DEFAULTS.C, Q: DEFAULTS.Q, stray: 0,
             axis: 'zoom', unit: 'lin', ghost: false };

  /* ---------- readouts ---------- */
  var out = {};
  ['f0', 'bw', 'flow', 'fhigh', 'delta', 'd623', 'c819', 'rej', 'ch', 'ring',
   'f280', 'f20', 'verdict'].forEach(function (k) {
    out[k] = document.getElementById('out_' + k);
  });

  function sign(v) {
    if (Math.abs(v) < 0.05) v = 0;          /* no "-0.0 %" */
    return (v >= 0 ? '+' : '') + v.toFixed(1);
  }

  /* every tile must be present, or the whole block degrades to "—"
     instead of throwing halfway through the update */
  var READOUT_KEYS = ['f0', 'bw', 'flow', 'fhigh', 'delta', 'c819',
                      'rej', 'ch', 'ring', 'f280', 'f20', 'verdict'];
  function readoutsReady() {
    for (var i = 0; i < READOUT_KEYS.length; i++) if (!out[READOUT_KEYS[i]]) return false;
    return true;
  }

  function readouts() {
    var L = st.L, Q = st.Q, stray = st.stray;
    var f0 = f0of(L, st.C + stray);
    var fLow = f0 * (1 - 1 / (2 * Q));
    var fHigh = f0 * (1 + 1 / (2 * Q));
    var bw = fHigh - fLow;
    var c819 = Cfor(L, TARGET) - stray;
    var delta = (f0 - TARGET) / TARGET * 100;
    var delta623 = (f0 - BENCH) / BENCH * 100;
    var rej = -dB(H(TARGET + 10e3, f0, Q));
    var eCyc = Q / Math.PI;

    if (readoutsReady()) {
      out.f0.textContent = fmtHz(f0);
      out.bw.textContent = fmtHz(bw);
      out.flow.textContent = fmtHz(fLow);
      out.fhigh.textContent = fmtHz(fHigh);

      /* the two delta chips live inside the hero tile */
      if (out.delta) {
        out.delta.textContent = 'Δ vs 819 · ' + sign(delta) + ' %';
        out.delta.className = 'delta ' + (Math.abs(delta) < 1 ? 'is-ok' : 'is-off');
      }
      if (out.d623) {
        out.d623.textContent = 'Δ vs 623 · ' + sign(delta623) + ' %';
        out.d623.className = 'delta ' + (Math.abs(delta623) < 1 ? 'is-ok' : 'is-off');
      }

      out.c819.textContent = c819.toFixed(1) + ' pF';
      out.rej.textContent = rej.toFixed(1) + ' dB';
      out.ch.textContent = Math.max(1, Math.round(bw / CH)) + ' ×9 kHz';
      out.ring.textContent = eCyc < 1 ? '< 1 cycle' : eCyc.toFixed(1) + ' cycles';

      out.f280.textContent = fmtHz(f0of(L, 280 + stray));
      out.f20.textContent = fmtHz(f0of(L, 20 + stray));

      if (c819 >= 20 && c819 <= 280) {
        out.verdict.textContent = '✓ 819 kHz needs ' + c819.toFixed(1) + ' pF of C' +
          (stray ? ' once the ' + stray + ' pF stray is counted' : '') +
          ' — inside the capacitor’s 20–280 pF range.';
        out.verdict.className = 'verdict ok';
      } else {
        out.verdict.textContent = '✗ 819 kHz needs ' + c819.toFixed(1) + ' pF' +
          (stray ? ' once the ' + stray + ' pF stray is counted' : '') +
          ' — outside the capacitor’s 20–280 pF range.';
        out.verdict.className = 'verdict no';
      }
    }
    return { f0: f0, fLow: fLow, fHigh: fHigh, bw: bw };
  }

  /* ---------- live narrative: the page rewrites its own caption ---------- */
  var storyEl = document.getElementById('simStory');
  function story(r) {
    if (!storyEl) return;
    var s = st.stray, f0 = r.f0;
    var d819 = (f0 - TARGET) / TARGET * 100;
    var d623 = (f0 - BENCH) / BENCH * 100;
    var h;
    if (s > 0 && Math.abs(d623) < 1.5) {
      h = 'Counting <span class="hi">' + s + ' pF</span> of stray / probe capacitance pulls f<sub>0</sub> to ' +
          '<span class="hi">' + fmtHz(f0) + '</span> — <span class="ok">within ' + Math.abs(d623).toFixed(1) +
          ' %</span> of the <b>623 kHz</b> we actually read on the bench (Table 5). ' +
          'The gap between 819 and 623 is the whole story of M1.';
    } else if (s === 0 && Math.abs(d819) < 1) {
      h = 'Nothing extra counted, so the tank sits at <span class="hi">' + fmtHz(f0) + '</span> — ' +
          '<span class="ok">' + Math.abs(d819).toFixed(1) + ' % off</span> the <b>819 kHz</b> the maths ' +
          'predicted (Table 4). Put 100 pF on the probe slider and watch it fall.';
    } else if (s > 0) {
      h = 'With <span class="hi">' + s + ' pF</span> joined to the capacitor, f<sub>0</sub> drops to ' +
          '<span class="hi">' + fmtHz(f0) + '</span> (' + sign(d819) + ' % against 819, ' + sign(d623) +
          ' % against 623). The coil and the capacitor never changed — only the capacitance we forgot.';
    } else {
      h = 'f<sub>0</sub> = <span class="hi">' + fmtHz(f0) + '</span> from L ' + st.L.toFixed(1) +
          ' µH and C ' + st.C + ' pF: ' + sign(d819) + ' % against the 819 kHz design, bandwidth ' +
          '<span class="hi">' + fmtHz(r.bw) + '</span>, and ' + st.Q.toFixed(1) +
          (st.Q < 1.6 ? ' cycle' : ' cycles') + ' of ring-down per 1/e.';
    }
    if (storyEl.innerHTML !== h) storyEl.innerHTML = h;
  }

  /* ---------- response plot ---------- */
  var X0 = 72, X1 = 704, Y0 = 20, Y1 = 260;
  var view = { xMin: BAND.lo, xMax: BAND.hi };   /* kept for the click-to-tune map */

  function draw(r) {
    var Q = st.Q, f0 = r.f0;
    var band = st.axis === 'band';
    var dbMode = st.unit === 'db';

    var xMin, xMax, xTicks;
    if (band) {
      xMin = BAND.lo; xMax = BAND.hi;
      xTicks = [530e3, 700e3, 900e3, 1100e3, 1300e3, 1500e3, 1700e3];
    } else {
      var spread = 3 / (2 * Math.max(Q, 0.5));   /* ±3 half-power widths */
      xMin = Math.max(1e3, f0 * (1 - spread));
      xMax = f0 * (1 + spread);
      xTicks = [xMin, r.fLow, f0, r.fHigh, xMax];
    }
    view.xMin = xMin; view.xMax = xMax;

    var dbMax = band ? 60 : 15;                  /* depth of the dB axis */
    var yTicks = dbMode ? (band ? [0, -20, -40, -60] : [0, -3, -6, -10, -15])
                        : [0, 0.25, 0.5, 0.75, 1];

    var X = function (f) { return X0 + (f - xMin) / (xMax - xMin) * (X1 - X0); };
    var Xc = function (f) { return X(clamp(f, xMin, xMax)); };
    function Y(h) {
      if (!dbMode) return Y1 - h * (Y1 - Y0);
      return Y0 + clamp(-dB(h) / dbMax, 0, 1) * (Y1 - Y0);
    }
    function Ydb(d) { return Y0 + clamp(-d / dbMax, 0, 1) * (Y1 - Y0); }

    while (plot.firstChild) plot.removeChild(plot.firstChild);

    /* frame + grid */
    plot.appendChild(el('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, 'class': 'sim-frame' }));
    yTicks.forEach(function (v) {
      var y = dbMode ? Ydb(v) : Y(v);
      plot.appendChild(el('line', { x1: X0, x2: X1, y1: y, y2: y,
        'class': v === 0 && !dbMode ? 'sim-base' : 'sim-grid' }));
      plot.appendChild(el('text', { x: X0 - 9, y: y + 4, 'text-anchor': 'end', 'class': 'sim-tick' },
        dbMode ? v + ' dB' : v.toFixed(2)));
    });

    /* ---- band mode: 9 kHz channel raster (one path, one node) ---- */
    if (band) {
      var micro = '', major = '', f;
      for (f = Math.ceil(xMin / CH) * CH; f <= xMax; f += CH) {
        var mx = X(f).toFixed(1);
        micro += 'M' + mx + ',' + (Y1 - 7) + 'V' + Y1;
        if (Math.round(f / CH) % 5 === 0) major += 'M' + mx + ',' + Y0 + 'V' + Y1;
      }
      plot.appendChild(el('path', { d: micro, 'class': 'sim-raster' }));
      plot.appendChild(el('path', { d: major, 'class': 'sim-raster sim-raster--major' }));
    }

    /* ---- −3 dB line + the band it defines ---- */
    var y3 = dbMode ? Ydb(-3) : Y(Math.SQRT1_2);
    var xa = Xc(r.fLow), xb = Xc(r.fHigh);
    if (xb - xa > 1) plot.appendChild(el('rect', { x: xa, y: y3, width: xb - xa, height: Math.max(0, Y1 - y3), 'class': 'sim-shade' }));
    plot.appendChild(el('line', { x1: X0, x2: X1, y1: y3, y2: y3, 'class': 'sim-minus3' }));
    plot.appendChild(el('text', { x: X1 - 8, y: y3 - 7, 'text-anchor': 'end', 'class': 'sim-note' },
      dbMode ? '−3 dB' : '−3 dB · 0.707'));

    /* ---- the ghost: same tank, a good coil ---- */
    if (st.ghost) plot.appendChild(el('path', { d: curve(xMin, xMax, f0, GHOST_Q, Y), 'class': 'sim-ghost' }));

    /* ---- the tank itself ---- */
    plot.appendChild(el('path', { d: curve(xMin, xMax, f0, Q, Y), 'class': 'sim-wave' }));

    /* ---- markers ---- */
    function vline(x, cls, yTop, yBot) {
      plot.appendChild(el('line', { x1: x, x2: x, y1: yTop, y2: yBot, 'class': cls, opacity: 0.85 }));
    }
    function dot(x, y, cls) {
      plot.appendChild(el('circle', { cx: x, cy: y, r: 4.5, 'class': cls }));
    }

    if (band) {
      /* our two reference frequencies, clickable */
      [[BENCH, 'sim-mark2', 'sim-lbl2', '623 kHz · bench'],
       [TARGET, 'sim-mark', 'sim-lbl', '819 kHz · Table 4']].forEach(function (m) {
        if (m[0] < xMin || m[0] > xMax) return;
        var x = X(m[0]);
        vline(x, m[1], Y0, Y1);
        var anchor = x > X1 - 140 ? 'end' : 'start';
        var t = el('text', { x: anchor === 'end' ? x - 6 : x + 6, y: Y0 + 14,
                             'text-anchor': anchor, 'class': m[2] }, m[3]);
        t.addEventListener('click', function (ev) { ev.stopPropagation(); tuneTo(m[0]); });
        plot.appendChild(t);
      });
      /* the live resonance */
      var fx = X(f0);
      if (f0 >= xMin && f0 <= xMax) {
        vline(fx, 'sim-wave', Y0, Y1);
        dot(fx, Y(H(f0, f0, Q)), 'sim-dot');
        plot.appendChild(el('text', {
          x: fx > X1 - 110 ? fx - 6 : fx + 6, y: Y1 - 10,
          'text-anchor': fx > X1 - 110 ? 'end' : 'start', 'class': 'sim-lbl sim-live'
        }, 'f₀ ' + fmtHz(f0)));
      } else {
        plot.appendChild(el('text', { x: (X0 + X1) / 2, y: Y0 + 16, 'text-anchor': 'middle', 'class': 'sim-lbl' },
          'f₀ = ' + fmtHz(f0) + ' sits outside the 530–1700 kHz band'));
      }
      plot.appendChild(el('text', { x: X0, y: Y1 + 42, 'class': 'sim-hint' },
        'click anywhere on the band to tune · grid = 9 kHz channels'));
    } else {
      [[r.fLow, 'sim-mark', Math.SQRT1_2], [f0, 'sim-wave', 1], [r.fHigh, 'sim-mark', Math.SQRT1_2]]
        .forEach(function (m) {
          var x = X(m[0]);
          vline(x, m[1], Y0, Y1);
          dot(x, Y(m[2]), m[1] === 'sim-wave' ? 'sim-dot' : 'sim-dot2');
        });
      if (TARGET >= xMin && TARGET <= xMax) {
        vline(X(TARGET), 'sim-mark2', Y0, Y1);
        plot.appendChild(el('text', { x: X(TARGET) + 6, y: Y1 - 10, 'class': 'sim-lbl2' }, '819'));
      }
    }

    /* ---- x ticks ---- */
    xTicks.forEach(function (f, i) {
      var anchor = i === 0 ? 'start' : (i === xTicks.length - 1 ? 'end' : 'middle');
      plot.appendChild(el('text', { x: X(f), y: Y1 + 18, 'text-anchor': anchor, 'class': 'sim-tick' }, fmtHz(f)));
    });

    /* ---- axis titles ---- */
    plot.appendChild(el('text', { x: (X0 + X1) / 2, y: Y1 + 42, 'text-anchor': 'middle', 'class': 'sim-axis' }, 'frequency'));
    plot.appendChild(el('text', { x: 20, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', 'class': 'sim-axis',
      transform: 'rotate(-90 20 ' + ((Y0 + Y1) / 2) + ')' }, dbMode ? 'dB rel. peak' : 'V / V peak'));

    if (st.ghost) {
      plot.appendChild(el('line', { x1: X0 + 8, x2: X0 + 34, y1: Y1 - 34, y2: Y1 - 34, 'class': 'sim-ghost' }));
      plot.appendChild(el('text', { x: X0 + 40, y: Y1 - 30, 'class': 'sim-hint' }, 'a good coil · Q 30'));
    }

    /* crosshair furniture — recreated on every draw, moved by pointermove only */
    Ymap = Y;
    crossDot = el('circle', { cx: X0, cy: Y(1), r: 4.5, 'class': 'sim-cross-dot' });
    cross = el('line', { x1: X0, x2: X0, y1: Y0, y2: Y1, 'class': 'sim-cross' });
    cross.style.display = 'none';
    crossDot.style.display = 'none';
    plot.appendChild(cross);
    plot.appendChild(crossDot);
    if (tip) tip.hidden = true;
  }

  /* ---------- crosshair read-out ---------- */
  var tip = document.getElementById('simTip');
  var cross = null, crossDot = null, Ymap = function (h) { return h; }, lastR = null;

  /* f (Hz) → the chip, the line and the dot; cssX is where the chip hangs */
  function showAt(f, cssX) {
    if (!tip || !lastR) return;
    var hv = H(f, lastR.f0, st.Q);
    var dbv = dB(hv);
    if (Math.abs(dbv) < 0.05) dbv = 0;          /* no "-0.0 dB" at the peak */
    var txt = '<b>' + fmtHz(f) + '</b> <i>· H ' + hv.toFixed(3) + ' (' + dbv.toFixed(1) + ' dB)</i>';
    if (st.axis === 'band') {
      var n = Math.round(f / CH), snapped = n * CH;
      txt += ' <i>· channel ' + n +
             (Math.abs(snapped - f) > 1000 ? ' · tune lands on ' + fmtHz(snapped) : '') + '</i>';
    }
    if (tip.innerHTML !== txt) tip.innerHTML = txt;
    tip.hidden = false;

    var sx = X0 + (f - view.xMin) / (view.xMax - view.xMin) * (X1 - X0);
    if (cross) {
      cross.setAttribute('x1', sx); cross.setAttribute('x2', sx);
      cross.style.display = '';
    }
    if (crossDot) {
      crossDot.setAttribute('cx', sx);
      crossDot.setAttribute('cy', clamp(Ymap(hv), Y0, Y1));
      crossDot.style.display = '';
    }
    /* keep the chip inside the plot, in CSS pixels */
    var box = plot.parentNode.getBoundingClientRect();
    var px = (cssX != null ? cssX : sx * (box.width / 720)) + 14;
    px = Math.min(px, Math.max(4, box.width - tip.offsetWidth - 6));
    tip.style.left = Math.max(4, px) + 'px';
    tip.style.top = '8px';
  }

  function inspect(ev) {
    if (!tip || !lastR) return;
    var ctm = plot.getScreenCTM();
    if (!ctm) return;
    var p = plot.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    var q = p.matrixTransform(ctm.inverse());
    if (q.x < X0 || q.x > X1 || q.y < Y0 || q.y > Y1) { hideInspect(); return; }
    var f = view.xMin + (q.x - X0) / (X1 - X0) * (view.xMax - view.xMin);
    var box = plot.parentNode.getBoundingClientRect();
    showAt(f, ev.clientX - box.left);
  }
  function hideInspect() {
    if (tip) tip.hidden = true;
    if (cross) cross.style.display = 'none';
    if (crossDot) crossDot.style.display = 'none';
  }
  plot.addEventListener('pointermove', inspect);
  plot.addEventListener('pointerdown', inspect);
  plot.addEventListener('pointerleave', hideInspect);

  /* keyboard equivalent: focus the plot, then walk it with the arrow keys */
  var kbF = null;
  plot.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { kbF = null; hideInspect(); return; }
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    if (!lastR) return;
    var span = view.xMax - view.xMin;
    if (kbF == null) kbF = lastR.f0;
    kbF = clamp(kbF + (ev.key === 'ArrowRight' ? 1 : -1) * span / 60,
                view.xMin, view.xMax);
    showAt(kbF, null);
  });
  plot.addEventListener('blur', hideInspect);

  /* sample H(f) across the visible window */
  function curve(xMin, xMax, f0, Q, Y) {
    var d = '', N = 320, i, f, x;
    for (i = 0; i <= N; i++) {
      f = xMin + (xMax - xMin) * i / N;
      x = X0 + (X1 - X0) * i / N;
      d += (i ? 'L' : 'M') + x.toFixed(2) + ',' + Y(H(f, f0, Q)).toFixed(2) + ' ';
    }
    return d;
  }

  /* ---------- ring-down panel (built once, only `d` is updated) ---------- */
  var RING = { X0: 70, X1: 700, Y0: 18, Y1: 118 };
  var ringEls = null;

  function ring(f0, Q) {
    var svg = document.getElementById('simRing');
    if (!svg) return;
    var W = RING.X1 - RING.X0, Ht = RING.Y1 - RING.Y0;
    var mid = RING.Y0 + Ht / 2, amp = Ht / 2 - 4;
    var eCyc = Q / Math.PI;                       /* cycles to 1/e */
    var cycles = clamp(3 * eCyc, 3, 60);          /* window in cycles */
    var N = clamp(Math.round(cycles * 25), 500, 1500);

    if (!ringEls) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var head = el('line', { x1: RING.X0, x2: RING.X0, y1: RING.Y0, y2: RING.Y1, 'class': 'ring-head' });
      ringEls = {
        frame: svg.appendChild(el('rect', { x: RING.X0, y: RING.Y0, width: W, height: Ht, 'class': 'sim-frame' })),
        base: svg.appendChild(el('line', { x1: RING.X0, x2: RING.X1, y1: mid, y2: mid, 'class': 'sim-base' })),
        up: svg.appendChild(el('path', { 'class': 'sim-envelope' })),
        dn: svg.appendChild(el('path', { 'class': 'sim-envelope' })),
        wave: svg.appendChild(el('path', { 'class': 'sim-wave' })),
        eLine: svg.appendChild(el('line', { 'class': 'sim-minus3' })),
        eLbl: svg.appendChild(el('text', { 'class': 'sim-note' })),
        yLab: svg.appendChild(el('text', { x: 26, y: mid, 'text-anchor': 'middle', 'class': 'sim-axis',
                transform: 'rotate(-90 26 ' + mid + ')' }, 'TP1 · normalised')),
        xLab: svg.appendChild(el('text', { x: (RING.X0 + RING.X1) / 2, y: RING.Y1 + 26, 'text-anchor': 'middle', 'class': 'sim-axis' })),
        info: svg.appendChild(el('text', { x: RING.X1, y: RING.Y0 + 15, 'text-anchor': 'end', 'class': 'sim-hint' })),
        head: svg.appendChild(head)
      };
    }

    var up = '', dn = '', wave = '', i, s, x, env, y;
    for (i = 0; i <= N; i++) {
      s = i / N;
      x = RING.X0 + s * W;
      env = Math.exp(-Math.PI * cycles * s / Q);
      up += (i ? 'L' : 'M') + x.toFixed(1) + ',' + (mid - env * amp).toFixed(1) + ' ';
      dn += (i ? 'L' : 'M') + x.toFixed(1) + ',' + (mid + env * amp).toFixed(1) + ' ';
      y = mid - env * amp * Math.cos(2 * Math.PI * cycles * s);
      wave += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    }
    ringEls.up.setAttribute('d', up);
    ringEls.dn.setAttribute('d', dn);
    ringEls.wave.setAttribute('d', wave);

    var s1 = eCyc / cycles;
    if (s1 < 1) {
      var x1 = RING.X0 + s1 * W;
      ringEls.eLine.setAttribute('x1', x1); ringEls.eLine.setAttribute('x2', x1);
      ringEls.eLine.setAttribute('y1', RING.Y0); ringEls.eLine.setAttribute('y2', RING.Y1);
      ringEls.eLine.style.display = '';
      ringEls.eLbl.setAttribute('x', x1 + 6);
      ringEls.eLbl.setAttribute('y', RING.Y0 + 15);
      ringEls.eLbl.textContent = '1/e';
      ringEls.eLbl.style.display = '';
    } else {
      ringEls.eLine.style.display = 'none';
      ringEls.eLbl.style.display = 'none';
    }

    ringEls.xLab.textContent = 'time →  ' + cycles.toFixed(1) + ' cycles at ' + fmtHz(f0);
    ringEls.info.textContent = s1 < 1
      ? '1/e after ' + eCyc.toFixed(1) + ' cycles'
      : 'still above 1/e after ' + cycles.toFixed(0) + ' cycles · 1/e at ' + eCyc.toFixed(1);
  }

  /* ---------- bench view (knob, needle, dial) ---------- */
  var knob = document.getElementById('knob');
  var needle = document.getElementById('needle');
  var dialF0 = document.getElementById('dialF0');
  var genFreq = document.getElementById('genFreq');
  var ticks = ['tick0', 'tick1', 'tick2', 'tick3', 'tick4'].map(function (id) {
    return document.getElementById(id);
  });

  function bench(L, r) {
    if (knob) {
      var ang = -135 + (st.C - 20) / 260 * 270;          /* 20…280 pF → −135°…+135° */
      knob.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ' 485 180)');
    }
    var f0 = r.f0;
    if (dialF0) dialF0.textContent = fmtHz(f0);
    if (genFreq) genFreq.textContent = fmtHz(f0);

    var lo = f0of(L, 280 + st.stray), hi = f0of(L, 20 + st.stray);   /* the reachable band */
    if (needle) {
      var t = (Math.log(f0) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
      t = clamp(t, 0, 1);
      needle.setAttribute('transform', 'rotate(' + (-75 + t * 150).toFixed(2) + ' 380 452)');
    }
    if (ticks[0]) {
      var ratio = hi / lo;
      for (var i = 0; i < 5; i++) ticks[i].textContent = fmtHz(lo * Math.pow(ratio, i / 4));
    }
  }

  /* ---------- status line ---------- */
  var statusEl = document.getElementById('simStatus');
  function status(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'sim__status ' + (msg.charAt(0) === '\u2713' ? 'is-ok' : 'is-off');
  }

  /* ---------- auto-tune ---------- */
  function tuneTo(f) {
    if (!inC) return;
    var need = Cfor(st.L, f) - st.stray;
    var target = clamp(need, 20, 280);
    animateTo(inC, Math.round(target));
    if (need < 20 || need > 280) {
      status('✗ ' + fmtHz(f) + ' needs ' + need.toFixed(1) + ' pF of C — outside the 20–280 pF capacitor, so it stops at ' + Math.round(target) + ' pF.');
    } else {
      status('✓ Tuned to ' + fmtHz(f) + ' · C = ' + Math.round(target) + ' pF' +
        (st.stray ? ' after the ' + st.stray + ' pF stray' : '') + '.');
    }
  }

  var tw = null, twT = null;
  function now() { return (window.performance && performance.now) ? performance.now() : +new Date(); }
  function cancelTween() {
    if (tw) { cancelAnimationFrame(tw); tw = null; }
    if (twT) { clearTimeout(twT); twT = null; }
  }
  /* Tween the capacitance slider. rAF drives the motion, but a throttled
     rAF (hidden tab, print preview) must never leave the slider stranded:
     a timeout snaps to the exact target so the state always converges. */
  function animateTo(input, target) {
    cancelTween();
    if (REDUCE) {                      /* no tweening under prefers-reduced-motion */
      input.value = target;
      readInputs(); render();
      return;
    }
    var from = +input.value, t0 = now(), done = false;
    function finish() {
      if (done) return;
      done = true;
      if (tw) { cancelAnimationFrame(tw); tw = null; }
      if (twT) { clearTimeout(twT); twT = null; }
      input.value = target;
      readInputs(); render();
    }
    function step(t) {
      if (done) return;
      var k = clamp((t - t0) / 420, 0, 1);
      var e = 1 - Math.pow(1 - k, 3);
      input.value = Math.round(from + (target - from) * e);
      readInputs(); render();
      if (k < 1) tw = requestAnimationFrame(step); else finish();
    }
    tw = requestAnimationFrame(step);
    twT = setTimeout(finish, 700);
  }

  /* ---------- wiring ---------- */
  var inL = document.getElementById('inL');
  var inC = document.getElementById('inC');
  var inQ = document.getElementById('inQ');
  var inStray = document.getElementById('inStray');

  function readInputs() {
    if (inL) st.L = +inL.value || DEFAULTS.L;
    if (inC) st.C = +inC.value || DEFAULTS.C;
    if (inQ) st.Q = +inQ.value || DEFAULTS.Q;
    st.stray = inStray ? (+inStray.value || 0) : 0;
  }

  /* Coalesce redraws to one per frame. If rAF is throttled (hidden tab)
     the timeout still lands the update, so no input is ever silently lost. */
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    var run = function () {
      if (!pending) return;
      pending = false;
      render();
    };
    requestAnimationFrame(run);
    setTimeout(run, 80);
  }

  function render() {
    var valL = document.getElementById('valL');
    if (valL) valL.textContent = st.L.toFixed(1) + ' \u00B5H';
    var valC = document.getElementById('valC');
    if (valC) valC.textContent = st.C + ' pF';
    var valQ = document.getElementById('valQ');
    if (valQ) valQ.textContent = st.Q;
    var vs = document.getElementById('valStray');
    if (vs) vs.textContent = st.stray + ' pF';
    /* slider fill + screen-reader text */
    fill(inL); fill(inC); fill(inQ); fill(inStray);
    if (inL) inL.setAttribute('aria-valuetext', st.L.toFixed(1) + ' microhenries');
    if (inC) inC.setAttribute('aria-valuetext', st.C + ' picofarads');
    if (inStray) inStray.setAttribute('aria-valuetext', st.stray + ' picofarads of stray capacitance');
    if (inQ) inQ.setAttribute('aria-valuetext', 'quality factor ' + st.Q);

    /* the schematic quotes the live values */
    var schL = document.getElementById('schL');
    if (schL) schL.textContent = st.L.toFixed(1) + ' \u00B5H';
    var schC = document.getElementById('schC');
    if (schC) schC.textContent = (st.C + st.stray) + ' pF';

    var r = readouts();
    lastR = r;
    story(r);
    markPresets();
    draw(r);
    ring(r.f0, st.Q);
    bench(st.L, r);
    queueHash();
  }

  function fill(input) {
    if (!input) return;
    var min = +input.min, max = +input.max, v = +input.value;
    var pct = max > min ? (v - min) / (max - min) * 100 : 0;
    input.style.setProperty('--pct', pct.toFixed(1) + '%');
  }

  [inL, inC, inQ, inStray].forEach(function (s) {
    if (s) s.addEventListener('input', function () { touch(); readInputs(); schedule(); });
  });
  [inC].forEach(function (s) {
    if (!s) return;
    s.addEventListener('pointerdown', cancelTween);
    s.addEventListener('keydown', cancelTween);
  });

  /* highlight the slider while you are actually dragging it */
  [inL, inC, inQ, inStray].forEach(function (s) {
    if (!s) return;
    var ctrl = s.closest ? s.closest('.ctrl') : null;
    if (!ctrl) return;
    var on = function () { ctrl.classList.add('is-live'); };
    var off = function () { ctrl.classList.remove('is-live'); };
    s.addEventListener('pointerdown', on);
    s.addEventListener('keydown', on);
    s.addEventListener('pointerup', off);
    s.addEventListener('pointercancel', off);
    s.addEventListener('keyup', off);
    s.addEventListener('blur', off);
  });

  /* toolbar */
  var bar = document.querySelector('.sim__bar');
  function pressGroup(btn, key) {
    var g = btn.parentNode.querySelectorAll('.seg__b');
    for (var i = 0; i < g.length; i++) {
      var on = g[i].getAttribute('data-' + key) === btn.getAttribute('data-' + key);
      g[i].classList.toggle('is-on', on);
      g[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  if (bar) bar.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('button') : null;
    if (!b || !bar.contains(b)) return;
    touch();
    if (b.hasAttribute('data-axis')) { st.axis = b.getAttribute('data-axis'); pressGroup(b, 'axis'); status(''); render(); }
    else if (b.hasAttribute('data-unit')) { st.unit = b.getAttribute('data-unit'); pressGroup(b, 'unit'); status(''); render(); }
    else if (b.id === 'btnGhost') {
      st.ghost = !st.ghost;
      b.setAttribute('aria-pressed', st.ghost ? 'true' : 'false');
      b.classList.toggle('is-on', st.ghost);
      render();
    }
  });

  /* ---------- presets ---------- */
  function preset(name) {
    if (!inL || !inC || !inQ) return;
    touch();
    cancelTween();
    if (name === 'coil') {
      inL.value = DEFAULTS.L; inC.value = DEFAULTS.C; inQ.value = DEFAULTS.Q;
      if (inStray) inStray.value = 0;
      readInputs(); render();
      status('Our coil as drawn: L 291.5 µH · C 130 pF · no stray · Q 6.9.');
    } else if (name === '819') {
      if (inStray) inStray.value = 0;
      readInputs();
      tuneTo(TARGET);
    } else if (name === '623') {
      if (inStray) inStray.value = 100;
      readInputs();
      tuneTo(BENCH);
    } else if (name === 'probe') {
      if (inStray) inStray.value = 100;
      inC.value = DEFAULTS.C;
      readInputs(); render();
      status('The mistake: the ×1 probe sits across the tank, so 100 pF joins C — and f₀ falls to 614.7 kHz.');
    }
  }

  var presets = document.querySelector('.sim__presets');
  if (presets) presets.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('button') : null;
    if (!b || !presets.contains(b)) return;
    var id = b.id;
    if (id === 'prCoil') preset('coil');
    else if (id === 'pr819') preset('819');
    else if (id === 'pr623') preset('623');
    else if (id === 'prProbe') preset('probe');
  });

  /* light up every preset the current state already satisfies */
  function markPresets() {
    var d819 = Math.abs((lastR ? lastR.f0 : 0) - TARGET) / TARGET * 100;
    var d623 = Math.abs((lastR ? lastR.f0 : 0) - BENCH) / BENCH * 100;
    var state = {
      prCoil: st.L === DEFAULTS.L && st.C === DEFAULTS.C && st.stray === 0 && st.Q === DEFAULTS.Q,
      pr819: st.stray === 0 && d819 < 1,
      pr623: st.stray === 100 && d623 < 1.5,
      prProbe: st.stray === 100 && st.C === DEFAULTS.C
    };
    for (var id in state) {
      var b = document.getElementById(id);
      if (b) b.classList.toggle('is-on', !!state[id]);
    }
  }

  /* click the band to tune (9 kHz channel snapping) */
  plot.addEventListener('click', function (ev) {
    if (st.axis !== 'band') return;
    touch();
    var ctm = plot.getScreenCTM();
    if (!ctm) return;
    var p = plot.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    var q = p.matrixTransform(ctm.inverse());
    if (q.x < X0 || q.x > X1 || q.y < Y0 || q.y > Y1) return;
    var f = view.xMin + (q.x - X0) / (X1 - X0) * (view.xMax - view.xMin);
    tuneTo(Math.round(f / CH) * CH);
  });

  var resetBtn = document.getElementById('simReset');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    touch();
    cancelTween();
    inL.value = DEFAULTS.L; inC.value = DEFAULTS.C;
    inQ.value = DEFAULTS.Q; if (inStray) inStray.value = DEFAULTS.stray;
    st.axis = 'zoom'; st.unit = 'lin'; st.ghost = false;
    var zb = document.querySelector('[data-axis="zoom"]');
    if (zb) pressGroup(zb, 'axis');
    var lb = document.querySelector('[data-unit="lin"]');
    if (lb) pressGroup(lb, 'unit');
    var g = document.getElementById('btnGhost');
    if (g) { g.setAttribute('aria-pressed', 'false'); g.classList.remove('is-on'); }
    readInputs();
    status('Reset to our bench values: L 291.5 µH · C 130 pF · stray 0 pF · Q 6.9.');
    render();
  });

  /* ---------- bench / schematic tabs ---------- */
  var tabs = document.querySelectorAll('.sim__tab');
  for (var ti = 0; ti < tabs.length; ti++) {
    tabs[ti].addEventListener('click', function () {
      var target = this.getAttribute('aria-controls');
      for (var j = 0; j < tabs.length; j++) {
        var on = tabs[j] === this;
        tabs[j].classList.toggle('is-on', on);
        tabs[j].setAttribute('aria-selected', on ? 'true' : 'false');
      }
      var panels = document.querySelectorAll('.sim__panel');
      for (var k = 0; k < panels.length; k++) panels[k].hidden = panels[k].id !== target;
    });
  }

  /* ---------- shareable state: L / C / Cs / Q live in the URL hash ----------
     Only written after a real interaction, so clicking a TOC anchor is never
     clobbered by a background redraw, and never more than once per 500 ms
     (history.replaceState is rate-limited by the browser). */
  var hashT = null, touched = false;
  function touch() { touched = true; }
  function writeHash() {
    if (!touched) return;
    var q = 'L=' + st.L + '&C=' + st.C + '&Cs=' + st.stray + '&Q=' + st.Q;
    if (location.hash.replace(/^#/, '') === q) return;
    try { history.replaceState(null, '', '#' + q); } catch (e) { /* private mode */ }
  }
  function queueHash() {
    if (!touched || hashT) return;
    hashT = setTimeout(function () { hashT = null; writeHash(); }, 500);
  }
  function readHash() {
    var h = location.hash.replace(/^#/, '');
    if (!h) return false;
    var p = {};
    h.split('&').forEach(function (kv) {
      var a = kv.split('=');
      var v = parseFloat(a[1]);
      if (isFinite(v)) p[a[0]] = v;
    });
    var any = false;
    if ('L' in p && inL) { inL.value = clamp(p.L, +inL.min, +inL.max); any = true; }
    if ('C' in p && inC) { inC.value = clamp(p.C, +inC.min, +inC.max); any = true; }
    if ('Q' in p && inQ) { inQ.value = clamp(p.Q, +inQ.min, +inQ.max); any = true; }
    if ('Cs' in p && inStray) { inStray.value = clamp(p.Cs, +inStray.min, +inStray.max); any = true; }
    return any;
  }

  var share = document.getElementById('simShare');
  if (share) share.addEventListener('click', function () {
    var url = location.href;
    function done() { status('✓ Link copied — paste it anywhere to reopen this exact state.'); }
    function failed() { status('Copy this link: ' + url); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, failed);
    } else failed();
  });

  /* pause the flowing dashes and the ring playhead while off-screen */
  if ('IntersectionObserver' in window) {
    var root = document.querySelector('.sim');
    if (root) {
      new IntersectionObserver(function (entries) {
        root.classList.toggle('sim--hidden', !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(root);
    }
  }

  var fromLink = readHash();
  readInputs();
  if (fromLink) status('✓ State restored from the link.');
  render();
})();
