'use strict';
// ---------- Textos: economia (ainda vazio) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.

// Coloque aqui os textos NOVOS de economia, suprimentos e caravanas.

// ---------- Economia por tile no mundo novo (etapa 8.4; REDAÇÃO EM RASCUNHO: a independência foi pedida narrativa pelo usuário, a aprovar) ----------
// Relatório da rodada (livro, parte "anterior"): tabela do que cada tile seu rendeu no fim da rodada. rows = [{nome, tema, gold, res:{food,ore,wood}}];
// tot = {gold, res}. Só aparece quando algum tile rendeu.
function txtTileIncomeTable(rows, tot) {
  const ic = k => resIcon(k), cel = r => [r.gold ? '◉' + r.gold : ''].concat(Object.keys(r.res || {}).filter(k => r.res[k] > 0).map(k => r.res[k] + ' ' + ic(k))).filter(Boolean).join(' &nbsp; ') || '—';
  return '<b>🌾 O que suas terras renderam</b><table class="ldt"><tr><td><small>Lugar</small></td><td><small>Renda</small></td></tr>'
    + rows.map(r => '<tr><td>' + r.nome + ' <small>(' + (TXT_TILE_THEME[r.tema] || r.tema) + ')</small></td><td>' + cel(r) + '</td></tr>').join('')
    + '<tr><td><b>Total</b></td><td><b>' + cel(tot) + '</b></td></tr></table>';
}
// Relatório da rodada: uma vila sua ficou independente por estar longe do território. nome = a vila; fac = nome da facção do jogador.
const txtVilaIndep = (nome, fac) => '🏳 ' + nome + ' nunca chegou a se sentir parte de ' + (fac || 'sua facção') + ': longe das suas estradas e das suas bandeiras, o povo cansou de esperar por ajuda e hasteou a própria.';
// Armazém único (mundo novo): área "últimos ganhos" da aba Armazenamento. g = {r, gold, items:[{id,n,put}]} ou ausente.
function txtWhGains(g) {
  if (!g || (!g.gold && !(g.items || []).length)) return '<b>Últimos ganhos</b><br><small>Nada entrou no armazém na última rodada.</small>';
  const it = (g.items || []).map(x => itemDef(x.id).icon + ' ' + itemDef(x.id).name + ' ×' + x.n + (x.put < x.n ? ' <small>(' + x.put + ' couberam)</small>' : '')).join(' &nbsp; ');
  return '<b>Últimos ganhos</b> <small>(rodada ' + g.r + ')</small><br>' + (g.gold ? '◉ ' + g.gold + (it ? ' &nbsp; ' : '') : '') + it;
}
// Livro (aba Cidades): conteúdo do armazém único, só para consulta (retirar exige entrar no armazém). sh = shOf().
function txtWhBookStore(sh) {
  const L = sh.store.filter(Boolean);
  return '<p class="ldsm"><b>📦 Armazém da facção</b> (' + L.length + '/' + WH_SLOTS + ')<br>' + (L.length ? L.map(s => itemDef(s.id).icon + ' ' + itemDef(s.id).name + ' ×' + s.n).join(' • ') : 'Vazio.') + '</p><p class="ldsm">' + txtWhGains(sh.gain) + '</p>';
}
