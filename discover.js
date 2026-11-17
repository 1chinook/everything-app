const discoverCategories = {
  all: 'Tümü',
  news: 'Haber',
  wiki: 'Vikipedi',
  study: 'Ders kaynağı',
  saved: 'Kaydedilenler',
};

const discoverItems = [
  { id: 'proofs', type: 'news', title: 'Yapay zekâ matematik ispatlarını nasıl biçimselleştiriyor?', topic: 'Matematik ve yapay zekâ',
    source: 'Quanta Magazine', date: '11 Kasım 2026', lang: 'İngilizce',
    url: 'https://www.quantamagazine.org/update/169054/',
    note: 'Soyut Matematik ile bilgisayar bilimleri arasında bir bağ kuruyor. Yazıda matematik dilindeki bir ispatın bilgisayarın kontrol edebileceği adımlara nasıl dönüştürüldüğüne bak.' },
  { id: 'model-introspection', type: 'news', title: 'Yapay zekâ modelleri kendi iç durumlarını fark edebiliyor mu?', topic: 'Bilgisayar bilimi',
    source: 'Quanta Magazine', date: '4 Kasım 2026', lang: 'İngilizce',
    url: 'https://www.quantamagazine.org/new-research-tests-whether-ai-models-know-their-own-thoughts-20261104/',
    note: 'Araştırmacıların bu soruyu nasıl deneysel olarak ölçmeye çalıştığını anlatıyor. Deney düzeneği ile araştırmacıların yorumunu ayrı ayrı okumaya çalış.' },
  { id: 'four-color', type: 'news', title: 'Dört renk teoremi için yeni bir ispat', topic: 'Çizge kuramı ve algoritmalar',
    source: 'Quanta Magazine', date: '10 Eylül 2026', lang: 'İngilizce',
    url: 'https://www.quantamagazine.org/the-four-color-theorem-gets-a-rare-new-proof-20260910/',
    note: 'Harita boyamanın çizge boyamaya nasıl bağlandığını ve bilgisayar destekli ispatın rolünü gör. Önce küçük bir haritayı çizgeye çevirmeyi dene.' },
  { id: 'month-problem', type: 'study', title: 'Ayın Matematik Sorusu', topic: 'Problem çözme',
    source: 'TÜBİTAK Bilim Genç', date: 'Kasım 2026', lang: 'Türkçe',
    url: 'https://bilimgenc.tubitak.gov.tr/makale/ayin-matematik-sorusu-kasim-2026',
    note: 'Ders çalışmaya kısa bir ara verdiğinde çözebileceğin bir problem. Küçük örneklerden bir örüntü çıkarıp sonucu ispatlamayı dene.' },
  { id: 'dijkstra', type: 'wiki', title: 'Dijkstra algoritması', topic: 'Algoritmalar',
    source: 'Vikipedi', lang: 'Türkçe', url: 'https://tr.wikipedia.org/wiki/Dijkstra_algoritmas%C4%B1',
    note: 'Bir çizgede en kısa yolun adım adım nasıl bulunduğunu gör. Küçük bir örnek çizip öncelik kuyruğunda hangi tepenin sıradaki olduğunu takip et.' },
  { id: 'newton', type: 'wiki', title: 'Newton yöntemi', topic: 'Nümerik Analiz 1',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Newton%27s_method',
    note: 'Kök bulma formülünü teğet üzerinden anlamlandır. Başlangıç noktasını değiştirerek yakınsamanın nasıl etkilendiğini iki örnekte karşılaştır.' },
  { id: 'topology', type: 'wiki', title: 'Topolojik uzay', topic: 'Topoloji 1',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Topological_space',
    note: 'Açık kümelerden başlayarak topoloji aksiyomlarını örneklerle gör. Ayrık topoloji başlığındaki örneği üç elemanlı bir kümede yaz.' },
  { id: 'group', type: 'wiki', title: 'Grup', topic: 'Soyut Cebir 1',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Group_(mathematics)',
    note: 'Grup aksiyomlarını simetri örnekleri üzerinden gözden geçir. Bir işlem tablosunda birim elemanı ve tersleri bulmayı dene.' },
  { id: 'induction', type: 'wiki', title: 'Matematiksel tümevarım', topic: 'Soyut Matematik 1',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Mathematical_induction',
    note: 'Başlangıç ve tümevarım adımlarının rollerini ayır. Ardından ilk n tek sayının toplamını aynı yöntemle ispatla.' },
  { id: 'cauchy-riemann', type: 'wiki', title: 'Cauchy–Riemann denklemleri', topic: 'Kompleks Analiz',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Cauchy%E2%80%93Riemann_equations',
    note: 'Bir kompleks fonksiyonun gerçek ve sanal parçaları üzerinden türev koşullarını incele. Bir örnekte kısmi türevleri kendin hesapla.' },
  { id: 'recurrence', type: 'wiki', title: 'Yineleme bağıntıları', topic: 'Fark Denklemleri 1',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Recurrence_relation',
    note: 'Başlangıç koşulu ile bir dizinin kurallı biçimde üretilmesini incele. Bir doğrusal bağıntının ilk terimlerini yazıp kapalı formuyla karşılaştır.' },
  { id: 'frenet', type: 'wiki', title: 'Frenet–Serret formülleri', topic: 'Diferansiyel Geometri',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Frenet%E2%80%93Serret_formulas',
    note: 'Teğet, normal ve binormal vektörlerin eğri boyunca nasıl değiştiğine bak. Çember üzerinde eğrilik ve burulmayı hesaplayarak formülleri kontrol et.' },
  { id: 'conics', type: 'wiki', title: 'Konik kesitler', topic: 'Analitik Geometri',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Conic_section',
    note: 'Elips, parabol ve hiperbolü yalnız denklemlerinden değil, geometrik tanımlarından da karşılaştır.' },
  { id: 'model', type: 'wiki', title: 'Matematiksel model', topic: 'Uygulamalı Matematik',
    source: 'Wikipedia', lang: 'İngilizce', url: 'https://en.wikipedia.org/wiki/Mathematical_model',
    note: 'Bir problemi modellemeden önce hangi değişkenleri ve varsayımları seçtiğini yaz. Sayfadaki örneklerden birinde bu ayrımı uygula.' },
  { id: 'chernobyl', type: 'wiki', title: 'Çernobil faciası', topic: 'Bilim tarihi',
    source: 'Vikipedi', lang: 'Türkçe', url: 'https://tr.wikipedia.org/wiki/%C3%87ernobil_Facias%C4%B1',
    note: 'Kaza zaman çizelgesini ve santralin sonrasını birlikte ele almak için başlangıç. Teknik ayrıntıları okurken birincil kaynaklara verilen bağlantıları da takip et.' },
  { id: 'mit-algorithms', type: 'study', title: 'Algoritmalara Giriş', topic: 'Algoritmalar',
    source: 'MIT OpenCourseWare', lang: 'İngilizce', url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
    note: 'Graf taraması, en kısa yollar ve dinamik programlama için ders videoları, notlar ve problemler. Sınavındaki konuyla eşleşen haftadan başla.' },
  { id: 'mit-ode', type: 'study', title: 'Diferansiyel Denklemler', topic: 'Diferansiyel Denklemler 1',
    source: 'MIT OpenCourseWare', lang: 'İngilizce', url: 'https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/',
    note: 'Video, çalışma notu ve alıştırma içeren açık ders. Birinci mertebe denklemler ya da Laplace dönüşümü için ilgili bölümü aç.' },
  { id: 'iaea', type: 'study', title: 'Çernobil kazası hakkında IAEA dosyası', topic: 'Bilim tarihi',
    source: 'Uluslararası Atom Enerjisi Ajansı', lang: 'İngilizce', url: 'https://www.iaea.org/topics/chornobyl',
    note: 'Kaza hakkındaki teknik raporlara ve kurumsal değerlendirmelere ulaşmak için Vikipedi okumasının ardından kullan.' },
];

