const courseCatalog = [
  ['Soyut Matematik 1', [
    'Önermeler, mantıksal bağlaçlar ve niceleyiciler',
    'Doğrudan ispat, karşıt ters ve çelişki',
    'Matematiksel tümevarım',
    'Kümeler ve küme işlemleri',
    'Bağıntılar, denklik ve sıralama',
    'Fonksiyonlar, bileşke ve ters fonksiyon',
    'Sonlu ve sayılabilir kümeler',
  ]],
  ['Soyut Cebir 1', [
    'İkili işlemler ve grup aksiyomları',
    'Alt gruplar ve devirli gruplar',
    'Permütasyonlar ve simetrik gruplar',
    'Yan sınıflar ve Lagrange teoremi',
    'Normal alt gruplar ve bölüm grupları',
    'Grup homomorfizmaları ve izomorfizmaları',
  ]],
  ['Nümerik Analiz 1', [
    'Yuvarlama ve kesme hataları',
    'Kök bulma: ikiye bölme ve sabit nokta',
    'Newton ve sekant yöntemleri',
    'Lagrange ve Newton interpolasyonu',
    'Sayısal türev ve integral',
    'Doğrusal sistemler: Gauss eliminasyonu ve LU ayrışımı',
    'İteratif yöntemler ve yakınsama',
  ]],
  ['Topoloji 1', [
    'Topolojik uzaylar ve açık kümeler',
    'Taban ve alttaban',
    'İç, kapanış, sınır ve birikim noktaları',
    'Altuzay ve çarpım topolojileri',
    'Süreklilik ve homeomorfizmalar',
    'Bağlantılılık ve kompaktlık',
    'Ayırma aksiyomları',
  ]],
  ['Fark Denklemleri 1', [
    'Diziler, fark operatörü ve başlangıç koşulları',
    'Birinci mertebeden doğrusal fark denklemleri',
    'Yüksek mertebeden denklemler ve karakteristik kökler',
    'Homojen olmayan denklemler ve özel çözümler',
    'Denge noktaları ve kararlılık',
    'Ayrık büyüme ve azalma modelleri',
  ]],
  ['Kompleks Analiz', [
    'Kompleks sayılar, kutupsal gösterim ve kökler',
    'Kompleks fonksiyonlar ve Cauchy–Riemann denklemleri',
    'Analitik fonksiyonlar ve temel örnekler',
    'Kontur integralleri ve Cauchy teoremi',
    'Cauchy integral formülü',
    'Taylor ve Laurent serileri',
    'Tekillikler ve rezidüler',
  ]],
  ['Diferansiyel Geometri', [
    'Parametreli eğriler ve yay uzunluğu',
    'Eğrilik, burulma ve Frenet çatısı',
    'Parametreli yüzeyler ve teğet düzlem',
    'Birinci ve ikinci temel formlar',
    'Gauss ve ortalama eğrilik',
    'Jeodezikler',
  ]],
  ['Algoritmalar', [
    'Asimptotik gösterimler ve zaman analizi',
    'Özyineleme ve yineleme bağıntıları',
    'Arama, sıralama ve böl ve yönet',
    'Açgözlü algoritmalar',
    'Dinamik programlama',
    'Çizge dolaşmaları: BFS ve DFS',
    'En kısa yol ve minimum kapsayan ağaç',
  ]],
  ['Uygulamalı Matematik', [
    'Matematiksel model kurma ve varsayımları belirleme',
    'Boyut analizi ve ölçekleme',
    'Büyüme, azalma ve nüfus modelleri',
    'Denge noktaları ve kararlılık',
    'Model sonuçlarını veriyle değerlendirme',
    'Optimizasyon ve parametre duyarlılığı',
  ]],
  ['Analitik Geometri', [
    'Koordinat sistemleri ve vektörler',
    'Doğru denklemleri, açı ve uzaklık',
    'Çember, elips, parabol ve hiperbol',
    'Öteleme ve dönme ile koniklerin indirgenmesi',
    'Uzayda doğrular ve düzlemler',
    'Küre ve ikinci dereceden yüzeyler',
  ]],
  ['Diferansiyel Denklemler 1', [
    'Birinci mertebeden ayrılabilir ve doğrusal denklemler',
    'Tam denklemler ve integral çarpanı',
    'Bernoulli denklemi ve başlangıç değer problemleri',
    'Sabit katsayılı ikinci mertebeden doğrusal denklemler',
    'Belirsiz katsayılar ve parametrelerin değişimi',
    'Laplace dönüşümü ve başlangıç değer problemleri',
  ]],
];

function normalizeCourseName(name) {
  return name.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\bi\b/g, '1');
}

function knownCourse(name) {
  const normalized = normalizeCourseName(name);
  return courseCatalog.find(([title]) => normalizeCourseName(title) === normalized);
}

function canonicalCourse(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return knownCourse(trimmed)?.[0] ?? trimmed;
}

function courseField(label, value, required = false, name = 'course') {
  return inputField(label, name, value, `list="course-names" maxlength="100" ${required ? 'required' : ''}`);
}

function topicsForCourse(name) {
  const course = knownCourse(name);
  if (!course) return [];
  return state.courseTopics[courseKey(course[0])] ?? course[1];
}

function topicLines(text) {
  return [...new Set(text.split(/\r?\n/).map(topic => topic.trim()).filter(Boolean))];
}

function coursesPage() {
  return `${intro('Derslerim', 'Konu taslaklarını kendi ders içeriğine göre düzenle.')}
    <div class="course-grid">${courseCatalog.map(([title]) => {
      const topics = topicsForCourse(title);
      return `<details class="panel course-card">
        <summary>${icon('book', 'tile-icon')}<span><strong>${escapeText(title)}</strong>
          <small>${topics.length} konu</small></span>${icon('chevron-right')}</summary>
        <div class="course-card-body">
          ${topics.length ? `<ol>${topics.map(topic => `<li>${escapeText(topic)}</li>`).join('')}</ol>` : '<p class="form-feedback">Henüz konu yok.</p>'}
          <div class="sync-actions">
            ${plannerButton('edit-course-topics', 'Konuları düzenle', title, 'pencil')}
            ${plannerButton('course-assessment', 'Sınav ekle', title, 'plus')}
          </div>
        </div>
      </details>`;
    }).join('')}</div>`;
}

function topicChoices(name) {
  const topics = topicsForCourse(name);
  if (!topics.length) return '<small class="row-meta">Konu seçmek için ders adını seç veya kendi konularını yaz.</small>';
  return `<details class="preference">
    <summary>Ders konularından seç</summary>
    <ul class="topic-choices">${topics.map(topic => `<li>${plannerButton('append-course-topic', escapeText(topic), topic, 'plus')}</li>`).join('')}</ul>
  </details>`;
}

document.querySelector('#course-names').replaceChildren(...courseCatalog.map(([title]) => {
  const option = document.createElement('option');
  option.value = title;
  return option;
}));
