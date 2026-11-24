'use strict';
// ---------- Tela de serviço padrão de comerciante (regra no CLAUDE.md: use sempre que pedirem uma tela de serviço) ----------
// Layout, de cima para baixo (como o Armeiro): nome do comerciante/loja (título do painel svc), moedas do comerciante (grande),
// moedas do jogador (menor e apagada), abas, itens em caixas (nome, descrição, "%" + "?" que explica o preço, botão de comprar),
// botão Voltar e, no fim do painel, Fechar. Funciona dentro de svcOpen (poigame.js): chame de dentro do render(txt, body).
// o: {gold: moedas do comerciante, tabs: [[chave, rótulo]], tab, onTab(chave), cards: [{icon, name, desc, tag, label, disabled, onBuy}], onBack}
function svcShopHeader(txt, gold) {
  txt.innerHTML = '<div class="big">' + txtShopMerchantGold(gold) + '</div><div class="svc-mine">' + txtShopPlayerGold(P.coins) + '</div>';
}
function svcShopBack(body, onBack) {
  const b = UI.button('← Voltar', 'alt', onBack); b.style.marginTop = '10px'; body.appendChild(b);
}
function svcShopView(txt, body, o) {
  svcShopHeader(txt, o.gold);
  const bar = document.createElement('div'); bar.style.marginBottom = '6px';
  for (const [k, label] of o.tabs) bar.appendChild(UI.button(label, o.tab === k ? 'gold' : 'alt', () => o.onTab(k)));
  body.appendChild(bar);
  const grid = document.createElement('div'); grid.className = 'grid';
  for (const c of o.cards) {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = '<b>' + c.icon + ' ' + c.name + '</b>' + (c.desc ? '<div class="st">' + c.desc + '</div>' : '') + (c.tag ? tagLine(c.tag) : '');
    const b = UI.button(c.label, 'gold', c.onBuy); b.disabled = !!c.disabled; card.appendChild(b); grid.appendChild(card);
  }
  body.appendChild(grid);
  svcShopBack(body, o.onBack);
}
