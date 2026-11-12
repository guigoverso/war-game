# Fase 0 — Fundação: o que foi feito e como testar

Branch: `factions-update`. Arquivos novos: `js/data.js`, `js/state.js`, `js/ui.js`, `js/save.js`. Alterados: `js/game.js`, `index.html`.

## O que existe agora
- **Estado do jogo (`STATE`)** em JSON puro: rodada, fase e os recursos alimentos/minérios/madeira.
- **Livro de recursos (`Ledger`)**: alimentos, minérios, madeira e ouro (o ouro continua sendo `P.coins`). Aceita saldo negativo (dívida). Quem está devendo em qualquer recurso **não consegue comprar nada**.
- **Preço com modificadores (`priceOf` / `addPriceMod`)**: a cidade é o primeiro modificador; os próximos sistemas (buffs, eventos, reuniões) entram aqui.
- **Contador de rodada (`Rounds`)** e **ganchos (`Hooks`)** para os sistemas se conectarem.
- **Tabelas de dados (`DATA`)** vazias, prontas para itens, receitas, eventos etc.
- **Base de interface (`UI`)**: janela, botão, confirmação, grade de slots e dica (tooltip).
- **Salvar e carregar**: 3 espaços no navegador (`localStorage`).

## O que é salvo
Jogador (posição, vida, colete, moedas), armas e munição, exército (níveis, colete e quantidade de soldados), cidades conquistadas, acampamentos (limpos, sumidos, grade aberta), baús abertos, missões (quadro, ativa e cumpridas), hora do dia, recursos e rodada.

**Limites conhecidos:** soldados e animais vivos não são guardados com posição (nascem de novo ao carregar); camps que já tinham reaparecido voltam à versão original do mundo; os sons usam a configuração própria do mixer.

## Como testar

### 1. Salvar e carregar (básico)
1. Abra o jogo, clique em **🛠 MODO CRIATIVO** (ou jogo normal) e entre.
2. Mude coisas: compre uma arma, ande para outro lugar, abra um baú, conquiste uma cidade, mude a hora (criativo: "Alternar dia/noite").
3. Abra a pausa (**Esc**, **Tab** ou **O**) → **💾 Salvar / Carregar…** → **Salvar** no espaço 1.
4. Mude mais coisas e, na mesma janela, clique em **Carregar** do espaço 1 e confirme.
5. A página recarrega e o jogo volta ao ponto salvo (título "✔ JOGO CARREGADO"). Confira moedas, posição, armas, cidade conquistada, baú aberto, hora do dia.

### 2. Carregar pela tela inicial
1. Recarregue a página (Ctrl+F5) e clique em **📂 CARREGAR JOGO**.
2. A janela mostra os espaços; "Carregar" só fica ativo nos que têm salvamento. Escolha um.

### 3. Sobrescrever e apagar
- Clique em **Salvar** num espaço já usado: aparece "Sobrescrever?". **Apagar** também pede confirmação.

### 4. Modo normal x criativo
- No **modo normal** a pausa só tem: Salvar/Carregar, Som, Volume dos sons e Estou preso. O botão de salvar também está lá.
- No **modo criativo** aparecem os truques e, no topo deles, a linha **"Rodada N • Alimentos • Minérios • Madeira • Ouro"**.

### 5. Recursos, dívida e rodada (modo criativo)
1. Na pausa, clique em **+100 alimentos, minério e madeira**: a linha dos recursos sobe.
2. Clique em **Dívida de teste (−50 ouro)** várias vezes até o ouro ficar **negativo**: aparece "⚠ EM DÍVIDA: compras bloqueadas" e, ao tentar comprar no armeiro, os botões ficam desativados.
3. Use **+1000 moedas** para sair da dívida.
4. Clique em **Rodada +1** e salve/carregue: a rodada e os recursos voltam como estavam.

### 6. Preço (função única)
Os preços das lojas continuam iguais aos de antes (cidade inimiga ×2, conquistada com desconto). Para ver o encadeamento, abra o console do navegador (F12) e rode:
```js
priceOf(100,{city:WORLD.home})                 // preço de 100 na sua cidade
addPriceMod('teste',(p)=>p*2,200); priceOf(100,{city:WORLD.home}); removePriceMod('teste')
```

### 7. Console (para desenvolvedores)
```js
STATE; Ledger.get('gold'); Ledger.borrow({gold:10}); Ledger.canAfford({gold:1})
Rounds.advance(); validateData(); readSave(1)
```

### 8. Atalhos de teste por URL
- `?auto=1` abre direto no modo criativo; `?auto=normal` no normal.
- `?load=1` carrega o espaço 1 direto (se existir).
- `?mute=1` abre sem som.

## Verificado por mim (por script, sem ouvir áudio)
Salvar → recarregar → comparar: moedas, recursos, rodada, posição, vida, soldados, níveis do exército, cidades (conquistada), acampamento limpo, baú aberto, arma comprada, hora do dia; janela de salvar/carregar (3 espaços, confirmações, apagar); carregar pela tela inicial; dívida bloqueando compras; preço com modificador; console sem erros.
