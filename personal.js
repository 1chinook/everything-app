const relationshipKey = 'everything-app-relationship-v1';
let relationshipEntries = readPersonal(relationshipKey, []);
let editingRelationship;

const sleepHabitsKey = 'everything-app-sleep-habits-v1';
function readPersonal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writePersonal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

function relationshipPage() {
  const record = relationshipEntries.find(entry => entry.id === editingRelationship);
  const records = [...relationshipEntries].sort((a, b) => (a.day || '9999').localeCompare(b.day || '9999'));
  return `${intro('Kız arkadaş', 'Birlikte yapacaklarınızı, özel günleri ve fikirleri kaydet.')}
    <section class="panel page-panel">
      ${panelHeading(record ? 'Kaydı düzenle' : 'Yeni kayıt', 'Bu sekmedeki kayıtlar bu tarayıcıda tutulur.')}
      <form id="relationship-form" class="sync-content form-fields">
        <div class="time-fields">${inputField('Başlık', 'title', record?.title, 'maxlength="100" required')}
        ${inputField('Tarih (isteğe bağlı)', 'day', record?.day, 'type="date"')}</div>
        ${field('Tür', `<select name="type">${['Buluşma', 'Özel gün', 'Fikir', 'Not'].map(type => `<option ${type === record?.type ? 'selected' : ''}>${type}</option>`).join('')}</select>`)}
        ${field('Not', `<textarea name="note" maxlength="500" rows="3">${escapeText(record?.note ?? '')}</textarea>`)}
        <div class="sync-actions"><button class="button primary" type="submit">Kaydet</button>
        ${record ? '<button type="button" class="button secondary" data-relationship="cancel">Vazgeç</button>' : ''}</div>
      </form>
    </section>
    <section class="panel page-panel planning-panel">${panelHeading('Birlikte planlar')}
      ${records.length ? `<ul class="record-list">${records.map(entry => `<li class="record-row planning-row">
        <div><strong class="row-title">${escapeText(entry.title)}</strong><small class="row-meta">${escapeText(entry.type)}${entry.day ? ` · ${dayFormat.format(dateFor(entry.day))}` : ''}</small>
        ${entry.note ? `<small class="row-meta">${escapeText(entry.note)}</small>` : ''}</div>
        <button type="button" class="button secondary" data-relationship="edit" data-id="${escapeText(entry.id)}">Düzenle</button>
        <button type="button" class="button danger" data-relationship="delete" data-id="${escapeText(entry.id)}">Sil</button>
      </li>`).join('')}</ul>` : empty('Henüz bir plan eklemedin.')}
    </section>`;
}

document.addEventListener('submit', event => {
  if (event.target.id !== 'relationship-form') return;
  event.preventDefault();
  const data = new FormData(event.target);
  const title = data.get('title').trim();
  if (!title) return;
  const fields = { title, type: data.get('type'), day: data.get('day'), note: data.get('note').trim() };
  const record = relationshipEntries.find(entry => entry.id === editingRelationship);
  if (record) Object.assign(record, fields);
  else relationshipEntries.push({ id: newId(), ...fields });
  editingRelationship = undefined;
  if (!writePersonal(relationshipKey, relationshipEntries)) status.textContent = 'Plan bu sekmede açık kaldığı sürece kullanılabilir.';
  render();
});

setInterval(() => {
  const card = document.querySelector('#daily-music');
  if (card && musicPicks && card.dataset.day !== activeDay()) card.outerHTML = dailyMusicCard();
}, 60000);

document.addEventListener('click', event => {
  const button = event.target.closest('[data-relationship]');
  if (!button) return;
  const { relationship: action, id } = button.dataset;
  if (action === 'delete') {
    if (!window.confirm('Bu kayıt silinsin mi?')) return;
    relationshipEntries = relationshipEntries.filter(entry => entry.id !== id);
    writePersonal(relationshipKey, relationshipEntries);
  }
  editingRelationship = action === 'edit' ? id : undefined;
  render();
  if (editingRelationship) document.querySelector('#relationship-form input')?.focus();
});

function sleepQuality(sleep) {
  const windDown = clockLabel((clockMinutes(sleep.bedtime) + 1410) % 1440);
  const saved = readPersonal(sleepHabitsKey, {});
  const habits = saved.day === activeDay() ? saved.habits : [];
  const suggestions = [
    ['routine', `Hafta sonu da dahil olmak üzere ${sleep.bedtime} yatış ve ${sleep.wake} kalkış düzenine yakın kal.`],
    ['screen', `${windDown} civarında ekranları kapatıp düşük ışığa geç.`],
    ['caffeine', 'Kahve, çay ve enerji içeceklerindeki kafeini öğleden sonraya ve akşama bırakma.'],
    ['room', 'Odayı serin, karanlık ve sessiz tut. Yurtta gerekiyorsa göz maskesi kullan veya oda arkadaşınla sessizlik saatini konuş.'],
    ['meal', 'Yatmaya yakın büyük öğünlerden kaçın.'],
  ];
  return `<section class="panel page-panel planning-panel">
    ${panelHeading('Uyku kalitesi', 'Bu akşam uyguladıklarını işaretle. Liste her gün yenilenir.')}
    <ul class="record-list">${suggestions.map(([id, label]) => `<li class="record-row"><label>
      <input type="checkbox" data-sleep-habit="${id}" ${habits.includes(id) ? 'checked' : ''}><span class="row-title">${label}</span>
    </label></li>`).join('')}</ul>
    <p class="sleep-note"><a class="text-link" href="https://www.cdc.gov/sleep/about/" target="_blank" rel="noopener noreferrer">CDC uyku alışkanlıkları ↗</a></p>
  </section>`;
}

document.addEventListener('change', event => {
  const habit = event.target.dataset.sleepHabit;
  if (!habit) return;
  const day = activeDay();
  const saved = readPersonal(sleepHabitsKey, {});
  const habits = new Set(saved.day === day ? saved.habits : []);
  if (event.target.checked) habits.add(habit);
  else habits.delete(habit);
  writePersonal(sleepHabitsKey, { day, habits: [...habits] });
});
