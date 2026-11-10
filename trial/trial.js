// A two-condition trial with no server: the student answers four questions about real notices,
// two with their usual tools and two with SNU Bridge, then copies a plain-text result to send back.
// Correct answers come from eval/answer-sheet.json (the Korean source), not from the site's own brief.
const base = document.querySelector('meta[name="app-base"]')?.content || '/';
const root = document.getElementById('trial');
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
const CANT = 'I cannot tell';
const SETS = {
  1: [{id: '58200', q: 'Winter-session tuition: when is the first payment period?',
       options: ['18–23 November', '26–27 November', 'By 8 December', 'The notice gives no date'], right: 0},
      {id: '58022', q: 'A graduate student does not hand in the Thesis Research confirmation form on time. What happens?',
       options: ['A late fee is charged', 'The grade becomes U', 'Course registration is cancelled', 'The notice does not say'], right: 1}],
  2: [{id: '58072', q: 'You are a master’s student whose thesis is reviewed this semester. By when must the review result documents be handed in?',
       options: ['3 November, 17:00', '14 December, 17:00', '21 December, 17:00', '1 February 2027'], right: 1},
      {id: '58159', q: 'Hanwha Ocean winter internship course: what does the notice say about a second application round?',
       options: ['There is no second round', '10–11 November, guaranteed', '10–11 November, but it may not be held', '26–30 November'], right: 2}],
};
const wanted = new URLSearchParams(location.search).get('v');
const version = ['a', 'b'].includes(wanted) ? wanted : Math.random() < 0.5 ? 'a' : 'b';
const [usual, bridge] = version === 'a' ? [SETS[1], SETS[2]] : [SETS[2], SETS[1]];
const tasks = [...usual.map(t => ({...t, way: 'usual'})), ...bridge.map(t => ({...t, way: 'bridge'}))];
const result = {degree: '', habit: '', answers: [], ease: '', use: '', comment: ''};
let sources = {};

function screen(...nodes) { root.replaceChildren(...nodes); root.scrollIntoView({block: 'start'}); }
function choice(label, values, onPick) {
  const wrap = el('div'); wrap.append(el('p', label, 'chips-label'));
  const chips = el('div', undefined, 'chips');
  for (const v of values) {
    const b = el('button', v, 'chip'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.onclick = () => { chips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); onPick(v); };
    chips.append(b);
  }
  wrap.append(chips); return wrap;
}
function next(label, action) { const b = el('button', label, 'btn'); b.type = 'button'; b.onclick = action; return b; }

function intro() {
  const box = el('div', undefined, 'box');
  const go = next('Start', () => task(0)); go.disabled = true;
  const ready = () => { go.disabled = !(result.degree && result.habit); };
  box.append(el('p', 'It takes about 10 minutes. There are no trick questions; “I cannot tell” is a valid answer. Please do not guess.'),
    choice('Your programme', ['Undergraduate', 'Master’s', 'PhD', 'Integrated MS–PhD', 'Exchange / other'], v => { result.degree = v; ready(); }),
    choice('How do you usually read a Korean notice?', ['Browser translation', 'Papago / Google Lens', 'ChatGPT or another AI', 'I ask someone', 'I read Korean'], v => { result.habit = v; ready(); }),
    go);
  screen(box);
}

function task(i) {
  if (i >= tasks.length) return ratings();
  const t = tasks[i], box = el('div', undefined, 'box');
  box.append(el('h3', `Question ${i + 1} of ${tasks.length}`));
  box.append(el('p', t.way === 'usual'
    ? 'Use the Korean notice and whatever you normally use (browser translation, Papago, ChatGPT…). Do not open SNU Bridge for this one.'
    : 'Use SNU Bridge for this one.'));
  const open = el('a', t.way === 'usual' ? 'Open the Korean notice' : 'Open the notice in SNU Bridge', 'btn');
  open.href = t.way === 'usual' ? (sources[t.id] || base) : `${base}briefs/${t.id}/`;
  open.target = '_blank'; open.rel = 'noopener';
  const question = el('div'); question.hidden = true;
  let started = 0;
  open.addEventListener('click', () => { if (!started) started = Date.now(); question.hidden = false; });
  question.append(el('p', t.q, 'trial-q'));
  for (const [n, text] of [...t.options, CANT].entries()) {
    const b = el('button', text, 'btn light trial-option'); b.type = 'button';
    b.onclick = () => {
      result.answers.push({id: t.id, way: t.way, picked: n < t.options.length ? 'abcd'[n] : '-', correct: n === t.right, seconds: Math.round((Date.now() - started) / 1000)});
      task(i + 1);
    };
    question.append(b);
  }
  box.append(open, question);
  screen(box);
}

function ratings() {
  const box = el('div', undefined, 'box');
  const done = next('Show my result', finish); done.disabled = true;
  const ready = () => { done.disabled = !(result.ease && result.use); };
  const note = el('textarea'); note.rows = 3; note.className = 'trial-note'; note.setAttribute('aria-label', 'Comment (optional)');
  note.placeholder = 'Anything confusing, wrong or missing? (optional)';
  note.oninput = () => { result.comment = note.value.trim().replace(/\s+/g, ' ').slice(0, 400); };
  box.append(el('h3', 'Two last questions'),
    choice('Compared with your usual way, finding the answer with SNU Bridge was (1 = much harder, 5 = much easier)', ['1', '2', '3', '4', '5'], v => { result.ease = v; ready(); }),
    choice('I would use SNU Bridge for my department’s notices (1 = no, 5 = definitely)', ['1', '2', '3', '4', '5'], v => { result.use = v; ready(); }),
    note, done);
  screen(box);
}

function finish() {
  const score = way => { const a = result.answers.filter(x => x.way === way); return `${a.filter(x => x.correct).length} of ${a.length} correct, ${a.reduce((s, x) => s + x.seconds, 0)} s`; };
  const text = [`SNU Bridge trial 1 · version ${version.toUpperCase()} · ${new Date().toISOString().slice(0, 10)}`,
    `programme: ${result.degree} · usual way: ${result.habit}`,
    ...result.answers.map((a, n) => `Q${n + 1} ${a.way} ${a.id} answer=${a.picked} correct=${a.correct ? 'yes' : 'no'} ${a.seconds}s`),
    `easier=${result.ease} would-use=${result.use}`, `comment: ${result.comment || '-'}`].join('\n');
  const box = el('div', undefined, 'box');
  const out = el('textarea'); out.readOnly = true; out.rows = 9; out.className = 'trial-note'; out.value = text; out.setAttribute('aria-label', 'Your result');
  const status = el('p', '', 'section-note');
  const copy = next('Copy my result', async () => {
    try { await navigator.clipboard.writeText(text); } catch { out.select(); document.execCommand('copy'); }
    status.textContent = 'Copied. Paste it in a message to the person who invited you.';
  });
  box.append(el('h3', 'Thank you'), el('p', `Your usual way: ${score('usual')}. SNU Bridge: ${score('bridge')}.`),
    el('p', 'Please copy this and send it back. It contains no name or contact details.'), out, copy, status);
  screen(box);
}

fetch(base + 'notices.json', {cache: 'no-store'}).then(r => r.json()).then(d => {
  sources = Object.fromEntries(d.notices.map(n => [String(n.id), n.source_url]));
}).catch(() => {}).finally(intro);
