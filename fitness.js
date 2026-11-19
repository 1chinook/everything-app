const fitnessStorageKey = 'everything-app-fitness-v1';
function readFitnessData() {
  try {
    const stored = JSON.parse(localStorage.getItem(fitnessStorageKey));
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    return stored;
  } catch {
    return {};
  }
}

const fitnessData = readFitnessData();

function fitnessStepTarget(baseline, month) {
  if (!Number.isInteger(baseline) || baseline < 1 || baseline > 40000) return null;
  const ceiling = Math.max(baseline, 7500);
  return Math.min(ceiling, baseline + [500, 1000, 1500, 2000, 2500][month - 1]);
}

// MET estimates describe the exercise category at ordinary effort.
const activityChoices = [
  ['Göğüs press',3.5,'Göğüs'], ['Eğimli şınav',3,'Göğüs'], ['Dambıl bench press',3.5,'Göğüs'],
  ['Eğimli dambıl press',3.5,'Göğüs'], ['Pec deck',3.5,'Göğüs'], ['Kabloda göğüs açış',3.5,'Göğüs'],
  ['Dambıl biceps curl',3.5,'Kol'], ['İple triceps itiş',3.5,'Kol'], ['Hammer curl',3.5,'Kol'],
  ['Kabloda biceps curl',3.5,'Kol'], ['Makinede preacher curl',3.5,'Kol'], ['Baş üstü kabloda triceps açış',3.5,'Kol'],
  ['Dead bug',3,'Karın'], ['Bird dog',3,'Karın'], ['Diz destekli yan plank',3,'Karın'],
  ['Ters mekik (reverse crunch)',3,'Karın'], ['Pallof press',3.5,'Karın'], ['Kabloda crunch',3.5,'Karın'],
  ['Oturarak kablo çekiş',3.5,'Sırt ve omuz'], ['Lat pulldown',3.5,'Sırt ve omuz'], ['Göğüs destekli row',3.5,'Sırt ve omuz'],
  ['Face pull',3.5,'Sırt ve omuz'], ['Dambıl yana açış',3.5,'Sırt ve omuz'], ['Makinede omuz press',3.5,'Sırt ve omuz'],
  ['Leg press',3.5,'Bacak'], ['Vücut ağırlığıyla squat',3,'Bacak'], ['Leg curl',3.5,'Bacak'],
  ['Glute bridge',3,'Bacak'], ['Goblet squat',3.5,'Bacak'], ['Ayakta baldır yükseltme',3,'Bacak'],
  ['Kürek ergometresi (orta tempo, 100 W altı)',5,'Kardiyo'],
  ['Başka bir ağırlık hareketi',3.5,'Diğer'], ['Başka bir vücut ağırlığı hareketi',3,'Diğer']
];
const movementGroups = [...new Set(activityChoices.map(choice=>choice[2]))];

function movementOptions() {
  return movementGroups.map(group=>`<optgroup label="${group}">${activityChoices.map(([name,,category],index)=>
    category===group ? `<option value="${index}">${name}</option>` : '').join('')}</optgroup>`).join('');
}

function suggestedMovements(records, day) {
  return ['Göğüs','Kol','Karın'].map(group=>{
    const candidates=activityChoices.map(([name,,category],index)=>({name,category,index})).filter(item=>item.category===group);
    const last=new Map();
    for(const row of records){
      if(row.day<=day && (!last.has(row.name) || row.day>last.get(row.name)))last.set(row.name,row.day);
    }
    return candidates.sort((a,b)=>(last.get(a.name)||'').localeCompare(last.get(b.name)||''))[0].index;
  });
}

function activeCalories(met, weight, minutes) {
  return (met - 1) * 3.5 * weight / 200 * minutes;
}

function sportWeight() {
  const recent = Object.entries(fitnessData.logs ?? {}).filter(([day,row]) => day <= selectedDay && Number(row?.weight)>0)
    .sort(([a],[b])=>b.localeCompare(a))[0];
  return fitnessData.activityWeight ?? recent?.[1].weight ?? fitnessData.profile?.weight ?? '';
}

function durationText(minutes) {
  const seconds = Math.round(minutes * 60);
  const whole = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!remainder) return whole + ' dk';
  return (whole ? whole + ' dk ' : '') + remainder + ' sn';
}

