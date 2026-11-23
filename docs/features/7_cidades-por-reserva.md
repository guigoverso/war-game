# Melhoria: cidades e estradas por reserva (reservar primeiro, esculpir depois)

Branch: `mapa-mundi-update`. Origem: testes da etapa 1B (`6_plano-mapa-mundi.md`) com a semente **970901248**. Parâmetro de URL do protótipo: **`?reserva=1`** (o gerador atual continua o padrão até o protótipo ser aprovado). Saves antigos não importam (o usuário ainda não joga a sério).

> **Como falar com o usuário:** em explicações de design use linguagem simples, sem jargão (ele pediu). Notificações novas na tela só com aprovação dele (regra do `CLAUDE.md`).

## 1. Problema
Hoje o mundo nasce primeiro e a cidade se adapta a ele depois (`js/cityfoot.js`). Nos testes apareceram: paredões na margem de rios, torres do muro engolidas pela rampa do terreno, estradas com trechos de tipos diferentes, pontes com tabuleiro quebrado, portões dando para o mar. A estrada é aberta depois, cortando um terreno que já existe.

## 2. Ideia
Decidir antes **onde ficam** cidades, estradas e pontes, e só então gerar o terreno final em volta dessas reservas, para ele já nascer com a forma certa. A reserva precisa enxergar um terreno **rascunho** (senão volta o quadrado dentro do mar).

## 3. Decisões já tomadas
- **Duas passadas**: terreno rascunho como hoje; cidades, estradas e pontes reservados nele; terreno final gerado com as reservas.
- **Laço de verificação no rascunho** (barato); o terreno final é gerado uma vez, com uma checagem final rápida (e, se preciso, mais uma volta).
- **Estradas entram** (fase 2), com corredor reservado e ponte com altura fixa nas margens e travessia curta.
- **Cidade de um lado só do rio**: o rio fica na borda (talvez com cais). Rio atravessando a cidade fica para depois.
- **Humanos perto da água, mas não obrigatório**: uma probabilidade (modificador) de a cidade preferir margem de rio ou lago.
- **Rios desenhados** (nascem no alto e descem ao mar) é uma fase posterior; no início os rios atuais ficam.
- **Cidades multiníveis** (elevações e depressões, casas em plataformas, ruas com rampa) é fase posterior; o protótipo já guarda a altura de cada ponto da reserva.
- **POIs**: só os grandes e de tamanho fixo entram na reserva; acampamentos, dungeons, torres e missões continuam escolhendo depois.
- **Terra inventada**: a reserva só pode ganhar terra perto da costa (praia suave), nunca em mar aberto; limite em modificador (padrão 15% da área).

## 4. Estado do código quando este documento foi escrito (fim da sessão da 1B)
**Nada da 1B está commitado** (o usuário decide o commit). Arquivos alterados ou novos: `js/cityfoot.js` (novo), `js/city.js`, `js/world.js`, `js/raids.js`, `js/rebellion.js`, `js/modifiers/city-modifiers.js`, `index.html`, `docs/ESTADO.md`, `docs/MAPA.md`, `tests/reserva/*` (novos). Antes de começar, confira `git status`.

### O que o gerador atual faz (ordem em `genWorld`, `js/world.js`)
1. Relevo: `landMask`, ruído, rios, `HF` suavizado, `H`; depois biomas por percentis (`B`). Constantes: `W` = 704 (mapa), `SEA` = 10.
2. Locais de cidade: candidatos planos `cand` (poucas amostras molhadas), `pickSites` (distância mínima `MIND` 220, mínimo de cidades `MINC` 6, afrouxa até 64).
3. Objetos de cidade (`half` de 36 a 45), cidade inicial, ranks, estilos.
4. **Aplainar**: para cada cidade `cityFootPlan(c,seed)` ou `cityFootRelocate(...)` e `cityFootFlatten(c)` (ou o quadrado antigo se não houver chão); depois `cityFootGates(c)`.
5. Estradas: MST + atalhos (`carveRoad`), pontes (`WORLD.bridges`, `WORLD.bt`).
6. `buildCity` de cada cidade (casas, serviços, muro, portões), `genPOIs`, `genDecor`, `meshTerrain`, `makeMapCanvas`.

