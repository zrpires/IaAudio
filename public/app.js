const $=s=>document.querySelector(s);
const money=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function notify(text){$('#notice').textContent=text;$('#notice').classList.remove('hidden');clearTimeout(window.noticeTimer);window.noticeTimer=setTimeout(()=>$('#notice').classList.add('hidden'),8000);}
const history=[];let health=null;
function accessToken(){try{return sessionStorage.getItem('ai-access')||'';}catch{return '';}}
async function api(path,data){
  let r;try{r=await fetch(path,{...(data?{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken()},body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(55000)});}catch{throw Error('Não foi possível conectar. Confira sua conexão e tente novamente.');}
  let value;try{value=await r.json();}catch{throw Error('Resposta inválida do servidor. Verifique o deploy.');}
  if(!r.ok){if(r.status===401){$('#access').classList.remove('hidden');$('#password').focus();}throw Error(value.error||'Falha na solicitação');}return value;
}
function bubble(text,cls=''){const n=el('div',text,'bubble '+cls);$('#messages').append(n);$('#messages').scrollTop=$('#messages').scrollHeight;}
$('#access-form').onsubmit=event=>{event.preventDefault();try{sessionStorage.setItem('ai-access',$('#password').value);$('#password').value='';notify('Senha salva nesta aba. Envie sua mensagem para verificar o acesso.');}catch{notify('O navegador bloqueou o armazenamento da senha. Habilite o armazenamento desta página.');}};
$('#chat-form').addEventListener('submit',async event=>{event.preventDefault();const message=$('#message').value.trim();if(!message)return;const button=$('#send');button.disabled=true;button.textContent='Respondendo…';bubble(message,'user');$('#message').value='';
try{const result=await api('/api/chat',{message,history:history.slice(-8),context:window.getContext?.()||{}});bubble(result.reply);history.push({role:'user',content:message},{role:'assistant',content:result.reply});if(history.length>8)history.splice(0,history.length-8);$('#mode').textContent=result.mode==='local'?'Assistente local · sem IA generativa':'IA conectada';window.speakReply?.(result.reply);}catch(e){bubble(e.message);$('#message').value=message;}finally{button.disabled=false;button.textContent='Enviar mensagem ↗';}});
async function loadHealth(){try{health=await api('/api/health');$('#mode').textContent=health.mode==='local'?'Assistente local · sem IA generativa':health.aiReady?'IA configurada':'IA aguardando configuração';if(health.authRequired)$('#access').classList.remove('hidden');if(health.mode!=='local'&&!health.aiReady)notify('O dono do projeto precisa configurar APP_PASSWORD na Vercel.');}catch(e){$('#mode').textContent='Sem conexão';notify(e.message);}}
loadHealth();
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition,listening=false,starting=false,voiceError='',lastReply='';
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
$('#replay').onclick=()=>speak(lastReply);
$('#speak').onchange=()=>{if(!$('#speak').checked&&synth)synth.cancel();};
if(!synth){$('#speak').disabled=true;$('#speech-status').textContent='Leitura indisponível neste navegador. Use as respostas em texto.';}
const voiceErrors={
  'not-allowed':'Microfone bloqueado. Permita o acesso nas configurações do navegador ou digite.',
  'service-not-allowed':'Serviço de reconhecimento bloqueado. Use o texto.',
  'audio-capture':'Nenhum microfone disponível. Conecte um dispositivo ou digite.',
  'no-speech':'Não ouvi uma fala. Tente novamente ou digite.',
  'network':'O serviço de voz está sem conexão. Tente novamente ou digite.',
  'aborted':'Escuta cancelada. Você pode continuar por texto.'
};
if(Recognition&&window.isSecureContext){
  recognition=new Recognition();recognition.lang='pt-BR';recognition.interimResults=false;recognition.continuous=false;
  recognition.onstart=()=>{starting=false;listening=true;$('#mic').disabled=false;$('#mic').setAttribute('aria-pressed','true');$('#orb').classList.add('active');$('#mic').textContent='Parar escuta';$('#voice-status').textContent='Escutando…';};
  recognition.onend=()=>{starting=false;listening=false;$('#mic').disabled=false;$('#mic').setAttribute('aria-pressed','false');$('#orb').classList.remove('active');$('#mic').textContent='Ativar microfone';$('#voice-status').textContent=voiceError||'Pronto para ouvir';};
  recognition.onresult=e=>{const transcript=e.results[0][0].transcript;const field=$('#message');field.value=(field.value.trim()+' '+transcript).trim().slice(0,2000);field.focus();notify('Revise a transcrição e clique em Enviar.');};
  recognition.onerror=e=>{voiceError=voiceErrors[e.error]||'Falha no reconhecimento. Continue por texto.';$('#voice-status').textContent=voiceError;notify(voiceError);};
  $('#mic').onclick=()=>{try{if(listening){recognition.stop();return;}if(starting)return;synth?.cancel();voiceError='';starting=true;$('#mic').disabled=true;$('#voice-status').textContent='Aguardando permissão do microfone…';recognition.start();}catch{starting=false;$('#mic').disabled=false;notify('Não foi possível iniciar. Tente novamente ou digite.');}};
}else{$('#mic').disabled=true;$('#voice-status').textContent='Reconhecimento indisponível neste navegador ou conexão. Use o campo de texto.';}
$('#stop').onclick=()=>{if(recognition&&(listening||starting))recognition.abort();synth?.cancel();$('#speech-status').textContent='Áudio interrompido.';};
$('#example').onclick=()=>{$('#message').value='Quero estudar arrays em Java por 30 minutos';$('#message').focus();};
window.addEventListener('pagehide',()=>{recognition?.abort();synth?.cancel();});
$('#clear').onclick=()=>{if('speechSynthesis'in window)speechSynthesis.cancel();$('#messages').replaceChildren();history.length=0;lastReply='';$('#replay').disabled=true;recognition?.abort();notify('Conversa apagada desta tela.');};
$('#download').onclick=()=>{const blob=new Blob([$('#messages').innerText],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='conversa.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

