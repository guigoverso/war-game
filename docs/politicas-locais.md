# Políticas locais (Fase 4B/4C) — textos e regras aprovados

Três momentos de decisão (definidos pelo autor):
- **Política:** decisão local, só afeta a facção do jogador. Sorteada a cada rodada (30%), no começo do turno do Líder. **É o que se implementa agora.**
- **Evento:** acontecimento global que afeta todas as facções; as escolhas sobem ou descem relações. **Depois das facções (Fase 5).**
- **Reunião:** "evento proposital": o jogador escolhe um para se beneficiar, prejudicar um inimigo ou ambos. **Depois das facções (Fase 5).**

O motor de decisões (cartão com 3 opções, custo, efeitos de 5 rodadas, execução no turno do Comandante, salvamento no STATE) é o mesmo para os três.

## Regras gerais
- A decisão é tomada no **turno do Líder**; algumas opções só têm efeito no **início do turno do Comandante** (marcadas com ⏱: teleporte, combate, soldados que aparecem).
- Responder não gasta ação do líder. Efeitos temporários duram **5 rodadas**, salvo indicação.
- Cada opção tem um tipo: Buff (ganho), Debuff (perda), Buff + Debuff (ganho com perda) ou Neutro (nada muda). Nem todo evento tem todos os tipos.
- Só entram no sorteio as políticas cuja condição é verdadeira na rodada (ex.: ataque às caravanas exige rota ativa).
- "[Cidade]" é uma cidade sua sorteada.

## Humor e felicidade (decisão do autor)
- Níveis: **Próspera (3) • Contente (2) • Descontente (1)**. Se a cidade fecha a rodada sem suprir as necessidades, o nível cai: Descontente (1) → **Descontente (0)** → **Descontente (−1)** → **rebelião**.
- Efeitos de políticas que "sobem/descem a felicidade" movem o nível entre Descontente (1) e Próspera (3) e **não afetam a contagem de rebelião** (os níveis 0 e −1 só vêm da falta de suprimentos). *(interpretação a confirmar)*
- **A MUDAR DEPOIS:** o autor vai alterar os efeitos do descontentamento nos valores 0 e −1 (hoje: duas rodadas seguidas faltando = rebelião).

## Pontos a mudar depois (anotados)
- **Recrutamento de soldados:** o autor vai mudar algumas regras (hoje o exército é um número único, não pertence a uma cidade). Os eventos abaixo que mexem em "soldados recrutados" devem ser revistos junto.

## Eventos
> Implementados até agora: 1 (Rebelião), 4 (Colheita), 6 (Comerciantes), 7 (Festival), 8 (Epidemia), 9 (Refugiados), 10 (Traição). Faltam: 2 (Caravanas), 3 (Raid em ondas), 5 (Dungeon dourada).

### 1. Rebelião
*"Nas ruas de [Cidade], o descontentamento virou fúria. Panelas batem, portas são trancadas e uma multidão cerca a prefeitura exigindo pão e respostas. Se nada for feito, a revolta vai tomar a cidade inteira."*
- A. Importar suprimentos e suspender os impostos — −150 de ouro. [Cidade] fica sem imposto por 5 rodadas. O descontentamento zera.
- B. Reprimir com os soldados — [Cidade] não se rebela e não perde os impostos. As necessidades dela sobem 50% a cada rodada, sem rotação de necessidades, até 300%. Se dois recursos chegarem a 300%, os oficiais se juntam aos rebeldes e a cidade se rebela. **Se o jogador suprir todas as necessidades numa rodada, a pressão acaba e os recursos que subiram voltam ao valor de antes** (evita repetir a meta de 300% na rodada seguinte).
- C. Esperar que o povo se acalme — Nada muda. A contagem de descontentamento continua.

### 2. Ataque às caravanas (exige rota ativa)
*"Os guardas da estrada voltaram feridos, sem carga e sem metade dos homens. Bandidos emboscaram uma de suas caravanas entre [Cidade] e [Cidade], e os comerciantes juram que não voltam à estrada sem proteção."*
- A. Pagar o resgate da carga — −100 de ouro. A rota continua.
- B. Limpar a estrada ⏱ — −120 de ouro. No início do turno do Comandante, você é levado à caravana. Os bandidos surgem dela em 3 ondas de 3, 6 e 9. Se vencer, a rota rende +2 unidades do produto por rodada durante 5 rodadas. Se perder, a rota é desfeita.
- C. Desfazer a rota — A rota é desfeita, sem reembolso.

### 3. Raid de bandidos
*"Vigias acenderam os fogos de alarme: uma horda de bandidos avança sobre [Cidade]. Eles chegam por vários portões, querendo os celeiros, o cofre e o que mais conseguirem carregar."*
- **Ondas (decisão do autor):** no máximo 15 bandidos ao mesmo tempo, **sem reposição** (lógica de ondas). Onda 1: **5** bandidos, de um lado da cidade. Ao vencê-los, **30 s** de intervalo (para curar e recrutar). Onda 2: **10**, 5 de cada lado (2 entradas). Intervalo de 30 s. Onda 3: **15**, 5 de cada lado (3 entradas).
- A. Liderar a defesa ⏱ — No início do turno do Comandante, você é levado a [Cidade] e enfrenta as 3 ondas. Se defender, recebe ◉40 + 30 por nível da cidade. Se perder, perde ◉120 e 15% dos suprimentos do armazém.
- B. Pagar tributo aos bandidos — −100 de ouro. O ataque não acontece.
- C. Confiar nos soldados — Ao clicar, aparece o **resumo da batalha** (calculado na hora, ainda no turno do Líder) dizendo se os soldados vencem ou perdem; o jogador só confirma depois de ver. Cálculo: poder dos soldados (quantidade × melhorias) contra o das 3 ondas somadas. Se vencerem, nada muda. Se perderem: −15% dos suprimentos do armazém e fumaça por 4 dias.

