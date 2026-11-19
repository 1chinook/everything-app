const projectsKey = 'everything-app-projects-v1';
const projectStages = { idea: 'Fikir', active: 'Devam ediyor', paused: 'Beklemede', finished: 'Tamamlandı' };
let projectSelection = null;
let projectEditing = false;
let projectFeedback = '';

function readProjects() {
  try {
    const data = JSON.parse(localStorage.getItem(projectsKey));
    return Array.isArray(data) ? data.filter(p => p && typeof p.id === 'string' && typeof p.title === 'string' && Object.hasOwn(projectStages,p.stage) && Array.isArray(p.steps)) : [];
  } catch { return []; }
}
let projectRecords = readProjects();

function storeProjects(records, message = 'Kaydedildi.') {
  try {
    localStorage.setItem(projectsKey,JSON.stringify(records));
    projectRecords = records;
    projectFeedback = message;
    return true;
  } catch {
    projectFeedback = 'Kaydedilemedi. Tarayıcı depolama alanını kontrol edip tekrar dene.';
    document.querySelector('#projects-feedback').textContent = projectFeedback;
    return false;
  }
}

function projectTaskId(project, step) { return `p-${project.id}-${step.id}`; }
function projectTask(project, step) { return state.tasks.find(t => t.id === projectTaskId(project,step)); }
function projectStepDone(project, step) { return projectTask(project,step)?.done ?? step.done; }

