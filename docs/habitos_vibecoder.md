Os hábitos que mais pesam, em ordem de impacto:

1. Uma tarefa por sessão, e /clear quando o assunto muda.
Todo o histórico é reenviado a cada chamada. Uma sessão longa com vários assuntos custa muito mais do que várias sessões curtas. Quando terminar uma tarefa e commitar, abra uma sessão nova.

2. Escolha o modelo pela tarefa.

Opus: refatoração, desenho de uma mecânica nova (como a guerra), bug difícil.
Sonnet: implementar algo já decidido, ajustar números e textos, pequenos bugs.
Esforço baixo para pedidos mecânicos.

3. Peça de forma específica.

Ruim: “melhore a taverna”.
Bom: “no quarto da taverna, o preço está ◉20 e quero ◉30”.
Bom: “quando eu clico em Negociação e depois em Guerra, o botão fica cinza mesmo na rodada 3; deveria ficar ativo”.

4. Dê o contexto em poucas linhas.
Aponte a seção certa: “leia só a seção Fatia 3 de docs/fase-6-guerra.md”. Cole só o trecho relevante de um erro, não o log inteiro.

5. Agrupe pedidos relacionados.
Cinco ajustes pequenos em uma mensagem custam menos que cinco mensagens, porque cada uma recarrega o contexto. Mas não misture assuntos diferentes na mesma sessão (veja o hábito 1).

6. Teste por texto, não por imagem.
Peça “verifique com read_page ou console” e deixe screenshot para quando o visual for o assunto. Quando for jogar você mesmo, anote os problemas e entregue em uma lista só.

7. Use o script de verificação em vez de pedir testes manuais.
O tests/smoke.js roda numa chamada só. Peça “rode o smoke e me diga só o que falhou”.

8. Mantenha os documentos curtos.
CLAUDE.md, ESTADO.md e MAPA.md são lidos com frequência. Cada linha a mais é paga em toda sessão. Ao encerrar, atualize só o essencial.

9. Pergunte antes de mandar fazer.
Para uma decisão de design, peça “quais as opções, em 5 linhas” antes de pedir a implementação. Mudar de ideia depois do código pronto custa o dobro.

10. Não deixe tarefas abertas “para continuar depois”.
Termine, commite e use /encerrar-sessao. Retomar uma sessão antiga traz de volta tudo o que ela carregava.

Para acompanhar o uso, o comando /usage mostra onde os tokens foram. Se uma sessão ficar muito longa, /compact resume o histórico antes de seguir.