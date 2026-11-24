# Batalha no tile: rascunho e ordem de implementação (feature 12; ideias do usuário, ainda SEM especificação fechada)

Origem: 2026-11-24. Os POIs de guerra por zona (4E: acampamento, trincheira, barricada) eram só de teste e **não valem como design**: com a batalha num ponto de um mapa aberto o jogador pode dar a volta e atacar o POI principal, e a "resistência ao longo de um caminho" perde o sentido. A especificação completa fica para depois; este arquivo guarda as ideias do usuário e a **ordem de implementação** sugerida. Convenção: **[DECIDIDO]** do usuário; **[PROPOSTA]** da IA; **[ABERTO]** pergunta.

## 1. Ideias do usuário [DECIDIDO como direção; detalhes abertos]
1. **Arredores do POI principal** (cenário): trincheira em volta; barricadas nas estradas que chegam a ele.
2. **Acampamentos inimigos que geram inimigos.**
3. **POI gerador de inimigos:** um POI do inimigo tem um **raio grande**; quando o jogador pisa nele, o POI começa a **lançar inimigos** em direção ao jogador, saindo do POI. Serve para ataque e para defesa.
4. **Contador de inimigos:** em vez de 30 de uma vez, o jogador luta contra N (ex.: 100) **repostos à medida que morrem**. Só vence quem mata todos; impede correr para o objetivo ignorando os soldados.
5. **Ataque:** o jogador tem de conquistar um POI específico; os POIs em volta geram e repõem soldados sem parar. Mesmo conquistado, é preciso derrotar os que tentam retomá-lo, o que significa tomar os outros POIs.
6. **Defesa:** o jogador defende um POI. O NPC usa POIs do mapa para enviar ondas contínuas. O jogador é **teletransportado** para o POI e fica **limitado a um raio**; sair da área = batalha perdida.
7. **Choque:** (menos pensado) o jogador vai até um POI que é a sua **base** (ex.: acampamento); o inimigo tem a dele; a batalha começa e os soldados são repostos até não sobrar nenhum.
8. **Batalhão em três partes:** **Comandante** (o jogador controla), **Elites** (soldados que aparecem ao invadir um POI dominado por bandidos) e **Comuns** (o total de soldados, repostos durante a batalha). Em gameplay Elites e Comuns são **a mesma coisa**; só muda **quando aparecem**. Exemplo: 51 = Comandante + 5 Elites + 45 Comuns.

## 2. Sugestões da IA [PROPOSTA]
- **Separar "vivos ao mesmo tempo" de "total":** tamanho do batalhão = reserva; só N em campo (ex.: 20 a 30) para manter o FPS; o resto entra quando alguém morre. O teste 30×10 do cenário `batalha` mede o limite.
- **Fim da geração:** cada gerador tem reserva própria e **para ao ser conquistado** (ou quando a reserva zera); sem isso a batalha nunca termina. Conquistar o gerador desliga o fluxo dele.
- **Os arredores (item 1) servem de cobertura e ambiente**, não de objetivo: trincheira dá abrigo, barricada fecha a estrada. Dependem de peças lego (feature 11) e da regra "quem é dono do principal" (tile da facção ganha arredores de defesa; tile de bandidos ganha acampamentos).
- **Zonas da 4E reaproveitadas:** a zona de cada abertura vira **ponto de entrada** (de onde chegam os reforços do atacante), o anel vira o **perímetro da defesa** e a praça vira **ponto de captura/encontro** do choque. Os POIs de teste (fortcamp, trench, barricade) saem.
- **Choque:** acrescentar um **ponto de captura no meio** (a praça) para a batalha não ser só "vá à base e espere"; capturá-lo reduz a reposição do inimigo.
- **Defesa:** teletransporte + raio limite combina com `STATE.rd` e a rodada; perder = POI cai; cuidar da saída por morte (respawn) para não ser punição dupla.
- **Elites x Comuns:** como são iguais em gameplay, o dado `origem` ('elite' | 'comum') só decide **quando entram** e o que acontece depois da batalha (morreu = perde do batalhão? volta ferido?). [ABERTO] ver 4.

