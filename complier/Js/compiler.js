// ── STARFIELD ──
(function(){
  const c=document.getElementById('stars');if(!c)return;
  const ctx=c.getContext('2d');let W,H,stars=[];
  function init(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;stars=Array.from({length:140},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.3+.2,a:Math.random(),da:(.0015+Math.random()*.003)*(Math.random()<.5?1:-1)}))}
  function draw(){ctx.clearRect(0,0,W,H);for(const s of stars){s.a+=s.da;if(s.a>1||s.a<0)s.da*=-1;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(180,195,255,${Math.max(0,s.a)})`;ctx.fill()}requestAnimationFrame(draw)}
  window.addEventListener('resize',init);init();draw();
})();

// ── STORAGE ──
function getCode(){return localStorage.getItem('game_dsl_code')||''}
function saveCode(code){localStorage.setItem('game_dsl_code',code)}

// ── MODAL ──
function openVisualizer(){
  const m=document.getElementById('vis-modal');if(!m)return;
  m.style.display='flex';setTimeout(()=>m.classList.add('active'),10);
}
function closeVisualizer(){
  const m=document.getElementById('vis-modal');if(!m)return;
  m.classList.remove('active');setTimeout(()=>m.style.display='none',300);
}

// ── TOKEN RULES ──
const TOKEN_RULES=[
  ['FLOAT',/^\d+\.\d+/],['NUMBER',/^\d+/],['STRING',/^"[^"]*"/],['BOOL',/^(?:true|false)\b/],
  ['PLAYER',/^PLAYER\b/],['SPEED',/^SPEED\b/],['INCREASE',/^INCREASE\b/],['EVERY',/^EVERY\b/],
  ['LIVES',/^LIVES\b/],['SCORE',/^SCORE\b/],['OBSTACLE',/^OBSTACLE\b/],['COIN',/^COIN\b/],
  ['POWERUP',/^POWERUP\b/],['BACKGROUND',/^BACKGROUND\b/],['DIFFICULTY',/^DIFFICULTY\b/],
  ['EASY',/^EASY\b/],['MEDIUM',/^MEDIUM\b/],['HARD',/^HARD\b/],
  ['SOUND',/^SOUND\b/],['MUSIC',/^MUSIC\b/],['COLOR',/^COLOR\b/],
  ['SIZE',/^SIZE\b/],['SPAWN',/^SPAWN\b/],['RATE',/^RATE\b/],['VALUE',/^VALUE\b/],
  ['ENABLE',/^ENABLE\b/],['DISABLE',/^DISABLE\b/],['SET',/^SET\b/],
  ['BY',/^BY\b/],['AT',/^AT\b/],['MAX',/^MAX\b/],['MIN',/^MIN\b/],
  ['ID',/^[a-zA-Z_][a-zA-Z0-9_]*/],['COMMENT',/^#[^\n]*/],['SKIP',/^[ \t]+/],['NEWLINE',/^\n/],
];
const KEYWORDS=new Set(['PLAYER','SPEED','INCREASE','EVERY','LIVES','SCORE','OBSTACLE','COIN',
  'POWERUP','BACKGROUND','DIFFICULTY','EASY','MEDIUM','HARD','SOUND','MUSIC','COLOR',
  'SIZE','SPAWN','RATE','VALUE','ENABLE','DISABLE','SET','BY','AT','MAX','MIN']);

function tokenize(code){
  const tokens=[];let pos=0,line=1,col=1;
  while(pos<code.length){
    let matched=false;
    for(const[kind,re] of TOKEN_RULES){
      const m=code.slice(pos).match(re);if(!m)continue;
      const raw=m[0];
      if(kind==='NEWLINE'){line++;col=1;pos++;matched=true;break}
      if(kind==='SKIP'||kind==='COMMENT'){col+=raw.length;pos+=raw.length;matched=true;break}
      let val=raw;
      if(kind==='NUMBER')val=parseInt(raw,10);
      else if(kind==='FLOAT')val=parseFloat(raw);
      else if(kind==='BOOL')val=raw==='true';
      else if(kind==='STRING')val=raw.slice(1,-1);
      tokens.push({kind,value:val,raw,line,col});
      col+=raw.length;pos+=raw.length;matched=true;break;
    }
    if(!matched){
      const unk=code.slice(pos).match(/^\S+/);const raw=unk?unk[0]:code[pos];
      tokens.push({kind:'UNKNOWN',value:raw,raw,line,col});col+=raw.length;pos+=raw.length;
    }
  }
  tokens.push({kind:'EOF',value:null,line,col});
  return tokens;
}

function tkClass(k){
  return KEYWORDS.has(k)?'tk-KW':['NUMBER','FLOAT'].includes(k)?'tk-NUM':k==='STRING'?'tk-STR':k==='BOOL'?'tk-BOOL':k==='ID'?'tk-ID':k==='UNKNOWN'?'tk-ERR':'tk-EOF';
}

function parse(tokens){
  let pos=0;const stmts=[],errors=[];
  const cur=()=>tokens[pos],adv=()=>tokens[pos<tokens.length-1?pos++:pos];
  const expectK=k=>{if(cur().kind!==k)throw`Expected ${k} got ${cur().kind} at line ${cur().line}`;return adv()};
  const num=()=>{if(cur().kind!=='NUMBER'&&cur().kind!=='FLOAT')throw`Expected number got ${cur().kind} at line ${cur().line}`;return adv().value};
  const str=()=>{if(cur().kind!=='STRING')throw`Expected string got ${cur().kind} at line ${cur().line}`;return adv().value};
  while(cur().kind!=='EOF'){
    try{
      const k=cur().kind;
      if(k==='PLAYER'){adv();const a=cur().kind;
        if(a==='SPEED'){adv();stmts.push({type:'player_speed',speed:num()})}
        else if(a==='LIVES'){adv();stmts.push({type:'player_lives',lives:num()})}
        else if(a==='SIZE'){adv();stmts.push({type:'player_size',size:num()})}
        else if(a==='COLOR'){adv();stmts.push({type:'player_color',color:str()})}
        else throw`Unknown PLAYER attr ${a}`}
      else if(k==='INCREASE'){adv();const t=cur().kind;
        if(t==='SPEED'){adv();const am=num();expectK('EVERY');stmts.push({type:'increase_speed',amount:am,interval:num()})}
        else if(t==='SCORE'){adv();expectK('BY');stmts.push({type:'increase_score',amount:num()})}
        else throw`Unknown INCREASE target ${t}`}
      else if(k==='OBSTACLE'){adv();const a=cur().kind;
        if(a==='SPAWN'){adv();expectK('RATE');stmts.push({type:'obstacle_spawn_rate',rate:num()})}
        else if(a==='SPEED'){adv();stmts.push({type:'obstacle_speed',speed:num()})}
        else if(a==='SIZE'){adv();stmts.push({type:'obstacle_size',size:num()})}
        else if(a==='COLOR'){adv();stmts.push({type:'obstacle_color',color:str()})}
        else throw`Unknown OBSTACLE attr ${a}`}
      else if(k==='COIN'){adv();const a=cur().kind;
        if(a==='VALUE'){adv();stmts.push({type:'coin_value',value:num()})}
        else if(a==='SPAWN'){adv();expectK('RATE');stmts.push({type:'coin_spawn_rate',rate:num()})}
        else if(a==='COLOR'){adv();stmts.push({type:'coin_color',color:str()})}
        else throw`Unknown COIN attr ${a}`}
      else if(k==='POWERUP'){adv();const a=cur().kind;
        if(a==='SPAWN'){adv();expectK('RATE');stmts.push({type:'powerup_spawn_rate',rate:num()})}
        else if(a==='VALUE'){adv();stmts.push({type:'powerup_value',value:num()})}
        else throw`Unknown POWERUP attr ${a}`}
      else if(k==='BACKGROUND'){adv();const a=cur().kind;
        if(a==='COLOR'){adv();stmts.push({type:'background_color',color:str()})}
        else if(a==='SPEED'){adv();stmts.push({type:'background_speed',speed:num()})}
        else throw`Unknown BACKGROUND attr ${a}`}
      else if(k==='DIFFICULTY'){adv();const lv=cur().kind;
        if(['EASY','MEDIUM','HARD'].includes(lv)){adv();stmts.push({type:'difficulty',level:lv.toLowerCase()})}
        else throw`Expected EASY|MEDIUM|HARD got ${lv}`}
      else if(k==='SOUND'){adv();const e=cur().kind;
        if(e==='ENABLE'||e==='DISABLE'){adv();stmts.push({type:'sound',enabled:e==='ENABLE'})}
        else throw`Expected ENABLE|DISABLE after SOUND`}
      else if(k==='MUSIC'){adv();const e=cur().kind;
        if(e==='ENABLE'||e==='DISABLE'){adv();stmts.push({type:'music',enabled:e==='ENABLE'})}
        else throw`Expected ENABLE|DISABLE after MUSIC`}
      else if(k==='SET'){adv();const n=expectK('ID').value;stmts.push({type:'set_var',name:n,value:num()})}
      else{throw`Unexpected token '${cur().value}' (${cur().kind}) at line ${cur().line}`}
    }catch(e){errors.push(String(e));adv()}
  }
  return{statements:stmts,errors};
}

function analyse(stmts){
  const warnings=[],errors=[],seen=new Set(stmts.map(s=>s.type));
  if(!seen.has('player_speed'))errors.push('Missing required: PLAYER SPEED');
  if(!seen.has('player_lives'))errors.push('Missing required: PLAYER LIVES');
  const BOUNDS={
    player_speed:{speed:[1,9999]},player_lives:{lives:[1,10]},player_size:{size:[1,500]},
    increase_speed:{amount:[0.1,100],interval:[1,3600]},obstacle_spawn_rate:{rate:[0,100]},
    coin_value:{value:[1,1e6]},coin_spawn_rate:{rate:[0,100]},powerup_spawn_rate:{rate:[0,100]},
    powerup_value:{value:[1,1e6]},background_speed:{speed:[0,9999]}
  };
  for(const s of stmts){
    const b=BOUNDS[s.type]||{};
    for(const[f,[lo,hi]] of Object.entries(b)){
      const v=s[f];
      if(v!==undefined){
        if(v<lo)errors.push(`${s.type}.${f} = ${v} is below min (${lo})`);
        if(v>hi)errors.push(`${s.type}.${f} = ${v} exceeds max (${hi})`);
      }
    }
  }
  const coinR=stmts.find(s=>s.type==='coin_spawn_rate');
  if(seen.has('coin_value')&&coinR&&coinR.rate===0)warnings.push('COIN VALUE set but COIN SPAWN RATE is 0 — coins will never appear.');
  const puR=stmts.find(s=>s.type==='powerup_spawn_rate');
  if(seen.has('powerup_value')&&puR&&puR.rate===0)warnings.push('POWERUP VALUE set but SPAWN RATE is 0 — power-ups will never appear.');
  const is=stmts.find(s=>s.type==='increase_speed');
  if(is&&is.interval<3)warnings.push(`INCREASE SPEED interval ${is.interval}s is very short — game may become impossible quickly.`);
  const passed=[];
  if(seen.has('player_speed'))passed.push('PLAYER SPEED defined ✓');
  if(seen.has('player_lives'))passed.push('PLAYER LIVES defined ✓');
  if(seen.has('difficulty'))passed.push('DIFFICULTY level set ✓');
  if(seen.has('obstacle_spawn_rate'))passed.push('Obstacle spawning configured ✓');
  if(seen.has('coin_value'))passed.push('Coin economy defined ✓');
  passed.push(`${stmts.length} statements validated without errors ✓`);
  return{errors,warnings,passed};
}

function codegen(stmts){
  const cfg={};
  const s=(path,val)=>{const ps=path.split('.');let o=cfg;for(let i=0;i<ps.length-1;i++){if(!o[ps[i]])o[ps[i]]={};o=o[ps[i]]}o[ps[ps.length-1]]=val};
  const MAP={
    player_speed:n=>s('player.speed',n.speed),player_lives:n=>s('player.lives',n.lives),
    player_size:n=>s('player.size',n.size),player_color:n=>s('player.color',n.color),
    increase_speed:n=>{s('speed_increase.amount',n.amount);s('speed_increase.interval',n.interval)},
    increase_score:n=>s('score.increase_by',n.amount),
    obstacle_spawn_rate:n=>s('obstacle.spawn_rate',n.rate),obstacle_speed:n=>s('obstacle.speed',n.speed),
    obstacle_size:n=>s('obstacle.size',n.size),obstacle_color:n=>s('obstacle.color',n.color),
    coin_value:n=>s('coin.value',n.value),coin_spawn_rate:n=>s('coin.spawn_rate',n.rate),
    coin_color:n=>s('coin.color',n.color),
    powerup_spawn_rate:n=>s('powerup.spawn_rate',n.rate),powerup_value:n=>s('powerup.value',n.value),
    background_color:n=>s('background.color',n.color),background_speed:n=>s('background.speed',n.speed),
    difficulty:n=>cfg['difficulty']=n.level,sound:n=>s('audio.sound',n.enabled),
    music:n=>s('audio.music',n.enabled),set_var:n=>s(`variables.${n.name}`,n.value),
  };
  stmts.forEach(st=>{if(MAP[st.type])MAP[st.type](st)});
  return cfg;
}

// ── PARSE TREE RENDERER (D3-free SVG) ──
function buildTreeData(stmts){
  const groups={};
  stmts.forEach(s=>{
    const root=s.type.split('_')[0];
    if(!groups[root])groups[root]=[];
    groups[root].push(s);
  });
  return{name:'PROGRAM',children:Object.entries(groups).map(([k,nodes])=>({
    name:k.toUpperCase(),
    children:nodes.map(n=>({
      name:n.type.replace(/_/g,' ').toUpperCase(),
      value:Object.entries(n).filter(([ek])=>ek!=='type').map(([ek,ev])=>`${ek}:${JSON.stringify(ev)}`).join(' ')
    }))
  }))};
}

function renderTree(containerId, stmts, stageColor){
  const container=document.getElementById(containerId);
  if(!container||stmts.length===0){if(container)container.innerHTML='<div class="ph">No AST nodes to render.</div>';return}
  const treeData=buildTreeData(stmts);
  const W=container.clientWidth||600, H=container.clientHeight||320;
  
  // Manual layout
  const nodes=[];
  const rootX=W/2, rootY=32;
  nodes.push({...treeData,x:rootX,y:rootY,depth:0,id:0});
  
  const children=treeData.children||[];
  const spacing=W/(children.length+1);
  children.forEach((child,ci)=>{
    const cx=spacing*(ci+1), cy=110;
    nodes.push({...child,x:cx,y:cy,depth:1,parentX:rootX,parentY:rootY,id:nodes.length});
    const gc=child.children||[];
    const gspacing=(spacing*0.9)/(gc.length+1);
    gc.forEach((grand,gi)=>{
      nodes.push({...grand,x:cx-spacing*0.45+gspacing*(gi+1),y:200,depth:2,parentX:cx,parentY:cy,id:nodes.length});
    });
  });
  
  const svgEl=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svgEl.setAttribute('width','100%');svgEl.setAttribute('height','100%');
  svgEl.setAttribute('viewBox',`0 0 ${W} ${H>280?H:280}`);
  
  // Draw edges first
  nodes.filter(n=>n.depth>0).forEach(n=>{
    const line=document.createElementNS('http://www.w3.org/2000/svg','path');
    const d=`M${n.parentX},${n.parentY+14} C${n.parentX},${(n.parentY+n.y)/2} ${n.x},${(n.parentY+n.y)/2} ${n.x},${n.y-14}`;
    line.setAttribute('d',d);line.setAttribute('fill','none');
    line.setAttribute('stroke','rgba(42,52,80,.8)');line.setAttribute('stroke-width','1.5');
    svgEl.appendChild(line);
  });
  
  // Draw nodes
  const colors=['#e0e6ff','#5b8def','#a07ee8'];
  nodes.forEach(n=>{
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    const rx=n.depth===0?60:n.depth===1?52:45;
    const ry=n.depth===0?14:12;
    const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x',n.x-rx);rect.setAttribute('y',n.y-ry);
    rect.setAttribute('width',rx*2);rect.setAttribute('height',ry*2);
    rect.setAttribute('rx','5');
    const bg=['rgba(14,30,61,.9)','rgba(30,20,50,.9)','rgba(10,20,15,.9)'][n.depth];
    rect.setAttribute('fill',bg);
    rect.setAttribute('stroke',n.depth===0?stageColor||colors[0]:colors[n.depth]);
    rect.setAttribute('stroke-width',n.depth===0?'1.5':'1');
    g.appendChild(rect);
    const text=document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x',n.x);text.setAttribute('y',n.y);
    text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','middle');
    text.setAttribute('fill',n.depth===0?stageColor||colors[0]:colors[n.depth]);
    text.setAttribute('font-family','JetBrains Mono, monospace');
    text.setAttribute('font-size',n.depth===0?'11':'9.5');
    text.setAttribute('font-weight','700');
    const label=n.name.length>14?n.name.slice(0,12)+'…':n.name;
    text.textContent=label;g.appendChild(text);
    if(n.value&&n.depth===2){
      const val=document.createElementNS('http://www.w3.org/2000/svg','text');
      val.setAttribute('x',n.x);val.setAttribute('y',n.y+20);
      val.setAttribute('text-anchor','middle');val.setAttribute('dominant-baseline','middle');
      val.setAttribute('fill','rgba(196,204,232,.5)');val.setAttribute('font-family','JetBrains Mono, monospace');
      val.setAttribute('font-size','8');
      const vlabel=n.value.length>20?n.value.slice(0,18)+'…':n.value;
      val.textContent=vlabel;g.appendChild(val);
    }
    svgEl.appendChild(g);
  });
  container.innerHTML='';
  container.appendChild(svgEl);
}

// ── GRAMMAR RULES ──
const GRAMMAR = [
  {name:'program',body:'statement* EOF',comment:'// root node'},
  {name:'statement',body:'player_stmt | increase_stmt | obstacle_stmt | coin_stmt | powerup_stmt | background_stmt | difficulty_stmt | sound_stmt | music_stmt | set_stmt',comment:''},
  {name:'player_stmt',body:'PLAYER ( SPEED | LIVES | SIZE ) NUMBER | PLAYER COLOR STRING',comment:'// 4 variants'},
  {name:'increase_stmt',body:'INCREASE SPEED NUMBER EVERY NUMBER | INCREASE SCORE BY NUMBER',comment:'// 2 variants'},
  {name:'obstacle_stmt',body:'OBSTACLE ( SPAWN RATE | SPEED | SIZE ) NUMBER | OBSTACLE COLOR STRING',comment:'// 4 variants'},
  {name:'coin_stmt',body:'COIN ( VALUE | SPAWN RATE ) NUMBER | COIN COLOR STRING',comment:'// 3 variants'},
  {name:'powerup_stmt',body:'POWERUP ( SPAWN RATE | VALUE ) NUMBER',comment:'// 2 variants'},
  {name:'background_stmt',body:'BACKGROUND COLOR STRING | BACKGROUND SPEED NUMBER',comment:'// 2 variants'},
  {name:'difficulty_stmt',body:'DIFFICULTY ( EASY | MEDIUM | HARD )',comment:'// 3 levels'},
  {name:'sound_stmt',body:'SOUND ( ENABLE | DISABLE )',comment:''},
  {name:'music_stmt',body:'MUSIC ( ENABLE | DISABLE )',comment:''},
  {name:'set_stmt',body:'SET ID NUMBER',comment:'// user-defined vars'},
];