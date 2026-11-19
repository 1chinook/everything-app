let nextMinutes = 30;
let reviewCourse = '';
let searchQuery = '';
let installPrompt = null;

function productivityViews() {
  return { tekrar: reviewPage, ara: searchPage, degerlendirme: reflectionPage, uygulama: installPage };
}

function reviewTopics() {
  return enrolledCourseNames().flatMap((course) => topicsForCourse(course).map(topic => {
    const record = state.topicReviews.find(row => row.course === course && row.topic === topic);
    return { course, topic, record, due: record?.due ?? activeDay() };
  }));
}

function nextReview(record, rating, day) {
  const previous = record?.interval ?? 0;
  const interval = rating === 'hard' ? 1 : rating === 'medium' ? Math.max(2, Math.ceil(previous * 1.5)) : Math.max(4, Math.ceil(previous * 2.5));
  return { interval: Math.min(180, interval), due: shiftDay(day, Math.min(180, interval)), last: day };
}

function recommendation(minutes = nextMinutes) {
  const day = activeDay();
  const current = nowMinutes();
  const busy = eventsForDay(day).filter(e => e.kind !== 'lesson' || e.attending).map(e => [clockMinutes(e.time), e.endTime ? clockMinutes(e.endTime) : clockMinutes(e.time) + (e.minutes || 60)]);
  for (const e of state.assessments.filter(e => e.day === day && e.kind !== 'deadline')) busy.push([clockMinutes(e.time), (e.endTime ? clockMinutes(e.endTime) : clockMinutes(e.time) + 90)]);
  const ongoing = busy.find(([start, end]) => start <= current && current < end);
  if (ongoing) return { title: 'Şu an programında bir etkinlik var', reason: `${clockLabel(ongoing[1])} sonrasında yeniden öneri alabilirsin.`, route: 'program' };
  const next = busy.filter(([start]) => start > current).sort((a,b) => a[0]-b[0])[0];
  const available = Math.min(minutes, next ? next[0] - current - (state.planning.breakMinutes || 0) : minutes);
  if (available < 5) return { title: 'Kısa bir mola ver', reason: 'Sıradaki etkinliğine hazırlanmak için zaman bırak.', route: 'program' };
  const dueTask = state.tasks.filter(t => !t.done && t.day <= day).sort((a,b) => a.day.localeCompare(b.day) || (a.dueTime || '24:00').localeCompare(b.dueTime || '24:00'))[0];
  if (dueTask) return { title: dueTask.title, reason: `${available} dakikalık bir adımla başla. ${dueTask.day < day ? 'Bu görev gecikmiş.' : 'Bugünkü görevlerinden biri.'}`, route: 'bugun', taskDay:dueTask.day };
  const exams = upcomingExams();
  const exam = exams.find(e => daysUntil(e.day)<=3 || topicsForCourse(e.course).some(t=>topicMastery(e.course,t)!=='known'));
  const review = reviewTopics().filter(t => t.record && t.due <= day).sort((a,b) => a.due.localeCompare(b.due))[0];
  if (review && (!exam || daysUntil(exam.day)>3)) return { title: review.topic, reason: `${review.course} · Tekrar zamanı geldi. ${Math.min(available,15)} dakika kendini sına.`, route: 'tekrar' };
  if (exam) {
    const topic = orderedTopics(exam.course, topicsForCourse(exam.course))[0];
    return { title: topic || exam.title, reason: `${exam.course} · Sınava ${daysUntil(exam.day)} gün kaldı. ${available} dakika çalış ve birkaç soru çöz.`, route: 'dersler' };
  }
  const course = coursePriorities()[0];
  return { title: course ? `${course.title} çalış` : 'Bir sonraki küçük adımını seç', reason: course ? `${available} dakika ayır. ${course.reason}` : 'Bir görev ekle veya projelerinden bir adım seç.', route: course ? 'calisma' : 'projeler' };
}

function nextActionCard() {
  if (selectedDay !== activeDay()) return '';
  const pick = recommendation();
  return `<section class="panel productivity-panel">${panelHeading('Şimdi ne yapayım?','Programına ve yaklaşan işlerine göre tek adım')}
    <div class="productivity-body"><form id="next-action-form" class="productivity-toolbar">${field('Boş vaktim',`<select name="minutes">${[10,15,25,30,45,60,90].map(n=>`<option value="${n}" ${n===nextMinutes?'selected':''}>${n} dakika</option>`).join('')}</select>`)}<button class="button primary">Öneri al</button></form>
    <h3>${escapeText(pick.title)}</h3><p>${escapeText(pick.reason)}</p><a class="text-link" href="#${pick.route}" ${pick.taskDay ? `data-result-day="${escapeText(pick.taskDay)}"` : ''}>${pick.taskDay ? 'Görevin olduğu günü aç' : 'İlgili alanı aç'} →</a></div></section>`;
}

