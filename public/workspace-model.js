export const WORKSPACE_VERSION=1;
export const MAX_BACKUP_BYTES=2*1024*1024;
export const KINDS={meeting:'Reunião',briefing:'Briefing',service:'Atendimento'};
export const STATUSES={todo:'A fazer',doing:'Em andamento',done:'Concluída',cancelled:'Cancelada'};
export const PRIORITIES={low:'Baixa',medium:'Média',high:'Alta'};
export function todayLocal(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function newId(){return globalThis.crypto.randomUUID();}
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function str(value,max,label,{empty=true}={}){if(typeof value!=='string'||value.length>max||(!empty&&!value.trim()))throw Error(`${label}: informe ${empty?'até':'de 1 a'} ${max} caracteres.`);return value.trim();}
function id(value){if(typeof value!=='string'||!/^[\w-]{1,80}$/.test(value))throw Error('Identificador inválido no backup.');return value;}
function oneOf(value,choices,label){if(!Object.hasOwn(choices,value))throw Error(`${label} inválido.`);return value;}
function timestamp(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)throw Error('Data de atualização inválida.');return value;}
function boolean(value){if(typeof value!=='boolean')throw Error('Estado inválido no backup.');return value;}
export function normalizeAction(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ação inválida.');
 if(value.due!==''&&!validDate(value.due))throw Error('Prazo: use uma data válida.');
 return {id:id(value.id),title:str(value.title,300,'Ação',{empty:false}),assignee:str(value.assignee,80,'Responsável'),due:value.due,status:oneOf(value.status,STATUSES,'Status'),priority:oneOf(value.priority,PRIORITIES,'Prioridade')};
}
export function normalizeRecord(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Registro inválido.');
 if(!validDate(value.date))throw Error('Informe uma data válida para o registro.');
 if(!Array.isArray(value.decisions)||value.decisions.length>50||!Array.isArray(value.actions)||value.actions.length>100)throw Error('Limite: 50 decisões e 100 ações por registro.');
 const actions=value.actions.map(normalizeAction);if(new Set(actions.map(x=>x.id)).size!==actions.length)throw Error('Há ações com identificadores repetidos.');
 return {id:id(value.id),title:str(value.title,120,'Título',{empty:false}),kind:oneOf(value.kind,KINDS,'Tipo'),project:str(value.project,80,'Projeto'),date:value.date,participants:str(value.participants,500,'Participantes'),notes:str(value.notes,16000,'Anotações'),decisions:value.decisions.map(x=>str(x,500,'Decisão',{empty:false})),actions,archived:boolean(value.archived),demo:boolean(value.demo),createdAt:timestamp(value.createdAt),updatedAt:timestamp(value.updatedAt)};
}
export function newRecord({clock=()=>new Date(),idFactory=newId}={}){const date=clock();return {id:idFactory(),title:'',kind:'meeting',project:'',date:todayLocal(date),participants:'',notes:'',decisions:[],actions:[],archived:false,demo:false,createdAt:date.toISOString(),updatedAt:date.toISOString()};}
export function emptySnapshot(){return {version:WORKSPACE_VERSION,revision:0,updatedAt:null,records:[]};}
export function normalizeSnapshot(value){
 if(!value||value.version!==WORKSPACE_VERSION)throw Error('Versão de backup não suportada. Os dados existentes foram preservados.');
 if(!Number.isSafeInteger(value.revision)||value.revision<0)throw Error('Revisão de backup inválida.');
 if(!Array.isArray(value.records)||value.records.length>150)throw Error('Limite de 150 registros por workspace.');
 const records=value.records.map(normalizeRecord);if(new Set(records.map(x=>x.id)).size!==records.length)throw Error('Há registros com identificadores repetidos.');
 return {version:WORKSPACE_VERSION,revision:value.revision,updatedAt:value.updatedAt===null?null:timestamp(value.updatedAt),records};
}
export function parseBackup(raw){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_BACKUP_BYTES)throw Error('Backup acima do limite de 2 MB.');
 let value;try{value=JSON.parse(raw);}catch{throw Error('O arquivo não contém um JSON válido.');}return normalizeSnapshot(value);
}
export function encodeSnapshot(snapshot){const result=JSON.stringify(normalizeSnapshot(snapshot),null,2);if(new TextEncoder().encode(result).byteLength>MAX_BACKUP_BYTES)throw Error('O workspace atingiu 2 MB. Exporte um backup antes de continuar.');return result;}
const key=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function extractNotes(notes){
 str(notes,16000,'Anotações');const decisions=[],actions=[],warnings=[];
 for(const line of notes.split(/\r?\n/)){
  const match=line.trim().match(/^(?:[-*•]\s*)?(decis[aã]o|a[cç][aã]o)\s*:\s*(.+)$/iu);if(!match)continue;
  if(key(match[1])==='decisao'){const text=match[2].trim();if(text.length>500){warnings.push('Uma decisão excedeu 500 caracteres e não foi extraída.');continue;}if(!decisions.some(x=>key(x)===key(text)))decisions.push(text);continue;}
  const [title,...fields]=match[2].split('|').map(x=>x.trim());if(!title||title.length>300){warnings.push('Uma ação não tem título válido e não foi extraída.');continue;}
  let assignee='',due='';
  for(const field of fields){const index=field.indexOf(':');if(index<0)continue;const label=key(field.slice(0,index)),value=field.slice(index+1).trim();
   if(label==='responsavel'){if(value.length<=80)assignee=value;else warnings.push('Um responsável excedeu 80 caracteres e ficou em branco.');}
   if(label==='prazo'){if(validDate(value))due=value;else if(value)warnings.push(`Prazo não interpretado: “${value.slice(0,70)}”. Defina uma data no formulário.`);}
  }
  if(!actions.some(x=>key(x.title)===key(title)&&key(x.assignee)===key(assignee)&&x.due===due))actions.push({title,assignee,due,status:'todo',priority:'medium'});
 }
 if(decisions.length>50||actions.length>100)throw Error('Muitos itens extraídos. Divida as anotações em registros menores.');
 return {decisions,actions,warnings};
}
export function applyExtraction(record,proposal,idFactory=newId){
 const decisions=[...record.decisions];for(const decision of proposal.decisions)if(!decisions.some(x=>key(x)===key(decision)))decisions.push(decision);
 const actions=[...record.actions];for(const action of proposal.actions)if(!actions.some(x=>key(x.title)===key(action.title)&&key(x.assignee)===key(action.assignee)&&x.due===action.due))actions.push({...action,id:idFactory()});
 return normalizeRecord({...record,decisions,actions});
}
export function mergeRecords(current,incoming){const ids=new Set(current.map(x=>x.id)),fresh=incoming.filter(x=>!ids.has(x.id));if(current.length+fresh.length>150)throw Error('A importação ultrapassa o limite de 150 registros.');return {records:[...current,...fresh],added:fresh.length,skipped:incoming.length-fresh.length};}
export function workspaceStats(records,today=todayLocal()){
 const active=records.filter(r=>!r.archived),actions=active.flatMap(r=>r.actions),open=actions.filter(a=>a.status==='todo'||a.status==='doing');
 return {records:active.length,open:open.length,overdue:open.filter(a=>a.due&&a.due<today).length,done:actions.filter(a=>a.status==='done').length,demo:active.filter(r=>r.demo).length};
}
