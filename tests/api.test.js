import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke} from './helpers.js';
import chat from '../api/chat.js';
import health from '../api/health.js';
test('health reports free mode without exposing old keys',async()=>{
 const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='old-paid-key';
 try{const r=await invoke(health,{method:'GET'});assert.equal(r.data.free,true);assert.equal(r.data.mode,'local');assert.equal(r.data.authRequired,false);assert.ok(!JSON.stringify(r.data).includes('old-paid-key'));assert.equal(r.headers['cache-control'],'no-store');}finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
});
test('chat never calls a paid service even when old keys exist',async()=>{
 const previous=process.env.OPENAI_API_KEY,original=global.fetch;process.env.OPENAI_API_KEY='old-paid-key';let calls=0;global.fetch=async()=>{calls++;throw Error('Paid calls forbidden');};
 try{const r=await invoke(chat,{data:{message:'Java por 30 minutos'}});assert.equal(r.status,200);assert.equal(r.data.mode,'local');assert.match(r.data.reply,/Tempo total: 30 minutos/);assert.equal(calls,0);}finally{global.fetch=original;if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
});
test('methods, origin and payload validation still protect the chat',async()=>{
 assert.equal((await invoke(chat,{method:'GET'})).status,405);
 for(const origin of ['https://foreign.example','invalid'])assert.equal((await invoke(chat,{headers:{origin},data:{message:'Olá'}})).status,403);
 for(const data of [[],null,{}, {message:''},{message:'x'.repeat(2001)}])assert.equal((await invoke(chat,{data})).status,400);
 assert.equal((await invoke(chat,{raw:'invalid'})).status,400);assert.equal((await invoke(chat,{raw:'x'.repeat(65000)})).status,413);
 assert.equal((await invoke(chat,{headers:{'content-type':'text/plain'},data:{message:'Java'}})).status,415);
});
