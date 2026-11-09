const base=document.querySelector('meta[name="app-base"]')?.content||'/';
const day=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Seoul'}).format(new Date(value));
fetch(base+'project/evidence.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Evidence snapshot unavailable');return r.json();}).then(data=>{
 document.querySelector('#record-count').textContent=data.source_records;
 document.querySelector('#check-count').textContent=`${data.grounding_passed}/${data.collection_checks}`;
 document.querySelector('#evidence-date').textContent=`Site built ${day(data.built_at)} from notices checked ${day(data.checked_at)}. Brief generator: ${data.generator_configured?'running daily':'waiting for the API key — new notices are listed but not yet explained'}. Human-reviewed briefs: ${data.reviewed_briefs}.`;
}).catch(error=>{document.querySelector('#evidence-date').textContent=error.message+'. No unverified result is substituted.';});
