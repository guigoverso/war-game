# Frente da guerra: tarefas

Origem: feature 36 e item 4b de `docs/fase-6-guerra.md`. Desenho fechado com o usuário em 2026-11-21. Este arquivo separa a 4b em tarefas, na ordem de implementação.
**Resumo:** ao declarar guerra o jogador escolhe no mapa uma **cidade** (ou um **POI**) da facção inimiga. O jogo traça uma **rota por terra** da cidade sua mais próxima até o alvo, monta a **cadeia de POIs** no caminho e, se houver espaço, preenche os vazios com **POIs de guerra** (acampamento e trincheira). A cidade só é liberada para a batalha final quando o POI mais perto de cada lado da cadeia está sob controle.

## Regras decididas (do usuário)
- **Alvo:** qualquer cidade do inimigo principal, ou um POI permanente dele (guerra por POI: o POI-alvo faz o papel da cidade). Cidade de aliado do inimigo só vira alvo se o aliado entrar na guerra e você conquistar a cidade de quem declarou.
- **Escolha:** na Declaração de Guerra (Negociação) abre o mapa, o jogador clica no alvo, o jogo calcula a rota e mostra a **previsão** (linha tracejada, POIs no caminho, POIs de guerra novos); o jogador **confirma ou escolhe outro alvo**.
- **Rota:** da cidade sua mais próxima do alvo. **Desvia** de cidades e POIs de quem está fora da guerra. Vão de água só é aceito se **não ocupar o espaço de um POI** (o vão curto é Ok; o longo é negado e a rota contorna).
- **Cadeia:** POIs permanentes na faixa da rota, em ordem. POI de bandidos entra; POI seu na cadeia já conta como controlado. POI de terceiros fora da guerra não entra.
- **Conquista só de território adjacente** (do POI seguinte da cadeia). A operação **Conquista de Cidade** só é liberada se o POI mais perto da sua cidade e o mais perto da cidade inimiga estão sob seu controle. Se você já tem todos e não há espaço para POI de guerra, a invasão da cidade começa na rodada 1.
- **POIs de guerra:** traça-se um quadrado do tamanho do raio de cada POI existente e de cada POI de guerra na linha; os quadrados livres são preenchidos. **Mais perto da cidade: mais chance de acampamento; mais perto dos POIs do inimigo: mais chance de trincheira.** Nascem **na declaração** e somem quando a guerra acaba.
- **Inimigo ataca também** (operações de defesa para você). **Retomada:** quem perde uma operação de retomada fica **2 rodadas** sem poder tentar de novo (vale para os dois lados). POI recém-conquistado pode ser atacado no turno seguinte.
- **Cidade com mais POIs restantes tem mais soldados.**
- **Ordem da rodada:** (1) início do turno do Líder: resultado do que o Comandante fez; (2) turno do Líder: decisão das operações; (3) fim do turno do Líder: consequência das decisões do Líder e dos NPCs.
- **POIs fora da frente** (de bandidos ou de aliado que entrou depois): os guardas atiram se você chega perto, **sem buffs e sem o aviso de proibido**; dá para **saquear**, mas não conta como conquista. Ficam vazios até o fim do conflito ou são tomados por bandidos (chance baixa); só recebem soldados se uma nova frente passar por eles.
- **Cidades coladas (raro):** na rodada 1 o invasor recebe o card de Conquista de Cidade; se repelido, o defensor recebe o dele (ou o de paz), alternando até alguém vencer.
- **Perder a cidade:** card de rendição; a guerra para. **Ganhar a cidade:** na rodada seguinte, um card para continuar ou não e outro para o destino dos terrenos (detalhes definidos na hora). Se continuar, escolhe outra cidade e a frente é remontada.
- **Guerra por POI** segue o mesmo fluxo, com os mesmos dois cards ao conquistar o POI-alvo.
- **Cenário `?cenario=guerra`:** alvo padrão = a cidade inimiga mais próxima de você.

