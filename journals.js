const journalsKey = 'everything-app-journals-v1';
const journalKinds = { payments:'Ödemeler', games:'Oyun günlüğü', memories:'Anı haritası', music:'Müzik keşif günlüğü', experiences:'Deneyim listesi', challenges:'Fotoğraf temaları', language:'Dil pratiği' };
const experienceStages = { planned:'Yapmak istiyorum', active:'Hazırlanıyorum', done:'Tamamladım' };
const photoThemes = ['Işık ve gölge', 'Günlük bir ayrıntı', 'Yansımalar', 'Kampüste hayat', 'Tek bir renk', 'Hareket', 'Simetri', 'Eski ve yeni', 'Doğadaki desenler', 'Gece', 'Bir hikâye anlat', 'Sade bir kare'];
const paymentPeriods = { once:'Tek sefer', monthly:'Aylık', yearly:'Yıllık' };
const gameStages = { planned:'Oynayacağım', playing:'Oynuyorum', paused:'Ara verdim', finished:'Bitirdim' };
let journalKind = 'payments';
let journalEditId = null;
let journalEditing = false;
let journalMessage = '';
let journalMapId = null;
let journalQuery = '';
let journalBusy = false;
let journalStandalone = false;

function readJournals() {
  try {
    const records = JSON.parse(localStorage.getItem(journalsKey));
    return Array.isArray(records) ? records.filter(r=>r && typeof r.id === 'string' && typeof r.title === 'string' && Object.hasOwn(journalKinds,r.kind)) : [];
  } catch { return []; }
}
let journalRecords = readJournals();

function saveJournals(records, message = 'Kaydedildi.') {
  try {
    localStorage.setItem(journalsKey,JSON.stringify(records));
    journalRecords = records;
    journalMessage = message;
    return true;
  } catch {
    journalMessage = 'Kaydedilemedi. Tarayıcı depolama alanı dolmuş olabilir. Fotoğrafı küçültüp tekrar deneyebilirsin.';
    const feedback = document.querySelector('#journal-feedback');
    if (feedback) feedback.textContent = journalMessage;
    return false;
  }
}

function journalInput(label,name,value='',attributes='') {
  return field(label,`<input name="${name}" value="${escapeText(value ?? '')}" ${attributes}>`);
}
function journalSelect(label,name,options,value) {
  return field(label,`<select name="${name}">${Object.entries(options).map(([key,text])=>`<option value="${escapeText(key)}" ${key===value ? 'selected' : ''}>${escapeText(text)}</option>`).join('')}</select>`);
}
function journalNotes(value='') {
  return field('Notların',`<textarea name="notes" rows="3" maxlength="4000">${escapeText(value)}</textarea>`);
}