## 3. O que já existe e dá para reaproveitar
| Peça | Onde | Serve para |
|---|---|---|
| Guarnição de POI (soldados do dono, nível por distância) | `poigame.js` (`poiGarrisonPopulate`/`Sync`, `POIX.garrison`) | base do gerador de inimigos de um POI |
| Ondas de raid com reposição por tempo | `raids.js` (`RAID_WAVES`, `startRaid`) | modelo de ondas e fim da batalha |
| Acampamento de bandidos que reaparece | `poi.js` (`updateCamps`, `buildCampFull`) | acampamento gerador |
| Soldados do jogador e ordem de movimento | `allies.js` (`ARMY`, `orderGo`, `pickTarget`) | batalhão e comandante |
| Cenário de batalha 30×10 e medição de FPS | `tiletest.js` (`?cenario=batalha`) | protótipo e limite de soldados vivos |
| Zonas de guerra e descritor de batalha | `tilecompose.js`, `macro/tile.js` (`tileBattle`) | pontos de entrada/captura |
| Estado de batalhões, ações, turno alternado | **etapa 7** do plano 6 | o batalhão novo muda esta etapa |

## 4. Perguntas em aberto [ABERTO]
1. Quem morre fica morto para sempre (perde do batalhão) ou só na batalha? Comuns e Elites diferem aqui?
2. O jogador pode dar ordens (tecla V) aos soldados, ou eles só o acompanham?
3. Quanto da batalha é decidido por número (NPC contra NPC) e quanto o jogador joga?
4. Condição de vitória de cada modo (Ataque: POI alvo conquistado **e** sem retomada? Defesa: tempo, ondas ou reserva zerada? Choque: reserva zerada ou base destruída?).
5. Quantos geradores por tile e de que tipo (POI existente, acampamento, atalaia)? Isso pede o tipo "gerador" nas receitas lego.

## 5. Ordem de implementação [PROPOSTA]
Entra depois da 4F e em paralelo com o lego; a especificação fechada (itens 4 e 5 abaixo) é pré-requisito da etapa 7.
1. **Protótipo do núcleo, no cenário `?cenario=batalha`** (M; nenhum arquivo do lego): **POI/acampamento gerador** com raio, **contador com reposição** (reserva total x vivos ao mesmo tempo) e **parada ao conquistar**. Mede FPS com 100 soldados e valida se é divertido. Sem mundo novo, sem estado salvo.
2. **Modo Defesa** (M): o mais simples (teletransporte, raio limite, ondas de um ou mais geradores, perda ao sair). Reaproveita 1.
3. **Modo Ataque** (M): POI alvo + geradores em volta + retomada pelos soldados restantes; exige trocar o dono do POI durante a batalha.
4. **Especificação completa "Batalha no tile"** (P, só texto): fecha as perguntas da seção 4, o **batalhão (Comandante/Elites/Comuns)** e a ligação com a etapa 7 (ações, batalhões, turno alternado).
5. **Batalhão novo no estado** (M; macro, `SAVE_VERSION`): 3 partes, reposição e reservas por batalhão. Antes da etapa 7.
6. **Modo Choque** (M): bases dos dois lados, ponto de captura no meio, reposição até zerar.
7. **Arredores de defesa** (M; depende do lego L1/L2): trincheira em volta do principal, barricadas nas estradas, acampamentos geradores por regra de dono. Entra no `tilecompose.js` no lugar dos POIs de guerra de teste.
8. **Integração com tile e macro** (M): lista de geradores e reservas em `WORLD.tileWar` -> estado do tile (4F) e a etapa 10 (guerra).
Nota: o 7 (arredores) pode vir antes do 2 se o visual for prioridade, pois é só cenário; a mecânica (1 a 3) é a que carrega o risco (FPS, diversão).
