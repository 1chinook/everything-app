const fitnessStorageKey = 'everything-app-fitness-v1';
const fitnessLocale = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const fitnessActivityLevels = {
  low: { label: 'Günün çoğu oturarak geçiyor, az yürüyüş', factor: 1.4 },
  moderate: { label: 'Düzenli yürüyüş ve haftada birkaç antrenman', factor: 1.6 },
  high: { label: 'Günlük hareket yüksek, düzenli antrenman', factor: 1.8 },
};

const fitnessMonths = [
  ['Düzeni kur', '2 salon günü · 1–2 set', 'Rahat yürüyüşe 10–20 dakika ile başla. İlk hafta adımlarını ölç, yurt menüsünde sürdürebildiğin seçenekleri bul.'],
  ['Hacmi artır', '2 salon günü · çoğu harekette 2 set', 'Toparlanman iyiyse yürüyüşlere 5–10 dakika ekle. Haftalık tartı eğilimine ve salon performansına birlikte bak.'],
  ['Ritmi koru', '2–3 salon günü · 2–3 set', 'Tempolu yürüyüşleri haftaya dağıt. Uygunsa orta yoğunlukta toplam 120–150 dakikaya yaklaş.'],
  ['Yükü ilerlet', '2–3 salon günü · 2–3 set', 'Üst tekrar sınırına iyi formla ulaşınca küçük bir ağırlık artışı yap. Uygunsa 150 dakika civarında tempolu yürüyüşü sürdür.'],
  ['Sürdürülebilir hale getir', '2–3 salon günü · toparlanmana göre', 'Sınav haftasında iki tam vücut seansını önceliklendir. İlk kilo hedefine doğru ilerlemeni değerlendir.'],
];

const fitnessWorkouts = {
  A: [
    ['Leg press', '8–12 tekrar'],
    ['Makinede göğüs press', '8–12 tekrar'],
    ['Lat pulldown', '8–12 tekrar'],
    ['Makinede leg curl', '10–15 tekrar'],
    ['Dead bug', 'Her yana 6–10 tekrar'],
  ],
  B: [
    ['Kutuya goblet squat veya leg press', '8–12 tekrar'],
    ['Oturarak kablo row', '8–12 tekrar'],
    ['Eğimli makine veya dambıl press', '8–12 tekrar'],
    ['Hip thrust veya glute bridge', '10–15 tekrar'],
    ['Pallof press', 'Her yana 8–12 tekrar'],
  ],
};

function readFitnessData() {
  try {
    return JSON.parse(localStorage.getItem(fitnessStorageKey)) ?? {};
  } catch {
    return {};
  }
}

const fitnessData = readFitnessData();

function fitnessCalorieEstimate({ weight, height, age, sex, activity }) {
  if (!Number.isFinite(weight) || weight < 35 || weight > 300 || !Number.isFinite(height) || height < 130 || height > 230) return null;
  if (!Number.isInteger(age) || age < 19 || age > 78 || !Object.hasOwn(fitnessActivityLevels, activity) || !['female', 'male'].includes(sex)) return null;
  const resting = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
  const maintenance = Math.round(resting * fitnessActivityLevels[activity].factor / 50) * 50;
  const target = Math.round((resting * fitnessActivityLevels[activity].factor - 300) / 50) * 50;
  const minimum = sex === 'male' ? 1800 : 1500;
  return { maintenance, target: target >= minimum ? target : null };
}

function fitnessStepTarget(baseline, month) {
  if (!Number.isInteger(baseline) || baseline < 1 || baseline > 40000) return null;
  const ceiling = Math.max(baseline, 7500);
  return Math.min(ceiling, baseline + [500, 1000, 1500, 2000, 2500][month - 1]);
}

function fitnessInput(label, name, value, attributes) {
  return field(label, `<input name="${name}" ${attributes} value="${escapeText(String(value ?? ''))}">`);
}