function journalEditor(record) {
  const titleLabels={music:'Şarkı adı',games:'Oyun adı',payments:'Ödeme veya abonelik adı',memories:'Anının başlığı',experiences:'Denemek istediğin deneyim',challenges:'Fotoğraf teması'};
  let fields = journalInput(titleLabels[journalKind],'title',record?.title,'required maxlength="160"');
  if (journalKind==='payments') fields += `<div class="time-fields">${journalInput('Tutar','amount',record?.amount,'type="number" required min="0.01" max="10000000" step="0.01"')}${journalSelect('Para birimi','currency',{TRY:'TL',USD:'USD',EUR:'EUR'},record?.currency ?? 'TRY')}</div>` +
    journalSelect('Tekrar','period',paymentPeriods,record?.period ?? 'monthly') + journalInput('Sonraki ödeme tarihi','day',record?.day ?? curiosityDay(),'type="date" required') +
    journalSelect('Durum','paymentStatus',{active:'Aktif',inactive:'Pasif'},record?.paymentStatus ?? 'active');
  if (journalKind==='games') fields += journalInput('Platform','platform',record?.platform,'maxlength="100" placeholder="PC, PlayStation…"') + journalSelect('Durum','stage',gameStages,record?.stage ?? 'planned') +
    `<div class="time-fields">${journalInput('İlerleme (%)','progress',record?.progress ?? 0,'type="number" required min="0" max="100" step="1"')}${journalInput('Toplam oynama süresi (saat)','hours',record?.hours ?? 0,'type="number" required min="0" max="100000" step="0.1"')}</div>` +
    journalSelect('Puanın','rating',{'':'Puanlamadım',1:'1 / 5',2:'2 / 5',3:'3 / 5',4:'4 / 5',5:'5 / 5'},String(record?.rating ?? ''));
  if (journalKind==='memories') fields += journalInput('Tarih','day',record?.day ?? curiosityDay(),'type="date" required') + journalInput('Yer','place',record?.place,'maxlength="180" placeholder="Şehir, kampüs veya bir mekân"') +
    `<details class="books-section"><summary>Haritada işaretle (isteğe bağlı)</summary><p class="row-meta">Konumun enlem ve boylamını gir. Örneğin bir mekânın koordinatlarını haritadan kopyalayabilirsin.</p><div class="time-fields">${journalInput('Enlem','latitude',record?.latitude,'type="number" min="-85" max="85" step="any"')}${journalInput('Boylam','longitude',record?.longitude,'type="number" min="-180" max="180" step="any"')}</div></details>` +
    field('Fotoğraf (isteğe bağlı, en fazla 800 KB)','<input name="photo" type="file" accept="image/jpeg,image/png,image/webp">') +
    (record?.photo ? '<label class="daily-control"><input type="checkbox" name="removePhoto">Mevcut fotoğrafı kaldır</label>' : '');
  if (journalKind==='music') fields += journalInput('Sanatçı','artist',record?.artist,'required maxlength="160"') + journalInput('Keşif tarihi','day',record?.day ?? curiosityDay(),'type="date" required') +
    journalInput('O sırada nasıl hissediyordun?','mood',record?.mood,'maxlength="120" placeholder="Sakin, heyecanlı, yolculukta…"') + journalInput('Nerede keşfettin?','source',record?.source,'maxlength="180" placeholder="Bir arkadaş, film, çalma listesi…"') +
    journalInput('Dinleme bağlantısı','url',record?.url,'type="url" maxlength="1500" placeholder="https://open.spotify.com/track/…"');
  if (journalKind==='experiences') fields += journalInput('Hedef yıl','year',record?.year ?? Number(curiosityDay().slice(0,4)),'type="number" min="1900" max="2200" required') +
    journalSelect('Durum','stage',experienceStages,record?.stage ?? 'planned') + journalInput('Yer','place',record?.place,'maxlength="180"') +
    journalInput('Tamamlanma tarihi (tamamladığında gerekli)','day',record?.day,'type="date"');
  if (journalKind==='challenges') fields += journalInput('Başlangıç','day',record?.day ?? curiosityDay(),'type="date" required') + journalInput('Son gün','endDay',record?.endDay ?? shiftDay(curiosityDay(),6),'type="date" required');
  return `<section class="panel page-panel">${panelHeading(record ? 'Kaydı düzenle' : 'Yeni kayıt')}<form id="journal-editor-form" class="journal-body sync-form">${fields}${journalNotes(record?.notes)}
    <div class="sync-actions"><button class="button primary" type="submit">Kaydet</button><button class="button secondary" type="button" data-journal="cancel">Vazgeç</button></div></form></section>`;
}

function journalMoney(amount,currency) { return new Intl.NumberFormat('tr-TR',{style:'currency',currency}).format(amount); }

function journalDate(day) {
  return new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
}

function paymentNextDate(record) {
  const date = new Date(record.day+'T12:00:00Z');
  const anchor = record.anchorDay ?? date.getUTCDate();
  const month = date.getUTCMonth()+(record.period==='yearly' ? 12 : 1);
  const last = new Date(Date.UTC(date.getUTCFullYear(),month+1,0,12)).getUTCDate();
  return new Date(Date.UTC(date.getUTCFullYear(),month,Math.min(anchor,last),12)).toISOString().slice(0,10);
}

