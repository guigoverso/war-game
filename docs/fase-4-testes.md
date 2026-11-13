# Fase 4 — Rodadas, escritório do líder e caravanas: como testar

Use `?mute=1` (sem música). O modo criativo (`?auto=1`) tem botões de teste na pausa (Tab/O/Esc).

## O que existe agora
- **Rodada** = turno do líder (decisões no escritório) + turno do comandante (o jogo normal). A rodada 1 começa no turno do comandante.
- **Encerrar a rodada**: na **prefeitura** de uma cidade sua, no quadro de missões, botão **📖 Encerrar a rodada**.
  - Resolução: cada cidade paga as necessidades que ficaram sem suprir (o que faltou vira **dívida**; na rodada 1 não há cobrança); as cidades-foco **sem caravana** produzem 5 (+1 por nível da cidade) para o estoque geral (ouro ×10).
  - Depois o jogador é levado ao **escritório do líder**.
- **Escritório**: sala fechada no canto da região das dungeons. O jogador anda pela sala; **sem inventário, sem armas, sem barra de vida, sem minimapa**. Um **soldado (o comandante)** guarda a porta. Na mesa há um **livro**: perto dela, **E** abre o livro.
- **Livro de decisões** (4 abas):
  - **Resumo**: rodada, ações, estoque geral, relatório da rodada anterior.
  - **Cidades**: para cada cidade sua, a necessidade de alimentos/minérios/madeira/ouro (0/100/150/200% da base 10 de recurso ou 100 de ouro; a cidade-foco tem 0). Botões −/+ e **Suprir** entregam do estoque. Entregar **acima** da necessidade dá um **bônus fixo até o fim da rodada**; o excedente adianta a meta da rodada seguinte. No **porto**: escolha o que ele produz e o que lhe falta (uma troca por rodada).
  - **Caravanas**: escolha duas cidades suas (**1 ação**). Quem recebe o produto do parceiro passa a ter necessidade 0 dele.
  - **Capital**: evoluir (ouro + madeira + **1 ação**) até o nível 4; cada nível dá **+1 ação por rodada** a partir da rodada seguinte.
- **Concluir decisões** → o jogador é teleportado para **fora da prefeitura** e volta a jogar (HUD e armas voltam). Se houver cidade sem suprir, o jogo pergunta antes.
- **Caravanas no mapa**: cada rota mostra **duas caravanas paradas na estrada** entre as cidades, cada uma com a bandeira da cidade (azul + faixa de identidade).
- **Bônus de entrega** (valor fixo, na linha da rodada no canto da tela): 🌾 melhorar soldados −20% • ⛏ armas, munição e conserto −20% • ◉ recrutar e curar −20% • 🪵 missões pagam +10% (o desconto de obras entra quando houver construção).
- **Não há eventos ainda.**

## Roteiro de teste (modo criativo)
1. `?auto=1&mute=1&seed=11`. Pausa → **+100 alimentos, minério e madeira**.
2. Pausa → **Encerrar rodada**: você aparece no escritório (barra de vida, armas e minimapa somem; só aparece a dica na parte de baixo). Vire para trás: o soldado na porta.
3. Ande até a mesa → "[E] Abrir o livro de decisões". Abra e passe pelas 4 abas.
4. **Cidades**: entregue algo acima da necessidade (a cidade-foco precisa 0: um +1 já dá bônus). Concluir decisões → você sai da prefeitura e a linha "Rodada N" mostra o bônus.
5. Confira o preço: com ⛏ ativo, conserto/armas/munição ficam −20% no Armeiro.
6. Conquiste outra cidade (criativo: ataque normal) e crie uma **rota** na aba Caravanas (gasta 1 ação). Saia e vá ao meio do caminho: duas caravanas na estrada.
7. **Capital**: com ações e recursos, evolua; na rodada seguinte há mais ações.
8. Deixe uma cidade sem suprir e encerre a rodada: o relatório mostra "faltaram X (virou dívida)"; o ouro/recurso fica negativo e as compras ficam bloqueadas.
9. **Salvar dentro do escritório** e carregar (`?load=1`): você volta ao escritório (a posição salva é a de fora).

## Decisões desta fase (padrão: o mais simples)
- Falta de suprimento → **dívida**, sem perder a cidade (debuffs e rebelião ficam para depois).
- O turno do comandante **não tem limite**; termina quando o jogador encerra a rodada na prefeitura.
- O porto é a cidade mais forte que não é a capital (pode ser conquistada depois; sem ele, o livro avisa).
- Entregar estoque às cidades é **grátis**; gastam ação: **caravanas** e **evoluir a capital**.
- O escritório fica no 4º quadrante da região das dungeons (se o mapa não tiver essa região, o livro abre direto na prefeitura).
