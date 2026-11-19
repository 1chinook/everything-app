const plannerDialog = document.querySelector('#planner-editor');
const plannerForm = document.querySelector('#planner-form');
const plannerFeedback = document.querySelector('#planner-feedback');
const plannerSubmit = document.querySelector('#planner-submit');
const plannerClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
let plannerMode;
let plannerRecord;
let proposal;
let activeGradeCourse;

function activeDay() {
  return keyFormat.format(new Date());
}

function nowMinutes() {
  return clockMinutes(plannerClock.format(new Date()));
}

function newId() {
  return crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('');
}

function plannerButton(action, label, id = '', iconName = '', primary = false) {
  return `<button type="button" class="button ${primary ? 'primary' : 'secondary'}" data-planner="${action}" data-id="${escapeText(id)}">${iconName ? icon(iconName) : ''}${label}</button>`;
}

function inputField(label, name, value, attributes = '') {
  return field(label, `<input name="${name}" value="${escapeText(value ?? '')}" ${attributes}>`);
}

function plannerModal(mode, title, fields, submit = 'Kaydet', record = null) {
  plannerMode = mode;
  plannerRecord = record;
  plannerFeedback.textContent = '';
  plannerSubmit.textContent = submit;
  document.querySelector('#planner-title').textContent = title;
  document.querySelector('#planner-fields').innerHTML = fields;
  plannerForm.querySelector('[data-planner="remove-assessment"]').hidden = mode !== 'assessment' || !record;
  fillIcons();
  if (!plannerDialog.open) plannerDialog.showModal();
  plannerForm.querySelector('input, select, textarea')?.focus();
}

const gradeTypes = {
  midterm: { label: 'Vize', weight: 30 },
  quiz: { label: 'Kısa sınav', weight: 20 },
  final: { label: 'Final / bütünleme', weight: 50 },
};

const neuLetterScale = [[90, 'AA'], [85, 'BA'], [75, 'BB'], [70, 'CB'], [60, 'CC'], [55, 'DC'], [50, 'DD'], [40, 'FD'], [0, 'FF']];
const passingScore = 60;

function courseResult(score) {
  const displayedScore = Math.round((score + 1e-9) * 100) / 100;
  return { score: displayedScore, letter: neuLetterScale.find(([minimum]) => displayedScore >= minimum)?.[1] };
}

function gradeType(kind) {
  return Object.hasOwn(gradeTypes, kind) ? gradeTypes[kind] : undefined;
}

function assessmentType(entry) {
  if (entry.kind === 'task') return 'Görev teslimi';
  return gradeType(entry.kind)?.label ?? (entry.kind === 'exam' ? 'Sınav' : 'Teslim');
}

function dueDescription(entry) {
  const days = Math.round((dateFor(entry.day) - dateFor(activeDay())) / 86400000);
  if (days === 0 && clockMinutes(entry.time) <= nowMinutes()) return 'Süresi geçti';
  if (days < 0) return 'Süresi geçti';
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Yarın';
  return `${days} gün kaldı`;
}

function orderedAssessments(includePastTypes = false) {
  return state.assessments.filter(entry => includePastTypes || activeAssessment(entry)).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
}

function calendarEntries() {
  const tasks = state.tasks.filter(task => !task.done && (task.dueTime || task.deadline))
    .map(task => ({ ...task, time: task.dueTime || '23:59', course: task.course || 'Görev', kind: 'task' }));
  return [...state.assessments.filter(activeAssessment), ...tasks].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
}

function assessmentRows(entries, edit = false) {
  if (!entries.length) return empty('Takvimde kayıt yok.');
  return `<ul class="record-list">${entries.map(entry => `
    <li class="record-row planning-row">
      ${icon('calendar', 'tile-icon')}
      <div><strong class="row-title">${escapeText(entry.title)}</strong>
      <small class="row-meta">${escapeText(entry.course)} · ${dayFormat.format(dateFor(entry.day))} · ${entry.time}${entry.endTime ? '–'+escapeText(entry.endTime) : ''}${entry.room ? ' · '+escapeText(entry.room) : ''}${entry.grade != null ? ` · ${formatGrade(entry.grade)}/100` : ''}</small></div>
      <span class="pill">${edit ? assessmentType(entry) : dueDescription(entry)}</span>
      ${edit ? entry.kind === 'task' ? editButton('task', entry) : plannerButton('edit-assessment', 'Düzenle', entry.id) : ''}
    </li>`).join('')}</ul>`;
}

function assessmentsPage() {
  const entries = calendarEntries();
  return `${intro('Final takvimi ve teslimler', 'Final günlerini ve teslim tarihlerini buradan düzenle.')}
    ${finalPeriodBanner(false)}
    <section class="panel page-panel">
      ${panelHeading('Takvim', '', plannerButton('add-assessment', 'Kayıt ekle', '', 'plus'))}
      ${assessmentRows(entries, true)}
    </section>
    `;
}

function courseKey(course) {
  return 'course:' + canonicalCourse(course).toLocaleLowerCase('tr');
}

function gradeWeights(entries) {
  const types = new Map();
  let total = 0;
  for (const entry of entries) {
    if (gradeType(entry.kind)) types.set(entry.kind, (types.get(entry.kind) ?? 0) + 1);
    else total += entry.weight;
  }
  if (types.size) total += gradeTypes.midterm.weight + gradeTypes.quiz.weight;
  if (types.has('final')) total += gradeTypes.final.weight;
  return { total, weightFor: entry => gradeType(entry.kind) ? gradeTypes[entry.kind].weight / types.get(entry.kind) : entry.weight };
}

