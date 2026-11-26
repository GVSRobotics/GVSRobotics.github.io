/* Shared behaviour for explainer project pages. */
(function () {
  'use strict';

  // Load the live playground into the page only when asked (it downloads a few MB of WebAssembly).
  document.querySelectorAll('[data-playground]').forEach(box => {
    const src = box.dataset.playground;
    const btn = box.querySelector('[data-load]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = src;
      frame.title = box.dataset.title || 'Interactive playground';
      frame.loading = 'lazy';
      frame.allow = 'fullscreen';
      box.querySelector('.playground-cover').replaceWith(frame);
      const bar = document.createElement('div');
      bar.className = 'playground-bar';
      bar.innerHTML = `<span>Running live in your browser. Drag in the 3D view to orbit, scroll to zoom.</span><a href="${src}" target="_blank" rel="noopener">Open full screen ↗</a>`;
      box.append(bar);
    });
  });

  // Copy buttons on code blocks.
  document.querySelectorAll('.codeblock').forEach(block => {
    const b = document.createElement('button');
    b.className = 'copy'; b.type = 'button'; b.textContent = 'Copy';
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(block.querySelector('pre').innerText); b.textContent = 'Copied'; }
      catch { b.textContent = 'Select & copy'; }
      setTimeout(() => (b.textContent = 'Copy'), 1600);
    });
    block.append(b);
  });

  // Highlight the current section in the table of contents.
  const links = [...document.querySelectorAll('.toc a[href^="#"]')];
  if (links.length && 'IntersectionObserver' in window) {
    const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { links.forEach(a => a.classList.remove('active')); byId.get(e.target.id)?.classList.add('active'); }
    }), { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  document.querySelectorAll('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));
})();
