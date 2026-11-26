'use strict';
// ---------- Galeria dos cenários da batalha no tile (feature 12, seção 5; como cenarios-pois.js, mas sem fotos) ----------
// Gera cenarios-batalha.html na raiz: um cartão com link por cenário. Cada passo da ordem de implementação acrescenta os seus cenários na lista abaixo
// (status 'pronto' vira link; 'pendente' aparece apagado). Uso: cd tests && node cenarios-batalha.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CENARIOS = [
  { passo: 1, status: 'pronto', t: 'Núcleo: um gerador, lote ajustável, FPS com 100', q: 'cenario=batalha&modo=nucleo',
    d: 'Um gerador inimigo (raio vermelho no chão; coleira laranja). Entre no raio e ele lança lotes de 3 a 5 até 30 vivos; ao sair do raio x 1,3 eles voltam. '
      + 'Reserva inimiga 100; seu batalhão 50 (10 elites + 40 de reserva). Teclas: [ ] lote, - = atraso, V/X ordem aos soldados. Parâmetros: &inim= &reserva= &alia= &vivos= &vivosalia= &lote=4 &atraso=2 &semente=7 &raios=0' },
  { passo: 2, status: 'pronto', t: 'Choque: 3 postos por lado e centro', q: 'cenario=batalha&modo=choque',
    d: '3 postos seus (azul, oeste) e 3 do inimigo (vermelho, leste) mandam lotes de 3 a 5 ao centro (círculo branco), com 8 a 15 peças de cobertura espelhadas fora das rotas. '
      + 'Reserva inimiga 100 (dividida nos postos); seu batalhão 50 (10 elites + 40 nos postos). Teclas: [ ] lote, - = atraso, V/X ordem. Parâmetros: &inim= &reserva= &alia= &vivos= &vivosalia= &lote= &atraso= &semente= &cobertura=N &raios=0' },
  { passo: 3, status: 'pronto', t: 'Defesa: teleporte, barreira, 3 postos atacantes', q: 'cenario=batalha&modo=defesa',
    d: 'Você nasce no centro do POI defendido (bandeira). 3 postos inimigos fora da área (círculo azul) mandam lotes de 3 a 5. Zona cinza de 20 blocos além da borda: aviso ao entrar, fuga (derrota) ao atravessar. Ordem V só vale dentro da área. Parâmetros: &inim= &reserva= &alia= &vivos= &vivosalia= &lote= &atraso= &semente= &raios=0' },
  { passo: 4, status: 'pronto', t: 'Ataque: POI alvo e 3 satélites', q: 'cenario=batalha&modo=ataque',
    d: 'Com batalhão no tile (padrão) a guarnição do alvo (12) é completada até 30 com soldados da reserva (total 112, não 130) e 3 satélites (100 a 150 do alvo) mandam reforços em lotes à medida que morrem; matar a guarnição conquista o alvo '
      + '(notificação se ainda vêm reforços); vence zerando tudo. Sem batalhão (&batalhao=0) só a guarnição de 12. Você nasce na sua cidade e caminha até o alvo (&pos=trilha começa perto dele). Parâmetros: &pos=trilha &batalhao=0 &inim= &guarnicao= &reserva= &alia= &vivos= &vivosalia= &lote= &atraso= &semente= &raios=0' },
  { passo: 5, status: 'pronto', t: 'IA dos atiradores: cobertura e carregador', q: 'cenario=ia',
    d: '7 atiradores inimigos (4 soldados, franco-atirador, saqueador, metralhador) a leste, 8 peças de cobertura no meio e você sozinho a oeste. Eles procuram abrigo (raio ~20), atiram de lá, recarregam 2 a 3 s quando o carregador acaba e, se você some por 10 a 15 s, avançam devagar até o último ponto visto. Comparar: &abrigo=0 e &carregador=0' },
  { passo: 6, status: 'pronto', t: 'Aliados: carregador e cobertura', q: 'cenario=ia&aliados=1',
    d: 'Como o passo 5, mas com 5 soldados seus (&alia=N) em assalto contra os 7 atiradores. Os soldados usam o carregador da arma (4 a 12 tiros, recarga 2 a 3 s) e, em combate, procuram abrigo num raio curto (9); nunca durante a ordem V nem em posto fixo. Comparar: &abrigo=0 e &carregador=0' },
  { passo: 7, status: 'pronto', t: 'Batalha pequena: defesa local, POI mais forte', q: 'cenario=batalha&modo=pequena',
    d: 'Só você e as 10 elites contra a defesa fixa do POI (10 soldados com vida x1,75), sem reposição e sem placar. A defesa acorda no raio de alerta (40). Conquista = matar toda a defesa. Derrota branda (tela com Reiniciar no protótipo). Parâmetros: &guarnicao= &alia= &semente= &raios=0' },
  { passo: 8, status: 'pronto', t: 'Arredores de defesa: fortaleza de facção em guerra', q: 'cenario=tile&tema=fortaleza&seed=11&forma=pangeia&auto=1&dono=faccao&guerra=1',
    d: 'Principal (forte) de facção com trincheira em quadrado em volta e barricada onde a estrada cruza (guerra com você). Trechos sem chão firme (água, desnível > 5) ficam de fora. Variações: &guerra=0 (estrada livre, só trincheira), &dono=bandit ou &dono=player (sem arredores). Teste: node tests/batalha-arredores.js' },
  { passo: 11, status: 'pendente', t: 'Recrutamento com regras e limites', q: 'cenario=recrutamento', d: '' }
];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const card = c => c.status === 'pronto'
  ? `<div class="c"><p><b>Passo ${c.passo}</b><br><a href="/?${c.q}">${esc(c.t)}</a><br><small>${esc(c.d)}</small><br><small>?${c.q}</small></p></div>`
  : `<div class="c off"><p><b>Passo ${c.passo}</b> (pendente)<br>${esc(c.t)}<br><small>?${c.q}</small></p></div>`;
const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Cenários da batalha no tile</title>
<style>
body{font-family:sans-serif;background:#1d2128;color:#e8e8e8;margin:20px}h1{font-size:20px}p{max-width:960px;color:#b8c0cc}
.g{display:flex;flex-wrap:wrap;gap:14px}.c{width:384px;background:#2a303a;border-radius:6px;padding:8px}.c.off{opacity:.45}
.c a{color:#ffd24a;font-weight:bold}.c small{color:#9aa4b2;word-break:break-all}
</style></head><body>
<h1>Cenários da batalha no tile</h1>
<p>Cada cartão abre o jogo num cenário de teste (precisa de servidor estático: <code>npx serve -l 3000 (ou python -m http.server 3000)</code> e abrir <code>http://localhost:3000/cenarios-batalha</code>).
Especificação em <code>docs/features/12_batalha-no-tile.md</code>. Gerada por <code>cd tests &amp;&amp; node cenarios-batalha.js</code>; cada passo acrescenta os seus cenários.</p>
<div class="g">${CENARIOS.map(card).join('')}</div></body></html>
`;
fs.writeFileSync(path.join(ROOT, 'cenarios-batalha.html'), html);
console.log('cenarios-batalha.html gerado (' + CENARIOS.filter(c => c.status === 'pronto').length + ' pronto, ' + CENARIOS.filter(c => c.status !== 'pronto').length + ' pendentes)');