function reviewPage() {
  const day = activeDay();
  const topics = reviewTopics().filter(t => !reviewCourse || t.course === reviewCourse).sort((a,b) => a.due.localeCompare(b.due) || Number(Boolean(b.record))-Number(Boolean(a.record)));
  const due = topics.filter(t => t.due <= day);
  return `${intro('Aralıklı tekrar','Önce konuyu hatırlamaya çalış; ardından notlarından kontrol edip kendini değerlendir.')}
    <section class="panel page-panel"><div class="productivity-body">${field('Ders',`<select id="review-course"><option value="">Bütün dersler</option>${enrolledCourseNames().map((c)=>`<option ${reviewCourse===c?'selected':''}>${escapeText(c)}</option>`).join('')}</select>`)}
    <p>${due.filter(t=>t.record).length} planlı tekrar, ${due.filter(t=>!t.record).length} yeni konu. İlk değerlendirmeden sonra zor konular 1, orta konular 2, kolay konular en az 4 gün sonra gelir.</p>
    ${due.length ? due.slice(0,10).map(t=>`<article class="review-card"><small>${escapeText(t.course)} · ${t.record ? 'Tekrar: '+escapeText(t.due) : 'İlk değerlendirme'}</small><h3>${escapeText(t.topic)}</h3><details><summary>Hatırlama görevi</summary><p>Tanımı kendi cümlelerinle yaz, bir örnek üret ve bir soruyu notlarına bakmadan çöz. Sonucu ders materyalinle kontrol et.</p></details><div class="productivity-toolbar">${[['hard','Zor'],['medium','Orta'],['easy','Kolay']].map(([r,label])=>`<button class="button secondary" data-review-rating="${r}" data-course="${escapeText(t.course)}" data-topic="${escapeText(t.topic)}">${label}</button>`).join('')}</div></article>`).join('') : empty('Bugünkü tekrarların tamamlandı.')}
    <details><summary>Yaklaşan tekrarlar</summary>${topics.filter(t=>t.record && t.due>day).map(t=>`<p>${escapeText(t.due)} · ${escapeText(t.course)} · ${escapeText(t.topic)}</p>`).join('') || empty('Henüz planlanmış tekrar yok.')}</details></div></section>`;
}

function daysUntil(day) { return Math.max(0, Math.round((dateFor(day)-dateFor(activeDay()))/86400000)); }
function upcomingExams() { return state.assessments.filter(e => e.kind === 'final' && e.grade == null && e.day >= activeDay() && (e.day !== activeDay() || !e.time || clockMinutes(e.time) >= nowMinutes())).sort((a,b)=>a.day.localeCompare(b.day) || a.time.localeCompare(b.time)); }