## Decisões técnicas (minhas, a confirmar)
- **(Revisto na tarefa 3)** A malha do terreno só é feita na geração, então os POIs de guerra usam **clareiras** reservadas na geração do mundo (`genWarSites`: sem árvore, chão intacto, vazias até a guerra; `WAR.front.sites`) e a construção **se adapta ao chão** (`poiAdaptBc`). A frente só escolhe entre as clareiras; onde não há uma perto, o quadrado fica vazio. Antes: **POIs de guerra em tempo de jogo não aplainam nem escavam o terreno** (a malha do terreno só é feita na geração do mundo). Ficam sobre uma base de terra (`p.pad`) em lugar já quase plano (desnível até `WAR.front.slope` = 4, sem água, sem árvore); a trincheira em jogo não é escavada, só tem parapeitos (`c.noDig`). Se o lugar não serve, o quadrado fica vazio.
- **Rota:** busca A* numa grade de 8 blocos, com custo extra na água e bloqueio de cidades e POIs fora da guerra; se o vão de água passar de `WAR.front.waterMax`, refaz sem água; se ainda assim não houver caminho, o alvo é recusado.
- **Estado salvo:** só acrescenta campos em `STATE.war.camps[fid].front` (`kind`, `targetId`, `originId`, `path`, `chain`, `war`). Os POIs de guerra são reconstruídos ao carregar (`warFrontRestore`). Sem somar `SAVE_VERSION` se `camps` já for salvo inteiro (conferir na tarefa 5).
- **Código novo:** `js/warfront.js` (carregado depois de `war.js`); números em `WAR.front` e `warCampChance`/`warCanTarget` (`war-modifiers.js`); textos em `war-texts.js`.

## Regras gerais
- Só **acrescentar** campos; ausentes = padrão. Estilo denso, linhas até ~120 caracteres, textos em português, LF.
- **Avisos na tela** (os únicos desta feature): faixa do mapa na escolha do alvo, faixa da previsão, toast "Frente montada", toast "Frente desmontada" e o toast de alvo inválido / sem rota. Eventos de rodada vão ao relatório (`rdNow`), sem toast.
- Terminar cada tarefa com `node tests/smoke.js` e atualizar `docs/MAPA.md` ao criar função, arquivo ou modificador.

## Ordem

| # | Tarefa | Tam. | Sessão |
|---|---|---|---|
| 1 | **Números e textos** (`WAR.front`, regras de chance e de alvo, textos) | P | Continua desta (já feita) |
| 2 | **Rota e cadeia** (cálculo puro, sem UI) | G | Nova |
| 3 | **POIs de guerra em jogo** (planejar vazios, construir, remover, salvar/restaurar) | G | Continua da 2 |
| 4 | **Ajustes da frente, POIs de guerra novos, dormentes e declaração com mapa** (etapas 4.1 a 4.7 abaixo) | G | Ver a coluna Sessão de cada etapa |
| 5 | **Guerra por POI e cenário** (alvo POI, `?cenario=guerra` com frente, "Conquistar POI" na ordem da cadeia) | M | Continua da 4 |
| 6 | **Teste de fumaça e documentação** | P | Continua da 5 |

## Tarefa 1: números e textos (feita em 2026-11-21)
- `WAR.front` (`cell`, `band`, `avoid`, `waterMax`, `waterCost`, `slope`, `maxWarPois`, `side`), `warCampChance(t, nearEnemy)` e `warCanTarget(fid, kind, ref)` em `js/modifiers/war-modifiers.js`.
- Textos da declaração, previsão, aviso de frente montada e desmontada em `js/texts/war-texts.js`.
- **Por que continua desta sessão:** já está no código, só falta commitar com a 2.

## Tarefa 2: rota e cadeia
- **O que fazer:** em `js/warfront.js`: `warFrontPlan(fid, kind, ref)` devolve `{origin, path, chain, war:[]}` sem tocar no mundo. Origem = cidade sua mais próxima do alvo (`playerCities()`). Bloqueios = cidades e POIs de terceiros fora da guerra (raio + `WAR.front.avoid`). A* em grade (`Heap` de `util.js`), água com custo e, se o vão passar de `waterMax`, uma segunda busca sem água. Cadeia = POIs permanentes (sem ruínas, sem POI de guerra, sem o alvo) a até `band` da rota, ordenados pela posição na rota; dono permitido: você, bandidos, livre ou o inimigo.
- **Como testar:** `?cenario=guerra&auto=1&mute=1`, no console `warFrontPlan(WARSCN.fid,'city',cidadeInimiga)`: conferir `path`, ordem da cadeia e que a rota desvia de cidades neutras. Semente 3 (ilhas): alvo do outro lado da água devolve `null`.
- **Sessão nova:** é uma lógica isolada e grande; começar do zero dá contexto limpo. O brief precisa citar `docs/features/3_frente-da-guerra.md` e `js/warfront.js`.

