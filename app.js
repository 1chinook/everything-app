const icons = {
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  chart: '<path d="M3 3v17h18M7 15v-3m5 3V8m5 7V5"/>',
  file: '<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7M8 14h8m-8 3h6"/>',
  moon: '<path d="M20.9 13.3A9 9 0 0 1 10.7 3.1 9 9 0 1 0 20.9 13.3Z"/>',
  dumbbell: '<path d="M7 12h10m-14 0h1m16 0h1"/><rect x="4" y="7" width="3" height="10" rx="1"/><rect x="17" y="7" width="3" height="10" rx="1"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6m3 4 2-2"/>',
  sync: '<path d="M20 9a8 8 0 0 0-14-3L3 9m0-5v5h5m-4 6a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  sparkle: '<path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10C16 12 12 8 12 2Z"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 6-6"/>',
  book: '<path d="M12 6c-3-3-6-3-10-2v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-1-10 2Zm0 0v15"/>',
  pencil: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
};

const pages = {
  bugun: 'Bugün',
  dersler: 'Derslerim',
  program: 'Ders programı',
  takvim: 'Sınav ve teslimler',
  notlar: 'Notlar',
  calisma: 'Çalışma programı',
  dokumanlar: 'Dokümanlar',
  uyku: 'Uyku',
  spor: 'Spor',
  odak: 'Odak',
  hafta: 'Haftalık özet',
  esitle: 'Eşitleme',
  kesfet: 'Keşfet',
};

const dayFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', weekday: 'long' });
const weekdayFormat = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'short' });
const keyFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric' });
const today = keyFormat.format(new Date());
let selectedDay = today;
let editorType;
let editedRecord;

const examples = {
  events: [
    { id: 'e1', day: today, time: '09:00', title: 'Lineer Cebir', detail: 'Ders • A-204', kind: 'lesson', attending: true },
    { id: 'e2', day: today, time: '11:00', title: 'Veri Yapıları', detail: 'Ders • Bilgisayar laboratuvarı', kind: 'lesson', attending: true },
    { id: 'e3', day: today, time: '15:30', title: 'Lineer Cebir tekrar oturumu', detail: 'Bireysel çalışma • 45 dk', kind: 'study', attending: true },
  ],
  tasks: [
    { id: 't1', day: today, title: 'Lineer Cebir soru seti', priority: 'Öncelikli', done: false },
    { id: 't2', day: today, title: 'Veri Yapıları ödevini gözden geçir', priority: 'Normal', done: false },
    { id: 't3', day: today, title: 'Analiz ders notlarını toparla', priority: 'Normal', done: true },
  ],
  grades: [{ id: 'g1', title: 'Lineer Cebir', value: 58 }, { id: 'g2', title: 'Veri Yapıları', value: 76 }, { id: 'g3', title: 'Analiz', value: 84 }],
  documents: [],
  sleep: { bedtime: '23:30', duration: 8 },
};

const storageKey = 'everything-app-preview-v1';
const state = readState();
state.assessments ??= [];
state.targets ??= {};
state.focusLogs ??= [];
state.courseTopics ??= {};
const content = document.querySelector('#content');
const dialog = document.querySelector('#editor');
const form = document.querySelector('#editor-form');
const status = document.querySelector('#status');

function readState() {
  try {
    return withoutDemoRecords(JSON.parse(localStorage.getItem(storageKey)) ?? examples);
  } catch {
    return withoutDemoRecords(examples);
  }
}

function withoutDemoRecords(data) {
  const realRecords = (key) => data[key].filter(record => !examples[key].some(sample =>
    Object.keys(record).length === Object.keys(sample).length &&
    Object.entries(sample).every(([field, value]) => field === 'day' || record[field] === value)));
  return { ...data, events: realRecords('events'), tasks: realRecords('tasks'), grades: realRecords('grades') };
}

