const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {validPlannerData}=require('../src/modules/sync.js');
function fixture(){
 const handlers={};
 const context=vm.createContext({console, document:{addEventListener:(name,fn)=>{(handlers[name]??=[]).push(fn);}},window:{addEventListener(){}},localStorage:{getItem(){return null;}},state:{topicReviews:[],reflections:{},topicMastery:{},tasks:[],assessments:[],documents:[],planning:{breakMinutes:10}},enrolledCourseNames:()=>['Örnek Ders'],courseCatalog:[['Örnek Ders',['Ünite A']]],topicsForCourse:()=>['Ünite A'],activeDay:()=> '2030-11-19',nowMinutes:()=>600,clockMinutes:s=>Number(s.slice(0,2))*60+Number(s.slice(3)),clockLabel:n=>`${Math.floor(n/60)}:${n%60}`,eventsForDay:()=>[],coursePriorities:()=>[],projectRecords:[],bookRecords:[],journalRecords:[],curiosityData:{questions:[],routes:[]},dateFor:d=>new Date(d+'T12:00:00Z'),shiftDay:(d,n)=>{let date=new Date(d+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);},escapeText:s=>String(s).replaceAll('<','&lt;'),topicMastery:()=> 'unknown',orderedTopics:(_,t)=>t,courseKey:c=>'course:'+c,selectedDay:'2030-11-19',newId:()=> 'new-task',save(){},render(){},FormData:class{constructor(form){this.data=form.data;}get(k){return this.data[k]??'';}getAll(k){return this.data[k]??[];}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','modules','productivity.js'),'utf8'),context);
 return {context,handlers,run:s=>vm.runInContext(s,context)};
}
test('hard reviews reset spacing while easy reviews expand it',()=>{
 const {run}=fixture();
 assert.equal(run("nextReview({interval:12},'hard','2030-11-19').due"),'2030-11-20');
 assert.equal(run("nextReview({interval:12},'easy','2030-11-19').interval"),30);
 assert.equal(run("nextReview({interval:180},'easy','2030-11-19').interval"),180);
});
test('suggestions respect current events and the next time boundary',()=>{
 const f=fixture();
 f.context.eventsForDay=()=>[{kind:'lesson',attending:true,time:'09:30',endTime:'11:00'}];
 assert.match(f.run('recommendation().title'),/etkinlik/);
 f.context.eventsForDay=()=>[{kind:'lesson',attending:true,time:'10:10',endTime:'11:00'}];
 assert.match(f.run('recommendation().title'),/mola/);
});
test('overdue tasks and exam gaps affect the recommended action',()=>{
 const f=fixture();
 f.context.state.tasks.push({id:'t',title:'Teslim et',day:'2030-11-18',done:false});
 assert.equal(f.run('recommendation().title'),'Teslim et');
 f.context.state.tasks=[];
 f.context.state.assessments.push({title:'Vize',course:'Örnek Ders',kind:'final',day:'2030-11-20',time:'10:00',topics:['Ünite A']});
 assert.equal(f.run('recommendation().route'),'dersler');
 assert.match(f.run('recommendation().reason'),/1 gün/);
});
test('search handles Turkish casing and multiple terms',()=>{
 const f=fixture();
 assert.equal(f.run("searchResults('ÖRNEK ünite').length"),1);
 assert.equal(f.run("searchResults('bilinmeyen').length"),0);
});
test('reflection moves only selected unfinished tasks and avoids duplicate next steps',()=>{
 const f=fixture();
 f.context.state.tasks=[{id:'a',day:'2030-11-19',title:'A',done:false},{id:'b',day:'2030-11-19',title:'B',done:false}];
 const event={target:{id:'reflection-form',data:{wins:'İyi',obstacles:'Yorgunluk',next:'İlk soru',carry:['a']}},preventDefault(){}};
 f.handlers.submit[0](event);f.handlers.submit[0](event);
 assert.equal(f.context.state.tasks[0].day,'2030-11-20');
 assert.equal(f.context.state.tasks[1].day,'2030-11-19');
 assert.equal(f.context.state.tasks.length,3);
 event.target.data.next='Yeni soru';
 f.handlers.submit[0](event);
 assert.equal(f.context.state.tasks.length,3);
 assert.equal(f.context.state.tasks[2].title,'Yeni soru');
 event.target.data.next='';
 f.handlers.submit[0](event);
 assert.equal(f.context.state.tasks.length,2);
});
test('search opens the matching task day and book and omits stored photo data',()=>{
 const f=fixture();
 f.context.state.tasks.push({id:'t',title:'Gezide oku',day:'2030-11-25'});
 f.context.bookRecords.push({id:'b',title:'Gezi',notes:[{text:'Sahil yürüyüşü'}]});
 f.context.journalSpaceRoutes={anilar:'memories'};
 f.context.journalKinds={memories:'Anı'};
 f.context.journalRecords.push({kind:'memories',title:'Yaz gezisi',place:'Sahil',photo:'data:image/png;base64,sahte'});
 assert.equal(f.run("searchResults('gezide')[0].day"),'2030-11-25');
 assert.equal(f.run("searchResults('yürüyüşü')[0].book"),'b');
 assert.equal(f.run("searchResults('yaz sahil')[0].route"),'anilar');
 assert.equal(f.run("searchResults('base64').length"),0);
});
test('due review takes precedence over a distant exam',()=>{
 const f=fixture();
 f.context.state.topicReviews=[{course:'Örnek Ders',topic:'Ünite A',due:'2030-11-18'}];
 f.context.state.assessments=[{kind:'final',course:'Örnek Ders',day:'2031-01-16',time:'09:00'}];
 assert.equal(f.run('recommendation().route'),'tekrar');
});
test('daily controls show real activity duration and complete another visible study day',()=>{
 const f=fixture();
 Object.assign(f.context,{fitnessData:{activities:[{day:'2030-11-19',minutes:0.5,kcal:3}]},panelHeading:()=>'',durationText:()=> '30 sn'});
 Object.assign(f.context.state,{events:[{id:'s',kind:'study',day:'2030-11-20'}],dailyChecks:{},sleep:{duration:8}});
 f.context.document.querySelector=()=>null;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','modules','daily.js'),'utf8'),f.context);
 assert.match(f.run('dailyControls()'),/1 hareket · 30 sn/);
 assert.doesNotMatch(f.run('dailyControls()'),/data-daily-check="steps"/);
 f.handlers.change.at(-1)({target:{dataset:{dailyStudy:'s'},checked:true}});
 assert.equal(f.context.state.events[0].studyDone,true);
});
test('new records survive validation and invalid dates are rejected',()=>{
 const data={events:[],tasks:[],grades:[],documents:[],sleep:{bedtime:'23:30',duration:8},topicReviews:[{course:'Örnek Ders',topic:'Ünite A',interval:4,last:'2030-11-19',due:'2030-11-23'}],reflections:{'2030-11-19':{wins:'',obstacles:'',next:'',saved:true}}};
 assert.equal(validPlannerData(data),true);
 data.topicReviews[0].due='2030-11-31';assert.equal(validPlannerData(data),false);
});
