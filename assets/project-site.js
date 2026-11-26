/* Shared behaviour for the contact-library project pages (iDCOL family style). */
(function () {
  'use strict';
  const root = document.documentElement;

  // Theme: follows the system until MODE is pressed, then remembers the choice.
  try { const saved = localStorage.getItem('gvs-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  const announce = () => window.dispatchEvent(new Event('themechange'));
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('gvs-theme', next); } catch (e) {}
    announce();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', announce);

  // Load the live playground into the page only when asked (it downloads several MB of WebAssembly).
  document.querySelectorAll('[data-playground]').forEach(box => {
    const src = box.dataset.playground;
    box.querySelector('[data-load]')?.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = src;
      frame.title = box.dataset.title || 'Interactive playground';
      frame.allow = 'fullscreen';
      box.querySelector('.playground-cover').replaceWith(frame);
      const bar = document.createElement('div');
      bar.className = 'playground-bar';
      bar.innerHTML = `<span>Running live in your browser. Drag in the 3D view to orbit, scroll to zoom.</span><a href="${src}" target="_blank" rel="noopener">open full screen ↗</a>`;
      box.append(bar);
    });
  });

  // Copy buttons: <button class="copy-btn" data-copy="#id">.
  document.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = document.querySelector(btn.dataset.copy)?.innerText || '';
      try { await navigator.clipboard.writeText(text); btn.textContent = 'copied'; }
      catch (e) { btn.textContent = 'select & copy'; }
      setTimeout(() => (btn.textContent = 'copy'), 1400);
    });
  });

  document.querySelectorAll('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));
})();