### 4. Colheita farta
*"O verão foi generoso. Os campos de [Cidade] amarelaram antes do tempo e os celeiros mal fecham. Há grãos sobrando como não se via há anos, e os mercadores já rondam a cidade com bolsas cheias."*
- A. Estocar para os meses difíceis — +6 de comida no armazém de [Cidade].
- B. Exportar tudo — Vende toda a comida do armazém e da reserva de produção. +150 de ouro (proposto). A necessidade de comida da cidade sobe 50% por 5 rodadas.
- C. Distribuir ao povo — A felicidade de [Cidade] sobe 1.

### 5. Dungeon dourada
*"Um brilho dourado surgiu num portal de pedra perto de [Cidade]. Dizem que lá dentro o chão sangra ouro. A notícia correu mais rápido que o vento, e tropas de várias cidades e bandos de bandidos já se encaminham para disputar a entrada."*
- A. Explorar a dungeon — O portal dourado fica no mapa e você vai quando quiser no turno do Comandante. Ao chegar perto, **10 tropas** de cidades diferentes e bandidos surgem e lutam pelo portal (contra você e entre si; não conta como guerra). Dentro, é uma dungeon normal, mas a recompensa é **ouro em vez de baú** (+200, proposto).
- B. Contratar mineradores e soldados — −150 de ouro. +50 de ouro por rodada durante 5 rodadas. A necessidade de comida de [Cidade] sobe 100% no mesmo período (duração proposta).
- C. Deixar para depois — Nada muda.

### 6. Comerciantes estrangeiros
*"Uma caravana de terras distantes monta tendas na praça. Há tecidos, especiarias e ferramentas que ninguém aqui jamais viu. Seus comerciantes aceitam negociar, mas não ficam muito tempo."*
- A. Negociar acordos favoráveis — Lojas 15% mais baratas por 5 rodadas.
- B. Vender seus excedentes pelo dobro — +100 de ouro. Perde 5 unidades de suprimentos do armazém.
- C. Recusar a visita — Nada muda.

### 7. Festival
*"As ruas de [Cidade] amanheceram cheias de fitas. A tradição pede um festival no fim da colheita, com música, banquete e competições. O povo espera que o governante conceda a festa, ou ao menos não a proíba."*
- A. Financiar um grande festival — −200 de ouro. A cidade fica Próspera por 5 rodadas (imposto ×1,5, +1 de produção, 10% de desconto nas lojas).
- B. Permitir um festival modesto — Nada muda.
- C. Cancelar a festa — O descontentamento sobe 1 (a felicidade cai 1; não afeta a contagem de rebelião).

### 8. Epidemia
*"Uma febre desconhecida passa de casa em casa em [Cidade]. Os mercados estão vazios, os curandeiros não dão conta e os doentes são levados para fora dos muros. O povo olha para a prefeitura esperando uma decisão."*
- A. Pagar curandeiros e remédios — −120 de ouro e +50% de necessidade de comida. Sem outra epidemia nela por 10 rodadas.
- B. Decretar quarentena — Sem produção e sem impostos por 5 rodadas. Não é possível recrutar soldados nela; remédios e curas ficam mais caros. Sem outra epidemia por 10 rodadas.
- C. Esperar que passe — Por 5 rodadas, só em [Cidade]: caravanas dela destruídas e sem novas; sem curar nem comprar remédios; **os soldados que o jogador recrutou morrem** e não se pode recrutar mais; humor vira Descontente (se estava a um passo da rebelião, ela se rebela); sem produção nem imposto. Se for porto, ele para de funcionar.

### 9. Refugiados
*"Famílias cansadas, com trouxas nas costas, se amontoam diante dos portões de [Cidade]. Fogem de saques e de fome em terras vizinhas. Entre eles há homens fortes dispostos a pegar em armas, mas também muitas bocas para alimentar."*
- A. Acolher os refugiados ⏱ — +2 soldados grátis, que aparecem no quartel de [Cidade] no início do turno do Comandante. A necessidade de comida da cidade sobe 50% por 5 rodadas.
- B. Recusar a entrada — Nada muda.
- C. Encaminhá-los a outra cidade — −60 de ouro.

### 10. Traição de um oficial (cidade sua aleatória)
*"Na guarnição de [Cidade], um oficial foi pego desviando soldos e vendendo informações. A tropa está dividida: uns pedem justiça, outros dizem que ele tem mais amigos do que parece. Todo o seu exército espera para ver como o governante vai agir, e o povo de [Cidade] acompanha cada passo."*
- A. Punir o oficial — Perde metade dos soldados que recrutou, mas a felicidade de [Cidade] sobe.
- B. Perdoar publicamente — Melhorar soldados custa 20% menos por 5 rodadas. Recrutar custa 20% mais no mesmo período. O descontentamento de [Cidade] sobe (não afeta a contagem de rebelião).
- C. Fingir que nada aconteceu — Perde 30% do ouro armazenado e o descontentamento de [Cidade] sobe (não afeta a contagem de rebelião).
