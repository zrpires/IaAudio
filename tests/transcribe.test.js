import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/transcribe.js';
import {invoke} from './helpers.js';
test('retired paid endpoint refuses requests without spending credits',async()=>{
 const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('Forbidden');};
 try{const r=await invoke(handler,{data:{audio:'anything'}});assert.equal(r.status,410);assert.match(r.data.error,/desativada/);assert.equal(calls,0);}finally{global.fetch=original;}
});
