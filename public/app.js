import {createVoiceCapture} from './voice.js';
const $=s=>document.querySelector(s);
const money=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function notify(text){$('#notice').textContent=text;$('#notice').classList.remove('hidden');clearTimeout(window.noticeTimer);window.noticeTimer=setTimeout(()=>$('#notice').classList.add('hidden'),8000);}
const history=[];let health=null,pending=null,conversationVersion=0;
function busy(value){$('#send').disabled=value;$('#send').textContent=value?'Respondendo…':'Enviar mensagem ↗';$('#messages').setAttribute('aria-busy',String(value));}
function accessToken(){try{return sessionStorage.getItem('ai-access')||'';}catch{return '';}}
async function api(path,data,signal){
  let r;try{r=await fetch(path,{...(data?{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken()},body:JSON.stringify(data)}:{}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(55000)]):AbortSignal.timeout(55000)});}catch{throw Error('Não foi possível conectar. Confira sua conexão e tente novamente.');}
  let value;try{value=await r.json();}catch{throw Error('Resposta inválida do servidor. Verifique o deploy.');}
  if(!r.ok){if(r.status===401){$('#access').classList.remove('hidden');$('#password').focus();}throw Error(value.error||'Falha na solicitação');}return value;
}
function bubble(text,cls=''){const n=el('div',text,'bubble '+cls);$('#messages').append(n);$('#messages').scrollTop=$('#messages').scrollHeight;}
$('#access-form').onsubmit=event=>{event.preventDefault();try{sessionStorage.setItem('ai-access',$('#password').value);$('#password').value='';notify('Senha salva nesta aba. Envie sua mensagem para verificar o acesso.');}catch{notify('O navegador bloqueou o armazenamento da senha. Habilite o armazenamento desta página.');}};
$('#chat-form').addEventListener('submit',async event=>{
  event.preventDefault();if(pending)return;
  const message=$('#message').value.trim();if(!message)return;
  const version=conversationVersion,controller=new AbortController();pending=controller;busy(true);
  voice.cancel();synth?.cancel();bubble(message,'user');$('#message').value='';
  try{
    const result=await api('/api/chat',{message,history:history.slice(-8)},controller.signal);
    if(version!==conversationVersion)return;
    if(typeof result.reply!=='string'||!result.reply.trim())throw Error('Resposta vazia. Tente novamente.');
    bubble(result.reply);history.push({role:'user',content:message},{role:'assistant',content:result.reply});
    if(history.length>8)history.splice(0,history.length-8);
    $('#mode').textContent=result.mode==='local'?'Assistente local · sem IA generativa':'IA conectada';
    window.speakReply(result.reply);
  }catch(e){
    if(version!==conversationVersion||controller.signal.aborted)return;
    bubble(e.message);if(!$('#message').value.trim())$('#message').value=message;
    else notify('Falha no envio. Sua nova mensagem foi preservada; a anterior está na conversa.');
  }finally{if(pending===controller){pending=null;busy(false);}}
});
async function loadHealth(){try{health=await api('/api/health');$('#mode').textContent=health.mode==='local'?'Assistente local · sem IA generativa':health.aiReady?'IA configurada':'IA aguardando configuração';if(health.authRequired)$('#access').classList.remove('hidden');if(health.mode!=='local'&&!health.aiReady)notify('O dono do projeto precisa configurar APP_PASSWORD na Vercel.');}catch(e){$('#mode').textContent='Sem conexão';notify(e.message);}}
loadHealth();
let lastReply='';
const synth=window.speechSynthesis;
function speak(text){
  if(!synth)return;
  synth.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='pt-BR';
  utterance.voice=synth.getVoices().find(v=>v.lang.toLowerCase()==='pt-br')||null;
  utterance.onstart=()=>{$('#speech-status').textContent='Lendo resposta…';};
  utterance.onend=()=>{$('#speech-status').textContent='Leitura concluída.';};
  utterance.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))$('#speech-status').textContent='Leitura indisponível. A resposta está no texto.';};
  synth.speak(utterance);
}
window.speakReply=text=>{lastReply=text;$('#replay').disabled=!synth;if($('#speak').checked)speak(text);};
$('#replay').onclick=()=>{voice.cancel();speak(lastReply);};
$('#speak').onchange=()=>{if(!$('#speak').checked&&synth)synth.cancel();};
if(!synth){$('#speak').disabled=true;$('#speech-status').textContent='Leitura indisponível neste navegador. Use as respostas em texto.';}
let voiceState='idle';
const voice=createVoiceCapture({
  onState:({state,message,supported})=>{
    voiceState=state;$('#voice-status').textContent=message;
    $('#mic').disabled=!supported||state==='stopping';
    $('#mic').setAttribute('aria-pressed',String(state==='starting'||state==='listening'));
    $('#mic').textContent=state==='starting'?'Cancelar escuta':state==='listening'?'Finalizar escuta':'Ativar microfone';
    $('#orb').classList[state==='listening'?'add':'remove']('active');
  },
  onInterim:text=>{$('#transcript-preview').textContent=text?'Ouvindo: '+text:'';},
  onFinal:text=>{
    if(pending)return;
    const field=$('#message'),combined=(field.value.trim()+' '+text).trim();
    if(combined.length>2000){$('#transcript-preview').textContent='';notify('O texto excedeu 2000 caracteres. Envie seu rascunho antes de continuar a ditar.');return;}
    field.value=combined;field.focus();notify('Transcrição adicionada. Revise o texto e clique em Enviar.');
  }
});
$('#mic').onclick=()=>{
  if(pending){notify('Aguarde a resposta antes de iniciar outra escuta.');return;}
  if(voiceState==='starting'){voice.cancel();return;}
  if(voice.active){voice.stop();return;}
  synth?.cancel();voice.start();
};
$('#stop').onclick=()=>{voice.stop();synth?.cancel();$('#speech-status').textContent='Áudio interrompido.';};
$('#example').onclick=()=>{$('#message').value='Quero estudar arrays em Java por 30 minutos';$('#message').focus();};
window.addEventListener('pagehide',()=>{voice.cancel();synth?.cancel();});
$('#clear').onclick=()=>{conversationVersion++;pending?.abort();pending=null;busy(false);$('#message').value='';$('#speech-status').textContent='';if('speechSynthesis'in window)speechSynthesis.cancel();$('#messages').replaceChildren();history.length=0;lastReply='';$('#replay').disabled=true;voice.cancel();notify('Conversa apagada desta tela.');};
$('#download').onclick=()=>{const blob=new Blob([$('#messages').innerText],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='conversa.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

