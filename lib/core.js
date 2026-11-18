import {studyReply} from './study.js';
import {KIND,PRODUCTS} from './config.js';
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
export function context(value){
  if(KIND==='store')return {products:PRODUCTS};
  if(KIND!=='personal')return {};
  const tasks=(Array.isArray(value?.tasks)?value.tasks:[]).slice(0,60).filter(x=>typeof x?.title==='string').map(x=>({title:x.title.slice(0,200),done:x.done===true,due:typeof x.due==='string'?x.due.slice(0,10):''}));
  const expenses=(Array.isArray(value?.expenses)?value.expenses:[]).slice(0,60).filter(x=>Number.isSafeInteger(x?.cents)&&x.cents>0&&typeof x.title==='string').map(x=>({title:x.title.slice(0,200),cents:x.cents}));
  return {tasks,expenses};
}
const brl=value=>(value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function localReply(message,ctx){
  const m=message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(KIND==='store'){
    const match=m.match(/(?:r\$\s*|ate\s+|orcamento\s+(?:de\s+)?)(\d+(?:[.,]\d{1,2})?)/),budget=match?Math.round(Number(match[1].replace(',','.'))*100):Infinity;
    const rules={fone:['audio','musica','fone'],luminaria:['estud','luz','ilumin','mesa'],organizador:['organiz','mesa','escritorio'],mochila:['mochila','viagem','notebook'],garrafa:['agua','garrafa','academia'],teclado:['teclado','digitar','trabalh']};
    const affordable=PRODUCTS.filter(p=>p.price<=budget),ranked=affordable.map(p=>({p,score:rules[p.id]?.filter(word=>m.includes(word)).length||0})).sort((a,b)=>b.score-a.score||a.p.price-b.p.price).slice(0,3);
    if(!ranked.length)return 'Nenhum produto do catálogo cabe nesse orçamento. O menor preço atual é '+brl(Math.min(...PRODUCTS.map(p=>p.price)))+'.';
    return 'Estas opções cabem no orçamento informado (preços individuais, sem frete):\n'+ranked.map(({p})=>`• ${p.name}: ${brl(p.price)} — ${p.description}`).join('\n')+'\nVocê pode ajustar a busca ou comparar os itens no catálogo.';
  }
  if(KIND==='personal'){
    const tasks=(ctx.tasks||[]).filter(t=>!t.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
    const total=(ctx.expenses||[]).reduce((sum,e)=>sum+e.cents,0);
    if(/gast|dinheiro|finance|econom|orcamento/.test(m))return `Você registrou ${brl(total)} em gastos.\n1. Separe despesas essenciais e opcionais.\n2. Defina um limite semanal realista.\n3. Revise os registros antes de novas compras.\nO painel considera os registros deste navegador; não consulta seu banco.`;
    return (tasks.length?'Sugestão com suas tarefas pendentes:\n'+tasks.slice(0,5).map((t,i)=>`${i+1}. ${t.title}${t.due?' — prazo '+t.due:''}`).join('\n'):'Ainda não há tarefas pendentes registradas.')+'\nReserve 25 minutos para o primeiro passo, faça uma pausa e revise o progresso. Para um plano personalizado sobre “'+message.slice(0,100)+'”, ative a IA nas configurações do deploy.';
  }
  if(KIND==='voice')return studyReply(message);
  return 'Entendi: “'+message.slice(0,180)+'”.\nExperimente dividir isso em três passos: definir o resultado desejado, escolher a menor ação possível e reservar um horário para executá-la.\nEstou no modo local, com orientação por regras. Para respostas personalizadas e conversa contextual, configure a chave OpenAI no deploy.';
}
export async function chat(req){
 const data=await body(req),message=text(data.message),ctx=context(data.context);
 return {reply:KIND==='voice'?studyReply(message,data.history):localReply(message,ctx),mode:'local'};
}
