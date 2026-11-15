# Rebelião de cidades NPC

Desenho fechado com o usuário. Código: `js/rebellion.js`. A base (humor das cidades NPC e contador `ups`) está em `docs/fase-5-facoes.md` ("F5a base").

## Etapas
1. **Núcleo sem batalha (feito, `js/rebellion.js`):** gatilho, cartões de decisão e de resultado, apoio financeiro, sorteio do resultado, Negociação, nova facção (save v14), anexações, cenário de teste.
2. **Batalhas (a fazer):** apoiar os rebeldes (raid adaptado) e combater a rebelião (invasão adaptada), com reforços. Hoje as opções A e B aparecem desabilitadas ("etapa 2").
3. **Visual (a fazer):** buracos, corpos e prédios queimados; uniformes dos rebeldes. Hoje: fumaça (`igniteCity`), bandeira lisa na cor dos rebeldes e cor no mapa.

## Como testar a etapa 1
- `index.html?auto=1&mute=1&seed=11&cenario=rebeliao`: rodada 3, ◉20000, comida e minério 40, uma rebelião já na fila. Encerre a rodada (prefeitura ou pausa → Rodadas): no turno do líder o cartão aparece (livro na mesa, tecla E).
- Pausa → aba Facções (modo criativo): estado da rebelião, cidades descontentes e o botão **🔥 Forçar uma rebelião**.
- Testar cada caminho: C (não se envolver), D/E (apoio financeiro), e no turno seguinte as opções do resultado; recarregar o save no meio (a facção nova e a cidade em chamas voltam).

## Gatilho (`rebCheck`)
- Cidade NPC com `ups` (rodadas seguidas descontente) ≥ limite: pacífica 4, neutra 3, agressiva 3. Um valor maior vem com a guerra/sabotagem no futuro.
- A partir da rodada 3; no máximo uma rebelião por vez e 2 rodadas de folga depois de cada uma.
- A capital da facção (cidade de maior nível; empate: menor id) nunca se rebela; facção de uma cidade só também não (seria destruída).
- Apoiadoras (`rebSupporters`): facção neutra com cidade a menos de 130 blocos tem 40% de chance de apoiar os rebeldes; rival da dona (relação ≤ 3 no grafo da F3) tem 60%; aliada ou amistosa nunca. No limite de 8 facções há sempre ao menos uma (a mais próxima).

## Linha do tempo
- **Fim da rodada X−1:** a rebelião entra na fila. Prioridade dos eventos da rodada: raid de bandidos > rebelião > emboscada de caravana > dungeon dourada (a rebelião na fila só perde para o raid sorteado, e espera a próxima rodada).
- **Rodada X, turno do líder:** cartão "Rebelião" (`rebAnnounce`): a cidade pega fogo, a bandeira vira a dos rebeldes, os serviços fecham, as caravanas dela (suas e NPC) acabam, as missões que a envolvem são canceladas (sem penalidade) e nenhuma nova é gerada para ela. O líder escolhe; o turno do comandante age de acordo.
- **Fim da rodada X:** a rebelião é resolvida (`rebRound`).
- **Rodada X+1, turno do líder:** se os rebeldes venceram, cartão "Rebelião: resultado" com a Negociação; se perderam, só uma linha no relatório e a cidade volta à dona.

## Decisão do cartão (turno X)
| Opção | Efeito |
|---|---|
| **A. Apoiar os rebeldes** | (etapa 2) batalha ao lado deles; vira **inimigo** da dona |
| **B. Combater a rebelião** | (etapa 2) invasão normal; sai da lista se a dona está em guerra com você |
| **C. Não me envolver** | resultado sorteado |
| **D. Apoiar financeiramente os rebeldes** | paga ◉(600 + 200 × nível), (6 + 2 × nível) de comida e de minério; relação com a dona −2; rebeldes ganham +20 pontos no sorteio |
| **E. Apoiar financeiramente a facção** | mesmo custo; relação com ela +2; ela ganha +20 pontos |
- Sorteio (sem batalha): 50% de os rebeldes vencerem, +10 pontos por facção que os apoia, ±20 do apoio financeiro (mínimo 10%, máximo 90%). Apoiar financeiramente não garante vitória.
- Com batalha (etapa 2) o resultado vem dela. Se o jogador morre, **perde o lado em que estava**.
- Pagar sem ter o ouro vira dívida (ouro negativo), como nas outras decisões.

