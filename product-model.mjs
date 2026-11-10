export const DEGREES={undergraduate:'Undergraduate',masters:'Master’s',phd:'PhD',integrated:'Integrated MS–PhD'};
export function endTime(value){return value?Date.parse(value.length===10?value+'T23:59:59+09:00':value):NaN;}
export function semesterHint(post,degree,semesters){
 const required=post.semester_thresholds?.[degree];
 if(!required)return 'Choose a graduate degree to inspect the semester condition for this historical case.';
 if(!Number.isInteger(semesters)||semesters<1)return `This notice gives a ${required}-semester condition for the selected program. Your semester count is unknown.`;
 return `Your selected count ${semesters>=required?'meets':'does not meet'} the ${required}-semester condition in this notice. Overall exam eligibility is not determined; credits, language, tuition, training and current rules still need checking.`;
}
export function startTime(value){return value?Date.parse(value.length===10?value+'T00:00:00+09:00':value):NaN;}
// Deadlines that matter to this degree. kind: action (the student must act by `end`), event or
// closure (something happens from `start`), info (context only, e.g. an internship period).
export function applicable(post,degree='all'){
 return (post.deadlines||[]).filter(d=>!['practice','opening','info'].includes(d.kind)&&(!d.degrees||degree==='all'||d.degrees.includes(degree)));
}
const timed=d=>['event','closure'].includes(d.kind);
// What a card shows: the deadline the title refers to (the first one for this degree). When it has
// passed, the next thing still ahead takes over under its own phrase: a later action, or an event
// or closure the student still has to turn up for. A date with no kind (old briefs) never takes
// over. With nothing ahead the card says "Closed". Events and closures show their start until they begin.
export function cardDate(post,degree='all',now=Date.now()){
 const ds=applicable(post,degree);
 const i=ds.findIndex(d=>!d.optional&&Number.isFinite(endTime(d.end)));
 if(i<0)return null;
 const primary=ds[i];
 if(timed(primary)&&startTime(primary.start)>now)return {d:primary,at:startTime(primary.start),phase:'starts'};
 if(endTime(primary.end)>=now)return {d:primary,at:endTime(primary.end),phase:timed(primary)?'ongoing':'open'};
 const next=ds.slice(i+1).find(d=>(d.kind==='action'||timed(d))&&!d.optional&&endTime(d.end)>=now);
 if(next&&timed(next)&&startTime(next.start)>now)return {d:next,at:startTime(next.start),phase:'starts',closed:primary};
 if(next)return {d:next,at:endTime(next.end),phase:timed(next)?'ongoing':'open',closed:primary};
 return {d:primary,at:endTime(primary.end),phase:'closed'};
}
// The card's headline: the notice title, or what to do next once the title's own deadline has passed.
export function headline(post,c){return c?.closed?(c.d.action||c.d.label||post.title):post.title;}
export function nextDate(post,degree='all',now=Date.now()){
 const c=cardDate(post,degree,now);
 return c&&c.phase!=='closed'?c.d:null;
}
export function isHistorical(post,now=Date.now(),degree='all'){
 if(post.historical)return true;
 if(post.ongoing_condition)return false;
 return cardDate(post,degree,now)?.phase==='closed';
}
// Uncertain eligibility is listed separately ("may apply") instead of mixed with notices for this degree.
export function mayApply(p,degree){return degree!=='all'&&p.degrees?.length>0&&!p.degrees.includes(degree)&&!!p.applicability_uncertain;}
export function filterBriefs(posts,{degree='all',graduating='unsure',period='active',query='',uncertain=false}={},now=Date.now()){
 const q=query.trim().toLocaleLowerCase();
 return posts.filter(p=>(uncertain?mayApply(p,degree):(degree==='all'||!p.degrees?.length||p.degrees.includes(degree)))
  &&(graduating!=='no'||p.graduation_scope!=='graduating_only')
  &&(period==='all'||(period==='history'?isHistorical(p,now,degree):!isHistorical(p,now,degree)))
  &&(!q||[p.title,p.who||'',p.korean_title||'',p.summary||'',p.period||'',...(p.steps||[])].join(' ').toLocaleLowerCase().includes(q)))
 .sort((a,b)=>sortKey(a,degree,now)-sortKey(b,degree,now)||(b.posting_date||'').localeCompare(a.posting_date||''));
}
function sortKey(p,degree,now){
 const c=cardDate(p,degree,now);
 return c&&c.phase!=='closed'?c.at:Infinity;
}
