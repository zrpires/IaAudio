import {emptySnapshot,parseBackup,normalizeSnapshot,normalizeRecord,encodeSnapshot,mergeRecords} from './workspace-model.js';
export const STORAGE_KEY='nexo-workspace:v1';
export function createWorkspaceStore({storage,clock=()=>new Date(),withLock=task=>task()}={}){
 function read(){let raw;try{raw=storage.getItem(STORAGE_KEY);}catch{throw Error('O navegador bloqueou o armazenamento. Nenhum dado foi sobrescrito.');}return raw===null?emptySnapshot():parseBackup(raw);}
 let current=read();
 async function commit(transform){
  return withLock(async()=>{
   const disk=read();if(disk.revision!==current.revision){const error=Error('Os dados mudaram em outra aba. Copie seu rascunho e recarregue os registros antes de salvar.');error.code='CONFLICT';throw error;}
   const next=normalizeSnapshot({...disk,records:transform(disk.records),revision:disk.revision+1,updatedAt:clock().toISOString()});
   const raw=encodeSnapshot(next);
   try{storage.setItem(STORAGE_KEY,raw);}catch{throw Error('Não foi possível salvar: armazenamento bloqueado ou sem espaço. Exporte seu rascunho e tente novamente.');}
   current=next;return normalizeSnapshot(current);
  });
 }
 return {
  snapshot:()=>normalizeSnapshot(current),
  reload(){const next=read();current=next;return normalizeSnapshot(next);},
  async save(record){const valid=normalizeRecord(record);return commit(records=>{const exists=records.some(x=>x.id===valid.id);return exists?records.map(x=>x.id===valid.id?valid:x):[valid,...records];});},
  async merge(backup){const valid=normalizeSnapshot(backup);let counts;await commit(records=>{counts=mergeRecords(records,valid.records);return counts.records;});return {snapshot:normalizeSnapshot(current),added:counts.added,skipped:counts.skipped};}
 };
}