## Negociação (cartão do turno X+1, rebeldes venceram)
Preço de anexação (`rebJoinCost`): ◉2000 + ◉1000 por nível da cidade + ◉1500 por facção interessada (+◉2000 se o jogador não se envolveu).
- **Se apoiou os rebeldes (direto ou financeiramente):**
  - **Reconhecer a nova facção:** nasce na cor dos rebeldes; relação **Favorável**.
  - **Propor que se junte à sua facção:** paga o preço. Sem o ouro a proposta é recusada (sem cobrar): sorteio entre nascer uma facção **neutra** ou uma facção interessada **anexar** (a mais próxima).
  - **Anexar a crédito:** só aparece sem o ouro; a cidade passa a ser sua e o saldo fica negativo.
- **Se não se envolveu (ou apoiou a dona e os rebeldes venceram):** Propor que se junte (preço +◉2000, com as mesmas regras de falta de ouro), **Ignorar** (nasce a facção, mas o jogador fica "Desfavorável" com ela) ou **Não reconhecer** (a facção nasce **inimiga**).
- **No limite de 8 facções (você incluída):** não há reconhecer nem não reconhecer; "Ignorar" faz a facção interessada mais próxima anexar a cidade (empate: sorteio).
- **Se o jogador morreu combatendo (etapa 2):** só Ignorar (a nova facção ficaria descontente) e Não reconhecer (ela vira inimiga); sem a opção de juntar. Reconhecer, nesse caso: relação neutra e perde relação com a facção que perdeu a cidade.

## Nova facção (`rebNewFaction`)
- Nome (sem substantivo repetido), cor e bandeira livres, temperamento sorteado; cor da rebelião = cor da facção. Guardada em `STATE.reb.nfacs` e recolocada ao carregar (`rebApply`); a cidade troca de facção via `STATE.reb.cfid`.
- Relações entre as NPC: rival da dona (valor 2), aliada das rivais da dona (8), neutra com o resto (5). Entra no diagrama de Diplomacia.
- **Save v14.**

## Batalhas (etapa 2, desenho)
- **Apoiar os rebeldes:** no turno do comandante o jogador é teleportado; funciona como o raid de uma cidade sua, mas as ondas são de soldados da cor da facção dona e inimigos variados (soldados, golems, drones...), cada onda mais difícil. Seus reforços: **+1 soldado rebelde por nível da cidade** e **+1 por facção que apoia** (nível de soldado comum); ex.: cidade nível 3, você com 5 soldados e uma facção apoiando = 9 lutando. Os soldados extras funcionam como soldados do jogador. Aviso ao sair do raio da cidade (seguir adiante perde a batalha). Morrer encerra a rodada.
- **Combater a rebelião:** invasão normal; o jogador começa perto, fora da cidade. Os soldados da cidade viram os rebeldes (a dificuldade é a da invasão). Reforços da facção dona do seu lado; se outra facção apoia os rebeldes, soldados dela do outro lado. Só há dois lados: rebeldes e facção.
- **Apoio financeiro** (D/E) entra no mesmo cálculo da batalha como "buff" do lado apoiado (não garante vitória), com cidade em chamas e sem serviços no turno do comandante.
- Relações: apoiar a batalha leva a dona a "Inimiga"; reprimir sobe +3 com a dona; reconhecer sem apoio: neutra e −2 com a dona.

## Sabotagem
Fase 6 (guerra). Gancho: `fsupHit` (facsupply.js) reduz o suprimento de uma facção por algumas rodadas; o limite de rebelião e o preço de anexação sobem com ela.
