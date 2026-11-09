import {DEGREES, filterBriefs, nextDate, endTime} from './product-model.mjs?v=a150e69c75a5';

const base = document.querySelector('meta[name="app-base"]')?.content || '/';
const list = document.querySelector('#list');
const pastButton = document.querySelector('#past');
let notices = [], grad = 'unsure', showPast = false;
let degree = (() => { try { return localStorage.getItem('degree') || 'masters'; } catch { return 'masters'; } })();

function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
const MONTH = new Intl.DateTimeFormat('en-GB', {month: 'short', timeZone: 'Asia/Seoul'});
const DAY = new Intl.DateTimeFormat('en-GB', {day: 'numeric', timeZone: 'Asia/Seoul'});

function dateChip(d) {
  const chip = el('div', undefined, 'date');
  if (!d) { chip.classList.add('none'); chip.append(el('b', '—')); return chip; }
  const end = new Date(endTime(d.end));
  if (endTime(d.end) - Date.now() < 7 * 86400e3) chip.classList.add('soon');
  chip.append(el('b', DAY.format(end)), el('span', MONTH.format(end)));
  return chip;
}

function card(p) {
  const d = nextDate(p, degree);
  const full = p.state === 'full';
  const a = el('a', undefined, 'card');
  a.href = full ? base + 'briefs/' + p.id + '/' : p.source_url;
  if (!full) { a.target = '_blank'; a.rel = 'noopener'; }
  const body = el('div');
  body.append(el('h2', p.title), el('p', p.who));
  if (d) body.append(el('p', `${d.label} · ${d.when}`, 'when'));
  else if (p.ongoing_condition) body.append(el('p', p.ongoing_condition, 'when'));
  if (p.change_note) body.append(el('span', p.change_note.text, 'tag changed'));
  if (!full) body.append(el('span', p.state === 'changed' ? 'Updated · see original' : 'See original', 'tag pending'));
  a.append(dateChip(d), body);
  return a;
}

function render() {
  document.querySelectorAll('[data-degree]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.degree === degree)));
  document.querySelectorAll('[data-grad]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.grad === grad)));
  const current = filterBriefs(notices, {degree, graduating: grad, period: 'active'});
  const past = filterBriefs(notices, {degree, graduating: grad, period: 'history'});
  const shown = showPast ? [...current, ...past] : current;
  list.replaceChildren(...shown.map(card));
  if (!shown.length) list.append(el('div', `No current notices for ${degree === 'all' ? 'these choices' : DEGREES[degree] + ' students'}. That does not guarantee you have nothing to do — check the ECE board too.`, 'empty'));
  pastButton.hidden = !past.length;
  pastButton.textContent = showPast ? 'Hide past notices' : `Show ${past.length} past notice${past.length === 1 ? '' : 's'}`;
}

document.querySelectorAll('[data-degree]').forEach(b => b.addEventListener('click', () => {
  degree = b.dataset.degree;
  try { localStorage.setItem('degree', degree); } catch { /* private mode: choice not remembered */ }
  render();
}));
document.querySelectorAll('[data-grad]').forEach(b => b.addEventListener('click', () => { grad = b.dataset.grad; render(); }));
pastButton.addEventListener('click', () => { showPast = !showPast; render(); });

fetch(base + 'notices.json', {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
  notices = data.notices;
  const when = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul'}).format(new Date(data.checked_at));
  document.querySelector('#updated').textContent = `Checked against the ECE board ${when} (Korea time). Updated daily.`;
  if (data.pending?.length) {
    document.querySelector('#pending').hidden = false;
    document.querySelector('#pending-list').replaceChildren(...data.pending.map(p => {
      const li = el('li'); const a = el('a', p.korean_title + ' ↗');
      a.href = p.source_url; a.target = '_blank'; a.rel = 'noopener'; a.lang = 'ko';
      li.append(a, el('small', 'Posted ' + p.posting_date));
      return li;
    }));
  }
  render();
}).catch(() => { list.replaceChildren(el('div', 'Notices could not be loaded. Please use the ECE board.', 'empty')); });
