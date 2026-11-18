# Apresentação do Nexo Workspace

## Descrição curta

Aplicação web gratuita para transformar registros de reuniões em decisões revisadas e ações com responsáveis e prazos. Combina transcrição local com Whisper/WASM, persistência versionada no navegador, backup validado e exportação de atas e planilhas.

## Demonstração em cinco minutos

1. Abra a área Workspace e carregue a demonstração. Mostre o aviso de dados fictícios e os indicadores calculados a partir dos registros ativos.
2. Abra o alinhamento de entrega. Explique projeto, participantes, notas, decisões e ações.
3. Mostre o padrão explícito de `Decisão:`/`Ação:` e a prévia antes de salvar. Repita a extração para mostrar que ela não duplica ações existentes.
4. Edite responsável/prazo e altere um status. Mostre o efeito nos indicadores.
5. Visualize a ata e exporte Markdown ou CSV. Explique a proteção contra fórmulas na exportação.
6. Recarregue a página: os registros salvos continuam. Exporte um backup e mostre que a restauração valida o formato antes de mesclar, sem substituir IDs existentes.
7. Se houver tempo e suporte do dispositivo, abra Assistente de voz, prepare o modelo e dite um trecho para as anotações. Não dependa de um download inicial durante a entrevista: prepare antes.

## Decisões técnicas para explicar

- **Web Worker + WASM:** inferência no dispositivo, sem custo de API; limite de memória/velocidade e necessidade de revisão humana.
- **Separação em módulos:** domínio puro, persistência injetável, exportação e UI com responsabilidades diferentes.
- **Confiabilidade:** validação antes de persistir, erro de quota sem avanço do estado, backup versionado e proteção contra substituição por rascunho de outra aba.
- **Segurança:** uso de texto seguro no DOM, proteção de CSV e ausência de chaves no frontend. Reconhecer que localStorage não oferece autenticação nem criptografia.
- **Qualidade:** testes de falhas reais do domínio, armazenamento e concorrência; CI com Node.js 22 e deploy Vercel.

## O que não alegar no currículo

Não descreva a versão atual como plataforma multiempresa com banco compartilhado, autenticação, auditoria ou IA generativa. Esses recursos estão no plano de evolução, não no produto entregue. Os nomes de responsáveis nos exemplos são fictícios.

Uma descrição fiel seria: “Desenvolvi um workspace de reuniões com transcrição no navegador, extração determinística revisável, persistência local versionada, backup/restauração e gestão de ações; implementei validação, testes automatizados e CI/CD.”
