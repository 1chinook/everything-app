const booksStorageKey = 'everything-app-books-v1';
const bookShelves = { planned: 'Okuyacağım', reading: 'Okuyorum', finished: 'Bitirdim' };
let bookShelf = 'all';
let bookQuery = '';
let selectedBookId = null;
let bookEditing = false;
let bookMessage = '';

function readBooks() {
  try {
    const books = JSON.parse(localStorage.getItem(booksStorageKey));
    return Array.isArray(books) ? books.filter(b => b && typeof b.id === 'string' && typeof b.title === 'string' && Object.hasOwn(bookShelves, b.shelf)) : [];
  } catch { return []; }
}

let bookRecords = readBooks();

function storeBooks(next, message = 'Kaydedildi.') {
  try {
    localStorage.setItem(booksStorageKey, JSON.stringify(next));
    bookRecords = next;
    bookMessage = message;
    return true;
  } catch {
    bookMessage = 'Kaydedilemedi. Tarayıcı depolama alanını kontrol edip tekrar dene.';
    const feedback = document.querySelector('#books-feedback');
    if (feedback) feedback.textContent = bookMessage;
    return false;
  }
}

function bookInput(label, name, value = '', attributes = '') {
  return field(label, `<input name="${name}" value="${escapeText(value)}" ${attributes}>`);
}

