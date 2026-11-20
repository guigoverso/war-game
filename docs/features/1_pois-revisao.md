# Revisão dos tipos de POI

**Status:** em discussão (design). Ainda não implementado.
**Fase:** 6 (guerra). Substitui a tabela "Tipos de POI (decidido)" de `docs/fase-6-guerra.md` quando for aprovada.

## Por quê
Alguns POIs da lista atual pareciam deslocados. A ideia dos POIs é serem **entrepostos das cidades no campo, que dão bônus à facção dona**, ou **pontos de exploração**. Curtume (bônus de soldados na guerra), Ferraria (serviço de reparo) e Celeiro (separado da Fazenda) não seguem essa ideia.

## O que muda

### Sai
| POI | O que acontece |
|---|---|
| Curtume | Sai. O papel de dar couro passa para o **Acampamento de caçadores**. |
| Ferraria | Sai. O desconto no reparo de armas e a bigorna com sucata deixam de existir como POI. |
| Celeiro | Deixa de ser um POI separado: vira **parte da construção da Fazenda** (ver abaixo). |

### Fazenda + Celeiro (um POI só)
- A construção da Fazenda passa a incluir o celeiro (o celeiro vermelho, os silos e o galinheiro do desenho atual do Celeiro entram no terreno da Fazenda).
- **O efeito é só o da Fazenda.** O efeito do Celeiro (reduzir as necessidades de suprimento das cidades do dono) **some**.

### Entra
| POI | Paz | Guerra | Terreno |
|---|---|---|---|
| Acampamento de caçadores | +couro por rodada | reduz o acréscimo de suprimento de couro do inimigo | borda de floresta ou de montanha |
| Santuário | +humor nas cidades do dono (efeito pequeno) | reduz a fadiga de guerra do dono | qualquer lugar plano, de preferência em morro ou à beira da estrada |

**Acampamento de caçadores.** É o posto avançado da cidade de Couro, como Fazenda, Mina e Serraria são das cidades de Alimentos, Minérios e Madeira. Com isso, cada uma das 4 necessidades das cidades (`NEEDS`: comida, minério, madeira e couro) tem um POI de produção. Sem ele, o couro ficaria sem POI depois que o Curtume sair.

**Santuário.** Traz um tema que nenhum POI tinha: **moral**. Na paz, mexe no humor das cidades, que já existe. Na guerra, mexe na fadiga de guerra, que é o freio da guerra no desenho da Fase 6 e ainda não tinha nenhum POI ligado a ela.

## Lista final (10 POIs)
| POI | Paz | Guerra |
|---|---|---|
| Fazenda (com celeiro) | +comida por rodada | reduz o acréscimo de suprimento de comida |
| Mina | +minério por rodada | reduz o acréscimo de suprimento de minério |
| Serraria | +madeira por rodada | reduz o acréscimo de suprimento de madeira |
| Acampamento de caçadores | +couro por rodada | reduz o acréscimo de suprimento de couro |
| Ponte | pedágio em ◉ | desfaz a caravana inimiga que passava por ela (sem desvio) |
| Forte | +1 soldado que surge para lutar com você | igual |
| Torre de vigia | ação "Fazer vigia" 1×/rodada: avança 4 h e marca um ponto de interesse no mapa | menos chance de a sabotagem do espião inimigo dar certo |
| Taverna | quarto no 2º andar (reservar, dormir: noite→manhã e vice-versa) | recruta soldados |
| Santuário | +humor nas cidades do dono | reduz a fadiga de guerra do dono |
| Entreposto comercial | caravanas da facção que passam por aqui dão dinheiro + serve como loja | impede jogador e inimigos de criar caravanas que passe por aqui

Continuam valendo as regras de `docs/fase-6-guerra.md`: todo efeito vale para **todas as cidades do dono**, os bônus são **pequenos**, e os POIs de guerra (acampamento fortificado e trincheira) seguem sem bônus.

# Mudanças
Ruínas antigas passam a ser encaixadas na mesma categoria de POIs de bandidos e baús perdidos, por exemplo. Só que elas serão geradas em uma quantidade menor e seu baú não reaparece com o passar das rodadas, apenas os bandidos.
Os efeitos: Baú com 30% de chance de artefato

## Perguntas em aberto
1. **Quanto o Santuário mexe no humor?** Em um momento em que a fadiga irá diminuir, haverá uma chance de 30% disso não acontecer (não acumulativo).
2. **Santuário na guerra depende da fadiga**, que ainda não foi implementada. Até lá, o efeito de guerra fica parado ou ganha um efeito provisório? Fica parado. 
3. **Limite de Santuários:** os efeitos se somam (como o limite de 3 celeiros que existia) ou valem só uma vez? Não. Se tiver +1 santuário continua o efeito como se tivesse apenas 1.
4. **O Acampamento de caçadores também serve para explorar?** Não, mas haverá um baú com comida ao ser conquistado.
5. **Reparo do colete:** hoje o curtidor no Curtume repara o colete (em ◉ ou em couro). Esse serviço passa para o Acampamento de caçadores, vai para as lojas das cidades ou sai do jogo? Sai do jogo. Apenas no quartel de uma cidade do jogador isso será possível.
6. **Reparo de armas:** o ferreiro e a bigorna com sucata da Ferraria saem do jogo ou vão para outro lugar (a loja de armas das cidades, por exemplo)? Vão para a taverna. Ao lado dela construa uma pequna área para o ferreiro (bigorna, fornalha, fuligens, um chão de pedra). A regra de conserto também muda: valor normal em ouro ou se o jogador tiver sucatas poderá pagar com elas + 60% do preço anterior. 
7. **Santuário tem gente?** Um sacerdote ou peregrinos que dão missões, ou só a construção? Sacerdotes e peregrinos.

## Impacto no código (para quando for implementar)
Só para referência; nada disso foi feito.
- `js/pois.js`: `POI_DEFS`, `POI_TYPES`, `POI_BUILD` (tirar `tannery`, `forge` e `granary`; juntar o desenho do celeiro em `farm`; criar os desenhos dos dois novos) e as regras de terreno da geração.
- `js/poigame.js`: `POIX` (`forgeDisc`, `forgeMax`, `granaryNeed`, `granaryMax`, `vest`, `civ`), `POI_PRICE`, `poiNeedMul`, o mapa de produção (`tannery:'leather'` vira o novo tipo), o desconto da ferraria (`addPriceFx`), os serviços do ferreiro, da bigorna e do curtidor.
- **Save:** saves antigos podem ter POIs `tannery`, `forge` ou `granary` em `STATE.pois`. Precisa de um passo em `migrateSave` (e +1 em `SAVE_VERSION`) que converta ou descarte esses POIs.
- `?cenario=pois` (mapa manual) e `tests/smoke.js`, que esperam os tipos atuais.
- `docs/fase-6-guerra.md`: trocar a tabela de tipos quando a revisão for aprovada.