function weightedCourses() {
  const courses = new Map();
  for (const entry of state.assessments) {
    if (!entry.course || (!entry.weight && !gradeType(entry.kind))) continue;
    const key = courseKey(entry.course);
    if (!courses.has(key)) courses.set(key, { name: entry.course, entries: [] });
    courses.get(key).entries.push(entry);
  }
  return [...courses].map(([key, course]) => {
    const { total, weightFor } = gradeWeights(course.entries);
    const graded = course.entries.filter(entry => entry.grade !== null);
    const gradedWeight = graded.reduce((sum, entry) => sum + weightFor(entry), 0);
    const earned = graded.reduce((sum, entry) => sum + weightFor(entry) * entry.grade / 100, 0);
    return { key, course, total, gradedWeight, earned };
  });
}

function passingRequirement(evaluation) {
  if (!evaluation?.gradedWeight) return null;
  const { course, gradedWeight, earned } = evaluation;
  const remaining = 100 - gradedWeight;
  if (remaining <= 1e-5) {
    const score = courseResult(earned).score;
    return score >= passingScore ? '60 puan eşiği karşılandı' : `Dönem puanı ${formatGrade(score)}/100 · 60’ın altında`;
  }
  const required = (passingScore - earned) * 100 / remaining;
  if (required <= 0) return '60 puan eşiği ağırlıklı olarak karşılandı';
  if (required > 100 + 1e-5) return 'Kalan notlarla 60’a ulaşılamıyor';
  const minimum = formatGrade(Math.ceil(required * 10 - 1e-5) / 10);
  const { weightFor } = gradeWeights(course.entries);
  const pending = course.entries.find(entry => entry.grade === null && Math.abs(weightFor(entry) - remaining) < 1e-5);
  if (pending) return `Geçmek için ${assessmentType(pending).toLocaleLowerCase('tr')}: en az ${minimum}/100`;
  if (course.entries.every(entry => gradeType(entry.kind) || !entry.weight)) {
    const missing = Object.entries(gradeTypes).filter(([kind]) => !course.entries.some(entry => entry.kind === kind));
    if (missing.length === 1 && Math.abs(missing[0][1].weight - remaining) < 1e-5) {
      return `Geçmek için ${missing[0][1].label.toLocaleLowerCase('tr')}: en az ${minimum}/100`;
    }
  }
  return `Geçmek için kalan %${formatGrade(remaining)}: en az ${minimum}/100 ortalama`;
}

function passingLine(requirement) {
  return requirement ? `<small class="passing-line">${escapeText(requirement)}</small>` : '';
}

function coursePriorities() {
  const evaluations = new Map(weightedCourses().map(course => [course.key, course]));
  const previous = new Map(state.grades.map(grade => [courseKey(grade.title), grade.value]));
  const upcoming = orderedAssessments().filter(entry => entry.grade === null && dueDescription(entry) !== 'Süresi geçti');
  const titles = new Map(enrolledCourseNames().map((title) => [courseKey(title), title]));
  for (const { key, course } of evaluations.values()) if (!titles.has(key)) titles.set(key, course.name);
  return [...titles].map(([key, title]) => {
    const evaluation = evaluations.get(key);
    const { earned = 0, gradedWeight = 0, course } = evaluation ?? {};
    const observed = gradedWeight ? earned * 100 / gradedWeight : previous.get(key) ?? null;
    const remaining = Math.max(0, 100 - gradedWeight);
    const required = gradedWeight && remaining > 1e-5 ? Math.max(0, (passingScore - earned) * 100 / remaining) : null;
    const low = observed !== null && observed < passingScore;
    const impossible = required !== null && required > 100 + 1e-5;
    const level = impossible || (required ?? 0) >= 80 ? 2
      : low || (required ?? 0) >= 65 ? 1 : 0;
    const badge = level === 2 ? 'Yüksek öncelik' : 'Ek çalışma önerilir';
    const reason = [];
    if (observed !== null) reason.push(`Girilen notların ortalaması ${formatGrade(observed)}/100.`);
    if (impossible) reason.push('Kalan puanlarla 60’a ulaşmak mümkün görünmüyor. Girilen notları ve bütünleme seçeneğini kontrol et.');
    else if (remaining <= 1e-5 && low) reason.push('Dönem puanı 60’ın altında.');
    const exam = upcoming.find(entry => courseKey(entry.course) === key);
    if (exam) reason.push(`Sıradaki: ${exam.title} (${dueDescription(exam)}).`);
    if (!reason.length) reason.push('Haftalık tekrar için temel süre.');
    const sessions = level === 2 ? [60, 45, 45] : level === 1 ? [45, 45] : [30];
    return { key, title, observed, low, level, badge, reason: reason.join(' '), passing: passingRequirement(evaluation), sessions, exam };
  }).sort((a, b) => b.level - a.level || (a.exam?.day ?? '9999').localeCompare(b.exam?.day ?? '9999') ||
    (a.observed ?? 101) - (b.observed ?? 101));
}

function isPlannedStudy(event) {
  return event.kind === 'study' && (event.assessmentId || event.focusPlan);
}

function studyGuide(event) {
  const query = encodeURIComponent(event.detail + ' ' + event.topic + (event.phase === 'practice' ? ' çözümlü sorular' : ' konu anlatımı'));
  const steps = event.phase === 'practice' ? 'Örneği izle, ardından 3 soruyu yardımsız çöz ve hatalarını yaz.'
    : 'Konu anlatımını izle, tanım ve yöntemleri özetle, ardından bir örneği kendin çöz.';
  return `<a class="text-link" href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noopener noreferrer">Video ara ↗</a> · ${steps}`;
}