function bookEditor(book) {
  return `<section class="panel page-panel">${panelHeading(book ? 'Kitabı düzenle' : 'Kitap ekle')}
    <form id="book-editor-form" class="books-body sync-form">
    ${bookInput('Kitap adı', 'title', book?.title ?? '', 'required maxlength="180"')}
    ${bookInput('Yazar', 'author', book?.author ?? '', 'maxlength="160"')}
    ${field('Raf', `<select name="shelf">${Object.entries(bookShelves).map(([key, label]) => `<option value="${key}" ${key === book?.shelf ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
    <div class="time-fields">${bookInput('Toplam sayfa (isteğe bağlı)', 'total', book?.total ?? '', 'type="number" min="1" max="100000" step="1"')}
    ${bookInput('Ulaştığın sayfa', 'page', book?.page ?? 0, 'type="number" min="0" max="100000" step="1" required')}</div>
    ${field('Puanın', `<select name="rating"><option value="">Henüz puanlamadım</option>${[1,2,3,4,5].map(n => `<option value="${n}" ${book?.rating === n ? 'selected' : ''}>${n} / 5</option>`).join('')}</select>`)}
    ${field('Kısa değerlendirmen', `<textarea name="review" rows="3" maxlength="3000">${escapeText(book?.review ?? '')}</textarea>`)}
    <div class="sync-actions"><button type="submit" class="button primary">Kaydet</button><button type="button" class="button secondary" data-books="cancel-edit">Vazgeç</button></div>
    </form></section>`;
}

function bookCard(book) {
  const progress = book.total ? Math.min(100, Math.round(book.page / book.total * 100)) : null;
  return `<article class="panel book-card"><small class="row-meta">${bookShelves[book.shelf]}</small>
    <h2>${escapeText(book.title)}</h2><p class="row-meta">${escapeText(book.author || 'Yazar eklenmedi')}</p>
    <p>${book.page} ${book.total ? '/ ' + book.total : ''} sayfa${progress === null ? '' : ' · %' + progress}</p>
    ${progress === null ? '' : `<progress value="${book.page}" max="${book.total}" aria-label="${escapeText(book.title)} okuma ilerlemesi"></progress>`}
    ${book.rating ? `<p class="row-meta">Puanın ${book.rating} / 5</p>` : ''}
    <button class="button secondary" data-books="open" data-id="${escapeText(book.id)}">Günlüğü aç</button></article>`;
}

function bookDetails(book) {
  const sessions = book.sessions ?? [];
  const notes = book.notes ?? [];
  return `<div class="sync-actions books-toolbar"><button class="button secondary" data-books="back">Kitaplığa dön</button>
    <button class="button secondary" data-books="edit">Düzenle</button><button class="button secondary" data-books="delete">Kitabı sil</button></div>
    <section class="panel page-panel">${panelHeading(escapeText(book.title), escapeText(book.author || bookShelves[book.shelf]))}
    <div class="books-body"><p>${book.page}${book.total ? ' / ' + book.total : ''} sayfa · ${bookShelves[book.shelf]}${book.rating ? ' · ' + book.rating + ' / 5' : ''}</p>
    ${book.review ? `<p class="books-prose">${escapeText(book.review)}</p>` : ''}
    ${book.shelf !== 'finished' ? '<button class="button secondary" data-books="finish">Bitirdim olarak işaretle</button>' : ''}
    <form id="book-session-form" class="sync-form books-section"><h3>Okuma oturumu</h3>
    ${bookInput('Tarih', 'day', curiosityDay(), 'type="date" required')}
    <div class="time-fields">${bookInput('Ulaştığın sayfa', 'page', book.page, `type="number" min="${book.page}" max="${book.total || 100000}" step="1" required`)}
    ${bookInput('Okuma süresi (dakika)', 'minutes', '', 'type="number" min="1" max="1440" step="1" required')}</div>
    <button class="button primary" type="submit">Oturumu kaydet</button></form>
    <details class="books-section"><summary>Okuma geçmişi · ${sessions.length} oturum · ${sessions.reduce((sum,s) => sum+s.minutes,0)} dakika</summary>
    ${sessions.length ? `<ul class="books-log">${[...sessions].reverse().map(s => `<li>${escapeText(s.day)} · ${s.from}–${s.page}. sayfa · ${s.minutes} dk</li>`).join('')}</ul>` : empty('Henüz okuma oturumu yok.')}</details></div></section>
    <section class="panel page-panel">${panelHeading('Alıntılar ve notlar')}
    <div class="books-body"><form id="book-note-form" class="sync-form">
    ${field('Tür', '<select name="kind"><option value="note">Kişisel not</option><option value="quote">Alıntı</option></select>')}
    ${bookInput('Sayfa (isteğe bağlı)', 'page', '', `type="number" min="1" max="${book.total || 100000}" step="1"`)}
    ${field('Metin', '<textarea name="text" rows="3" maxlength="5000" required></textarea>')}
    <button class="button primary" type="submit">Ekle</button></form>
    <div class="books-notes">${notes.map(n => `<article><small class="row-meta">${n.kind === 'quote' ? 'Alıntı' : 'Not'}${n.page ? ' · Sayfa ' + n.page : ''}</small><p class="books-prose">${escapeText(n.text)}</p>
    <div class="sync-actions"><button class="button secondary" data-books="note-question" data-id="${escapeText(n.id)}">Merak kuyruğuna gönder</button><button class="button secondary" data-books="delete-note" data-id="${escapeText(n.id)}">Sil</button></div></article>`).join('') || empty('Hatırlamak istediğin bir cümleyi veya düşünceni ekle.')}</div></div></section>
    <section class="panel page-panel">${panelHeading('Bu kitap sana neyi merak ettirdi?')}
    <form id="book-question-form" class="books-body sync-form">${bookInput('Sorun', 'question', '', 'required maxlength="200"')}
    <button class="button primary" type="submit">Merak kuyruğuna ekle</button></form></section>`;
}

function booksPage() {
  const selected = bookRecords.find(b => b.id === selectedBookId);
  const list = bookRecords.filter(b => (bookShelf === 'all' || b.shelf === bookShelf) && `${b.title} ${b.author}`.toLocaleLowerCase('tr').includes(bookQuery.toLocaleLowerCase('tr')));
  return `${intro('Kitap günlüğü', 'Okuduklarını, alıntılarını ve aklına gelen soruları biriktir.')}
    <p id="books-feedback" class="row-meta" role="status">${escapeText(bookMessage)}</p>
    ${bookEditing ? bookEditor(selected) : selected ? bookDetails(selected) : `<div class="books-toolbar"><button class="button primary" data-books="add">Kitap ekle</button>
    <div class="sync-actions" role="group" aria-label="Kitap rafları">${Object.entries({all:'Tümü',...bookShelves}).map(([key,label]) => `<button class="button secondary" data-books="shelf" data-shelf="${key}" aria-pressed="${key === bookShelf}">${label} (${bookRecords.filter(b => key === 'all' || b.shelf === key).length})</button>`).join('')}</div></div>
    <form id="book-search-form" class="books-search">${bookInput('Kitap veya yazar ara', 'query', bookQuery, 'type="search" maxlength="180"')}<button class="button secondary">Ara</button></form>
    <div class="books-grid">${list.map(bookCard).join('')}</div>${list.length ? '' : empty(bookRecords.length ? 'Bu rafta veya aramada kitap yok.' : 'İlk kitabını ekleyerek başla.')}
    <p class="row-meta">Kitap günlüğün bu tarayıcıda saklanır ve otomatik yedeklere eklenir.</p>`}`;
}

function addBookQuestion(book, question) {
  const next = {...curiosityData, questions:[...curiosityData.questions, {id:crypto.randomUUID(), title:question, topic:book.title, done:false}]};
  if (!keepCuriosity(next)) {
    bookMessage = curiosityMessage;
    return false;
  }
  bookMessage = 'Merak kuyruğuna eklendi. Keşfet bölümünden açabilirsin.';
  return true;
}

document.addEventListener('submit', event => {
  const form = event.target;
  if (!['book-editor-form','book-session-form','book-note-form','book-question-form','book-search-form'].includes(form.id)) return;
  event.preventDefault();
  const values = new FormData(form);
  const book = bookRecords.find(b => b.id === selectedBookId);
  let next;
  if (form.id === 'book-search-form') { bookQuery = values.get('query').trim(); render(); return; }
  if (form.id === 'book-editor-form') {
    const title = values.get('title').trim();
    if (!title) { form.elements.title.value = ''; form.reportValidity(); return; }
    const total = values.get('total') ? Number(values.get('total')) : null;
    let page = Number(values.get('page'));
    if (total && page > total) { form.elements.page.setCustomValidity('Ulaşılan sayfa toplam sayfayı aşamaz.'); form.elements.page.reportValidity(); return; }
    const shelf = values.get('shelf');
    if (shelf === 'finished' && total) page = total;
    const record = {...book, id:book?.id ?? crypto.randomUUID(), title, author:values.get('author').trim(), total, page, shelf, rating:values.get('rating') ? Number(values.get('rating')) : null, review:values.get('review').trim(), sessions:book?.sessions ?? [], notes:book?.notes ?? []};
    next = book ? bookRecords.map(b => b.id === book.id ? record : b) : [...bookRecords,record];
    if (storeBooks(next)) { selectedBookId = record.id; bookEditing = false; render(); }
    return;
  }
  if (!book) return;
  if (form.id === 'book-question-form') {
    const question = values.get('question').trim();
    if (!question) { form.elements.question.value = ''; form.reportValidity(); return; }
    if (addBookQuestion(book, question)) render();
    else document.querySelector('#books-feedback').textContent = bookMessage;
    return;
  }
  if (form.id === 'book-session-form') {
    const page = Number(values.get('page'));
    const shelf = book.total && page === book.total ? 'finished' : book.shelf === 'planned' ? 'reading' : book.shelf;
    const record = {...book, page, shelf, sessions:[...(book.sessions ?? []), {day:values.get('day'), from:book.page, page, minutes:Number(values.get('minutes'))}]};
    next = bookRecords.map(b => b.id === book.id ? record : b);
  } else {
    const text = values.get('text').trim();
    if (!text) { form.elements.text.value = ''; form.reportValidity(); return; }
    const note = {id:crypto.randomUUID(), kind:values.get('kind'), page:values.get('page') ? Number(values.get('page')) : null, text};
    next = bookRecords.map(b => b.id === book.id ? {...b,notes:[...(b.notes ?? []),note]} : b);
  }
  if (storeBooks(next)) render();
});

document.addEventListener('input', event => {
  if (event.target.closest('#book-editor-form')) event.target.closest('form').elements.page.setCustomValidity('');
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-books]');
  if (!button) return;
  const action = button.dataset.books;
  const book = bookRecords.find(b => b.id === selectedBookId);
  bookMessage = '';
  if (action === 'add') { selectedBookId = null; bookEditing = true; }
  if (action === 'open') { selectedBookId = button.dataset.id; bookEditing = false; }
  if (action === 'back') { selectedBookId = null; bookEditing = false; }
  if (action === 'edit') bookEditing = true;
  if (action === 'cancel-edit') bookEditing = false;
  if (action === 'shelf') bookShelf = button.dataset.shelf;
  if (book && action === 'delete' && confirm('Kitap ve tüm günlük kayıtları silinsin mi?')) {
    if (storeBooks(bookRecords.filter(b => b.id !== book.id), 'Kitap silindi.')) selectedBookId = null;
  }
  if (book && action === 'finish') {
    if (storeBooks(bookRecords.map(b => b.id === book.id ? {...b,shelf:'finished',page:b.total ?? b.page} : b), 'Kitap bitirildi. Puan ve değerlendirmeni Düzenle bölümünden ekleyebilirsin.')) bookEditing = true;
  }
  if (book && action === 'delete-note' && confirm('Bu not silinsin mi?')) storeBooks(bookRecords.map(b => b.id === book.id ? {...b,notes:b.notes.filter(n => n.id !== button.dataset.id)} : b));
  if (book && action === 'note-question') {
    const note = book.notes.find(n => n.id === button.dataset.id);
    if (note) addBookQuestion(book, note.text);
  }
  render();
});
