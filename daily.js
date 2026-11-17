function dailyControls() {
  const day = selectedDay;
  const workouts = eventsForDay(day).filter(event => event.kind === 'workout');
  const studies = eventsForDay(day).filter(event => event.kind === 'study');
  const lessons = eventsForDay(day).filter(event => event.kind === 'lesson');
  const log = fitnessData.logs?.[day] ?? {};
  const steps = fitnessStepTarget(fitnessData.profile?.baseline, 1);
  const checks = state.dailyChecks[day] ?? {};
  const check = (key, label, checked, extra = '') => `<label class="daily-control">
    <input type="checkbox" data-daily-check="${key}" ${checked ? 'checked' : ''} ${extra}><span>${escapeText(label)}</span></label>`;
  return `<section class="panel daily-checks">
    ${panelHeading('Günlük kontrol', '', '<a class="text-link" href="#calisma">Çalışma planı</a>')}
    <div class="daily-control-grid">
      <div>${lessons.length ? lessons.map(lesson => `<label class="daily-control"><input type="checkbox" data-event="${escapeText(lesson.id)}" ${lesson.attending ? 'checked' : ''}><span>${escapeText(lesson.title)} · Katılacağım</span></label>`).join('') : '<a class="text-link" href="#program">Ders programını gir</a>'}</div>
      <div>${studies.length ? studies.map(study => `<label class="daily-control"><input type="checkbox" data-daily-study="${escapeText(study.id)}" ${study.studyDone ? 'checked' : ''}><span>${escapeText(study.title)}</span></label>`).join('') : '<a class="text-link" href="#calisma">Çalışma oturumu planla</a>'}</div>
      <div>${workouts.length ? workouts.map(workout => `<label class="daily-control"><input type="checkbox" data-workout="${escapeText(workout.id)}" ${workout.done ? 'checked' : ''}><span>${escapeText(workout.title)}</span></label>`).join('') : '<a class="text-link" href="#spor">Antrenman planla</a>'}</div>
      <div>
        ${check('steps', steps ? `Adım hedefi ${steps} · Kaydedilen ${log.steps ?? '—'}` : 'Günlük yürüyüş', checks.steps)}
        ${check('sleep', `Uyku hedefi ${state.sleep.duration} saat`, checks.sleep)}
      </div>
    </div>
  </section>`;
}

document.addEventListener('change', event => {
  const { dailyCheck, dailyStudy } = event.target.dataset;
  if (!dailyCheck && !dailyStudy) return;
  if (dailyStudy) {
    const study = state.events.find(entry => entry.id === dailyStudy && entry.day === selectedDay && entry.kind === 'study');
    if (!study) return;
    study.studyDone = event.target.checked;
  } else {
    state.dailyChecks[selectedDay] ??= {};
    state.dailyChecks[selectedDay][dailyCheck] = event.target.checked;
  }
  save('Günlük kontrol kaydedildi.');
  render();
  document.querySelector(dailyStudy ? `[data-daily-study="${dailyStudy}"]` : `[data-daily-check="${dailyCheck}"]`)?.focus();
});
