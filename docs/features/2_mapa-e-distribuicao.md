# Tamanho do mapa e distribuição dos POIs

**Status:** em discussão (design). Ainda não implementado.
**Depende de:** `1_pois-revisao.md` (os 10 tipos de POI).

## O problema
O mapa passou de 640 para 896 blocos de lado (quase o dobro da área) para caber mais POIs que cidades. Ficou cansativo de atravessar e às vezes parece vazio. A meta é diminuir o mapa sem perder:
- **mais POIs que cidades**;
- **posições que façam sentido na guerra** (a frente entre duas cidades usa os POIs que ficam entre elas).

## Como é hoje (para comparar)
| | Hoje |
|---|---|
| Lado do mapa | 896 (`W` em `js/phys.js`; `?w=640` volta ao antigo) |
| Cidades | 7 a 10 (terra ÷ 48 mil); centros a pelo menos 104 blocos; meia-largura de 36 a 45 |
| POIs por cidade | 1 a 4, sorteados de **95 a 215 blocos do centro** da cidade, em qualquer direção |
| Folga | 30 blocos entre um POI e a muralha ou outro POI (`POI_GAP`) |
| Completa | se faltar, sorteia no mapa todo até ter 2 POIs por cidade + 2 |
| Velocidade | andando 5 blocos/s, correndo 8,2 blocos/s |

O que deixa o mapa vazio não é só o tamanho: os POIs caem em **qualquer direção** em volta da cidade, inclusive no lado de fora do mapa, longe de tudo. O que fica **entre** as cidades, que é o caminho que o jogador faz, nem sempre tem algo.

## Proposta: anel, estrada e interior
A ideia é parar de espalhar POIs em volta das cidades e colocá-los em **3 tipos de lugar**, cada um com uma função:

| Lugar | Onde fica | Para quê |
|---|---|---|
| **Anel** | perto da cidade, de 30 a 70 blocos da muralha | produção da cidade (o "quintal" dela) |
| **Estrada** | na beira da estrada entre duas cidades vizinhas, perto do meio do caminho | passagem e comércio; é aqui que fica a **frente** da guerra entre as duas |
| **Interior** | longe das estradas, entre as cidades | exploração e lugares isolados |

Com isso, o caminho entre duas cidades sempre passa por alguma coisa (o anel de uma, o POI da estrada, o anel da outra), e o espaço que sobra é o interior, onde ficam santuários, acampamentos de bandidos, grutas e baús perdidos.

**Na guerra:** a frente entre duas cidades fica sendo os POIs do anel de cada uma que estão virados para a outra, mais o POI da estrada entre elas. Isso dá os "3 ou 4 POIs entre as duas cidades" que `docs/fase-6-guerra.md` já pede.

### Tamanho do mapa
- **Lado do mapa: 704** (62% da área de hoje). Com os POIs mais perto das cidades, não precisa da folga que levou ao 896.
- **Cidades: 6 a 8**, e não 7 a 10. A fórmula pela quantidade de terra continua; só mudam os limites.
- **Distância entre cidades vizinhas:** de 200 a 280 blocos entre os centros. Correndo, dá uns 15 a 25 s de muralha a muralha, passando pelo POI da estrada.
- **Da muralha até um POI do anel:** de 30 a 70 blocos (de 4 a 9 s correndo).

**Dá para sentir o tamanho agora, sem mudar código:** `index.html?auto=1&mute=1&seed=11&w=704` (ou `&w=768`). Os POIs ainda vão nascer pelas regras atuais, mas a sensação de distância já aparece.

### Quantos POIs
Com 7 cidades, por exemplo:
- **Anel:** de 1 a 3 por cidade (desigual de propósito, como hoje), por volta de 14.
- **Estrada:** 1 por estrada entre cidades vizinhas, por volta de 8.
- **Pontes:** até 2, nos trechos de ponte da estrada (como hoje).
- **Interior:** de 2 a 4.

Total de uns 25 a 28 POIs para 7 cidades. Continua tendo mais POIs que cidades, agora sem precisar completar o número com sorteio no mapa todo.

## Sorteio do tipo
A geração passa a ter **2 etapas**:
1. **Escolher o lugar** (anel, estrada ou interior).
2. **Sortear o tipo pelo bioma do lugar**, com os pesos abaixo. Um tipo cujas regras o lugar não cumpre fica fora do sorteio daquele lugar (por exemplo, Serraria num lugar sem árvores).

