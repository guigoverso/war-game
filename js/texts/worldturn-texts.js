'use strict';
// ---------- Textos: turno do Comandante no mapa mundi (etapa 7; js/macro/worldturn.js e js/ui/mundo3d.js) ----------
// RASCUNHOS, a aprovar. Cada texto tem um comentário acima: onde aparece e para que serve. Os do resumo vão para o livro (rdNow), sem toast.

// Resumo do livro: o batalhão se moveu. nome = tile de destino.
const txtWtMoved = nome => '🚩 O batalhão marchou até ' + nome + '.';
// Resumo do livro: encontro com um bando (campo). nome = tile.
const txtWtEncounter = (nome, n) => '⚔ Em ' + nome + ' demos de cara com um bando de ' + n + ' homens armados.';
// Resumo do livro: o bando caiu sobre uma cidade nossa que tinha batalhão.
const txtWtAmbush = (nome, n) => '⚔ Um bando de ' + n + ' homens caiu sobre ' + nome + ' e encontrou o batalhão de pé.';
// Resumo do livro: bandidos pegaram uma caravana no caminho.
const txtWtCaravanLost = nome => '🛒 Uma caravana foi tomada por bandidos perto de ' + nome + '.';
// Resumo do livro: vitória do batalhão. baixas = soldados perdidos.
const txtWtWon = (nome, baixas) => '🏁 Vencemos em ' + nome + (baixas ? ' e enterramos ' + baixas + ' dos nossos.' : ' sem perder ninguém.');
// Resumo do livro: o comandante caiu. ouro = quanto custou um novo.
const txtWtDead = (nome, ouro) => '💀 O comandante caiu em ' + nome + '. O batalhão se desfez' + (ouro ? ' e um novo comandante custou ◉' + ouro + '.' : '.');
// Resumo do livro: batalhão novo.
const txtWtCreated = nome => '🪖 Um novo batalhão se formou em ' + nome + '.';
// Painel do mapa mundi: contador de ações e botão de encerrar o turno.
const txtWtActions = (left, max) => '⏳ Ações: <b>' + left + '</b> / ' + max;
const TXT_WT_END = 'Encerrar turno';
const TXT_WT_LEADER = 'Turno do Líder: crie ou reforce batalhões nas suas cidades.';
// Painel do mapa mundi: lista de batalhões (nome do tile, soldados).
const txtWtBat = (i, nome, n, ativo) => (ativo ? '▶ ' : '') + 'Batalhão ' + i + ' — ' + nome + ' (' + n + ')';
// Painel do encontro: título e botões (a luta de verdade no tile vem na etapa 8; por ora dá para resolver por número, para teste).
const txtWtEncTitle = (layout, n) => (layout === 'defesa' ? 'Defesa da cidade' : layout === 'invasao' ? 'Invasão' : 'Encontro no campo') + ' — ' + n + ' inimigos';
const TXT_WT_ENC_AUTO = 'Resolver por número (teste)';

// Painel do turno (mapa mundi 3D): recusas de movimento (nota no painel, sem toast), botões do turno do Líder e do Comandante.
const TXT_WT_WHY = { 'sem-acao': 'Sem ações para andar.', 'sem-caminho': 'Não há caminho por terra até lá.', turno: 'Agora não dá.', 'sem-batalhao': 'Sem batalhão para mandar.' };
const TXT_WT_BEGIN = 'Começar o turno do Comandante';
const txtWtCreate = (nome, preco) => '＋ Batalhão em ' + nome + (preco ? ' (◉' + preco + ')' : ' (grátis)');
const TXT_WT_WHY_CREATE = { teto: 'Batalhões demais para o nível da facção.', ouro: 'Falta ouro.', cidade: 'Só em cidade sua.', turno: 'Só no turno do Líder.' };

// Botão de configuração do mapa mundi: velocidade das marchas (batalhão e NPCs). x = multiplicador.
const txtWtSpeed = x => '⚙ Velocidade: ' + x + 'x';

// Resumo do livro: o batalhão explorou o tile (nome do tile).
const txtWtExplored = nome => '🔍 O batalhão vasculhou os arredores de ' + nome + '.';
// Painel do turno: botão de explorar o tile e, dentro dele, o de sair (a exploração de verdade, no mapa local, liga na etapa 8).
const TXT_WT_EXPLORE = '🔍 Explorar o tile';
const txtWtInTile = nome => '📍 No tile: ' + nome;
const TXT_WT_LEAVE = 'Sair do tile';

// Painel do tile no mapa mundi, parte do que foi escolhido no menu do tile (clique esquerdo). Cargas das caravanas por recurso.
const TXT_WT_CARGO = { food: 'Comida', ore: 'Minério', wood: 'Madeira' };
const TXT_WT_BANDITS = 'Bandidos';
// Linha do menu do tile: seu batalhão, batalhão de outra facção, caravana (facção dona) e bando (homens).
const txtWtMenuMine = (i, n) => '🛡️ Seu batalhão ' + i + ' (' + n + ')';
const txtWtMenuBat = dono => '⚔ Batalhão — ' + dono;
const txtWtMenuCaravan = dono => '🛒 Caravana — ' + dono;
const txtWtMenuBand = n => '☠ Bando de bandidos (' + n + ')';
// Informações de um batalhão/bando/caravana escolhido no menu (aparecem sob as informações do tile). d = {titulo, dono:{name, css}, linhas:[[rótulo, valor]]}.
const txtWtEntInfo = d => '<div class="wm3-head" style="font-size:15px;padding:6px 14px">' + d.titulo + '</div><div class="wm3-body"><div class="wm3-row"><i>🏴</i><span>Facção</span><b>'
  + '<span class="wm3-sw" style="background:' + d.dono.css + '"></span>' + d.dono.name + '</b></div>'
  + d.linhas.map(l => '<div class="wm3-row"><i>' + l[0] + '</i><span>' + l[1] + '</span><b>' + l[2] + '</b></div>').join('') + '</div>';
