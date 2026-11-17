function validPlannerData(data) {
  if (!data || typeof data !== 'object') return false;
  const text = value => typeof value === 'string' && value.length <= 1000;
  const range = (value, low, high) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
  const id = value => text(value) && /^[A-Za-z0-9_-]{1,80}$/.test(value);
  const day = value => {
    if (!text(value) || !/^\d{4}-\d\d-\d\d$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  };
  const time = value => text(value) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const optional = (value, check) => value == null || value === '' || check(value);
  const list = (value, check) => Array.isArray(value) && value.every(item => item && id(item.id) && check(item)) &&
    new Set(value.map(item => item.id)).size === value.length;
  const map = (value, keyCheck, valueCheck) => value == null || typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(value).every(([key, item]) => keyCheck(key) && valueCheck(item));
  const boolean = value => typeof value === 'boolean';
  return list(data.events, item => day(item.day) && time(item.time) && optional(item.endTime, time) &&
    text(item.title) && text(item.detail) && ['lesson', 'study', 'workout'].includes(item.kind) && boolean(item.attending) &&
    optional(item.repeat, value => ['once', 'weekly'].includes(value)) && map(item.attendance, day, boolean) &&
    map(item.completion, day, boolean) &&
    (item.assessmentId == null || id(item.assessmentId) && time(item.endTime) && text(item.topic)) &&
    (item.focusPlan == null || boolean(item.focusPlan) && text(item.topic) && time(item.endTime) && ['learn', 'practice'].includes(item.phase)) &&
    optional(item.minutes, value => range(value, 5, 720)) && optional(item.earliest, time) && optional(item.latest, time) &&
    optional(item.place, text) && optional(item.studyDone, boolean)) &&
    list(data.tasks, item => day(item.day) && text(item.title) && ['Normal', 'Öncelikli'].includes(item.priority) &&
      boolean(item.done) && optional(item.course, text) && optional(item.dueTime, time) && optional(item.deadline, boolean) &&
      optional(item.plannedTime, time) && optional(item.plannedEnd, time) &&
      (item.postponements == null || Array.isArray(item.postponements) &&
        item.postponements.every(change => change && day(change.changedOn) && day(change.from) && day(change.to)))) &&
    list(data.grades, item => text(item.title) && range(item.value, 0, 100)) &&
    list(data.documents, item => text(item.name) && optional(item.course, text)) &&
    data.sleep && time(data.sleep.bedtime) && range(data.sleep.duration, 0.5, 24) &&
    (data.assessments == null || list(data.assessments, item => text(item.title) && text(item.course) && day(item.day) && time(item.time) &&
      ['exam', 'deadline', 'midterm', 'quiz', 'final'].includes(item.kind) && range(item.weight, 0, 100) &&
      (item.grade === null || range(item.grade, 0, 100)) && Array.isArray(item.topics) && item.topics.every(text))) &&
    map(data.targets, key => key.startsWith('course:'), value => range(value, 0, 100)) &&
    map(data.courseTopics, key => key.startsWith('course:'), value => Array.isArray(value) &&
      value.every(topic => typeof topic === 'string' && topic.length <= 2500) && value.join('\n').length <= 2500) &&
    map(data.topicMastery, key => key.startsWith('course:'), value => map(value, text,
      level => ['unknown', 'partial', 'known'].includes(level))) &&
    map(data.dailyChecks, day, value => map(value, key => ['steps', 'sleep'].includes(key), boolean)) &&
    (data.planning == null || range(data.planning.travelMinutes, 0, 120) && range(data.planning.breakMinutes, 0, 60) &&
      range(data.planning.mealMinutes, 0, 120) && range(data.planning.dailyStudyMinutes, 30, 720) &&
      Array.isArray(data.planning.meals) && data.planning.meals.length <= 6 && data.planning.meals.every(time)) &&
    (data.focusLogs == null || list(data.focusLogs, item => text(item.title) && text(item.course) && day(item.day) &&
      range(item.planned, 1, 180) && range(item.seconds, 0, 10800)));
}

if (typeof module !== 'undefined') module.exports = { validPlannerData };

const syncStorageKey = 'everything-app-sync-session';
let syncSession;
let syncWorking = false;
let syncMessage = '';
let syncTimer;

function syncPage() {
  const browserFile = location.protocol === 'file:';
  const message = syncMessage || (syncSession ? 'Bağlı. Değişiklikler açık sekmeler arasında eşitlenir.' : 'Henüz bağlanmadı.');
  return `${intro('Eşitleme', 'Bilgisayar ve telefon arasında aynı planı kullan.')}
    <section class="panel page-panel">
      ${panelHeading('Yerel ağ', browserFile ? 'Bu dosyadan yedek al, ardından aşağıdaki sunucu adresinden içe aktar.' : 'Telefonu ve bilgisayarı aynı ağa bağla.')}
      <div class="sync-content">
        <ol class="sync-steps">
          <li>Proje klasöründe <code>node server.js --lan</code> çalıştır.</li>
          <li>Terminaldeki ağ adresini iki cihazda da aç ve eşitleme kodunu gir.</li>
          <li>İlk cihazda <strong>Bu cihazı gönder</strong>, diğerinde <strong>Sunucudan al</strong> seç.</li>
        </ol>
        ${browserFile ? '' : `<form id="sync-form" class="sync-form">
          <label class="field"><span>Eşitleme kodu</span><input name="code" type="password" autocomplete="off" required maxlength="100"></label>
          <div class="sync-actions">
            <button type="submit" class="button primary" value="pull">Sunucudan al</button>
            <button type="submit" class="button secondary" value="push">Bu cihazı gönder</button>
            ${syncSession ? '<button type="button" class="button secondary" data-sync="disconnect">Bağlantıyı kes</button>' : ''}
          </div>
        </form>`}
        <p id="sync-status" class="form-feedback" role="status">${escapeText(message)}</p>
      </div>
    </section>
    <section class="panel page-panel planning-panel">
      ${panelHeading('Yedek', 'Planını JSON olarak indir veya bir yedekten geri al.')}
      <div class="sync-content sync-actions">
        <button type="button" class="button secondary" data-sync="export">Yedeği indir</button>
        <button type="button" class="button secondary" data-sync="import">Yedek seç</button>
        <input type="file" id="backup-input" accept=".json,application/json" hidden>
      </div>
    </section>
    ${backupsPanel()}`;
}

function showSyncMessage(message) {
  syncMessage = message;
  const output = document.querySelector('#sync-status');
  if (output) output.textContent = message;
}

function rememberSyncSession() {
  try {
    if (syncSession) sessionStorage.setItem(syncStorageKey, JSON.stringify(syncSession));
    else sessionStorage.removeItem(syncStorageKey);
  } catch {
    // A restricted browser can keep the connection for the current page.
  }
}

function noteSyncChange() {
  if (!syncSession) return;
  syncSession.dirty = true;
  rememberSyncSession();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncAutomatically, 400);
}

