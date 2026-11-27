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
    1. O jogador clica com o botão direito no marcador do jogador ou em um botão no mapa. Se ele tiver soldados, terá a opção habilitada: Enviar soldados.
    2. Ele deve escolher o número de soldados do pelotão a ser enviado. 
        - O pelotão terá um limite de no máximo 10 soldados. O jogador poderá criar pelotões de 3, 4 e 10. 
        - No máximo 3 pelotões por mapa.
    3. Posicionamento inicial (para onde irão marchar antes da luta)
        - Batalha por POIs
            - Ataque e Defesa -> Uma pequena área em torno do jogador
        - Batalhas grandes
            - Ataque -> A área de ataque do POI
            - Defesa -> A área de defesa da cidade
            - Choque -> Uma área que englobe os três POIs na batalha
        - **Nota:** O posicionamento inicial não é de onde o pelotão irá surgir (isso está especificado no tópico 5). Esse posicionamento é o primeiro para onde os soldados marcharão primeiro para depois irem até o alvo. 
    4. Ele escolherá o alvo e, dependendo do alvo, a função do pelotão poderá ser de ataque ou defesa:
        - Ataque -> o jogador selecionou um POI, o pelotão vai em direção aquele POI 
        - Defender posição (defesa) -> o jogador selecionou no mapa. O pelotão ficará em linha, parado, e atirando nos inimigos que entrarem no raio. 
            - Defender POI -> O jogador pode clicar em defender o POI ao invés de uma posição. Nesse caso os soldados tentarão fazer uma barreira circular em volta dele. A preferência de início da barreira será de onde os soldados inimigos estão vindo.
        - O jogador pode selecionar um pelotão e dar uma nova posição para ele, mudando a funcão de acordo com a posição escolhida
    5. Surgimento do pelotão:
        - Em batalhas de POIs:
            - Surge de trás do jogador e vai caminhando até o destino
        - Em batalha grande:
            - Surge dos POIs ou outros lugares que geralmente surgem soldados
    6. Soldados sem pelotão
        - Em batalhas de POIs:
            - Surgem atrás do jogador como está hoje, mas em menor número. Por exemplo: se tenho um pelotão com 3 e outro com 5, apenas 2 soldados serão invocados. 
        - Em batalhas grandes:
            - Nada muda
    7. Reposição de pelotão
        - Em batalhas de POIs:
            - Não repõem 
        - Em batalhas grandes:
            - Os soldados que surgem darão preferência para completar os pelotões.
    8. Fim de um pelotão:
        - Em batalhas de POIs:
            - Ataques -> quando terminarem o ataque e limparem todos os inimigos
            - Defesa -> o jogador terá que retirar manualmente
            - Morte -> o pelotão destruído por inimigos
        - Em batalhas de POIs:
            - O jogador terá que retirar o pelotão. Se os soldados do pelotão morrerem, mas ainda tiver para repor, o pelotão continua.
    9. Notificações:
        - Quantos soldados tem no pelotão devem aparecer abaixo do de batalha
        - Se um pelotão é destruído, o jogador é notificado.

**Meu objetivo e aceito sugestões para melhorar:** na batalha de defesa da cidade, os inimigos vem de vários lados, quero poder posicionar meus soldados nas entradas para combater os invasores enquanto lido com um só front. Também trás uma camada de estrátegia a mais, podendo atacar POIs de mais de um front. 