function studyProgramPage() {
  const start = activeDay();
  const end = shiftDay(start, 6);
  const blocks = state.events.filter(event => isPlannedStudy(event) && event.day >= start && event.day <= end)
    .sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  return `${intro('Çalışma programı', 'Geçme hedefi 60. Önümüzdeki 7 günde öncelikli derslere daha fazla süre ayır.')}
    ${planningSettings()}
    <section class="panel">
      ${panelHeading('Derse göre çalışma süresi', 'Önerilen süre boşluğa göre yerleştirilir. Eksik not, sıfır olarak sayılmaz.', plannerButton('balance-study', 'Haftayı planla', '', 'sparkle', true))}
      <ul class="record-list">${coursePriorities().map(course => {
        const planned = blocks.filter(block => courseKey(block.detail) === course.key)
          .reduce((sum, block) => sum + clockMinutes(block.endTime) - clockMinutes(block.time), 0);
        return `<li class="record-row planning-row"><div><strong class="row-title">${escapeText(course.title)}</strong>
          <small class="row-meta">${masterySessions(course).reduce((sum, minutes) => sum + minutes, 0)} dk öneri · ${planned} dk planlandı</small>
          <small class="row-meta">${escapeText(course.reason)}</small>${passingLine(course.passing)}</div>
          ${course.level ? `<span class="pill urgent">${course.badge}</span>` : ''}</li>`;
      }).join('')}</ul>
    </section>
    <section class="panel planning-panel">
      ${panelHeading('Önümüzdeki 7 gün', '', plannerButton('redistribute', 'Kaçan işleri dağıt'))}
      ${blocks.length ? `<ul class="record-list">${blocks.map(event => `<li class="record-row"><div>
        <strong class="row-title">${escapeText(event.title)}</strong><small class="row-meta">${escapeText(event.detail)} · ${dayFormat.format(dateFor(event.day))} · ${eventTime(event)}</small>
        ${event.focusPlan ? `<small class="row-meta">${studyGuide(event)}</small>` : ''}</div>${studyControls(event)}</li>`).join('')}</ul>` : empty('Henüz bir çalışma oturumu planlanmadı.')}
    </section>`;
}

function planningRules() {
  return {
    travelMinutes: 20,
    breakMinutes: 10,
    mealMinutes: 30,
    meals: ['08:00', '12:30', '19:00'],
    dailyStudyMinutes: 180,
    ...state.planning,
  };
}

function planningSettings() {
  const rules = planningRules();
  return `<details class="panel page-panel planning-panel"><summary class="panel-heading">Zaman ayarları</summary>
    <form id="planning-settings" class="sync-content form-fields"><div class="assessment-numbers">
      ${inputField('Ulaşım (tek yön, dk)', 'travelMinutes', rules.travelMinutes, 'type="number" min="0" max="120" required')}
      ${inputField('Oturum arası mola (dk)', 'breakMinutes', rules.breakMinutes, 'type="number" min="0" max="60" required')}
      ${inputField('Günlük çalışma sınırı (dk)', 'dailyStudyMinutes', rules.dailyStudyMinutes, 'type="number" min="30" max="600" required')}
    </div><div class="assessment-numbers">${rules.meals.map((time, index) => {
      const label = ['Kahvaltı', 'Öğle', 'Akşam'][index];
      return inputField(label, 'meal' + index, time, 'type="time" required');
    }).join('')}</div>
      ${inputField('Her öğün için süre (dk)', 'mealMinutes', rules.mealMinutes, 'type="number" min="10" max="120" required')}
      <button class="button secondary" type="submit">Ayarları kaydet</button></form></details>`;
}

function weightedGrades() {
  const courses = weightedCourses();
  if (!courses.length) return '';
  const rows = courses.map(({ key, course, total, gradedWeight, earned }) => {
    const target = state.targets[key] ?? passingScore;
    const missing = 100 - gradedWeight > 0.00001 ? 100 - gradedWeight : 0;
    const required = missing ? Math.max(0, (target - earned) * 100 / missing) : 0;
    const gradeText = missing && target !== passingScore
      ? required > 100.00001 ? 'Kalan ağırlıkla hedefe ulaşılamıyor.' : `Kalan %${formatGrade(missing)} için gereken ortalama ${formatGrade(Math.ceil(required * 10 - 0.00001) / 10)}/100.`
      : missing ? '' : `Dönem notu ${formatGrade(courseResult(earned).score)}/100 · Tahmini harf ${courseResult(earned).letter}.`;
    const upcoming = orderedAssessments().find(entry => courseKey(entry.course) === key && entry.grade === null && dueDescription(entry) !== 'Süresi geçti');
    return `<li class="record-row planning-row">
      ${icon('chart', 'tile-icon')}<div><strong class="row-title">${escapeText(course.name)}</strong>
      <small class="row-meta">Hedef ${target} · Dönem notuna katkı ${formatGrade(earned)} puan</small>
      ${total < 99.99999 ? `<small class="row-meta">Belirlenmemiş ağırlık %${formatGrade(100 - total)}</small>` : ''}
      ${gradeText ? `<small class="row-meta">${gradeText}</small>` : ''}
      ${passingLine(passingRequirement({ course, gradedWeight, earned }))}
      ${upcoming ? `<small class="row-meta">Sıradaki: ${escapeText(upcoming.title)} · ${dueDescription(upcoming)}</small>` : ''}</div>
    </li>`;
  });
  return `<section class="panel page-panel planning-panel">${panelHeading('Ağırlıklı not hesabı', 'Gereken ortalama, henüz notu girilmemiş tüm ağırlık için hesaplanır.')}
    <ul class="record-list">${rows.join('')}</ul></section>`;
}

function formatGrade(value) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
}