### O que a 1B construiu (`js/cityfoot.js`, números em `CITY_FOOT` de `js/modifiers/city-modifiers.js`)
- **Pegada** `c.foot` (grade de 0/1 em coordenadas locais, centro = praça): `cityFootPlan` escolhe o melhor chão (move o centro até `nudge`), desloca o contorno em relação à praça (`plazaOff`, `c.poff`, `c.half0` = tamanho sorteado, `c.half` cresce), monta a máscara; `cityFootRelocate` tenta outros candidatos; `cityFootFlatten` aplaina a pegada e faz a rampa (distância à borda por chanfro, `c.fdist`, `c.fM`) com limite de altura pela distância até a água (`shoreSlope`); `cityFootGates` calcula `c.gedge` (borda por eixo) e `c.gland` (portão com terra do lado de fora); `cityGatePos`, `cityNear`, `cityIn`, `cityFootDist`, `cityMarkOut`/`cityUnmarkOut` (`T_OUT`).
- **`buildCity`** (`js/city.js`): casas só na pegada, vão `houseGap`, meta de casas pela área (`density`), serviços espalhados (`spreadLot`, `serviceSpread`), caminho da porta reservado (`useDoor`), rua reta até cada portão aberto, ponta de estrada só em portão com estrada, muro em anel colado na pegada (`cityWallDraw`, torres `cityTowerDraw` com `towerGap`/`towerMax`, abre onde passa estrada ou ponte), `cityWallDrawBox` (muro quadrado antigo) quando não há pegada.
- **`carveRoad`** (`js/world.js`): portão escolhido pelo eixo que mais aponta para a outra cidade e está aberto (`c.gland`); água de até `ROAD_FILL_MAX` (4) blocos vira aterro; pass que fecha furos de 1 bloco no tabuleiro.

### Problemas ainda abertos (vistos pelo usuário na semente 970901248)
- **Pontes**: "continuam tendo o mesmo problema": tabuleiro com buraco (com colisão ok) e um bloco escuro ao lado; trechos de estrada alternando entre terra e pedra. Minhas duas correções (aterro curto e fechamento de furos) **não resolveram** e não houve diagnóstico exato. Hipóteses: altura do tabuleiro suavizada em janela de 11 blocos com limite de 1 por bloco; cabeceira (`BRIDGE_HEAD` 3) nivelando terreno ao lado (`H[k]=hs[j]`); duas estradas cruzando a mesma ponte com alturas diferentes; raio de pintura `BRIDGE_R` 2.5. **Precisa de coordenadas de uma ponte problemática** (pedir ao usuário) para ler `H` e `T` ao redor.
- **Torres comidas**: o anel do muro fica sobre a rampa, que pode subir acima das torres. Resolve com a faixa plana além da pegada (fase 1).
- Estado dos testes: smoke OK; evolução do muro (`cityWallRebuild` níveis 1 a 5) rodada por script sem erro.

## 5. Ferramentas de medição (`tests/reserva/`, Node + Playwright; rodar de dentro de `tests/`)
- `node reserva/foot-check.js <pastaSaida> <semente...>`: por cidade imprime `half`, `half0`, número de casas e quais serviços existem; salva `mapa-<semente>.png` (minimapa).
- `node reserva/plan.js <pastaSaida> <semente> <idCidade...>`: planta da cidade (terra, ruas, casas, muro, torres, ponte) em `plan-<semente>-<id>.png`; imprime `gedge`, deslocamento da praça etc.
- `node reserva/cliff.js <semente...>`: conta paredões (vizinhos com desnível 3 ou mais) ao redor das cidades, número de pontes e desníveis nas pontas das pontes.
- `node reserva/shot.js <pastaSaida> <semente> <idCidade|-1> <dx> <dz> [alvoDx alvoDz]`: captura de tela do jogo (tira o jogador do escritório, teleporta para (dx,dz) relativo à cidade, ou coordenadas absolutas com id -1, olhando para o alvo).
- `node reserva/err.js`: mostra o erro de carga quando o jogo trava ao abrir (semente 11).
- Teste de fumaça: `node tests/smoke.js` (deve imprimir "Tudo OK").
- **Métricas novas a criar na fase 1**: torres enterradas (altura máxima do terreno em volta da torre acima da base) e área de terra inventada por cidade.

