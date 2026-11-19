const relationshipKey = 'everything-app-relationship-v1';
const sleepHabitsKey = 'everything-app-sleep-habits-v1';
let relationshipEntries = readPersonal(relationshipKey, []);
let editingRelationship;
let musicLoading = false;
let musicMessage = '';
let musicStatus;
let musicCheckedAt = 0;

function readPersonal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writePersonal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

function relationshipPage() {
  const record = relationshipEntries.find(entry => entry.id === editingRelationship);
  const records = [...relationshipEntries].sort((a, b) => (a.day || '9999').localeCompare(b.day || '9999'));
  return `${intro('Birlikte planlar', 'Birlikte yapacaklarınızı, özel günleri ve fikirleri kaydet.')}
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
    ['room', 'Odayı serin, karanlık ve sessiz tut.'],
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
  const pick = musicStatus?.track ?? null;
  const detail = pick
    ? `<strong>${escapeText(pick.title)}</strong><p class="row-meta">${escapeText(pick.artist)} · ${escapeText(pick.reason || 'Spotify keşif önerisi')}</p>
      <div class="sync-actions"><a class="button secondary" href="${escapeText(pick.url)}" target="_blank" rel="noopener noreferrer">Spotify’da aç</a><button class="button secondary" data-music-discover data-reject="${escapeText(pick.id ?? '')}" ${musicLoading?'disabled':''}>Bunu biliyorum · Değiştir</button></div>`
    : `<p class="row-meta">${escapeText(musicStatus?.message || musicMessage || 'Spotify önerileri yükleniyor.')}</p>`;
  const setup = musicStatus?.configured && !musicStatus.connected
    ? '<a class="button secondary" href="/api/music/connect">Spotify’a bağlan</a>'
    : musicStatus?.configured === false ? `<details class="preference">
      <summary>Spotify otomasyonunu kur</summary>
      <ol class="sync-steps"><li><a class="text-link" href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Spotify Developer Dashboard ↗</a> üzerinden bir uygulama oluştur.</li>
      <li>Redirect URI olarak <code>http://127.0.0.1:4173/api/music/callback</code> adresini ekle.</li>
      <li>Proje klasöründe <code>spotify-config.local.json</code> dosyası oluştur ve içine <code>{"clientId":"..."} </code> yaz.</li>
      <li>Sunucuyu yeniden başlat ve Spotify’a bağlan.</li></ol></details>` : '';
  const notice = pick ? musicStatus?.message : '';
  const preferences = musicStatus?.connected ? `<details class="books-section" ${!pick?'open':''}><summary>Keşif türleri</summary><form id="music-genres-form" class="sync-form books-section">${field('Sevdiğin türler (virgülle ayır)',`<input name="genres" maxlength="480" value="${escapeText((musicStatus.genres ?? []).join(', '))}" placeholder="alternative rock, indie rock, jazz">`)}<p class="row-meta">Boş bırakırsan Spotify’ın sağladığı türler kullanılır. Sevdiğin sanatçıların farklı parçalarıyla bu türlerden keşifler dönüşümlü sunulur.</p><button class="button secondary" type="submit" ${musicLoading?'disabled':''}>Kaydet ve yeni parça bul</button></form></details>` : '';
  return `<section class="panel planning-panel" id="daily-music" data-day="${activeDay()}">${panelHeading('Günün müziği')}<div class="sync-content">${detail}${preferences}
    ${setup}${notice ? `<p class="row-meta">${escapeText(notice)}</p>` : ''}<p id="music-action-feedback" class="row-meta" role="status"></p></div></section>`;
}

async function requestMusicDiscovery(body, control) {
  if (musicLoading) return;
  musicLoading=true;
  control.disabled=true;
  const feedback=document.querySelector('#music-action-feedback');
  feedback.textContent='Yeni bir sanatçı aranıyor…';
  try {
    const response=await fetch('/api/music/discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
    if(!response.ok) throw Object.assign(new Error('music'),{status:response.status});
    const data=await response.json();
    if(data.track && !/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(data.track.url ?? '')) throw new Error('track');
    musicStatus={...data,genres:Array.isArray(data.genres)?data.genres:[]};
    musicCheckedAt=Date.now();
    musicMessage=data.track?'':'Henüz uygun bir keşif bulunamadı.';
    musicLoading=false;
    const card=document.querySelector('#daily-music');
    if(card)card.outerHTML=dailyMusicCard();
  } catch(error) {
    feedback.textContent=error.status===404
      ? 'Eski sunucu sürümü çalışıyor. Proje klasöründeki restart-app.vbs dosyasını açıp bu sayfayı yenile.'
      : error.status===400 ? 'Keşif türleri geçersiz. En fazla 8 türü virgülle ayırarak gir.'
      : error.status===403 ? 'Bu işlem yalnızca uygulamanın bu bilgisayardaki 127.0.0.1 adresinde kullanılabilir.'
      : 'Öneri isteği tamamlanamadı. Bağlantını kontrol edip tekrar dene.';
  } finally {musicLoading=false;control.disabled=false;}
}

document.addEventListener('click',event=> {
  const control=event.target.closest('[data-music-discover]');
  if(control)void requestMusicDiscovery({rejectId:control.dataset.reject || undefined},control);
});
document.addEventListener('submit',event=> {
  if(event.target.id!=='music-genres-form')return;
  event.preventDefault();
  const genres=new FormData(event.target).get('genres').split(',').map(g=>g.trim()).filter(Boolean);
  if(genres.length>8 || genres.some(g=>g.length>60)) {
    document.querySelector('#music-action-feedback').textContent='En fazla 8 tür gir. Her tür en fazla 60 karakter olabilir.';
    return;
  }
  void requestMusicDiscovery({genres},event.target.querySelector('[type="submit"]'));
});

async function refreshDailyMusic() {
  if (musicLoading || Date.now() - musicCheckedAt < 55000 || !document.querySelector('#daily-music')) return;
  musicLoading = true;
  musicCheckedAt = Date.now();
  try {
    if (location.protocol === 'file:') throw new Error('local');
    const response = await fetch('/api/music', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('music');
    const { track, configured, connected, message, genres } = await response.json();
    const isTrack = value => value && typeof value.title === 'string' && typeof value.artist === 'string' &&
      /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+(?:\?|$)/.test(value.url);
    musicStatus = { track: isTrack(track) ? track : null, configured, connected, message, genres: Array.isArray(genres)?genres:[] };
    musicMessage = connected ? 'Bugünkü parça henüz hazır değil.' : 'Spotify bağlantısı bekleniyor.';
  } catch {
    musicMessage = 'Bu bilgisayarda node server.js çalıştırıp http://127.0.0.1:4173 adresini aç.';
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
  void refreshDailyMusic();
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
