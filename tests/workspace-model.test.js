import test from 'node:test';
import assert from 'node:assert/strict';
import {newRecord,normalizeRecord,parseBackup,encodeSnapshot,emptySnapshot,extractNotes,applyExtraction,workspaceStats,validDate,todayLocal,MAX_BACKUP_BYTES} from '../public/workspace-model.js';
import {demoSnapshot} from '../public/workspace-demo.js';
const clock=()=>new Date('2026-11-17T12:00:00Z');
function record(){return {...newRecord({clock,idFactory:()=> 'meeting_1'}),title:'Alinhamento do portal'};}
function action(extra={}){return {id:'task_1',title:'Preparar teste',assignee:'Ana',due:'2026-11-20',priority:'high',status:'todo',...extra};}
test('records validate dates, required fields, statuses and limits',()=>{
 assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2026-11-31'),false);assert.equal(todayLocal(new Date(2026,0,2)), '2026-01-02');
 assert.equal(normalizeRecord(record()).title,'Alinhamento do portal');
 for(const change of [{title:''},{updatedAt:'2026-02-31T12:00:00.000Z'},{notes:'a'.repeat(16001)},{date:'2026-02-31'},{kind:'other'},{actions:[action({status:'invalid'})]},{actions:[action({due:'amanhã'})]},{actions:[action(),action()]},{demo:'false'}])assert.throws(()=>normalizeRecord({...record(),...change}));
});
test('extraction uses explicit markers only and never invents owners or relative deadlines',()=>{
 const result=extractNotes('Ana talvez faça o teste amanhã.\nDecisão: usar um piloto.\nDecisão: USAR UM PILOTO.\nAção: preparar roteiro | Responsável: Ana | Prazo: 2026-11-20\nAção: revisar acessos | Prazo: amanhã\nAção: preparar roteiro | Responsável: Ana | Prazo: 2026-11-20');
 assert.deepEqual(result.decisions,['usar um piloto.']);assert.equal(result.actions.length,2);assert.equal(result.actions[0].assignee,'Ana');assert.equal(result.actions[1].assignee,'');assert.equal(result.actions[1].due,'');assert.equal(result.warnings.length,1);
 assert.deepEqual(extractNotes('Precisamos decidir e agir nesta semana.'),{decisions:[],actions:[],warnings:[]});
});
test('reviewed extraction is idempotent and preserves manually edited task status',()=>{
 const proposal=extractNotes('Decisão: validar o piloto\nAção: preparar roteiro | Responsável: Ana | Prazo: 2026-11-20');let id=0;
 const first=applyExtraction(record(),proposal,()=> 'action_'+ ++id);first.actions[0].status='done';
 const again=applyExtraction(first,proposal,()=> 'action_'+ ++id);assert.equal(again.decisions.length,1);assert.equal(again.actions.length,1);assert.equal(again.actions[0].status,'done');assert.equal(again.actions[0].id,first.actions[0].id);
});
test('dashboard excludes archived, completed and cancelled actions from overdue count',()=>{
 const first={...record(),actions:[action({due:'2026-11-16'}),action({id:'done',status:'done',due:'2026-11-10'}),action({id:'cancelled',status:'cancelled',due:'2026-11-10'}),action({id:'today',due:'2026-11-17',status:'doing'})]};
 const archived={...record(),id:'archived',archived:true,actions:[action({due:'2026-11-01'})]};
 assert.deepEqual(workspaceStats([first,archived],'2026-11-17'),{records:1,open:2,overdue:1,done:1,demo:0});
});
test('backups reject corrupt/unknown/oversized schemas and retain literal text',()=>{
 const snapshot={...emptySnapshot(),records:[{...record(),notes:'<img src=x onerror=alert(1)>',actions:[action()]}]};const parsed=parseBackup(encodeSnapshot(snapshot));assert.equal(parsed.records[0].notes,snapshot.records[0].notes);
 for(const raw of ['{bad',JSON.stringify({...snapshot,version:2}),JSON.stringify({...snapshot,records:[record(),record()]}),JSON.stringify({...snapshot,records:[{...record(),actions:[action({title:''})]}]}),'a'.repeat(MAX_BACKUP_BYTES+1)])assert.throws(()=>parseBackup(raw));
 const polluted=JSON.parse('{"version":1,"revision":0,"updatedAt":null,"records":[],"__proto__":{"polluted":true}}');assert.equal(Object.hasOwn(parseBackup(JSON.stringify(polluted)),'__proto__'),false);assert.equal({}.polluted,undefined);
});
test('demo records are visibly marked and schema-valid without replacing real data',()=>{
 const demo=demoSnapshot(clock);assert.equal(parseBackup(encodeSnapshot(demo)).records.length,2);assert.ok(demo.records.every(r=>r.demo===true));
});
