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

## Armazém da cidade (adição) — substitui a entrega pelo livro
- Toda cidade tem um **armazém** (edifício com baú grande). Perto dele, **E** abre a tela (só em cidade sua).
- **Tela do armazém**: no alto, o **resumo** (produção da cidade, cofre, e os suprimentos desta rodada: armazenado / necessidade, com ✔, ⚠ falta ou ★ bônus). Duas abas:
  - **📦 Armazenamento**: 24 slots da cidade (separados da bolsa) + **cofre de ouro** (Guardar/Tirar ◉10, ◉100, tudo). Clique em um item e use os botões para mover entre a bolsa e o armazém.
  - **📥 Suprimentos**: **1 slot de madeira, 1 de minério e 10 de alimentos** (variedade), o **ouro** (do cofre, +10/+100/Suprir tudo) e o **slot de produção em abundância**. Itens de suprimento da bolsa ou do armazenamento vão para os slots; dá para retirar de volta.
- **Recursos são itens, 1 para 1**: tronco = 1 madeira, minério bruto/sucata = 1 minério; carne, peixes e ervas = 1 alimento. Podem ser comprados, vendidos e carregados como qualquer item. Ouro continua no seu bolso e no cofre.
- **Produção em abundância**: a cidade-foco sem caravana produz por rodada (5 + nível; ouro ×10) e o resultado vai para o **slot de produção**; **ouro vai direto ao cofre**. Se o foco é comida, **sorteia-se um tipo** e o slot **soma** rodada após rodada até você retirar. Se a abundância mudar (porto), o que estava na reserva vai ao armazenamento e **o que não couber é destruído**.
- **Fim da rodada**: a cidade consome o que precisa dos slots; **o excedente fica** (adianta a próxima rodada). O que **faltar** vira **dívida em itens** (a mesma unidade do recurso) e liga **debuffs** na rodada que começa; **a quantidade a suprir não muda**. O que sobrar além do necessário paga a dívida primeiro e depois adianta a próxima rodada. Dívida em aberto bloqueia compras.
- **Livro (aba Cidades)**: só **mostra** o que a cidade tem (necessidade × no armazém, reserva de produção, cofre). Não entrega mais por ali.
- **Mudanças ligadas**: recompensa de portal em recursos vira **itens** na bolsa; raid bem-sucedido dos bandidos leva 15% dos suprimentos do armazém; evoluir a capital custa só ouro (◉300 × nível); o botão criativo "Dar madeira, minério e comida" dá itens.
### Debuffs (faltou suprimento na rodada anterior)
- 🌾 alimentos: soldados (recrutar/melhorar) e pratos da taverna custam o dobro • ⛏ minérios: armas, munição e conserto custam o dobro • 🪵 madeira: missões pagam 80% menos, a Loja cobra o dobro e compra por 50% do valor • ◉ ouro: curar e itens de cura custam o dobro.
- Aparecem em vermelho na linha "Rodada N" e a dívida (em itens) aparece no armazém e no livro. Os itens entregues são **destruídos** no fim da rodada; na seguinte é preciso suprir tudo de novo.
## Humor das cidades (adição) — o ouro deixa de ser necessidade
- **Necessidades**: só 🌾 comida, ⛏ minério e 🪵 madeira. O ouro é só economia: **imposto** por rodada e produção das cidades de foco "dinheiro" (que passam a precisar dos três recursos físicos). O debuff de ouro saiu.
- **Humor** (resultado da última rodada fechada), mostrado no livro (Resumo e Cidades) e no armazém:
  - 😄 **Próspera**: tudo atendido e algum recurso acima da meta → imposto ×1,5, **+1 de produção** e **10% de desconto** nas lojas da cidade.
  - 🙂 **Contente**: tudo atendido → imposto normal.
  - 😠 **Descontente**: faltou algo → **sem imposto e sem produção**; curar e itens de cura custam o **dobro** na cidade; os debuffs por recurso continuam valendo.
- **Imposto**: ◉ (20 + 10 × nível da cidade) por rodada, vai para o **cofre do armazém** (você precisa buscar).
- **Rebelião**: duas rodadas seguidas descontente → na seguinte a cidade **se rebela**: vira inimiga, perde o armazém, a rota de caravana e ganha uma guarnição. A **capital não se rebela** (só sofre os efeitos). Suprir tudo zera a contagem.
- **Cidades que não são suas** têm humor simulado por sorte e nível (por enquanto só aparece no Resumo do livro).
- Caravana só leva madeira, minério ou comida: rotas que não supririam nada são recusadas.
## Correções (armazém compartilhado, horário, rebelião, noclip)
- **Sem dívida de recursos**: faltar suprimento só liga debuffs e o humor "descontente"; a necessidade continua a mesma.
- **Armazenamento e cofre compartilhados**: os 24 slots e o cofre de ouro são os mesmos em **todos** os armazéns (item guardado na cidade X aparece na Y). Em qualquer armazém de cidade sua dá para **gerenciar qualquer cidade sua** (botões "Gerenciar a cidade" no alto): suprimentos, produção e humor são de cada cidade; o imposto vai para o cofre único.
- **Arrastar e soltar**: mover itens (bolsa ⇄ armazenamento ⇄ slots de suprimento) é arrastando. Slot errado é recusado (ex.: comida no slot de madeira); arrastar sobre outro item **troca** quando cabe. Os botões 1/5/tudo servem para mover em lote.
- **Horário**: ao encerrar o turno do líder, o turno do comandante começa **às 8h**.
- **Rebelião**: se o turno foi encerrado na cidade que se rebelou, o jogador vai para a **cidade sua mais próxima**.
- **Noclip**: sem nenhuma colisão e pode descer abaixo do mapa até as camadas escondidas (Q desce). Encerrar o turno com noclip ligado leva ao escritório (antes parava em outro canto do mapa).