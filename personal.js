const relationshipKey = 'everything-app-relationship-v1';
const sleepHabitsKey = 'everything-app-sleep-habits-v1';
let relationshipEntries = readPersonal(relationshipKey, []);
let editingRelationship;
let musicPicks = null;
let musicStart;
let musicLoading = false;
let musicMessage = '';

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

function dailyMusicCard() {
  const index = Math.max(0, Math.floor((dateFor(activeDay()).valueOf() - (musicStart ?? 0)) / 86400000));
  const pick = musicPicks?.length ? musicPicks[index % musicPicks.length] : null;
  const detail = pick
    ? `<strong>${escapeText(pick.title)}</strong><p class="row-meta">${escapeText(pick.artist)} · Spotify dinlemelerine göre seçilen listeden</p>
      <a class="button secondary" href="${escapeText(pick.url)}" target="_blank" rel="noopener noreferrer">Spotify’da aç</a>`
    : `<p class="row-meta">${escapeText(musicMessage || 'Spotify önerileri yükleniyor.')}</p>`;
  return `<section class="panel planning-panel" id="daily-music" data-day="${activeDay()}">${panelHeading('Günün müziği')}<div class="sync-content">${detail}</div></section>`;
}

async function refreshDailyMusic() {
  if (musicLoading || musicPicks || !document.querySelector('#daily-music')) return;
  musicLoading = true;
  try {
    if (location.protocol === 'file:') throw new Error('local');
    const response = await fetch('/api/music', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('music');
    const { tracks, start } = await response.json();
    musicStart = dateFor(start).valueOf();
    musicPicks = tracks.filter(track => typeof track.title === 'string' && typeof track.artist === 'string' &&
      /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+(?:\?|$)/.test(track.url));
    if (!musicPicks.length) musicMessage = 'Kişisel öneri listesi bu cihazda yok.';
  } catch {
    musicMessage = 'Bu bilgisayarda node server.js çalıştırıp http://127.0.0.1:4173 adresini aç. Günlük Spotify önerisini ChatGPT’de de alırsın.';
  } finally {
    musicLoading = false;
    const card = document.querySelector('#daily-music');
    if (card) card.outerHTML = dailyMusicCard();
  }
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
