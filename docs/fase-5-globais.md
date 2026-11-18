# F5c — Eventos globais com intervenção do jogador

Código: `js/globalev.js` (+ ganchos em `facsupply.js`, `allies.js`, `dungeon.js`, `poi.js`). Estado: `STATE.gev` (save v18). Desenho fechado com o usuário.

## Como funciona
- Cartão de política (`g_<id>`, `noRoll`) no começo do turno do líder (`rollPolicy` → `gevCard`): **15%** por rodada (`GEV.chance`), no mínimo **4 rodadas** entre dois (`GEV.gap`), nunca na rodada da reunião; o raid passa na frente. Sorteio pela semente e pela rodada (recarregar não rerrola). Não gasta ação. Na simulação de 400 rodadas: ~9% das rodadas.
- **Relação:** uma decisão muda ±1; as respostas marcadas (−2) usam `fixed` (`gRel`). Custos em ouro: ◉300 + ◉100 × nível da facção (`gcost`).
- **Desastres (chuva, mina, peste, incêndio):** choque de **−0,35** na pontuação de suprimento do recurso afetado por **5 rodadas** (`fsupHit(fid,d,rodadas,recurso,origem)`). Ajudar cancela (nem chega a acontecer); vender pelo dobro ou ignorar deixa correr. A facção fica "em falta", paga ×1,3 pelo que você vende, tem metade do estoque nas lojas e as cidades que precisam do recurso ficam descontentes (rebelião só depois de 3 rodadas seguidas, 4 se pacífica).
- **Os modificadores de suprimento SOMAM** (`STATE.rd.fmods`, cada um com recurso, valor, rodadas e origem): caravana trazendo o recurso (+0,25 na base), reunião (`meetNpc`), sabotagem, crise e os choques daqui. O modo criativo lista os ativos (pausa → Facções).

## Os 10 eventos (respostas)
| Evento | A | B | C / D |
|---|---|---|---|
| **Grande chuva** (1–2 facções, comida) | Oferecer alimento (gasta 15 de comida por facção, +1) | Vender comida pelo dobro (gasta 20, ◉240, **−2**, choque) | Ignorar (−1, choque) |
| **Colheita farta** | Comprar o excedente (◉90 por 30 de comida, +1) | Propor uma caravana de comida (rota grátis, +1) | Ignorar |
| **Desabamento na mina** (minério) | Mandar ajuda (ouro, +1) | Vender minério pelo dobro (gasta 20, ◉240, **−2**, choque) | Ignorar (−1, choque) |
| **Peste no gado** (couro) | **Enviar ajuda médica** (+1; nesta rodada cura e curativos +15% mais caros) | Fechar a fronteira (acaba as caravanas, −1, choque) | Ignorar (−1, choque) |
| **Sequestro** | Resgatar (portal de resgate; ver abaixo) | Pagar o resgate (◉2× custo, +1) | Ignorar (−1) |
| **Visita diplomática** | Recepção com festa (ouro, +1) | Acordo comercial (caravana grátis, +1) | Recusar (−1) |
| **Incêndio numa cidade** (madeira) | Enviar ajuda (ouro, +1) | Ignorar (choque) | Aproveitar a crise (−1, cidade descontente, choque) |
| **Embargo comercial** (2 facções) | Mediar (ouro, ambas +1) | Apoiar quem embargou (+1/−1; embargo 5 rodadas) | C: apoiar o embargado (+1/−1, embargo cai) • D: **ignorar** (embargo corre) |
| **Mercenários sem contrato** | Contratar (◉400, **+3 soldados**) | Recusar | C: contratar para sabotar: escolhe uma cidade de outra facção (◉300): relação **−2**, a cidade perde humor, a facção perde suprimento |
| **Golpe de oficiais** | Apoiar o governo (ouro, +1, zera o descontentamento dela) | Apoiar os conspiradores (−1; adianta uma rebelião da F5) | Ficar de fora |

O embargo corta as caravanas entre as duas facções (e novas rotas) por 5 rodadas (`gevEmbargoed`, em `fgTrade`).

## Sequestro (resgate)
- "Resgatar" converte um portal comum num **portal de resgate** (azul, marcador no mapa e no minimapa) e fica aberto **só na rodada em que você decide** (vá no turno do comandante).
- Dentro da dungeon: bandidos, um **baú comum de acampamento** (trancado até limpar) e o **refém numa jaula** que só abre depois de limpar o lugar (`gevRescueEnter`, `gevCageOpen`). O refém é um NPC **nas cores da facção** que pediu ajuda (não é mais a Hatsune Miku; nos acampamentos comuns usa as cores da sua facção).
- Resgatar: +1 de relação e ◉150 + ◉100 × nível. Prazo vencido: o refém morre e a relação cai −1.

## Reserva de soldados (quartel)
- Se o exército já está no limite (5/5) e você **ganha** soldados (reféns, mercenários, refugiados...), o excesso vai para a **reserva** (`ARMY.reserve`, máx. 5): o contador mostra 8/5. **Não dá para comprar** reserva (recrutar só até o total chegar ao limite).
- Quando um soldado cai, a reserva manda um substituto a cada 2 s (`armyReinforce`): em batalha ele chega atrás de você; fora dela, sai do quartel. Gastar a reserva leva 8/5 a 5/5 e o contingente volta completo.
- **Reféns de acampamento** agora viram soldado (ou reserva) e **não dão mais ouro quando o exército está cheio**; só 25% dos acampamentos têm refém (antes 50%).

## Notificações
- Aviso do canto "Política a decidir: [evento]" e o aviso padrão ao decidir ("📜 [evento]: A. ...").
- Marcador do portal de resgate no mapa e minimapa.
- Dentro do resgate: "Resgate: elimine os inimigos, abra o baú e a jaula do refém", jaula trancada (dica), "Refém libertado! +◉...". Reféns de acampamento: o aviso que já existia ("O refém agora é um dos seus soldados..." ou "foi para a reserva").
- Todo o resto (o que aconteceu, o que você decidiu, relação com motivo, prazo vencido) vai para "Rodada atual" no relatório.

## Como testar
Modo criativo: pausa → Facções → "Eventos globais (F5c)": um botão por evento (aparece no turno do líder, abra o livro). Por script: `polSummon('g_chuva')`, `gevRescueStart(fid)`, `armyGain(3)`.

## Ajustes após o teste
- **Caravanas desfeitas** durante o turno do líder (peste, embargo, rebelião, relação que cai) somem na hora; antes as carroças ficavam na estrada até o fim do turno do comandante (`purgeDoomedCaravans`).
- **Aba ✨ Efeitos** agora inclui as caravanas (suas e das NPC), a relação com cada facção (preço dos serviços), o suprimento delas (em falta/abundante: preço que pagam e estoque), os choques ativos com origem e prazo, e os embargos.

