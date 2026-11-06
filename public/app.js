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
async function loadHealth(){try{health=await api('/api/health');$('#mode').textContent=health.mode==='local'?'Assistente local · sem IA generativa':health.aiReady?'IA configurada':'IA aguardando configuração';if(health.authRequired)$('#access').classList.remove('hidden');if(!health.aiReady)notify('O dono do projeto precisa configurar APP_PASSWORD na Vercel.');}catch(e){$('#mode').textContent='Sem conexão';notify(e.message);}}
loadHealth();
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition,listening=false;
window.speakReply=text=>{if($('#speak').checked&&'speechSynthesis'in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='pt-BR';speechSynthesis.speak(utterance);}};
if(Recognition){recognition=new Recognition();recognition.lang='pt-BR';recognition.interimResults=false;recognition.onstart=()=>{listening=true;$('#orb').classList.add('active');$('#mic').textContent='Parar gravação';$('#voice-status').textContent='Escutando…';};recognition.onend=()=>{listening=false;$('#orb').classList.remove('active');$('#mic').textContent='Ativar microfone';$('#voice-status').textContent='Pronto para ouvir';};recognition.onresult=e=>{$('#message').value=e.results[0][0].transcript;$('#message').focus();notify('Revise a transcrição e clique em Enviar.');};recognition.onerror=e=>notify('Não foi possível usar o microfone: '+e.error+'. Você pode digitar a mensagem.');$('#mic').onclick=()=>{try{listening?recognition.stop():recognition.start();}catch{notify('Aguarde o microfone terminar.');}};}else{$('#mic').disabled=true;$('#voice-status').textContent='Reconhecimento indisponível neste navegador. Use o campo de texto.';}
$('#stop').onclick=()=>{if(recognition&&listening)recognition.stop();if('speechSynthesis'in window)speechSynthesis.cancel();};
$('#clear').onclick=()=>{if('speechSynthesis'in window)speechSynthesis.cancel();$('#messages').replaceChildren();history.length=0;notify('Conversa apagada desta tela.');};
$('#download').onclick=()=>{const blob=new Blob([$('#messages').innerText],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='conversa.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