## 6. Parâmetros novos (arquivo `js/modifiers/reserve-modifiers.js`, a criar na fase 1)
Cada um com comentário de para que serve e valor padrão (regra do `CLAUDE.md`):
- `reserveOn()`: verdadeiro com `?reserva=1`.
- `RESERVE.maxInvented` = 0.15 (fração da área reservada que podia ser água no rascunho).
- `RESERVE.maxRounds` = 5 (voltas do laço de verificação).
- `RESERVE.minHalf` = 28 (tamanho mínimo ao encolher a cidade; hoje 36 a 45).
- `RESERVE.apron` = 4 (faixa plana além da pegada, para o muro).
- `RESERVE.waterBias` = 0.7 (fase 4), `RESERVE.waterNear` (distância ideal da margem, fase 4).
- Os números de pegada continuam em `CITY_FOOT`.

## 7. Processo geral (ordem de geração com `?reserva=1`)
1. Terreno rascunho, com rios (como hoje).
2. Escolher locais de cidade e reservar cada uma (pegada orgânica, praça deslocada, folga e faixa plana).
3. Verificar no rascunho e corrigir só as que falham: mover um pouco, encolher até `minHalf`, trocar de ponto candidato, remover. Repetir até estabilizar (`maxRounds`).
4. (Fase 2) Traçar as estradas e escolher as pontes; reservar o corredor; verificar ligação das cidades.
5. (Fase 3) Reservar os POIs grandes.
6. Gerar o terreno final com todas as reservas.
7. Checagem final rápida; se preciso, mais uma volta.
8. Construir cidades, muros e portões como hoje (`buildCity`).

---

# Fases (cada uma com a sessão recomendada)

Convenção: cada fase termina com `node tests/smoke.js` OK, teste na tela pelo usuário, `docs/MAPA.md` e `docs/ESTADO.md` atualizados e commit (`/encerrar-sessao`). Prompt de abertura sugerido para qualquer fase: "Leia docs/ESTADO.md, docs/MAPA.md e docs/features/7_cidades-por-reserva.md e comece a fase N".

## Fase 1: cidades por reserva (tamanho G) — **NOVA SESSÃO**
Motivo: sessão limpa; é a maior mudança de `genWorld`.

**Objetivo.** Com `?reserva=1`, o terreno final é gerado em volta das pegadas das cidades, com faixa plana para o muro; sem paredão na margem, sem torre engolida, portões só com terra do lado de fora.