function searchRecords() {
  const rows = [];
  const add = (type,title,detail,route,target={}) => rows.push({type,title:String(title || ''),detail:String(detail || ''),route,...target});
  enrolledCourseNames().forEach((c)=>add('Ders',c,topicsForCourse(c).join(' '),'dersler'));
  state.tasks.forEach(t=>add('Görev',t.title,`${t.day} ${t.course || ''} ${t.done?'Tamamlandı':''}`,'bugun',{day:t.day}));
  state.documents.forEach(d=>add('Doküman',d.title || d.name,d.course || '','dokumanlar'));
  state.assessments.forEach(e=>add('Sınav / teslim',e.title,`${e.course} ${e.day} ${e.topics.join(' ')}`,['midterm','quiz'].includes(e.kind)?'notlar':'takvim'));
  projectRecords.forEach(p=>add('Proje',p.title,`${p.purpose} ${p.steps.map(s=>s.title).join(' ')}`,'projeler',{project:p.id}));
  for(const book of bookRecords){
    add('Kitap',book.title,[book.author,book.review].filter(Boolean).join(' · '),'kitaplar',{book:book.id});
    for(const note of book.notes ?? [])add('Kitap notu',book.title,note.text,'kitaplar',{book:book.id});
  }
  for(const journal of journalRecords){
    const route=Object.keys(journalSpaceRoutes).find(key=>journalSpaceRoutes[key]===journal.kind);
    if(route)add(journalKinds[journal.kind],journal.title,[journal.notes,journal.place,journal.artist,journal.platform,journal.day].filter(Boolean).join(' · '),route);
  }
  for(const question of curiosityData.questions)add('Merak sorusu',question.title,question.topic,'merak',{tab:'queue'});
  for(const route of curiosityData.routes)add('Okuma rotası',route.title,route.steps.map(step=>[step.title,step.note].filter(Boolean).join(' ')).join(' · '),'merak',{tab:'routes'});
  return rows;
}
function searchResults(query) {
  const terms=query.toLocaleLowerCase('tr-TR').trim().split(/\s+/).filter(Boolean);
  return terms.length ? searchRecords().filter(r=>terms.every(t=>`${r.title} ${r.detail}`.toLocaleLowerCase('tr-TR').includes(t))) : [];
}
function searchPage() {
  const results=searchResults(searchQuery);
  return `${intro('Her yerde ara','Ders, görev, doküman, kitap, proje ve not kayıtlarında ara.')}<section class="panel page-panel"><div class="productivity-body"><form id="global-search-form" class="productivity-toolbar">${field('Arama',`<input name="query" type="search" value="${escapeText(searchQuery)}" required maxlength="150" placeholder="Konu, kitap veya görev adı…">`)}<button class="button primary">Ara</button></form><p role="status">${searchQuery ? `${results.length} sonuç` : 'Aramak istediğin kelimeyi yaz.'}</p>${results.map(r=>`<article class="review-card"><small>${r.type}</small><h3>${escapeText(r.title)}</h3><p>${escapeText(r.detail.slice(0,220))}</p><a class="text-link" href="#${r.route}" ${[['day',r.day],['project',r.project],['book',r.book],['tab',r.tab]].filter(([,v])=>v).map(([key,v])=>`data-result-${key}="${escapeText(v)}"`).join(' ')}>Aç →</a></article>`).join('')}</div></section>`;
}

function reflectionPage() {
  const day=selectedDay;
  const record=state.reflections[day] || {};
  const tasks=state.tasks.filter(t=>t.day===day);
  const done=tasks.filter(t=>t.done);
  return `${intro('Gün sonu','Günü değerlendir ve yarının ilk adımını seç.',true)}<section class="panel page-panel"><div class="productivity-body"><p>${done.length}/${tasks.length} görev tamamlandı.</p>${done.map(t=>`<p>✓ ${escapeText(t.title)}</p>`).join('')}<form id="reflection-form">${field('Bugün ne iyi gitti?',`<textarea name="wins" maxlength="1000" rows="3">${escapeText(record.wins || '')}</textarea>`)}${field('Ne aksadı?',`<textarea name="obstacles" maxlength="1000" rows="3">${escapeText(record.obstacles || '')}</textarea>`)}${field('Yarının ilk adımı',`<input name="next" maxlength="180" value="${escapeText(record.next || '')}">`)}<p>Yarına taşımak istediğin tamamlanmamış görevleri seç:</p>${tasks.filter(t=>!t.done).map(t=>`<label class="daily-control"><input type="checkbox" name="carry" value="${escapeText(t.id)}"><span>${escapeText(t.title)}</span></label>`).join('') || '<p class="row-meta">Taşınacak görev yok.</p>'}<p class="row-meta">Seçilen görevlerin tarihi ${shiftDay(day,1)} olur. İlk adımın aynı güne görev olarak eklenir.</p><button class="button primary">Kaydet ve yarını düzenle</button></form>${record.saved ? '<p role="status">Değerlendirme kaydedildi.</p>' : ''}</div></section>`;
}

function installPage() {
  const secure=window.isSecureContext;
  return `${intro('Telefon ve çevrimdışı kullanım','Uygulamayı ana ekranına ekle; temel kayıtlarına çevrimdışı eriş.')}<section class="panel page-panel"><div class="productivity-body"><p role="status">${navigator.onLine?'Çevrimiçi':'Çevrimdışı'} · ${secure ? 'Güvenli bağlantı' : 'Kurulum ve çevrimdışı destek için HTTPS gerekir.'}</p><button class="button primary" data-productivity="install" ${installPrompt?'':'hidden'}>Uygulamayı yükle</button><p>Android: Tarayıcı menüsü → Uygulamayı yükle / Ana ekrana ekle.</p><p>iPhone: Safari → Paylaş → Ana Ekrana Ekle.</p><p>İlk çevrimiçi açılışta temel ekranlar indirilir. Kayıtlar bu cihazda tutulur; haberler, müzik ve eşitleme internet bağlantısı ister.</p><p class="row-meta">Telefonundan erişim için bilgisayarındaki sunucuya ulaşabileceğin bir adres gerekir. Yerel ağdaki HTTP adresleri kurulum ve çevrimdışı desteği sağlamayabilir; HTTPS üzerinden yayınlama gerekir.</p><p id="offline-status" role="status">${secure && 'serviceWorker' in navigator ? 'Çevrimdışı desteğin durumu kontrol ediliyor…' : 'Bu bağlantıda çevrimdışı destek etkin değil.'}</p></div></section>`;
}