function paymentSummary(records) {
  const active = records.filter(r=>r.paymentStatus==='active');
  const totals = ['TRY','USD','EUR'].map(currency=> {
    const total = active.filter(r=>r.currency===currency && r.period!=='once').reduce((sum,r)=>sum+r.amount/(r.period==='yearly'?12:1),0);
    return total ? journalMoney(total,currency) : '';
  }).filter(Boolean);
  const soon = active.filter(r=>r.day<=shiftDay(curiosityDay(),7)).length;
  return `<div class="panel journal-summary"><strong>Aylık abonelik karşılığı · ${totals.join(' + ') || 'Henüz abonelik yok'}</strong><p class="row-meta">Yıllık ücretler 12 aya bölünür. ${soon} ödeme gecikmiş veya önümüzdeki 7 gün içinde.</p></div>`;
}

function journalMap(record) {
  if (record.latitude==null || record.longitude==null) return record.place ? `<a href="https://www.openstreetmap.org/search?query=${encodeURIComponent(record.place)}" target="_blank" rel="noopener noreferrer">Yeri haritada ara</a>` : '';
  const lat=record.latitude,lon=record.longitude;
  const bbox=[Math.max(-180,lon-.02),Math.max(-85,lat-.02),Math.min(180,lon+.02),Math.min(85,lat+.02)].join(',');
  return `<button class="button secondary" data-journal="map" data-id="${escapeText(record.id)}">${journalMapId===record.id ? 'Haritayı kapat' : 'Haritada göster'}</button>
    ${journalMapId===record.id ? `<iframe class="journal-map" title="${escapeText(record.title)} konumu" loading="lazy" referrerpolicy="no-referrer" src="https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}"></iframe>` : ''}`;
}

