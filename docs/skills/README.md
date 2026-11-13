# Skills do projeto

Instruções reutilizáveis para o Claude Code, versionadas junto com o código.

- `encerrar-sessao/`: ao terminar uma sessão (ou antes de trocar de PC), atualiza `docs/ESTADO.md`, commita e envia. Uso: `/encerrar-sessao`.

O Claude Code só carrega skills automaticamente de `.claude/skills/`. Por isso cada skill daqui tem um arquivo "ponteiro" em `.claude/skills/<nome>/SKILL.md` que manda ler a versão de `docs/skills/`. Ao criar uma skill nova, crie os dois.
