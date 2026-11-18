export async function decodeAudio(blob,host=window){
 const Context=host.OfflineAudioContext||host.webkitOfflineAudioContext;
 if(!Context)throw Error('Este navegador não permite decodificar áudio localmente. Use o texto.');
 const context=new Context(1,16000,16000);
 let decoded;
 try{decoded=await context.decodeAudioData(await blob.arrayBuffer());}catch{throw Error('Não foi possível ler a gravação neste navegador. Grave novamente ou use o texto.');}
 if(!decoded.length||decoded.duration>61)throw Error('Grave um trecho de até 60 segundos.');
 // decodeAudioData resamples to the context sample rate. Mix stereo recordings to mono.
 const audio=new Float32Array(decoded.length);
 for(let c=0;c<decoded.numberOfChannels;c++){const channel=decoded.getChannelData(c);for(let i=0;i<audio.length;i++)audio[i]+=channel[i]/decoded.numberOfChannels;}
 let energy=0;for(const sample of audio)energy+=sample*sample;
 if(Math.sqrt(energy/audio.length)<0.0005)throw Error('A gravação está silenciosa. Confira o microfone e fale mais perto.');
 return audio;
}
export function createLocalTranscriber({host=window,onProgress=()=>{}}={}){
 const supported=Boolean(host.Worker&&host.WebAssembly&&(host.OfflineAudioContext||host.webkitOfflineAudioContext));
 let worker=null,ready=false,loading=null,nextId=0;
 const requests=new Map();
 function reset(message='Processamento local cancelado.'){
  worker?.terminate();worker=null;ready=false;loading=null;
  for(const request of requests.values()){request.cleanup();request.reject(Error(message));}requests.clear();
 }
 function ensureWorker(){
  if(worker)return;
  if(!supported)throw Error('Transcrição local indisponível neste navegador. Use o texto ou o reconhecimento nativo.');
  worker=new host.Worker('/local-worker.js',{type:'module'});
  worker.onmessage=({data})=>{
   const request=requests.get(data.id);if(!request)return;
   if(data.type==='progress'){onProgress(data);return;}
   requests.delete(data.id);request.cleanup();
   if(data.type==='error')request.reject(Error(data.message));else request.resolve(data);
  };
  worker.onerror=()=>reset('Não foi possível iniciar o modelo gratuito. Confira a conexão e o suporte do dispositivo; você pode continuar por texto.');
 }
 function request(type,audio,signal){
  return new Promise((resolve,reject)=>{
   if(signal?.aborted){reject(Error('Captura cancelada.'));return;}
   try{ensureWorker();}catch(error){reject(error);return;}
   const id=++nextId;
   const abort=()=>reset();
   const timeout=host.setTimeout(()=>reset('O processamento local demorou demais. Tente um trecho menor ou use o texto.'),180000);
   const cleanup=()=>{host.clearTimeout(timeout);signal?.removeEventListener('abort',abort);};
   requests.set(id,{resolve,reject,cleanup});signal?.addEventListener('abort',abort,{once:true});
   try{worker.postMessage({id,type,audio},audio?[audio.buffer]:[]);}catch{reset('Não foi possível enviar o áudio ao modelo local.');}
  });
 }
 async function prepare(signal){
  if(ready)return;
  if(!loading){
   const task=request('load',undefined,signal).then(()=>{ready=true;});loading=task;
   try{await task;}finally{if(loading===task)loading=null;}
  }else await loading;
  if(signal?.aborted)throw Error('Captura cancelada.');
 }
 async function transcribe(blob,signal){
  await prepare(signal);const audio=await decodeAudio(blob,host);
  if(signal?.aborted)throw Error('Captura cancelada.');
  const result=await request('transcribe',audio,signal);
  if(typeof result.text!=='string'||!result.text.trim())throw Error('Nenhuma fala reconhecida. Tente novamente.');
  return result.text.trim();
 }
 return {supported,prepare,transcribe,cancel(){if(requests.size)reset();},get ready(){return ready;},get loading(){return Boolean(loading);}};
}
