const curiosityKey = 'everything-app-curiosity-v1';
const curiositySeeds = [
  ['Matematik', 'Sonsuzlukların büyüklükleri neden farklı?', 'Cantor teoremi'],
  ['Bilgisayar', 'Bir bilgisayar rastgele sayı üretebilir mi?', 'Rastgele sayı üreteci'],
  ['Tarih', 'Antik İskenderiye Kütüphanesi nasıl bir yerdi?', 'İskenderiye Kütüphanesi'],
  ['Sanat', 'Bir resimde perspektif nasıl kurulur?', 'Perspektif'],
  ['Doğa', 'Mantarlar bitkilerle nasıl ilişki kurar?', 'Mikoriza'],
  ['Uzay', 'Bir yıldızın uzaklığı nasıl ölçülür?', 'Paralaks'],
  ['Müzik', 'Aynı nota farklı çalgılarda neden farklı duyulur?', 'Tını'],
  ['Dil', 'Diller birbirinden nasıl kelime alır?', 'Ödünçleme'],
  ['Felsefe', 'Bir düşünce deneyi bize ne öğretebilir?', 'Düşünce deneyi'],
  ['Mühendislik', 'Asma köprüler yükü nasıl taşır?', 'Asma köprü'],
  ['Matematik', 'Bir yüzeyin tek tarafı olabilir mi?', 'Möbius şeridi'],
  ['Bilgisayar', 'Bir algoritmanın çözemeyeceği sorular var mı?', 'Durma problemi'],
  ['Kültür', 'Takvimler neden birbirinden farklı?', 'Takvim'],
  ['Okyanus', 'Okyanusun dibinde güneşsiz yaşam nasıl olur?', 'Hidrotermal baca'],
];
let curiosityTab = 'daily';
let curiosityMessage = '';
let curiosityLinks = [];
let curiosityLoading = false;
let curiosityRequest = 0;

function readCuriosity() {
  try {
    const data = JSON.parse(localStorage.getItem(curiosityKey));
    if (!data || !Array.isArray(data.questions) || !Array.isArray(data.routes)) return { questions: [], routes: [], daily: null };
    return data;
  } catch { return { questions: [], routes: [], daily: null }; }
}

let curiosityData = readCuriosity();

function keepCuriosity(next) {
  try {
    localStorage.setItem(curiosityKey, JSON.stringify(next));
    curiosityData = next;
    curiosityMessage = 'Kaydedildi.';
    return true;
  } catch {
    curiosityMessage = 'Kaydedilemedi. Tarayıcı depolama alanını kontrol edip tekrar dene.';
    return false;
  }
}

function curiosityDay() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

function curiosityPick() {
  if (curiosityData.daily?.day === curiosityDay()) return curiosityData.daily;
  const pending = curiosityData.questions.filter(q => !q.done);
  if (pending.length) {
    const question = pending[0];
    return { day: curiosityDay(), title: question.title, topic: question.topic || question.title, category: 'Merak kuyruğundan', questionId: question.id };
  }
  const dayNumber = Math.floor(Date.parse(curiosityDay()) / 86400000);
  const [category, title, topic] = curiositySeeds[dayNumber % curiositySeeds.length];
  return { day: curiosityDay(), title, topic, category };
}

function wikiSearch(topic) {
  return 'https://tr.wikipedia.org/w/index.php?search=' + encodeURIComponent(topic);
}

function wikiArticle(title, language = 'tr') {
  return `https://${language === 'en' ? 'en' : 'tr'}.wikipedia.org/wiki/` + encodeURIComponent(title.replaceAll(' ', '_'));
}

function curiosityDaily() {
  const pick = curiosityPick();
  if (curiosityData.daily?.day !== pick.day) keepCuriosity({...curiosityData, daily:pick});
  return `<p class="row-meta">${escapeText(pick.category)} · ${escapeText(pick.day)}</p>
    <h3>${escapeText(pick.title)}</h3>
    <p class="row-meta">Okurken bir yeni bilgi, bir bağlantı ve aklına gelen bir soru not al.</p>
    <div class="sync-actions"><a class="button secondary" href="${wikiSearch(pick.topic)}" target="_blank" rel="noopener noreferrer">Wikipedia’da araştır</a>
    <button class="button primary" data-curiosity="start-daily">Okuma rotası başlat</button>
    <button class="button secondary" data-curiosity="shuffle">Başka konu seç</button>
    ${pick.questionId ? `<button class="button secondary" data-curiosity="complete-daily">Araştırdım</button>` : ''}</div>`;
}