function save(message, synchronize = true) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    status.textContent = message;
  } catch {
    status.textContent = 'Değişiklik bu oturumda geçerli. Tarayıcı kaydı yapılamadı.';
  }
  if (synchronize) noteSyncChange();
}

function icon(name, extra = '') {
  return `<span data-icon="${name}" class="${extra}" aria-hidden="true"></span>`;
}

function fillIcons() {
  document.querySelectorAll('[data-icon]:empty').forEach(node => {
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[node.dataset.icon]}</svg>`;
  });
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  ));
}

function dateFor(day) {
  return new Date(`${day}T12:00:00Z`);
}

function shiftDay(day, amount) {
  const date = dateFor(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return keyFormat.format(date);
}

function weekday(day) {
  return dateFor(day).getUTCDay();
}

function panelHeading(title, subtitle = '', action = '') {
  return `<div class="panel-heading"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>`;
}

function metric(name, label, value, color = '') {
  return `<div class="metric">${icon(name, `tile-icon ${color}`)}<div><small>${label}</small><strong>${value}</strong></div></div>`;
}

function button(action, label, name = 'plus') {
  return `<button type="button" class="button secondary" data-action="${action}">${icon(name)}${label}</button>`;
}

function empty(message) {
  return `<p class="empty">${message}</p>`;
}

function occursOn(event, day) {
  if (event.repeat !== 'weekly') return event.day === day;
  return day >= event.day && weekday(day) === weekday(event.day);
}

function eventsForDay(day = selectedDay) {
  return state.events
    .filter(event => occursOn(event, day))
    .map(event => ({ ...event, attending: event.attendance?.[day] ?? event.attending, done: event.completion?.[day] ?? false }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function weekStrip() {
  const monday = shiftDay(selectedDay, -((weekday(selectedDay) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => shiftDay(monday, index));
  return `<div class="week-strip" role="group" aria-label="Haftanın günleri">
    ${days.map(day => `<button type="button" data-action="pick-day" data-day="${day}"
      aria-label="${dayFormat.format(dateFor(day))}" aria-pressed="${day === selectedDay}">
      <span>${weekdayFormat.format(dateFor(day))}</span><strong>${dateFor(day).getUTCDate()}</strong>
    </button>`).join('')}
  </div>`;
}

function editButton(type, record) {
  return `<button type="button" class="icon-button row-edit" data-action="edit-${type}"
    data-id="${escapeText(record.id)}" aria-label="${escapeText(record.title)} kaydını düzenle">${icon('pencil')}</button>`;
}

function eventTime(event) {
  return event.endTime ? `${event.time}–${event.endTime}` : event.time;
}

function attendancePill(event) {
  if (event.kind === 'workout') {
    return event.done ? '<span class="pill mint">Tamamlandı</span>' : '<span class="pill sport">Antrenman</span>';
  }
  const label = event.kind === 'study' ? 'Çalışma' : event.attending ? 'Katılacağım' : 'Katılmayacağım';
  return `<span class="pill ${event.attending ? 'mint' : ''}">${label}</span>`;
}

function dayControls() {
  return `<div class="day-controls">
    <button class="icon-button" type="button" data-action="prev-day" aria-label="Önceki gün">${icon('chevron-left')}</button>
    <button class="button secondary" type="button" data-action="today">Bugün</button>
    <button class="icon-button" type="button" data-action="next-day" aria-label="Sonraki gün">${icon('chevron-right')}</button>
  </div>`;
}

function intro(title, description, date = false) {
  return `<div class="intro"><div>
    ${date ? `<p class="date">${icon('calendar')}<time datetime="${selectedDay}">${dayFormat.format(dateFor(selectedDay))}</time></p>` : ''}
    <h1>${title}</h1><p>${description}</p>
  </div>${date ? dayControls() : ''}</div>`;
}

function schedule(events) {
  if (!events.length) return empty('Bu gün için planlanmış etkinlik yok.');
  return `<ul class="schedule">${events.map(event => `
    <li class="schedule-row">
      <time datetime="${event.time}">${event.time}</time>
      <span class="schedule-mark ${({ study: 'blue', workout: 'mint' })[event.kind] ?? ''}"></span>
      <div><div class="row-title">${escapeText(event.title)}</div><small class="row-meta">${escapeText(event.detail)}${event.endTime ? ` · ${event.endTime}’e kadar` : ''}</small>
      ${event.focusPlan ? `<small class="row-meta">${studyGuide(event)}</small>` : ''}</div>
      ${isPlannedStudy(event) ? studyControls(event) : attendancePill(event)}
    </li>`).join('')}</ul>`;
}

function tasksList(tasks) {
  if (!tasks.length) return empty('Bu gün için görev yok.');
  return `<ul class="task-list">${tasks.map(task => `
    <li class="task-row">
      <label><input type="checkbox" data-task="${task.id}" ${task.done ? 'checked' : ''}><span>
        <span class="row-title">${escapeText(task.title)}</span>
        ${task.course || task.dueTime ? `<small class="row-meta">${[task.course, task.dueTime].filter(Boolean).map(escapeText).join(' · ')}</small>` : ''}
      </span></label>
      ${task.priority === 'Öncelikli' ? '<span class="pill urgent">Öncelikli</span>' : ''}
      ${editButton('task', task)}
    </li>`).join('')}</ul>`;
}

function sleepTimes() {
  const [hours, minutes] = state.sleep.bedtime.split(':').map(Number);
  const wakeMinutes = (hours * 60 + minutes + Math.round(state.sleep.duration * 60)) % 1440;
  const wake = [Math.floor(wakeMinutes / 60), wakeMinutes % 60].map(value => String(value).padStart(2, '0')).join(':');
  return { bedtime: state.sleep.bedtime, wake, duration: state.sleep.duration };
}

function dashboard() {
  const events = eventsForDay();
  const tasks = state.tasks.filter(task => task.day === selectedDay)
    .sort((a, b) => (a.dueTime || '24:00').localeCompare(b.dueTime || '24:00'));
  const attending = events.filter(event => event.kind === 'lesson' && event.attending);
  const doneCount = tasks.filter(task => task.done).length;
  const focus = coursePriorities().find(course => course.observed !== null && course.level > 0);
  const sleep = sleepTimes();
  return `${intro(selectedDay === today ? 'Merhaba, Yusuf.' : 'Günün planı', 'Derslerin, görevlerin ve uyku planın bir arada.', true)}
    <section class="hero" aria-labelledby="focus-title">
      <div class="hero-copy">
        <div class="hero-label">${icon('sparkle')}ÇALIŞMA ÖNCELİĞİ</div>
        <h2 id="focus-title">${focus ? escapeText(focus.title) : 'Haftalık çalışma planın'}</h2>
        <p>${focus ? escapeText(focus.reason) : 'Notlarını ve yaklaşan sınavlarını kullanarak derslerine süre ayır.'}</p>
        ${passingLine(focus?.passing)}
        <a href="#calisma" class="button secondary">Çalışma programına git ${icon('arrow')}</a>
      </div>
      <div class="orbit" aria-hidden="true"><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="orbit-core">${icon('sparkle')}</div><i class="orbit-dot"></i><i class="orbit-dot"></i></div>
    </section>
    <div class="metrics">
      ${metric('book', 'Katılacağın ders', `${attending.length} ders`)}
      ${metric('check', 'Tamamlanan görev', `${doneCount} / ${tasks.length}`, 'mint')}
      ${metric('moon', 'Uyku planın', `${sleep.bedtime} – ${sleep.wake}`, 'blue')}
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        ${panelHeading('Günlük program', '', `<a href="#program" class="text-link">Programa git ${icon('arrow')}</a>`)}
        ${schedule(events)}
      </section>
      <section class="panel" id="tasks-panel">
        ${panelHeading('Görevler', '', '<button type="button" class="icon-button" data-action="add-task" aria-label="Görev ekle">' + icon('plus') + '</button>')}
        ${tasksList(tasks)}
      </section>
    </div>
    ${dashboardPlanning()}`;
}

function program() {
  const events = eventsForDay().filter(event => event.kind !== 'workout');
  return `${intro('Ders programı', 'Günün derslerini ve katılım durumunu düzenle.', true)}
    <section class="panel page-panel">${panelHeading('Dersler ve çalışma oturumları', 'Kutuyu işaretleyerek o gün için katılımını belirle.', button('add-event', 'Ders ekle'))}
      ${weekStrip()}
      ${events.length ? `<ul class="record-list">${events.map(event => `
        <li class="record-row"><label>
          ${event.kind === 'lesson' ? `<input type="checkbox" data-event="${event.id}" ${event.attending ? 'checked' : ''} aria-label="${escapeText(event.title)} dersine katılacağım">` : ''}
          <span><span class="row-title">${escapeText(event.title)}</span><small class="row-meta">${eventTime(event)} · ${escapeText(event.detail)}${event.repeat === 'weekly' ? ' · Her hafta' : ''}</small></span>
        </label>
        ${attendancePill(event)}
        ${event.kind === 'lesson' ? editButton('event', event) : ''}
        </li>`).join('')}</ul>` : empty('Bu gün için ders eklenmedi.')}
    </section>`;
}

function sports() {
  const workouts = eventsForDay().filter(event => event.kind === 'workout');
  return `${intro('Spor', 'Antrenmanlarını planla ve tamamladıklarını işaretle.', true)}
    <section class="panel page-panel">
      ${panelHeading('Antrenmanlar', '', button('add-workout', 'Antrenman ekle'))}
      ${weekStrip()}
      ${workouts.length ? `<ul class="record-list">${workouts.map(workout => `
        <li class="record-row"><label>
          <input type="checkbox" data-workout="${workout.id}" ${workout.done ? 'checked' : ''} aria-label="${escapeText(workout.title)} antrenmanını tamamladım">
          <span><span class="row-title">${escapeText(workout.title)}</span><small class="row-meta">${eventTime(workout)} · ${escapeText(workout.detail)}${workout.repeat === 'weekly' ? ' · Her hafta' : ''}</small></span>
        </label>${attendancePill(workout)}${editButton('workout', workout)}</li>`).join('')}</ul>` : empty('Bu gün için planlanmış antrenman yok.')}
    </section>
    ${fitnessPlan()}`;
}

function grades() {
  const entries = orderedAssessments();
  const titles = new Map(courseCatalog.map(([name]) => [courseKey(name), name]));
  entries.forEach(entry => { if (!titles.has(courseKey(entry.course))) titles.set(courseKey(entry.course), entry.course); });
  const progress = new Map(weightedCourses().map(course => [course.key, course]));
  const priorities = new Map(coursePriorities().map(course => [course.key, course]));
  return `${intro('Notlar', 'Vize %37,5 · Kısa sınav %12,5 · Final / bütünleme %50')}
    <div class="course-grid">${[...titles].map(([key, name]) => {
      const records = entries.filter(entry => courseKey(entry.course) === key);
      const result = progress.get(key);
      const finished = result && result.gradedWeight >= 99.99999;
      const priority = priorities.get(key);
      const summary = finished ? `Tahmini harf: ${courseResult(result.earned).letter}` : priority?.level ? priority.badge : records.length ? `${records.length} kayıt` : 'Henüz not girilmedi';
      return `<details class="panel course-card" ${activeGradeCourse === key ? 'open' : ''}>
        <summary>${icon('chart', 'tile-icon')}<span><strong>${escapeText(name)}</strong><small>${summary}</small>${passingLine(priority?.passing)}</span>${icon('chevron-right')}</summary>
        <div class="course-card-body">
          ${priority?.observed !== null && priority?.level ? `<p class="form-feedback">${escapeText(priority.reason)}</p>` : ''}
          ${records.length ? assessmentRows(records, true) : ''}
          ${plannerButton('add-course-grade', 'Not gir', name, 'plus')}
        </div>
      </details>`;
    }).join('')}</div>
    <p class="row-meta planning-panel">Harf tahmini NEÜ lisans yönetmeliğindeki standart puan aralıklarına göre hesaplanır. Öğretim elemanı AA–CB sınırlarını aşağı çekebilir. Resmî not için OBS’yi esas al.</p>
    ${weightedGrades()}
    ${state.grades.length ? `<section class="panel page-panel planning-panel">${panelHeading('Önceki genel notlar')}
      <ul class="record-list">${state.grades.map(grade => `<li class="record-row">${icon('chart', 'tile-icon')}<div class="row-title">${escapeText(grade.title)}</div>
      <strong class="pill">${grade.value}/100</strong></li>`).join('')}</ul></section>` : ''}`;
}

function documents() {
  return `${intro('Dokümanlar', 'Ders materyallerinin adlarını bir araya getir.')}
    <section class="panel page-panel">${panelHeading('Materyaller', 'Bu önizlemede yalnızca dosya adı kaydedilir.', button('add-document', 'Dosya seç'))}
      ${state.documents.length ? `<ul class="record-list">${state.documents.map(document => `
        <li class="record-row">${icon('file', 'tile-icon')}<div class="row-title">${escapeText(document.name)}</div></li>`).join('')}</ul>` : empty('Henüz dosya seçmedin.')}
    </section>`;
}

function sleepPage() {
  const sleep = sleepTimes();
  return `${intro('Uyku', 'Yatma saatini ve uyku hedefini belirle.')}
    <section class="panel page-panel">${panelHeading('Uyku planın', '', button('edit-sleep', 'Planı düzenle', 'moon'))}
      <div class="sleep-summary">${metric('moon', 'Yatma', sleep.bedtime)}${metric('sparkle', 'Uyanma', sleep.wake, 'mint')}${metric('check', 'Hedef', `${sleep.duration} saat`, 'blue')}</div>
      <p class="sleep-note">Uyanma saati, yatma saatine girdiğin süre eklenerek hesaplanır.</p>
    </section>`;
}

function render() {
  const views = { bugun: dashboard, dersler: coursesPage, program, takvim: assessmentsPage, notlar: grades, calisma: studyProgramPage, dokumanlar: documents, uyku: sleepPage, spor: sports, odak: focusPage, hafta: weeklyPage, kesfet: discoverPage, esitle: syncPage };
  const requested = location.hash.slice(1);
  const page = Object.hasOwn(views, requested) ? requested : 'bugun';
  const label = pages[page];
  document.title = `${label} · Everything App`;
  document.querySelector('#current-page').textContent = label;
  document.querySelectorAll('[data-page]').forEach(link => {
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  content.innerHTML = views[page]();
  fillIcons();
  if (page === 'kesfet') void refreshDiscoverNews();
}

function field(label, input) {
  return `<label class="field"><span>${label}</span>${input}</label>`;
}

function titleField(label, record) {
  return field(label, `<input name="title" value="${escapeText(record?.title ?? '')}" maxlength="100" required autofocus>`);
}

function dateField(label, record) {
  return field(label, `<input name="day" type="date" value="${record?.day ?? selectedDay}" required>`);
}

function taskFields(task) {
  return titleField('Görev adı', task) + dateField('Görev tarihi', task) +
    courseField('Ders (isteğe bağlı)', task?.course) +
    inputField('Teslim saati (isteğe bağlı)', 'dueTime', task?.dueTime, 'type="time"') +
    field('Öncelik', `<select name="priority"><option>Normal</option><option ${task?.priority === 'Öncelikli' ? 'selected' : ''}>Öncelikli</option></select>`);
}

const workoutSuggestionHint = 'Seçilen güne göre. Bitiş saati girilmeyen etkinlikler için 60 dakika ayrılır.';

function activityFields(record, workout = false) {
  const place = record?.place ?? record?.detail?.split(' • ')[1] ?? '';
  const time = field('Başlangıç', `<input name="time" type="time" value="${record?.time ?? ''}" required>`);
  const duration = workout
    ? field('Süre (dk)', `<input name="minutes" type="number" min="5" max="720" value="${record?.minutes ?? 45}" required>`)
    : field('Bitiş (isteğe bağlı)', `<input name="endTime" type="time" value="${record?.endTime ?? ''}">`);
  const title = workout ? titleField('Antrenman adı', record) : courseField('Ders adı', record?.title, true, 'title');
  return title + dateField(workout ? 'İlk antrenman tarihi' : 'İlk ders tarihi', record) +
    field('Tekrar', `<select name="repeat"><option value="once">Tek sefer</option><option value="weekly" ${record?.repeat === 'weekly' ? 'selected' : ''}>Her hafta aynı gün</option></select>`) +
    `<div class="time-fields">${time}${duration}</div>` +
    (workout ? `<details class="preference">
      <summary>Tercih edilen saat aralığı</summary>
      <div class="time-fields">
        ${field('En erken', `<input name="earliest" type="time" value="${record?.earliest ?? ''}">`)}
        ${field('En geç bitiş', `<input name="latest" type="time" value="${record?.latest ?? ''}">`)}
      </div>
    </details><div class="suggestion">
      ${button('suggest-workout', 'Saat öner', 'sparkle')}
      <small class="row-meta" id="workout-suggestion" role="status">${workoutSuggestionHint}</small>
    </div>` : '') +
    field('Yer', `<input name="place" value="${escapeText(place)}" maxlength="80">`);
}

function clockMinutes(time) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function clockLabel(minutes) {
  return [Math.floor(minutes / 60), minutes % 60].map(part => String(part).padStart(2, '0')).join(':');
}

function suggestWorkout() {
  const day = form.elements.namedItem('day');
  const duration = form.elements.namedItem('minutes');
  if (!day.reportValidity() || !duration.reportValidity()) return;

  const sleep = sleepTimes();
  const wake = clockMinutes(sleep.wake);
  const bed = clockMinutes(sleep.bedtime);
  const windows = wake < bed ? [[wake, bed]] : [[0, bed], [wake, 1439]];
  const earliest = form.elements.namedItem('earliest').value;
  const latest = form.elements.namedItem('latest').value;
  const preferenceStart = earliest ? clockMinutes(earliest) : 0;
  const preferenceEnd = latest ? clockMinutes(latest) : 1439;
  const message = document.querySelector('#workout-suggestion');
  if (preferenceStart >= preferenceEnd) {
    message.textContent = 'En geç bitiş saati, en erken başlangıçtan sonra olmalı.';
    return;
  }
  const busy = eventsForDay(day.value)
    .filter(event => event.id !== editedRecord?.id && (event.kind !== 'lesson' || event.attending))
    .map(event => {
      const start = clockMinutes(event.time);
      return [start, event.endTime ? clockMinutes(event.endTime) : start + 60];
    });
  const minutes = duration.valueAsNumber;
  if (sleep.duration < 24) {
    for (const [start, end] of windows) {
      const first = Math.ceil(Math.max(start, preferenceStart) / 15) * 15;
      for (let candidate = first; candidate + minutes <= Math.min(end, preferenceEnd); candidate += 15) {
        if (busy.some(([from, to]) => candidate < to && candidate + minutes > from)) continue;
        const time = form.elements.namedItem('time');
        time.setCustomValidity('');
        time.value = clockLabel(candidate);
        message.textContent = `Önerilen saat ${time.value}–${clockLabel(candidate + minutes)}.`;
        return;
      }
    }
  }
  message.textContent = 'Bu gün için uygun saat bulunamadı. Tarihi ya da süreyi değiştirebilirsin.';
}

function openEditor(type, recordId) {
  const records = type === 'edit-task' ? state.tasks : state.events;
  editedRecord = recordId ? records.find(record => record.id === recordId) : undefined;
  const editors = {
    'add-task': ['Görev ekle', taskFields()],
    'edit-task': ['Görevi düzenle', taskFields(editedRecord)],
    'add-event': ['Ders ekle', activityFields()],
    'edit-event': ['Dersi düzenle', activityFields(editedRecord)],
    'add-workout': ['Antrenman ekle', activityFields(undefined, true)],
    'edit-workout': ['Antrenmanı düzenle', activityFields(editedRecord, true)],
    'add-document': ['Materyal seç', field('Dosya', '<input name="file" type="file" required autofocus>')],
    'edit-sleep': ['Uyku planını düzenle', field('Yatma saati', `<input name="bedtime" type="time" value="${state.sleep.bedtime}" required autofocus>`) + field('Uyku hedefi (saat)', `<input name="duration" type="number" value="${state.sleep.duration}" min="0.5" max="24" step="0.5" required>`)],
  };
  editorType = type;
  const [title, fields] = editors[type];
  document.querySelector('#editor-title').textContent = title;
  document.querySelector('#editor-fields').innerHTML = fields;
  const deleteButton = dialog.querySelector('[data-action="delete-record"]');
  deleteButton.hidden = !editedRecord;
  deleteButton.textContent = editedRecord?.repeat === 'weekly' ? 'Seriyi sil' : 'Sil';
  dialog.showModal();
}

function deleteRecord() {
  if (!editedRecord) return;
  const task = editorType === 'edit-task';
  const workout = editorType === 'edit-workout';
  const name = workout ? 'Antrenman' : 'Ders';
  const label = task ? 'Görev' : editedRecord.repeat === 'weekly' ? `Haftalık ${name.toLocaleLowerCase('tr')} serisi` : name;
  if (!window.confirm(`${label} silinsin mi?`)) return;
  const records = task ? state.tasks : state.events;
  records.splice(records.indexOf(editedRecord), 1);
  dialog.close();
  save(`${label} silindi.`);
  render();
  const addAction = task ? 'add-task' : workout ? 'add-workout' : 'add-event';
  document.querySelector(`[data-action="${addAction}"]`)?.focus();
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action } = button.dataset;
  if (action === 'close-dialog') {
    dialog.close();
  } else if (action === 'delete-record') {
    deleteRecord();
  } else if (action === 'suggest-workout') {
    suggestWorkout();
  } else if (action === 'pick-day') {
    selectedDay = button.dataset.day;
    render();
    document.querySelector('[data-action="pick-day"][aria-pressed="true"]')?.focus();
  } else if (action === 'prev-day' || action === 'next-day' || action === 'today') {
    if (action === 'today') selectedDay = today;
    else selectedDay = shiftDay(selectedDay, action === 'prev-day' ? -1 : 1);
    render();
    document.querySelector(`[data-action="${action}"]`)?.focus();
  } else {
    openEditor(action, button.dataset.id);
  }
});

document.addEventListener('change', event => {
  const { task, event: lesson, workout } = event.target.dataset;
  if (!task && !lesson && !workout) return;
  if (task) state.tasks.find(entry => entry.id === task).done = event.target.checked;
  else if (workout) {
    const entry = state.events.find(record => record.id === workout);
    entry.completion ??= {};
    if (event.target.checked) entry.completion[selectedDay] = true;
    else delete entry.completion[selectedDay];
  }
  else {
    const entry = state.events.find(record => record.id === lesson);
    if (entry.repeat === 'weekly') {
      entry.attendance ??= {};
      entry.attendance[selectedDay] = event.target.checked;
    } else {
      entry.attending = event.target.checked;
    }
  }
  save('Değişiklik kaydedildi.');
  render();
  const attribute = task ? 'task' : workout ? 'workout' : 'event';
  document.querySelector(`[data-${attribute}="${task ?? workout ?? lesson}"]`)?.focus();
});

form.addEventListener('input', () => {
  form.elements.namedItem('endTime')?.setCustomValidity('');
  form.elements.namedItem('time')?.setCustomValidity('');
  const message = document.querySelector('#workout-suggestion');
  if (message) message.textContent = workoutSuggestionHint;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const title = data.get('title')?.trim();
  if (data.has('title') && !title) {
    const input = form.elements.namedItem('title');
    input.value = '';
    input.reportValidity();
    return;
  }
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now());
  const recordDay = data.get('day');
  switch (editorType) {
    case 'add-task':
    case 'edit-task': {
      const values = { title, day: recordDay, priority: data.get('priority'), course: canonicalCourse(data.get('course')), dueTime: data.get('dueTime') };
      if (editedRecord) {
        if (recordDay > editedRecord.day) {
          editedRecord.postponements ??= [];
          editedRecord.postponements.push({ changedOn: activeDay(), from: editedRecord.day, to: recordDay });
        }
        Object.assign(editedRecord, values);
      }
      else state.tasks.push({ id, ...values, done: false });
      selectedDay = recordDay;
      if (location.hash && location.hash !== '#bugun') location.hash = 'bugun';
      break;
    }
    case 'add-event':
    case 'edit-event':
    case 'add-workout':
    case 'edit-workout': {
      const time = data.get('time');
      const workout = data.has('minutes');
      const minutes = workout ? Number(data.get('minutes')) : undefined;
      const workoutEnd = workout ? clockMinutes(time) + minutes : 0;
      if (workoutEnd >= 1440) {
        const input = form.elements.namedItem('time');
        input.setCustomValidity('Antrenman aynı gün içinde bitmeli.');
        input.reportValidity();
        return;
      }
      const endTime = workout ? clockLabel(workoutEnd) : data.get('endTime');
      if (!workout && endTime && endTime <= time) {
        const input = form.elements.namedItem('endTime');
        input.setCustomValidity('Bitiş saati başlangıçtan sonra olmalı.');
        input.reportValidity();
        return;
      }
      const place = data.get('place').trim();
      const repeat = data.get('repeat');
      const category = workout ? `${minutes} dk` : 'Ders';
      const values = { day: recordDay, time, endTime, title: workout ? title : canonicalCourse(title), place, repeat, minutes, detail: place ? `${category} • ${place}` : category };
      if (workout) {
        values.earliest = data.get('earliest');
        values.latest = data.get('latest');
      }
      if (workout && editedRecord) {
        Object.assign(editedRecord, values);
        for (const day of Object.keys(editedRecord.completion ?? {})) {
          if (!occursOn(editedRecord, day)) delete editedRecord.completion[day];
        }
      } else if (editedRecord) {
        const wasWeekly = editedRecord.repeat === 'weekly';
        const attending = editedRecord.attendance?.[recordDay] ?? editedRecord.attending;
        Object.assign(editedRecord, values);
        if (repeat === 'weekly' && !wasWeekly) {
          editedRecord.attendance = { [recordDay]: attending };
          editedRecord.attending = true;
        } else if (repeat === 'weekly' && editedRecord.attendance) {
          for (const day of Object.keys(editedRecord.attendance)) {
            if (!occursOn(editedRecord, day)) delete editedRecord.attendance[day];
          }
        } else if (repeat !== 'weekly') {
          delete editedRecord.attendance;
          editedRecord.attending = attending;
        }
      } else {
        state.events.push({ id, ...values, kind: workout ? 'workout' : 'lesson', attending: !workout });
      }
      if (!editedRecord || !occursOn(editedRecord, selectedDay)) selectedDay = recordDay;
      break;
    }
    case 'add-document':
      state.documents.push({ id, name: data.get('file').name });
      break;
    case 'edit-sleep':
      state.sleep = { bedtime: data.get('bedtime'), duration: Number(data.get('duration')) };
      break;
  }
  dialog.close();
  save('Değişiklik kaydedildi.');
  render();
});

window.addEventListener('hashchange', render);
render();