function sports() {
  const activities = Array.isArray(fitnessData.activities) ? fitnessData.activities : [];
  const records = activities.filter(record => record && record.day === selectedDay && Number.isFinite(record.minutes) && Number.isFinite(record.kcal));
  const kcal = records.reduce((sum,record)=>sum+record.kcal,0);
  const minutes = records.reduce((sum,record)=>sum+record.minutes,0);
  const past = (Array.isArray(fitnessData.lifting) ? fitnessData.lifting : []).filter(row=>row && row.day===selectedDay);
  const suggestions = suggestedMovements(activities.filter(row=>row && typeof row.day==='string'), selectedDay);
  return `${intro('Spor','',true)}
    <section class="panel workout-simple">${panelHeading('Hareket kaydet')}
    <div class="workout-inner"><details data-sports-programs ${programMenuOpen ? 'open' : ''}><summary>Hazır programlar · 3 günlük</summary><div class="workout-inner" data-ready-content>${readyProgramContent()}</div></details><div class="workout-picks" aria-label="Önerilen hareketler"><small>Seçili gün için öneriler</small>
    ${suggestions.map(i=>`<button type="button" class="button secondary" data-pick-move="${i}">${activityChoices[i][0]}</button>`).join('')}</div>
    <form id="activity-form"><div class="workout-fields">
    ${field('Yaptığım hareket',`<select name="move">${movementOptions()}</select>`)}
    <div class="workout-duration">${field('Süre','<input name="duration" type="number" min="1" max="600" step="1" placeholder="Örn. 12" required>')}${field('Birim','<select name="unit"><option value="minutes">Dakika</option><option value="seconds">Saniye</option></select>')}</div></div>
    <label class="field" hidden data-custom-move>Hareket adı<input name="custom" maxlength="80"></label>
    <details><summary>Kalori hesabı</summary>
    ${field('Hesapta kullanılacak kilon (kg)',`<input name="weight" required type="number" min="30" max="350" step="0.1" value="${escapeText(sportWeight())}">`)}
    <small>Süreye uzun molaları dahil etme. Aktif kalori tahmini, hareket türünün ortalama enerji harcamasından dinlenme payını çıkarır. <a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noopener">MET değerleri</a></small></details>
    <button class="button primary">Günüme kaydet</button><small data-sports-feedback role="status"></small></form></div></section>
    <section class="panel workout-simple">${panelHeading('Günün hareketleri',durationText(minutes)+' toplam',`<strong class="sport-energy">≈ ${Math.round(kcal)} aktif kcal</strong>`)}
    <div class="workout-inner">${records.length ? records.map(row=>`<div class="workout-line"><div><strong>${escapeText(row.name)}</strong><small>${durationText(row.minutes)} · ≈ ${Math.round(row.kcal)} kcal</small></div><button type="button" class="button secondary" data-remove-activity="${escapeText(row.id)}">Kaldır</button></div>`).join('') : empty('Bu güne henüz hareket kaydetmedin.')}
    ${past.length ? `<details><summary>Eski set kayıtları (${past.length})</summary><small>Süre bilgisi olmadığı için kalori toplamına eklenmedi.</small>${past.map(row=>`<p>${escapeText(row.move)} · ${Number(row.kg)} kg × ${Number(row.reps)}</p>`).join('')}</details>` : ''}</div></section>`;
}

function updateActivityChoice(form) {
  const custom = activityChoices[Number(form.elements.move.value)][2]==='Diğer';
  form.querySelector('[data-custom-move]').hidden=!custom;
  form.elements.custom.required=custom;
}

function persistSports(patch) {
  let update;
  try {
    const raw = localStorage.getItem(fitnessStorageKey);
    const stored = raw ? JSON.parse(raw) : {};
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid sports data');
    const changes = typeof patch === 'function' ? patch(stored) : patch;
    update = {...stored, ...changes};
    localStorage.setItem(fitnessStorageKey, JSON.stringify(update));
  } catch {
    const feedback = document.querySelector('[data-sports-feedback]');
    if (feedback) feedback.textContent = 'Kaydedilemedi. Tarayıcı depolama alanını kontrol edip tekrar dene.';
    return false;
  }
  Object.assign(fitnessData, update);
  return true;
}

function storeActivities(change, weight) {
  const saved = persistSports(stored => {
    const activities = stored.activities ?? [];
    if (!Array.isArray(activities)) throw new Error('Invalid activity history');
    const patch = {activities: change(activities)};
    if (weight !== undefined) patch.activityWeight = weight;
    return patch;
  });
  if (saved) render();
}