function editAssessment(entry, gradeEntry = false, presetCourse = '') {
  const kind = entry?.kind ?? (gradeEntry ? 'midterm' : 'final');
  const options = Object.entries({ midterm: 'Vize (%30)', quiz: 'Kısa sınav (%20)', final: 'Final / bütünleme (%50)', exam: 'Diğer sınav', deadline: 'Teslim' });
  const weight = gradeType(kind)?.weight ?? entry?.weight;
  const course = entry?.course ?? presetCourse;
  plannerModal('assessment', entry ? 'Not veya takvim kaydını düzenle' : gradeEntry ? 'Ders notu gir' : 'Sınav veya teslim ekle',
    courseField('Ders', course, true) +
    inputField('Başlık (isteğe bağlı)', 'title', entry?.title, 'maxlength="100"') +
    field('Tür', `<select name="kind">${options
      .filter(([value]) => gradeEntry ? gradeType(value) : !['midterm','quiz'].includes(value) || entry?.kind === value)
      .map(([value, label]) => `<option value="${value}" ${value === kind ? 'selected' : ''}>${label}</option>`).join('')}</select>`) +
    `<div class="time-fields">${inputField('Tarih', 'day', entry?.day ?? selectedDay, 'type="date" required')}
    ${inputField('Saat', 'time', entry?.time ?? '17:00', 'type="time" required')}</div>` +
    `<div class="time-fields">${inputField('Bitiş saati (isteğe bağlı)', 'endTime', entry?.endTime, 'type="time"')}
    ${inputField('Derslik (isteğe bağlı)', 'room', entry?.room, 'maxlength="100"')}</div>` +
    `<div class="assessment-numbers">
      ${inputField('Ağırlık (%)', 'weight', weight || '', `type="number" min="0" max="100" step="0.1" ${gradeType(kind) ? 'readonly' : ''}`)}
      ${inputField('Alınan not', 'grade', entry?.grade, 'type="number" min="0" max="100" step="0.1"')}
      ${inputField('Ders hedefi', 'target', entry ? state.targets[courseKey(entry.course)] : '', 'type="number" min="0" max="100" placeholder="60"')}
    </div>` +
    `<div id="assessment-topic-editor" ${kind === 'final' ? 'hidden' : ''}>` + field('Çalışılacak konular, her satıra bir konu', `<textarea name="topics" rows="3" maxlength="1000">${escapeText(entry?.topics.join('\n') ?? '')}</textarea>`) +
    `<div id="assessment-topic-choices">${topicChoices(course)}</div></div><p id="final-topic-note" ${kind === 'final' ? '' : 'hidden'}>Final hazırlığında dersin bütün konuları kullanılır. Konu takibini Final konuları ekranından yapabilirsin.</p>`,
    'Kaydet', entry);
}

function saveAssessment(data) {
  const kind = data.get('kind');
  const preset = gradeType(kind);
  const title = data.get('title').trim() || preset?.label;
  const course = canonicalCourse(data.get('course'));
  if (!title || !course) return 'Başlık ve ders adını yaz.';
  const key = courseKey(course);
  const weight = preset?.weight ?? Number(data.get('weight'));
  const other = state.assessments.filter(entry => entry !== plannerRecord && courseKey(entry.course) === key);
  if (kind === 'final' && other.some(entry => entry.kind === 'final')) return 'Bu dersin final / bütünleme kaydını düzenleyebilirsin.';
  if (Math.round(gradeWeights([...other, { kind, weight }]).total * 10) > 1000) return 'Aynı dersin toplam ağırlığı %100’ü geçemez.';
  const grade = data.get('grade') === '' ? null : Number(data.get('grade'));
  const topics = kind === 'final' ? [] : topicLines(data.get('topics'));
  const fields = { title, course, weight, grade, topics, kind, day: data.get('day'), time: data.get('time') };
  const endTime = data.get('endTime') || '';
  const room = (data.get('room') || '').trim();
  if (endTime && endTime <= fields.time) return 'Bitiş saati başlangıçtan sonra olmalı.';
  if (endTime) fields.endTime = endTime;
  if (room) fields.room = room;
  if (plannerRecord) {
    delete plannerRecord.endTime;
    delete plannerRecord.room;
    const sameCourse = courseKey(plannerRecord.course) === key;
    const keptTopics = new Set(assessmentTopics(fields));
    Object.assign(plannerRecord, fields);
    state.events = state.events.filter(event => event.assessmentId !== plannerRecord.id || event.studyDone ||
      (sameCourse && keptTopics.has(event.topic) && event.day + event.endTime <= fields.day + fields.time));
  } else {
    state.assessments.push({ id: newId(), ...fields });
  }
  if (data.get('target') !== '') state.targets[key] = Number(data.get('target'));
  activeGradeCourse = key;
}

function studyControls(event) {
  return `<label class="daily-control"><input type="checkbox" data-daily-study="${escapeText(event.id)}" ${event.studyDone ? 'checked' : ''}><span>Tamamladım</span></label>`;
}

function dashboardPlanning() {
  const next = calendarEntries().filter(entry => dueDescription(entry) !== 'Süresi geçti').slice(0, 3);
  const day = activeDay();
  const missed = state.events.filter(event => isPlannedStudy(event) && !event.studyDone &&
    (event.day < day || event.day === day && clockMinutes(event.endTime) <= nowMinutes()));
  return `<div class="dashboard-grid planning-panel">
    <section class="panel">
      ${panelHeading('Yaklaşan sınav ve teslimler', '', '<a href="#takvim" class="text-link">Takvime git</a>')}
      ${next.length ? assessmentRows(next) : empty('Yaklaşan sınav veya teslim yok.')}
    </section>
    <section class="panel">
      ${panelHeading('Çalışma planı', '', plannerButton('plan-topics', 'Konu planla', '', 'sparkle'))}
      ${missed.length ? `<ul class="record-list">${missed.map(event => `
        <li class="record-row planning-row"><div><strong class="row-title">${escapeText(event.title)}</strong>
        <small class="row-meta">Kaçan oturum · ${dayFormat.format(dateFor(event.day))}</small></div>
        ${plannerButton('reschedule-study', 'Yeni saat', event.id)}</li>`).join('')}</ul>` : empty('Kaçan çalışma oturumu yok.')}
    </section>
  </div>`;
}

