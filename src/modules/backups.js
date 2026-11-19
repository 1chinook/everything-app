const automaticBackupsKey = 'everything-app-backups-v1';
const backupAuxiliaryKeys = [
  'everything-app-language-v1',
  'everything-app-journals-v1',
  'everything-app-projects-v1',
  'everything-app-books-v1',
  'everything-app-curiosity-v1',
  'everything-app-fitness-v1', 'everything-app-relationship-v1',
  'everything-app-sleep-habits-v1', 'everything-app-discover-saved-v1',
  'everything-app-news-archive-v1',
];

function automaticBackups() {
  try {
    const stored = JSON.parse(localStorage.getItem(automaticBackupsKey));
    return Array.isArray(stored) ? stored.filter(entry => entry?.data && typeof entry.created === 'number') : [];
  } catch { return []; }
}

function snapshotExtras() {
  return Object.fromEntries(backupAuxiliaryKeys.map(key => [key, localStorage.getItem(key)]));
}

function createAutomaticBackup(force = false, label = 'Günlük yedek') {
  try {
    const backups = automaticBackups();
    if (!force && backups.some(entry => entry.day === activeDay() && entry.label === label)) return true;
    const snapshot = { id: newId(), created: Date.now(), day: activeDay(), label,
      data: JSON.parse(JSON.stringify(state)), extra: snapshotExtras() };
    backups.unshift(snapshot);
    localStorage.setItem(automaticBackupsKey, JSON.stringify(backups.slice(0, 14)));
    return true;
  } catch { return false; }
}

function backupsPanel() {
  const backups = automaticBackups();
  return `<details class="panel page-panel planning-panel backup-panel">
    <summary>Otomatik yedekler · ${backups.length} kayıt</summary>
    <div class="sync-content">
      <p class="row-meta">Her gün ilk açılışta ve yedek geri alınmadan veya sunucudan veri alınmadan önce kopya oluşturulur. Bu tarayıcıdaki son 14 kopya tutulur.</p>
      <button type="button" class="button secondary" data-backup-action="create">Şimdi yedekle</button>
      <ul class="record-list">${backups.map(entry => `<li class="record-row"><div><strong class="row-title">${escapeText(entry.label)}</strong>
        <small class="row-meta">${new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(entry.created)}</small></div>
        <button type="button" class="button secondary" data-backup-action="download" data-id="${entry.id}">İndir</button>
        <button type="button" class="button secondary" data-backup-action="restore" data-id="${entry.id}">Geri al</button>
      </li>`).join('')}</ul>
      <p id="backup-feedback" class="form-feedback" role="status"></p>
    </div>
  </details>`;
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-backup-action]');
  if (!control) return;
  const { backupAction: action, id } = control.dataset;
  if (action === 'create') {
    const success = createAutomaticBackup(true, 'Elle alınan yedek');
    render();
    const panel = document.querySelector('.backup-panel');
    if (panel) panel.open = true;
    document.querySelector('#backup-feedback').textContent = success ? 'Yedek alındı.' : 'Tarayıcı depolama alanında yedek oluşturulamadı.';
    return;
  }
  const backup = automaticBackups().find(entry => entry.id === id);
  if (!backup) return;
  if (action === 'download') {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...backup.data, backupExtras: backup.extra }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'everything-app-' + backup.day + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (action !== 'restore' || !validPlannerData(backup.data)) return;
  if (!window.confirm('Plan bu yedeğe geri alınsın mı? Mevcut planın da önce yedeklenecek.')) return;
  try {
    restoreLocalBackup(backup.data, backup.extra);
    location.reload();
  } catch {
    document.querySelector('#backup-feedback').textContent = 'Yedek geri alınamadı. Tarayıcı depolama alanını kontrol et.';
  }
});

function validateBackupExtras(extra) {
  if (extra !== undefined && (!extra || typeof extra !== 'object' || Array.isArray(extra))) throw new Error('Ek kayıtlar okunamadı.');
  for (const key of backupAuxiliaryKeys) {
    if (extra?.[key] != null && typeof extra[key] !== 'string') throw new Error('Ek kayıt biçimi geçersiz.');
  }
  const entries = backupAuxiliaryKeys.filter(key => typeof extra?.[key] === 'string');
  const parsed = new Map(entries.map(key => [key, JSON.parse(extra[key])]));
  const fitness = parsed.get('everything-app-fitness-v1');
  const relationship = parsed.get('everything-app-relationship-v1');
  const saved = parsed.get('everything-app-discover-saved-v1');
  const sleep = parsed.get('everything-app-sleep-habits-v1');
  if (fitness && (typeof fitness !== 'object' || Array.isArray(fitness))) throw new Error('Spor yedeği geçersiz.');
  if (relationship && (!Array.isArray(relationship) || relationship.some(entry => !entry || typeof entry.id !== 'string' ||
      typeof entry.title !== 'string' || typeof entry.type !== 'string' || typeof entry.note !== 'string' ||
      typeof entry.day !== 'string' || (entry.day && !/^\d{4}-\d\d-\d\d$/.test(entry.day))))) throw new Error('Kişisel yedek geçersiz.');
  if (saved && (!Array.isArray(saved) || saved.some(item => typeof item !== 'string'))) throw new Error('Kaydedilenler yedeği geçersiz.');
  if (sleep && (!Array.isArray(sleep.habits) || typeof sleep.day !== 'string')) throw new Error('Uyku yedeği geçersiz.');
}

function restoreLocalBackup(data, extra, synchronize = true) {
  validateBackupExtras(extra);
  const original = {...state};
  const writes = [];
  try {
    replacePlannerData(data);
    const updates = [[storageKey, JSON.stringify(state)], ...backupAuxiliaryKeys
      .filter(key => extra && Object.hasOwn(extra, key)).map(key => [key, extra[key]])];
    for (const [key,value] of updates) {
      const previous = localStorage.getItem(key);
      if (value === previous) continue;
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key,value);
      writes.push([key,previous]);
    }
  } catch (error) {
    Object.assign(state,original);
    for (const [key,value] of writes.reverse()) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key,value);
    }
    throw error;
  }
  if (synchronize) noteSyncChange();
}

setInterval(() => { createAutomaticBackup(); }, 60000);