function fitnessTargets(profile) {
  const initialWeight = profile.initialWeight ?? profile.weight;
  const weightGoal = Number.isFinite(initialWeight) && initialWeight >= 35 && initialWeight <= 300
    ? `Yaklaşık ${fitnessLocale.format(Math.round(initialWeight * 0.95))} kg`
    : 'Başlangıç kilonu gir';
  const calories = fitnessCalorieEstimate(profile);
  const steps = fitnessStepTarget(profile.baseline, 1);
  const caloriesText = calories?.target ? `${fitnessLocale.format(calories.target)} kcal/gün` : 'Bilgilerini gir';
  const calorieHint = calories?.target
    ? `Tahmini koruma ${fitnessLocale.format(calories.maintenance)} kcal/gün. Başlangıç hedefi yaklaşık 300 kcal daha düşük.`
    : calories ? 'Hesaplanan değer düşük kaldı. Kişisel bir hedef için diyetisyenle değerlendirebilirsin.'
      : 'Yetişkin tahmini için yaş, formül seçimi ve hareket düzeyi gerekiyor.';
  return `<div class="fitness-metrics">
    <div><span>Beş aylık ilk kilo hedefi</span><strong>${weightGoal}</strong><small>Başlangıç kilosuna göre yaklaşık %5 kayıp. Hedefe varma süresi kişiden kişiye değişir.</small></div>
    <div><span>Günlük kalori hedefi</span><strong>${caloriesText}</strong><small>${calorieHint}</small></div>
    <div><span>İlk ay adım hedefi</span><strong>${steps ? `${fitnessLocale.format(steps)} adım/gün` : '7 gün ölç'} </strong><small>${steps ? 'Günlük sayı yerine haftalık ortalamayı takip et.' : 'Telefonundaki 7 günlük ortalamayı gir. Ağrı veya belirgin yorgunluk varsa artışı beklet.'}</small></div>
  </div>`;
}

function fitnessProfileForm(profile) {
  const activityOptions = Object.entries(fitnessActivityLevels).map(([value, entry]) =>
    `<option value="${value}"${profile.activity === value ? ' selected' : ''}>${entry.label}</option>`).join('');
  return `<form id="fitness-profile-form" class="fitness-form">
    <div class="fitness-fields">
      ${fitnessInput('Güncel kilo (kg)', 'weight', profile.weight, 'type="number" min="35" max="300" step="0.1" required')}
      ${fitnessInput('Boy (cm)', 'height', profile.height, 'type="number" min="130" max="230" step="1" required')}
      ${fitnessInput('Yaş', 'age', profile.age, 'type="number" min="19" max="78" step="1" placeholder="Kalori hesabı için"')}
      ${field('Enerji formülü için cinsiyet', `<select name="sex"><option value="">Seç</option>
        <option value="female"${profile.sex === 'female' ? ' selected' : ''}>Kadın</option><option value="male"${profile.sex === 'male' ? ' selected' : ''}>Erkek</option></select>`)}
      ${field('Hareket düzeyi', `<select name="activity"><option value="">Seç</option>${activityOptions}</select>`)}
      ${fitnessInput('7 günlük ortalama adım', 'baseline', profile.baseline || '', 'type="number" min="1" max="40000" step="1" placeholder="Henüz ölçmediysen boş bırak"')}
    </div>
    <div class="fitness-actions"><button type="submit" class="button primary">Hedefleri güncelle</button><span data-fitness-status="profile" role="status"></span></div>
    <p class="row-meta">Kalori hesabı 19–78 yaş için Mifflin–St Jeor tahminidir. Gebelik, emzirme veya beslenmeyi etkileyen bir sağlık durumunda kişisel planı bir uzmana danış.</p>
  </form>`;
}

function fitnessMonthList(profile) {
  return `<ol class="fitness-months">${fitnessMonths.map(([title, lifting, guidance], index) => {
    const month = index + 1;
    const steps = fitnessStepTarget(profile.baseline, month);
    return `<li><span class="fitness-month-index">${month}. ay</span><div><strong>${title}</strong><p>${guidance}</p><small>${lifting}</small></div>
      <span class="pill sport">${steps ? `${fitnessLocale.format(steps)} adım/gün` : 'Ortalamanı gir'}</span></li>`;
  }).join('')}</ol>`;
}

function fitnessGymPlan() {
  return `<section class="panel fitness-panel">
    ${panelHeading('Salon programı', 'Örnek hafta · Pazartesi A, Perşembe B. Üç gün uygunsa A/B/A ve B/A/B haftalarını sırayla uygula.')}
    <div class="fitness-body">
      <p>5–10 dakika hafif yürüyüş veya bisikletle ısın. İlk ay her hareket için 1–2 set yap. Setler arasında yaklaşık 1–2 dakika dinlen. Seti, düzgün formla 2–3 tekrar daha çıkarabileceğin noktada bitir.</p>
      <div class="fitness-split">${Object.entries(fitnessWorkouts).map(([code, moves]) => `<article class="fitness-subpanel">
        <div class="fitness-card-heading"><h3>Antrenman ${code}</h3><button type="button" class="button secondary" data-fitness-workout="${code}">Takvime ekle</button></div>
        <ul class="fitness-exercises">${moves.map(([move, reps]) => `<li><strong>${move}</strong><span>${reps}</span></li>`).join('')}</ul>
      </article>`).join('')}</div>
      <p class="row-meta">Salon günleri arasında bir dinlenme günü bırak. Hareket sırasında keskin ağrı olursa egzersizi durdur ve formu eğitmenle kontrol et.</p>
    </div>
  </section>`;
}