**Passos.**
1. **Infra**: criar `js/modifiers/reserve-modifiers.js` (carrega com os outros modificadores, antes dos demais scripts; linha `<script>` em `index.html`) e `js/reserve.js` (depois de `cityfoot.js`). Documentar no `docs/MAPA.md`.
2. **Separar o relevo**: extrair de `genWorld` o trecho "1) Relevo, rios e biomas" (cálculo de `HF`, suavização, `H`, percentis, `B`, desertos e neves) para uma função `genRelief(seed, dominant, stamps)` que devolve/atribui `H` e `B`. Sem `stamps` o resultado deve ser **idêntico** ao de hoje (conferir comparando `H` antes e depois da extração: mesma semente, mesmo mapa).
3. **Passada 1 (rascunho)**: chamar `genRelief(...)` sem reservas; guardar cópia `rough = {H: H.slice(), B: B.slice()}`.
4. **Reserva e laço**: escolher locais (`cand`/`pickSites`, como hoje, sobre o rascunho); para cada cidade chamar `cityFootPlan` (já nudge, deslocamento da praça e máscara) e acrescentar: (a) a **faixa plana** `RESERVE.apron` (dilatar a pegada) onde o muro vai ficar; (b) a **terra inventada** = fração da pegada+faixa que era água no rascunho; acima de `maxInvented` a cidade é corrigida na ordem mover, encolher até `minHalf`, trocar de candidato (`cityFootRelocate`), remover; repetir até ninguém falhar ou `maxRounds`. Manter o mínimo de cidades (`MINC`) afrouxando a distância como `pickSites` já faz.
5. **Reservas viram `stamps`**: lista `{foot, apron, y, x, z, half}` por cidade.
6. **Passada 2 (final)**: `genRelief(seed, dominant, stamps)`; as reservas entram **depois da suavização e antes dos biomas**: pegada e faixa = `c.y`; rampa até o terreno (reaproveitar a lógica de `cityFootFlatten`, incluindo o limite pela distância até a água `shoreSlope`); onde a pegada era água no rascunho, subir o terreno com margem suave (no máximo 1 bloco de altura a cada 2 de distância). Nunca levantar água fora da pegada+faixa+margem.
7. No modo reserva, **não** chamar `cityFootFlatten` depois (o relevo final já está pronto); chamar só o que calcula `c.fdist`, `c.fM`, `c.gedge`, `c.gland` (`cityFootGates`). Resto igual: estradas (`carveRoad`) e `buildCity`.
8. **Checagem final**: recalcular a terra inventada no terreno final; se estourar, corrigir e refazer a passada 2 (uma volta extra, no máximo).
9. Medir **tempo de geração** com e sem `?reserva=1` e registrar no `ESTADO.md`.

**Parâmetros**: `RESERVE.*` (ver seção 6).

**Como testar.** Sementes 3, 5, 7, 9, 11 e 970901248, com e sem `?reserva=1`: `foot-check.js`, `plan.js`, `cliff.js`, `shot.js`; adicionar métrica de torre enterrada. Smoke OK. O gerador atual (sem o parâmetro) deve continuar igual.

**Pronto quando.** Nenhuma cidade quadrada nem no mar; paredões (`cliff.js`) não piores que o gerador atual e menos em cidades à beira d'água; zero torres enterradas; portões fechados quando dão para o mar; carregamento sem erros; o usuário aprova na tela.

**Cuidados.** `genWorld` é assíncrono com `status()`/`await tick()` para a barra de carga: manter. Cenários (`?cenario=pois`, `batalha`, `guerra`) não usam o protótipo. `WORLD.snap` e `makeMapCanvas` dependem do `H` final.

## Fase 2: estradas e pontes por reserva (tamanho G) — **IMPLEMENTADA (sem teste na tela; ver ESTADO.md)**
Motivo: depende do diagnóstico das pontes e de dados do usuário; é um bloco independente da fase 1.

**Antes de implementar**: pedir ao usuário as **coordenadas de uma ponte problemática** (semente 970901248) e ler `H`/`T` ao redor com um script (usar `cliff.js` como base): conferir se o buraco é tabuleiro faltando, cruzamento de duas estradas, ou cabeceira nivelando terra; conferir de onde vem o trecho "pedra" alternando com terra (`T_BRIDGE` de cabeceira? `T_STREET`?).

**Objetivo.** Estrada e ponte combinadas antes do terreno final: sem trechos alternando tipo, sem toco, tabuleiro na altura das margens e sem buraco.

