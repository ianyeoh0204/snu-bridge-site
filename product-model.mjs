export const DEGREES={undergraduate:'Undergraduate',masters:'Master’s',phd:'PhD',integrated:'Integrated MS–PhD'};
export function endTime(value){return value?Date.parse(value.length===10?value+'T23:59:59+09:00':value):NaN;}
export function semesterHint(post,degree,semesters){
 const required=post.semester_thresholds?.[degree];
 if(!required)return 'Choose a graduate degree to inspect the semester condition for this historical case.';
 if(!Number.isInteger(semesters)||semesters<1)return `This notice gives a ${required}-semester condition for the selected program. Your semester count is unknown.`;
 return `Your selected count ${semesters>=required?'meets':'does not meet'} the ${required}-semester condition in this notice. Overall exam eligibility is not determined; credits, language, tuition, training and current rules still need checking.`;
}
export function nextDate(post,degree='all',now=Date.now()){
 const dates=post.deadlines.filter(d=>!['practice','opening'].includes(d.kind)&&(!d.degrees||degree==='all'||d.degrees.includes(degree))&&endTime(d.end)>=now);
 const required=dates.filter(d=>!d.optional);
 return (required.length?required:dates).sort((a,b)=>endTime(a.end)-endTime(b.end))[0]||null;
}
export function isHistorical(post,now=Date.now()){
 if(post.historical)return true;
 if(post.ongoing_condition)return false;
 const dates=post.deadlines.map(d=>endTime(d.end)).filter(Number.isFinite);
 return dates.length>0&&Math.max(...dates)<now;
}
export function filterBriefs(posts,{degree='all',graduating='unsure',period='active',query=''}={},now=Date.now()){
 const q=query.trim().toLocaleLowerCase();
 return posts.filter(p=>(degree==='all'||p.applicability_uncertain||!p.degrees?.length||p.degrees.includes(degree))
  &&(graduating!=='no'||p.graduation_scope!=='graduating_only')
  &&(period==='all'||(period==='history'?isHistorical(p,now):!isHistorical(p,now)))
  &&(!q||[p.title,p.korean_title||'',p.summary,p.context,p.period,...p.steps,...p.terms.flatMap(t=>[t.ko,t.en])].join(' ').toLocaleLowerCase().includes(q)))
 .sort((a,b)=>(nextDate(a,degree,now)?endTime(nextDate(a,degree,now).end):Infinity)-(nextDate(b,degree,now)?endTime(nextDate(b,degree,now).end):Infinity)||b.posting_date.localeCompare(a.posting_date));
}
