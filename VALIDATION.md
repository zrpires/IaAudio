# Estado atual — versão gratuita

- `npm run check` aprovado; `npm test`: 30 testes aprovados.
- Chat por regras locais, sem chamadas de rede para provedores pagos, inclusive com variáveis antigas presentes.
- Endpoint pago de transcrição desativado (HTTP 410).
- Worker WASM e gravação testados com dependências simuladas: carregamento, progresso, PCM 16 kHz, silêncio, cancelamento e erros.
- Testes de servidor HTTP real para página, módulos e chat.
- A precisão do modelo e uma gravação física no Brave ainda dependem de teste no dispositivo final. Não se afirma suporte universal nem cache offline garantido.

## Histórico das versões anteriores

# Validação — 6 de novembro de 2026

- `npm ci`: passou.
- `npm run check`: passou.
- `npm test`: 6 testes passaram, sem testes ignorados, em Node.js 22.
- Navegador Chromium: fluxo principal passou em 1366×900 e 390×844, sem erro JavaScript ou rolagem horizontal.
- Fontes externas bloqueadas durante a validação de navegador: interface continua utilizável com fontes locais.
- Chat local, exportação e limpeza da conversa verificados no navegador.

## Dependências da instalação final

O deploy na conta Vercel do proprietário ainda não foi executado. Não foram usadas chaves reais OpenAI/Stripe nem realizadas cobranças. A integração OpenAI foi testada com respostas simuladas. O microfone depende da permissão, do navegador e do dispositivo final; o teste em navegador automatizado validou o chat por texto. Siga o README para configurar as variáveis e fazer a validação final no domínio publicado.

A interface de acesso protegido à IA também foi verificada no navegador, com resposta simulada e envio da senha no cabeçalho Authorization.


## Assistente de estudo — 2026-11-07

- `npm run check`: aprovado.
- `npm test`: 8 testes aprovados, incluindo validação de todos os tempos entre 5 e 180 minutos e conversão de horas.
- Demonstração de produção aberta no navegador compartilhado; interface anterior confirmada. A alteração desta branch não foi publicada em produção.
- Playwright disponível, mas Chromium não instalado no executor: teste de interface automatizado não pôde iniciar (Executable doesn't exist). Layout móvel e áudio real não foram validados.
- Integração OpenAI coberta por mocks; sem verificação de chave, cobrança ou respostas reais.


## Revisão operacional — 7 de novembro de 2026

- `npm run check` aprovado; `npm test`: 14 testes aprovados em Node.js 24.22.1 neste executor. CI configurado para Node.js 22.
- Servidor HTTP iniciado em processo separado: página, JS, CSS, health e geração de plano testados; acesso a `.env` recusado com 404.
- Frontend executado em ambiente DOM simulado: texto sem reconhecimento, reprodução, transcrição sem perda de rascunho, erro de permissão, limpeza durante requisição e falha durante novo rascunho.
- Instalação do Chromium tentada; download não forneceu um ZIP válido. Layout móvel e áudio físico não puderam ser confirmados nesta execução.
- IA externa testada com mocks, sem chave real ou cobrança. Configuração e execução final na conta Vercel dependem das variáveis do proprietário.


## Revisão da captura de voz

- `npm run check` inclui o novo módulo `public/voice.js`.
- `npm test`: 20 testes aprovados. Cobertura de controle da captura com reconhecedor simulado, fluxo do chat e servidor HTTP real.
- Tentativa de teste Playwright com `/usr/bin/chromium` bloqueada pelo executor: `socket() failed: Operation not permitted`, antes de abrir o navegador. Nenhum teste de voz física foi realizado.
- Não se afirma transcrição física validada: a API nativa depende de HTTPS, permissão, microfone e serviço externo do navegador. Não foram adicionadas credenciais ou transcrição paga.


## Alternativa ao reconhecimento do Brave

- Adicionados MediaRecorder/getUserMedia e POST /api/transcribe com autenticação e tamanho limitado.
- `npm run check` aprovado; `npm test`: 30 testes aprovados, incluindo captura sem SpeechRecognition, cancelamento, formatos e API de transcrição com provedor simulado.
- Não foram usadas chaves reais; a operação paga ainda exige configurar TRANSCRIPTION_API_KEY (ou OPENAI_API_KEY), APP_PASSWORD e acesso ao modelo.
- Áudio físico no Brave/Firefox/Safari não foi testado. Não se afirma compatibilidade universal ou transcrição real validada.
