# F5a — Eventos entre as facções NPC e mediação

Código: `js/facevents.js` (carregado depois de `rebellion.js`). Desenho fechado com o usuário. Salvo em `STATE.fev` e `STATE.rd.now` (save v16).

## Como funciona
- **Sorteio:** ao fim de cada rodada (gancho `round`, a partir da rodada 1) há **20%** (`FEV.chance`) de acontecer **um** evento, e depois de um evento há `FEV.gap`=2 rodadas sem outro (no máximo 1 a cada 3 rodadas). Entre os eventos possíveis naquela hora o sorteio é por peso (`w`). Na simulação (400 rodadas na semente 11): ~14% das rodadas têm evento e nunca dois seguidos.
- **Independente do jogador:** os eventos acontecem sozinhos entre facções NPC. O jogador só os sente pelas consequências (quem apoia rebeldes, quem comercia, quem é rival de quem) e lê a **notícia**.
- **Sem notificação na tela.** Cada evento vira uma linha narrada em **"Relatório da rodada" → "Rodada atual"** (Resumo do livro; `STATE.rd.now`, via `rdNow`). Os nomes das facções saem com a cor.
- **Regras de relação (grafo da F3):** 0 a 9 entre NPC (10 = aliança formal, que os eventos não criam; sem guerra entre NPC, isso é da Fase 6). O mesmo par só muda de novo depois de **3 rodadas** (`FEV.pairCool`). **Casamento trava o par** (sem quedas) por 4 rodadas (`FEV.lock`).

## Os 10 eventos
| Evento | Quem participa | Efeito |
|---|---|---|
| **Disputa por recurso** | vizinhas; uma em falta de um recurso que a outra tem em abundância | −2 |
| **Ajuda em desastre** | uma em falta de 2+ recursos e a outra abundante em um deles, não rivais | +2 |
| **Incidente de fronteira** | vizinhas, uma agressiva | −1 ou −2 |
| **Acordo comercial** | par com caravana entre as cidades, relação 4 a 8 | +1 |
| **Festival** | vizinhas, relação ≥ 4 | +1 |
| **Casamento** (raro) | relação ≥ 8 | +2 e trava a relação por 4 rodadas |
| **Espião** | rivais/neutras ou com agressiva | 50%: espião **descoberto** (−2) ou **crise interna** na vítima: +1 rodada de descontentamento em cada cidade dela e −0,35 de suprimento por 2 rodadas (`fsupHit`; pode virar rebelião) |
| **Sabotagem de suprimento** | agressiva e vizinha com recurso abundante | −2 e a vítima perde 0,25 de suprimento por 2 rodadas (`fsupHit`) |
| **Expedição contra bandidos** | vizinhas, relação 4 a 8, com acampamento de bandidos a até 170 blocos | +1 e o acampamento some (`despawnCamp`) |
| **Suborno de caravana** | existe caravana X–Y e Z tem cidade livre com foco diferente | A rota X–Y acaba, nasce X–Z; Z×X +2, X×Y −2, Z×Y −2 |

Não entraram (propostos e não aprovados): roubo de caravana e pacto de defesa.

## Mediação (evento do jogador)
- Com 10% por rodada (`FEV.medChance`) e no mínimo `FEV.medGap`=6 rodadas entre pedidos, se há duas NPC rivais (relação 1 a 3, ainda sem guerra), entra na fila. No turno do líder vira um **cartão** (`fevMedCard` em `rollPolicy`; só o raid passa na frente) e precisa ser decidido antes de encerrar o turno.
- **A. Mediar** (◉600): o par sobe +3 e a sua relação com cada uma sobe +1. **B/C. Tomar o partido de uma:** sobe +1 com ela, cai 1 com a outra, a rivalidade delas aumenta (−1). **D. Não me meter.**
- Os rótulos das opções podem ser funções (`polLab`).

## Como testar
- Modo criativo, pausa → aba **🏴 Facções** → "Eventos entre facções NPC": um botão por evento (se faltam condições o jogo as arruma; a expedição precisa de um acampamento por perto), "Sortear agora" e "Mediação no próximo turno do líder". A notícia aparece no Resumo do livro.
- Números em `FEV`. Teste por script: `fevForce('suborno')`, `Hooks.emit('round',N)` repetido para ver a frequência.

## Fora desta etapa
- **F5b:** reuniões das facções e eventos globais.

## Relatório da rodada (Resumo do livro)
Duas partes: **Rodada anterior** (`STATE.rd.report`: o que fechou a rodada: cobrança, produção, resultados, rebelião resolvida) e **Rodada atual** (`STATE.rd.now`: eventos entre facções, caravanas NPC criadas, decisões de política, relações que esfriam, missões, crimes e notas de rebelião). `endRound` move o fechamento para `report` e zera `now`; quem registra algo da rodada atual usa `rdNow(texto)` (`state.js`). `facNote` continua mostrando o aviso na tela e agora registra em `now`.

## Notificações desta fase
- Eventos entre facções NPC: **nenhuma** (só o relatório).
- Mediação: a notificação padrão de política no canto ("Política a decidir") e o aviso padrão ao decidir ("📜 Mediação: A. Mediar o conflito."). Sem avisos extras.
- Modo criativo: só avisos de erro ("Não há acampamento...", "Mediação na fila"); o resultado aparece no relatório e no painel ("último evento").


## Motivo das mudanças de relação (relatório)
Toda mudança da **sua** relação com uma facção vira uma linha em "Rodada atual" com o motivo: `📈/📉 Relação com X: 5 → 8/10 (favorável) — você doou ◉1000.` (`relLog`, `factions.js`; `relChange(fid,delta,motivo)` e `relSet(fid,v,motivo)`; `false` = quem chama já escreveu a linha). Entram doações, relíquia, rota comercial, missões, rebelião (apoio, financiamento, reconhecimento), reunião (voto de cada facção, Festival, Pacto), mediação, o modo criativo e a **propagação** (a relação das aliadas e rivais de quem você mudou: "você melhorou a relação com X, e ela é aliada de X"; antes a propagação só aparecia no modo criativo). Quedas por crime, guerra, paz, reparação e o esfriamento por tempo já tinham linha própria. Sem notificação na tela.