const discoverFeeds = [
  ['TÜBİTAK Bilim Genç', 'Türkçe bilim, teknoloji ve matematik', 'https://bilimgenc.tubitak.gov.tr/'],
  ['Quanta · Matematik', 'Matematik araştırmaları ve açıklayıcı yazılar', 'https://www.quantamagazine.org/mathematics/'],
  ['Quanta · Bilgisayar bilimi', 'Algoritmalar, yapay zekâ ve bilgisayar bilimi', 'https://www.quantamagazine.org/computer-science/'],
  ['arXiv · Matematik', 'Yeni araştırma ön baskıları', 'https://arxiv.org/list/math/recent'],
];

const discoverStorageKey = 'everything-app-discover-saved-v1';
let discoverSaved = new Set(readDiscoverSaved());
let discoverFilter = 'all';
let discoverQuery = '';
const newsCacheKey = 'everything-app-news-v1';
const newsArchiveKey = 'everything-app-news-archive-v1';
let discoverNews = discoverRead(newsCacheKey, { items: [], checked: 0 });
let discoverArchive = discoverRead(newsArchiveKey, {});
let discoverNewsMessage = '';
let loadingNews = false;
let newsRetry = 0;

function discoverRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function discoverKeep(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Current tab still has its copy. */ }
}