function journalCard(record) {
  let detail='';
  if (record.kind==='payments') detail=`<strong>${journalMoney(record.amount,record.currency)}</strong><p class="row-meta">${paymentPeriods[record.period]} · ${record.paymentStatus==='active' ? 'Aktif' : 'Pasif'}</p><p class="${record.paymentStatus==='active' && record.day<curiosityDay() ? 'journal-overdue' : 'row-meta'}">${record.paymentStatus==='inactive' ? 'Son ödeme tarihi' : 'Sonraki ödeme'} · ${journalDate(record.day)}</p>
    ${record.paymentStatus==='active' ? `<button class="button secondary" data-journal="paid" data-id="${escapeText(record.id)}">Ödendi olarak işaretle</button>` : ''}
    ${(record.payments ?? []).length ? `<details><summary>Ödeme geçmişi (${record.payments.length})</summary><ul class="books-log">${[...record.payments].reverse().map(p=>`<li>${journalDate(p.due)} · ${journalMoney(p.amount,p.currency)} · ${journalDate(p.paid)} tarihinde işlendi</li>`).join('')}</ul></details>` : ''}`;
  if (record.kind==='games') detail=`<p class="row-meta">${gameStages[record.stage]}${record.platform ? ' · '+escapeText(record.platform) : ''}</p><p>%${record.progress} · ${record.hours} saat${record.rating ? ' · '+record.rating+' / 5' : ''}</p><progress value="${record.progress}" max="100" aria-label="Oyun ilerlemesi"></progress>`;
  if (record.kind==='memories') detail=`<p class="row-meta">${journalDate(record.day)}${record.place ? ' · '+escapeText(record.place) : ''}</p>${/^data:image\/(jpeg|png|webp);base64,/.test(record.photo ?? '') ? `<img class="journal-photo" src="${escapeText(record.photo)}" alt="${escapeText(record.title)}" loading="lazy">` : ''}${journalMap(record)}`;
  if (record.kind==='music') detail=`<p>${escapeText(record.artist)}</p><p class="row-meta">${journalDate(record.day)}${record.mood ? ' · '+escapeText(record.mood) : ''}</p>${record.source ? `<p class="row-meta">${escapeText(record.source)}</p>` : ''}${record.url && /^https?:\/\//i.test(record.url) ? `<a class="button secondary" href="${escapeText(record.url)}" target="_blank" rel="noopener noreferrer">Dinle</a>` : ''}`;
  if (record.kind==='experiences') detail=`<p class="row-meta">${record.year} · ${experienceStages[record.stage]}${record.place ? ' · '+escapeText(record.place):''}</p>${record.day ? `<p class="row-meta">${journalDate(record.day)}</p>`:''}${record.stage==='done' ? `<button class="button secondary" data-journal="memory" data-id="${escapeText(record.id)}">${journalRecords.some(r=>r.originExperience===record.id)?'Anı haritasına aktarıldı':'Anı haritasına aktar'}</button>`:''}`;
  if (record.kind==='challenges') detail=`<p class="row-meta">${journalDate(record.day)} – ${journalDate(record.endDay)}</p><p class="row-meta">${(record.photos??[]).length} fotoğraf</p>
    <div class="photo-series">${(record.photos??[]).map(photo=>`<figure><img class="journal-photo" src="${escapeText(photo.image)}" alt="${escapeText(photo.caption||record.title)}" loading="lazy"><figcaption>${escapeText(photo.caption)}</figcaption><button class="button secondary" data-journal="delete-photo" data-id="${escapeText(record.id)}" data-photo="${escapeText(photo.id)}">Fotoğrafı sil</button></figure>`).join('')}</div>
    <details><summary>Seriye fotoğraf ekle</summary><form class="sync-form books-section" data-photo-series="${escapeText(record.id)}">${field('Fotoğraf (JPEG, PNG, WebP · en fazla 800 KB)','<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required>')}${journalInput('Fotoğrafın hikâyesi','caption','','maxlength="500"')}<button type="submit" class="button primary">Fotoğrafı ekle</button></form></details>`;
  return `<article class="panel journal-card"><h2>${escapeText(record.title)}</h2>${detail}${record.notes ? `<p class="books-prose">${escapeText(record.notes)}</p>` : ''}<div class="sync-actions books-section"><button class="button secondary" data-journal="edit" data-id="${escapeText(record.id)}">Düzenle</button><button class="button secondary" data-journal="delete" data-id="${escapeText(record.id)}">Sil</button></div></article>`;
}

function journalsPage() {
  const records=journalRecords.filter(r=>r.kind===journalKind).sort((a,b)=>journalKind==='payments' ? a.day.localeCompare(b.day) : (b.day ?? '').localeCompare(a.day ?? ''));
  const filtered=records.filter(r=>[r.title,r.artist,r.place,r.platform,r.mood,r.notes,r.year].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(journalQuery.toLocaleLowerCase('tr')));
  const record=records.find(r=>r.id===journalEditId);
  return `${intro(journalStandalone ? journalKinds[journalKind] : 'Kişisel günlükler','')}
    ${journalStandalone ? '' : `<div class="sync-actions books-toolbar" role="group" aria-label="Günlük türü">${Object.entries(journalKinds).map(([key,label])=>`<button class="button ${key===journalKind?'primary':'secondary'}" data-journal="tab" data-kind="${key}" aria-pressed="${key===journalKind}">${label}</button>`).join('')}</div>`}
    <p id="journal-feedback" class="row-meta" role="status">${escapeText(journalMessage)}</p>
    ${journalKind==='language' ? languagePractice() : journalEditing ? journalEditor(record) : `${journalKind==='payments'?paymentSummary(records):''}<div class="books-toolbar"><h2 class="journal-heading">${journalKinds[journalKind]}</h2><div class="sync-actions">${journalKind==='challenges'?'<button class="button secondary" data-journal="weekly-theme">Bu haftanın temasını ekle</button>':''}<button class="button primary" data-journal="add">Kayıt ekle</button></div></div>
    <form id="journal-search-form" class="books-search">${journalInput('Kayıtlarda ara','query',journalQuery,'type="search" maxlength="200"')}<button class="button secondary">Ara</button></form>
    <div class="journal-grid">${filtered.map(journalCard).join('')}</div>${filtered.length?'':empty('Henüz eşleşen kayıt yok. İlk kaydını ekleyebilirsin.')}<p class="row-meta">Kayıtlar bu tarayıcıda saklanır ve otomatik yedeklere eklenir. Haritalar ve dinleme bağlantıları internet gerektirir.</p>`}`;
}

