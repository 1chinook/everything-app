let materialPreview = null;
let materialRequest = 0;
let materialStatus = '';

function materialDate(value) {
  let key = value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [day, month, year] = value.split(/[./]/);
    key = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }
  const date = new Date(key + 'T12:00:00Z');
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== key ? null : key;
}

function extractMaterial(text) {
  const lines = text.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const topics = [];
  const dates = [];
  const seenDates = new Set();
  for (const line of lines) {
    const matches = [...line.matchAll(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4})\b/g)];
    for (const match of matches) {
      const day = materialDate(match[0]);
      if (!day) continue;
      const title = line.replace(match[0], '').replace(/\b(?:[01]?\d|2[0-3])[:.][0-5]\d\b/, '').trim().slice(0, 100) || 'Takvim kaydı';
      const time = line.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/)?.[0]?.padStart(5, '0') ?? '';
      const key = day + title + time;
      if (seenDates.has(key)) continue;
      seenDates.add(key);
      dates.push({ title, day, time });
    }
    const heading = line.length >= 4 && line.length <= 120 && !matches.length &&
      (/^(?:\d+(?:\.\d+)*[.)]?\s+|hafta\s*\d+|konu\b|ünite\b|bölüm\b)/iu.test(line) || /^[A-ZÇĞİÖŞÜ\s\d:–—-]{4,}$/.test(line));
    if (heading) topics.push(line.replace(/^\d+(?:\.\d+)*[.)]?\s+/, '').trim());
  }
  return { topics: [...new Set(topics)].slice(0, 30), dates: dates.slice(0, 20) };
}

function materialsPage() {
  return `${intro('Dokümanlar', 'Ders materyalinden konuları ve açıkça yazılmış tarihleri çıkar, kontrol ederek ekle.')}
    <section class="panel page-panel">
      ${panelHeading('Materyal oku')}
      <form id="material-form" class="sync-content form-fields">
        ${courseField('Ders', materialPreview?.course, true)}
        ${field('PDF veya metin dosyası', '<input name="file" type="file" accept=".pdf,.txt,application/pdf,text/plain">')}
        <details class="preference"><summary>Metni yapıştır</summary>
          ${field('Ders metni', '<textarea name="text" rows="5" maxlength="100000" placeholder="PDF’den kopyaladığın metni de yapıştırabilirsin."></textarea>')}
        </details>
        <button class="button primary" type="submit">İçeriği çıkar</button>
        <p id="material-status" class="form-feedback" role="status">${escapeText(materialStatus)}</p>
      </form>
    </section>
    <div id="material-preview">${materialPreview ? materialReview() : ''}</div>
    <section class="panel page-panel planning-panel">
      ${panelHeading('Materyaller')}
      ${state.documents.length ? `<ul class="record-list">${state.documents.map(document => `
        <li class="record-row">${icon('file', 'tile-icon')}<div><strong class="row-title">${escapeText(document.name)}</strong>
          ${document.course ? `<small class="row-meta">${escapeText(document.course)}</small>` : ''}</div></li>`).join('')}</ul>` : empty('Henüz bir materyal kaydetmedin.')}
    </section>`;
}

function materialReview() {
  const preview = materialPreview;
  return `<section class="panel page-panel planning-panel">
    ${panelHeading('Çıkarılan bilgileri kontrol et', 'Başlık ve tarih önerilerini düzenle. Yalnızca işaretlediklerin kaydedilir.')}
    <form id="material-review-form" class="sync-content form-fields">
      <strong class="row-title">${escapeText(preview.name)} · ${escapeText(preview.course)}</strong>
      ${field('Dersin konularına eklenecek başlıklar', `<textarea name="topics" rows="5" maxlength="2500">${escapeText(preview.topics.join('\n'))}</textarea>`)}
      <p class="row-meta">Konu listesi mevcut konulara eklenir. Sınav kapsamını takvim kaydında ayrıca seçebilirsin.</p>
      ${preview.dates.length ? preview.dates.map((date, index) => `<fieldset class="material-date">
        <legend><label><input type="checkbox" name="include-${index}"> Bu tarihi takvime ekle</label></legend>
        ${inputField('Başlık', 'title-' + index, date.title, 'maxlength="100"')}
        <div class="time-fields">${inputField('Tarih', 'day-' + index, date.day, 'type="date"')}
          ${inputField('Saat', 'time-' + index, date.time, 'type="time"')}</div>
        ${field('Tür', `<select name="kind-${index}"><option value="deadline">Teslim</option><option value="exam">Sınav</option></select>`)}
      </fieldset>`).join('') : '<p class="row-meta">Yılıyla birlikte açıkça yazılmış bir tarih bulunamadı. Takvime kendin ekleyebilirsin.</p>'}
      <p id="material-review-status" class="form-feedback" role="status"></p>
      <div class="sync-actions"><button class="button primary" type="submit">Kontrol ettim, kaydet</button>
        <button class="button secondary" type="button" data-material-cancel>Vazgeç</button></div>
    </form>
  </section>`;
}

