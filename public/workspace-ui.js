import {KINDS,STATUSES,PRIORITIES,newId,newRecord,normalizeRecord,parseBackup,encodeSnapshot,MAX_BACKUP_BYTES,extractNotes,applyExtraction,workspaceStats,todayLocal} from './workspace-model.js';
import {createWorkspaceStore,STORAGE_KEY} from './workspace-store.js';
import {recordMarkdown,actionsCSV,safeFilename} from './workspace-export.js';
import {demoSnapshot} from './workspace-demo.js';

export function initWorkspace({document,host,notify}){
 const q=selector=>document.querySelector(selector);
 const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 const fields={title:q('#record-title'),kind:q('#record-kind'),project:q('#record-project'),date:q('#record-date'),participants:q('#record-participants'),notes:q('#meeting-notes'),decisions:q('#record-decisions')};
 let repository,state={records:[],revision:0,version:1,updatedAt:null},selected=newRecord(),draftActions=[],dirty=false,taskDirty=false,editingActionId=null,proposal=null,importDraft=null,busy=false,editGeneration=0;
 const hasChanges=()=>dirty||taskDirty;
 function status(message,error=false){q('#workspace-storage').textContent=message;q('#workspace-storage').classList[error?'add':'remove']('storage-error');}
 function setDirty(){editGeneration++;dirty=true;status('Rascunho não salvo. Clique em Salvar registro.');}
 function setBusy(value){
  busy=value;for(const selector of ['#save-record','#save-action','#extract-record','#dictate-notes','#load-demo'])q(selector).disabled=value||!repository;
  q('#archive-record').disabled=value||!repository||!state.records.some(r=>r.id===selected.id);
  q('#apply-extraction').disabled=value||!repository||!proposal||(!proposal.actions.length&&!proposal.decisions.length);
  q('#apply-backup').disabled=value||!repository||!importDraft;
  for(const form of [q('#meeting-form'),q('#task-form')])for(const input of form.querySelectorAll('input,textarea,select'))input.disabled=value;
 }
 function download(content,name,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),link=make('a');link.href=url;link.download=name;link.click();host.setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function run(action){if(busy)return;setBusy(true);try{await action();}catch(error){status(error.message,true);notify(error.message);}finally{setBusy(false);}}
 function chooseScreen(name){const isWorkspace=name==='workspace';q('#workspace-screen').hidden=!isWorkspace;q('#assistant-screen').hidden=isWorkspace;for(const [id,active] of [['#workspace-tab',isWorkspace],['#assistant-tab',!isWorkspace]]){q(id).setAttribute('aria-selected',String(active));q(id).tabIndex=active?0:-1;}}
 q('#workspace-tab').onclick=()=>chooseScreen('workspace');q('#assistant-tab').onclick=()=>chooseScreen('assistant');
 for(const selector of ['#workspace-tab','#assistant-tab'])q(selector).onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const workspace=event.key==='Home'||(event.key!=='End'&&selector==='#assistant-tab');chooseScreen(workspace?'workspace':'assistant');q(workspace?'#workspace-tab':'#assistant-tab').focus();}};
 q('#open-workspace').onclick=()=>chooseScreen('workspace');
 q('#dictate-notes').onclick=()=>{q('#voice-target').value='notes';chooseScreen('assistant');notify('A voz será adicionada às anotações deste registro. No modo local, prepare o modelo antes de gravar.');q('#prepare-local').focus();};
 function resetTaskForm(){editingActionId=null;taskDirty=false;q('#action-title').value='';q('#action-assignee').value='';q('#action-due').value='';q('#action-priority').value='medium';q('#save-action').textContent='Adicionar ação';q('#cancel-action-edit').hidden=true;}
 function loadRecord(record){selected=record;draftActions=record.actions.map(a=>({...a}));for(const key of ['title','kind','project','date','participants','notes'])fields[key].value=record[key];fields.decisions.value=record.decisions.join('\n');dirty=false;proposal=null;q('#extraction-preview').hidden=true;resetTaskForm();q('#editor-title').textContent=record.title||'Novo registro';q('#record-badge').textContent=record.demo?'DEMONSTRAÇÃO':record.archived?'ARQUIVADO':'REGISTRO LOCAL';q('#archive-record').textContent=record.archived?'Restaurar registro':'Arquivar registro';q('#archive-record').disabled=!state.records.some(x=>x.id===record.id);renderActions();}
 function readDraft({allowTask=false}={}){if(taskDirty&&!allowTask)throw Error('Há uma ação em edição. Salve a ação ou cancele a edição antes de continuar.');return normalizeRecord({...selected,title:fields.title.value,kind:fields.kind.value,project:fields.project.value,date:fields.date.value,participants:fields.participants.value,notes:fields.notes.value,decisions:fields.decisions.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),actions:draftActions,updatedAt:new Date().toISOString()});}
 function confirmDiscard(){return !hasChanges()||host.confirm('Há um rascunho não salvo. Deseja descartá-lo para abrir outro registro?');}
 function renderStats(){const stats=workspaceStats(state.records);for(const [id,key] of [['#stat-records','records'],['#stat-open','open'],['#stat-overdue','overdue'],['#stat-done','done']])q(id).textContent=String(stats[key]);q('#demo-notice').hidden=!stats.demo;q('#demo-notice').textContent=stats.demo?`${stats.demo} registro(s) fictício(s) de demonstração incluído(s) nos indicadores.`:'';}
 function projectOptions(){const current=q('#project-filter').value;q('#project-filter').replaceChildren(make('option','Todos os projetos'));q('#project-filter').firstChild.value='';for(const project of [...new Set(state.records.map(r=>r.project).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))){const option=make('option',project);option.value=project;q('#project-filter').append(option);}q('#project-filter').value=current;}
 const searchKey=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function renderList(){
  const needle=searchKey(q('#record-search').value.trim()),project=q('#project-filter').value,scope=q('#archive-filter').value;
  const records=state.records.filter(r=>(scope==='all'||(scope==='archived'?r.archived:!r.archived))&&(!project||r.project===project)&&(!needle||searchKey([r.title,r.project,r.participants,r.notes].join(' ')).includes(needle))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const list=q('#records-list');list.replaceChildren();q('#records-count').textContent=`${records.length} registro(s)`;
  if(!records.length)list.append(make('p',state.records.length?'Nenhum registro corresponde aos filtros.':'Crie seu primeiro registro ou carregue a demonstração com dados fictícios.','empty-state'));
  for(const record of records){const button=make('button',undefined,'record-card');button.type='button';button.setAttribute('aria-pressed',String(record.id===selected.id));button.append(make('strong',record.title),make('span',(record.project||'Sem projeto')+' · '+record.date.split('-').reverse().join('/'),'record-meta'),make('small',`${KINDS[record.kind]} · ${record.actions.filter(a=>['todo','doing'].includes(a.status)).length} ação(ões) aberta(s)${record.demo?' · DEMO':''}${record.archived?' · Arquivado':''}`));button.onclick=()=>{if(busy||!confirmDiscard())return;loadRecord(record);renderList();status('Registro aberto. Os dados ficam neste navegador.');};list.append(button);}
 }
 function renderActions(){
  const body=q('#actions-body');body.replaceChildren();q('#actions-empty').hidden=draftActions.length>0;
  for(const action of [...draftActions].sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'))){
   const row=make('tr');row.append(make('td',action.title),make('td',action.assignee||'Não definido'));
   const due=make('td',action.due?action.due.split('-').reverse().join('/'):'Sem prazo');if(action.due&&action.due<todayLocal()&&['todo','doing'].includes(action.status))due.className='overdue';row.append(due,make('td',PRIORITIES[action.priority]));
   const statusCell=make('td'),select=make('select');select.setAttribute('aria-label','Status de '+action.title);
   for(const [value,label] of Object.entries(STATUSES)){const option=make('option',label);option.value=value;select.append(option);}select.value=action.status;
   select.onchange=()=>{const next=select.value;run(async()=>{if(hasChanges())throw Error('Salve o registro ou a ação em edição antes de mudar o status.');const draft=readDraft();draft.actions=draft.actions.map(a=>a.id===action.id?{...a,status:next}:a);await persist(draft);notify('Status da ação atualizado.');}).finally(()=>{select.value=action.status;});};statusCell.append(select);row.append(statusCell);
   const editCell=make('td'),edit=make('button','Editar','button ghost');edit.type='button';edit.setAttribute('aria-label','Editar ação '+action.title);edit.onclick=()=>{if(busy)return;if(taskDirty&&!host.confirm('Descartar os campos da ação em edição?'))return;editingActionId=action.id;q('#action-title').value=action.title;q('#action-assignee').value=action.assignee;q('#action-due').value=action.due;q('#action-priority').value=action.priority;taskDirty=false;q('#save-action').textContent='Salvar ação';q('#cancel-action-edit').hidden=false;q('#action-title').focus();};editCell.append(edit);row.append(editCell);body.append(row);
  }
 }
 function renderAll(){renderStats();projectOptions();renderList();}
 async function persist(record){
  if(!repository)throw Error('Armazenamento indisponível. Exporte a ata do rascunho antes de sair.');
  const generation=editGeneration;state=await repository.save(record);const saved=state.records.find(r=>r.id===record.id);
  if(generation===editGeneration){loadRecord(saved);status('Salvo neste navegador · '+new Date(state.updatedAt).toLocaleString('pt-BR'));}
  else{selected=saved;draftActions=saved.actions.map(a=>({...a}));resetTaskForm();dirty=true;proposal=null;q('#extraction-preview').hidden=true;renderActions();status('Registro salvo. Uma nova transcrição chegou; salve o rascunho atualizado.');}
  renderAll();
 }
 q('#meeting-form').addEventListener('input',setDirty);q('#meeting-form').addEventListener('change',setDirty);
 q('#task-form').addEventListener('input',()=>{editGeneration++;taskDirty=true;status('Ação em edição. Clique em Adicionar/Salvar ação para guardar.');});q('#task-form').addEventListener('change',()=>{taskDirty=true;});
 q('#meeting-form').onsubmit=event=>{event.preventDefault();run(async()=>{await persist(readDraft());notify('Registro salvo neste navegador.');});};
 q('#task-form').onsubmit=event=>{event.preventDefault();run(async()=>{const record=readDraft({allowTask:true}),previous=record.actions.find(a=>a.id===editingActionId);const action={id:editingActionId||newId(),title:q('#action-title').value,assignee:q('#action-assignee').value,due:q('#action-due').value,priority:q('#action-priority').value,status:previous?.status||'todo'};record.actions=previous?record.actions.map(a=>a.id===action.id?action:a):[...record.actions,action];await persist(record);notify('Ação e registro salvos.');});};
 q('#cancel-action-edit').onclick=()=>{if(taskDirty&&!host.confirm('Descartar os campos da ação em edição?'))return;resetTaskForm();};
 q('#new-record').onclick=()=>{if(busy||!confirmDiscard())return;loadRecord(newRecord());renderList();status('Novo rascunho. Preencha um título e salve o registro.');fields.title.focus();};
 q('#archive-record').onclick=()=>run(async()=>{if(!state.records.some(r=>r.id===selected.id))throw Error('Salve o registro antes de arquivar.');const record=readDraft();record.archived=!record.archived;await persist(record);notify(record.archived?'Registro arquivado. Use o filtro Arquivados para restaurar.':'Registro restaurado.');});
 for(const selector of ['#record-search','#project-filter','#archive-filter'])q(selector).addEventListener(selector==='#record-search'?'input':'change',renderList);
 q('#extract-record').onclick=()=>{try{const record=readDraft(),extracted=extractNotes(record.notes);proposal={...extracted,recordId:record.id,notes:record.notes};const list=q('#extraction-items');list.replaceChildren();for(const d of extracted.decisions)list.append(make('li','Decisão: '+d));for(const a of extracted.actions)list.append(make('li',`Ação: ${a.title} · ${a.assignee||'Sem responsável'} · ${a.due||'Sem prazo'}`));for(const w of extracted.warnings)list.append(make('li',w,'warning-text'));if(!extracted.actions.length&&!extracted.decisions.length)list.append(make('li','Nenhum marcador encontrado. Use Decisão: ou Ação: nas anotações.'));q('#extraction-preview').hidden=false;q('#apply-extraction').disabled=!extracted.actions.length&&!extracted.decisions.length;}catch(error){notify(error.message);}};
 q('#apply-extraction').onclick=()=>run(async()=>{if(!proposal)throw Error('Extraia os itens antes de aplicar.');const record=readDraft();if(record.id!==proposal.recordId||record.notes!==proposal.notes)throw Error('As anotações mudaram. Extraia os itens novamente para revisar.');await persist(applyExtraction(record,proposal));notify('Rascunho revisado aplicado e salvo. Itens repetidos foram ignorados.');});
 q('#dismiss-extraction').onclick=()=>{proposal=null;q('#extraction-preview').hidden=true;};
 function minutes(){return recordMarkdown(readDraft());}
 q('#preview-minutes').onclick=()=>{try{q('#minutes-content').textContent=minutes();q('#minutes-dialog').showModal();}catch(error){notify(error.message);}};
 q('#close-minutes').onclick=()=>q('#minutes-dialog').close();
 q('#copy-minutes').onclick=async()=>{try{if(!host.navigator.clipboard)throw Error('Cópia indisponível. Use Baixar ata.');await host.navigator.clipboard.writeText(q('#minutes-content').textContent);notify('Ata copiada.');}catch{notify('Não foi possível copiar. Use Baixar ata para guardar o texto.');}};
 q('#download-minutes').onclick=()=>{try{download(minutes(),safeFilename(fields.title.value)+'.md','text/markdown;charset=utf-8');}catch(error){notify(error.message);}};
 q('#export-actions').onclick=()=>{try{download(actionsCSV(state.records.filter(r=>!r.archived)),'nexo-acoes.csv','text/csv;charset=utf-8');notify('CSV dos registros ativos exportado.');}catch(error){notify(error.message);}};
 q('#export-backup').onclick=()=>{try{download(encodeSnapshot(state),'nexo-workspace-backup.json','application/json');notify('Backup dos registros salvos exportado. Rascunhos não salvos não são incluídos.');}catch(error){notify(error.message);}};
 q('#import-backup').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>MAX_BACKUP_BYTES)throw Error('O arquivo excede 2 MB.');importDraft=parseBackup(await file.text());const existing=new Set(state.records.map(r=>r.id));q('#import-summary').textContent=`Backup válido: ${importDraft.records.length} registro(s), ${importDraft.records.filter(r=>!existing.has(r.id)).length} novo(s). Registros com IDs existentes serão ignorados, sem sobrescrever dados.`;q('#import-review').hidden=false;q('#apply-backup').disabled=busy||!repository;}catch(error){importDraft=null;q('#import-review').hidden=true;notify(error.message);}finally{event.target.value='';}};
 q('#apply-backup').onclick=()=>run(async()=>{if(!importDraft)throw Error('Selecione um backup válido.');if(hasChanges())throw Error('Salve ou exporte seu rascunho antes de importar.');const result=await repository.merge(importDraft);state=result.snapshot;importDraft=null;q('#import-review').hidden=true;loadRecord(state.records.find(r=>r.id===selected.id)||state.records[0]||newRecord());renderAll();status('Backup mesclado e salvo neste navegador.');notify(`${result.added} registro(s) importado(s); ${result.skipped} existente(s) preservado(s).`);});
 q('#cancel-import').onclick=()=>{importDraft=null;q('#import-review').hidden=true;};
 q('#load-demo').onclick=()=>run(async()=>{if(hasChanges())throw Error('Salve ou exporte seu rascunho antes de abrir a demonstração.');const result=await repository.merge(demoSnapshot());state=result.snapshot;loadRecord(state.records.find(r=>r.id==='demo_sprint')||state.records[0]);renderAll();status('Demonstração carregada com dados fictícios.');notify('Registros fictícios adicionados. Seus registros existentes foram preservados.');});
 q('#reload-workspace').onclick=()=>{if(!repository||!confirmDiscard())return;try{state=repository.reload();loadRecord(state.records.find(r=>r.id===selected.id)||state.records[0]||newRecord());renderAll();status('Registros recarregados deste navegador.');}catch(error){notify(error.message);}};
 try{const storage=host.localStorage;const withLock=task=>host.navigator.locks?.request?host.navigator.locks.request(STORAGE_KEY,task):task();repository=createWorkspaceStore({storage,withLock});state=repository.snapshot();status(state.records.length?'Registros carregados deste navegador.':'Dados locais · sem conta e sem sincronização entre dispositivos.');}
 catch(error){status(error.message+' O workspace não sobrescreverá dados existentes.',true);try{const raw=host.localStorage.getItem(STORAGE_KEY);if(raw){q('#download-recovery').hidden=false;q('#download-recovery').onclick=()=>download(raw,'nexo-recuperacao.json','application/json');}}catch{}}
 loadRecord(state.records[0]||newRecord());renderAll();setBusy(false);chooseScreen('workspace');
 host.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY)return;if(hasChanges()){status('Outra aba alterou os dados. Preserve seu rascunho e use Recarregar registros.',true);return;}try{if(repository){state=repository.reload();loadRecord(state.records.find(r=>r.id===selected.id)||state.records[0]||newRecord());renderAll();status('Alterações de outra aba carregadas.');}}catch(error){status(error.message,true);}});
 host.addEventListener('beforeunload',event=>{if(hasChanges()){event.preventDefault();event.returnValue='';}});
 host.addEventListener('focus',renderStats);
}
