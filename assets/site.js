const grid = document.querySelector('#project-grid');
if (grid) {
  fetch('projects/projects.json')
    .then(r => { if (!r.ok) throw new Error('Could not load projects'); return r.json(); })
    .then(projects => {
      grid.innerHTML = projects.map(p => {
        const sub = p.subtitle ? `<span class="sub">${p.subtitle}</span>` : '';
        const origin = p.origin ? `<a class="origin" href="${p.origin.url}" target="_blank" rel="noopener noreferrer">${p.origin.label} ↗</a>` : '';
        if (p.comingSoon) return `
        <div class="project-card soon">
          <h3>${p.name}</h3>${sub}
          <p class="desc">${p.shortDescription}</p>
          <div class="meta"><span>${p.language}</span><span class="badge">Coming soon</span></div>
        </div>`;
        const external = /^https?:\/\//.test(p.cardHref);
        const isGithub = /^https?:\/\/github\.com\//.test(p.cardHref);
        const label = isGithub ? 'GitHub ↗' : external ? 'Project site ↗' : 'Project page →';
        return `
        <article class="project-card">
          <h3><a href="${p.cardHref}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ''}>${p.name}</a></h3>${sub}
          <p class="desc">${p.shortDescription}</p>
          ${origin}
          <div class="meta"><span>${p.language}</span><span class="go">${label}</span></div>
        </article>`;
      }).join('');
    })
    .catch(() => { grid.innerHTML = '<p>Project information is temporarily unavailable.</p>'; });
}

document.querySelector('#year')?.append(new Date().getFullYear());