**Passos.**
1. Depois do laço de cidades (fase 1, passo 4), calcular as ligações (MST + atalhos, como `carveRoad`) e, para cada uma, traçar a rota sobre o **rascunho** (reaproveitar `route` de `carveRoad`, mas **sem pintar** nada), guardando a polilinha.
2. **Ponte**: onde a rota cruza água de mais de `ROAD_FILL_MAX` blocos, escolher a travessia mais curta perto da rota; a altura do tabuleiro = altura das duas margens (se diferirem, rampa na terra, não no tabuleiro); tabuleiro reto, largura fixa; registrar em `WORLD.bridges` com o mesmo formato de hoje (`tiles`, `len`, `wi`, `we`, `road`, `toll`) e `WORLD.bt` (`h0` de cada tile).
3. **Corredor** reservado: faixa de 3 blocos de largura com altura suavizada ao longo da polilinha (limite de 1 por bloco) ancorada nos portões e nas pontas das pontes. Vira `stamp` da passada 2.
4. Verificar **ligação**: o grafo das cidades precisa ficar conexo; se uma cidade fica sem estrada, movê-la ou removê-la e voltar ao laço.
5. Passada 2: aplicar corredor e pontes; marcar `T_ROAD`/`T_BRIDGE`; cabeceira de `BRIDGE_HEAD` blocos já no mesmo nível do tabuleiro.
6. Remover do modo reserva o `carveRoad` antigo (continua no gerador atual).

**Como testar.** `cliff.js` (degraus no tabuleiro e pontas), `shot.js` mirando cada ponte (usar coordenadas absolutas com id -1), `plan.js`. **Pronto quando**: nenhuma ponte tem degrau, buraco ou ponta no ar nas 6 sementes; estradas sem trechos alternando; cada cidade tem estrada até um portão aberto; caravanas continuam andando (`caravans.js` usa `T_ROAD`; ponte não é tomada por caravana, por enquanto).

## Fase 3: POIs grandes reservados (tamanho M) — **IMPLEMENTADA (sem teste na tela; ver ESTADO.md)**
Motivo: código de POIs é outro bloco (`poi.js`, `pois.js`, `warfront.js`) e merece contexto limpo.

**Objetivo.** POIs de tamanho fixo e grande (ver `POI_DEFS` em `js/pois.js`) entram na reserva e o terreno final se molda a eles; acampamentos, dungeons, torres e missões seguem escolhendo depois.

**Passos.** (1) Listar `POI_DEFS` e classificar por tamanho; definir quais entram (modificador). (2) Depois das estradas, escolher locais (`findSpot`/`spotOK` em `poi.js`) no rascunho, longe das cidades e dos corredores. (3) Virar `stamp` (plataforma + rampa) na passada 2, no lugar de `poiAdaptBc`. (4) `poiAdaptBc` continua para os POIs que não entram. (5) Conferir o que depende da posição dos POIs: `wfReserved()` (`warfront.js`), anéis em volta das cidades (`G.ringMin`), missões e dungeons.

**Como testar.** Smoke (inclui POIs, serviços e Negociação), `?cenario=pois` (não usa reserva), contagem de POIs por semente. **Pronto quando**: mesmos tipos e quantidades de POIs de antes (±), nenhum POI no mar ou em encosta, smoke OK.

## Fase 4: preferência por água (tamanho P) — **IMPLEMENTADA (sem teste na tela; ver ESTADO.md)**
Motivo: é só um bônus na pontuação de local; pequeno.

**Objetivo.** Parte das cidades prefere margem de rio ou lago, mas não é obrigatório.

**Passos.** (1) Calcular no rascunho a distância até a água para cada candidato (chanfro como em `cityFootFlatten`). (2) Para cada cidade, sorteio com semente: com probabilidade `RESERVE.waterBias` ela prefere ficar a `waterNear` blocos de uma margem (bônus na pontuação de `pickSites`, ou limite de distância); senão, indiferente. (3) Margem da cidade: pegada afastada `beach` da água, sem rio atravessando; opcional: cais simples (fase posterior). **Pronto quando**: cerca de `waterBias` das cidades têm água a menos de `waterNear` blocos, sem aumentar paredões; ajustável por modificador.

