'use strict';
// ---------- Textos: cidades (evolução e muros) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.

// ------ Evolução das cidades ------
// Tela da cidade (livro, aba Cidades) e aba Efeitos: o que o nível atual da cidade do jogador rende. g = cityLvlGain(c) (econ.js).
const txtCityLvlGain=(c,g)=>'Nível <b>'+g.lvl+'</b> / '+LVL.cityMax+': +'+g.prod+' de produção, +◉'+g.tax+' de imposto por rodada.';
// Aba Efeitos (buffs): linha de uma cidade sua evoluída (nível 2 ou mais).
const txtCityLvlBuff=(c,g)=>'🏘 '+c.name+' (nível '+g.lvl+'): +'+g.prod+' de produção, +◉'+g.tax+' de imposto';
// Nome do muro de cada tipo (CITY_WALL_BY_LEVEL em modifiers/); aparece na tela da cidade e no toast de evolução.
const TXT_WALL_NAME={none:'sem muros',fence:'cerca',palisade:'muros de madeira',stone:'muralha de pedra'};
// Muro que a cidade terá no nível lvl, com atiradores quando o nível os dá (citySentriesAt, modifiers/).
const txtWallAt=lvl=>(TXT_WALL_NAME[cityWallTypeAt(lvl)]||'')+(citySentriesAt(lvl)?' com atiradores':'');
// Tela da cidade (livro, aba Cidades): bloco "Evoluir a cidade" do jogador. cost = custo; linhas de recursos vêm de txtLvlCostLine.
const txtCityUpNext=(c,lvl)=>'Nível <b>'+lvl+'</b> / '+LVL.cityMax+'. Próximo nível ('+(lvl+1)+'): '+txtWallAt(lvl+1)
  +', +'+LVL.cityProd+' de produção e +◉'+LVL.cityTax+' de imposto por rodada.';
// Linha de um item do custo na tela de evolução: ✔ se o jogador tem o suficiente, ✘ se não. k = ouro/recurso, need = quantia.
const txtLvlCostLine=(k,need,ok)=>'<li>'+(ok?'✔':'✘')+' '+LVL_RES_ICON[k]+' '+need+' (tem '+lvlHave(k)+')</li>';
// Toast ao clicar em evoluir a cidade.
const txtCityUpToast=(c,lvl)=>'🏘 '+c.name+' evoluiu para o nível '+lvl+': '+txtWallAt(lvl)+' e mais produção e imposto.';
// Relatório da rodada (rdNow): cidade evoluída pelo jogador.
const txtCityUpReport=(c,lvl)=>'🏘 '+c.name+' evoluiu para o nível '+lvl+'.';
