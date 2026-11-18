import test from 'node:test';
import assert from 'node:assert/strict';
import {newRecord,emptySnapshot,parseBackup,encodeSnapshot} from '../public/workspace-model.js';
import {createWorkspaceStore,STORAGE_KEY} from '../public/workspace-store.js';
const clock=()=>new Date('2026-11-17T12:00:00Z');
function storage(){const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
function record(id='record_1'){return {...newRecord({clock,idFactory:()=>id}),title:'Registro '+id};}
test('create/update/archive persist across reloads and snapshots cannot mutate internal state',async()=>{
 const disk=storage(),store=createWorkspaceStore({storage:disk,clock});await store.save(record());let copy=store.snapshot();copy.records[0].title='mutated';assert.equal(store.snapshot().records[0].title,'Registro record_1');
 await store.save({...record(),title:'Atualizado',archived:true});const reopened=createWorkspaceStore({storage:disk,clock}).snapshot();assert.equal(reopened.revision,2);assert.equal(reopened.records.length,1);assert.equal(reopened.records[0].archived,true);assert.equal(reopened.records[0].title,'Atualizado');
});
test('quota/storage failures preserve saved data and in-memory revision',async()=>{
 const disk=storage(),store=createWorkspaceStore({storage:disk,clock});await store.save(record());const before=disk.values.get(STORAGE_KEY);disk.setItem=()=>{throw Error('quota')};await assert.rejects(store.save(record('second')),/Não foi possível salvar/);assert.equal(disk.values.get(STORAGE_KEY),before);assert.equal(store.snapshot().revision,1);
});
test('corrupt storage is never silently replaced by an empty workspace',async()=>{
 const disk=storage();disk.values.set(STORAGE_KEY,'{corrupt');assert.throws(()=>createWorkspaceStore({storage:disk,clock}),/JSON válido/);assert.equal(disk.values.get(STORAGE_KEY),'{corrupt');
 const good=storage(),store=createWorkspaceStore({storage:good,clock});await store.save(record());good.values.set(STORAGE_KEY,'{new corruption');await assert.rejects(store.save(record('second')),/JSON válido/);assert.equal(store.snapshot().revision,1);assert.equal(good.values.get(STORAGE_KEY),'{new corruption');
});
test('stale tab must reload before saving; Web Locks serialize simultaneous writes',async()=>{
 const disk=storage();let queue=Promise.resolve();const withLock=task=>{const next=queue.then(task);queue=next.catch(()=>{});return next;};
 const first=createWorkspaceStore({storage:disk,clock,withLock}),second=createWorkspaceStore({storage:disk,clock,withLock});const result=await Promise.allSettled([first.save(record('first')),second.save(record('second'))]);assert.equal(result[0].status,'fulfilled');assert.equal(result[1].status,'rejected');assert.equal(result[1].reason.code,'CONFLICT');assert.equal(parseBackup(disk.values.get(STORAGE_KEY)).records.length,1);
 second.reload();await second.save(record('second'));assert.equal(second.snapshot().records.length,2);
});
test('import merges new IDs, preserves newer local records and is repeatable',async()=>{
 const disk=storage(),store=createWorkspaceStore({storage:disk,clock});await store.save({...record('same'),title:'Edição local'});
 const backup={...emptySnapshot(),records:[{...record('same'),title:'Versão antiga'},record('new')]};const result=await store.merge(parseBackup(encodeSnapshot(backup)));assert.equal(result.added,1);assert.equal(result.skipped,1);assert.equal(result.snapshot.records.find(r=>r.id==='same').title,'Edição local');const repeat=await store.merge(backup);assert.equal(repeat.added,0);assert.equal(repeat.skipped,2);
});
test('invalid save does not write partially valid data',async()=>{
 const disk=storage(),store=createWorkspaceStore({storage:disk,clock});await store.save(record());const before=disk.values.get(STORAGE_KEY);await assert.rejects(store.save({...record('bad'),actions:[{title:'missing other fields'}]}));assert.equal(disk.values.get(STORAGE_KEY),before);
});
