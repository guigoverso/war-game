'use strict';
// ---------- Base de interface: janelas, botões, grade de slots, dica (tooltip) ----------
// Os sistemas novos (inventário, prefeitura, diplomacia...) montam seus painéis com estas peças.
const UI={
  _n:0,
  stack:[],   // janelas abertas (a última é a de cima)
  button(label,cls,fn){
    const b=document.createElement('button');b.textContent=label;if(cls)b.className=cls;if(fn)b.onclick=fn;return b;
  },
  // cria uma janela modal sobre o jogo. Opções: {title,width,z,buttons:[{label,cls,onClick}],onOpen,onClose}
  window(o){
    o=o||{};
    const el=document.createElement('div');el.className='screen hidden';el.id=o.id||('uiwin'+(++UI._n));el.style.zIndex=o.z||30;
    const panel=document.createElement('div');panel.className='panel';panel.style.minWidth=(o.width||440)+'px';
    const h=document.createElement('h2');h.textContent=o.title||'';
    const body=document.createElement('div'),foot=document.createElement('div');foot.style.marginTop='10px';
    panel.append(h,body,foot);el.appendChild(panel);document.body.appendChild(el);
    const w={el,body,foot,titleEl:h,
      open(){el.classList.remove('hidden');if(!UI.stack.includes(w))UI.stack.push(w);if(o.onOpen)o.onOpen(w);return w},
      close(){el.classList.add('hidden');const i=UI.stack.indexOf(w);if(i>=0)UI.stack.splice(i,1);if(o.onClose)o.onClose(w);return w},
      isOpen(){return !el.classList.contains('hidden')},
      setTitle(t){h.textContent=t}};
    for(const a of o.buttons||[])foot.appendChild(UI.button(a.label,a.cls,()=>{if(a.onClick)a.onClick(w);else w.close()}));
    return w;
  },
  // fecha a janela de cima; devolve true se havia alguma
  closeTop(){const w=UI.stack[UI.stack.length-1];if(!w)return false;w.close();return true},
  // pergunta Sim/Não
  confirm(msg,onYes,yesLabel){
    const w=UI.window({title:'Confirmar',width:360,z:60});
    const p=document.createElement('p');p.textContent=msg;w.body.appendChild(p);
    w.foot.append(UI.button(yesLabel||'Sim','red',()=>{w.close();w.el.remove();onYes()}),UI.button('Cancelar','alt',()=>{w.close();w.el.remove()}));
    w.open();return w;
  },
  // grade de slots: opts {cols,slots,render(slot,i)->{label,count,title,cls}, onClick(slot,i)}
  slotGrid(container,opts){
    container.innerHTML='';const g=document.createElement('div');g.className='slotgrid';g.style.gridTemplateColumns='repeat('+(opts.cols||6)+',48px)';
    opts.slots.forEach((slot,i)=>{
      const d=document.createElement('div'),r=opts.render(slot,i)||{};
      d.className='slot'+(r.cls?' '+r.cls:'');
      if(r.label){const s=document.createElement('span');s.textContent=r.label;d.appendChild(s)}
      if(r.key!==undefined&&r.key!==''){const k=document.createElement('i');k.textContent=r.key;d.appendChild(k)}
      if(r.count>1){const c=document.createElement('b');c.textContent=r.count;d.appendChild(c)}
      if(r.title)UI.tip(d,()=>r.title);
      if(opts.onClick)d.onclick=()=>opts.onClick(slot,i);
      if(opts.dnd){   // arrastar e soltar: dnd = {start(slot,i), drop(slot,i)}
        if(slot){d.draggable=true;d.ondragstart=e=>{opts.dnd.start(slot,i);e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain','item')}catch(_){}d.style.opacity='0.5'};d.ondragend=()=>{d.style.opacity=''}}
        d.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move'};
        d.ondragenter=e=>{e.preventDefault();d.style.outline='2px solid #ffd23a'};d.ondragleave=()=>{d.style.outline=''};
        d.ondrop=e=>{e.preventDefault();d.style.outline='';opts.dnd.drop(slot,i)};
      }
      g.appendChild(d);
    });
    container.appendChild(g);return g;
  },
  // dica ao passar o mouse
  tip(el,textFn){
    el.addEventListener('mouseenter',()=>{const t=UI._tipEl||(UI._tipEl=Object.assign(document.createElement('div'),{className:'uitip'}));t.textContent=textFn();document.body.appendChild(t);t.style.display='block'});
    el.addEventListener('mousemove',e=>{if(UI._tipEl){UI._tipEl.style.left=(e.clientX+14)+'px';UI._tipEl.style.top=(e.clientY+14)+'px'}});
    el.addEventListener('mouseleave',()=>{if(UI._tipEl)UI._tipEl.style.display='none'});
  }
};