## Tarefa 3: POIs de guerra em jogo
- **O que fazer:** preencher os vazios da rota (quadrados de raio + `POI_GAP`, até `maxWarPois`); escolher tipo por `warCampChance` e dono pelo vizinho da cadeia (senão pela metade da rota); achar terreno válido perto do ponto (desnível, água, árvore, cidades e `ambClash`). Em `js/pois.js`: `poiDig` e `poiLand` não fazem nada se `c.noDig`; `poiBuild` liga `c.noDig` quando `p.runtime`. `warFrontBuild`, `warFrontClear` (remove malha, colisões, guarnição, moradores e entradas de `STATE.pois`/`seen`), `warFrontRestore` (chamada em `applySave`, depois de `rel`), e `facPeace` chama a limpeza.
- **Como testar:** `warFrontBuild(plan)` no console: POIs aparecem na rota (ver o mapa, aba 📍 Locais), jogador anda sobre a base sem buraco na malha; salvar e carregar (`?load=1`) reconstrói igual; `facPeace(fid)` os remove sem deixar colisão nem soldado.
- **Continua da 2:** usa o plano da 2 e o contexto do desenho dos quadrados; separar custaria reexplicar a rota.

## Tarefa 4: ajustes da frente, POIs de guerra novos, dormentes e declaração com mapa
Decisões fechadas com o usuário (2026-11-21), depois da tarefa 3 pronta e de testes no jogo (semente 3 e 1924221522):
- **Por que mudar:** em jogo a malha do terreno e as árvores não mudam, então clareira/declive barravam quase todos os POIs de guerra; com folga de 4 blocos eles ficaram colados nos POIs e dentro da muralha de cidades (cidade quadrada medida como círculo).
- **6 tipos de POI de guerra** (só visual, sem efeitos): Acampamento fortificado (raio 12), Trincheira (11), Hospital de campanha (10; NPCs deitados nas macas e médicos andando), Depósito de suprimentos (10; com barricadas), Atalaia de madeira (6) e Barricada de estrada (7; **só em estrada**).
- **Encaixe temático (pesos por posição `t` na rota; se for custoso, aleatório):** Trincheira na fronteira (onde o controle muda: entre o último POI seu e o primeiro do inimigo, senão `t` 0,5); Hospital e Depósito entre a fronteira e as cidades; Acampamento em qualquer lugar; Atalaia em qualquer lugar; Barricada só em estrada.
- **POIs dormentes (guardam o lugar):** decoração sem função, gerada ao longo dos corredores (união das rotas entre cidades), em lista própria `WORLD.dormant`. Raio igual compartilha a decoração: **Fogueira** (12 → Acampamento), **Jardim** (11 → Trincheira), **Poço** (10 → Hospital ou Depósito), **Marco de pedras** (7 → Atalaia, ou Barricada se estiver ao lado de estrada). Na declaração os dormentes da rota viram POIs de guerra (troca de malha no mesmo lugar); onde não há dormente, vale a clareira com POI adaptado ao terreno (já feito).
- **Reverter na paz:** `WAR.front.revert` por tipo (reconstrói a decoração). Padrão: reverter Barricada, Hospital, Depósito e Atalaia; Trincheira e Acampamento ficam como rastro da guerra.
- **Dono:** dormente sem dono. Convertido: primeiro terço da rota seu, último terço do inimigo, terço do meio com `WAR.front.banditChance` (40%) de bandidos (com teto de guarnições), senão o lado mais próximo. Na paz o que foi tomado se perde.
- **Anel de cidade (evita o primeiro POI conquistável longe demais):** cada cidade reserva `ringSites` (3) dormentes até `ringRadius` (110) blocos da muralha, em direções diferentes. No plano, o primeiro POI conquistável a partir da origem e o último antes do alvo ficam a no máximo `ringRadius`; se não, o plano inclui um dormente do anel como POI de guerra (senão clareira adaptável; senão avisa).
- **Rota bloqueada:** duas passadas de folga (18 e depois 0); sem caminho, o aviso diz qual POI ou cidade bloqueia e de qual facção, e o alvo é recusado na declaração. Aliado entrar na guerra, negociar o POI e declarar guerra ao dono ficam **fora** (decisão: ignorar).
- **Editar a rota:** "Editar" limpa a rota; o jogador marca paradas salto a salto entre POIs descobertos e "?" (identidade escondida) dentro de um raio que cresce em degraus até achar candidato (com teto, senão só "ligar ao alvo"); candidato precisa de caminho por terra de tamanho razoável (até 1,5× o raio); não repete parada; alvo vira candidato quando entra no raio; desfazer e voltar à automática. Sem limite de comprimento nem de loops (a fadiga é do jogador); só o raio por salto impede ir direto de cidade a cidade. Reaproveita `wfThread`.
- **Minimapa:** a rota aparece no minimapa (`WAR.front.minimap`, padrão true).

