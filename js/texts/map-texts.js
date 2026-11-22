'use strict';
// ---------- Textos: mapa mundi e mapas locais (feature 5) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve.

// Aviso ao abrir o cenário ?cenario=batalha (toast). n = soldados inimigos, a = soldados do jogador, half = meia-largura da cidade, size = lado do mapa.
const txtTileTestOpen = (n, a, half, size) =>
  '🧪 Teste de batalha: mapa de ' + size + '. Você começa na sua cidade (canto); a cidade inimiga, de ' + (half * 2) + ' de lado, tem ' + n
  + ' soldados e a batalha começa quando você se aproximar, com ' + a + ' soldados seus. Pausa (Tab) → Facções tem os atalhos e o desempenho.';

// Cabeçalho do painel de testes do cenário (aba Facções da pausa).
const TXT_TILETEST_TITLE = '🧪 Teste de batalha (mapa local de cidade)';

// Explicação do painel de testes do cenário.
const TXT_TILETEST_HELP = 'Mede o desempenho com muitos atores. "Medir" grava a média de quadros por segundo e o tempo de atualização/desenho. '
  + 'Compare com ?inim=0&alia=0 (sem batalha).';

// Linha do relatório de desempenho. p = {fps, upd, ren, frames}, e = inimigos vivos, a = aliados vivos.
const txtTileTestPerf = (p, e, a) =>
  p.fps.toFixed(1) + ' qps • atualizar ' + p.upd.toFixed(1) + ' ms • desenhar ' + p.ren.toFixed(1) + ' ms (' + p.frames + ' quadros) • inimigos '
  + e + ' • aliados ' + a;
