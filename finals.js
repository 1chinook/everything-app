function applyFinalSeason(data) { data.assessments ??= []; return data; }

function finalPeriodBanner(showLink = true) {
  const days = state.assessments.filter(entry => entry.kind === 'final').map(entry => entry.day).sort();
  const date = day => dayFormat.format(dateFor(day));
  const range = days.length ? date(days[0]) + (days[0] === days.at(-1) ? '' : ' – ' + date(days.at(-1))) : '';
  return `<section class="final-period"><strong>Final dönemi</strong><span>${range ? 'Kayıtlı finaller · ' + range : 'Final kaydı yok.'}</span>${showLink ? '<a class="text-link" href="#takvim">Sınav takvimini aç →</a>' : ''}</section>`;
}
function activeAssessment(entry) {
  return !['midterm','quiz'].includes(entry.kind);
}

function assessmentTopics(entry) {
  return entry.kind === 'final' ? topicsForCourse(entry.course) : entry.topics;
}

function courseNavigation(prefix = 'course') {
  return `<nav class="course-jump-nav" aria-label="Derslere hızlı geçiş"><label class="field"><span>Derse git</span><select data-course-jump="${prefix}"><option value="">Ders seç…</option>${enrolledCourseNames().map((title,index)=>`<option value="${index}">${escapeText(title)}</option>`).join('')}</select></label><button type="button" class="button secondary" data-course-collapse>Hepsini kapat</button></nav>`;
}

function courseTopicList(title) {
  const topics = topicsForCourse(title);
  return topics.length ? `<ol class="unified-topic-list">${topics.map(topic=>`<li><label class="field"><span>${escapeText(topic)}</span><select data-topic-mastery="${escapeText(topic)}" data-course="${escapeText(title)}" aria-label="${escapeText(topic)} konu hâkimiyeti">${[['unknown','Bilmiyorum'],['partial','Kısmen biliyorum'],['known','Çözebiliyorum']].map(([value,label])=>`<option value="${value}" ${topicMastery(title,topic)===value?'selected':''}>${label}</option>`).join('')}</select></label></li>`).join('')}</ol>` : empty('Henüz konu yok.');
}

function updateCourseNavigationOffset() {
  const header = document.querySelector('.sidebar');
  if (header) document.documentElement.style.setProperty('--app-nav-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
}
window.addEventListener('load', () => {
  const header = document.querySelector('.sidebar');
  if (header && typeof ResizeObserver !== 'undefined') new ResizeObserver(updateCourseNavigationOffset).observe(header);
  updateCourseNavigationOffset();
});

function openCourseSection(prefix, index) {
  const target=document.getElementById(`${prefix}-${index}`);
  if(!target)return;
  updateCourseNavigationOffset();
  document.querySelectorAll(`details[name="${prefix}-topics"]`).forEach(d=>{d.open=d===target;});
  target.open=true;
  target.scrollIntoView({block:'start',behavior:'smooth'});
  target.querySelector('summary')?.focus({preventScroll:true});
}

document.addEventListener('change',event=>{
  if(event.target.matches('[data-course-jump]') && event.target.value!=='')openCourseSection(event.target.dataset.courseJump,event.target.value);
  if(event.target.dataset.topicMastery){
    const card=event.target.closest('details[data-course-card]');
    if(card){
      const topics=topicsForCourse(card.dataset.courseCard);
      const count=topics.filter(t=>topicMastery(card.dataset.courseCard,t)==='known').length;
      const badge=card.querySelector('[data-topic-progress]');
      if(badge)badge.textContent=`${count}/${topics.length} konu hazır`;
    }
  }
});
document.addEventListener('click',event=>{
  const close=event.target.closest('[data-course-collapse]');
  if(close){document.querySelectorAll('details[data-course-card]').forEach(d=>{d.open=false;});document.querySelector('.course-jump-nav')?.scrollIntoView({block:'start',behavior:'smooth'});}
  const jump=event.target.closest('[data-open-course]');
  if(jump){event.preventDefault();openCourseSection(jump.dataset.prefix || 'course',jump.dataset.openCourse);}
});