function freeStudySlot(day, minutes, deadline, blocked, skipId, minimumStart = 0) {
  const sleep = sleepTimes();
  if (sleep.duration >= 24) return null;
  const wake = clockMinutes(sleep.wake);
  const bed = clockMinutes(sleep.bedtime);
  const windows = wake < bed ? [[wake, bed]] : [[0, bed], [wake, 1439]];
  const rules = planningRules();
  const taskSlots = state.tasks.filter(task => !task.done && task.day === day && task.plannedTime && task.plannedEnd)
    .map(task => ({ id: task.id, kind: 'study', time: task.plannedTime, endTime: task.plannedEnd, attending: true }));
  const events = [...eventsForDay(day), ...taskSlots, ...blocked.filter(event => event.day === day)]
    .filter(event => event.id !== skipId && (event.kind !== 'lesson' || event.attending));
  const used = events.filter(event => event.kind === 'study').reduce((sum, event) => {
    const duration = event.endTime ? clockMinutes(event.endTime) - clockMinutes(event.time) : 60;
    return sum + duration;
  }, 0);
  if (used + minutes > rules.dailyStudyMinutes) return null;
  const busy = events.map(event => {
    const start = clockMinutes(event.time);
    const end = event.endTime ? clockMinutes(event.endTime) : start + 60;
    const buffer = ['lesson', 'workout'].includes(event.kind) ? rules.travelMinutes : rules.breakMinutes;
    return [start - buffer, end + buffer];
  });
  for (const meal of rules.meals) {
    const start = clockMinutes(meal);
    busy.push([start, start + rules.mealMinutes]);
  }
  for (const entry of state.assessments) {
    if (entry.day === day && entry.kind !== 'deadline' && activeAssessment(entry)) {
      const start = clockMinutes(entry.time);
      busy.push([start - rules.travelMinutes, (entry.endTime ? clockMinutes(entry.endTime) : start + 90) + rules.travelMinutes]);
    }
  }
  const earliest = Math.max(minimumStart, day === activeDay() ? nowMinutes() + 1 : 0);
  for (const [from, to] of windows) {
    const end = Math.min(to, day === deadline.day ? clockMinutes(deadline.time) : 1439);
    for (let start = Math.ceil(Math.max(from, earliest) / 15) * 15; start + minutes <= end; start += 15) {
      if (!busy.some(([left, right]) => start < right && start + minutes > left)) {
        return { day, time: clockLabel(start), endTime: clockLabel(start + minutes) };
      }
    }
  }
  return null;
}

function studyProposal() {
  const items = orderedAssessments().filter(entry => entry.grade === null).flatMap(entry => orderedTopics(entry.course, assessmentTopics(entry))
    .filter(topic => !state.events.some(event => event.assessmentId === entry.id && event.topic === topic))
    .map(topic => ({ entry, topic })));
  const blocks = [];
  let unavailable = 0;
  for (const { entry, topic } of items) {
    const firstDay = activeDay();
    let slot;
    // Prefer a different day for each topic of the same assessment.
    for (const spread of [true, false]) {
      for (let day = firstDay; day <= entry.day && day <= shiftDay(firstDay, 180); day = shiftDay(day, 1)) {
        if (spread && [...state.events, ...blocks].some(event => event.assessmentId === entry.id && event.day === day)) continue;
        slot = freeStudySlot(day, 45, entry, blocks);
        if (slot) break;
      }
      if (slot) break;
    }
    if (!slot) {
      unavailable += 1;
      continue;
    }
    blocks.push({ ...slot, id: newId(), assessmentId: entry.id, topic, title: topic, detail: entry.course, kind: 'study', attending: true });
  }
  return { blocks, unavailable };
}

function balancedStudyProposal() {
  const days = Array.from({ length: 7 }, (_, index) => shiftDay(activeDay(), index));
  const existing = state.events.filter(event => isPlannedStudy(event) && days.includes(event.day));
  const blocks = [];
  let unavailable = 0;
  const courses = coursePriorities().map(course => {
    const topics = orderedTopics(course.title, course.exam ? assessmentTopics(course.exam) : topicsForCourse(course.title));
    const covered = new Set(state.events.filter(event => isPlannedStudy(event) &&
      courseKey(event.detail) === course.key && (event.studyDone || days.includes(event.day))).map(event => event.topic));
    const pending = topics.filter(topic => !covered.has(topic));
    const planned = existing.filter(event => courseKey(event.detail) === course.key);
    const sessions = masterySessions(course);
    const target = sessions.reduce((sum, minutes) => sum + minutes, 0);
    const allocated = planned.reduce((sum, block) => sum + clockMinutes(block.endTime) - clockMinutes(block.time), 0);
    return { ...course, sessions, topics: [...pending, ...topics.filter(topic => covered.has(topic))],
      practiceOnly: !pending.length, planned, remaining: Math.max(0, target - allocated), added: 0 };
  });

  for (let round = 0; round < 3; round += 1) {
    for (const course of courses) {
      if (!course.sessions[round]) continue;
      const topic = course.topics[course.added % course.topics.length] ?? 'Son dersin tekrarı ve alıştırmalar';
      const mastery = topicMastery(course.title, topic);
      const length = mastery === 'unknown' ? Math.max(45,course.sessions[round] ?? 0) : mastery === 'known' ? 30 : 45;
      const minutes = Math.min(length, course.remaining);
      if (!minutes) continue;
      const deadline = course.exam ?? { day: days.at(-1), time: '23:59' };
      const dailyLoad = day => [...existing, ...blocks].filter(event => event.day === day).length;
      const candidates = days.filter(day => day <= deadline.day)
        .sort((a, b) => {
          const sameCourse = day => [...course.planned, ...blocks].some(event => event.day === day && courseKey(event.detail) === course.key);
          return Number(sameCourse(a)) - Number(sameCourse(b)) || dailyLoad(a) - dailyLoad(b) || a.localeCompare(b);
        });
      const slot = candidates.filter(day => dailyLoad(day) < 3)
        .map(day => freeStudySlot(day, minutes, deadline, blocks)).find(Boolean);
      if (!slot) {
        unavailable += 1;
        continue;
      }
      const phase = mastery === 'unknown' && course.added === 0 && !course.practiceOnly ? 'learn' : 'practice';
      blocks.push({
        ...slot, id: newId(), kind: 'study', attending: true, focusPlan: true, phase, topic, title: topic, detail: course.title,
        ...(course.exam ? { assessmentId: course.exam.id } : {}),
      });
      course.remaining -= minutes;
      course.added += 1;
    }
  }
  blocks.sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  return { blocks, unavailable };
}

