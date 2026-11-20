# Tarefas: revisão dos POIs e do mapa

**Status:** tarefas 9 (geração por anel/estrada/interior), 1 (mapa), 2 (limpeza dos tipos, `poiLvl`) , 3 (caçadores, produção e pedágio por nível), 4 (taverna, ferreiro, mercenário) 7 (entreposto) e 8 (colete no Quartel) feitas; as outras pendentes. As regras de cada tarefa estão em `4_decisoes.md`, que vale sobre `1_pois-revisao.md` e `2_mapa-e-distribuicao.md`.

**Como ler a coluna "Sessão":**
- **Nova** = conversa nova (contexto limpo): a tarefa mexe em outra área do código ou a conversa já está longa.
- **Continua** = na mesma conversa da tarefa anterior: usa os mesmos arquivos e o que já foi lido.

## Ordem de prioridade

| # | Tarefa | Tam. | Sessão |
|---|---|---|---|
| 1 | **Mapa menor** | P | Nova |
| 2 | **Limpeza dos tipos e nível dos POIs** | M | Nova |
| 3 | **Acampamento de caçadores** | M | Continua da 2 |
| 4 | **Taverna, ferreiro e mercenário** | G | Continua da 3 |
| 5 | **Santuário** | G | Nova |
| 6 | **Ruínas como POI de bandidos** | P | Continua da 5 |
| 7 | **Entreposto comercial** | G | Nova |
| 8 | **Quartel: reparo do colete** | P | Continua da 7 |
| 9 | **Geração nova** | G | Nova |
| 10 | **Fechamento** | P | Continua da 9 |

P = pequeno, M = médio, G = grande.

## O que fazer em cada tarefa

### 1. Mapa menor (`js/phys.js`, `js/world.js`)
- Valor padrão de `W` para **704**.
- Número de cidades de **6 a 8** (a fórmula pela terra continua; mudam os limites).
- Distância mínima entre centros (`MIND`) em **220**; continua descendo se o terreno não comportar.
- Teste: `index.html?auto=1&mute=1&seed=11` e uma semente de ilhas (`seed=3`).
- **Por quê primeiro:** era a maior queixa e dá para sentir logo, sem depender do resto.

### 2. Limpeza dos tipos e nível dos POIs (`js/pois.js`, `js/poigame.js`)
- Tirar **Curtume, Ferraria e Celeiro** de `POI_DEFS`, `POI_TYPES`, `POI_BUILD`, `POI_PRED`, `POI_PRICE` e dos números de `POIX`.
- A **Fazenda** ganha o desenho do celeiro (celeiro vermelho, silos, galinheiro). O efeito do Celeiro some (`poiNeedMul`).
- Os serviços do ferreiro, da bigorna e do curtidor ficam sem uso; as tarefas 4 e 8 os recolocam.
- Criar uma função única do **nível** (`poiLvl(dono)`): jogador = nível do líder (`rd.lvl`); facção NPC = maior nível entre as cidades dela.
- Sem migração de save (saves antigos não importam por enquanto).
- **Por quê aqui:** limpa a base e cria a função de nível que as tarefas 3, 7 usam.

### 3. Acampamento de caçadores + produção e pedágio por nível
- Tipo novo: definição, desenho, preço ◉3500, terreno provisório em `POI_PRED` (a tarefa 9 apaga).
- **Todas as produções** (Fazenda, Mina, Serraria, Acampamento) viram **1 + Nível** por rodada, e vão para o **armazém**.
- Pedágio da Ponte vira **20 × Nível** (hoje 30 fixo, em `POIX.toll`).
- Guerra: reduz o acréscimo de suprimento de couro do inimigo.
- Ao conquistar: baú com **1 a 3 carnes, uma vez só**.
- Aproveita o contexto da tarefa 2 (mesma função de nível, mesmos arquivos).

### 4. Taverna, ferreiro e mercenário (`js/pois.js`, `js/poigame.js`)
- Construir ao lado da Taverna a área do **ferreiro** (bigorna, fornalha, fuligem, chão de pedra).
- **Conserto de arma:** ouro pelo preço normal; ou **sucata da tabela atual + 60% do preço em ouro**. Qualquer Taverna atende; em Taverna de outra facção, o preço leva o buff ou debuff da relação.
- **Mercenário** (NPC novo): abre a tela de recrutamento. Só na Taverna **do jogador**.
- **Taverna de bandidos:** só NPCs bandidos. Taverna de facção: mesmos NPCs de hoje, com preço pela relação e **sem recrutar**.
- Reaproveita o ferreiro e a bigorna que sobraram da tarefa 2, então continua na mesma conversa.

