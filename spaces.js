const appSpaces = {
  akademi: {
    title:'Akademi', icon:'book', description:'Derslerin, notların ve çalışma planın.',
    tools:[
      ['tekrar','Aralıklı tekrar','sync','Zorlandığın konuları daha sık hatırla'],
      ['dersler','Final konuları','book','Ders içerikleri ve konu takibi'],
      ['notlar','Notlar','chart','Sınav puanları ve geçme hedefleri'],
      ['program','Ders programı','calendar','Haftalık ders saatleri'],
      ['calisma','Çalışma programı','sparkle','Önceliklerine göre çalışma planı'],
      ['takvim','Sınav ve teslimler','calendar','Yaklaşan sınavlar ve son tarihler'],
      ['dokumanlar','Dokümanlar','file','Ders materyalleri ve dosyalar'],
      ['hafta','Haftalık özet','chart','Çalışma kayıtların ve ilerlemen'],
    ],
  },
  saglik: {
    title:'Sağlık', icon:'dumbbell', description:'Uyku, hareket ve antrenman düzenin.',
    tools:[['spor','Spor','dumbbell','Hareket önerileri ve günlük kalori tahmini'],['uyku','Uyku','moon','Uyku saatleri ve dinlenme alışkanlıkları']],
  },
  kesif: {
    title:'Keşif', icon:'compass', description:'Oku, araştır ve yeni şeyler öğren.',
    tools:[['kesfet','Haberler','file','İlgi alanlarından günlük haberler'],['merak','Merak ve keşif','compass','Günün keşfi, sorular ve okuma rotaları'],['kitaplar','Kitap günlüğü','book','Okuma rafların, alıntılar ve notlar'],['dil','Dil pratiği','file','Kelime defteri ve tekrar sınavları']],
  },
  atolye: {
    title:'Atölye', icon:'layers', description:'Üretmek, oynamak ve denemek için alanın.',
    tools:[['projeler','Hobi projeleri','layers','Fikirlerden tamamlanan projelere'],['fotograf','Fotoğraf temaları','sparkle','Haftalık meydan okumalar ve fotoğraf serileri'],['oyunlar','Oyun günlüğü','check','Oyunların, ilerlemen ve değerlendirmelerin']],
  },
  kisisel: {
    title:'Kişisel', icon:'heart', description:'Anıların, deneyimlerin ve gündelik kayıtların.',
    tools:[['degerlendirme','Gün sonu','check','Günü değerlendir ve yarını düzenle'],['anilar','Anı haritası','compass','Fotoğraf, yer ve tarihle hatırladıkların'],['deneyimler','Deneyim listesi','check','Bu yıl yapmak ve görmek istediklerin'],['muzik','Müzik keşif günlüğü','heart','Yeni şarkılar ve sana hatırlattıkları'],['odemeler','Ödemeler','calendar','Abonelikler ve ödeme tarihleri'],['iliski','Birlikte planlar','heart','Birlikte planların ve özel tarihler']],
  },
};

const journalSpaceRoutes = { dil:'language', fotograf:'challenges', oyunlar:'games', anilar:'memories', deneyimler:'experiences', muzik:'music', odemeler:'payments' };

function journalSpacePage(kind) {
  if (journalKind !== kind) {
    journalKind=kind;
    journalEditing=false;
    journalEditId=null;
    journalQuery='';
    journalMessage='';
  }
  journalStandalone=true;
  return journalsPage();
}

function spaceViews() {
  return {
    merak:()=>intro('Merak ve keşif','Sorularına ve yeni konulara zaman ayır.')+curiosityPanel(),
    ...Object.fromEntries(Object.keys(appSpaces).map(key=>[key,()=>spaceHome(key)])),
    ...Object.fromEntries(Object.entries(journalSpaceRoutes).map(([route,kind])=>[route,()=>journalSpacePage(kind)])),
    gunlukler:()=>spaceHome('kisisel'),
  };
}

function spaceForPage(page) {
  if(page==='gunlukler')return 'kisisel';
  return Object.keys(appSpaces).find(key=>key===page || appSpaces[key].tools.some(tool=>tool[0]===page));
}

function spacePageLabel(page) {
  const key=spaceForPage(page);
  if(!key)return null;
  const space=appSpaces[key];
  return space.tools.find(tool=>tool[0]===page)?.[1] ?? space.title;
}

function hubSpaces() {
  return `<section class="hub-spaces" aria-labelledby="hub-spaces-title"><h2 id="hub-spaces-title">Alanların</h2>
    <div class="hub-space-grid">${Object.entries(appSpaces).map(([key,space])=>`<a class="hub-space-card" href="#${key}" data-space-card="${key}">
    ${icon(space.icon,'space-card-icon')}<div><strong>${space.title}</strong><small>${space.description}</small></div>${icon('arrow')}</a>`).join('')}</div></section>`;
}

function spaceHome(key) {
  const space=appSpaces[key];
  return `<div class="space-welcome">${icon(space.icon,'space-welcome-icon')}<div><h1>${space.title}</h1><p>${space.description}</p></div></div>
    <div class="space-tools">${space.tools.map(([route,label,symbol,description])=>`<a href="#${route}" class="panel space-tool">
    ${icon(symbol,'tile-icon')}<div><h2>${label}</h2><p>${description}</p></div>${icon('arrow')}</a>`).join('')}</div>`;
}

function renderSpaceNavigation(page) {
  const key=spaceForPage(page);
  const space=appSpaces[key];
  document.body.dataset.space=key ?? 'hub';
  const brand=document.querySelector('.brand');
  brand.href=space ? '#'+key : '#bugun';
  brand.innerHTML=icon(space?.icon ?? 'layers','brand-icon')+`<span>${space?.title ?? 'Everything App'}</span>`;
  brand.setAttribute('aria-label',space ? space.title+' ana sayfa' : 'Everything App Bugün');
  const nav=document.querySelector('#space-navigation');
  const link=(route,label,symbol)=>`<a href="#${route}" data-page="${route}">${icon(symbol)}${label}</a>`;
  if(space) {
    nav.innerHTML=`<a class="hub-return" href="#bugun">${icon('chevron-left')}Bugün’e dön</a>
    <details class="space-nav" ${window.matchMedia('(min-width: 811px)').matches?'open':''}><summary>${space.title} menüsü ${icon('chevron-right')}</summary>
    <div class="nav-group">${link(key,'Genel bakış',space.icon)}${space.tools.map(([route,label,symbol])=>link(route,label,symbol)).join('')}</div></details>`;
  } else {
    nav.innerHTML=`<div class="nav-group">${link('bugun','Bugün','home')}${link('esitle','Eşitleme ve yedekler','sync')}</div>`;
  }
  const actions=document.querySelector('.topbar-actions');
  actions.hidden=!!space && key!=='akademi';
}

window.matchMedia('(min-width: 811px)').addEventListener('change', event=> {
  const menu=document.querySelector('.space-nav');
  if(menu) menu.open=event.matches;
});
