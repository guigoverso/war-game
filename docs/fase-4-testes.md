# Fase 4 — Rodadas, prefeitura, livro e caravanas: como testar

Use `?mute=1` (sem música). O modo criativo (`?auto=1`) tem botões de teste na pausa (Tab/O/Esc).

## Como o sistema funciona (versão revisada)
- **Rodada 0 (preparação)**: a partida **começa dentro da prefeitura** da capital, com o **livro aberto no Resumo** (de que suprimentos cada cidade precisa). Não há decisões, nada é cobrado nem produzido. A contagem começa na rodada 1.
- **Turno do comandante** (o jogo normal): você sai atrás de suprimentos para suprir as cidades — **comprando na loja** (carne, tronco de madeira, minério bruto) ou **achando na natureza** (caça, pesca, baús e dungeons). Depois **deposita** na aba Bolsa do livro e **distribui** às cidades (aba Livro → Cidades). A rodada só termina quando você a encerra na prefeitura.
- **Livro (tecla B)** = bolsa + livro do prefeito, no formato de livro:
  - Marcador **🎒 Bolsa**: o inventário de antes (armas 1–6, curas 7–9, bolsa, arrastar e soltar) e o botão **📦 Depositar tudo**, que transforma comida, sucata/minério e madeira da bolsa em **estoque geral**.
  - Marcador **📖 Livro**, com subabas: **Resumo** (rodada atual, recursos ainda não alocados, cidades dominadas e suas necessidades, caravanas ativas), **Cidades** (necessidade × entregue, −/+/Suprir; porto), **Caravanas**, **Capital**.
- **Encerrar a rodada**: no quadro da prefeitura, **📖 Encerrar a rodada**. Para a rodada ≥ 1: cada cidade paga o que ficou sem suprir (**vira dívida**) e as cidades-foco sem caravana produzem 5 (+1 por nível; ouro ×10) para o estoque.
- **Turno do líder** (começa na rodada 1): você é levado ao **escritório** (sem inventário, armas, vida ou minimapa). Um soldado guarda a porta. Perto da mesa, **E ou clique** abre o livro (alcance generoso). Aqui valem as decisões: **comprar caravana (◉ 200)**, **trocar a distribuição do porto** (1 por rodada) e **evoluir a capital** (ouro + madeira + 1 ação; +1 ação por rodada no nível seguinte). **Concluir decisões** → você sai para fora da prefeitura.
- No turno do comandante, as abas de decisão ficam **travadas** (🔒); entregar suprimentos às cidades funciona nos dois turnos.
- **Caravanas**: a sua cidade pode mandar para **qualquer outra cidade** (por ora todas são neutras; também vale uma cidade sua). A cidade sua que recebe o produto do destino passa a ter necessidade 0 dele. No mapa aparecem **duas caravanas paradas na estrada**, cada uma com a bandeira da sua cidade.
- **Bônus de entrega** (acima da necessidade; vale até o fim da rodada, aparece na linha "Rodada N"): 🌾 melhorar soldados −20% • ⛏ armas, munição e conserto −20% • ◉ recrutar e curar −20% • 🪵 missões +10%. O excedente adianta a meta da rodada seguinte.
- **Não há eventos ainda.**

## Roteiro de teste
1. `?auto=1&mute=1&seed=11` → Continuar: você está na prefeitura e o livro abre no **Resumo** (rodada 0).
2. Pausa → **Dar 1 de cada item** (ou compre na Loja carne/tronco/minério) → **B** → marcador **Bolsa** → **Depositar tudo** → o estoque sobe.
3. **B** → marcador **Livro** → **Cidades**: entregue (+/Suprir). Entregar acima da necessidade mostra ★ bônus e a linha da rodada mostra o bônus.
4. Vá ao quadro da prefeitura → **Encerrar a rodada** (rodada 0 → 1): o escritório. Ande até a mesa (E ou clique a ~5 m). Aba **Caravanas**: escolha a sua cidade e um destino neutro, **Comprar caravana (◉ 200)**. **Capital**: evoluir. **Concluir decisões**.
5. Fora, **B** → Livro → Capital/Caravanas: as decisões aparecem 🔒 (turno do comandante). Vá até a estrada entre as cidades: duas caravanas.
6. Encerre a rodada 1 deixando algo sem suprir: o Resumo da rodada 2 relata as faltas (dívida; compras ficam bloqueadas).
7. Salvar dentro do escritório e carregar (`?load=1`): você volta ao escritório.

## Decisões desta fase (padrão: o mais simples)
- Falta de suprimento → **dívida** (debuffs e rebelião ficam para depois).
- Turno do comandante **sem limite**; termina ao encerrar a rodada.
- O porto é a cidade mais forte que não é a capital (o livro avisa enquanto você não tiver um).
- Entregar estoque é grátis; **caravana custa ◉ 200** (sem gastar ação); **evoluir a capital** gasta 1 ação.
- Suprimentos: carne (3 alimentos), ervas (1), peixes (2), sucata (1 minério), minério bruto (3), tronco (3 madeira). Loja vende carne, tronco e minério; baús dão tronco e minério.
- O escritório fica no 4º quadrante da região das dungeons (sem essa região, o livro abre direto na prefeitura).
