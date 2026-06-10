/* Builds the panel layout from the flat markdown that Jekyll rendered into #rawcontent:
   <h1> => a category (horizontal panel), <h2> => a section box, everything else => box body.
   Then wires up navigation, the desktop clip-to-popup behaviour, popups and overlays. */
(function(){
  const stage = document.getElementById('stage');
  const raw   = document.getElementById('rawcontent');
  if(!stage || !raw) return;

  const CAT_ICONS = ['bi-journal-text','bi-easel2','bi-grid-1x2','bi-stars','bi-collection','bi-dot'];

  /* ---------- 1. BUILD ---------- */
  function build(){
    let cat=null, body=null, ci=0;
    const newCat = h1 =>{
      const sec=document.createElement('section'); sec.className='category';
      sec.dataset.name = (h1.textContent||'').trim();
      sec.dataset.icon = h1.getAttribute('data-icon') || CAT_ICONS[ci] || 'bi-dot';
      ci++; stage.appendChild(sec); cat=sec; body=null;
    };
    const newCard = h2 =>{
      if(!cat){ const f=document.createElement('h1'); f.textContent=''; newCat(f); }
      const card=document.createElement('article'); card.className='card';
      const head=document.createElement('div'); head.className='card-head';
      head.innerHTML = `<div class="eyebrow"><i class="bi ${cat.dataset.icon}"></i> ${cat.dataset.name}</div>`;
      const h=document.createElement('h2'); h.innerHTML=h2.innerHTML; head.appendChild(h);
      body=document.createElement('div'); body.className='card-body';
      card.appendChild(head); card.appendChild(body); cat.appendChild(card);
    };
    [...raw.childNodes].forEach(n=>{
      if(n.nodeType===1 && n.tagName==='H1') newCat(n);
      else if(n.nodeType===1 && n.tagName==='H2') newCard(n);
      else if(body) body.appendChild(n.cloneNode(true));
    });
    raw.remove();
    [...stage.querySelectorAll('.card-body')].forEach(enhanceBody);
  }

  /* turn link-only paragraphs into pill button rows; give links auto icons; wire popups */
  function enhanceBody(body){
    [...body.children].forEach(p=>{ if(isButtonRow(p)) makeButtonRow(p); });
  }
  function isButtonRow(p){
    if(p.tagName!=='P') return false;
    const links=[...p.querySelectorAll(':scope > a')];
    if(!links.length) return false;
    let txt='';
    p.childNodes.forEach(n=>{ if(n.nodeType===3) txt+=n.textContent;
      else if(n.nodeType===1 && n.tagName!=='A') txt+=n.textContent; });
    return txt.replace(/[·•|,\s]/g,'').length===0;   /* only links + separators */
  }
  function makeButtonRow(p){
    const links=[...p.querySelectorAll(':scope > a')];
    [...p.childNodes].forEach(n=>{ if(n.nodeType===3) n.remove(); });   /* drop separators */
    p.classList.add('row-btns');
    links.forEach((a,i)=>{
      a.classList.add('pill');
      if(!a.classList.contains('solid') && !a.classList.contains('ghost'))
        a.classList.add(i===0 ? 'solid' : 'ghost');
      if(!a.querySelector('i')){ const ic=autoIcon(a); if(ic) a.insertAdjacentHTML('afterbegin', `<i class="bi ${ic}"></i> `); }
      if(a.classList.contains('popup')) bindPopup(a);
      else { const h=a.getAttribute('href')||''; if(/^https?:\/\//.test(h)){ a.target='_blank'; a.rel='noopener'; } }
    });
  }
  function autoIcon(a){
    const h=a.getAttribute('href')||'';
    if(a.classList.contains('popup')) return 'bi-window-stack';
    if(/^mailto:/.test(h)) return 'bi-envelope';
    if(/github\.com/.test(h)) return 'bi-github';
    if(/\.pdf($|[?#])/i.test(h) || a.hasAttribute('download')) return 'bi-download';
    if(/^https?:\/\//.test(h)) return 'bi-box-arrow-up-right';
    return 'bi-arrow-right';
  }
  function bindPopup(a){
    a.addEventListener('click', e=>{
      e.preventDefault();
      const src=document.getElementById((a.getAttribute('href')||'').slice(1));
      if(src){ const h=src.querySelector('h1,h2,h3'); openModalHTML(h?h.textContent:a.textContent.trim(), src.innerHTML); }
    });
  }

  build();

  /* ---------- 2. INTERACTION (same behaviour as the prototype) ---------- */
  const cats = [...stage.querySelectorAll('.category')];
  if(!cats.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SB = reduce ? 'auto' : 'smooth';
  const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const header = document.querySelector('.hero');
  const sectionsOf = c => [...c.querySelectorAll('.card')];
  let curCat=0, modalOpen=false, padTop=12;

  function curSecIdx(c){
    let best=0, bd=Infinity;
    sectionsOf(c).forEach((s,i)=>{ const d=Math.abs((s.offsetTop-padTop)-c.scrollTop); if(d<bd){bd=d;best=i;} });
    return best;
  }

  function layout(){
    document.documentElement.style.setProperty('--header-h', header.offsetHeight+'px');
    const H = stage.clientHeight;
    const cardH = clamp(Math.round(H*0.74),300,600);
    document.documentElement.style.setProperty('--card-h', cardH+'px');
    const gap = parseFloat(getComputedStyle(cats[0].querySelector('.card')).marginTop) || 12;
    const padB = Math.max(0, H - cardH - gap);
    cats.forEach(c=> c.style.paddingBottom = padB+'px');
    padTop = parseFloat(getComputedStyle(cats[0]).scrollPaddingTop) || 12;

    if(!isTouch){ stage.style.scrollSnapType='none'; cats.forEach(c=> c.style.scrollSnapType='none'); }

    cats.forEach(cat=> sectionsOf(cat).forEach(card=>{
      const body = card.querySelector('.card-body');
      card.classList.remove('clipped');
      card.onclick = null;
      const old=card.querySelector('.more-btn'); if(old) old.remove();
      if(isTouch) return;
      if(body.scrollHeight > body.clientHeight + 1){
        card.classList.add('clipped');
        const title=(card.querySelector('.card-head h2')||{}).textContent||'';
        const html=body.innerHTML;
        const btn=document.createElement('button');
        btn.className='more-btn'; btn.setAttribute('aria-label','Show full content');
        btn.innerHTML='<i class="bi bi-three-dots"></i>';
        btn.onclick=()=>openModalHTML(title, html);
        card.appendChild(btn);
        /* clicking anywhere on the box opens it too — but leave links/buttons alone */
        card.onclick=(e)=>{ if(e.target.closest('a, button')) return; openModalHTML(title, html); };
      }
    }));
    sync();
  }

  let animating=false, animRAF;
  function animateScroll(el, axis, to){
    cancelAnimationFrame(animRAF);
    const prop = axis==='top' ? 'scrollTop' : 'scrollLeft';
    if(reduce){ el[prop]=to; return; }
    animating=true;
    const start=el[prop], dist=to-start, t0=performance.now(), dur=360;
    const ease=t=>1-Math.pow(1-t,3);
    (function frame(now){
      const p=Math.min(1,(now-t0)/dur);
      el[prop]=start+dist*ease(p);
      if(p<1) animRAF=requestAnimationFrame(frame); else animating=false;
    })(performance.now());
  }

  function goCat(dir){
    const n=clamp(curCat+dir,0,cats.length-1); if(n===curCat) return false;
    curCat=n;
    if(isTouch) stage.scrollTo({left:cats[n].offsetLeft, behavior:SB});
    else animateScroll(stage,'left',cats[n].offsetLeft);
    sync(); return true;
  }
  function goSec(dir){
    const cat=cats[curCat], secs=sectionsOf(cat), cur=curSecIdx(cat);
    const n=clamp(cur+dir,0,secs.length-1); if(n===cur) return false;
    const to=secs[n].offsetTop - padTop;
    if(isTouch) cat.scrollTo({top:to, behavior:SB});
    else animateScroll(cat,'top',to);
    return true;
  }

  /* desktop wheel: always navigate; self-clearing cooldown + animating guard */
  let cooldown=false, cdT;
  const cool=(ms=460)=>{ cooldown=true; clearTimeout(cdT); cdT=setTimeout(()=>cooldown=false,ms); };
  const afterNav=()=>cool();
  window.addEventListener('wheel', e=>{
    if(modalOpen) return;
    e.preventDefault();
    if(cooldown||animating) return;
    const ax=Math.abs(e.deltaX), ay=Math.abs(e.deltaY), TH=4;
    let moved=false;
    if(ax>ay && ax>TH) moved=goCat(e.deltaX>0?1:-1);
    else if(ay>TH)     moved=goSec(e.deltaY>0?1:-1);
    if(moved) cool();
  }, {passive:false});

  addEventListener('keydown', e=>{
    if(modalOpen){ if(e.key==='Escape') closeModal(); return; }
    let moved=false;
    if(e.key==='ArrowRight'){ e.preventDefault(); moved=goCat(1); }
    else if(e.key==='ArrowLeft'){ e.preventDefault(); moved=goCat(-1); }
    else if(e.key==='ArrowDown'){ e.preventDefault(); moved=goSec(1); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); moved=goSec(-1); }
    if(moved) afterNav();
  });

  /* overlays */
  const tabs=document.getElementById('tabs'), dotsWrap=document.getElementById('dots');
  cats.forEach((c,i)=>{ const b=document.createElement('button'); b.className='cat-tab';
    b.innerHTML=`<i class="bi ${c.dataset.icon}"></i> ${c.dataset.name}`;
    b.onclick=()=>{ if(goCat(i-curCat)) afterNav(); }; tabs.appendChild(b); });
  const prev=document.getElementById('prev'), next=document.getElementById('next');
  tabs.insertBefore(prev, tabs.firstChild);   /* arrow ◄  [tabs]  ► arrow */
  tabs.appendChild(next);
  prev.onclick=()=>{ if(goCat(-1)) afterNav(); };
  next.onclick=()=>{ if(goCat(1)) afterNav(); };

  function sync(){
    cats.forEach(c=>{ const a=curSecIdx(c); sectionsOf(c).forEach((s,i)=>s.classList.toggle('active', i===a)); });
    [...tabs.querySelectorAll('.cat-tab')].forEach((b,i)=>b.classList.toggle('active', i===curCat));
    prev.disabled=curCat===0; next.disabled=curCat===cats.length-1;
    const cat=cats[curCat], secs=sectionsOf(cat), act=curSecIdx(cat);
    dotsWrap.innerHTML='';
    secs.forEach((s,i)=>{ const d=document.createElement('button'); d.className=i===act?'active':'';
      d.setAttribute('aria-label','Section '+(i+1)); d.onclick=()=>{ if(goSec(i-act)) afterNav(); }; dotsWrap.appendChild(d); });
    dotsWrap.style.display = secs.length>1 ? 'flex':'none';
  }

  let raf;
  stage.addEventListener('scroll', ()=>{ cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{ if(!animating) curCat=Math.round(stage.scrollLeft/stage.clientWidth); sync(); }); }, {passive:true});
  cats.forEach(c=>c.addEventListener('scroll', ()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(sync); }, {passive:true}));

  /* modal */
  const back=document.getElementById('modalBack'), mt=document.getElementById('modalTitle'), mb=document.getElementById('modalBody');
  function openModalHTML(title, html){
    mt.textContent=title||''; mb.innerHTML=html;
    mb.querySelectorAll('.popup-src').forEach(el=>el.remove());        /* don't nest hidden sources */
    back.classList.add('open'); modalOpen=true;
  }
  function closeModal(){ back.classList.remove('open'); modalOpen=false; }
  document.getElementById('modalClose').onclick=closeModal;
  back.addEventListener('click', e=>{ if(e.target===back) closeModal(); });
  window.openModalHTML = openModalHTML;   /* exposed for the ⋯ and popup handlers above */

  setTimeout(()=>{ const h=document.getElementById('hint'); if(h){ h.style.opacity='0'; setTimeout(()=>h.remove(),700);} }, 4200);

  addEventListener('resize', layout);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  layout();
  document.body.classList.remove('building');
})();
