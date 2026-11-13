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
## Ajuste da economia (passo 2) e caravanas com guardas
Todos os números ficam juntos em `ECON` (início de `js/rounds.js`) para ajustar com facilidade.

| Parâmetro | Antes | Agora |
|---|---|---|
| Necessidade (100%) | 10 unidades | **4** (150% = 6, 200% = 8), com o couro |
| Produção em abundância | 5 + nível | **7 + nível** (+1 se próspera) |
| Ouro por unidade na cidade de foco dinheiro | ×10 | **×8** |
| Imposto por rodada | 20 + 10/nível | **25 + 10/nível** (×1,5 próspera, 0 descontente) |
| Caravana | ◉200 | **◉300** |
| Preços na Loja (carne / tronco / minério) | 7 / 9 / 12 | **6 / 8 / 10** |

Por quê (semente de teste, 7 cidades): antes a necessidade total era 225 unidades/rodada para ~53 de produção (déficit de ~170 unidades ≈ ◉1.500 contra ◉360 de imposto: impossível). Agora, com as 7 cidades: necessidade 135, produção 58, déficit ~77 unidades (≈ ◉600 comprando tudo na Loja) contra ~◉395 de imposto: **fecha na faixa de caravanas, cidades prósperas e quests**, e uma cidade sozinha (a capital: necessidade 18, produção 8) se sustenta com uma caçada/pesca por rodada. O que observar jogando: se faltar tempo para suprir 4+ cidades, aumente a produção; se sobrar ouro, diminua o imposto ou suba os preços.

**Caravanas**: cada acordo cria **duas caravanas**, uma saindo de cada cidade (logo depois dos muros, rumo à outra) com a **bandeira da cidade** e **3 guardas dessa cidade** parados em volta, de guarda.
## Ajustes seguintes (caravanas, lojas e necessidades variáveis)
- **Kit inicial removido.**
- **Lojas limitadas**: carne, tronco e minério têm **estoque por cidade**, que depende da produção dela: o recurso de foco da cidade = (7 + nível) × 2; os outros = 25% disso; cidade de foco dinheiro = 50% de cada. O estoque é **reabastecido a cada rodada** e aparece no cartão do item ("Em estoque"). Esgotou, só na próxima rodada. (`ECON.shopMul`)
- **Necessidades por dado**: a cada rodada, cada cidade (menos o porto, que é do jogador) **sorteia** qual recurso pesa mais: os valores 200%/150%/100% são redistribuídos entre os recursos que ela precisa (o foco continua em 0). Veja o livro no começo de cada rodada.
- **Caravanas**: ficam **no meio da estrada** entre as cidades, **sempre sobre a estrada** (inclusive pontes), em trecho plano e livre de pedras/árvores; o trecho mais plano disponível é escolhido quando a estrada é íngreme. Cada uma carrega a bandeira da sua cidade e tem 3 guardas parados em volta.
- **Mapa da caravana**: ao lado do nome de cada cidade aparece o **ícone do que ela troca** (o recurso de foco). Ao escolher a origem e o destino, abre o **resumo da negociação**: o que cada cidade dá e recebe, o efeito nas necessidades e o preço, com "Fechar acordo" ou "Voltar ao mapa".
## Regras novas de caravana
- **Necessidades**: a caravana que traz o recurso mexe na necessidade dele conforme o valor da rodada: **150% some**, **200% cai para 100%**, 100% não muda (as necessidades são sorteadas a cada rodada, então o efeito varia). O resumo da negociação mostra o valor de hoje.
- **Ouro**: negociar com uma cidade que **produz ouro** rende **ouro por rodada** no cofre (metade da produção de ouro dela, `ECON.tradeGold`). A **cidade de ouro** do jogador com acordo **não rende imposto** (e não ganha esse bônus).
- Corrigido: acordo com cidade de ouro era recusado em silêncio e as mensagens (toasts) **não apareciam no escritório nem sobre o livro e o mapa**; agora aparecem sempre.
## 4º recurso: Couro (e a nova regra da caravana)
- **Necessidades**: 🌾 comida, ⛏ minério, 🪵 madeira e 🟤 **couro**. Uma cidade de foco físico tem 3 necessidades sorteadas em 200% / 150% / 100% a cada rodada; a de foco dinheiro tem 4 (200/150/100/100). `ECON.baseNeed` caiu para **4** (100% = 4, 150% = 6, 200% = 8) para manter a carga total parecida (≈130 unidades com 7 cidades).
- **Itens**: couro e pele de lobo contam 1 de couro (um slot de couro no armazém, como madeira e minério). A Loja vende couro (◉7, estoque limitado pela produção da cidade). Cidades de foco couro produzem couro.
- **Bônus e debuff**: entregar acima da meta → 🟤 **coletes 20% mais baratos** (o seu e os dos soldados); faltar → coletes custam o **dobro**.
- **Caravana**: o efeito no recurso trazido agora é **100% some • 150% cai para 100% • 200% cai para 150%**. Antes de fechar o acordo aparece **uma tabela** por cidade com a necessidade, o valor com a caravana e as unidades por rodada (a linha de hoje destacada).