### Pesos por bioma
Do mais frequente para o menos frequente. Os números são uma sugestão para começar e vão para uma tabela de balanceamento, junto com os outros números dos POIs.

| Bioma | 1º (peso 6) | 2º (peso 4) | 3º (peso 3) | 4º (peso 2) | Restante (peso 1) |
|---|---|---|---|---|---|
| Planície | Fazenda | Serraria | Acampamento de caçadores | Santuário | Mina, Forte, Torre, Taverna, Entreposto |
| Floresta | Serraria | Acampamento de caçadores | Fazenda | Torre de vigia | Mina, Forte, Santuário, Taverna, Entreposto |
| Montanha | Mina | Torre de vigia | Forte | Santuário | Fazenda, Serraria, Caçadores, Taverna, Entreposto |

| Bioma | Peso 2 | Restante (peso 1) |
|---|---|---|
| Neve e deserto | Fazenda, Serraria, Acampamento de caçadores, Santuário, Mina, Torre de vigia, Forte | Taverna, Entreposto |

A Ponte fica fora do sorteio: continua nascendo só nos trechos de ponte da estrada, como hoje.

### Regras de lugar
| Tipo | Regra |
|---|---|
| Serraria | só onde houver árvores em volta (por exemplo, pelo menos 8 árvores num raio de 25 blocos) |
| Taverna e Entreposto | só na beira de uma estrada |
| Taverna × Entreposto | uma estrada com Taverna não pode ter Entreposto, e o contrário também vale |
| Santuário | longe das estradas (por exemplo, a pelo menos 40 blocos de qualquer estrada) |
| Ponte | só em trecho de ponte da estrada (como hoje) |

Isso deixa os 3 lugares assim:
- **Estrada:** sorteia entre todos os tipos, menos o Santuário. Como a Taverna e o Entreposto só podem nascer aqui, o lugar de estrada pode dar um peso extra aos dois para que apareçam (ver as perguntas).
- **Anel e interior:** sorteiam entre todos os tipos, menos a Taverna e o Entreposto.

## Mudança na regra de estradas
Na regra anterior tem que ter uma estrada ligando os POI. Agora apenas alguns terão essa ligação.
- Pontes
- Fazenda
- Taverna
- Entreposto comercial

## Perguntas em aberto
1. **Qual "estrada" vale para a Taverna e o Entreposto?** Estrada entre duas cidades. 
2. **O Santuário ganha estrada até a cidade?** Não, fica a regra nova. 
3. **Peso da Taverna e do Entreposto no lugar de estrada.** Pelos pesos da tabela, eles quase nunca saem (peso 1 contra 6 da Fazenda). Proposta: no lugar de estrada, Taverna e Entreposto passam a ter peso 4, para quase toda estrada ter um dos dois. -> Siga sua sugestão
4. **A Mina continua exigindo pedra ou morro por perto?** Hoje ela só nasce perto de rocha ou terreno alto. Na planície (peso 1), sem essa regra, apareceria mina no meio do campo. Minas agora tem um design de um buraco no chão, então pode manter.
5. **Limite por tipo no mapa?** Por exemplo, no máximo 3 Santuários e 3 Fortes, para um bioma grande não encher o mapa do mesmo tipo. -> Pode seguir com a sugestão.
6. **Tamanho: 704 ou 768?** Vale testar os dois com `&w=` antes de decidir. -> 703

## Impacto no código (para quando for implementar)
Só para referência; nada disso foi feito.
- `js/phys.js`: valor padrão de `W`.
- `js/world.js`: limites do número de cidades (`NC`) e, talvez, a distância mínima entre elas (`MIND`).
- `js/pois.js`: `genWorldPois` reescrita em anel, estrada e interior; `POI_PRED` vira as regras de lugar; tabela nova de pesos por bioma; contagem de árvores para a Serraria; distância até a estrada para o Santuário.
- As estradas entre cidades precisam estar prontas antes dos POIs de estrada (hoje os POIs são gerados por último, então isso já acontece).
- `tests/smoke.js` e `?cenario=pois`: conferir que continuam funcionando.
