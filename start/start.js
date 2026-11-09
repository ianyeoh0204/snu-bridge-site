import {DEGREES, nextDate, endTime, isHistorical} from '../product-model.mjs';

const base = document.querySelector('meta[name="app-base"]')?.content || '/';
let roadmaps = {}, notices = [], available = new Set();
let degree = (() => { try { return localStorage.getItem('degree') || 'masters'; } catch { return 'masters'; } })();
if (degree === 'all') degree = 'masters';

function el(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
const MONTH = new Intl.DateTimeFormat('en-GB', {month: 'short', timeZone: 'Asia/Seoul'});
const DAY = new Intl.DateTimeFormat('en-GB', {day: 'numeric', timeZone: 'Asia/Seoul'});

function card(p) {
  const d = nextDate(p, degree);
  const a = el('a', undefined, 'card'); a.href = base + 'briefs/' + p.id + '/';
  const chip = el('div', undefined, 'date');
  if (d) {
    if (endTime(d.end) - Date.now() < 7 * 86400e3) chip.classList.add('soon');
    chip.append(el('b', DAY.format(new Date(endTime(d.end)))), el('span', MONTH.format(new Date(endTime(d.end)))));
  } else { chip.classList.add('none'); chip.append(el('b', '—')); }
  const body = el('div'); body.append(el('h2', p.title), el('p', p.who));
  if (d) body.append(el('p', `${d.label} · ${d.when}`, 'when'));
  a.append(chip, body);
  return a;
}

function renderFirst() {
  const mine = notices.filter(p => p.new_students && p.state === 'full' && (!p.degrees?.length || p.degrees.includes(degree)));
  const now = mine.filter(p => !isHistorical(p)).sort((a, b) => (nextDate(a, degree) ? endTime(nextDate(a, degree).end) : Infinity) - (nextDate(b, degree) ? endTime(nextDate(b, degree).end) : Infinity));
  const earlier = mine.filter(p => isHistorical(p));
  const list = document.querySelector('#first');
  list.replaceChildren(...now.map(card));
  if (!now.length) list.append(el('div', `No current notices for new ${DEGREES[degree]} students. Check the full notice list too.`, 'empty'));
  const box = document.querySelector('#earlier-box');
  box.hidden = !earlier.length;
  document.querySelector('#earlier-label').textContent = `${earlier.length} earlier notice${earlier.length === 1 ? '' : 's'} for new students`;
  document.querySelector('#earlier').replaceChildren(...earlier.map(p => {
    const li = el('li'); const a = el('a', p.title); a.href = base + 'briefs/' + p.id + '/';
    li.append(a, el('small', `${p.who} · posted ${p.posting_date}`)); return li;
  }));
}

function renderRoad() {
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

function render() {
  document.querySelectorAll('[data-degree]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.degree === degree)));
  renderFirst(); renderRoad();
}

document.querySelectorAll('[data-degree]').forEach(b => b.addEventListener('click', () => {
  degree = b.dataset.degree;
  try { localStorage.setItem('degree', degree); } catch { /* private mode: choice not remembered */ }
  render();
}));
fetch(base + 'notices.json', {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
  roadmaps = data.roadmaps || {};
  notices = data.notices;
  available = new Set(notices.filter(n => n.state === 'full').map(n => n.id));
  document.querySelector('#note').textContent = roadmaps.note || '';
  render();
}).catch(() => { document.querySelector('#first').replaceChildren(el('div', 'Notices could not be loaded. Please use the ECE board.', 'empty')); });
