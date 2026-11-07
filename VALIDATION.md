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
