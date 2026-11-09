const base = document.querySelector('meta[name="app-base"]')?.content || '/';
let roadmaps = {}, available = new Set(), degree = 'masters';

function el(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }

function render() {
  document.querySelectorAll('[data-degree]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.degree === degree)));
  const steps = roadmaps[degree] || [];
  document.querySelector('#road').replaceChildren(...steps.map(step => {
    const li = el('li');
    li.append(el('h2', step.title), el('p', step.text));
    for (const id of step.sources) {
      if (!available.has(id)) continue;
      const a = el('a', 'Notice ' + id + ' ›'); a.href = base + 'briefs/' + id + '/'; li.append(a);
    }
    return li;
  }));
  if (!steps.length) document.querySelector('#road').append(el('li', 'No roadmap for this degree yet.'));
}

document.querySelectorAll('[data-degree]').forEach(b => b.addEventListener('click', () => { degree = b.dataset.degree; render(); }));
fetch(base + 'notices.json', {cache: 'no-store'}).then(r => r.json()).then(data => {
  roadmaps = data.roadmaps || {};
  available = new Set(data.notices.filter(n => n.state === 'full').map(n => n.id));
  document.querySelector('#note').textContent = roadmaps.note || '';
  render();
});
