'use strict';
// ---------- Editor de bandeira e tela de identidade da facção (Fase 5, F1b) ----------
// Feito à mão, sem pacote: os pacotes de pixel art que existem não trazem juntos polígono, borracha com tamanho, balde e desfazer,
// e o jogo não tem etapa de build (só scripts soltos).
// Ferramentas: lápis, borracha (tamanho 1–6), balde, linha, polígono (com ou sem preenchimento), desfazer e refazer (Ctrl+Z / Ctrl+Y).
// A bandeira é a grade 32×20 de factions.js (-1 = cor principal da facção; o que se apaga volta a ser a cor principal).
const FE_CELL=14;
const FE_PAL=[0xffffff,0x000000,0xd8322a,0xe87820,0xe8b820,0x2aa04a,0x20b0c8,0x2a6aff,0x8a3ac8,0xd0409a,0x8a5a2a,0x8a8a8a,0xf2d7b0,0x1a2a6a,0x6a1a1a,0x2a5a2a];
const FE_TOOLS=[['pencil','✏ Lápis'],['eraser','🧽 Borracha'],['bucket','🪣 Balde'],['line','📏 Linha'],['poly','⬠ Polígono']];

// linha de Bresenham entre duas células
function feLine(x0,y0,x1,y1,fn){
  let dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,e=dx+dy;
  for(;;){fn(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}
}
// preenche um polígono (pares-ímpares, pelo centro de cada célula)
function fePoly(pts,fn){
  for(let y=0;y<FAC_H;y++){
    const xs=[],cy=y+0.5;
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]+0.5<=cy)!==(b[1]+0.5<=cy))xs.push((a[0]+0.5)+(cy-(a[1]+0.5))*(b[0]-a[0])/(b[1]-a[1]))}
    xs.sort((p,q)=>p-q);
    for(let k=0;k+1<xs.length;k+=2)for(let x=Math.ceil(xs[k]-0.5);x<Math.ceil(xs[k+1]-0.5);x++)fn(x,y);
  }
}

