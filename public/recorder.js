// Standard microphone capture; independent of the browser's SpeechRecognition service.
export function createRecorder({host=window,onState,onAudio,timers=host}){
 const supported=Boolean(host.isSecureContext&&host.navigator?.mediaDevices?.getUserMedia&&host.MediaRecorder);
 let current=null;
 const publish=(state,message)=>onState({state,message,supported});
 function release(s){timers.clearTimeout(s.timer);s.stream?.getTracks().forEach(t=>t.stop());}
 function cancel(){const s=current;if(!s)return;current=null;s.controller.abort();release(s);if(s.recorder?.state==='recording')try{s.recorder.stop();}catch{}publish('idle','Gravação cancelada. Seu texto foi preservado.');}
 function stop(){const s=current;if(!s||s.recorder?.state!=='recording')return;timers.clearTimeout(s.timer);publish('stopping','Finalizando gravação…');try{s.recorder.stop();if(current===s&&s.recorder.state!=='recording'&&!s.stopped)s.timer=timers.setTimeout(()=>{if(current===s){cancel();publish('error','O navegador não finalizou o áudio. Tente novamente.');}},5000);}catch{cancel();publish('error','Não foi possível finalizar a gravação.');}}
 async function start(){
  if(!supported||current)return;
  const s={controller:new AbortController(),chunks:[],size:0};current=s;
  publish('starting','Permita o microfone para iniciar a gravação.');
  s.timer=timers.setTimeout(()=>{if(current===s){cancel();publish('error','A permissão demorou. Confira o microfone e tente novamente.');}},20000);
  try{
   const stream=await host.navigator.mediaDevices.getUserMedia({audio:true});
   if(current!==s){stream.getTracks().forEach(t=>t.stop());return;}s.stream=stream;timers.clearTimeout(s.timer);
   const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(m=>host.MediaRecorder.isTypeSupported(m));
   if(!mime)throw Error('Este navegador não oferece um formato de gravação compatível. Use o texto.');
   const recorder=new host.MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:64000});s.recorder=recorder;
   recorder.ondataavailable=e=>{if(current!==s||!e.data.size)return;s.size+=e.data.size;if(s.size>2*1024*1024){cancel();publish('error','Gravação acima de 2 MB. Grave um trecho menor.');return;}s.chunks.push(e.data);};
   recorder.onerror=()=>{if(current===s){cancel();publish('error','Falha ao gravar. Confira o dispositivo e tente novamente.');}};
   recorder.onstop=async()=>{
    s.stopped=true;release(s);if(current!==s)return;
    const blob=new Blob(s.chunks,{type:recorder.mimeType||mime});s.chunks=[];
    if(!blob.size){current=null;publish('error','Gravação vazia. Tente novamente.');return;}
    publish('transcribing','Transcrevendo no servidor…');
    try{await onAudio(blob,s.controller.signal);if(current===s){current=null;publish('idle','Transcrição pronta. Revise o texto e envie.');}}
    catch(e){if(current===s){current=null;publish('error',e.message||'Não foi possível transcrever. Tente novamente.');}}
   };
   recorder.start(1000);publish('recording','Gravando… Clique em Finalizar gravação ao terminar (máximo 60 segundos).');s.timer=timers.setTimeout(stop,60000);
  }catch(e){if(current!==s)return;release(s);current=null;publish('error',e.name==='NotAllowedError'?'Microfone bloqueado. Permita o acesso nas configurações deste site.':e.name==='NotFoundError'?'Nenhum microfone encontrado. Conecte um dispositivo.':e.message||'Não foi possível abrir o microfone.');}
 }
 publish('idle',supported?'Gravação compatível disponível.':'Gravação indisponível. Use HTTPS, permita o microfone ou digite.');
 return {supported,start,stop,cancel,get active(){return Boolean(current);}};
}
export function blobToBase64(blob,host=window){return new Promise((resolve,reject)=>{const reader=new host.FileReader();reader.onerror=()=>reject(Error('Falha ao ler o áudio.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob);});}