async function syncRequest(code, body) {
  const headers = { Authorization: 'Bearer ' + code };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api/sync', {
    method: body ? 'PUT' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });
  if (response.status === 401) throw new Error('Eşitleme kodu geçersiz veya süresi doldu.');
  if (response.status === 409) throw new Error('Sunucudaki kayıt değişti. Hangi kopyayı kullanacağını Eşitleme ekranından seç.');
  if (!response.ok) throw new Error('Eşitleme sunucusuna ulaşılamadı. Proje klasöründe server.js çalışıyor olmalı.');
  return response.json();
}

function replacePlannerData(data) {
  if (!validPlannerData(data)) throw new Error('Bu yedek Everything App kayıt biçimiyle uyumlu değil.');
  if (!createAutomaticBackup(true, 'Veri değiştirme öncesi')) throw new Error('Mevcut plan yedeklenemedi. Önce JSON yedeğini indir.');
  data = withoutDemoRecords(data);
  Object.assign(state, {
    events: data.events, tasks: data.tasks, grades: data.grades, documents: data.documents, sleep: data.sleep,
    assessments: data.assessments ?? [], targets: data.targets ?? {}, focusLogs: data.focusLogs ?? [], courseTopics: data.courseTopics ?? {},
    topicMastery: data.topicMastery ?? {}, dailyChecks: data.dailyChecks ?? {},
    planning: data.planning ?? { travelMinutes: 20, breakMinutes: 10, mealMinutes: 30, meals: ['08:00', '12:30', '19:00'], dailyStudyMinutes: 180 },
  });
}