function curiosityQueue() {
  return `<form id="curiosity-question-form" class="sync-form">
    ${field('Neyi merak ediyorsun?', '<input name="title" maxlength="200" required placeholder="Örneğin, zaman neden tek yönde ilerliyor?">')}
    ${field('Araştırılacak konu (isteğe bağlı)', '<input name="topic" maxlength="100" placeholder="Örneğin, zamanın oku">')}
    <button class="button primary" type="submit">Merak kuyruğuna ekle</button></form>
    <div class="curiosity-records">${curiosityData.questions.length ? curiosityData.questions.map(q => `<article class="curiosity-record">
    <div><strong>${escapeText(q.title)}</strong><small class="row-meta">${q.done ? 'Araştırıldı' : 'Araştırılacak'}${q.topic ? ' · ' + escapeText(q.topic) : ''}</small></div>
    <div class="sync-actions"><button class="button secondary" data-curiosity="toggle" data-id="${escapeText(q.id)}">${q.done ? 'Yeniden sıraya al' : 'Araştırdım'}</button>
    <button class="button secondary" data-curiosity="question-route" data-id="${escapeText(q.id)}">Rota başlat</button>
    <button class="button secondary" data-curiosity="delete-question" data-id="${escapeText(q.id)}">Sil</button></div></article>`).join('') : empty('Aklına gelen ilk soruyla başla.')}</div>`;
}

function curiosityRoutes() {
  const route = curiosityData.routes.find(r => r.id === curiosityData.activeRoute);
  return `<form id="curiosity-route-form" class="sync-form">
    ${field('Başlangıç makalesi', '<input name="title" maxlength="150" required placeholder="Örneğin, Graf teorisi">')}
    ${field('Wikipedia dili', '<select name="language"><option value="tr">Türkçe</option><option value="en">İngilizce</option></select>')}
    <button class="button primary" type="submit">Yeni rota</button></form>
    ${curiosityData.routes.length ? field('Kayıtlı rotalar', `<select id="curiosity-route-select">${curiosityData.routes.map(r => `<option value="${escapeText(r.id)}" ${r.id === route?.id ? 'selected' : ''}>${escapeText(r.title)} · ${r.steps.length} durak</option>`).join('')}</select>`) : empty('Bir makaleyle başla. Okudukça bağlantıları rotana ekle.')}
    ${route ? `<ol class="curiosity-steps">${route.steps.map((step, index) => `<li><div class="curiosity-record"><a href="${wikiArticle(step.title, route.language)}" target="_blank" rel="noopener noreferrer">${escapeText(step.title)}</a>
    <button class="button secondary" data-curiosity="read-step" data-index="${index}" aria-pressed="${!!step.read}">${step.read ? 'Okundu' : 'Okudum'}</button></div>${step.note ? `<p class="row-meta">${escapeText(step.note)}</p>` : ''}</li>`).join('')}</ol>
    <form id="curiosity-step-form" class="sync-form">
    ${field('Sonraki makale', '<input name="title" maxlength="150" required placeholder="Okurken karşılaştığın bir bağlantı">')}
    ${field('Bu bağlantıyı neden seçtin?', '<textarea name="note" rows="2" maxlength="1500" placeholder="İki konu arasındaki ilişkiyi not al"></textarea>')}
    <button class="button primary" type="submit">Rotaya ekle</button></form>
    <div class="sync-actions"><button class="button secondary" data-curiosity="links" ${curiosityLoading ? 'disabled' : ''}>${curiosityLoading ? 'Bağlantılar yükleniyor…' : 'Son makalenin bağlantılarını getir'}</button>
    <button class="button secondary" data-curiosity="delete-route">Rotayı sil</button></div>
    <div class="curiosity-links">${curiosityLinks.map((title, i) => `<button class="button secondary" data-curiosity="add-link" data-index="${i}">${escapeText(title)}</button>`).join('')}</div>` : ''}`;
}

function curiosityPanel() {
  const tabs = { daily: 'Günün keşfi', queue: 'Merak kuyruğu', routes: 'Okuma rotaları' };
  return `<section id="curiosity-panel" class="panel page-panel curiosity-panel" aria-label="Kişisel keşif">
    ${panelHeading('Merakını takip et')}
    <div class="curiosity-body"><div class="sync-actions" role="group" aria-label="Keşif araçları">${Object.entries(tabs).map(([key, name]) => `<button class="button ${key === curiosityTab ? 'primary' : 'secondary'}" data-curiosity-tab="${key}" aria-pressed="${key === curiosityTab}">${name}</button>`).join('')}</div>
    <div class="curiosity-content">${({daily: curiosityDaily, queue: curiosityQueue, routes: curiosityRoutes})[curiosityTab]()}</div>
    <p class="row-meta" role="status">${escapeText(curiosityMessage)}</p><small class="row-meta">Kayıtların bu tarayıcıda saklanır ve otomatik yedeklere eklenir.</small></div></section>`;
}

function refreshCuriosity() {
  const panel = document.querySelector('#curiosity-panel');
  if (panel) panel.outerHTML = curiosityPanel();
}

function startCuriosityRoute(title, language = 'tr') {
  const route = { id: crypto.randomUUID(), title, language, steps: [{title, read: false, note: ''}] };
  if (keepCuriosity({...curiosityData, routes: [...curiosityData.routes, route], activeRoute: route.id})) {
    curiosityTab = 'routes';
    curiosityLinks = [];
    curiosityRequest++;
    curiosityLoading = false;
  }
}

