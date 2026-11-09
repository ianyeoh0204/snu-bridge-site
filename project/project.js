const base = document.querySelector('meta[name="app-base"]')?.content || '/';
const when = v => new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul'}).format(new Date(v));
const set = (id, text) => { document.getElementById(id).textContent = text; };

fetch(base + 'project/evidence.json', {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
  set('s-notices', `${d.translated_notices} / ${d.source_records}`);
  set('s-pieces', d.text_pieces ? (Math.floor(1000 * d.text_pieces_in_english / d.text_pieces) / 10) + '%' : '–');
  set('s-checked', `${d.grounding_passed} / ${d.collection_checks}`);
  set('s-date', `Last checked against the ECE board ${when(d.checked_at)} (Korea time).`);
}).catch(() => { document.getElementById('stats').hidden = true; });
