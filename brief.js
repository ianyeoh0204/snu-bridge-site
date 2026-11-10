import {isHistorical, endTime, startTime, DEGREES} from './product-model.mjs?v=1b00abed8308';
import {calendarLink} from './calendar.js?v=1b00abed8308';

const base = document.querySelector('meta[name="app-base"]')?.content || '/';
const VERDICT = {yes: 'Applies to you', if: 'Applies only if…', no: 'Does not apply', unclear: 'Unclear'};
const NAVIGATOR = 'https://chatgpt.com/plugins/plugin_ed558e3e3ce08191b3ba6544f0541575';
const main = document.querySelector('#content');
const squash = s => (s || '').replace(/\s+/g, ' ').trim();

function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function box(title, ...children) {
  const s = el('section', undefined, 'box');
  if (title) s.append(el('h3', title));
  s.append(...children);
  return s;
}

// Text with web links clickable and, for Korean, quoted sentences highlighted.
function rich(parent, text, quotes = []) {
  const ranges = quotes.map(q => [text.indexOf(q), q.length]).filter(([i]) => i >= 0)
    .map(([i, n]) => [i, i + n]).sort((a, b) => a[0] - b[0]);
  let at = 0;
  const push = (s, marked) => {
    const holder = marked ? el('mark') : parent;
    s.split(/(https?:\/\/[^\s)]+)/).forEach((part, k) => {
      if (k % 2) { const a = el('a', part); a.href = part; a.target = '_blank'; a.rel = 'noopener'; holder.append(a); }
      else if (part) holder.append(part);
    });
    if (marked) parent.append(holder);
  };
  for (const [s, e] of ranges) { if (s < at) continue; push(text.slice(at, s), false); push(text.slice(s, e), true); at = e; }
  push(text.slice(at), false);
}
// spans: [colspan, rowspan] per cell, from the ECE page, so merged cells stay merged.
function table(rows, quotes, spans) {
  const wrap = el('div', undefined, 'tbl'); const t = el('table');
  rows.forEach((row, r) => {
    const tr = el('tr');
    row.forEach((cell, c) => {
      const td = el('td'); rich(td, cell || '', quotes);
      const [cs, rs] = spans?.[r]?.[c] || [1, 1];
      if (cs > 1) td.colSpan = cs;
      if (rs > 1) td.rowSpan = rs;
      tr.append(td);
    });
    t.append(tr);
  });
  wrap.append(t); return wrap;
}

// Text an AI read from an uploaded copy of an image: English with the Korean it read.
function imageText(blocks, note) {
  const box = el('div', undefined, 'img-tr');
  box.append(el('p', note, 'img-tr-note'));
  for (const block of blocks) {
    const pair = el('div', undefined, 'blk');
    const ko = el('div', undefined, 'ko'); ko.lang = 'ko';
    if (block.t === 'p') { ko.append(el('p', block.ko)); } else ko.append(table(block.ko, []));
    if (block.en !== null && block.en !== undefined) {
      const en = el('div', undefined, 'en');
      if (block.t === 'p') { const p = el('p'); rich(p, block.en); en.append(p); } else en.append(table(block.en, []));
      pair.append(en, ko);
    } else { ko.classList.add('untranslated'); pair.append(ko); }
    box.append(pair);
  }
  return box;
}

// Which block of the notice a quoted Korean sentence comes from.
function blockOf(b, quote) {
  const q = squash(quote);
  return b.original.findIndex(block => block.t === 'p' ? squash(block.text).includes(q)
    : block.t === 'table' && block.rows.some(r => r.some(c => squash(c).includes(q))));
}
function sourceLink(b, quote) {
  const i = quote ? blockOf(b, quote) : -1;
  if (i < 0) return null;
  const a = el('a', 'source ↓', 'src-link'); a.href = '#b' + i;
  a.addEventListener('click', () => {
    const target = document.getElementById('b' + i);
    target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
  });
  return a;
}

