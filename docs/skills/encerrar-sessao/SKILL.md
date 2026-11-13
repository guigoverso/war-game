---
name: encerrar-sessao
description: Encerra uma sessão de trabalho neste projeto. Atualiza docs/ESTADO.md com o que foi feito, as pendências e o próximo passo, depois commita e envia para o GitHub, para o usuário continuar em outro PC. Use quando o usuário disser que vai encerrar, parar, trocar de computador ou pedir /encerrar-sessao.
---

# Encerrar sessão

Objetivo: deixar o repositório pronto para continuar em outro computador, sem depender do histórico da conversa.

## Passos

1. **Veja o que mudou nesta sessão:** `git status`, `git diff --stat` e `git log --oneline` desde o último commit de `docs/ESTADO.md`. Use também o que foi conversado (decisões, problemas encontrados, ideias descartadas).
2. **Atualize `docs/ESTADO.md`** (edite as seções existentes, não acrescente no fim):
   - **Resumo:** confirme a branch, a fase e o `SAVE_VERSION`; atualize a data de "Última atualização" e diga se foi sessão local ou na nuvem.
   - **Feito recentemente:** substitua pelo que foi feito *nesta* sessão (o que mudou, em quais arquivos/funções). Se a lista ficou longa, mantenha só as 2 ou 3 sessões mais recentes; o histórico completo fica em `docs/fase-N-testes.md` e no `git log`.
   - **Pendências e problemas conhecidos:** acrescente o que ficou aberto, bugs vistos, ideias discutidas e não feitas; remova o que foi resolvido. Seja específico (arquivo, função, sintoma).
   - **Próximo passo sugerido:** uma ação clara, com o roteiro rápido de teste se houver.
   - Registre o que **não foi testado no jogo** (só verificado por sintaxe ou leitura).
3. **Documente regras novas:** se alguma regra do jogo mudou, confirme que está descrita na seção da fase em `docs/fase-4-testes.md` (regra + como testar). Se não estiver, acrescente.
4. **Cheque as convenções do `CLAUDE.md`:** `git diff --stat` não deve mostrar arquivos inteiros alterados (sinal de que o CRLF foi perdido). Se mexeu no estado salvo, confirme que `SAVE_VERSION` e `migrateSave` foram atualizados.
5. **Commit e push:**
   - Adicione os arquivos alterados pelo nome (evite `git add -A` se houver arquivos não relacionados).
   - Mensagem em português, curta, descrevendo o "o quê" e o "porquê". Inclua `docs/ESTADO.md` no mesmo commit.
   - Envie para a branch atual (`git push -u origin <branch>`). Se o push falhar por rede, tente de novo até 4 vezes; se for erro de permissão (403), avise o usuário em vez de insistir.
6. **Confirme ao usuário** em poucas linhas: o que foi salvo, o hash do commit, se o push funcionou e o comando para continuar no outro PC (`git pull` na branch).

## Regras
- Não crie pull request nem faça push em outra branch sem o usuário pedir.
- Não invente: se algo não foi testado ou não se sabe, escreva isso em `docs/ESTADO.md`.
- Mantenha `docs/ESTADO.md` curto (uma tela ou duas). Ele é um bilhete de passagem, não um diário.
