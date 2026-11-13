# Fase 4 — Rodadas, prefeitura, livro e caravanas: como testar

Use `?mute=1` (sem música). O modo criativo (`?auto=1`) tem botões de teste na pausa (Tab/O/Esc).

## Como o sistema funciona
- **Rodada 0 (preparação)**: a partida começa na **sala do prefeito (o escritório)**, com o livro no Resumo. Nada é decidido, cobrado ou produzido. **Encerrar turno** leva você para fora da prefeitura. A contagem vale a partir da rodada 1.
- **Prefeitura (prédio grande, 2 andares)**: no **térreo** fica o quadro de missões; no **2º andar**, uma sala igual à do prefeito com o **líder sentado na cadeira**. **Falar com ele (E)** → confirmação → encerra o turno do comandante e começa a nova rodada.
- **Turno do líder** (rodada ≥ 1): você é levado ao escritório (sem inventário, armas, vida ou minimapa). **E ou clique** perto da mesa abre o livro. Decisões: **comprar caravana (◉ 200)**, **distribuição do porto** (livre; só vale quando o turno acaba), **evoluir a capital**. **Encerrar turno** → você sai da prefeitura.
- **Turno do comandante**: você busca suprimentos (compra na loja ou acha na natureza) e os **entrega às cidades** pelo livro. As decisões do líder ficam 🔒 e **não há opção de mudar o porto**.
- **Livro (tecla B)** = bolsa + livro: marcador **🎒 Bolsa** e marcador **📖 Livro** (Resumo, Cidades, Caravanas, Capital).
- **Estoque = estoque guardado + itens de suprimento na bolsa, 1 para 1** (carne, peixe, ervas = 1 alimento; sucata e minério bruto = 1 minério; tronco = 1 madeira). **Não é preciso depositar**: ao entregar, o jogo usa primeiro o estoque guardado e depois os itens da bolsa.
- **Cidades**: cada cidade mostra a **abundância**, do recurso mais abundante ao menos abundante nesta rodada (necessidade 0% → 200%), e quanto precisa/entregou de cada um. Entregar acima da necessidade dá o **bônus da rodada** (🌾 soldados −20% • ⛏ armas/munição/conserto −20% • ◉ recrutar/curar −20% • 🪵 missões +10%).
- **Caravanas**: **Escolher no mapa** abre o mapa: clique na cidade de **origem** (sua) e depois na de **destino** (sua, aliada ou neutra), confirme (◉ 200). A origem passa a receber o produto do destino por caravana (necessidade 0). Aparecem duas caravanas paradas na estrada, com a bandeira de cada cidade.
- **Encerrar a rodada ≥ 1**: o que faltar vira **dívida** (bloqueia compras); cidades-foco sem caravana produzem 5 (+1 por nível; ouro ×10).
- **Não há eventos ainda.**

## Roteiro de teste
1. `?auto=1&mute=1&seed=11` → Continuar: você está no escritório (rodada 0), livro aberto. **Encerrar turno** → fora da prefeitura.
2. Pausa → **Dar 1 de cada item**. **B** → Livro → Cidades: entregue (+/Suprir): os itens da bolsa somem conforme usados.
3. Entre na prefeitura, suba a escada (oeste, ao fundo) até a sala do líder; fale com ele (E) → confirme → rodada 1 e escritório.
4. Caravanas → **Escolher no mapa** → origem → destino → **Comprar**. Cidades → (porto conquistado) mude o recurso várias vezes; ao **Encerrar turno** a escolha final passa a valer.
5. Fora, **B** → Livro: Caravanas/Capital/porto ficam 🔒.

## Decisões desta fase (padrão: o mais simples)
- Falta de suprimento → dívida; turno do comandante sem limite; o porto é a cidade mais forte que não é a capital.
- Entregar estoque é grátis; caravana custa ◉ 200 (sem ação); evoluir a capital gasta 1 ação.
- Se a cidade não comportar a prefeitura grande, ela cai para o prédio pequeno (com o líder no térreo) ou para o quadro na praça.