document.addEventListener('click', event=>{
  const pick=event.target.closest('[data-pick-move]');
  if(pick){
    const form=document.querySelector('#activity-form');
    form.elements.move.value=pick.dataset.pickMove;
    updateActivityChoice(form);
    form.elements.duration.focus();
  }
  const remove=event.target.closest('[data-remove-activity]');
  if(remove)storeActivities(rows=>rows.filter(r=>r?.id!==remove.dataset.removeActivity));
});
document.addEventListener('change',event=>{
  if(event.target.matches('#activity-form [name="move"]'))updateActivityChoice(event.target.form);
  if(event.target.matches('#activity-form [name="unit"]')){
    event.target.form.elements.duration.max=event.target.value==='seconds' ? '36000' : '600';
  }
});
document.addEventListener('submit',event=>{
  if(event.target.id!=='activity-form')return;
  event.preventDefault();
  const form=event.target;
  if(!form.reportValidity())return;
  const data=new FormData(form);
  const index=Number(data.get('move'));
  const [label,met]=activityChoices[index];
  const name=activityChoices[index][2]==='Diğer' ? data.get('custom').trim() : label;
  if(!name){
    form.elements.custom.value='';
    form.elements.custom.reportValidity();
    return;
  }
  const minutes=Number(data.get('duration')) / (data.get('unit') === 'seconds' ? 60 : 1), weight=Number(data.get('weight'));
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600 || !Number.isFinite(weight) || weight < 30 || weight > 350) return;
  const record={id:newId(),day:selectedDay,name,minutes,weight,met,kcal:activeCalories(met,weight,minutes)};
  storeActivities(rows=>[...rows,record],weight);
});
const readyPrograms = [
  {name:'Salona başlangıç', sets:2, days:[
    ['Leg press','Göğüs press','Oturarak kablo çekiş','Dead bug'],
    ['Vücut ağırlığıyla squat','Lat pulldown','Eğimli şınav','Bird dog'],
    ['Glute bridge','Göğüs press','Dambıl biceps curl','Diz destekli yan plank']]},
  {name:'Göğüs, kol ve karın', sets:2, days:[
    ['Göğüs press','Oturarak kablo çekiş','Leg press','İple triceps itiş','Dead bug'],
    ['Goblet squat','Lat pulldown','Eğimli şınav','Hammer curl','Pallof press'],
    ['Eğimli dambıl press','Göğüs destekli row','Leg curl','Dambıl biceps curl','Kabloda crunch']]},
  {name:'Makine ve kablo', sets:2, days:[
    ['Leg press','Göğüs press','Lat pulldown','Pallof press'],
    ['Leg curl','Oturarak kablo çekiş','Makinede omuz press','Kabloda biceps curl'],
    ['Leg press','Pec deck','Face pull','İple triceps itiş','Kabloda crunch']]},
  {name:'Dambıl ve sehpa', sets:2, days:[
    ['Goblet squat','Dambıl bench press','Göğüs destekli row','Dead bug'],
    ['Glute bridge','Eğimli dambıl press','Hammer curl','Bird dog'],
    ['Goblet squat','Göğüs destekli row','Dambıl yana açış','Dambıl biceps curl','Diz destekli yan plank']]},
  {name:'Ekipmansız antrenman', sets:2, days:[
    ['Vücut ağırlığıyla squat','Eğimli şınav','Dead bug'],
    ['Glute bridge','Bird dog','Diz destekli yan plank'],
    ['Eğimli şınav','Ayakta baldır yükseltme','Vücut ağırlığıyla squat','Ters mekik (reverse crunch)']]},
  {name:'Sınav haftası · kısa seanslar', sets:1, days:[
    ['Leg press','Göğüs press','Oturarak kablo çekiş'],
    ['Goblet squat','Lat pulldown','Dead bug'],
    ['Glute bridge','Eğimli şınav','Hammer curl','Diz destekli yan plank']]}
];
const previousProgram = readyPrograms.findIndex(program => program.name === fitnessData.readySelection?.program);
let readyProgramIndex = previousProgram >= 0 ? previousProgram : 1;
let readyDayIndex = previousProgram >= 0 && [0,1,2].includes(fitnessData.readySelection?.day) ? fitnessData.readySelection.day : 0;
let programMenuOpen = false;
document.addEventListener('toggle', event => {
  if (event.target.matches('[data-sports-programs]')) programMenuOpen = event.target.open;
}, true);

function movementDose(name,sets) {
  if(name==='Diz destekli yan plank')return sets+' × 15–20 sn / taraf';
  if(['Dead bug','Bird dog','Pallof press'].includes(name))return sets+' × 6–8 tekrar / taraf';
  return sets+' × 8–12 tekrar';
}
function readyProgramContent() {
  const program=readyPrograms[readyProgramIndex];
  const moves=program.days[readyDayIndex];
  return `<div class="workout-fields">${field('Program',`<select data-ready-program>${readyPrograms.map((p,i)=>`<option value="${i}" ${i===readyProgramIndex?'selected':''}>${p.name}</option>`).join('')}</select>`)}
    ${field('Antrenman günü',`<select data-ready-day>${[0,1,2].map(i=>`<option value="${i}" ${i===readyDayIndex?'selected':''}>${i+1}. gün</option>`).join('')}</select>`)}</div>
    <small>Günler arasına bir dinlenme günü koyabilirsin. Hareketi seçip yaptığın süreyi kaydet.</small>
    ${moves.map(name=>{
      const id=activityChoices.findIndex(([label])=>label===name);
      return `<div class="workout-line"><button type="button" class="button secondary" data-pick-move="${id}">${name}</button><small>${movementDose(name,program.sets)}</small></div>`;
    }).join('')}`;
}
document.addEventListener('change',event=>{
  const input=event.target;
  if(!input.matches('[data-ready-program],[data-ready-day]'))return;
  if(input.matches('[data-ready-program]')){
    readyProgramIndex=Number(input.value);
    readyDayIndex=0;
  } else readyDayIndex=Number(input.value);
  persistSports({readySelection: {program: readyPrograms[readyProgramIndex].name, day: readyDayIndex}});
  const container=input.closest('[data-ready-content]');
  const selector=input.matches('[data-ready-program]')?'[data-ready-program]':'[data-ready-day]';
  container.innerHTML=readyProgramContent();
  container.querySelector(selector).focus();
});
