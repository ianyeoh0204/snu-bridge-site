import {isHistorical} from './product-model.mjs?v=a3644a371853';
import {calendarLink} from './calendar.js?v=a3644a371853';

const base = document.querySelector('meta[name="app-base"]')?.content || '/';
const VERDICT = {yes: 'Applies to you', if: 'Applies only if…', no: 'Does not apply', unclear: 'Unclear'};
const NAVIGATOR = 'https://chatgpt.com/plugins/plugin_ed558e3e3ce08191b3ba6544f0541575';
const main = document.querySelector('#content');

function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function box(title, ...children) {
  const s = el('section', undefined, 'box');
  s.append(el('h3', title), ...children);
  return s;
}
function para(text, cls, lang) {
  const p = el('p', text, cls);
  if (lang) p.lang = lang;
  return p;
}
// One sourced point: Korean original -> English -> what it means for you.
function point(ko, en, you) {
  const d = el('div', undefined, 'point');
  if (ko) d.append(para(ko, 'ko', 'ko'));
  if (en) d.append(para(en, 'en'));
  if (you) d.append(you instanceof Node ? you : para(you, 'you'));
  return d;
}

const squash = s => (s || '').replace(/\s+/g, ' ').trim();
// Text with quoted sentences highlighted and web links clickable.
function richText(parent, text, quotes) {
  const ranges = [];
  for (const q of quotes) {
    const i = text.indexOf(q);
    if (q && i >= 0) ranges.push([i, i + q.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let at = 0;
  const push = (s, marked) => {
    const holder = marked ? el('mark') : parent;
    s.split(/(https?:\/\/[^\s)]+)/).forEach((part, k) => {
      if (k % 2) { const a = el('a', part); a.href = part; a.target = '_blank'; a.rel = 'noopener'; holder.append(a); }
      else if (part) holder.append(part);
    });
    if (marked) parent.append(holder);
  };
  for (const [s, e] of ranges) {
    if (s < at) continue;
    push(text.slice(at, s), false); push(text.slice(s, e), true); at = e;
  }
  push(text.slice(at), false);
}

function original(b, quotes) {
  const wrap = el('div', undefined, 'original');
  wrap.lang = 'ko';
  for (const block of b.original) {
    if (block.t === 'p') { const p = el('p'); richText(p, block.text, quotes); wrap.append(p); }
    else if (block.t === 'table') {
      const t = el('table'); const scroller = el('div', undefined, 'tbl');
      for (const row of block.rows) {
        const tr = el('tr');
        for (const cell of row) { const td = el('td'); richText(td, cell, quotes); tr.append(td); }
        t.append(tr);
      }
      scroller.append(t); wrap.append(scroller);
    } else if (block.t === 'img') {
      const img = el('img'); img.src = block.src; img.alt = block.alt || 'Image in the original notice';
      img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      const fallback = el('a', 'Open this image on the ECE site ↗'); fallback.href = b.source_url; fallback.target = '_blank'; fallback.rel = 'noopener';
      img.addEventListener('error', () => img.replaceWith(fallback));
      wrap.append(img, el('p', 'This image is not translated — check it for dates or tables.', 'img-note'));
    }
  }
  const source = el('p', undefined, 'source-line');
  const link = el('a', 'Open on the ECE site ↗'); link.href = b.source_url; link.target = '_blank'; link.rel = 'noopener';
  source.append(`${b.korean_title} · posted ${b.posting_date} · `, link);
  source.lang = 'ko';
  return box('Original notice (Korean)', source, wrap);
}

function files(b) {
  if (!b.attachments.length) return null;
  // ECE only serves files to visitors coming from its own notice page, so we send students there.
  const ul = el('ul', undefined, 'plain-list files');
  for (const f of b.attachments) { const li = el('li'); const name = el('span', f.name); name.lang = 'ko'; li.append(name); ul.append(li); }
  const get = el('a', 'Download on the ECE page ↗', 'btn'); get.href = b.source_url; get.target = '_blank'; get.rel = 'noopener';
  const hwp = b.attachments.some(f => /\.hwpx?$/i.test(f.name));
  return box('Files in this notice', ul, get, el('p', 'The files are at the bottom of the ECE notice. ' + (hwp ? '.hwp files open in the free Hancom Office Viewer. ' : '') +
    'These files are not translated here. To understand one, upload it to ChatGPT Edu and ask.', 'hint'));
}

function ask(b) {
  const s = el('section', undefined, 'ask');
  const status = el('p', '', 'status');
  const p = el('p'); p.append(el('b', 'Still unsure? '), 'Ask ChatGPT Edu — you can upload the files too. If it cannot answer, it will tell you who to contact.');
  const copy = el('button', 'Copy my question', 'btn');
  copy.addEventListener('click', async () => {
    const q = `Please explain this SNU ECE notice for me: ${b.source_url}\nDoes it apply to me, what is the exact deadline (quote the Korean), and what must I do?\nMy situation: [write here]`;
    try { await navigator.clipboard.writeText(q); status.textContent = 'Copied — paste it into ChatGPT Edu.'; } catch { status.textContent = q; }
  });
  const open = el('a', 'Open ChatGPT Edu ↗', 'btn light'); open.href = NAVIGATOR; open.target = '_blank'; open.rel = 'noopener';
  s.append(p, copy, open, status);
  return s;
}

fetch(base + 'briefs/' + document.body.dataset.noticeId + '/data.json', {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(b => {
  document.title = b.title + ' · SNU Bridge';
  const back = el('a', '‹ All notices', 'back'); back.href = base;
  main.replaceChildren(back, el('h1', b.title), el('p', b.who + (isHistorical(b) ? ' · past notice' : ''), 'who'));
  const quotes = [...(b.eligibility_quotes || []), ...(b.deadlines || []).map(d => d.quote), b.consequence?.quote, b.contact?.quote].filter(Boolean).map(squash);

  if (b.state !== 'full') {
    main.append(el('p', b.state_note, 'warn'));
    const f = files(b); if (f) main.append(f);
    main.append(original(b, []), ask(b));
    return;
  }
  if (b.superseded_by) {
    const a = el('a', `A newer rule replaces this: notice ${b.superseded_by} ›`); a.href = base + 'briefs/' + b.superseded_by + '/';
    main.append(el('p', undefined, 'warn')); main.lastChild.append(a);
  }

  const t = b.translations || {};
  const verdict = el('p', undefined, 'you');
  verdict.append(el('span', VERDICT[b.verdict], 'verdict ' + b.verdict), ' ', b.applicability);
  const applies = box('Does this apply to me?');
  b.eligibility_quotes.forEach((q, i) => applies.append(point(q, t[q], i === b.eligibility_quotes.length - 1 ? verdict : null)));
  if (!b.eligibility_quotes.length) applies.append(point(null, null, verdict));
  main.append(applies);

  if (b.deadlines.length) {
    const when = box('When');
    for (const d of b.deadlines) {
      const row = el('div', undefined, 'deadline');
      const left = el('div'); left.append(el('b', d.label), el('br'), el('span', d.when));
      const cal = calendarLink(d); if (cal) cal.className = 'cal';
      row.append(left); if (cal) row.append(cal);
      when.append(row, para(d.quote, 'quote-ko', 'ko'));
    }
    main.append(when);
  }

  const steps = el('ol', undefined, 'steps');
  b.steps.forEach(s => steps.append(el('li', s)));
  main.append(box('What to do', steps));

  const miss = box('If you miss it');
  miss.append(b.consequence.quote ? point(b.consequence.quote, t[b.consequence.quote], b.consequence.text) : el('p', b.consequence.text));
  main.append(miss);

  const f = files(b); if (f) main.append(f);
  main.append(original(b, quotes), ask(b));

  const contact = b.contact?.text && !/^Not stated/.test(b.contact.text) ? b.contact.text : 'the ECE office (see the original notice)';
  document.querySelector('#footer').textContent = `AI explanation — may contain errors; check the original. Contact: ${contact}.`;
}).catch(() => {
  main.replaceChildren(el('h1', 'Notice unavailable'), el('p', 'Please use the ECE academic board.'));
});