async function materialText(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Dosya 20 MB sınırını aşıyor. İlgili sayfaları ayrı bir dosya olarak seç.');
  if (/\.txt$/i.test(file.name) || file.type === 'text/plain') return file.text();
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('PDF veya TXT dosyası seç.');
  let pdfjs;
  try {
    pdfjs = await import('./vendor/pdf.mjs');
  } catch {
    throw new Error('PDF okuyucu yüklenemedi. Uygulamayı yerel sunucudan aç. Bu sırada PDF metnini yapıştırarak devam edebilirsin.');
  }
  pdfjs.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.mjs';
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  let document;
  try {
    document = await task.promise;
    if (document.numPages > 100) throw new Error('Dosya 100 sayfayı aşıyor. İlgili sayfaları ayrı bir dosya olarak seç.');
    const text = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let line = '';
      let lastY;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = Math.round(item.transform[5]);
        if (lastY !== undefined && Math.abs(y - lastY) > 3) {
          text.push(line);
          line = '';
        }
        line += item.str + ' ';
        lastY = y;
        if (item.hasEOL) {
          text.push(line);
          line = '';
        }
      }
      if (line) text.push(line);
      page.cleanup();
    }
    const result = text.join('\n');
    if (result.replace(/\s/g, '').length < 20) throw new Error('PDF’de okunabilir metin bulunamadı. Taranmış sayfalar için OCR gerekir. Metni kopyalayıp yapıştırabilirsin.');
    return result;
  } finally {
    await task.destroy();
  }
}

function showMaterialStatus(message) {
  materialStatus = message;
  const output = document.querySelector('#material-status');
  if (output) output.textContent = message;
}

document.addEventListener('submit', async event => {
  if (event.target.id === 'material-form') {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const course = canonicalCourse(data.get('course'));
    if (!course) return;
    const file = form.elements.namedItem('file').files[0];
    const pasted = data.get('text').trim();
    if (!file && !pasted) {
      showMaterialStatus('Bir dosya seç veya metni yapıştır.');
      return;
    }
    const request = ++materialRequest;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    showMaterialStatus('İçerik okunuyor.');
    try {
      const text = pasted || await materialText(file);
      if (request !== materialRequest || !document.querySelector('#material-form')) return;
      const extracted = extractMaterial(text);
      materialPreview = { name: file?.name ?? 'Yapıştırılan ders metni', course, ...extracted };
      document.querySelector('#material-preview').innerHTML = materialReview();
      showMaterialStatus('Öneriler hazır. Aşağıdaki bilgileri kontrol ederek kaydet.');
    } catch (error) {
      if (request === materialRequest) showMaterialStatus(error.message || 'Dosya okunamadı.');
    } finally {
      submit.disabled = false;
    }
    return;
  }
  if (event.target.id !== 'material-review-form' || !materialPreview) return;
  event.preventDefault();
  const data = new FormData(event.target);
  const selected = [];
  for (let index = 0; index < materialPreview.dates.length; index++) {
    if (!data.has('include-' + index)) continue;
    const title = data.get('title-' + index).trim();
    const rawDay = data.get('day-' + index);
    const day = rawDay && materialDate(rawDay);
    const time = data.get('time-' + index);
    if (!title || !day || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      document.querySelector('#material-review-status').textContent = 'İşaretlediğin tarihler için başlık, geçerli tarih ve saat gir.';
      return;
    }
    selected.push({ title, day, time, kind: data.get('kind-' + index) });
  }
  const course = materialPreview.course;
  const key = courseKey(course);
  const merged = [...new Set([...topicsForCourse(course), ...topicLines(data.get('topics'))])];
  if (merged.join('\n').length > 2500) {
    document.querySelector('#material-review-status').textContent = 'Toplam konu listesi çok uzun. Eklenecek başlıkları kısalt.';
    return;
  }
  state.courseTopics[key] = merged;
  for (const record of selected) {
    if (state.assessments.some(entry => courseKey(entry.course) === key && entry.title === record.title &&
      entry.day === record.day && entry.time === record.time && entry.kind === record.kind)) continue;
    state.assessments.push({ id: newId(), course, ...record, weight: 0, grade: null, topics: [] });
  }
  if (!state.documents.some(document => document.name === materialPreview.name && document.course === course)) {
    state.documents.push({ id: newId(), name: materialPreview.name, course });
  }
  materialPreview = null;
  materialStatus = 'Materyal, seçtiğin konular ve tarihler kaydedildi.';
  save(materialStatus);
  render();
});

document.addEventListener('click', event => {
  if (!event.target.closest('[data-material-cancel]')) return;
  materialRequest += 1;
  materialPreview = null;
  document.querySelector('#material-preview').innerHTML = '';
  showMaterialStatus('Önizleme kapatıldı.');
});
