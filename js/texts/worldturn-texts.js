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
// Resumo do livro (etapa 8.3, RASCUNHO a aprovar): o comandante caiu mas o batalhão sobreviveu (forma 1 = desacordado no campo; forma 2 = o sacrifício dos soldados o salvou).
const txtWtFainted = (nome, form) => form === 2 ? '🩹 Em ' + nome + ' o comandante caiu, mas a tropa o tirou de lá com vida.' : '🩹 Em ' + nome + ' o comandante foi achado desacordado e levado de volta.';
// Resumo do livro: batalhão novo.
const txtWtCreated = nome => '🪖 Um novo batalhão se formou em ' + nome + '.';
// Painel do mapa mundi: contador de ações e botão de encerrar o turno.
const txtWtActions = (left, max) => '⏳ Ações: <b>' + left + '</b> / ' + max;
// Opções do menu de clique direito no mapa (sem nada selecionado): pular UMA ação do jogador (os NPCs agem) e, sem ações sobrando, encerrar o turno.
const TXT_WT_SKIP = '⏭ Encerrar ação';
const TXT_WT_END = '⏭ Encerrar turno';
// Painel do encontro: título e botões (a luta de verdade no tile vem na etapa 8; por ora dá para resolver por número, para teste).
const txtWtEncTitle = (layout, n) => (layout === 'defesa' ? 'Defesa da cidade' : layout === 'invasao' ? 'Invasão' : 'Encontro no campo') + ' — ' + n + ' inimigos';
const TXT_WT_ENC_AUTO = 'Resolver por número (teste)';


// Resumo do livro: o batalhão explorou o tile (nome do tile).
const txtWtExplored = nome => '🔍 O batalhão vasculhou os arredores de ' + nome + '.';
// Painel de Ações: aviso de que o batalhão está dentro do tile e o botão de sair (a exploração de verdade, no mapa local, liga na etapa 8).
const txtWtInTile = nome => '📍 No tile: ' + nome;
const TXT_WT_LEAVE = 'Sair do tile';
// Menu do botão direito no tile do batalhão ativo: entrar no mapa local do tile (gasta 1 ação; etapa 8.1).
const TXT_WT_ENTER = '🚪 Entrar no tile';

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

// Tela de carregamento ao entrar num tile (3 soldados correndo no centro; o texto fica embaixo). nome = tile de destino. Aprovado em 2026-11-26.
const txtTileLoading = nome => 'Marchando para ' + nome + '...';

// ---------- Modo Líder no mapa mundi (etapa 8.2): caixa de batalhões no turno do Líder (js/ui/mundoturno.js, wm3LeadHud). RASCUNHOS, a aprovar ----------
// Título da caixa: quantos batalhões você tem e o máximo do nível da facção.
const txtWtLeadTitle = (n, max) => '🪖 Batalhões: ' + n + ' / ' + max;
// Linha de cada batalhão da caixa: número, soldados e onde está.
const txtWtLeadRow = (i, n, nome) => 'Batalhão ' + i + ' — ' + n + ' soldados — ' + nome;
// Botão de criar um batalhão no tile selecionado (cidade ou vila sua). ouro e ponto = o custo (0 = não custa).
const txtWtLeadCreate = (ouro, ponto) => '➕ Criar batalhão aqui' + (ouro || ponto ? ' (' + [ouro ? '◉' + ouro : '', ponto ? ponto + ' ponto' : ''].filter(Boolean).join(' + ') + ')' : '');
// Botões de doar soldados entre dois batalhões do mesmo tile: n soldados (ou todos) do batalhão a para o b.
const txtWtLeadDonate = (a, b, n) => '↪ Doar ' + (n ? n : 'todos') + ' do ' + a + ' ao ' + b;

// ---------- Encontro vira batalha e morte (etapa 8.3). APROVADOS em 2026-11-27 (com ajustes do usuário) ----------
// Botão do painel de Ações quando há um encontro pendente: entrar no tile e lutar de verdade.
const TXT_WT_ENC_FIGHT = '⚔ Lutar';
// Tela de morte NARRATIVA (sem listar o que se perdeu). titulo/botao: forma 1 e 2; campo = forma 1 (caiu fora de batalha: os soldados o acharam e levaram de volta, os
// inimigos já tinham saqueado o corpo); poi = forma 2 (perdeu a batalha da posição mas o sacrifício dos soldados o tirou de lá); sozinho = foi à posição sem tropa e o
// batalhão se desfez. A forma 3 usa o texto de cada batalha (TXT_BATTLE_LOSE).
const TXT_WT_DEATH = {
  titulo: 'VOCÊ CAIU', botao: 'Continuar',
  campo: 'Quando a escuridão se desfez, havia rostos conhecidos em volta. Os seus soldados o tinham achado caído no campo e carregado de volta. Quem o derrubou já havia passado pelo seu corpo, levando o que achou de valioso.',
  poi: 'A posição não caiu, e o comandante também não, por muito pouco. Foi o sacrifício dos soldados que cobriram a retirada que o trouxe vivo de volta, e o preço deles ainda pesa.',
  // sozinhoBatalha = foi a uma batalha grande sem soldado algum; campoSozinho = caiu fora de batalha sem soldado algum (ninguém o carregou de volta). RASCUNHOS, a aprovar
  sozinhoBatalha: 'Estava sozinho diante deles, e o fim era previsível. Seu corpo ficou ali jogado, sem honra, sem enterro, esquecido pelo tempo.',
  campoSozinho: 'Quando a escuridão se desfez, não havia rosto conhecido por perto, ninguém para carregá-lo de volta. Foi se arrastando que ele voltou. Quem o derrubou já havia passado pelo seu corpo, levando o que achou de valioso.',
  sozinho: 'Foi sozinho contra a posição, e o fim era previsível. O batalhão desapareceu junto com o seu comandante, e seu corpo ficou ali jogado, sem honra, sem enterro, esquecido pelo tempo.'
};
