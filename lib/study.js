// Deterministic session planner: useful without an AI provider.
export function studyReply(message){
  const normalized=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const duration=normalized.match(/\b(\d+)\s*(minutos?|min\b|horas?|h\b)/);
  const topic=message.replace(/\b\d+\s*(minutos?|min\b|horas?|h\b)/gi,'').replace(/\b(quero|estudar|estude|aprender|revisar|tenho|dispon[ií]veis|por|durante)\b/gi,'').replace(/\s+/g,' ').replace(/[.,;:!?]+$/,'').trim();
  if(!duration||topic.length<3)return 'Qual tema você quer estudar e quantos minutos tem? Exemplo: “Quero estudar arrays em Java por 30 minutos”. No modo local, informe tema e tempo em cada pedido; não uso o histórico para interpretar respostas curtas.';
  const minutes=Number(duration[1])*(duration[2].startsWith('h')?60:1);
  if(minutes<5||minutes>180)return 'Escolha uma sessão entre 5 e 180 minutos. Exemplo: “Revisar matemática por 25 minutos”. Para períodos maiores, planeje sessões separadas com pausas.';
  const review=Math.max(1,Math.round(minutes*.2));
  const learn=Math.max(1,Math.round(minutes*.3));
  const practice=minutes-learn-review;
  return `Sessão de estudo: ${topic}\nTempo total: ${minutes} minutos\n\n1. Compreender — ${learn} min: consulte seu material sobre o tema e anote uma ideia central e um exemplo.\n2. Praticar — ${practice} min: resolva um exercício ou construa um exemplo sem copiar. Se travar, anote a dúvida antes de consultar a solução.\n3. Revisar — ${review} min: feche o material e explique a ideia com suas palavras. Compare com a referência e registre o que precisa retomar.\n\nVerificação: você consegue explicar o conceito e aplicar em um exemplo novo?\nPlano por regras locais; não avalio suas respostas. Com a IA configurada, posso propor exercícios específicos e comentar sua tentativa.`;
}
