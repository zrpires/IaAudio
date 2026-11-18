const errors={
  'not-allowed':'Microfone bloqueado. Permita o microfone nas configurações deste site e tente novamente.',
  'service-not-allowed':'O navegador bloqueou o serviço de voz. Tente Chrome ou Edge atualizado, ou digite.',
  'audio-capture':'Microfone não encontrado ou ocupado. Confira o dispositivo e tente novamente.',
  'no-speech':'Não ouvi uma fala. Clique em Ativar microfone e tente novamente.',
  'network':'Não foi possível conectar ao serviço de voz do navegador. Confira a conexão ou use o texto.',
  'language-not-supported':'O serviço não oferece reconhecimento em português neste dispositivo. Use o texto.'
};

// One recognizer per attempt. Late events from cancelled attempts are ignored.
export function createVoiceCapture({host=window,onState,onFinal,onInterim=()=>{},timers=host}){
  const Recognition=host.SpeechRecognition||host.webkitSpeechRecognition;
  const supported=Boolean(Recognition&&host.isSecureContext);
  let active=null;
  const publish=(state,message)=>onState({state,message,supported});
  const idle='Pronto para ouvir. Clique em Ativar microfone.';
  const cleanup=session=>{timers.clearTimeout(session.timer);if(active===session)active=null;};
  function cancel(){
    const session=active;if(!session)return;
    cleanup(session);onInterim('');
    try{session.recognition.abort();}catch{}
    publish('idle','Escuta cancelada. Seu texto foi preservado.');
  }
  function stop(){
    const session=active;if(!session)return;
    publish('stopping','Finalizando a transcrição…');
    try{session.recognition.stop();}catch{cancel();return;}
    if(active===session){timers.clearTimeout(session.timer);session.timer=timers.setTimeout(()=>{if(active===session){cancel();publish('error','O serviço de voz não finalizou. Tente novamente ou digite.');}},5000);}
  }
  function start(){
    if(!supported||active)return;
    let recognition;
    try{recognition=new Recognition();}catch{publish('error','Não foi possível iniciar o serviço de voz. Use o texto ou outro navegador.');return;}
    const session={recognition,finalized:new Set(),hasText:false,timer:null};active=session;
    recognition.lang='pt-BR';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=1;
    recognition.onstart=()=>{
      if(active!==session)return;
      timers.clearTimeout(session.timer);
      publish('listening','Escutando… Fale seu tema e o tempo disponível.');
      session.timer=timers.setTimeout(stop,60000);
    };
    recognition.onresult=event=>{
      if(active!==session)return;
      const finals=[],interim=[];
      for(let index=event.resultIndex||0;index<event.results.length;index++){
        const result=event.results[index],text=result?.[0]?.transcript?.trim();if(!text)continue;
        if(result.isFinal){if(!session.finalized.has(index)){session.finalized.add(index);finals.push(text);}}
        else interim.push(text);
      }
      if(finals.length){session.hasText=true;onFinal(finals.join(' '));}
      onInterim(interim.join(' '));
    };
    recognition.onerror=event=>{
      if(active!==session)return;
      cleanup(session);onInterim('');
      try{recognition.abort();}catch{}
      publish('error',errors[event.error]||'O reconhecimento foi interrompido. Tente novamente ou digite.');
    };
    recognition.onnomatch=()=>{if(active===session)publish('listening','Fala não reconhecida. Fale mais perto do microfone ou use o texto.');};
    recognition.onend=()=>{
      if(active!==session)return;
      cleanup(session);onInterim('');
      publish('idle',session.hasText?'Transcrição pronta. Revise o texto antes de enviar.':'Nenhuma fala transcrita. Tente novamente ou digite.');
    };
    publish('starting','Aguardando o microfone… Permita o acesso se o navegador solicitar.');
    session.timer=timers.setTimeout(()=>{if(active===session){cancel();publish('error','O microfone não iniciou. Confira a permissão e tente novamente.');}},15000);
    try{recognition.start();}catch{cleanup(session);onInterim('');publish('error','Não foi possível iniciar o microfone. Confira a permissão e tente novamente.');}
  }
  publish('idle',supported?idle:host.isSecureContext?'Reconhecimento indisponível neste navegador. Use Chrome/Edge ou digite.':'O microfone exige HTTPS ou localhost. Use uma conexão segura ou digite.');
  return {supported,start,stop,cancel,get active(){return Boolean(active);}};
}
