const courseCatalog = [];
function topicKey(text) {
  return text.normalize('NFC').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim();
}

function uniqueTopics(topics) {
  const seen = new Set();
  return topics.filter(topic => {
    const key = topicKey(topic);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupCourseTopics(title, topics) { return uniqueTopics(topics); }
function upgradeCourseCatalog(data) { data.courseTopics ??= {}; return data; }
function normalizeCourseName(name) {
  return name.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\bi\b/g, '1');
}

function knownCourse(name) {
  const normalized = normalizeCourseName(name);
  return courseCatalog.find(([title]) => normalizeCourseName(title) === normalized);
}

function canonicalCourse(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return knownCourse(trimmed)?.[0] ?? trimmed;
}

function courseField(label, value, required = false, name = 'course') {
  return inputField(label, name, value, `list="course-names" maxlength="100" ${required ? 'required' : ''}`);
}

function topicsForCourse(name) {
  const course = knownCourse(name);
  return state.courseTopics[courseKey(course?.[0] ?? name)] ?? course?.[1] ?? [];
}

function topicLines(text) {
  return uniqueTopics(text.split(/\r?\n/).map(topic => topic.trim()));
}

function topicMastery(course, topic) {
  return state.topicMastery?.[courseKey(course)]?.[topic] ?? 'unknown';
}

function orderedTopics(course, topics) {
  const rank = { unknown: 0, partial: 1, known: 2 };
  return [...topics].sort((a, b) => rank[topicMastery(course, a)] - rank[topicMastery(course, b)]);
}

function enrolledCourseNames() {
  const courses = new Map();
  const add = name => {
    const title = canonicalCourse(name);
    if (title) courses.set(courseKey(title), title);
  };
  for (const exam of state.assessments) if (exam.kind === 'final') add(exam.course);
  for (const lesson of state.events ?? []) if (lesson.kind === 'lesson') add(lesson.title);
  return [...courses.values()].sort((a,b) => a.localeCompare(b,'tr'));
}

function coursesPage() {
  const courses = enrolledCourseNames();
  if (!courses.length) return intro('Final konuları', 'Ders programına ders veya sınav takvimine final eklediğinde konuların burada görünür.') + '<a class="button secondary" href="#program">Ders programını aç</a>';
  return `${intro('Final konuları', 'Her ders için kendi konu listeni kaydedebilirsin.')}${finalPeriodBanner()}${courseNavigation('course')}
    <div class="course-grid final-course-grid">${courses.map((title,index) => {
      const topics = topicsForCourse(title);
      const known = topics.filter(topic=>topicMastery(title,topic)==='known').length;
      const exam = state.assessments.find(e=>e.kind==='final' && courseKey(e.course)===courseKey(title));
      return `<details class="panel course-card" name="course-topics" id="course-${index}" data-course-card="${escapeText(title)}">
        <summary tabindex="0">${icon('book','tile-icon')}<span><strong>${escapeText(title)}</strong><small data-topic-progress>${known}/${topics.length} konu hazır</small>${exam ? `<small>${dayFormat.format(dateFor(exam.day))} · ${escapeText(exam.time)}${exam.endTime ? '–'+escapeText(exam.endTime) : ''}</small>` : ''}</span>${icon('chevron-right')}</summary>
        <div class="course-card-body">${courseTopicList(title)}<div class="sync-actions">${plannerButton('edit-course-topics','Konuları düzenle',title,'pencil')}</div></div>
      </details>`;
    }).join('')}</div>`;
}

function topicChoices(name) {
  const topics = topicsForCourse(name);
  if (!topics.length) return '<small class="row-meta">Konu seçmek için ders adını seç veya kendi konularını yaz.</small>';
  return `<details class="preference">
    <summary>Ders konularından seç</summary>
    <ul class="topic-choices">${topics.map(topic => `<li>${plannerButton('append-course-topic', escapeText(topic), topic, 'plus')}</li>`).join('')}</ul>
  </details>`;
}

document.querySelector('#course-names').replaceChildren(...courseCatalog.map(([title]) => {
  const option = document.createElement('option');
  option.value = title;
  return option;
}));

document.addEventListener('change', event => {
  const topic = event.target.dataset.topicMastery;
  const course = event.target.dataset.course;
  if (!topic || !course || !['unknown', 'partial', 'known'].includes(event.target.value)) return;
  state.topicMastery ??= {};
  const key = courseKey(course);
  state.topicMastery[key] ??= {};
  state.topicMastery[key][topic] = event.target.value;
  save('Konu hâkimiyeti kaydedildi.');
});
