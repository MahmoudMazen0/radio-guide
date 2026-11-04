/* toc.js — reading progress + scrollspy for the static guide.
   Plain JS, no dependencies. Safe to load on every page (no-op if no TOC). */
(function () {
  var toc = document.getElementById('toc');
  var bar = document.getElementById('progress');
  if (!toc) return;

  var links = Array.prototype.slice.call(toc.querySelectorAll('a[data-toc]'));
  var sections = links
    .map(function (a) { return document.getElementById(a.getAttribute('data-toc')); })
    .filter(Boolean);

  function setCurrent(id) {
    links.forEach(function (a) {
      a.classList.toggle('is-current', a.getAttribute('data-toc') === id);
    });
    var active = toc.querySelector('a.is-current');
    if (active) {
      active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }

  function onScroll() {
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
    if (!sections.length) return;
    var probe = window.scrollY + window.innerHeight * 0.3;
    var current = sections[0].id;
    sections.forEach(function (s) {
      if (s.offsetTop <= probe) current = s.id;
    });
    if (current) setCurrent(current);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
