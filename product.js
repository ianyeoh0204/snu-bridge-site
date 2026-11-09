import {DEGREES,filterBriefs,nextDate,isHistorical,semesterHint} from './product-model.mjs';
const base=document.querySelector('meta[name="app-base"]')?.content||'/';
let dataset=[],visibleCount=12;
const list=document.querySelector('#notice-list');
const marked=new Map();
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function renderChecklist(posts){
 const select=document.querySelector('#checklist-notice');const previous=select.value;
 select.replaceChildren();select.disabled=!posts.length;
 if(!posts.length){select.append(el('option','No checked guidance available for these choices'));document.querySelector('#checklist-content').replaceChildren(el('p','Preparation lists appear when a relevant brief is available. This is not evidence that you have no requirements.'));return;}
 for(const p of posts){const option=el('option',p.title+(isHistorical(p)?' · historical example':''));option.value=p.id;select.append(option);}
 if(posts.some(p=>p.id===previous))select.value=previous;
 showChecklist();
}
function showChecklist(){
 const b=dataset.find(p=>p.id===document.querySelector('#checklist-notice').value);if(!b)return;
 const root=document.querySelector('#checklist-content');root.replaceChildren(el('p',b.period+' · '+(b.publication_eligible?'Checked guidance':'AI draft — not yet checked by a Korean reader'),'checklist-state'),el('p',b.applicability));
 if(isHistorical(b))root.append(el('p','Historical case. These requirements do not establish the rules for a later exam or semester.','unread-warning'));
 if(b.semester_thresholds){const label=el('label','Registered semesters (optional; this page only)');const input=el('input');input.type='number';input.min='1';input.max='30';input.placeholder='Not provided';const hint=el('p',semesterHint(b,document.querySelector('[name="degree"]:checked').value,NaN),'small-note');input.addEventListener('input',()=>{hint.textContent=semesterHint(b,document.querySelector('[name="degree"]:checked').value,Number(input.value));});label.append(input);root.append(label,hint);}
 const progress=el('p',undefined,'checklist-progress');root.append(progress);
 const items=b.checklist_items||[];const update=()=>{progress.textContent=`${items.filter((_,i)=>marked.get(b.id+':'+i)).length} of ${items.length} marked by you · not an eligibility decision`;};
 items.forEach((text,i)=>{const label=el('label',undefined,'preparation-item');const input=el('input');input.type='checkbox';input.checked=Boolean(marked.get(b.id+':'+i));input.addEventListener('change',()=>{marked.set(b.id+':'+i,input.checked);update();});label.append(input,el('span',text));root.append(label);});update();
 const a=el('a','Read the full brief, exceptions and Korean evidence →','brief-link');a.href=base+'briefs/'+b.id+'/';root.append(a,el('p','Your checkmarks stay in this open page only. They are not uploaded, saved as study responses or verified by the university.','small-note'));
}
document.querySelector('#checklist-notice').addEventListener('change',showChecklist);
function card(p){
 const article=el('article',undefined,'action-card');const meta=el('div',undefined,'notice-meta');
 meta.append(el('span',p.period,'board'),el('span',isHistorical(p)?'Historical example':'Check your conditions'));
 article.append(meta,el('h3',p.title),el('p',p.summary,'action-summary'));
 const verdict=el('div',undefined,'applies-line');verdict.append(el('strong',p.applicability_uncertain?'Applicability unclear':'Applies only if…'),el('p',p.applicability));article.append(verdict);
 const date=nextDate(p,document.querySelector('[name="degree"]:checked').value);
 const due=el('div',undefined,'deadline-box');due.append(el('strong',date?date.label:isHistorical(p)?'Historical dates — see the full brief':'Date not verified / no exact deadline stated'),el('p',date?date.when:p.ongoing_condition||'Read the full brief and original; a missing date does not mean no action is required.'));
 if(date)due.append(el('p',date.quote,'korean-quote'));article.append(due);
 const flags=el('div',undefined,'card-flags');flags.append(el('span',p.english_match.status==='matched'?'English version found':p.english_match.status==='not_found_in_checked_sources'?'No English version found in checked range':'English-board match: unsure','sync-badge'));
 if(p.image_count||p.attachments.length)flags.append(el('span',`${p.image_count?p.image_count+' image(s)':''}${p.image_count&&p.attachments.length?' · ':''}${p.attachments.length?p.attachments.length+' attachment(s)':''} not read`,'unread-badge'));
 flags.append(el('span',p.stale?'Source changed — review needed':p.publication_eligible?(p.review_status==='office_reviewed'?'Office reviewed':'AI-generated · student reviewed'):'AI draft · not yet checked by a Korean reader','review-badge'));article.append(flags);
 const actions=el('div',undefined,'card-actions');const open=el('a','Read the action brief →','brief-link');open.href=base+'briefs/'+p.id+'/';const original=el('a','Official notice ↗');original.href=p.source_url;original.target='_blank';original.rel='noopener noreferrer';actions.append(open,original);article.append(actions);return article;
}
function render(){const degree=document.querySelector('[name="degree"]:checked').value;const filtered=filterBriefs(dataset,{degree,graduating:document.querySelector('#graduating').value,period:document.querySelector('#period').value,query:document.querySelector('#search').value});document.querySelector('#result-count').textContent=`${filtered.length} action brief${filtered.length===1?'':'s'}${degree==='all'?'':' · '+DEGREES[degree]}`;renderChecklist(filtered);list.replaceChildren(...filtered.slice(0,visibleCount).map(card));if(!filtered.length){const empty=el('div',undefined,'empty action-empty');empty.append(el('h3',dataset.length?'No briefs match these choices yet.':'English briefs are awaiting Korean-reader review.'),el('p',dataset.length?'Try all periods or another degree. These filters cannot establish that there are no requirements for you.':'The public site publishes checked briefs only. Use the official ECE board while the first set is reviewed.'));const a=el('a','Open the official academic board ↗','btn');a.href='https://ece.snu.ac.kr/community/academics';a.target='_blank';a.rel='noopener noreferrer';empty.append(a);list.append(empty);}document.querySelector('#load-more').hidden=visibleCount>=filtered.length;}
document.querySelectorAll('[name="degree"],#graduating,#period,#search').forEach(n=>n.addEventListener(n.id==='search'?'input':'change',()=>{visibleCount=12;render();}));document.querySelector('#load-more').addEventListener('click',()=>{visibleCount+=12;render();});
fetch(base+'notices.json').then(r=>{if(!r.ok)throw new Error('Briefs could not be loaded.');return r.json();}).then(data=>{dataset=data.notices;document.querySelector('#checked-at').textContent=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Seoul'}).format(new Date(data.checked_at))+' · Korea time';document.querySelector('#review-title').textContent=data.mode==='local_review'?'Private review preview · AI drafts':'Reviewed guidance, with the source beside it.';document.querySelector('#review-message').textContent=data.mode==='local_review'?` ${data.draft_count} drafts await a Korean reader. This local preview must not be used as verified advice.`:` ${data.published_count} checked briefs published; ${data.draft_count} drafts await review. Your degree alone does not establish eligibility.`;render();}).catch(error=>{document.querySelector('#result-count').textContent='Briefs unavailable';list.replaceChildren(el('div',error.message+' Please use the official ECE board.','error'));});

if(location.hash==="#pipeline")location.replace(base+"project/#approach");
