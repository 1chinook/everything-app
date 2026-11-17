const relationshipKey = 'everything-app-relationship-v1';
let relationshipEntries = readPersonal(relationshipKey, []);
let editingRelationship;

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

