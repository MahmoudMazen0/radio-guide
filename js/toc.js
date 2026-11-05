/* toc.js — reading progress + scrollspy for the static guide.
   Plain JS, no dependencies. Safe to load on every page (no-op if no TOC).

   Freeze fix: never call scrollIntoView() from a scroll handler. scrollIntoView
   walks every scrollable ancestor (including the document), which fires another
   scroll event, which calls us again — an infinite feedback loop that made the
   page stick mid-scroll. We only ever scroll the TOC strip itself, horizontally,
   and only when the active section actually changed. */
(function () {
  var toc = document.getElementById('toc');
  var bar = document.getElementById('progress');
  if (!toc) return;

  var links = Array.prototype.slice.call(toc.querySelectorAll('a[data-toc]'));
  var sections = links
    .map(function (a) { return document.getElementById(a.getAttribute('data-toc')); })
    .filter(Boolean);
  if (!sections.length) return;

  var currentId = null;
  var ticking = false;

  /* Keep the active pill visible INSIDE the TOC strip only.
     Adjusting scrollLeft on .toc never touches the page. */
  function revealInToc(el) {
    var left = el.offsetLeft;
    var right = left + el.offsetWidth;
    var viewStart = toc.scrollLeft;
    var viewEnd = viewStart + toc.clientWidth;
    if (left < viewStart) {
      toc.scrollLeft = Math.max(0, left - 12);
    } else if (right > viewEnd) {
      toc.scrollLeft = right - toc.clientWidth + 12;
    }
  }

  function setCurrent(id) {
    if (id === currentId) return;          // no change → no DOM work, no scrolling
    currentId = id;
    var active = null;
    links.forEach(function (a) {
      var on = a.getAttribute('data-toc') === id;
      a.classList.toggle('is-current', on);
      if (on) active = a;
    });
    if (active) revealInToc(active);
  }

  function update() {
    ticking = false;

    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }

    var probe = window.scrollY + window.innerHeight * 0.3;
    var current = sections[0].id;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= probe) current = sections[i].id;
      else break;
    }
    setCurrent(current);
  }

  /* Coalesce bursts of scroll events into one frame. */
  function onScroll() {
    if (ticking) return;
    ticking = true;
    if (window.requestAnimationFrame) requestAnimationFrame(update);
    else update();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
  update();
})();
