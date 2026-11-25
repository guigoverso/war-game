'use strict';
// ---------- Textos: batalha no tile (feature 12, docs/features/12_batalha-no-tile.md, seção 4B) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Os pop-ups de fim são RASCUNHO: o usuário aprova os textos passo a passo (4B-6).

// Rótulos do placar (canto superior, só em batalha grande): linha do topo = total vivo (em campo + reserva); depois em campo, reserva e mortos.
const TXT_BATTLE_SCORE = { field: 'Em campo', reserve: 'Reserva', dead: 'Mortos', vs: 'x' };

// Linha de ajuste em tempo real, no rodapé do placar (só nos cenários de teste). lot = [mín, máx], delay = segundos, fps = quadros por segundo.
const txtBattleTune = (lot, delay, fps) =>
  fps.toFixed(0) + ' qps • lote ' + (lot[0] === lot[1] ? lot[0] : lot[0] + '-' + lot[1]) + ' ([ ]) • atraso ' + delay.toFixed(1) + ' s (- =)';

// Notificação de vitória (toast verde, sem pop-up), na hora em que a batalha é vencida; titulo abre a frase. Rascunho por modo; "nucleo" é o cenário de teste do passo 1.
const TXT_BATTLE_WIN = {
  titulo: 'VITÓRIA',
  nucleo: 'Vitória no campo. O último soldado do gerador caiu e a reserva inimiga se esgotou.',
  ataque: 'Tile conquistado. A bandeira do povo cobre o que era do inimigo.',
  defesa: 'Invasores repelidos. A posição segue em suas mãos.',
  choque: 'Vitória no campo. O inimigo recuou e deixou a terra para você.'
};

// Pop-up de derrota (vermelho): comandante morto. Rascunho; no protótipo vem com o botão "Reiniciar".
const TXT_BATTLE_LOSE = {
  titulo: 'DERROTA',
  nucleo: 'O comandante caiu. Sem ordens, os soldados foram dispersados e a batalha está perdida.',
  choque: 'O comandante caiu no centro do campo. Sem ordens, os soldados recuaram e a batalha está perdida.',
  defesa: 'O comandante caiu defendendo a posição. Sem ordens, os soldados foram vencidos e os invasores tomaram o que era seu.',
  ataque: 'O comandante caiu diante do alvo. Sem ordens, o assalto se desfez e o tile continua nas mãos do inimigo.',
  defesaFuga: 'O comandante fugiu. No auge da batalha, ele abandonou o campo; sem ordens, os soldados foram esmagados, e o comandante foi caçado e morto na fuga.',
  botao: 'Reiniciar'
};

// Nome do POI alvo no cenário de teste do Ataque (em jogo real vem do POI).
const TXT_BATTLE_TARGET_NAME = 'Posto inimigo';
// Notificação do Ataque (aprovada em 2026-11-25): aparece ao conquistar o POI quando ainda há soldados inimigos vindo dos outros POIs.
const txtBattleTomado = nome => nome + ' tomado. Defenda a posição';

// Aviso fixo no topo da tela (Defesa), enquanto o comandante está na zona cinza, além da borda da área de defesa. Rascunho a aprovar.
const TXT_BATTLE_DEF_WARN = 'Você está saindo da área de defesa! Volte, ou será considerado fuga.';

// Explicação curta do cenário (painel de testes da pausa), por modo de batalha.
const TXT_BATTLE_HELP = {
  nucleo: 'Núcleo da batalha: um gerador inimigo (raio vermelho no chão) acorda quando você entra no raio e lança soldados em lotes, '
    + 'até a cota de vivos; ao sair do raio x 1,3 eles voltam. Ordem aos soldados: V (ponto mirado) e X (cancelar). '
    + 'Ajuste em tempo real: [ ] muda o lote, - = muda o atraso.',
  choque: 'Choque: 3 postos seus (azul, oeste) e 3 do inimigo (vermelho, leste) mandam soldados em lotes ao centro (círculo branco), onde estão as peças de '
    + 'cobertura. Vence quem zerar a reserva e os vivos do outro lado. Ordem aos soldados: V e X. Ajuste: [ ] lote, - = atraso.',
  defesa: 'Defesa: você foi levado ao centro do POI defendido (bandeira). Os atacantes saem de 3 postos vermelhos fora da área (círculo azul) e vêm em lotes. '
    + 'Além da borda azul há uma zona cinza: ao entrar nela aparece o aviso; ao atravessá-la você foge e perde. Vence zerando reserva e vivos dos atacantes. '
    + 'Ordem aos soldados (V, X) só vale dentro da área. Ajuste: [ ] lote, - = atraso.',
  ataque: 'Ataque: conquiste o POI alvo (bandeira vermelha) matando a guarnição. Com batalhão no tile (padrão) a guarnição é de 30 e 3 satélites vermelhos mandam '
    + 'reforços em lotes à medida que morrem; com &batalhao=0 só a guarnição (12). Conquistado o alvo, vença zerando os reforços. Ordem aos soldados: V e X. Ajuste: [ ] lote, - = atraso.'
};
