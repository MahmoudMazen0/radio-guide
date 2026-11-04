/* ============================================================
   M1 · interactive tank simulator
   Plain JS, no dependencies — static-site friendly.
   Physics: parallel RLC driven by an induced current,
            H(f) = V / V_peak = 1 / sqrt(1 + Q²(u − 1/u)²),  u = f / f0
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var plot = document.getElementById('simPlot');
  if (!plot) return;                       // page without the widget

  /* ---------- helpers ---------- */
  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function fmtHz(f) {
    if (f >= 1e6) return (f / 1e6).toFixed(2) + ' MHz';
    if (f >= 1e3) return (f / 1e3).toFixed(1) + ' kHz';
    return f.toFixed(0) + ' Hz';
  }

  /* f0 = 1 / (2π√(LC)) — L in µH, C in pF, result in Hz */
  function f0of(L, C) {
    return 1 / (2 * Math.PI * Math.sqrt(L * 1e-6 * C * 1e-12));
  }

  /* C that tunes to a wanted frequency — L in µH, result in pF */
  function Cfor(L, f) {
    return 1 / (4 * Math.PI * Math.PI * f * f * L * 1e-6) * 1e12;
  }

  /* normalised parallel-RLC response */
  function H(f, f0, Q) {
    var u = f / f0;
    return 1 / Math.sqrt(1 + Q * Q * (u - 1 / u) * (u - 1 / u));
  }

  var DEFAULTS = { L: 291.5, C: 130, Q: 6.9 };

  /* ---------- readouts ---------- */
  var out = {};
  ['f0', 'bw', 'flow', 'fhigh', 'c819', 'f280', 'f20', 'verdict'].forEach(function (k) {
    out[k] = document.getElementById('out_' + k);
  });

  function readouts(L, C, Q) {
    var f0 = f0of(L, C);
    var fLow = f0 * (1 - 1 / (2 * Q));
    var fHigh = f0 * (1 + 1 / (2 * Q));
    var c819 = Cfor(L, 819e3);

    out.f0.textContent = fmtHz(f0);
    out.bw.textContent = fmtHz(fHigh - fLow);
    out.flow.textContent = fmtHz(fLow);
    out.fhigh.textContent = fmtHz(fHigh);
    out.c819.textContent = c819.toFixed(0) + ' pF';
    out.f280.textContent = fmtHz(f0of(L, 280));
    out.f20.textContent = fmtHz(f0of(L, 20));

    if (c819 >= 20 && c819 <= 280) {
      out.verdict.textContent = '✓ 819 kHz sits inside our capacitor’s 20–280 pF range.';
      out.verdict.className = 'verdict ok';
    } else {
      out.verdict.textContent = '✗ 819 kHz needs ' + c819.toFixed(1) +
        ' pF — outside the capacitor’s 20–280 pF range.';
      out.verdict.className = 'verdict no';
    }
    return { f0: f0, fLow: fLow, fHigh: fHigh };
  }

  /* ---------- plot ---------- */
  var X0 = 72, X1 = 704, Y0 = 20, Y1 = 260;   // plot box, in viewBox units

  function draw(L, C, Q, r) {
    var f0 = r.f0;
    var spread = 3 / (2 * Q);                 // window = ±3 half-power widths
    var xMin = f0 * (1 - spread), xMax = f0 * (1 + spread);

    var X = function (f) { return X0 + (f - xMin) / (xMax - xMin) * (X1 - X0); };
    var Y = function (h) { return Y1 - h * (Y1 - Y0); };

    while (plot.firstChild) plot.removeChild(plot.firstChild);

    /* frame + horizontal grid */
    plot.appendChild(el('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0,
                                  fill: '#fbfcfd', stroke: '#dde3ea' }));
    [0, 0.25, 0.5, 0.75, 1].forEach(function (h) {
      plot.appendChild(el('line', { x1: X0, x2: X1, y1: Y(h), y2: Y(h),
                                    stroke: h === 0 ? '#9aa4b1' : '#eef1f5' }));
      plot.appendChild(el('text', { x: X0 - 9, y: Y(h) + 4, 'text-anchor': 'end',
                                    class: 'sim-tick' }, h.toFixed(2)));
    });

    /* the −3 dB line */
    plot.appendChild(el('line', { x1: X0, x2: X1, y1: Y(Math.SQRT1_2), y2: Y(Math.SQRT1_2),
                                  stroke: '#b45309', 'stroke-dasharray': '5 4' }));
    plot.appendChild(el('text', { x: X1 - 8, y: Y(Math.SQRT1_2) - 7, 'text-anchor': 'end',
                                  class: 'sim-note', fill: '#b45309' }, '−3 dB · 0.707'));

    /* the curve */
    var d = '', N = 320, i, f;
    for (i = 0; i <= N; i++) {
      f = xMin + (xMax - xMin) * i / N;
      d += (i ? 'L' : 'M') + X(f).toFixed(2) + ',' + Y(H(f, f0, Q)).toFixed(2) + ' ';
    }
    plot.appendChild(el('path', { d: d, fill: 'none', stroke: '#0b6e6e',
                                  'stroke-width': 2.5, 'stroke-linejoin': 'round' }));

    /* markers: f0 solid, the two −3 dB points dashed */
    [[r.fLow, '#b45309', '6 4', Math.SQRT1_2],
     [f0,     '#0b6e6e', '',    1],
     [r.fHigh,'#b45309', '6 4', Math.SQRT1_2]].forEach(function (m) {
      plot.appendChild(el('line', { x1: X(m[0]), x2: X(m[0]), y1: Y0, y2: Y1,
                                    stroke: m[1], 'stroke-dasharray': m[2], opacity: 0.8 }));
      plot.appendChild(el('circle', { cx: X(m[0]), cy: Y(m[3]), r: 4,
                                      fill: '#fff', stroke: m[1], 'stroke-width': 2.5 }));
    });

    /* x ticks */
    [[xMin, 'start'], [r.fLow, 'middle'], [f0, 'middle'], [r.fHigh, 'middle'], [xMax, 'end']]
      .forEach(function (t) {
        plot.appendChild(el('text', { x: X(t[0]), y: Y1 + 20, 'text-anchor': t[1],
                                      class: 'sim-tick' }, fmtHz(t[0])));
      });

    /* axis titles */
    plot.appendChild(el('text', { x: (X0 + X1) / 2, y: Y1 + 46, 'text-anchor': 'middle',
                                  class: 'sim-axis' }, 'frequency'));
    plot.appendChild(el('text', { x: 20, y: (Y0 + Y1) / 2, 'text-anchor': 'middle',
                                  class: 'sim-axis',
                                  transform: 'rotate(-90 20 ' + ((Y0 + Y1) / 2) + ')' },
                                  'V / V peak'));
  }

  /* ---------- bench view (Tinkercad-style) ---------- */
  var knob = document.getElementById('knob');
  var needle = document.getElementById('needle');
  var dialF0 = document.getElementById('dialF0');
  var genFreq = document.getElementById('genFreq');
  var ticks = ['tick0', 'tick1', 'tick2', 'tick3', 'tick4'].map(function (id) {
    return document.getElementById(id);
  });

  function bench(L, C, r) {
    if (knob) {
      /* 20…280 pF  →  −135° … +135° */
      var ang = -135 + (C - 20) / 260 * 270;
      knob.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ' 485 180)');
    }

    var f0 = r.f0;
    if (dialF0) dialF0.textContent = fmtHz(f0);
    if (genFreq) genFreq.textContent = fmtHz(f0);

    /* the band, recalculated for whatever L is set */
    var lo = f0of(L, 280), hi = f0of(L, 20);

    if (needle) {
      var t = (Math.log(f0) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
      t = Math.max(0, Math.min(1, t));          /* clamped at the band’s ends */
      needle.setAttribute('transform', 'rotate(' + (-75 + t * 150).toFixed(2) + ' 380 452)');
    }

    if (ticks[0]) {
      var ratio = hi / lo;                      /* logarithmic scale, five ticks */
      for (var i = 0; i < 5; i++) {
        ticks[i].textContent = fmtHz(lo * Math.pow(ratio, i / 4));
      }
    }
  }

  /* ---------- wiring ---------- */
  var inL = document.getElementById('inL');
  var inC = document.getElementById('inC');
  var inQ = document.getElementById('inQ');

  function update() {
    var L = +inL.value, C = +inC.value, Q = +inQ.value;
    document.getElementById('valL').textContent = L.toFixed(1) + ' µH';
    document.getElementById('valC').textContent = C + ' pF';
    document.getElementById('valQ').textContent = Q;
    var r = readouts(L, C, Q);
    draw(L, C, Q, r);
    bench(L, C, r);
  }

  [inL, inC, inQ].forEach(function (s) { s.addEventListener('input', update); });

  document.getElementById('simReset').addEventListener('click', function () {
    inL.value = DEFAULTS.L; inC.value = DEFAULTS.C; inQ.value = DEFAULTS.Q;
    update();
  });

  update();
})();
