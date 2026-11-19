const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/modules/fitness.js'),'utf8');
const storageKey = 'everything-app-fitness-v1';

function screen(storage) {
  const handlers = {};
  const feedback = {};
  const context = vm.createContext({
    localStorage: storage,
    document: {
      addEventListener(type, handler) { (handlers[type] ??= []).push(handler); },
      querySelector() { return feedback; },
    },
    selectedDay: '2030-02-12', newId: ()=>'workout-1', render(){},
    FormData: class { constructor(form){this.get=k=>form.values[k];} },
  });
  vm.runInContext(source, context);
  return { run: script=>vm.runInContext(script,context), feedback, handlers };
}
function storageFixture() {
  const data = new Map();
  return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
}
test('short activities retain seconds and proportional active calories',()=>{
  const storage=storageFixture();
  const {run,handlers}=screen(storage);
  const form={id:'activity-form',reportValidity:()=>true,values:{duration:'30',unit:'seconds',move:'0',weight:'70'}};
  handlers.submit[0]({target:form,preventDefault(){}});
  const row=JSON.parse(storage.getItem(storageKey)).activities[0];
  assert.equal(row.minutes,0.5);
  assert.equal(row.kcal,2.5*3.5*70/200*0.5);
  assert.equal(run("durationText(1.25)"),'1 dk 15 sn');
});
test('program and training day survive refresh and coexist with another tab’s activity',()=>{
  const storage=storageFixture();
  const first=screen(storage), second=screen(storage);
  first.run("storeActivities(rows=>[...rows,{id:'a'}],90)");
  second.run("persistSports({readySelection:{program:readyPrograms[4].name,day:2}})");
  first.run("storeActivities(rows=>[...rows,{id:'b'}],90)");
  const reloaded=screen(storage);
  assert.equal(reloaded.run('readyProgramIndex'),4);
  assert.equal(reloaded.run('readyDayIndex'),2);
  assert.equal(reloaded.run('fitnessData.activities.length'),2);
});
test('unreadable stored data survives failed writes',()=>{
  const storage=storageFixture();
  storage.setItem(storageKey,'{broken');
  const {run,feedback}=screen(storage);
  assert.equal(run("persistSports({readySelection:{day:0}})"),false);
  assert.equal(storage.getItem(storageKey),'{broken');
  assert.ok(feedback.textContent);
});
