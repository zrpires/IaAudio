# IaAudio

Aplicativo web independente pronto para importação na Vercel. Interface em português, arquivos estáticos em `public/` e funções Node.js em `api/`. Não usa Python, SQLite ou disco persistente no servidor.

## Publicar na Vercel

1. Abra [New Project](https://vercel.com/new) e importe `zrpires/IaAudio`.
2. **Root Directory:** raiz do repositório. **Framework Preset:** Other. **Node.js:** 22.x.
3. Mantenha **Build Command desativado/vazio**. **Output Directory:** `public` (já definido em `vercel.json`). Instalação: `npm ci` (ou padrão da Vercel).
4. Clique em Deploy. O aplicativo já abre e suas funções locais ficam utilizáveis, sem chave de IA.
5. Para IA generativa, configure as variáveis abaixo em Settings → Environment Variables e faça **Redeploy**. Configure separadamente em Production e Preview se usar ambos.

Não há etapa de build ou servidor que precise permanecer rodando. As rotas `/api/*` usam Vercel Functions. Não faça upload apenas da pasta `public`: importe o repositório inteiro para incluir as funções.

## Funcionalidades

- Conversa por texto com histórico de até oito mensagens enviado à IA.
- Reconhecimento de fala em pt-BR, com revisão antes de enviar.
- Leitura das respostas, parada de áudio e exportação da conversa.
- Alternativa por texto caso o navegador não suporte o microfone.

## IA generativa opcional

| Variável | Uso |
| --- | --- |
| `OPENAI_API_KEY` | Sua chave OpenAI com saldo/acesso à API |
| `OPENAI_MODEL` | Modelo disponível na sua conta; padrão `gpt-4.1-mini` |
| `APP_PASSWORD` | Senha forte para liberar chamadas pagas de IA |

**Sem chave:** a interface mostra “Assistente local · sem IA generativa” e responde por regras locais. Não finge ser um modelo. **Com chave:** `APP_PASSWORD` é obrigatório para evitar expor uma API paga sem controle de acesso. Digite essa senha na seção “Acesso à IA” do aplicativo; ela fica em `sessionStorage` nesta aba. Não a publique no código, não use prefixo `NEXT_PUBLIC_` e não compartilhe uma senha pessoal reutilizada. Se alguém já souber a senha, poderá usar sua API; troque a variável e faça Redeploy para revogar o acesso. Para uso público em escala, implemente contas e limites de consumo por usuário. A senha protege o uso pago da IA; não é um sistema de usuários ou proteção dos arquivos públicos.

A chave OpenAI nunca vai para o navegador. As chamadas podem gerar custos. Configure limites de gasto na conta OpenAI. O provedor aplica suas próprias políticas de dados. Erros de saldo, chave, conexão e modelo aparecem na tela sem revelar segredos.

## Microfone e voz

Use Chrome/Edge atualizado em HTTPS (a Vercel fornece HTTPS) ou localhost, e permita acesso ao microfone. A Web Speech API varia entre navegadores; quando não disponível, o chat por texto continua funcionando. O reconhecimento pode enviar áudio ao serviço do navegador; este aplicativo não grava áudio no servidor. A transcrição aparece para revisão, e só é enviada ao clicar em Enviar. A leitura depende das vozes instaladas no dispositivo.

O chat guarda as mensagens somente na aba. Recarregar a página ou fechar a aba apaga a conversa; exporte antes. Ao usar IA, sua mensagem e até oito mensagens de histórico são enviadas à OpenAI. Não há telefonia, WhatsApp ou chamadas em segundo plano.

## Executar no computador

Requer **Node.js 22.x** e npm. Sem dependências externas em runtime.

```bash
git clone https://github.com/zrpires/IaAudio.git
cd IaAudio
npm ci
cp .env.example .env
npm run dev
```

Abra http://localhost:3000. No Windows, copie `.env.example` para `.env` pelo Explorer ou `Copy-Item .env.example .env` no PowerShell. Edite `.env` para configurar serviços opcionais. Nunca faça commit dele. Para rodar mais de um projeto, use `PORT` diferente em cada `.env`.

## Verificação

```bash
npm run check
npm test
```

Testes de rotas HTTP, validação, modo local, autenticação, falhas de provedores e integração simulada com OpenAI. O GitHub Actions executa os testes a cada push/pull request. Testes simulados não substituem uma compra de teste na sua conta nem o teste do microfone no seu dispositivo.

## Estrutura

- `public/`: interface e estado do navegador.
- `api/`: funções serverless.
- `lib/`: regras, segurança e integração com serviços.
- `dev.mjs`: servidor apenas para desenvolvimento local.
- `vercel.json`: configuração de deploy e cabeçalhos de segurança.
- `.env.example`: variáveis disponíveis, sem credenciais.

As respostas de API usam `no-store`. Requisições de outra origem são recusadas, entradas e tamanhos são validados e as saídas da interface usam texto seguro. O deploy final, chaves reais, compatibilidade de voz e operação comercial precisam ser validados no seu domínio e nas suas contas.