function projectForm(project) {
  return `<section class="panel page-panel">${panelHeading(project ? 'Projeyi düzenle' : 'Yeni proje')}
    <form id="project-editor-form" class="projects-body sync-form">
    ${field('Proje adı', `<input name="title" value="${escapeText(project?.title ?? '')}" required maxlength="160">`)}
    ${field('Amaç', `<textarea name="purpose" rows="3" maxlength="3000" placeholder="Bu projeyle ne yapmak istiyorsun?">${escapeText(project?.purpose ?? '')}</textarea>`)}
    ${field('Aşama', `<select name="stage">${Object.entries(projectStages).map(([key,label]) => `<option value="${key}" ${key === project?.stage ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
    ${field('Bağlantılar (her satıra bir adres)', `<textarea name="links" rows="3" maxlength="4000" placeholder="https://github.com/...">${escapeText((project?.links ?? []).join('\n'))}</textarea>`)}
    <div class="sync-actions"><button class="button primary" type="submit">Kaydet</button><button class="button secondary" type="button" data-project="cancel">Vazgeç</button></div></form></section>`;
}

function projectDetail(project) {
  const next = project.steps.find(s => s.id === project.nextStep && !projectStepDone(project,s)) ?? project.steps.find(s => !projectStepDone(project,s));
  return `<div class="sync-actions books-toolbar"><button class="button secondary" data-project="back">Panoya dön</button><button class="button secondary" data-project="edit">Düzenle</button><button class="button secondary" data-project="delete">Projeyi sil</button></div>
    <section class="panel page-panel">${panelHeading(escapeText(project.title),projectStages[project.stage])}
    <div class="projects-body"><p class="books-prose">${escapeText(project.purpose || 'Henüz amaç eklenmedi.')}</p>
    <div class="project-links">${(project.links ?? []).map(link => `<a href="${escapeText(link)}" target="_blank" rel="noopener noreferrer">${escapeText(link)}</a>`).join('')}</div>
    ${next ? `<div class="project-next"><small class="row-meta">Bir sonraki adım</small><h3>${escapeText(next.title)}</h3>
    <form id="project-task-form" class="sync-form" data-step="${escapeText(next.id)}">
    ${field('Görev tarihi', `<input name="day" type="date" required value="${projectTask(project,next)?.day ?? selectedDay}">`)}
    ${projectTask(project,next) ? `<p class="row-meta">Günlük görevlere eklendi · ${escapeText(projectTask(project,next).day)}</p><a class="button secondary" href="#bugun">Günlük görevleri aç</a>` : '<button class="button primary" type="submit">Günlük görevlerime ekle</button>'}</form></div>` : empty('Bir sonraki somut adımını aşağıdan ekle.')}
    <form id="project-step-form" class="sync-form books-section">${field('Küçük adım', '<input name="title" required maxlength="180" placeholder="Örneğin, karakterin hareketini yaz">')}<button class="button secondary" type="submit">Adım ekle</button></form>
    <ul class="project-steps">${project.steps.map(step => `<li><label class="daily-control"><input type="checkbox" data-project-step="${escapeText(step.id)}" ${projectStepDone(project,step) ? 'checked' : ''}><span>${escapeText(step.title)}</span></label><div class="sync-actions">
    ${!projectStepDone(project,step) ? `<button class="button secondary" data-project="next" data-id="${escapeText(step.id)}" aria-pressed="${next?.id === step.id}">Sıradaki adım</button>` : ''}
    <button class="button secondary" data-project="remove-step" data-id="${escapeText(step.id)}">Sil</button></div></li>`).join('')}</ul>
    <p class="row-meta">Günlük görevlerde tamamladığın adımlar burada da tamamlanır. Projeyi veya adımı silersen aktarılmış günlük görevini Görevler bölümünden yönetebilirsin.</p></div></section>`;
}

function projectsPage() {
  const project = projectRecords.find(p => p.id === projectSelection);
  return `${intro('Hobi projeleri','Fikirlerini somut adımlara dönüştür.')}
    <p id="projects-feedback" class="row-meta" role="status">${escapeText(projectFeedback)}</p>
    ${projectEditing ? projectForm(project) : project ? projectDetail(project) : `<button class="button primary books-toolbar" data-project="add">Proje ekle</button>
    <div class="project-board">${Object.entries(projectStages).map(([stage,label]) => `<section class="project-column"><h2>${label} <small>${projectRecords.filter(p => p.stage === stage).length}</small></h2>
    ${projectRecords.filter(p => p.stage === stage).map(p => {const done = p.steps.filter(s => projectStepDone(p,s)).length; return `<article class="panel project-card"><h3>${escapeText(p.title)}</h3><p class="books-prose row-meta">${escapeText(p.purpose || 'Amaç eklenmedi.')}</p><small class="row-meta">${done} / ${p.steps.length} adım tamamlandı</small><button class="button secondary" data-project="open" data-id="${escapeText(p.id)}">Projeyi aç</button></article>`;}).join('') || empty('Bu aşamada proje yok.')}</section>`).join('')}</div><p class="row-meta">Proje kayıtları bu tarayıcıda saklanır ve otomatik yedeklere eklenir.</p>`}`;
}

function persistProjectTask(tasks) {
  try {
    createAutomaticBackup();
    localStorage.setItem(storageKey,JSON.stringify({...state,tasks}));
  } catch {
    projectFeedback = 'Görev kaydedilemedi. Tekrar dene.';
    document.querySelector('#projects-feedback').textContent = projectFeedback;
    return false;
  }
  state.tasks = tasks;
  noteSyncChange();
  return true;
}

document.addEventListener('submit',event => {
  const form = event.target;
  if (!['project-editor-form','project-step-form','project-task-form'].includes(form.id)) return;
  event.preventDefault();
  const values = new FormData(form);
  const project = projectRecords.find(p => p.id === projectSelection);
  if (form.id === 'project-task-form') {
    const step = project?.steps.find(s => s.id === form.dataset.step);
    if (!step || projectTask(project,step)) return;
    const task = {id:projectTaskId(project,step),day:values.get('day'),title:`${project.title} · ${step.title}`,priority:'Normal',done:false};
    if (persistProjectTask([...state.tasks,task])) { projectFeedback = 'Günlük görevlerine eklendi.'; render(); }
    return;
  }
  const title = values.get('title').trim();
  if (!title) { form.elements.title.value = ''; form.reportValidity(); return; }
  if (form.id === 'project-editor-form') {
    const links = values.get('links').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    try { for (const link of links) if (!['https:','http:'].includes(new URL(link).protocol)) throw new Error(); }
    catch { form.elements.links.setCustomValidity('Her satıra http:// veya https:// ile başlayan geçerli bir adres yaz.'); form.elements.links.reportValidity(); return; }
    const record = {...project,id:project?.id ?? crypto.randomUUID(),title,purpose:values.get('purpose').trim(),stage:values.get('stage'),links,steps:project?.steps ?? []};
    const records = project ? projectRecords.map(p=>p.id === project.id ? record : p) : [...projectRecords,record];
    if (storeProjects(records)) { projectSelection = record.id; projectEditing = false; render(); }
  } else if (project) {
    const step = {id:crypto.randomUUID(),title,done:false};
    if (storeProjects(projectRecords.map(p=>p.id === project.id ? {...p,steps:[...p.steps,step]} : p))) render();
  }
});

document.addEventListener('input',event=> {
  if (event.target.name === 'links' && event.target.closest('#project-editor-form')) event.target.setCustomValidity('');
});

document.addEventListener('change',event=> {
  const id = event.target.dataset.projectStep;
  if (!id) return;
  const project = projectRecords.find(p=>p.id === projectSelection);
  const step = project?.steps.find(s=>s.id === id);
  if (!step) return;
  const done = event.target.checked;
  const task = projectTask(project,step);
  if (task) persistProjectTask(state.tasks.map(t=>t.id === task.id ? {...t,done} : t));
  else storeProjects(projectRecords.map(p=>p.id === project.id ? {...p,steps:p.steps.map(s=>s.id === id ? {...s,done} : s)} : p));
  render();
});

document.addEventListener('click',event=> {
  const button = event.target.closest('[data-project]');
  if (!button) return;
  const action = button.dataset.project;
  const project = projectRecords.find(p=>p.id === projectSelection);
  projectFeedback = '';
  if (action === 'add') { projectSelection = null; projectEditing = true; }
  if (action === 'open') { projectSelection = button.dataset.id; projectEditing = false; }
  if (action === 'edit') projectEditing = true;
  if (action === 'cancel') projectEditing = false;
  if (action === 'back') { projectSelection = null; projectEditing = false; }
  if (project && action === 'next') storeProjects(projectRecords.map(p=>p.id === project.id ? {...p,nextStep:button.dataset.id} : p));
  if (project && action === 'remove-step' && confirm('Bu adım silinsin mi?')) storeProjects(projectRecords.map(p=>p.id === project.id ? {...p,steps:p.steps.filter(s=>s.id !== button.dataset.id)} : p));
  if (project && action === 'delete' && confirm('Bu proje silinsin mi?')) {
    if (storeProjects(projectRecords.filter(p=>p.id !== project.id))) projectSelection = null;
  }
  render();
});