function fitnessDormMeals() {
  const meals = [
    ['Kahvaltı', 'Yumurta veya sade yoğurt, tam tahıllı ekmek ya da yulaf, domates-salatalık veya bir meyve.'],
    ['Öğle', 'Yemekhanede kuru fasulye, nohut, mercimek veya tavuk seç. Yanına sebze veya salata ve küçük bir porsiyon bulgur ekle.'],
    ['Akşam', 'Izgara ya da fırın ana yemek ve sebze seç. Menü kızartma ağırlıklıysa çorba, yoğurt ve salatayı değerlendir, varsa baklagil veya yumurta ekle.'],
    ['Antrenman çevresi', 'Acıkırsan önce muz ve sade yoğurt gibi kolay bir ara öğün seç. Sonrasında ana öğününde baklagil, yumurta, tavuk veya yoğurt bulunsun.'],
    ['İçecek', 'Suyu gün içine yay. Salona matara götür ve yürüyüşte veya sıcakta ihtiyacına göre su iç. Şekersiz çay ve kahve de içecek seçenekleri arasında.'],
    ['Yurt alışverişi', 'Yulaf, meyve, küçük paket tuzsuz kuruyemiş, tam tahıllı ekmek ve açılmamış tek porsiyon UHT süt. Soğutma imkânın varsa yoğurt, ayran ve haşlanmış yumurta.'],
  ];
  return `<section class="panel fitness-panel">
    ${panelHeading('Yurtta beslenme', 'Öğünleri yemekhanenin menüsüne, bütçene ve antrenman saatine göre değiştir.')}
    <div class="fitness-body">
      <div class="fitness-meals">${meals.map(([title, text]) => `<article class="fitness-subpanel"><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
      <p class="row-meta">Kalori takibi yapıyorsan bir haftalık gözlemle başla. Porsiyon, ekmek, sos, yağ ve içecekleri de kaydet. Yemekhane etiket veriyorsa yaklaşık tahmin yerine etiketi kullan.</p>
    </div>
  </section>`;
}

function fitnessDailyLog() {
  const day = selectedDay;
  const logs = fitnessData.logs ?? {};
  const entry = logs[day] ?? {};
  return `<section class="panel fitness-panel">
    ${panelHeading('Günlük takip', 'Spor ekranındaki seçili gün için kayıt gir. Eğilimi görmek için benzer koşullarda tartıl.')}
    <form id="fitness-log-form" class="fitness-body fitness-form" data-day="${escapeText(day)}">
      <div class="fitness-fields">
        ${fitnessInput('Kilo (kg)', 'weight', entry.weight, 'type="number" min="35" max="300" step="0.1"')}
        ${fitnessInput('Alınan kalori (kcal)', 'calories', entry.calories, 'type="number" min="1" max="10000" step="1"')}
        ${fitnessInput('Adım sayısı', 'steps', entry.steps, 'type="number" min="0" max="50000" step="1"')}
      </div>
      <div class="fitness-actions"><button type="submit" class="button secondary">Günü kaydet</button><span data-fitness-status="log" role="status"></span></div>
      <p id="fitness-log-summary" class="row-meta">${fitnessLogSummary(day)}</p>
    </form>
  </section>`;
}

function fitnessLogSummary(day) {
  const logs = fitnessData.logs ?? {};
  const week = Object.entries(logs).filter(([date]) => date >= shiftDay(day, -6) && date <= day).map(([, entry]) => entry);
  const weights = week.map(entry => entry.weight).filter(Number.isFinite);
  const calories = week.map(entry => entry.calories).filter(Number.isFinite);
  const steps = week.map(entry => entry.steps).filter(Number.isFinite);
  const average = numbers => fitnessLocale.format(numbers.reduce((sum, number) => sum + number, 0) / numbers.length);
  const parts = [];
  if (weights.length) parts.push(`Kilo ortalaması ${average(weights)} kg (${weights.length} ölçüm)`);
  if (calories.length) parts.push(`Alınan kalori ortalaması ${average(calories)} kcal (${calories.length} gün)`);
  if (steps.length) parts.push(`Adım ortalaması ${average(steps)} (${steps.length} gün)`);
  return parts.length ? `Son 7 gün · ${parts.join(' · ')}` : 'Son 7 güne kayıt girdikçe ortalamaların burada görünür.';
}

function fitnessPlan() {
  const profile = fitnessData.profile ?? {};
  return `<div class="fitness-area">
    <section class="panel fitness-panel">
      ${panelHeading('5 aylık kilo ve antrenman planı', 'Yurt yemekleri, yürüyüş ve salon programı bir arada. Kilo ve boy bilgilerin bu tarayıcıda saklanır.')}
      <div class="fitness-body">
        <div id="fitness-targets">${fitnessTargets(profile)}</div>
        ${fitnessProfileForm(profile)}
      </div>
    </section>
    <section class="panel fitness-panel">
      ${panelHeading('Aylık yol haritası', 'Adım artışlarını toparlanmana göre uygula. Salonda ve yürüyüşte zorlandığında bir önceki seviyede kal.')}
      <div id="fitness-months" class="fitness-body">${fitnessMonthList(profile)}</div>
    </section>
    ${fitnessGymPlan()}
    ${fitnessDormMeals()}
    ${fitnessDailyLog()}
    <p class="row-meta fitness-sources">Sağlık ve antrenman kaynakları ·
      <a href="https://www.niddk.nih.gov/health-information/weight-management/choosing-a-safe-successful-weight-loss-program" target="_blank" rel="noopener noreferrer">NIDDK kilo hedefi</a> ·
      <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer">Enerji formülü</a> ·
      <a href="https://www.cdc.gov/physical-activity-basics/guidelines/adults.html" target="_blank" rel="noopener noreferrer">CDC hareket</a> ·
      <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/" target="_blank" rel="noopener noreferrer">ACSM kuvvet çalışması</a> ·
      <a href="https://pubmed.ncbi.nlm.nih.gov/40713949/" target="_blank" rel="noopener noreferrer">Adım araştırması</a> ·
      <a href="https://hsgm.saglik.gov.tr/depo/birimler/saglikli-beslenme-ve-hareketli-hayat-db/Dokumanlar/Rehberler/Turkiye_Beslenme_Rehber_TUBER_2022_min.pdf" target="_blank" rel="noopener noreferrer">Türkiye Beslenme Rehberi</a>
    </p>
  </div>`;
}

function persistFitnessData(status) {
  try {
    localStorage.setItem(fitnessStorageKey, JSON.stringify(fitnessData));
    status.textContent = 'Bu tarayıcıya kaydedildi.';
  } catch {
    status.textContent = 'Bu oturumda güncellendi. Tarayıcıya kalıcı kayıt yapılamadı.';
  }
}

document.addEventListener('submit', event => {
  const form = event.target;
  if (form.id !== 'fitness-profile-form' && form.id !== 'fitness-log-form') return;
  event.preventDefault();
  const data = new FormData(form);
  const number = name => data.get(name) === '' ? null : Number(data.get(name));
  if (form.id === 'fitness-profile-form') {
    const weight = number('weight');
    const profile = {
      weight, initialWeight: fitnessData.profile?.initialWeight ?? fitnessData.profile?.weight ?? weight,
      height: number('height'), age: number('age'),
      sex: data.get('sex'), activity: data.get('activity'), baseline: number('baseline'),
    };
    fitnessData.profile = profile;
    document.querySelector('#fitness-targets').innerHTML = fitnessTargets(profile);
    document.querySelector('#fitness-months').innerHTML = fitnessMonthList(profile);
    persistFitnessData(form.querySelector('[data-fitness-status="profile"]'));
    return;
  }
  const entry = { weight: number('weight'), calories: number('calories'), steps: number('steps') };
  fitnessData.logs ??= {};
  fitnessData.logs[form.dataset.day] = entry;
  persistFitnessData(form.querySelector('[data-fitness-status="log"]'));
  document.querySelector('#fitness-log-summary').textContent = fitnessLogSummary(form.dataset.day);
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-fitness-workout]');
  if (!button) return;
  openEditor('add-workout');
  const workoutForm = document.querySelector('#editor-form');
  workoutForm.elements.namedItem('title').value = `Salon · Antrenman ${button.dataset.fitnessWorkout}`;
  workoutForm.elements.namedItem('place').value = 'Spor salonu';
  workoutForm.elements.namedItem('minutes').value = '45';
});
