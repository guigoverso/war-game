# Fase 6 — Guerra: decisões de design

Fase só da guerra. Depende da Fase 5 (facções, relações, temperamentos): ver `docs/fase-5-facoes.md`.
Nada daqui está no código ainda. O desenho amplo (frente de pontos, ondas, economia da guerra, paz) está na seção 5D e no fatiamento G1 a G5 de `docs/ideias-e-design.md`; este arquivo manda onde houver conflito.

## Como a guerra começa
- **Queda de relação por crime:** se o jogador comete crime contra uma facção que já é **inimiga**, a guerra começa na **rodada seguinte**. A facção **pacífica não declara guerra**.
- A pacífica inimiga fica sem comércio e exige reparação em ouro (regra na Fase 5), sem chegar à guerra.
- Outras causas de guerra (declaração do jogador, facções NPC entre si, aliados entrando) **ainda não estão decididas**.

## Alvo da guerra
- Ao entrar em guerra, o jogo calcula **a cidade mais próxima** como alvo/frente.
- No futuro a guerra se divide em **dois tipos, ataque e defesa**, porque os objetivos são diferentes. Definir antes da G1.

## Efeitos já decididos em outras partes
- **Crime em cidade em guerra:** vale como crime (guardas atiram, 3× de dano no jogador, sem conquista, sem soldados, sem serviços), como numa cidade inimiga.
- **Invasão de cidades:** desativada por enquanto (o código continua existindo). A guerra é o caminho para conquistar cidades.
- **Aliada:** seus soldados lutam nas guerras da aliada e os dela nas suas.
- **Pacífica:** nunca declara guerra, nem por aliado.

## A decidir
- **Limiar de guerra:** a partir de que relação a facção declara guerra (sugestão: relação ≤ −40 para inimiga). Decidir na implementação.
- **Comportamento por temperamento na guerra** (design antigo, seção 18): agressiva declara guerra por "questão de tempo" (2 a 4 rodadas)? Neutra entra em guerra de aliado pagando? Agressiva entra na hora? Hoje só a regra da pacífica está fechada.
- **Entrada de aliados:** quem entra e em que condições.
- **Derrota do jogador:** o que acontece se a cidade do jogador cai (design antigo sugere perder a cidade, pagar tributo ou, se for a capital, fim de jogo "por enquanto").
- **Caminho por terra** entre todas as cidades na geração do mundo (pré-requisito da frente de guerra); guerra naval entre portos fica como ideia futura.

## Fatiamento sugerido (do design antigo)
1. **G1, guerra mínima:** objeto `WAR`, frente linear de 3 a 5 pontos (reaproveitando acampamentos com dono), captura, redução de soldados da cidade, batalha final com escolha de pontos de nascimento, uma cidade por guerra.
2. **G2, pressão do inimigo:** ondas de ataque, avisos, ataques furtivos, raids de mercenários, teto de soldados com reposição.
3. **G3, economia da guerra:** gasto de recursos, estado de guerra, compra de pontos, missões paralelas com debuffs.
4. **G4, diplomacia na guerra:** cidades do meio, aliados e espólio, aliados do inimigo.
5. **G5, paz e pós-guerra:** negociação, conquista com cidade em crise, rebelião.

## Ideia de teste
O **cenário controlado** (rota fechada com eventos pré-definidos), anotado na Fase 5, é ainda mais útil aqui: guerra é difícil de testar começando do zero.
