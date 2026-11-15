# Rebelião de cidades NPC (fase própria, ainda não implementada)

Desenho fechado com o usuário. A base que ela precisa (humor das cidades NPC e contador de descontentamento `ups`) está na F5a: ver "Suprimento das facções NPC" em `docs/fase-5-facoes.md`.

## Gatilho
- Cidade NPC com `ups` no limite fica rebelde. Limite sugerido: 4 rodadas seguidas descontente (agressiva menos, pacífica mais). A capital da facção não se rebela.
- A rebelião abre um **evento no turno do líder** (cartão, fila como as declarações de guerra) com 3 opções: **apoiar**, **combater** (ajudar a reprimir) ou **não se envolver**.
- Chance de os rebeldes vencerem: 50% base, +25 pontos se o jogador apoia, −25 se combate; sobe se um rival da facção dona apoia.
- **Apoiadoras:** facção NPC neutra com cidade perto da rebelde tem 40% de chance de apoiar. Inimigas/rivais da dona também podem. Cada apoio sobe o preço da anexação e traz +1 reforço.

## Cor e bandeira
- Os rebeldes usam uma cor **não usada por nenhuma facção**; é a cor da facção se ela nascer.
- As bandeiras da cidade trocam por uma bandeira temporária dos rebeldes.

## Jogador apoia
- Vira **inimigo** da facção dona da cidade.
- No turno do comandante é teleportado para a rebelião, que funciona como um **raid**, com soldados da cor da facção inimiga e tipos diferentes de inimigos.
- Reforços: +1 por nível da cidade (soldados rebeldes juntos com os seus) e +1 por facção que apoia.
- Se o jogador sair do raio da cidade: aviso de que, se seguir adiante, a batalha é perdida.
- Se morrer: a rodada acaba e volta ao turno do líder.

## Jogador combate
- É uma **invasão de cidade**: começa perto dela, não dentro.
- Além dos seus soldados, há reforços da facção dona; se outra facção apoia os rebeldes, vêm soldados dela do outro lado.
- Se morrer: encerra a rodada, volta ao turno do líder; o evento segue com opções novas (ver Negociação, caso "morreu").

## Jogador não se envolve
- A cidade muda de visual: prédios em chamas, buracos, soldados e pessoas mortas. Serviços fechados, sem soldados.
- O resultado sai na rodada seguinte: se os rebeldes perderam, só um resumo no livro; se ganharam, há o evento de Negociação.

## Negociação (rodada seguinte, se os rebeldes venceram)
Uma facção temporária existe naquela rodada.

**Se o jogador apoiou ou venceu a batalha:**
- **Reconhecer a nova facção:** ela passa a existir; relação inicial com o jogador **Favorável**.
- **Propor que se junte à sua facção:** o jogador paga. Mínimo **◉2000 + ◉1000 por nível da cidade + ◉1500 por facção com interesse** (apoiadora). Se não puder pagar: ou nasce uma facção nova com relação **neutra**, ou a outra facção que apoiou a anexa. Dívidas podem ser criadas.

**Se o jogador não se envolveu:** a opção de se juntar custa **+◉2000**, e há também **ignorar** (se os rebeldes formarem uma facção nova, ficam descontentes) e **não reconhecer** (se houver facção nova, ela vira inimiga).

**Se o jogador morreu combatendo:** só **ignorar** (se nascer facção nova, ela fica descontente) e **não reconhecer** (se nascer, vira inimiga). Não aparece a opção de juntar. Se o jogador reconhecer mesmo assim: relação **neutra** com a nova facção e perde relação com a facção que perdeu a cidade.

## Nova facção
Nome, bandeira e temperamento sorteados; cor = a dos rebeldes. As relações com as outras facções NPC saem do grafo (aliada das que eram rivais da dona, rival da dona). Exige guardar a facção no `STATE` (a lista é gerada por semente) e subir a `SAVE_VERSION` (v14).

## Sabotagem
Entra na Fase 6 (guerra). A F5a deixa o gancho: modificadores temporários na chance de suprimento por cidade/facção.