document.addEventListener('submit',event=>{
  const id=event.target.id;
  if(!['next-action-form','global-search-form','reflection-form'].includes(id))return;
  event.preventDefault();
  const data=new FormData(event.target);
  if(id==='next-action-form')nextMinutes=Math.min(90,Math.max(5,Number(data.get('minutes')) || 30));
  if(id==='global-search-form')searchQuery=String(data.get('query')).slice(0,150);
  if(id==='reflection-form'){
    const day=selectedDay, next=String(data.get('next') || '').trim();
    const previous=state.reflections[day];
    state.reflections[day]={wins:String(data.get('wins')),obstacles:String(data.get('obstacles')),next,saved:true};
    const carry=new Set(data.getAll('carry'));
    const tomorrow=shiftDay(day,1);
    for(const task of state.tasks.filter(t=>t.day===day && !t.done && carry.has(t.id))){
      (task.postponements ??=[]).push({changedOn:activeDay(),from:day,to:tomorrow});
      task.day=tomorrow;
      delete task.plannedTime;
      delete task.plannedEnd;
    }
    const id='reflection-'+day;
    const linked=state.tasks.find(task=>task.id===id);
    if(linked && !linked.done && linked.day===tomorrow){
      if(next)linked.title=next;
      else state.tasks.splice(state.tasks.indexOf(linked),1);
    } else if(!linked && next && previous?.next!==next){
      state.tasks.push({id,day:tomorrow,title:next,priority:'Normal',done:false});
    }
    save('Gün sonu kaydedildi; yarının görevleri düzenlendi.');
  }
  render();
});
document.addEventListener('change',event=>{
  if(event.target.id==='review-course'){reviewCourse=event.target.value;render();}
});
document.addEventListener('click',async event=>{
  const result=event.target.closest('[data-result-day],[data-result-project],[data-result-book],[data-result-tab]');
  if(result){
    const {resultDay,resultProject,resultBook,resultTab}=result.dataset;
    if(resultDay)selectedDay=resultDay;
    if(resultProject){projectSelection=resultProject;projectEditing=false;}
    if(resultBook){selectedBookId=resultBook;bookEditing=false;}
    if(resultTab)curiosityTab=resultTab;
    if(location.hash===result.hash || (!location.hash && result.hash==='#bugun'))render();
    return;
  }
  const button=event.target.closest('[data-review-rating], [data-productivity]');
  if(!button)return;
  if(button.dataset.reviewRating){
    const {course,topic,reviewRating}=button.dataset;
    if(!['hard','medium','easy'].includes(reviewRating) || !topicsForCourse(course).includes(topic))return;
    let record=state.topicReviews.find(r=>r.course===course && r.topic===topic);
    if(!record){record={course,topic};state.topicReviews.push(record);}
    Object.assign(record,nextReview(record,reviewRating,activeDay()));
    state.topicMastery[courseKey(course)] ??= {};
    state.topicMastery[courseKey(course)][topic]=({hard:'unknown',medium:'partial',easy:'known'})[reviewRating];
    save('Tekrar kaydedildi.');render();
  }
  if(button.dataset.productivity==='install' && installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;render();}
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(location.hash==='#uygulama')render();});
window.addEventListener('appinstalled',()=>{installPrompt=null;if(location.hash==='#uygulama')render();});
async function updateOfflineStatus() {
  const node=document.querySelector('#offline-status');
  if(!node || !window.isSecureContext || !('serviceWorker' in navigator))return;
  try {const reg=await navigator.serviceWorker.getRegistration();node.textContent=reg?.active?'Temel ekranlar çevrimdışı kullanıma hazır.':'Çevrimdışı ekranlar hazırlanıyor. Biraz sonra tekrar kontrol et.';}catch{node.textContent='Çevrimdışı destek kontrol edilemedi.';}
}
window.addEventListener('load',()=>{
  if('serviceWorker' in navigator && window.isSecureContext)navigator.serviceWorker.register('/sw.js').then(()=>updateOfflineStatus()).catch(()=>{const node=document.querySelector('#offline-status');if(node)node.textContent='Çevrimdışı destek kurulamadı. Sunucuyu yeniden başlatıp sayfayı yenile.';});
});