async function journalPhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>800*1024) throw new Error('Fotoğraf JPEG, PNG veya WebP biçiminde ve en fazla 800 KB olmalı.');
  return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error('Fotoğraf okunamadı.')); reader.readAsDataURL(file); });
}

document.addEventListener('submit',async event=> {
  const form=event.target;
  if (form.dataset.photoSeries) {
    event.preventDefault();
    if (journalBusy) return;
    journalBusy=true;
    const submit=form.querySelector('[type="submit"]'); submit.disabled=true;
    try {
      const values=new FormData(form);
      const image=await journalPhoto(values.get('photo'));
      const photo={id:crypto.randomUUID(),image,caption:values.get('caption').trim()};
      if (saveJournals(journalRecords.map(r=>r.id===form.dataset.photoSeries?{...r,photos:[...(r.photos??[]),photo]}:r))) render();
    } catch(error) {document.querySelector('#journal-feedback').textContent=error.message;}
    finally {journalBusy=false;submit.disabled=false;}
    return;
  }
  if (!['journal-editor-form','journal-search-form'].includes(form.id)) return;
  event.preventDefault();
  if (journalBusy) return;
  const values=new FormData(form);
  if (form.id==='journal-search-form') { journalQuery=values.get('query').trim(); render(); return; }
  const title=values.get('title').trim();
  if (!title) {form.elements.title.value='';form.reportValidity();return;}
  const old=journalRecords.find(r=>r.id===journalEditId);
  const kind=journalKind;
  const record={...old,id:old?.id ?? crypto.randomUUID(),kind,title,notes:values.get('notes').trim()};
  journalBusy=true;
  const submit=form.querySelector('[type="submit"]'); submit.disabled=true;
  try {
    if (kind==='payments') Object.assign(record,{amount:Number(values.get('amount')),currency:values.get('currency'),period:values.get('period'),day:values.get('day'),paymentStatus:values.get('paymentStatus'),anchorDay:old?.day===values.get('day') ? old.anchorDay : Number(values.get('day').slice(-2)),payments:old?.payments ?? []});
    if (kind==='games') Object.assign(record,{platform:values.get('platform').trim(),stage:values.get('stage'),progress:values.get('stage')==='finished'?100:Number(values.get('progress')),hours:Number(values.get('hours')),rating:values.get('rating')?Number(values.get('rating')):null});
    if (kind==='experiences') {
      if(values.get('stage')==='done' && !values.get('day')) throw new Error('Tamamladığın deneyimin tarihini gir.');
      Object.assign(record,{year:Number(values.get('year')),stage:values.get('stage'),place:values.get('place').trim(),day:values.get('day')});
    }
    if (kind==='challenges') {
      if(values.get('endDay')<values.get('day')) throw new Error('Son gün başlangıç tarihinden önce olamaz.');
      Object.assign(record,{day:values.get('day'),endDay:values.get('endDay'),photos:old?.photos??[]});
    }
    if (kind==='music') {
      const artist=values.get('artist').trim(),url=values.get('url').trim();
      if (!artist) throw new Error('Sanatçı adını gir.');
      if (url && !['http:','https:'].includes(new URL(url).protocol)) throw new Error('Dinleme bağlantısı http:// veya https:// ile başlamalı.');
      Object.assign(record,{artist,url,day:values.get('day'),mood:values.get('mood').trim(),source:values.get('source').trim()});
    }
    if (kind==='memories') {
      const latitude=values.get('latitude'),longitude=values.get('longitude');
      if (!!latitude!==!!longitude) throw new Error('Harita için enlem ve boylamı birlikte gir.');
      let photo=values.has('removePhoto')?'':old?.photo ?? '';
      const file=values.get('photo'); if (file?.size) photo=await journalPhoto(file);
      Object.assign(record,{photo,day:values.get('day'),place:values.get('place').trim(),latitude:latitude===''?null:Number(latitude),longitude:longitude===''?null:Number(longitude)});
    }
    const records=old?journalRecords.map(r=>r.id===old.id?record:r):[...journalRecords,record];
    if (saveJournals(records)) {journalEditing=false;journalEditId=null;render();}
  } catch(error) {
    journalMessage=error.message; const feedback=document.querySelector('#journal-feedback'); if (feedback) feedback.textContent=journalMessage;
  } finally {journalBusy=false;submit.disabled=false;}
});

