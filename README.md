# Nexo Workspace

**Da conversa à execução.** Workspace gratuito para registrar reuniões, briefings e atendimentos, revisar decisões e acompanhar ações com responsáveis e prazos.

Evolução do IaAudio. Mantém a interface futurista e a transcrição gratuita no dispositivo; acrescenta um fluxo de trabalho concreto para uso individual e pilotos em empresas. Não utiliza APIs pagas de IA.

[Aplicação publicada](https://projetodeaudiodoze.vercel.app/) · [Arquitetura e limites](docs/ARCHITECTURE.md) · [Roteiro para apresentar no portfólio](docs/PORTFOLIO.md)

## O que funciona

| Recurso | Comportamento real |
| --- | --- |
| Registros | Criar, editar, buscar, filtrar por projeto e arquivar/restaurar reuniões, briefings e atendimentos |
| Voz gratuita | Whisper Tiny no navegador; transcrição em trechos de até 60 segundos para as anotações ou o assistente de estudo |
| Decisões | Campo editável e extração de marcadores explícitos com revisão antes de aplicar |
| Ações | Título, responsável, prazo, prioridade, edição e status A fazer / Em andamento / Concluída / Cancelada |
| Indicadores | Registros ativos, ações abertas, atrasadas e concluídas, calculados a partir dos dados salvos |
| Ata | Prévia, cópia e download Markdown com notas, decisões e ações |
| Planilhas | CSV de ações dos registros ativos, com aspas e proteção contra fórmulas comuns de planilha |
| Histórico | Persistência neste navegador, com esquema versionado e validação |
| Backup | JSON completo dos dados salvos; importação validada e mesclagem sem sobrescrever IDs existentes |
| Demonstração | Dois registros fictícios explicitamente identificados, adicionados sem substituir registros próprios |
| Assistente de estudo | Roteiro por regras locais, com alternativa por texto e leitura de respostas |

**Não implementado:** contas, banco de dados compartilhado, permissões por equipe, sincronização entre dispositivos, trilha de auditoria de servidor, transcrição contínua de reuniões ou geração livre de respostas por LLM. A interface apresenta essa limitação; não há login ou colaboração simulada.

## Rodar no computador

Requer Node.js **22.x** e npm:

```bash
git clone https://github.com/zrpires/IaAudio.git nexo-workspace
cd nexo-workspace
npm ci
npm start
```

Abra http://localhost:3000. `.env` é opcional para alterar `PORT`. Nenhuma chave, senha, cartão ou crédito de API é necessário. O nome do repositório e o domínio anteriores foram preservados para manter os links e a implantação existentes.

## Primeiro fluxo de trabalho

1. Em **Workspace**, clique em **Novo registro** e preencha título, data, projeto e participantes.
2. Digite as anotações ou clique em **Ditar com voz gratuita**. Na aba de voz, confira **Destino da transcrição: Anotações do registro**; prepare o modelo e grave um trecho curto. Depois abra o registro para revisar e salvar.
3. Informe decisões e ações manualmente ou use linhas como:

```text
Decisão: iniciar o piloto com uma equipe.
Ação: preparar o roteiro de testes | Responsável: Ana | Prazo: 2026-12-05
```

4. Clique em **Revisar decisões e ações das notas**. A aplicação reconhece apenas esses marcadores, mostra o rascunho e não inventa responsáveis ou converte “amanhã” em uma data.
5. Revise e clique em **Aplicar rascunho e salvar**, ou descarte o rascunho. Repetir a extração não duplica itens com o mesmo título, responsável e prazo.
6. Acompanhe as ações, altere o status e exporte a ata, o CSV ou um backup.

O botão **Carregar demonstração** adiciona dados fictícios para explorar o fluxo. Os indicadores incluem esses exemplos e mostram um aviso quando eles estão presentes. Arquivar é reversível pelo filtro **Arquivados**.

## Persistência e confiabilidade

- Notas e registros são salvos somente após as ações explícitas de salvar. A página avisa sobre rascunhos não salvos antes de sair.
- Limites por registro: 16.000 caracteres de notas, 50 decisões e 100 ações. Limite do workspace: 150 registros e backup de 2 MB.
- Backup inclui registros salvos, arquivados e exemplos. Rascunhos não salvos ficam fora do backup; uma ata do rascunho pode ser exportada separadamente.
- Importações de versão desconhecida, dados inválidos, IDs repetidos e arquivos acima do limite são recusadas sem gravar dados parciais. IDs já existentes são preservados, mesmo se o backup tiver outra versão do registro.
- Falhas de quota/armazenamento não alteram o estado confirmado. Dados locais corrompidos não são substituídos silenciosamente; há opção de baixar o conteúdo para recuperação.
- Escritas usam revisão e Web Locks quando disponíveis. Alterações de outra aba exigem recarregar antes de salvar um rascunho desatualizado. Navegadores sem Web Locks não têm garantia de exclusão entre escritas exatamente simultâneas.

## Privacidade e custos

O modo de voz local baixa Transformers.js e os pesos do Whisper Tiny de jsDelivr/Hugging Face, mas não lhes envia a gravação. A transcrição roda em Web Worker/WASM no equipamento. O primeiro download tem dezenas de MB; velocidade e disponibilidade dependem de conexão, memória e navegador. Comece com 5 a 15 segundos. O cache pode reaproveitar arquivos, mas não há promessa de operação totalmente offline após reiniciar o navegador.

As anotações do workspace e seus backups não são enviados ao servidor. Apenas mensagens enviadas explicitamente ao assistente de estudo vão à API do aplicativo, que responde por regras. O modo alternativo de reconhecimento nativo pode usar o serviço do navegador. Revise transcrições: um modelo pequeno pode errar palavras e números.

Os registros no localStorage não são criptografados pelo aplicativo. Não há autenticação ou isolamento de usuários do mesmo perfil de navegador. Utilize esta versão para uso individual e pilotos em um perfil confiável; avalie a política da empresa antes de inserir dados reais. Limpar os dados do site ou usar navegação privada pode apagar registros. Mantenha backups em um local apropriado.

Não há cobrança de API. Downloads utilizam sua conexão e a transcrição utiliza o seu hardware. Hospedagem segue os termos e limites do plano da sua conta. As antigas variáveis de OpenAI/transcrição não são utilizadas, mesmo que ainda existam na Vercel. `/api/transcribe` continua respondendo HTTP 410 para impedir uso pago por clientes antigos.

## Publicar na Vercel

Importe o repositório com raiz na raiz, Framework **Other**, Node.js **22.x**, Build Command vazio e Output Directory **public**. `vercel.json` inclui os cabeçalhos para os downloads e o runtime WASM. Nenhum banco ou variável secreta é necessário. Após atualizar, use Ctrl+Shift+R para recarregar a interface.

## Testes

```bash
npm run check
npm test
```

45 testes verificam os módulos anteriores de voz/chat e o novo domínio: extração revisável e idempotente, datas, indicadores, backup, CSV seguro, persistência, quota, corrupção e conflitos entre abas. A CI executa instalação, verificação de sintaxe e testes em Node.js 22. Testes com gravador/worker simulados não substituem teste de áudio físico no dispositivo.

## Estrutura

- `public/workspace-model.js`: validação e regras do domínio, sem DOM ou rede.
- `public/workspace-store.js`: persistência versionada com revisão e bloqueio injetável.
- `public/workspace-export.js`: ata e CSV.
- `public/workspace-ui.js`: interação, revisão, filtros, rascunhos e acessibilidade.
- `public/workspace-demo.js`: dados fictícios identificados.
- `public/local-*`, `recorder.js`, `voice.js`: transcrição local e captura, preservadas.
- `api/`, `lib/`: saúde da aplicação e planejador de estudo por regras.
- `tests/`: testes Node.js, sem serviços pagos.
- `docs/`: arquitetura, limites e apresentação do projeto.

Transformers.js **3.8.1** e [Xenova/whisper-tiny](https://huggingface.co/Xenova/whisper-tiny) são dependências de execução baixadas sob demanda. Consulte as licenças nos projetos de origem.
