import test from 'node:test';
import assert from 'node:assert/strict';
import {studyReply} from '../lib/study.js';
test('asks for missing details and bounds study duration',()=>{
  for(const message of ['Java','30 minutos','estudar Java por 0 minutos','Java por 181 minutos'])assert.ok(!studyReply(message).includes('Tempo total:'));
});
test('allocations always sum to requested duration',()=>{
  for(let minutes=5;minutes<=180;minutes++){
    const reply=studyReply(`estudar Java por ${minutes} minutos`);
    const allocated=[...reply.matchAll(/— (\d+) min/g)].reduce((sum,m)=>sum+Number(m[1]),0);
    assert.equal(allocated,minutes);
    assert.match(reply,/Java/);
  }
  assert.match(studyReply('estudar Java por 2 horas'),/Tempo total: 120 minutos/);
});
