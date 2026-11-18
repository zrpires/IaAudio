# IaAudio — gratuito, sem API paga

Assistente de sessões de estudo com voz e texto. Exemplo: **“Quero estudar arrays em Java por 30 minutos”**. O planejador divide o tempo em compreensão, prática e revisão usando regras locais. Não é um chatbot generativo e não corrige exercícios automaticamente.

## Rodar no computador

Requer Node.js 22.x e npm:

```bash
git clone https://github.com/zrpires/IaAudio.git
cd IaAudio
npm ci
npm start
```

Abra http://localhost:3000. Nenhuma chave, senha, conta OpenAI ou saldo é necessário. `.env` é opcional e serve apenas para mudar `PORT`. O servidor de desenvolvimento aceita apenas arquivos públicos conhecidos; não expõe `.env`.

## Usar voz gratuita no Brave e outros navegadores

1. Abra a aplicação em HTTPS ou localhost.
2. Mantenha **Voz gratuita no dispositivo** selecionado.
3. Clique em **Preparar voz gratuita**. Na primeira vez, o navegador baixa a biblioteca e os pesos do Whisper Tiny (dezenas de MB). Aguarde até o modelo ficar pronto. A velocidade depende da conexão e do dispositivo.
4. Clique em **Ativar microfone**, permita o acesso e fale por 5 a 15 segundos para o primeiro teste.
5. Clique em **Finalizar gravação**. O áudio é convertido para PCM mono a 16 kHz e transcrito no dispositivo em um Web Worker.
6. Revise a transcrição e clique em **Enviar mensagem** para gerar o roteiro.

Há limite de 60 segundos/2 MB por gravação e timeout de 3 minutos por operação do modelo. **Cancelar captura** interrompe o processamento e descarta o áudio pendente. Downloads concluídos podem ser reaproveitados pelo cache do navegador; cancelamento durante a inferência libera o worker e exige preparar o modelo novamente. O cache não garante funcionamento offline após fechar/reabrir o navegador.

Whisper Tiny é um modelo pequeno: pode errar palavras, números e termos técnicos. Revise antes de enviar. O navegador precisa oferecer microfone, MediaRecorder, Web Audio, Web Workers e WebAssembly. Computadores e celulares com pouca memória podem não conseguir executar o modelo; texto continua disponível. Não se promete compatibilidade com qualquer versão de navegador ou dispositivo.

O modo alternativo **Reconhecimento do navegador** não baixa o modelo, mas depende do serviço do próprio navegador e pode falhar no Brave. Esse serviço pode enviar áudio ao provedor do navegador. A leitura das respostas usa as vozes disponíveis no sistema.

## Privacidade e custos

- No modo local, o áudio não é enviado ao servidor nem à OpenAI. A inferência ocorre no dispositivo.
- A biblioteca e os modelos são baixados de jsDelivr e Hugging Face. Esses serviços recebem as solicitações de download e dados de conexão, mas o código não lhes envia a gravação.
- O chat envia apenas texto ao servidor deste aplicativo, que responde por regras e não chama APIs de IA.
- Não há cobrança de API, assinatura, cartão nem créditos para usar os recursos desta versão. Downloads usam sua conexão e o processamento usa o seu equipamento.
- A conversa permanece na aba; recarregar apaga o histórico. Exporte antes se quiser guardar o texto.

## Atualizar na Vercel

Importe o repositório, com raiz na raiz do projeto, Framework **Other**, Node.js **22.x**, Build Command vazio e Output Directory **public**. `vercel.json` define as rotas e a política de conteúdo necessária para o runtime WASM e os downloads do modelo.

As variáveis antigas `OPENAI_API_KEY`, `OPENAI_MODEL`, `TRANSCRIPTION_API_KEY`, `TRANSCRIPTION_MODEL` e `APP_PASSWORD` não são utilizadas. Você pode removê-las em Settings → Environment Variables e fazer redeploy. **Mesmo que permaneçam configuradas, o código não faz chamadas pagas.** A rota antiga `/api/transcribe` responde HTTP 410 para impedir gastos de clientes antigos; atualize a página com Ctrl+Shift+R.

O plano de hospedagem pertence à sua conta. O aplicativo não depende de funções pagas de IA; confira os termos e limites do plano de hospedagem que você escolher. Para executar no seu computador não é necessário contratar hospedagem.

## Verificação

```bash
npm run check
npm test
```

30 testes cobrem proteção do chat, ausência de chamadas pagas mesmo com variáveis antigas, endpoint pago desativado, worker local simulado, preparação/cancelamento, decodificação PCM, silêncio, formatos de gravação, preservação de rascunhos e servidor HTTP real. Os testes simulados não comprovam a precisão do Whisper nem a captura de um microfone físico.

## Modelo e biblioteca

- [Transformers.js](https://github.com/huggingface/transformers.js), versão fixada em **3.8.1**, executando ONNX Runtime WASM com uma thread, sem exigir WebGPU.
- [Xenova/whisper-tiny](https://huggingface.co/Xenova/whisper-tiny), multilíngue, quantização q8, idioma de transcrição português.
- O worker só é iniciado quando você clica em preparar. Arquivos de terceiros são baixados por HTTPS; bibliotecas e pesos têm suas próprias licenças, disponíveis nos projetos de origem.
