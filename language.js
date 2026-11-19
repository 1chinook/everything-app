const languageKey='everything-app-language-v1';
let languageFilter='';
let languageQuiz=null;
let languageRevealed=false;
let languageAnswerMessage='';
let languageEdit=null;
function readLanguageCards() {
  try { const cards=JSON.parse(localStorage.getItem(languageKey)); return Array.isArray(cards)?cards.filter(c=>c && typeof c.id==='string' && typeof c.word==='string' && typeof c.meaning==='string' && typeof c.language==='string'):[]; }
  catch {return [];}
}
let languageCards=readLanguageCards();

function saveLanguageCards(cards,message='Kelime kaydedildi.') {
  try {localStorage.setItem(languageKey,JSON.stringify(cards));languageCards=cards;journalMessage=message;return true;}
  catch {journalMessage='Kelime kaydedilemedi. Tarayıcı depolama alanını kontrol et.';document.querySelector('#journal-feedback').textContent=journalMessage;return false;}
}

function languagePractice() {
  const languages=[...new Set(languageCards.map(c=>c.language))].sort();
  const cards=languageCards.filter(c=>!languageFilter || c.language===languageFilter);
  const due=cards.filter(c=>!c.due || c.due<=curiosityDay());
  const current=languageCards.find(c=>c.id===languageQuiz);
  const editing=languageCards.find(c=>c.id===languageEdit);
  return `<section class="panel page-panel">${panelHeading('Dil pratiği','Kelimelerini kendi örnek cümlelerinle öğren.')}
    <div class="journal-body">${journalSelect('Çalışacağın dil','practiceLanguage',Object.fromEntries([['','Tüm diller'],...languages.map(l=>[l,l])]),languageFilter).replace('<select name="practiceLanguage"','<select id="practice-language" name="practiceLanguage"')}
    <p class="row-meta">${cards.length} kelime · ${due.length} tekrar bekliyor</p>
    <button class="button primary" data-language="quiz" ${due.length?'':'disabled'}>Tekrar sınavını başlat</button>
    ${current?`<div class="language-quiz"><small class="row-meta">${escapeText(current.language)}</small><h3>${escapeText(current.word)}</h3>
    <form id="language-answer-form" class="sync-form">${journalInput('Türkçe karşılığını yaz','answer','','maxlength="300" autocomplete="off"')}<button class="button secondary" type="submit">Kontrol et</button></form>
    <button class="button secondary" data-language="reveal">Cevabı göster</button>
    ${languageRevealed?`<p class="books-prose"><strong>${escapeText(current.meaning)}</strong></p>${current.sentence?`<p class="books-prose">${escapeText(current.sentence)}</p>`:''}<p class="row-meta">${escapeText(languageAnswerMessage)}</p><div class="sync-actions"><button class="button secondary" data-language="again">Tekrar çalışmalıyım</button><button class="button primary" data-language="known">Hatırladım</button></div>`:''}
    <button class="button secondary books-section" data-language="stop">Sınavı kapat</button></div>`:''}
    <details class="books-section" ${editing?'open':''}><summary>${editing?'Kelimeyi düzenle':'Kelime ekle'}</summary>
    <form id="language-card-form" class="sync-form books-section">
    ${journalInput('Dil','language',editing?.language??languageFilter,'required maxlength="60" placeholder="İngilizce"')}
    ${journalInput('Kelime veya ifade','word',editing?.word,'required maxlength="160"')}
    ${journalInput('Türkçe karşılığı','meaning',editing?.meaning,'required maxlength="300"')}
    ${field('Örnek cümle',`<textarea name="sentence" rows="2" maxlength="1500">${escapeText(editing?.sentence??'')}</textarea>`)}
    <div class="sync-actions"><button class="button primary" type="submit">${editing?'Değişiklikleri kaydet':'Kelime ekle'}</button>${editing?'<button type="button" class="button secondary" data-language="cancel-edit">Vazgeç</button>':''}</div></form></details>
    <div class="language-cards">${cards.map(c=>`<article><div><strong>${escapeText(c.word)}</strong><small class="row-meta">${escapeText(c.language)} · Sonraki tekrar ${escapeText(c.due??curiosityDay())}</small></div><p>${escapeText(c.meaning)}</p>${c.sentence?`<p class="books-prose row-meta">${escapeText(c.sentence)}</p>`:''}<div class="sync-actions"><button class="button secondary" data-language="edit" data-id="${escapeText(c.id)}">Düzenle</button><button class="button secondary" data-language="delete" data-id="${escapeText(c.id)}">Sil</button></div></article>`).join('')||empty('İlk kelimeni ekleyerek başla.')}</div></div></section>`;
}