function discoverCatalog() {
  const cutoff = Date.now() - 14 * 86400000;
  const combined = [
    ...discoverNews.items.filter(item => item.published >= cutoff),
    ...discoverItems.filter(item => item.type !== 'news' || discoverSaved.has(item.id)),
    ...Object.values(discoverArchive).filter(item => discoverSaved.has(item.id)),
  ];
  const unique = new Map();
  for (const item of combined) if (!unique.has(item.id)) unique.set(item.id, item);
  return [...unique.values()];
}

function newsStatus() {
  if (discoverNewsMessage) return discoverNewsMessage;
  if (location.protocol === 'file:') return 'Günlük akış için proje klasöründe node server.js çalıştırıp http://127.0.0.1:4173 adresini aç.';
  if (!discoverNews.checked) return 'Haber kaynakları kontrol ediliyor.';
  return 'Son başarılı kontrol: ' + new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' }).format(discoverNews.checked);
}

async function refreshDiscoverNews(force = false) {
  if (location.protocol === 'file:' || !document.querySelector('#discover-content') || loadingNews) return;
  const completeToday = discoverNews.day === activeDay() && discoverNews.sourcesUpdated === discoverNews.sourcesTotal;
  if (!force && (completeToday || Date.now() < newsRetry)) return;
  loadingNews = true;
  newsRetry = Date.now() + 15 * 60000;
  try {
    const response = await fetch('/api/news', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('news');
    discoverNews = await response.json();
    discoverKeep(newsCacheKey, discoverNews);
    discoverNewsMessage = '';
  } catch {
    discoverNewsMessage = 'Haber kaynakları şu an yanıt vermiyor. Son 14 güne ait kaydedilmiş akış varsa burada gösteriliyor.';
  } finally {
    loadingNews = false;
    const root = document.querySelector('#discover-content');
    if (root) {
      root.querySelector('#discover-news-status').textContent = newsStatus();
      root.querySelector('.discover-grid').innerHTML = discoverCatalog().map(discoverCard).join('');
      updateDiscoverResults(root);
    }
  }
}

function readDiscoverSaved() {
  try {
    const stored = JSON.parse(localStorage.getItem(discoverStorageKey));
    return Array.isArray(stored) ? stored.filter(value => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function discoverNormalize(value) {
  return value.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i').trim();
}

function discoverMatches(item) {
  if (item.type === 'news' && discoverFilter !== 'saved' &&
      (!item.published || item.published < Date.now() - 14 * 86400000)) return false;
  const categoryMatches = discoverFilter === 'all' || (discoverFilter === 'saved' ? discoverSaved.has(item.id) : discoverFilter === item.type);
  if (!categoryMatches) return false;
  return discoverNormalize([item.title, item.topic, item.source, item.note, item.lang].join(' ')).includes(discoverNormalize(discoverQuery));
}

function discoverCard(item) {
  const saved = discoverSaved.has(item.id);
  const metadata = [item.source, item.lang, item.date].filter(Boolean).map(escapeText).join(' · ');
  const link = escapeText(item.url);
  return `<article class="panel discover-card" data-discover-item="${item.id}" ${discoverMatches(item) ? '' : 'hidden'}>
    <div class="discover-card-top">
      <p class="discover-type discover-type-${item.type}">${discoverCategories[item.type]} <span aria-hidden="true">·</span> ${escapeText(item.topic)}</p>
      <button type="button" class="button secondary discover-save" data-discover-save="${item.id}" aria-pressed="${saved}" aria-label="Kaydet: ${escapeText(item.title)}">${saved ? 'Kaydedildi' : 'Kaydet'}</button>
    </div>
    <h3><a href="${link}" target="_blank" rel="noopener noreferrer">${escapeText(item.title)}</a></h3>
    <p class="discover-meta">${metadata}</p>
    ${item.note ? `<p class="discover-note">${escapeText(item.note)}</p>` : ''}
    <a class="discover-link" href="${link}" target="_blank" rel="noopener noreferrer" aria-label="${escapeText(item.title)} kaynağını aç">Kaynağı aç <span aria-hidden="true">↗</span></a>
  </article>`;
}

function discoverPage() {
  const items = discoverCatalog();
  const count = items.filter(discoverMatches).length;
  return `${intro('Keşfet', 'Matematik ve bilgisayar bilimi önde, farklı alanlardan günlük haberler.')}
    ${curiosityPanel()}
    <div id="discover-content">
      <section class="panel discover-feeds" aria-labelledby="discover-feed-heading">
        <div><h2 id="discover-feed-heading">Günlük haber akışı</h2><p id="discover-news-status" role="status">${escapeText(newsStatus())}</p>
        ${location.protocol !== 'file:' ? '<button type="button" class="button secondary" data-news-refresh>Kaynakları kontrol et</button>' : ''}</div>
        <div class="discover-feed-grid">${discoverFeeds.map(([name, description, url]) => `
          <a href="${url}" target="_blank" rel="noopener noreferrer">
            <strong>${escapeText(name)} <span aria-hidden="true">↗</span></strong>
            <span>${escapeText(description)}</span>
          </a>`).join('')}</div>
      </section>
      <section aria-labelledby="discover-catalog-heading">
        <div class="discover-catalog-heading">
          <h2 id="discover-catalog-heading">Okuma seçkisi</h2>
          <label class="field discover-search" for="discover-query"><span>Ders, konu veya kaynak ara</span>
            <input id="discover-query" type="search" value="${escapeText(discoverQuery)}" placeholder="Örn. Topoloji" autocomplete="off">
          </label>
        </div>
        <div class="discover-toolbar">
          <div class="discover-filters" aria-label="Okuma türü" role="group">${Object.entries(discoverCategories).map(([key, label]) => `
            <button type="button" class="button secondary discover-filter" data-discover-filter="${key}" aria-pressed="${discoverFilter === key}">${label}</button>`).join('')}</div>
          <p id="discover-count" role="status">${count} kaynak</p>
        </div>
        <p id="discover-empty" class="panel discover-empty" ${count ? 'hidden' : ''}>${discoverEmptyMessage()}</p>
        <div class="discover-grid">${items.map(discoverCard).join('')}</div>
      </section>
    </div>`;
}

function discoverEmptyMessage() {
  return discoverFilter === 'saved' && !discoverSaved.size
    ? 'Henüz bir kaynak kaydetmedin. Tümü sekmesindeki kartlardan Kaydet’e bas.'
    : 'Bu aramayla eşleşen kaynak yok.';
}

function updateDiscoverResults(root) {
  let count = 0;
  for (const item of discoverCatalog()) {
    const card = root.querySelector(`[data-discover-item="${item.id}"]`);
    if (!card) continue;
    const matches = discoverMatches(item);
    card.hidden = !matches;
    if (matches) count += 1;
  }
  root.querySelector('#discover-count').textContent = `${count} kaynak`;
  const empty = root.querySelector('#discover-empty');
  empty.textContent = discoverEmptyMessage();
  empty.hidden = count > 0;
}

document.addEventListener('input', event => {
  if (event.target.id !== 'discover-query') return;
  const root = event.target.closest('#discover-content');
  discoverQuery = event.target.value;
  updateDiscoverResults(root);
});

document.addEventListener('click', event => {
  if (event.target.closest('[data-news-refresh]')) {
    void refreshDiscoverNews(true);
    return;
  }
  const button = event.target.closest('[data-discover-filter], [data-discover-save]');
  if (!button) return;
  const root = button.closest('#discover-content');
  if (!root) return;
  if (button.dataset.discoverFilter) {
    discoverFilter = button.dataset.discoverFilter;
    for (const option of root.querySelectorAll('[data-discover-filter]')) {
      option.setAttribute('aria-pressed', String(option === button));
    }
  } else {
    const id = button.dataset.discoverSave;
    const save = !discoverSaved.has(id);
    if (save) {
      const item = discoverCatalog().find(entry => entry.id === id);
      if (item?.type === 'news') discoverArchive[id] = item;
      discoverSaved.add(id);
    } else {
      discoverSaved.delete(id);
      delete discoverArchive[id];
      if (discoverFilter === 'saved') button.closest('article').hidden = true;
    }
    discoverKeep(newsArchiveKey, discoverArchive);
    try {
      localStorage.setItem(discoverStorageKey, JSON.stringify([...discoverSaved]));
    } catch {
      // Keep the current session usable when browser storage is restricted.
    }
    button.setAttribute('aria-pressed', String(save));
    button.textContent = save ? 'Kaydedildi' : 'Kaydet';
    if (discoverFilter === 'saved') root.querySelector('[data-discover-filter="saved"]').focus();
  }
  updateDiscoverResults(root);
});

window.addEventListener('focus', () => { void refreshDiscoverNews(); });
setInterval(() => { void refreshDiscoverNews(); }, 60000);