| Etapa | O que faz | Tam. | Sessão |
|---|---|---|---|
| 4.1 ✅ | **Correções de espaço (feita):** folga de 22 ou mais, cidade medida como quadrado, folga entre POI de guerra e POI comum; rota em duas passadas de folga | P | Continua desta: o bug e os números estão no contexto |
| 4.2 ✅ | **A + B (feita):** `band` maior e cadeia com mais POIs existentes; a rota prefere clareiras e POIs (desconto de custo na busca) | M | Continua da 4.1: mesmo código (`js/warfront.js`) |
| 4.3 ✅ | **(feita; a frente ainda só escolhe acampamento e trincheira, os outros 4 entram na 4.4) Os 6 tipos de POI de guerra:** raios, construtores novos (Atalaia, Barricada, Hospital com NPCs, Depósito com barricadas), textos e números nos modificadores | G | **Nova:** só mexe em `js/pois.js` e no visual; contexto limpo. Brief cita este arquivo |
| 4.4 ✅ | **(feita; dormentes são poucos em mapas cheios: o espaço é disputado com POIs e clareiras, e o plano cai na clareira ou avisa) Dormentes e anel das cidades:** 4 decorações, corredores, `WORLD.dormant`, conversão e reversão, pesos por posição, dono por terços e `banditChance`, salto máximo no plano | G | **Nova:** a mais arriscada e depende da 4.2 e da 4.3 já commitadas |
| 4.5 | **Rota bloqueada:** mostra o que bloqueia e a facção; recusa o alvo na declaração | M | Continua da 4.4: mesmo plano de rota |
| 4.6 | **Declaração com mapa + edição da rota por raio** (a antiga Tarefa 4, abaixo) | M | **Nova:** é interface, testada na tela com o navegador |
| 4.7 | **Smoke e documentação:** rota, dormentes e reversão no `tests/smoke.js`; `docs/MAPA.md` | P | Continua da 4.6 |

### Declaração com mapa (etapa 4.6)
- **O que fazer:** na tela Guerra da Negociação (`js/negoc.js`) o botão passa a abrir o mapa (`WF.pick`). `bookmap.js`: faixa de escolha em `mapPages`. Clique em cidade (`pickCityAt`) ou POI (`pickPoiAt`) válido (`warCanTarget`) calcula o plano e mostra a previsão com os botões **Confirmar** e **Escolher outro alvo**. `drawBigMap` ganha `warFrontDraw` (linha tracejada da rota e quadrados dos POIs de guerra previstos; depois de declarada a guerra, a frente fica sempre desenhada). Confirmar: `facDeclareWar`, grava `STATE.war.camps[fid].front` e chama `warFrontBuild`.
- **Como testar:** `?cenario=guerra&auto=1&mute=1` com `WAR.scenario.startAtWar=false`: Negociação → Guerra → escolher alvo → ver tracejado e previsão → confirmar; trocar de alvo antes de confirmar; fechar o caderno cancela sem declarar.
- **Sessão nova:** é a parte de interface, independente da lógica já pronta; testa-se na tela com o navegador.

## Tarefa 5: guerra por POI e cenário
- **O que fazer:** alvo POI (o POI-alvo substitui a cidade no fim da cadeia); `warScenario` passa a montar a frente contra a cidade inimiga mais próxima em vez de dividir os POIs pela metade; o botão **Conquistar POI** do painel só aceita o POI adjacente da cadeia; o painel mostra a cadeia e o estado de "Conquista de Cidade liberada" (condição: POI mais perto de cada lado sob seu controle).
- **Como testar:** `?cenario=guerra`: conquistar em ordem libera o card; pular um POI é recusado; guerra por POI com `warFrontPlan(...,'poi',p)`.
- **Continua da 4:** reaproveita a UI e o estado já montados.

## Tarefa 6: teste de fumaça e documentação
- **O que fazer:** `tests/smoke.js`: plano da rota (cadeia ordenada, desvio), construção e remoção dos POIs de guerra, ida e volta de save. Atualizar `docs/fase-6-guerra.md` (feature 36 para ✅ ou 🔶, item 4b, "Ainda em aberto") e `docs/MAPA.md` (arquivo `warfront.js`, `WAR.front`, textos). Rodar `/encerrar-sessao`.
- **Continua da 5:** é fechamento e usa tudo o que está no contexto.

## Fora desta feature (ficam para os itens seguintes)
Operações de ataque e defesa, retomada com espera de 2 rodadas, ataques do inimigo, soldados da cidade pelo número de POIs, locais proibidos, cabo de guerra, batalha final, cards de rendição / continuar / destino dos terrenos e a ordem da rodada em três fases: itens 5, 6, 7, 9, 11 e 19 de `docs/fase-6-guerra.md`.