### 5. Santuário
- Tipo novo: definição, desenho, preço ◉3500, **sacerdotes e peregrinos** como ambientação (sem missão). Com bandidos, ninguém aparece.
- **Paz:** cidade não suprida tem **50% de chance** de não ficar em Descontente. Cidade que **ia se rebelar** tem **30% de chance** de a rebelião ser adiada em 1 rodada. A contagem de rodadas sem suprimento **não** é mexida. Não acumula entre Santuários.
- **Guerra:** reduzir a fadiga (30% de falhar, não acumula) **fica parado** até a fadiga existir.
- Contexto novo: NPCs, humor e rebelião (`js/econ.js`, `js/rebellion.js`).

### 6. Ruínas como POI de bandidos
- De **2 a 3** no mapa. Sem dono e sem anexar.
- Guarnição que volta com as rodadas (como acampamento de bandidos), baú que **não** volta, **30%** de artefato.
- Pequena, e usa a guarnição e os baús da tarefa 5/poigame.

### 7. Entreposto comercial
- Tipo novo: definição, desenho, preço ◉4500, dono = facção. Sem lojista e sem renda se for de bandidos.
- Renda de **40 × Nível** por caravana da facção que passa por ele.
- Loja de **comida, munição, remédios e materiais**, preço 10% acima (em outra facção: 10% + relação).
- Guerra: **só enquanto as duas facções estão em guerra**, impede caravanas (do jogador e do inimigo) que passariam por ele. O jogador pode passar caravanas pelo próprio Entreposto.
- Contexto novo: caravanas, facções e lojas (`js/factions.js`, `js/raids.js`, `js/store.js`).
- Não deve adicionar novas mensagens ou notificações. As descrições das ações (como falar com o lojista) tem que ter só a informação necessária. Os bônus de ter um entreposto devem aparecer em Efeitos. 

### 8. Quartel: reparo do colete
- Vale em **qualquer cidade do jogador**. Só ouro: 35% do preço de um colete novo. Com **5 couros**: 5 couros + 60% do preço em ouro.
- Pequena; fica depois do Entreposto porque a lógica do ferreiro (tarefa 4) já está pronta para copiar.

### 9. Geração nova (`js/pois.js`, função `genWorldPois`)
- Lugares: **anel** (30 a 70 blocos da muralha), **estrada** (entre duas cidades, estradas com 80 blocos ou mais) e **interior** (longe de estradas).
- Sorteio do tipo **por bioma**, com os pesos do doc 2 (6, 4, 3, 2 e 1); no lugar de estrada, Taverna e Entreposto com peso 4.
- Regras: Serraria só com árvores em volta; Taverna e Entreposto só ao lado de estrada, e uma estrada não tem os dois; Santuário longe de estrada; Mina com pedra ou morro por perto; Ponte independente.
- Limites por tipo: **Santuário 3, Forte 3, Torre 4**.
- Estradas de ligação só para **Ponte, Taverna, Entreposto**; a **Fazenda ganha um desvio até a estrada mais próxima**.
- Apaga as regras provisórias de `POI_PRED` das tarefas 3, 5 e 7.
- Precisa de todos os tipos prontos e é a parte mais delicada: conversa nova.

### 10. Fechamento
- Trocar a tabela de tipos em `docs/fase-6-guerra.md` pelos 10 tipos.
- `?cenario=pois`: os 10 tipos lado a lado.
- `tests/smoke.js`: POIs, serviços, Taverna e carga sem erros.
- Roteiro de teste em `docs/fase-4-testes.md` ou `docs/fase-6-guerra.md`, e `/encerrar-sessao`.

## Sugestão de sessões
| Sessão | Tarefas | Observação |
|---|---|---|
| A | 1 | Dá para jogar e ver o tamanho do mapa antes de seguir. |
| B | 2, 3, 4 | Mesmos arquivos; fecha com o smoke. |
| C | 5, 6 | NPCs, humor, rebelião e guarnição. |
| D | 7, 8 | Caravanas, facções e lojas; o quartel por último. |
| E | 9, 10 | Geração e fechamento. |

Em cada sessão, terminar com `node tests/smoke.js` e `/encerrar-sessao`.

## Dependências
- **2** vem antes de todas as de POI (3 a 8).
- **3, 4, 5, 6, 7 e 8** não dependem entre si (a 8 só reaproveita o desenho da 4, que ajuda mas não é obrigatório).
- **9** depende de **3, 5 e 7** (os tipos novos precisam existir para entrar no sorteio).
- **10** é a última.
- Até a 9, cada tipo novo usa uma regra simples de terreno em `POI_PRED`, só para poder aparecer no mundo e ser testado.

## Riscos
- **Produção 1 + Nível** pode ficar alta com o nível do líder subindo; sem teto por decisão. Ajustar depois em `POIX`.
- **Santuário** mexe em humor e rebelião, que são sistemas delicados: testar com o Invocar evento da aba Rodadas.
- **Entreposto** liga caravanas, facções e lojas: é onde é mais provável aparecer um problema.
- **220 blocos com 8 cidades** só cabe em mapa de terra contínua; em ilhas o código reduz a distância.
