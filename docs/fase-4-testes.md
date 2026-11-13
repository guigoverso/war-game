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
## Últimos ajustes
- **Minimapa e mapa grande** mostram o **armazém** (letra **Z**); o mapa grande tem uma legenda das letras dos edifícios.
- **Couro: um slot por tipo de item que vale como couro** (hoje 2: couro e pele de lobo). A quantidade se ajusta sozinha se novos itens de couro forem criados.
- **Configurações (pausa, nos dois modos)**: aparece a **semente do mundo** com o botão **📋 Copiar**.## Fundação da Fase 4 (4I, 4H, 4A)
### 4I — Save versionado (SAVE_VERSION = 8)
- Regras no topo de `migrateSave` (`js/save.js`): cada fase que muda o estado soma 1 à versão, acrescenta um passo `if(d.v<N)` e só **acrescenta** campos (ausentes = padrão).
- `saveProblem()` valida o arquivo (corrompido, sem versão, de versão mais nova, incompleto). A janela de salvar mostra "⚠ salvamento … (não pode ser carregado)" em vez de "vazio" e deixa sobrescrever.
- Ao sobrescrever um espaço, o anterior vai para `fc_save_N_bak` (um nível de desfazer). Apagar remove os dois.
### 4H — Garantias do mundo
- Cidades sempre em terra firme (a busca de último recurso também), e **todas ligadas por estrada/ponte**: após a árvore de estradas, qualquer grupo isolado é ligado ao mais próximo (`WORLD.links`).
- Cada cidade ganha `coast` (água ao redor) e `coastal`. O **porto** é a cidade mais forte **litorânea** que não é a capital; **se nenhuma cidade for litorânea, o mundo não tem porto** (só vale para partidas novas; saves mantêm o porto).
### 4A — Ações do líder
- Tudo em `ECON.act` (`js/rounds.js`): capital 1, evoluir cidade 1, caravana 0 (só ouro; troque para 1 se quiser que gaste ação). Porto, paz e guerra não gastam. Funções `canAct`/`spendAct`.
- **Evoluir cidade** (aba Cidades, só cidades suas que não são a capital): ◉200 × nível, 1 ação, nível máx. 3, **5% de desconto nas lojas por nível**. Não sobe o nível do líder. A capital também dá o desconto conforme o nível dela.
- As ações restantes (◆) aparecem em todas as abas do livro no turno do líder.
- Testado: seeds 11 e 5 (cidades ligadas, porto litorâneo), gasto de ação e ouro, desconto de 5%, salvar/validar versões antigas e inválidas; console sem erros.
## 4B — Motor de decisões e Políticas locais (SAVE_VERSION = 9)
Arquivo novo: `js/policies.js`. Textos e números aprovados: `docs/politicas-locais.md`.
- **Sorteio:** no começo do turno do Líder (rodada ≥ 1), 30% de chance (`POL.chance`). Determinístico pela semente e pela rodada (recarregar não "rerrola"). Evita repetir a política da rodada anterior; respeita recargas por cidade (`cool`).
- **Cartão:** janela com narrativa e 3 opções (A, B, C) com o tipo (Buff, Debuff, Buff + Debuff, Neutro), o efeito, o custo e o motivo se estiver bloqueada. **O turno do Líder só encerra depois de decidir** ("Decidir depois" fecha a janela; o Resumo do livro tem o botão "Abrir"). Opções com `preview` mostram um resumo antes de confirmar.
- **Efeitos temporários** (5 rodadas, `POL.dur`): necessidade (`need`), sem imposto (`noTax`), sem produção (`noProd`), preço de lojas (`price`), ouro por rodada (`gold`) e bandeiras livres (`polFlag`) para as próximas políticas. Aparecem em "Efeitos ativos" no Resumo do livro; o relatório da rodada avisa quando terminam.
- **Execução no turno do Comandante (⏱):** `onStart` da opção escolhida é guardado em `STATE.pol.queue` e roda assim que o jogador sai do escritório (`polRunQueue`). Teleporte, combate e soldados novos usarão isso.
- **Para criar uma política:** chamar `definePolicy({...})` (ver o cabeçalho de `policies.js`). Há um aviso no console se a política não tiver 3 opções ou nenhuma gratuita.
- **Política de exemplo ativa:** *Comerciantes estrangeiros* (as outras 9 entram na 4C). **Testar:** criativo → pausa → *Ir ao escritório do líder* → *Sortear política agora*.
- Testado por script: janela, bloqueio de encerrar o turno, desconto de 15% e sua duração de 5 rodadas, opção B (ouro e perda de 5 suprimentos, bloqueada sem estoque), resumo antes de confirmar, `onStart` rodando ao sair do escritório, recarga por cidade, salvamento do estado; console sem erros.
- **Pagar sem ter o ouro:** nas políticas o jogador pode escolher uma opção paga mesmo sem saldo. O ouro fica negativo (dívida), que bloqueia compras até ser paga; o cartão avisa "💳 vai gerar dívida".
- **Modo criativo → "Cidades sempre supridas":** liga/desliga. Ligado, as cidades contam como supridas ao encerrar a rodada (sem debuffs, descontentamento ou rebelião) e o livro mostra "suprida". O estoque real continua sendo usado quando existe.
- **A política não abre sozinha:** ao sortear, surge uma **notificação no canto superior direito** ("📜 Política a decidir") e um aviso na tela. Abra o livro na mesa (E): o Resumo tem o botão "Abrir". Tentar **Encerrar turno** sem decidir é bloqueado e abre o cartão. (Corrige o mouse que não aparecia: a janela abria no mesmo instante em que o jogo travava o cursor.)
- **Modo criativo → "Disparar evento na próxima rodada":** liga/desliga; no próximo turno do Líder uma política é sorteada com certeza.
## 4C, etapa 1 — Colheita farta, Festival, Refugiados, Epidemia + escala de humor
- **Políticas ativas (5):** Comerciantes estrangeiros, Colheita farta, Festival, Refugiados, Epidemia (textos e efeitos em `docs/politicas-locais.md`). Faltam: Rebelião, Traição de um oficial (etapa 2) e Raid em ondas, Ataque às caravanas, Dungeon dourada (etapa 3).
- **Escala de humor:** Próspera (3), Contente (2), Descontente (1). Faltando suprimentos, o nível cai a cada rodada seguida: Descontente (1) → (0) → (−1) → **rebelião na 4ª rodada** (`ECON.rebelUps`; antes eram 2). Os efeitos de 0 e −1 ainda são os do nível 1 (a mudar depois, como anotado). A capital não se rebela.
- **Felicidade das políticas:** sobe/desce o humor um degrau (entre Descontente e Próspera) já nesta rodada e no próximo fechamento, **sem mexer na contagem de rebelião**. Cidade que fecha a rodada com falta continua Descontente. O Festival grande mantém a cidade Próspera por 5 rodadas (se suprida).
- **Epidemia:** A (−◉120, comida +50%); B (quarentena: sem produção, imposto e recrutamento; curas +50%); C (5 rodadas só na cidade: caravanas destruídas e proibidas, clínica fechada, soldados recrutados morrem, sem recrutar, Descontente +1 passo da rebelião, sem produção/imposto, porto parado). Recarga de 10 rodadas na cidade (A e B) ou 5 (C).
- **Refugiados A (⏱):** +2 soldados no quartel da cidade quando o turno do Comandante começa (respeita o máximo do exército).
- Testado por script: cada opção, dívida ao pagar sem ouro, humor e rebelião (níveis 1, 0, −1), clínica fechada, recrutamento bloqueado.
## 4C, etapa 2 — Rebelião e Traição de um oficial
- **Rebelião** (cidade sua, não a capital, que já esteja descontente): A (−◉150, sem imposto por 5 rodadas, descontentamento zera); B **Reprimir** (a cidade não se rebela por falta e continua pagando imposto; as necessidades de cada recurso sobem 50% por rodada, até 300%, sem sortear necessidades; **dois recursos em 300% → os oficiais se juntam e a cidade se rebela**; suprindo tudo numa rodada, a repressão acaba e os valores voltam); C (nada). O Resumo do livro lista as cidades sob repressão.
- **Traição de um oficial** (precisa ter soldados; cidade sua sorteada): A (perde metade dos soldados, felicidade da cidade +1); B (melhorar soldados −20%, recrutar +20% por 5 rodadas, felicidade −1); C (perde 30% do ouro do cofre, felicidade −1).
- Testado por script: elegibilidade da rebelião, A, repressão até a rebelião (rodada 3 nas necessidades 150/200/100) e o fim da repressão ao suprir; as 3 opções da traição.
## 4C, etapa 3 (parte 1) — Raid de bandidos em ondas
- **Todas as raids agora são em 3 ondas, sem reposição** (`RAID_WAVES` em `js/raids.js`): **5** bandidos por 1 entrada, **10** (5 por 2 entradas) e **15** (5 por 3 entradas), com **30 s** de intervalo entre as ondas (`RAID_GAP`) para curar e recrutar. As entradas são os portões da cidade (N/S/E/W). O HUD mostra a onda e a contagem do intervalo.
- **O sorteio automático por dia foi desligado** (`RAID_AUTO=false`): as raids vêm da política "Raid de bandidos" (e do botão criativo "Iniciar raid agora"). **Morrer durante o raid o perde** (−◉120, −15% dos suprimentos, cidade em chamas).
- **Política Raid de bandidos:** A ⏱ (você é levado à cidade e enfrenta as 3 ondas; vitória ◉40 + 30 × nível); B (−◉100, sem ataque); C (**resumo da batalha antes de confirmar**: poder dos soldados = soldados × 3 × melhorias de dano (+25% por nível) × vida (+15% por nível) × colete (×1,15) contra o dos 30 bandidos (+10% por nível da cidade); vencendo, nada muda; perdendo, −15% dos suprimentos e fumaça).
- Testado por script: ondas 5/10/15 nos lados N, N+S e E+N+S, intervalo de 30 s, recompensa, derrota ao morrer, resumo de derrota e de vitória, onStart do A.
- Faltam: Ataque às caravanas (3 ondas de 3, 6 e 9 saindo da caravana) e Dungeon dourada.
## 4C, etapa 3 (parte 2) — Ataque às caravanas
- **Política** (só sorteia com rota ativa; a rota é sorteada e fica no cartão): A (−◉100, a rota continua); B ⏱ (−◉120; no início do turno do Comandante você é levado ao lado da caravana e os bandidos saem dela em **3 ondas de 3, 6 e 9**, com **15 s** entre elas (`CVB_GAP`, proposto); vencendo, as duas cidades da rota (suas) recebem **+2 do que produzem por rodada durante 5 rodadas**; **morrendo, a rota é desfeita**); C (a rota é desfeita, sem reembolso).
- Durante a emboscada não dá para encerrar a rodada. Seus soldados são chamados quando um bandido te vê, como nos raids.
- O motor ganhou **dados extras no cartão** (`def.data`), usados aqui para guardar a rota sorteada.
- Testado por script: elegibilidade (só com rota), as 3 ondas (3/6/9) e o intervalo, pagamento de +2 por rodada, derrota ao morrer (rota desfeita) e a opção C.
- Falta só a **Dungeon dourada**.
## 4C, etapa 3 (parte 3) — Dungeon dourada (as 10 políticas estão prontas)
- **Política** (precisa de espaço para a região das dungeons e nenhum portal dourado aberto): A **Explorar** (um **portal dourado** aparece no mapa, a 30–110 blocos da cidade sorteada, com brilho e coluna de luz dourados; fica lá **até você pegar o tesouro**, sem expirar e sem ser trocado a cada rodada); B (−◉150, +◉50 por rodada por 5 rodadas, necessidade de comida da cidade +100% no mesmo período); C (nada).
- **Dentro:** é uma dungeon normal, mas o fundo tem um **tesouro dourado** (o baú, todo dourado) que só dá **◉200** (`GOLD_PORTAL_AMT`), sem itens. Depois de pegar, o portal se desfaz.
- **Disputa pelo portal:** ao chegar a menos de 45 blocos, surgem **10 tropas**: 4 bandidos e 3 soldados de cada uma de duas cidades diferentes (cores de uniforme por nível da cidade). Cada tropa luta com a mais próxima de outro grupo (até 32 blocos) e, sem ninguém por perto, ataca você; seus soldados também as enfrentam. **Não é guerra** (nada muda nas cidades ou relações). Acontece uma vez por portal; quando todas morrem, uma mensagem avisa que o caminho está livre. As tropas vivas não são salvas (nascem de novo só se o portal for "disputado" outra vez, o que não ocorre).
- Testado por script: criação do portal e do visual, persistência entre trocas de portais e no salvamento, disputa (4/3/3, alvos entre equipes), fim da disputa, tesouro dourado (+◉200, sem item, portal desfeito) e a opção B. Não testei a luta entre as tropas em tempo real (o jogo fica pausado na aba de preview).