function nextLanguageQuestion() {
  const due=languageCards.filter(c=>(!languageFilter||c.language===languageFilter)&&(!c.due||c.due<=curiosityDay()));
  languageQuiz=due.length?due[Math.floor(Math.random()*due.length)].id:null;
  languageRevealed=false;languageAnswerMessage='';
  if (!due.length) journalMessage='Bugünkü tekrarlarını tamamladın.';
}

document.addEventListener('change',event=> {
  if(event.target.id!=='practice-language') return;
  languageFilter=event.target.value;languageQuiz=null;languageEdit=null;render();
});

document.addEventListener('submit',event=> {
  const form=event.target;
  if(!['language-card-form','language-answer-form'].includes(form.id)) return;
  event.preventDefault();const values=new FormData(form);
  if(form.id==='language-answer-form') {
    const card=languageCards.find(c=>c.id===languageQuiz);if(!card)return;
    const normalize=s=>s.trim().toLocaleLowerCase('tr').replace(/[.!?]+$/,'');
    languageAnswerMessage=normalize(values.get('answer'))===normalize(card.meaning)?'Cevabın kayıtlı karşılıkla eşleşti.':'Kayıtlı karşılığı incele. Eş anlamlı bir cevap verdiysen kendin değerlendirebilirsin.';
    languageRevealed=true;render();return;
  }
  const language=values.get('language').trim(),word=values.get('word').trim(),meaning=values.get('meaning').trim();
  for(const key of ['language','word','meaning']) if(!values.get(key).trim()){form.elements[key].value='';form.reportValidity();return;}
  const old=languageCards.find(c=>c.id===languageEdit);
  const record={id:old?.id??crypto.randomUUID(),language,word,meaning,sentence:values.get('sentence').trim(),level:0,due:curiosityDay()};
  const cards=old?languageCards.map(c=>c.id===old.id?record:c):[...languageCards,record];
  if(saveLanguageCards(cards)){languageEdit=null;languageQuiz=null;languageFilter=language;render();}
});

document.addEventListener('click',event=> {
  const button=event.target.closest('[data-language]');if(!button)return;
  const action=button.dataset.language;
  if(action==='quiz')nextLanguageQuestion();
  if(action==='stop')languageQuiz=null;
  if(action==='reveal')languageRevealed=true;
  if(action==='edit')languageEdit=button.dataset.id;
  if(action==='cancel-edit')languageEdit=null;
  if(action==='delete'&&confirm('Bu kelime silinsin mi?')) {
    if(saveLanguageCards(languageCards.filter(c=>c.id!==button.dataset.id),'Kelime silindi.')){if(languageQuiz===button.dataset.id)languageQuiz=null;if(languageEdit===button.dataset.id)languageEdit=null;}
  }
  if((action==='known'||action==='again')&&languageRevealed) {
    const card=languageCards.find(c=>c.id===languageQuiz);if(!card)return;
    const level=action==='known'?Math.min(5,(card.level??0)+1):0;
    const interval=[1,1,3,7,14,30][level];
    if(saveLanguageCards(languageCards.map(c=>c.id===card.id?{...c,level,due:shiftDay(curiosityDay(),interval)}:c),'Tekrar kaydedildi.'))nextLanguageQuestion();
  }
  render();
});
