# Resumo
Documento com anotações de correções e alterações que por enquanto não entram até o fim das implementações atuais.

# Correções

1. [ ] Sem notificações após conquistar um POI. 
2. [ ] Diminuir raio de avistamento dos POIs. Criar um modificador para que possa ser configurado. 

# Alterações

1. [ ] Em um tile, nem todos os POIs estarão conquistados por bandidos. Entre 10% ~ 30% (criar modificadores) terá civis e soldados da facção (se for de uma facção). Isso incluí o POI principal.

# Novas features

1. [ ] Tiles de bandidos
Agora tiles terão uma outra "facção" que são as dos bandidos. Um tile neutro pode estar dominado por bandidos. Na prática isso quer dizer que o POI principal tem bandidos e o jogador precisa invadir para anexar o tile. Nem todos os POIs de um tile de bandidos precisa ser apenas desse inimigo, pode também ter POIs com civis.

2. [ ] POIs dominados por bandidos tem uma chance de ter refém (30%). Isso não exclui o baú, o POI pode ter tanto um baú (100%) quanto um refém (30% / criar modificadores) 

3. [ ] Novas anexações a tiles neutros
Anexar tiles neutros, onde o POI principal é contralado por civis e uma pequena guarnição, funcionará de maneira diferente. Terá que gera um líder para aquele POI e o jogador conversará com ele para estabelecer a anexação. O líder pode recusar, ele fará a recusa caso o jogador não tenha nenhum tile anexado que faça fronteria com aquele tile. Para anexar, será necessário fazer alguma dessas missões:
- Pagar uma quantia em dinheiro
- Entregar X suprimentos que não é o que o tile produz
- Tomar X POIs de bandidos no tile
- Resgatar um civil em um POI dominado por bandidos
- Lidar com uma raid (se aceitar, será feito uma batalha de defesa)
Tendo sucesso em uma dessas missões, o evento para anexar o tile aparecerá na próxima rodada.
Nota: para todas as missões que tem quantidade, criar modificadores

4. [ ] Guardas do portão das cidades e vilas (se tiver) também se envolvem em batalha e podem ser mortos. Caso morram, na rodada seguinte estarão de volta. Não contam como parte do batalhão e o jogador não precisa gastar dinheiro para repor.

5. [ ] Poder posicionar os soldados no mapa e traçar uma rota para eles. Criação de pelotão.
Pelotão = um batalhão dividido em um tile 
- Jogador abre o mapa do tile (tecla M)
- Funcionará da seguinte maneira:
    1. O jogador clica com o botão direito no mapa. Se ele tiver soldados, terá a opção habilitada: Enviar soldados.
    2. Ele deve escolher o número de soldados do pelotão a ser enviado. 
        - O pelotão terá um limite de no máximo 10 soldados. O jogador poderá criar pelotões de 3, 4 e 10. 
        - No máximo 3 pelotões por mapa.
    3. Ele escolherá o alvo e, dependendo do alvo, a função do pelotão poderá ser de ataque ou defesa:
        - Ataque -> o jogador selecionou um POI, o pelotão vai em direção aquele POI 
        - Defender posição (defesa) -> o jogador selecionou no mapa. O pelotão ficará em linha, parado, e atirando nos inimigos que entrarem no raio. 
        - O jogador pode selecionar um pelotão e dar uma nova posição para ele, o 