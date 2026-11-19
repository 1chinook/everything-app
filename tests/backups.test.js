const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function backupFixture() {
  const key = 'everything-app-fitness-v1';
  const store = new Map([['plan','old'],[key,'{"activities":[]}']]);
  const state = {title:'old'};
  const ctx = vm.createContext({
    document:{addEventListener(){}},setInterval(){},storageKey:'plan',state,
    replacePlannerData(data){Object.assign(state,data)}, noteSyncChange(){},
    localStorage:{
      getItem:k=>store.get(k)??null, removeItem:k=>store.delete(k),
      setItem(k,v){if(k===key && v.includes('full'))throw Error('quota');store.set(k,v)}
    }
  });
  vm.runInContext(fs.readFileSync(require.resolve('../src/modules/backups.js'),'utf8'),ctx);
  return {ctx,store,state,key};
}
test('a failed auxiliary write rolls back the plan in storage and in memory',()=>{
  const {ctx,store,state,key}=backupFixture();
  assert.throws(()=>ctx.restoreLocalBackup({title:'new'},{[key]:'{"full":true}'}),/quota/);
  assert.equal(store.get('plan'),'old');
  assert.equal(state.title,'old');
  assert.equal(store.get(key),'{"activities":[]}');
});
test('a planner-only backup keeps personal data and malformed extras are rejected before changes',()=>{
  const {ctx,store,key}=backupFixture();
  assert.throws(()=>ctx.restoreLocalBackup({title:'new'},{[key]:'{'}));
  assert.equal(store.get('plan'),'old');
  ctx.restoreLocalBackup({title:'new'});
  assert.equal(store.get(key),'{"activities":[]}');
  assert.equal(JSON.parse(store.get('plan')).title,'new');
});