function applyRemoteData(data) {
  replacePlannerData(data);
  save('Sunucudaki plan alındı.', false);
  render();
}

async function syncAutomatically() {
  if (!syncSession || syncWorking || document.querySelector('dialog[open]')) return;
  syncWorking = true;
  const session = syncSession;
  try {
    const remote = await syncRequest(session.code);
    if (session !== syncSession) return;
    if (remote.revision !== session.revision) {
      if (session.dirty || !remote.data) {
        showSyncMessage('Kayıtlar farklı. Yerel veya sunucu kopyasını Eşitleme ekranından seç.');
        return;
      }
      if (document.querySelector('dialog[open]')) return;
      applyRemoteData(remote.data);
      session.revision = remote.revision;
    } else if (session.dirty) {
      const snapshot = JSON.stringify(state);
      const result = await syncRequest(session.code, { revision: session.revision, data: JSON.parse(snapshot) });
      session.revision = result.revision;
      session.dirty = snapshot !== JSON.stringify(state);
    }
    rememberSyncSession();
    showSyncMessage('Bağlı. Plan güncel.');
  } catch (error) {
    showSyncMessage(error.message);
  } finally {
    syncWorking = false;
  }
}

async function connectSync(code, direction) {
  if (syncWorking) return;
  syncWorking = true;
  try {
    const remote = await syncRequest(code);
    if (direction === 'pull') {
      if (!remote.data) throw new Error('Sunucuda henüz bir plan yok. İlk cihazdan planı gönder.');
      if (!window.confirm('Bu cihazdaki plan sunucu kopyasıyla değiştirilsin mi?')) return;
      applyRemoteData(remote.data);
      syncSession = { code, revision: remote.revision, dirty: false };
    } else {
      if (remote.data && !window.confirm('Sunucudaki plan bu cihazdaki kopyayla değiştirilsin mi?')) return;
      const snapshot = JSON.stringify(state);
      const result = await syncRequest(code, { revision: remote.revision, data: JSON.parse(snapshot) });
      syncSession = { code, revision: result.revision, dirty: snapshot !== JSON.stringify(state) };
    }
    rememberSyncSession();
    showSyncMessage('Bağlı. Plan güncel.');
    render();
  } catch (error) {
    showSyncMessage(error.message);
  } finally {
    syncWorking = false;
  }
}

function installSyncControls() {
  try {
    if (location.protocol !== 'file:') syncSession = JSON.parse(sessionStorage.getItem(syncStorageKey));
  } catch {
    syncSession = null;
  }
  document.addEventListener('submit', event => {
    if (event.target.id !== 'sync-form') return;
    event.preventDefault();
    const code = new FormData(event.target).get('code').trim();
    connectSync(code, event.submitter?.value ?? 'pull');
  });
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-sync]')?.dataset.sync;
    if (action === 'import') document.querySelector('#backup-input').click();
    if (action === 'disconnect') {
      syncSession = null;
      rememberSyncSession();
      showSyncMessage('Bağlantı kesildi.');
      render();
    }
    if (action === 'export') {
      const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'everything-app-yedek.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  document.addEventListener('change', async event => {
    if (event.target.id !== 'backup-input' || !event.target.files[0]) return;
    try {
      const data = JSON.parse(await event.target.files[0].text());
      if (!validPlannerData(data)) throw new Error('Bu yedek Everything App kayıt biçimiyle uyumlu değil.');
      if (!window.confirm('Bu cihazdaki plan yedek kopyayla değiştirilsin mi?')) return;
      replacePlannerData(data);
      if (data.backupExtras) restoreBackupExtras(data.backupExtras);
      save('Yedek içe aktarıldı.');
      showSyncMessage('Yedek içe aktarıldı.');
      if (data.backupExtras) location.reload();
      else render();
    } catch (error) {
      showSyncMessage(error.message);
    } finally {
      event.target.value = '';
    }
  });
  window.addEventListener('load', syncAutomatically);
  window.addEventListener('focus', syncAutomatically);
  setInterval(syncAutomatically, 12000);
}

if (typeof window !== 'undefined') installSyncControls();
