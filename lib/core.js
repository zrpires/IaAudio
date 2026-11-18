import {studyReply} from './study.js';
export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export function json(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(value));}
export function endpoint(method,callback){return async(req,res)=>{try{
  if(req.method!==method){res.setHeader('Allow',method);throw new HttpError(405,'Método não permitido.');}
  const origin=req.headers.origin;
  if(origin){let host;try{host=new URL(origin).host;}catch{throw new HttpError(403,'Origem inválida.');}if(host!==req.headers.host)throw new HttpError(403,'Origem não permitida.');}
  return json(res,200,await callback(req));
}catch(error){if(!error.status)console.error('Falha na função:',error.name);return json(res,error.status||500,{error:error.status?error.message:'Não foi possível concluir. Tente novamente.'});}};}
export async function body(req){
  if(!(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'Envie JSON.');
  let data=req.body;
  if(data===undefined){let chunks=[],size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>64000)throw new HttpError(413,'Mensagem muito grande.');chunks.push(Buffer.from(chunk));}data=Buffer.concat(chunks).toString();}
  if(typeof data==='string'){if(Buffer.byteLength(data)>64000)throw new HttpError(413,'Mensagem muito grande.');try{data=JSON.parse(data);}catch{throw new HttpError(400,'JSON inválido.');}}
  if(!data||typeof data!=='object'||Array.isArray(data)||Buffer.byteLength(JSON.stringify(data))>64000)throw new HttpError(400,'Dados inválidos.');return data;
}
export function text(value,max=2000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new HttpError(400,'Mensagem inválida.');return value.trim();}
export async function chat(req){
 const data=await body(req),message=text(data.message);
 return {reply:studyReply(message,data.history),mode:'local'};
}
