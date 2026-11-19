let scenarioCourse;
const scenarioEstimates = new Map();

function scenarioCourses() {
  const titles = new Map(enrolledCourseNames().map((title) => [courseKey(title), title]));
  for (const entry of state.assessments) titles.set(courseKey(entry.course), canonicalCourse(entry.course));
  return titles;
}

function scenarioEntries(courseName) {
  const entries = state.assessments
    .filter(entry => courseKey(entry.course) === courseKey(courseName) && (entry.weight || gradeType(entry.kind)))
    .map(entry => ({ ...entry }));
  for (const [kind, type] of Object.entries(gradeTypes)) {
    if (!entries.some(entry => entry.kind === kind)) {
      entries.push({ id: 'scenario-' + kind, title: type.label, kind, weight: type.weight, grade: null });
    }
  }
  return entries;
}

function evaluateGradeScenario(courseName, estimates = {}) {
  const entries = scenarioEntries(courseName);
  const { total, weightFor } = gradeWeights(entries);
  if (total > 100.00001) return { error: 'Bu derste kayıtlı diğer ağırlıklarla vize, kısa sınav ve final toplamı %100’ü geçiyor. Önce değerlendirme ağırlıklarını kontrol et.' };
  let projected = 0;
  let nonFinal = 0;
  let finalWeight = 0;
  let finalEarned = 0;
  for (const entry of entries) {
    const estimate = estimates[entry.id];
    const grade = entry.grade === null
      ? (Number.isFinite(estimate) ? Math.min(100, Math.max(0, estimate)) : passingScore)
      : entry.grade;
    const weight = weightFor(entry);
    projected += grade * weight / 100;
    if (entry.kind === 'final') {
      if (entry.grade === null) finalWeight += weight;
      else finalEarned += grade * weight / 100;
    } else {
      nonFinal += grade * weight / 100;
    }
  }
  const finalRequired = finalWeight ? Math.max(0, (passingScore - nonFinal - finalEarned) * 100 / finalWeight) : null;
  return { entries, weightFor, projected, finalRequired, finalWeight };
}

function scenarioResult(result) {
  if (result.error) return '<p class="form-feedback">' + escapeText(result.error) + '</p>';
  const letter = courseResult(result.projected).letter;
  const minimum = result.finalRequired === null ? null : Math.ceil(result.finalRequired * 10 - 0.00001) / 10;
  let required;
  if (minimum === null) required = 'Final notu kayıtlı. Tahmini dönem puanı ' + (result.projected >= passingScore ? '60 eşiğini karşılıyor.' : '60’ın altında.');
  else if (minimum > 100) required = 'Bu senaryoda finalden 100 alınsa bile 60’a ulaşılamıyor.';
  else required = 'Bu senaryoda final / bütünlemeden en az ' + formatGrade(minimum) + '/100 gerekiyor.';
  return '<p class="passing-line">' + required + '</p><p class="row-meta">Seçtiğin notlarla dönem puanı ' +
    formatGrade(courseResult(result.projected).score) + '/100 · Tahmini harf ' + letter + '</p>';
}

function scenarioInputs(courseName) {
  const key = courseKey(courseName);
  const estimates = scenarioEstimates.get(key) ?? {};
  const result = evaluateGradeScenario(courseName, estimates);
  if (result.error) return scenarioResult(result);
  const pending = result.entries.filter(entry => entry.grade === null);
  const fixed = result.entries.filter(entry => entry.grade !== null)
    .map(entry => escapeText(entry.title || assessmentType(entry)) + ' ' + formatGrade(entry.grade) + '/100');
  return (fixed.length ? '<p class="row-meta">Kayıtlı notlar · ' + fixed.join(' · ') + '</p>' : '') +
    pending.map(entry => {
      const value = estimates[entry.id] ?? passingScore;
      return '<label class="field"><span>' + escapeText(entry.title || assessmentType(entry)) +
        ' · %' + formatGrade(result.weightFor(entry)) + ' · <output data-scenario-value="' +
        escapeText(entry.id) + '">' + value + '</output>/100</span><input type="range" min="0" max="100" step="1" value="' +
        value + '" data-scenario-grade="' + escapeText(entry.id) + '" aria-label="' +
        escapeText(entry.title || assessmentType(entry)) + ' tahmini"></label>';
    }).join('') + '<div id="scenario-result" role="status" aria-live="polite">' + scenarioResult(result) + '</div>';
}

function gradeScenarios() {
  const courses = scenarioCourses();
  const selected = courses.has(scenarioCourse) ? scenarioCourse : courses.has(activeGradeCourse) ? activeGradeCourse : courses.keys().next().value;
  scenarioCourse = selected;
  const title = courses.get(selected);
  return '<details class="panel page-panel planning-panel"><summary class="panel-heading">Sınav senaryosu</summary>' +
    '<div class="sync-content form-fields"><p class="row-meta">Girilmemiş notları tahmin ederek geçmek için gereken finali gör. Bu değerler kaydedilmiş notlarını değiştirmez.</p>' +
    '<label class="field"><span>Ders</span><select id="scenario-course">' +
    [...courses].map(([key, name]) => '<option value="' + escapeText(key) + '"' + (key === selected ? ' selected' : '') + '>' +
      escapeText(name) + '</option>').join('') +
    '</select></label><div id="scenario-inputs" class="form-fields">' + scenarioInputs(title) + '</div></div></details>';
}

document.addEventListener('change', event => {
  if (event.target.id !== 'scenario-course') return;
  scenarioCourse = event.target.value;
  const course = scenarioCourses().get(scenarioCourse);
  if (course) document.querySelector('#scenario-inputs').innerHTML = scenarioInputs(course);
});

document.addEventListener('input', event => {
  const id = event.target.dataset.scenarioGrade;
  if (!id) return;
  const course = scenarioCourses().get(scenarioCourse);
  if (!course) return;
  const estimates = scenarioEstimates.get(scenarioCourse) ?? {};
  estimates[id] = Number(event.target.value);
  scenarioEstimates.set(scenarioCourse, estimates);
  const root = document.querySelector('#scenario-inputs');
  for (const output of root.querySelectorAll('[data-scenario-value]')) {
    if (output.dataset.scenarioValue === id) output.textContent = event.target.value;
  }
  document.querySelector('#scenario-result').innerHTML = scenarioResult(evaluateGradeScenario(course, estimates));
});