async function loadCuriosityLinks() {
  const route = curiosityData.routes.find(r => r.id === curiosityData.activeRoute);
  if (!route) return;
  const request = ++curiosityRequest;
  curiosityLoading = true;
  curiosityLinks = [];
  curiosityMessage = '';
  refreshCuriosity();
  try {
    const query = new URLSearchParams({action:'query', format:'json', origin:'*', redirects:'1', prop:'links', plnamespace:'0', pllimit:'30', titles:route.steps.at(-1).title});
    const response = await fetch(`https://${route.language}.wikipedia.org/w/api.php?${query}`, {signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('Wikipedia unavailable');
    const data = await response.json();
    if (request !== curiosityRequest) return;
    curiosityLinks = Object.values(data.query?.pages ?? {}).flatMap(page => page.links ?? []).map(link => link.title).filter(title => !route.steps.some(step => step.title === title));
    curiosityMessage = curiosityLinks.length ? 'Bir bağlantı seçerek rotana ekleyebilirsin.' : 'Bağlantı bulunamadı. Makale başlığını kontrol edebilir veya sonraki durağı kendin ekleyebilirsin.';
  } catch {
    if (request === curiosityRequest) curiosityMessage = 'Wikipedia’ya ulaşılamadı. Makaleyi açıp bağlantı başlığını elle ekleyebilir veya tekrar deneyebilirsin.';
  } finally {
    if (request === curiosityRequest) { curiosityLoading = false; refreshCuriosity(); }
  }
}

document.addEventListener('submit', event => {
  const form = event.target;
  if (!['curiosity-question-form', 'curiosity-route-form', 'curiosity-step-form'].includes(form.id)) return;
  event.preventDefault();
  const values = new FormData(form);
  const title = values.get('title').trim();
  if (!title) { form.elements.title.value = ''; form.reportValidity(); return; }
  if (form.id === 'curiosity-question-form') {
    keepCuriosity({...curiosityData, questions:[...curiosityData.questions, {id:crypto.randomUUID(), title, topic:values.get('topic').trim(), done:false}]});
  } else if (form.id === 'curiosity-route-form') startCuriosityRoute(title, values.get('language'));
  else {
    const routes = curiosityData.routes.map(route => route.id === curiosityData.activeRoute ? {...route, steps:[...route.steps, {title, note:values.get('note').trim(), read:false}]} : route);
    if (keepCuriosity({...curiosityData, routes})) { curiosityLinks = []; curiosityRequest++; curiosityLoading = false; }
  }
  refreshCuriosity();
});

document.addEventListener('change', event => {
  if (event.target.id !== 'curiosity-route-select') return;
  keepCuriosity({...curiosityData, activeRoute:event.target.value});
  curiosityLinks = []; curiosityRequest++; curiosityLoading = false;
  refreshCuriosity();
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-curiosity], [data-curiosity-tab]');
  if (!button) return;
  curiosityMessage = '';
  if (button.dataset.curiosityTab) curiosityTab = button.dataset.curiosityTab;
  const action = button.dataset.curiosity;
  const id = button.dataset.id;
  const pick = curiosityPick();
  if (action === 'shuffle') {
    const choices = curiositySeeds.filter(seed => seed[1] !== pick.title);
    const [category, title, topic] = choices[Math.floor(Math.random() * choices.length)];
    keepCuriosity({...curiosityData, daily:{day:curiosityDay(), category, title, topic}});
  }
  if (action === 'start-daily') startCuriosityRoute(pick.topic);
  if (action === 'question-route') {
    const q = curiosityData.questions.find(q => q.id === id);
    if (q) startCuriosityRoute(q.topic || q.title);
  }
  if (action === 'toggle' || action === 'complete-daily') keepCuriosity({...curiosityData, questions:curiosityData.questions.map(q => q.id === (id || pick.questionId) ? {...q, done:!q.done} : q)});
  if (action === 'delete-question' && confirm('Bu soruyu silmek istiyor musun?')) keepCuriosity({...curiosityData, questions:curiosityData.questions.filter(q => q.id !== id)});
  if (action === 'delete-route' && confirm('Bu rotayı silmek istiyor musun?')) {
    const routes = curiosityData.routes.filter(r => r.id !== curiosityData.activeRoute);
    keepCuriosity({...curiosityData, routes, activeRoute:routes[0]?.id});
    curiosityLinks = []; curiosityRequest++; curiosityLoading = false;
  }
  if (action === 'read-step' || action === 'add-link') {
    const index = Number(button.dataset.index);
    const routes = curiosityData.routes.map(r => {
      if (r.id !== curiosityData.activeRoute) return r;
      return {...r, steps:action === 'read-step' ? r.steps.map((s, i) => i === index ? {...s, read:!s.read} : s) : [...r.steps, {title:curiosityLinks[index], note:'', read:false}]};
    });
    if (keepCuriosity({...curiosityData, routes}) && action === 'add-link') { curiosityLinks = []; curiosityRequest++; curiosityLoading = false; }
  }
  if (action === 'links') { void loadCuriosityLinks(); return; }
  refreshCuriosity();
});