document.addEventListener('click',event=> {
  const button=event.target.closest('[data-journal]');
  if (!button || journalBusy) return;
  const action=button.dataset.journal;
  const record=journalRecords.find(r=>r.id===button.dataset.id);
  journalMessage='';
  if (action==='tab') {journalKind=button.dataset.kind;journalQuery='';journalEditing=false;journalEditId=null;}
  if (action==='add') {journalEditId=null;journalEditing=true;}
  if (action==='cancel') {journalEditId=null;journalEditing=false;}
  if (record && action==='edit') {journalEditId=record.id;journalEditing=true;}
  if (record && action==='delete' && confirm('Bu kayıt silinsin mi?')) saveJournals(journalRecords.filter(r=>r.id!==record.id),'Kayıt silindi.');
  if (record && action==='map') journalMapId=journalMapId===record.id?null:record.id;
  if (record && action==='delete-photo' && confirm('Fotoğraf silinsin mi?')) saveJournals(journalRecords.map(r=>r.id===record.id?{...r,photos:r.photos.filter(p=>p.id!==button.dataset.photo)}:r));
  if (record?.kind==='experiences' && action==='memory' && record.stage==='done') {
    if (!journalRecords.some(r=>r.originExperience===record.id)) saveJournals([...journalRecords,{id:crypto.randomUUID(),kind:'memories',originExperience:record.id,title:record.title,day:record.day,place:record.place,notes:record.notes,photo:'',latitude:null,longitude:null}],'Anı haritasına aktarıldı. Anılar sekmesinden fotoğraf ve konum ekleyebilirsin.');
    else journalMessage='Bu deneyim zaten Anı haritasında.';
  }
  if (action==='weekly-theme') {
    const now=curiosityDay();
    const monday=shiftDay(now,-((new Date(now+'T12:00:00Z').getUTCDay()+6)%7));
    if (!journalRecords.some(r=>r.kind==='challenges' && r.week===monday)) {
      const index=Math.floor(Date.parse(monday)/604800000)%photoThemes.length;
      saveJournals([...journalRecords,{id:crypto.randomUUID(),kind:'challenges',title:photoThemes[index],week:monday,day:monday,endDay:shiftDay(monday,6),notes:'',photos:[]}],'Haftanın teması eklendi. Kendi temalarını da oluşturabilirsin.');
    } else journalMessage='Bu haftanın teması zaten listende.';
  }
  if (record?.kind==='payments' && action==='paid' && record.paymentStatus==='active' && confirm(`${journalDate(record.day)} tarihli ödeme ödendi olarak kaydedilsin mi?`)) {
    const payment={due:record.day,paid:curiosityDay(),amount:record.amount,currency:record.currency};
    const next={...record,payments:[...(record.payments ?? []),payment],anchorDay:record.anchorDay ?? Number(record.day.slice(-2))};
    if (record.period==='once') next.paymentStatus='inactive'; else next.day=paymentNextDate(record);
    saveJournals(journalRecords.map(r=>r.id===record.id?next:r),'Ödeme kaydedildi.');
  }
  render();
});