function glance(b) {
  const s = box('At a glance');
  const applies = el('div', undefined, 'g-row');
  applies.append(el('span', VERDICT[b.verdict], 'verdict ' + b.verdict), el('p', b.applicability));
  const src = sourceLink(b, b.eligibility_quotes[0]); if (src) applies.append(src);
  s.append(applies);
  for (const m of b.missing || []) s.append(el('p', m, 'missing'));
  for (const d of b.deadlines) {
    const row = el('div', undefined, 'deadline');
    const left = el('div'); left.append(el('b', d.label));
    const passed = endTime(d.end) < Date.now(), started = startTime(d.start) <= Date.now();
    if (passed) left.append(el('span', 'Closed', 'tag closed'));
    else if (['event', 'closure'].includes(d.kind) && d.start && started) left.append(el('span', 'Now', 'tag changed'));
    if (d.kind === 'info') left.append(el('span', 'For information', 'tag pending'));
    if (d.degrees?.length) left.append(el('span', d.degrees.map(x => DEGREES[x] || x).join(', ') + ' only', 'tag pending'));
    if (d.optional) left.append(el('span', 'Only if it applies to you', 'tag pending'));
    left.append(el('br'), el('span', d.when));
    if (passed) row.classList.add('passed');
    const right = el('div', undefined, 'deadline-links');
    const cal = calendarLink(d); if (cal) { cal.className = 'cal'; right.append(cal); }
    const link = sourceLink(b, d.quote); if (link) right.append(link);
    row.append(left, right); s.append(row);
  }
  const steps = el('ol', undefined, 'steps'); b.steps.forEach(x => steps.append(el('li', x)));
  s.append(el('h4', 'What to do'), steps);
  if (b.consequence?.text && !/^Not stated/i.test(b.consequence.text)) {
    const miss = el('div', undefined, 'g-row');
    miss.append(el('p', 'If you miss it: ' + b.consequence.text));
    const mlink = sourceLink(b, b.consequence.quote); if (mlink) miss.append(mlink);
    s.append(miss);
  }
  return s;
}

function files(b) {
  if (!b.attachments.length) return null;
  const read = Object.fromEntries((b.file_text || []).map(f => [f.name, f]));
  const ul = el('ul', undefined, 'plain-list files');
  for (const f of b.attachments) {
    const li = el('li'); const n = el('span', f.name); n.lang = 'ko'; li.append(n);
    const r = read[f.name];
    if (r?.blocks?.length) {
      const d = el('details'); d.append(el('summary', 'Read it in English'));
      const wrap = el('div', undefined, 'original'); wrap.dataset.mode = 'en';
      wrap.append(imageText(r.blocks, 'Read from the file and translated by AI. Check numbers against the file.'));
      d.append(wrap); li.append(d);
    } else li.append(el('small', r?.note ? `Read for the summary above; ${r.note.replace(/; used for the summary$/, '')}.` : 'Not read — open it on the ECE page.'));
    ul.append(li);
  }
  const get = el('a', 'Download on the ECE page ↗', 'btn'); get.href = b.source_url; get.target = '_blank'; get.rel = 'noopener';
  const hwp = b.attachments.some(f => /\.hwpx?$/i.test(f.name));
  return box('Files in this notice', ul, get, el('p', 'The originals are at the bottom of the ECE notice.' + (hwp ? ' .hwp files open in the free Hancom Office Viewer.' : ''), 'hint'));
}

function fullNotice(b, quotes) {
  const english = Array.isArray(b.english) ? b.english : null;
  const unread = b.original.filter((x, i) => x.t === 'img' && !b.image_text?.[String(i)]).length;
  const s = box(english ? (unread ? `Notice text in English · ${unread} image${unread > 1 ? 's' : ''} not translated` : 'Full notice in English') : 'Full notice');
  const source = el('p', undefined, 'source-line');
  const link = el('a', 'Open on the ECE site ↗'); link.href = b.source_url; link.target = '_blank'; link.rel = 'noopener';
  const title = el('span', b.korean_title); title.lang = 'ko';
  source.append(title, ` · posted ${b.posting_date} · `, link);
  s.append(source);

  const body = el('div', undefined, 'original');
  if (english) {
    const bar = el('div', undefined, 'seg'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Language');
    for (const [mode, label] of [['en', 'English'], ['both', 'Both'], ['ko', '한국어']]) {
      const btn = el('button', label);
      btn.setAttribute('aria-pressed', String(mode === 'en'));
      btn.addEventListener('click', () => {
        body.dataset.mode = mode;
        bar.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === btn)));
      });
      bar.append(btn);
    }
    body.dataset.mode = 'en';
    s.append(bar);
    if (english.some((e, i) => e === null && b.original[i].t !== 'img')) s.append(el('p', 'Parts marked 한국어 are shown in Korean only.', 'hint'));
  } else {
    s.append(el('p', 'This notice is shown in Korean.', 'hint'));
  }

  b.original.forEach((block, i) => {
    const blk = el('div', undefined, 'blk'); blk.id = 'b' + i;
    const en = english ? english[i] : null;
    if (block.t === 'p' && /^[\s=\-_─━*~.·]{5,}$/.test(block.text)) {  // a divider line in the notice
      blk.append(el('hr', undefined, 'divider'));
    } else if (block.t === 'img') {
      const img = el('img'); img.src = block.src; img.alt = block.alt || 'Image in the notice';
      img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      const fallback = el('a', 'Open this image on the ECE site ↗'); fallback.href = b.source_url; fallback.target = '_blank'; fallback.rel = 'noopener';
      img.addEventListener('error', () => img.replaceWith(fallback));
      blk.append(img);
      const read = b.image_text?.[String(i)];
      if (read) blk.append(imageText(read, 'Text in this image, read and translated by AI. Check numbers against the image.'));
      else {
        const lens = el('a', 'Translate this image ↗', 'btn light small');
        lens.href = 'https://lens.google.com/uploadbyurl?hl=en&url=' + encodeURIComponent(block.src);
        lens.target = '_blank'; lens.rel = 'noopener';
        blk.append(el('p', 'This image could not be read yet. The button opens it in Google Lens — tap Translate.', 'img-note'), lens);
      }
    } else {
      const ko = el('div', undefined, 'ko'); ko.lang = 'ko';
      if (block.t === 'p') { const p = el('p'); rich(p, block.text, quotes); ko.append(p); } else ko.append(table(block.rows, quotes, block.spans));
      if (en !== null && en !== undefined) {
        const eng = el('div', undefined, 'en');
        if (block.t === 'p') { const p = el('p'); rich(p, en); eng.append(p); } else eng.append(table(en, [], block.spans));
        blk.append(eng, ko);
      } else {
        if (english) ko.classList.add('untranslated');
        blk.append(ko);
      }
    }
    body.append(blk);
  });
  s.append(body);
  return s;
}

