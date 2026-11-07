// Deterministic session planner: useful without an AI provider.
export function studyReply(message,history=[]){
  if(Array.isArray(history)&&history.length){
    const previous=history.slice(-8).filter(x=>x?.role==='user'&&typeof x.content==='string').at(-1)?.content.slice(0,2000);
    if(previous){
      const hasTime=/\d+\s*(minutos?|min\b|horas?|h\b)/i;
      if(!hasTime.test(message)&&hasTime.test(previous))message=message+' '+previous.match(hasTime)[0];
      else if(/^\s*\d+\s*(minutos?|min|horas?|h)\s*[.!]?\s*$/i.test(message))message=previous.replace(/\d+\s*(minutos?|min\b|horas?|h\b)/gi,'')+' '+message;
    }
  }
  const normalized=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/[-−]\s*\d|\d+[.,]\d+\s*(min|h)/.test(normalized))return 'Informe um tempo inteiro e positivo em minutos, como 30 minutos.';
  const duration=normalized.match(/\b(\d+)\s*(minutos?|min\b|horas?|h\b)/);
  const topic=message.replace(/\b\d+\s*(minutos?|min\b|horas?|h\b)/gi,'').replace(/\b(quero|estudar|estude|aprender|revisar|tenho|dispon[ií]veis|por|durante)\b/gi,'').replace(/\s+/g,' ').replace(/[.,;:!?]+$/,'').trim();
  if(!duration||topic.length<3)return 'Qual tema você quer estudar e quantos minutos tem? Exemplo: “Quero estudar arrays em Java por 30 minutos”. Você pode responder com o tema ou a duração que falta. Uso a última mensagem para completar esses dados.';
  const minutes=Number(duration[1])*(duration[2].startsWith('h')?60:1);
  if(minutes<5||minutes>180)return 'Escolha uma sessão entre 5 e 180 minutos. Exemplo: “Revisar matemática por 25 minutos”. Para períodos maiores, planeje sessões separadas com pausas.';
  const review=Math.max(1,Math.round(minutes*.2));
  const learn=Math.max(1,Math.round(minutes*.3));
  const practice=minutes-learn-review;
  return `Sessão de estudo: ${topic}\nTempo total: ${minutes} minutos\n\n1. Compreender — ${learn} min: consulte seu material sobre o tema e anote uma ideia central e um exemplo.\n2. Praticar — ${practice} min: resolva um exercício ou construa um exemplo sem copiar. Se travar, anote a dúvida antes de consultar a solução.\n3. Revisar — ${review} min: feche o material e explique a ideia com suas palavras. Compare com a referência e registre o que precisa retomar.\n\nVerificação: você consegue explicar o conceito e aplicar em um exemplo novo?\nPlano por regras locais; não avalio suas respostas. Com a IA configurada, posso propor exercícios específicos e comentar sua tentativa.`;
}