function masterySessions(course) {
  const topics = course.exam ? assessmentTopics(course.exam) : topicsForCourse(course.title);
  if (topics.some(topic => topicMastery(course.title, topic) === 'unknown')) {
    return course.sessions.map(minutes => Math.max(45, minutes));
  }
  if (topics.length && topics.every(topic => topicMastery(course.title, topic) === 'known')) {
    return course.sessions.map(minutes => Math.min(30, minutes));
  }
  return course.sessions;
}

function redistributionProposal() {
  const today = activeDay();
  const lastDay = shiftDay(today, 6);
  const missedStudies = state.events.filter(event => isPlannedStudy(event) && !event.studyDone &&
    (event.day < today || event.day === today && clockMinutes(event.endTime) <= nowMinutes()));
  const missedTasks = state.tasks.filter(task => !task.done &&
    (task.day < today || task.day === today && task.plannedEnd && clockMinutes(task.plannedEnd) <= nowMinutes()));
  const candidates = [
    ...missedStudies.map(record => ({ record, type: 'study' })),
    ...missedTasks.map(record => ({ record, type: 'task' })),
  ];
  const moves = [];
  const blocked = [];
  for (const item of candidates) {
    const record = item.record;
    const exam = record.assessmentId ? state.assessments.find(entry => entry.id === record.assessmentId) : null;
    let deadline = exam ?? { day: lastDay, time: '23:59' };
    if (item.type === 'task' && (record.deadline || record.dueTime)) {
      deadline = { day: record.day, time: record.dueTime || '23:59' };
    }
    let minutes = 30;
    if (item.type === 'study') {
      minutes = clockMinutes(record.endTime) - clockMinutes(record.time);
    } else if (record.plannedTime && record.plannedEnd) {
      minutes = clockMinutes(record.plannedEnd) - clockMinutes(record.plannedTime);
    }
    let slot;
    for (let day = today; day <= lastDay && day <= deadline.day; day = shiftDay(day, 1)) {
      slot = freeStudySlot(day, minutes, deadline, blocked, record.id);
      if (slot) break;
    }
    if (!slot) continue;
    const snapshot = JSON.stringify(record);
    moves.push({ id: record.id, type: item.type, title: record.title, from: record.day, snapshot, ...slot });
    blocked.push({ ...slot, id: record.id, kind: 'study', attending: true });
  }
  return { moves, unavailable: candidates.length - moves.length };
}

function previewRedistribution() {
  proposal = redistributionProposal();
  const fields = proposal.moves.length ? `<ul class="proposal-list">${proposal.moves.map(move => `<li><strong>${escapeText(move.title)}</strong>
    <span>${dayFormat.format(dateFor(move.from))} → ${dayFormat.format(dateFor(move.day))} · ${move.time}–${move.endTime}</span></li>`).join('')}</ul>` :
    '<p class="form-feedback">Taşınabilecek iş yok veya kalan zamanda uygun boşluk bulunamadı.</p>';
  plannerModal('redistribute', 'Kaçan işleri yeniden dağıt', fields, 'Değişiklikleri uygula');
  plannerSubmit.disabled = proposal.moves.length === 0;
  if (proposal.unavailable) plannerFeedback.textContent = `${proposal.unavailable} iş için uygun zaman yok. Mevcut kayıtları korunacak.`;
}

function applyRedistribution() {
  let changed = 0;
  for (const move of proposal.moves) {
    const records = move.type === 'task' ? state.tasks : state.events;
    const record = records.find(entry => entry.id === move.id);
    if (!record || JSON.stringify(record) !== move.snapshot || record.done || record.studyDone) continue;
    const deadline = { day: move.day, time: move.endTime };
    const minutes = clockMinutes(move.endTime) - clockMinutes(move.time);
    const available = freeStudySlot(move.day, minutes, deadline, [], record.id, clockMinutes(move.time));
    if (!available || available.time !== move.time) continue;
    const exam = state.assessments.find(entry => entry.id === record.assessmentId);
    if (exam && move.day + move.endTime > exam.day + exam.time) continue;
    if (move.type === 'task') {
      record.postponements ??= [];
      record.postponements.push({ changedOn: activeDay(), from: record.day, to: move.day });
      Object.assign(record, { day: move.day, plannedTime: move.time, plannedEnd: move.endTime });
    } else {
      Object.assign(record, { day: move.day, time: move.time, endTime: move.endTime });
    }
    changed += 1;
  }
  return changed;
}

function showStudyProposal(record, balanced = false) {
  if (record) {
    const firstDay = activeDay();
    const deadline = record.assessmentId ? state.assessments.find(entry => entry.id === record.assessmentId)
      : { day: shiftDay(firstDay, 6), time: '23:59' };
    const minutes = clockMinutes(record.endTime) - clockMinutes(record.time);
    let slot;
    if (deadline) {
      for (let day = firstDay; day <= deadline.day && day <= shiftDay(firstDay, 180); day = shiftDay(day, 1)) {
        slot = freeStudySlot(day, minutes, deadline, [], record.id);
        if (slot) break;
      }
    }
    proposal = { blocks: slot ? [{ ...record, ...slot }] : [], unavailable: slot ? 0 : 1 };
  } else {
    proposal = balanced ? balancedStudyProposal() : studyProposal();
  }
  const details = proposal.blocks.length
    ? `<ul class="proposal-list">${proposal.blocks.map(block => `<li><strong>${escapeText(block.detail)} · ${escapeText(block.title)}</strong>
      <span>${dayFormat.format(dateFor(block.day))} · ${eventTime(block)} · ${clockMinutes(block.endTime) - clockMinutes(block.time)} dk</span>
      ${block.focusPlan ? `<span>${studyGuide(block)}</span>` : ''}</li>`).join('')}</ul>`
    : '<p class="form-feedback">Planlanabilecek boş saat bulunamadı. Takvime konu ekleyebilir veya tarihleri kontrol edebilirsin.</p>';
  plannerModal('proposal', record ? 'Oturum için yeni saat' : balanced ? '7 günlük çalışma programı' : 'Çalışma planı önerisi', details, 'Planı uygula', record);
  plannerSubmit.disabled = proposal.blocks.length === 0;
  if (proposal.unavailable) plannerFeedback.textContent = `${proposal.unavailable} oturum için uygun saat bulunamadı.`;
}