function profile() {
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const degree = DEGREES[read('degree')], grad = {yes: 'graduating this semester', no: 'not graduating this semester'}[read('graduating')];
  return [degree && `ECE ${degree} student`, grad].filter(Boolean).join(', ');
}

function ask(b) {
  const s = el('section', undefined, 'ask');
  const status = el('p', '', 'status');
  const p = el('p'); p.append(el('b', 'Still unsure? '), 'Ask SNU Bridge in ChatGPT Edu — you can upload the files too. If it cannot answer, it tells you who to contact.');
  const copy = el('button', 'Copy my question', 'btn');
  copy.addEventListener('click', async () => {
    const me = profile();
    const q = `Please explain this SNU ECE notice for me: ${b.source_url}\nDoes it apply to me, what is the exact deadline (quote the Korean), and what must I do?\nMy situation: ${me ? me + '. ' : ''}[add anything else]`;
    try { await navigator.clipboard.writeText(q); status.textContent = 'Copied — paste it into ChatGPT Edu.'; } catch { status.textContent = q; }
  });
  const open = el('a', 'Ask SNU Bridge ↗', 'btn light'); open.href = NAVIGATOR; open.target = '_blank'; open.rel = 'noopener';
  const note = el('p', 'Opens the SNU Bridge assistant in ChatGPT Edu. It needs your SNU ChatGPT Edu account, and the assistant has to be available in your workspace. If it does not open, paste the copied question into any ChatGPT Edu chat.', 'hint');
  s.append(p, copy, open, status, note);
  return s;
}

fetch(base + 'briefs/' + document.body.dataset.noticeId + '/data.json', {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(b => {
  document.title = b.title + ' · SNU Bridge';
  const back = el('a', '‹ All notices', 'back'); back.href = base;
  main.replaceChildren(back, el('h1', b.title), el('p', b.who + (isHistorical(b) ? ' · past notice' : ''), 'who'));
  const quotes = [...(b.eligibility_quotes || []), ...(b.deadlines || []).map(d => d.quote), b.consequence?.quote, b.contact?.quote].filter(Boolean).map(squash);
  if (b.superseded_by) {
    const w = el('p', undefined, 'warn'); const a = el('a', `A newer rule replaces this: notice ${b.superseded_by} ›`);
    a.href = base + 'briefs/' + b.superseded_by + '/'; w.append(a); main.append(w);
  }
  if (b.state === 'full') main.append(glance(b));
  else main.append(el('p', b.state_note, 'warn'));
  const f = files(b); if (f) main.append(f);
  main.append(fullNotice(b, b.state === 'full' ? quotes : []), ask(b));
  const contact = b.contact?.text && !/^Not stated/.test(b.contact.text) ? b.contact.text : 'the ECE office (see the notice)';
  document.querySelector('#footer').textContent = `AI explanation and translation — may contain errors; the Korean original controls. Contact: ${contact}.`;
}).catch(() => {
  main.replaceChildren(el('h1', 'Notice unavailable'), el('p', 'Please use the ECE academic board.'));
});