## Fase 5: rios desenhados (tamanho G) — **IMPLEMENTADA (sem teste na tela; ver ESTADO.md)**
Motivo: troca a geração de rios; afeta relevo, biomas e pontes.

**Objetivo.** Rios como caminho que nasce no alto e desce até o mar (e lagos em depressões), em vez de curva de nível do ruído `nr` (`rv` em `genWorld`).

**Passos.** (1) Relevo base **sem rio** (rascunho sem o termo `rv`). (2) Fontes em terra alta, descida pelo caminho de maior declive até o mar ou depressão (lago); largura cresce com o acúmulo. (3) Escavar o leito no relevo antes da suavização. (4) Cidades (fase 4) e estradas (fase 2) escolhem depois, sobre o novo rascunho. (5) Pontes: cruzamentos escolhidos pela fase 2. **Pronto quando**: rios chegam ao mar, não terminam em beco sem saída, não atravessam cidades, e as 6 sementes passam nas métricas das fases 1 e 2. Risco: muda a cara dos mapas e dos biomas: revisar com o usuário.

## Fase 6: cidades multiníveis (tamanho G) — **IMPLEMENTADA (sem teste na tela; ver ESTADO.md)**
Motivo: mexe em construção, navegação e física; precisa de teste longo.

**Objetivo.** Cidades com elevações e depressões suaves (centro mais alto, bairro baixo à beira d'água), casas em plataformas e ruas com rampa.

**Passos.** (1) A reserva guarda um mapa de altura `c.hmap` (grade, ±2 a 3 blocos: ruído suave, praça levemente elevada, margem baixa). (2) `buildCity`: hoje tudo usa `Bc(c,...)` com base `c.y`; introduzir altura local por lote (plataforma plana por casa, degraus entre lotes) e ruas com inclinação máxima de 1 bloco a cada N blocos. (3) Muro: base enterrada acompanha a altura local. (4) `nav.js` (caminhos), `phys.js` (degrau máximo) e `c.walk` (pontos de passeio) precisam das alturas. (5) Moradores, soldados e raids andando nas rampas. **Pronto quando**: ninguém fica preso, caminhos funcionam, casas não flutuam nem afundam, muro e torres assentados, smoke e cenários OK.

---

## Ordem e dependências
Fase 1 → Fase 2 → Fase 3 (independente da 2 depois da 1, mas melhor depois dela) → Fase 4 (pode ir junto da 1) → Fase 5 (depende de 1, 2 e 4) → Fase 6 (depende de 1).
**Antes da fase 1**: commitar o estado atual da 1B.

## Riscos e pontos abertos
- Duas passadas do relevo aumentam o tempo de geração: medir e registrar.
- A suavização 3x3 do relevo e o limite de rocha (`rockH`): reservas entram depois da suavização e antes dos biomas.
- Cenários (`?cenario=pois`, `batalha`, `guerra`) não se aplicam ao protótipo.
- **Portões abertos sem estrada** (pedido do usuário, semente 3, cidade 0 em (497,501), saída sul): hoje `buildCity` faz a rua até todo portão aberto (`c.gland`), mas só os portões que a MST usa recebem estrada; os outros terminam em grama. Ideia: ligar cada um deles à estrada mais próxima (sem ponte, com comprimento máximo) ou fechar o portão. **Implementado no modo reserva** (`reservePlanRoads`, `RESERVE.gateLinkMax` = 40): ligação à estrada planejada mais próxima, sem ponte; sem estrada por perto o portão segue sem estrada. Falta validar na tela e o gerador antigo não tem isso.
- Rio atravessando a cidade, cais, e portões em posições livres (fora dos 4 eixos) ficam como melhorias futuras.
- O mapa mundi (etapas 3 a 5 do `6_plano-mapa-mundi.md`) vai trocar este gerador; levar para lá a regra "reservar primeiro, esculpir depois".