function parseQuickEntry(text) {
  const normal = text.toLocaleLowerCase('tr');
  const todayKey = activeDay();
  const dateToken = normal.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})\b/u)?.[0];
  const dayToken = normal.match(/(?<!\p{L})(öbür gün|bugün|yarın|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)(?!\p{L})/u)?.[0];
  const timeToken = normal.match(/\b(?:[01]?\d|2[0-3])[.:][0-5]\d\b(?!\.\d)/u)?.[0];
  let day = todayKey;
  if (dateToken) {
    const parts = dateToken.split('.');
    day = parts.length === 1 ? dateToken : [parts[2], parts[1].padStart(2, '0'), parts[0].padStart(2, '0')].join('-');
    const date = dateFor(day);
    if (Number.isNaN(date.valueOf()) || keyFormat.format(date) !== day) throw new Error('Tarih geçersiz. Örneğin 2026-12-05 yazabilirsin.');
  } else if (dayToken) {
    const relative = ['bugün', 'yarın', 'öbür gün'].indexOf(dayToken);
    const days = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
    const offset = (days.indexOf(dayToken) + 7 - weekday(todayKey)) % 7;
    const timeAlreadyPassed = timeToken && clockMinutes(timeToken.replace('.', ':')) <= nowMinutes();
    day = shiftDay(todayKey, relative >= 0 ? relative : offset || (timeAlreadyPassed ? 7 : 0));
  }
  let title = text;
  for (const token of [dateToken, dayToken, timeToken].filter(Boolean)) {
    const index = title.toLocaleLowerCase('tr').indexOf(token);
    if (index >= 0) title = title.slice(0, index) + title.slice(index + token.length);
  }
  title = title.replace(/^\s*(?:['’]?(?:ye|ya|e|a)\s+)?(?:kadar\s+)?/iu, '').trim();
  if (!title) throw new Error('Görevin adını da yaz.');
  const knownCourses = [...new Set([...courseCatalog.map(([name]) => name), ...state.events.filter(entry => entry.kind === 'lesson').map(entry => entry.title),
    ...state.grades.map(entry => entry.title), ...state.assessments.map(entry => entry.course)])];
  const normalized = ` ${normalizeCourseName(title)} `;
  const course = knownCourses.sort((a, b) => b.length - a.length)
    .find(name => normalized.includes(` ${normalizeCourseName(name)} `)) ?? '';
  return { title, course, day, time: timeToken ? timeToken.replace('.', ':').padStart(5, '0') : '' };
}

function showQuickReview(entry) {
  plannerModal('quick-review', 'Hızlı kaydı kontrol et',
    inputField('Görev', 'title', entry.title, 'required maxlength="100"') +
    courseField('Ders (isteğe bağlı)', entry.course) +
    `<div class="time-fields">${inputField('Teslim tarihi', 'day', entry.day, 'type="date" required')}
    ${inputField('Teslim saati', 'time', entry.time, 'type="time"')}</div>`);
}

function weeklyPage() {
  const monday = shiftDay(selectedDay, -((weekday(selectedDay) + 6) % 7));
  const sunday = shiftDay(monday, 6);
  const inWeek = day => day >= monday && day <= sunday;
  const byCourse = new Map();
  for (const event of state.events.filter(event => inWeek(event.day) && isPlannedStudy(event) && event.studyDone)) {
    const course = event.detail || 'Ders belirtilmedi';
    const minutes = clockMinutes(event.endTime) - clockMinutes(event.time);
    byCourse.set(course, (byCourse.get(course) ?? 0) + minutes);
  }
  const activities = Array.isArray(fitnessData.activities) ? fitnessData.activities : [];
  const workoutDays = new Set(activities.filter(record => record && inWeek(record.day)).map(record => record.day));
  for (let offset = 0; offset < 7; offset++) {
    const day = shiftDay(monday, offset);
    if (eventsForDay(day).some(event => event.kind === 'workout' && event.done)) workoutDays.add(day);
  }
  const postponed = state.tasks.flatMap(task => {
    const latest = task.postponements?.filter(change => inWeek(change.changedOn)).at(-1);
    return latest ? [{ title: task.title, day: latest.to }] : [];
  });
  const range = `${dayFormat.format(dateFor(monday))} – ${dayFormat.format(dateFor(sunday))}`;
  return `${intro('Haftalık özet', range)}
    <div class="metrics">
      ${metric('timer', 'Tamamlanan blokların plan süresi', [...byCourse.values()].reduce((sum, minutes) => sum + minutes, 0) + ' dk')}
      ${metric('dumbbell', 'Spor yapılan gün', workoutDays.size, 'mint')}
      ${metric('calendar', 'Ertelenen görev', postponed.length, 'blue')}
    </div>
    <section class="panel page-panel">${panelHeading('Tamamlanan çalışma blokları', '', `<div class="week-actions">
      ${plannerButton('previous-week', 'Önceki hafta')}${plannerButton('next-week', 'Sonraki hafta')}</div>`)}
      ${byCourse.size ? `<ul class="record-list">${[...byCourse].sort((a, b) => b[1] - a[1]).map(([course, minutes]) => `<li class="record-row"><div class="row-title">${escapeText(course)}</div><span class="pill">${minutes} dk</span></li>`).join('')}</ul>` : empty('Bu hafta tamamlanan çalışma bloğu yok.')}
    </section>
    ${postponed.length ? `<section class="panel page-panel planning-panel">${panelHeading('Ertelenen görevler')}
      <ul class="record-list">${postponed.map(task => `<li class="record-row"><div class="row-title">${escapeText(task.title)}</div><span class="pill">${dayFormat.format(dateFor(task.day))}</span></li>`).join('')}</ul></section>` : ''}`;
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-planner]');
  if (!button) return;
  const { planner: action, id } = button.dataset;
  plannerSubmit.disabled = false;
  switch (action) {
    case 'close': plannerDialog.close(); break;
    case 'quick':
      plannerModal('quick', 'Hızlı görev kaydı', inputField('Görevi doğal dille yaz', 'text', '', 'required autofocus maxlength="160" placeholder="Cuma 17.00’ye kadar ders ödevi"'), 'Önizle');
      break;
    case 'add-assessment': editAssessment(null); break;
    case 'course-assessment': editAssessment(null, false, id); break;
    case 'edit-course-topics':
      plannerModal('course-topics', id, field('Her satıra bir konu yaz',
        `<textarea name="topics" rows="9" maxlength="15000">${escapeText(topicsForCourse(id).join('\n'))}</textarea>`), 'Konuları kaydet', id);
      break;
    case 'append-course-topic': {
      const textarea = plannerForm.elements.namedItem('topics');
      const topics = topicLines(textarea.value);
      if (topics.some(topic => topicKey(topic) === topicKey(id))) {
        plannerFeedback.textContent = 'Bu konu zaten listede.';
        break;
      }
      const updated = [...topics, id].join('\n');
      if (updated.length > textarea.maxLength) {
        plannerFeedback.textContent = 'Konu listesi dolu. Önce bir konuyu çıkar.';
        break;
      }
      textarea.value = updated;
      plannerFeedback.textContent = 'Konu sınav listesine eklendi.';
      break;
    }
    case 'add-course-grade': editAssessment(null, true, id); break;
    case 'edit-assessment': editAssessment(state.assessments.find(entry => entry.id === id)); break;
    case 'remove-assessment':
      if (!window.confirm('Takvim kaydı ve tamamlanmamış çalışma blokları silinsin mi?')) return;
      state.assessments = state.assessments.filter(entry => entry !== plannerRecord);
      state.events = state.events.filter(entry => entry.assessmentId !== plannerRecord.id || entry.studyDone);
      plannerDialog.close();
      save('Takvim kaydı silindi.');
      render();
      break;
    case 'plan-topics': showStudyProposal(null); break;
    case 'balance-study': showStudyProposal(null, true); break;
    case 'redistribute': previewRedistribution(); break;
    case 'reschedule-study': showStudyProposal(state.events.find(entry => entry.id === id)); break;
    case 'previous-week':
    case 'next-week':
      selectedDay = shiftDay(selectedDay, action === 'previous-week' ? -7 : 7);
      render();
      document.querySelector(`[data-planner="${action}"]`)?.focus();
      break;
  }
});

