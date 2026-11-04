/* theme.js — dark/light toggle + prefers-color-scheme detection */
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('radio-theme'); } catch (e) {}
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'dark');

  window.__toggleTheme = function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('radio-theme', next); } catch (e) {}
    syncToggleIcon();
  };
  function syncToggleIcon() {
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.textContent = root.getAttribute('data-theme') === 'dark' ? '☀' : '◐';
      b.setAttribute('aria-label', root.getAttribute('data-theme') === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  syncToggleIcon();
})();
