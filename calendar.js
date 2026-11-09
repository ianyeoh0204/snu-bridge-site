const base=document.querySelector('meta[name="app-base"]')?.content||'/';
export function calendarLink(deadline){
 if(!deadline?.calendar_path)return null;
 const a=document.createElement('a');a.className='calendar-link';a.textContent='Add to calendar ↓';a.href=base+deadline.calendar_path;a.download=deadline.calendar_path.split('/').pop();
 a.title='Download a calendar reminder. Check the official source before acting.';return a;
}
