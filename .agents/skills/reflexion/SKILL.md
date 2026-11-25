---
name: reflexion
description: Executar tarefas SDD em ciclos de ação, avaliação, reflexão e memória persistente, sem regressões e sem loops ilimitados.
---
# Reflexion — adaptação local
Inspirado em [Shinn et al., NeurIPS 2023](https://github.com/noahshinn/reflexion). Não é instalação do código experimental nem treinamento de modelo.
## Ciclo
1. Ler issue, PRD, Spec, STATUS e últimas reflexões relevantes; registrar SHA, tarefa, hipótese e teste de aceite.
2. Actor: executar diff mínimo em branch; preservar invariantes e testes existentes.
3. Evaluator: rodar testes focados, verify, Playwright/axe/visual conforme etapa. Usar resultado observado, não autoavaliação como aprovação. Separar falha de infraestrutura e de produto.
4. Reflector: resumir evidência, causa confirmada ou hipótese, tentativa que não funcionou e próxima ação verificável. Não registrar raciocínio privado, segredos nem dados de usuários.
5. Memory: gravar REFLEXION.md e STATUS.md; ler na próxima sessão. Uma entrada por tentativa relevante; evitar repetir estratégia que falhou sem evidência nova.
6. Gate: se passou, abrir PR e aguardar CI/revisão; se falhou, no máximo 3 tentativas de produto, então BLOCKED e voltar à Spec; não reduzir asserts, mascarar falhas ou fazer merge automático.
## Formato
- ID / data / SHA / tarefa / tentativa
- Hipótese e critério de aceite
- Ação / evidência (comando, resultado, link)
- Avaliação: PASS, FAIL, BLOCKED, NOT_RUN
- Reflexão: aprendizado factual, hipótese não confirmada
- Próxima ação e condição para avançar
## Regras
Não instalar dependências de pesquisa Reflexion no app. Não confundir CI histórico com teste atual. Mocks não certificam backend, emulação não certifica hardware. Nunca acessar banco de produção. Separar Research, Spec e Code em sessões quando possível; checkpoint antes de trocar contexto.
