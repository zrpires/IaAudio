import {endpoint,authorize,HttpError} from '../lib/core.js';
const MAX_AUDIO=2*1024*1024,MAX_BODY=2800000;
const formats={'audio/webm':'webm','audio/mp4':'mp4','audio/ogg':'ogg','audio/wav':'wav','audio/x-wav':'wav'};
export default endpoint('POST',async req=>{
 const key=process.env.TRANSCRIPTION_API_KEY||process.env.OPENAI_API_KEY;
 if(!key)throw new HttpError(503,'Configure TRANSCRIPTION_API_KEY e APP_PASSWORD na Vercel para usar a gravação.');
 authorize(req);
 if(!(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'Envie JSON com o áudio.');
 if(Number(req.headers['content-length'])>MAX_BODY)throw new HttpError(413,'Gravação muito grande. Limite: 2 MB.');
 let data=req.body;
 if(data===undefined){const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>MAX_BODY)throw new HttpError(413,'Gravação muito grande.');chunks.push(Buffer.from(chunk));}data=Buffer.concat(chunks).toString();}
 if(typeof data==='string'){if(Buffer.byteLength(data)>MAX_BODY)throw new HttpError(413,'Gravação muito grande.');try{data=JSON.parse(data);}catch{throw new HttpError(400,'JSON inválido.');}}
 if(data&&typeof data==='object'&&Buffer.byteLength(JSON.stringify(data))>MAX_BODY)throw new HttpError(413,'Gravação muito grande.');
 const mime=typeof data?.mime==='string'?data.mime.split(';')[0].toLowerCase():'';
 if(!Object.hasOwn(formats,mime))throw new HttpError(415,'Formato de áudio não suportado. Use WebM, MP4, Ogg ou WAV.');
 const encoded=data?.audio;
 if(typeof encoded!=='string'||!encoded.length||encoded.length>Math.ceil(MAX_AUDIO/3)*4||encoded.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw new HttpError(400,'Áudio inválido ou acima de 2 MB.');
 const bytes=Buffer.from(encoded,'base64');if(!bytes.length||bytes.length>MAX_AUDIO||bytes.toString('base64')!==encoded)throw new HttpError(400,'Áudio inválido.');
 const form=new FormData();form.append('file',new Blob([bytes],{type:mime}),'fala.'+formats[mime]);form.append('model',process.env.TRANSCRIPTION_MODEL||'gpt-transcribe');
 let response;
 try{response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+key},body:form,signal:AbortSignal.timeout(45000)});}catch{throw new HttpError(504,'A transcrição demorou. Tente novamente.');}
 if(!response.ok)throw new HttpError(502,response.status===429?'Limite ou saldo da transcrição atingido.':'Falha no serviço de transcrição. Confira chave, saldo e modelo na Vercel.');
 let result;try{result=await response.json();}catch{throw new HttpError(502,'O serviço retornou uma transcrição inválida.');}
 if(typeof result?.text!=='string'||!result.text.trim())throw new HttpError(422,'Nenhuma fala reconhecida. Grave novamente mais perto do microfone.');
 if(result.text.length>2000)throw new HttpError(422,'Transcrição muito longa. Grave um trecho menor.');
 return {text:result.text.trim()};
});