plannerForm.addEventListener('change', event => {
  if (plannerMode !== 'assessment' || event.target.name !== 'kind') return;
  document.querySelector('#assessment-topic-editor').hidden = event.target.value === 'final';
  document.querySelector('#final-topic-note').hidden = event.target.value !== 'final';
  const preset = gradeType(event.target.value);
  const weight = plannerForm.elements.namedItem('weight');
  weight.readOnly = Boolean(preset);
  weight.value = preset?.weight ?? (gradeType(plannerRecord?.kind) ? '' : plannerRecord?.weight || '');
});

plannerForm.addEventListener('input', event => {
  if (plannerMode !== 'assessment' || event.target.name !== 'course') return;
  document.querySelector('#assessment-topic-choices').innerHTML = topicChoices(event.target.value);
  fillIcons();
});

plannerForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(plannerForm);
  switch (plannerMode) {
    case 'quick':
      try {
        showQuickReview(parseQuickEntry(data.get('text').trim()));
      } catch (error) {
        plannerFeedback.textContent = error.message;
      }
      return;
    case 'quick-review': {
      const title = data.get('title').trim();
      if (!title) {
        plannerFeedback.textContent = 'Görevin adını yaz.';
        return;
      }
      selectedDay = data.get('day');
      state.tasks.push({ id: newId(), day: selectedDay, title, course: canonicalCourse(data.get('course')), dueTime: data.get('time'), deadline: true, priority: 'Normal', done: false });
      location.hash = 'bugun';
      break;
    }
    case 'assessment': {
      const message = saveAssessment(data);
      if (message) {
        plannerFeedback.textContent = message;
        return;
      }
      break;
    }
    case 'course-topics':
      state.courseTopics[courseKey(plannerRecord)] = groupCourseTopics(plannerRecord, topicLines(data.get('topics')), state);
      break;
    case 'proposal':
      if (plannerRecord) Object.assign(plannerRecord, proposal.blocks[0]);
      else state.events.push(...proposal.blocks);
      break;
    case 'redistribute':
      applyRedistribution();
      break;
  }
  plannerDialog.close();
  save('Değişiklik kaydedildi.');
  render();
});


document.addEventListener('submit', event => {
  if (event.target.id !== 'planning-settings') return;
  event.preventDefault();
  const data = new FormData(event.target);
  state.planning = {
    travelMinutes: Number(data.get('travelMinutes')),
    breakMinutes: Number(data.get('breakMinutes')),
    dailyStudyMinutes: Number(data.get('dailyStudyMinutes')),
    mealMinutes: Number(data.get('mealMinutes')),
    meals: [0, 1, 2].map(index => data.get('meal' + index)),
  };
  save('Zaman ayarları kaydedildi.');
  render();
});