// abre o editor. o: {title,intro,name,color,px,canColor,canFlag,confirm,cancel,z}. Devolve uma Promise: {name,color,px} ou null se cancelou.
function facEditor(o){
  return new Promise(resolve=>{
    const st={name:o.name,color:o.color,px:o.px.slice(),cur:FE_PAL[0],tool:'pencil',size:2,fill:true,poly:[],undo:[],redo:[],stroke:null,hover:null,lineA:null};
    let done=false,keyH=null;
    const w=UI.window({title:o.title,width:Math.min(900,innerWidth-30),z:o.z||70,onClose:()=>{if(keyH)window.removeEventListener('keydown',keyH,true);keyH=null;if(!done){done=true;resolve(null)}}});
    const edit=!!o.canFlag;
    w.body.innerHTML=(o.intro?'<p class="st">'+o.intro+'</p>':'')
      +'<div class="fe"><div class="fe-l">'
      +'<label class="st">Nome da facção<br><input type="text" id="fe-name" maxlength="24" style="width:100%;margin-top:3px"></label>'
      +'<div class="st" style="margin-top:8px">Cor principal (é a cor dos seus soldados)'+(o.canColor?'':' — só no turno do líder')+'</div><div class="fe-sw" id="fe-colors"></div>'
      +'<div class="st" style="margin-top:8px">Desenhos prontos'+(edit?'':' — só no turno do líder')+'</div><div class="fe-pre" id="fe-pre"></div>'
      +'<div class="st" style="margin-top:8px">Como fica</div><canvas id="fe-prev" width="128" height="80" class="fe-prev"></canvas>'
      +'</div><div class="fe-r">'
      +'<div class="fe-tools" id="fe-tools"></div>'
      +'<div class="fe-opt st" id="fe-opt"></div>'
      +'<canvas id="fe-cv" width="'+FAC_W*FE_CELL+'" height="'+FAC_H*FE_CELL+'"></canvas>'
      +'<div class="fe-sw" id="fe-pal" style="margin-top:6px"></div>'
      +'</div></div>';
    const $$=id=>w.body.querySelector('#'+id),cv=$$('fe-cv'),g=cv.getContext('2d'),prev=$$('fe-prev'),pg=prev.getContext('2d');
    const main=()=>FAC_COLORS[st.color].c;
    $$('fe-name').value=st.name;$$('fe-name').oninput=e=>{st.name=e.target.value};
    // ---- desenho ----
    function draw(){
      facDraw(g,st.px,main(),FE_CELL);
      g.strokeStyle='rgba(0,0,0,0.13)';g.lineWidth=1;g.beginPath();
      for(let x=1;x<FAC_W;x++){g.moveTo(x*FE_CELL+0.5,0);g.lineTo(x*FE_CELL+0.5,FAC_H*FE_CELL)}
      for(let y=1;y<FAC_H;y++){g.moveTo(0,y*FE_CELL+0.5);g.lineTo(FAC_W*FE_CELL,y*FE_CELL+0.5)}
      g.stroke();
      const cell=(x,y,col)=>{g.fillStyle=col;g.fillRect(x*FE_CELL,y*FE_CELL,FE_CELL,FE_CELL)};
      if(st.tool==='line'&&st.lineA&&st.hover)feLine(st.lineA[0],st.lineA[1],st.hover[0],st.hover[1],(x,y)=>{if(x>=0&&y>=0&&x<FAC_W&&y<FAC_H)cell(x,y,'rgba(255,255,255,0.55)')});
      if(st.tool==='poly'&&st.poly.length){
        g.strokeStyle='#ffd23a';g.lineWidth=2;g.beginPath();
        st.poly.forEach((p,i)=>{const X=(p[0]+0.5)*FE_CELL,Y=(p[1]+0.5)*FE_CELL;i?g.lineTo(X,Y):g.moveTo(X,Y)});
        if(st.hover)g.lineTo((st.hover[0]+0.5)*FE_CELL,(st.hover[1]+0.5)*FE_CELL);g.stroke();
        st.poly.forEach((p,i)=>{g.fillStyle=i?'#fff':'#ffd23a';g.fillRect((p[0]+0.5)*FE_CELL-3,(p[1]+0.5)*FE_CELL-3,7,7)});
      }
      if(st.tool==='eraser'&&st.hover&&edit){g.strokeStyle='#fff';g.lineWidth=2;const r=Math.floor(st.size/2);g.strokeRect((st.hover[0]-r)*FE_CELL+1,(st.hover[1]-r)*FE_CELL+1,st.size*FE_CELL-2,st.size*FE_CELL-2)}
      facDraw(pg,st.px,main(),4);
    }
    const set=(x,y,v)=>{if(x>=0&&y>=0&&x<FAC_W&&y<FAC_H)st.px[y*FAC_W+x]=v};
    const snap=()=>{st.undo.push(st.px.slice());if(st.undo.length>60)st.undo.shift();st.redo.length=0;ui()};
    const undo=()=>{if(!st.undo.length)return;st.redo.push(st.px.slice());st.px=st.undo.pop();ui();draw()};
    const redo=()=>{if(!st.redo.length)return;st.undo.push(st.px.slice());st.px=st.redo.pop();ui();draw()};
    const erase=(x,y)=>{const r=Math.floor(st.size/2);for(let dy=0;dy<st.size;dy++)for(let dx=0;dx<st.size;dx++)set(x-r+dx,y-r+dy,-1)};
    function flood(x,y,v){
      const t=st.px[y*FAC_W+x];if(t===v)return;const stack=[[x,y]];
      while(stack.length){const [a,b]=stack.pop();if(a<0||b<0||a>=FAC_W||b>=FAC_H||st.px[b*FAC_W+a]!==t)continue;st.px[b*FAC_W+a]=v;stack.push([a+1,b],[a-1,b],[a,b+1],[a,b-1])}
    }
    function closePoly(){
      if(st.poly.length>=3){snap();const pts=st.poly.slice();if(st.fill)fePoly(pts,(x,y)=>set(x,y,st.cur));
        for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];feLine(a[0],a[1],b[0],b[1],(x,y)=>set(x,y,st.cur))}}
      st.poly=[];draw();ui();
    }
    const cellOf=e=>{const r=cv.getBoundingClientRect();return[Math.max(0,Math.min(FAC_W-1,Math.floor((e.clientX-r.left)*FAC_W/r.width))),Math.max(0,Math.min(FAC_H-1,Math.floor((e.clientY-r.top)*FAC_H/r.height)))]};
    cv.onpointerdown=e=>{
      if(!edit)return;e.preventDefault();try{cv.setPointerCapture(e.pointerId)}catch(_){}
      const c=cellOf(e);st.hover=c;
      if(st.tool==='pencil'){snap();st.stroke=c;set(c[0],c[1],st.cur)}
      else if(st.tool==='eraser'){snap();st.stroke=c;erase(c[0],c[1])}
      else if(st.tool==='bucket'){snap();flood(c[0],c[1],st.cur)}
      else if(st.tool==='line')st.lineA=c;
      else if(st.tool==='poly'){
        const f=st.poly[0];
        if(f&&st.poly.length>=3&&Math.abs(f[0]-c[0])<=0&&Math.abs(f[1]-c[1])<=0){closePoly();return}   // clicar no primeiro ponto fecha
        st.poly.push(c);ui();
      }
      draw();
    };
    cv.onpointermove=e=>{
      const c=cellOf(e);st.hover=c;
      if(edit&&st.stroke&&(st.tool==='pencil'||st.tool==='eraser')){
        feLine(st.stroke[0],st.stroke[1],c[0],c[1],(x,y)=>st.tool==='pencil'?set(x,y,st.cur):erase(x,y));st.stroke=c;
      }
      draw();
    };
    cv.onpointerup=e=>{
      if(!edit)return;const c=cellOf(e);
      if(st.tool==='line'&&st.lineA){snap();feLine(st.lineA[0],st.lineA[1],c[0],c[1],(x,y)=>set(x,y,st.cur));st.lineA=null}
      st.stroke=null;draw();
    };
    cv.onpointerleave=()=>{st.hover=null;if(!st.stroke)draw()};
    cv.ondblclick=()=>{if(edit&&st.tool==='poly')closePoly()};
    // ---- painel de ferramentas, cores e desenhos prontos ----
    function ui(){
      $$('fe-tools').innerHTML=FE_TOOLS.map(t=>'<button data-t="'+t[0]+'" class="'+(st.tool===t[0]?'sel':'')+'" '+(edit?'':'disabled')+'>'+t[1]+'</button>').join('')
        +'<button data-a="undo" '+(edit&&st.undo.length?'':'disabled')+'>↶ Desfazer</button><button data-a="redo" '+(edit&&st.redo.length?'':'disabled')+'>↷ Refazer</button><button data-a="clear" '+(edit?'':'disabled')+'>🗑 Limpar</button>';
      $$('fe-opt').innerHTML=st.tool==='eraser'?'Tamanho da borracha: <input type="range" id="fe-size" min="1" max="6" value="'+st.size+'"> <b>'+st.size+'×'+st.size+'</b>'
        :st.tool==='poly'?'<label><input type="checkbox" id="fe-fill" '+(st.fill?'checked':'')+'> Preencher</label> • clique para criar os pontos; <b>duplo clique</b>, Enter ou o primeiro ponto fecham'+(st.poly.length?' <button data-a="closepoly">Fechar polígono ('+st.poly.length+' pontos)</button> <button data-a="cancelpoly">Cancelar</button>':'')
        :st.tool==='line'?'Arraste do início ao fim da linha.':st.tool==='bucket'?'Clique numa área para pintá-la.':'Clique ou arraste para pintar pixel por pixel.';
      const sz=$$('fe-size');if(sz)sz.oninput=e=>{st.size=+e.target.value;ui();draw()};
      const fl=$$('fe-fill');if(fl)fl.onchange=e=>{st.fill=e.target.checked};
    }
    w.body.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b||!edit&&!b.dataset.col)return;
      if(b.dataset.t){if(st.poly.length)closePoly();st.tool=b.dataset.t;st.lineA=null;ui();draw()}
      else if(b.dataset.a==='undo')undo();else if(b.dataset.a==='redo')redo();
      else if(b.dataset.a==='clear'){snap();st.px.fill(-1);draw();ui()}
      else if(b.dataset.a==='closepoly')closePoly();
      else if(b.dataset.a==='cancelpoly'){st.poly=[];ui();draw()}
    });
    // cores principais (as de facções NPC que ainda existem ficam bloqueadas)
    const cw=$$('fe-colors');
    FAC_COLORS.forEach((c,i)=>{
      const owner=facColorOwner(i),b=document.createElement('button');
      b.style.background=hex6(c.c);b.dataset.col=i;b.title=c.n+(owner?' — em uso por '+owner.name:'');
      b.disabled=!o.canColor||!!owner;b.className=i===st.color?'sel':'';
      b.onclick=()=>{st.color=i;[...cw.children].forEach((x,k)=>x.className=k===i?'sel':'');draw();thumbs()};
      cw.appendChild(b);
    });
    // desenhos prontos (miniaturas com a cor principal atual)
    const pre=$$('fe-pre');
    function thumbs(){
      pre.innerHTML='';
      for(let k=0;k<FAC_FLAGS.length;k++){
        const c=document.createElement('canvas');c.width=64;c.height=40;c.title='Desenho '+(k+1);facDraw(c.getContext('2d'),facPresetPx(k,main()),main(),2);
        c.onclick=()=>{if(!edit)return;snap();st.px=facPresetPx(k,main());draw();ui()};pre.appendChild(c);
      }
    }
    // paleta de desenho + cor livre
    const pal=$$('fe-pal');
    FE_PAL.forEach(c=>{const b=document.createElement('button');b.style.background=hex6(c);b.title=hex6(c);b.onclick=()=>{st.cur=c;mark()};pal.appendChild(b)});
    const inp=document.createElement('input');inp.type='color';inp.value=hex6(st.cur);inp.title='Outra cor';inp.oninput=e=>{st.cur=parseInt(e.target.value.slice(1),16);mark()};
    const lab=document.createElement('span');lab.className='st';lab.style.marginLeft='6px';lab.textContent='Cor do desenho:';pal.prepend(lab);pal.appendChild(inp);
    function mark(){[...pal.querySelectorAll('button')].forEach(b=>b.className=b.title===hex6(st.cur)?'sel':'');inp.value=hex6(st.cur)}
    // atalhos: Ctrl+Z / Ctrl+Y, Enter fecha o polígono, Esc cancela o polígono (antes de fechar a janela)
    keyH=e=>{
      if(!w.isOpen()||UI.stack[UI.stack.length-1]!==w)return;
      const typing=e.target&&e.target.tagName==='INPUT'&&e.target.type==='text';
      if((e.ctrlKey||e.metaKey)&&!typing&&e.code==='KeyZ'){e.preventDefault();e.shiftKey?redo():undo()}
      else if((e.ctrlKey||e.metaKey)&&!typing&&e.code==='KeyY'){e.preventDefault();redo()}
      else if(e.code==='Enter'&&st.tool==='poly'&&st.poly.length){e.preventDefault();closePoly()}
      else if(e.code==='Escape'&&st.poly.length){e.preventDefault();e.stopImmediatePropagation();st.poly=[];ui();draw()}
      else if(typing&&(e.code==='KeyE'||e.code==='KeyB'))e.stopImmediatePropagation();   // digitar o nome não pode fechar o livro por trás
    };
    window.addEventListener('keydown',keyH,true);
    const finish=()=>{done=true;const r={name:(st.name||'').trim()||FAC_NAME_DEFAULT,color:st.color,px:st.px.slice()};w.close();w.el.remove();resolve(r)};
    w.foot.append(UI.button(o.confirm||'✔ Confirmar','gold',finish));
    if(o.cancel)w.foot.append(UI.button(o.cancel,'alt',()=>{w.close();w.el.remove()}));
    ui();thumbs();mark();draw();w.open();
  });
}

// tela de criação da facção do jogador: antes de gerar o mundo, numa partida nova
async function facCreateScreen(){
  const f=STATE.fac,r=await facEditor({title:'🏴 Crie a sua facção',intro:'Escolha o nome, a cor principal (é a cor dos seus soldados) e a bandeira. Tudo pode ser mudado depois, na sala do líder.',name:f.name,color:f.color,px:facPx(0),canColor:true,canFlag:true,confirm:'✔ Começar',z:80});
  if(r){f.name=r.name;f.color=r.color;f.px=r.px}
}
// edição na sala do líder: nome a qualquer momento; cor e bandeira só no turno do líder
async function facEditIdentity(){
  const f=STATE.fac,lead=typeof isLeader==='function'&&isLeader(),r=await facEditor({title:'🏴 Sua facção',intro:lead?'':'Fora do turno do líder só o nome pode ser mudado.',name:f.name,color:f.color,px:facPx(0),canColor:lead,canFlag:lead,confirm:'✔ Salvar',cancel:'Cancelar',z:90});
  if(!r)return false;
  facSetIdentity(lead?{name:r.name,color:r.color,px:r.px}:{name:r.name});
  return true;
}
