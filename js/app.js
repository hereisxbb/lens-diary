const KEY='lensDiaryMVP_v23';
const state=JSON.parse(localStorage.getItem(KEY)||'{"lenses":[],"diaries":[]}');
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let lensWorkingImages=[], diaryWorkingImages=[], productWorkingImage='', productOriginalImage='';
let diaryCoverIndex=0, diaryCoverZoom=1, diaryCoverX=0, diaryCoverY=0;
const expandedDiaries=new Set();

// DEMO SEED DATA - fictional examples for MVP demonstration only
const communityPosts=[
  {
    id:'p1',kind:'recommend',user:'示例用户 A',avatar:'A',days:'佩戴 3 次',
    title:'灰色很出片，但不是“全天无感”的那种',
    text:'冷光下显色很好，拍照眼神会更亮。下午开始有一点干，所以我会更愿意把它留给拍照或短时间出门。',
    pros:'显色干净、照片里有存在感',
    cons:'长时间佩戴后偏干',
    forWho:'喜欢灰调、拍照感强的人',
    notFor:'追求全天舒适或素颜隐形感的人',
    lens:{brand:'OLENS',name:'冰葡萄灰',color:'灰色',dia:'14.2 mm',gdia:'13.2 mm',water:'38%',cycle:'月抛',rating:4,comfort:3},
    emoji:'🩶'
  },
  {
    id:'p2',kind:'avoid',user:'示例用户 B',avatar:'B',days:'佩戴 2 次',
    title:'不是产品差，是它真的不适合我的眼睛',
    text:'着色直径对我来说偏大，素颜时会显得有点突兀。妆感重的时候还能驾驭，但我不会因为热门就继续硬戴。',
    pros:'颜色很漂亮，包装也精致',
    cons:'在我眼睛上放大感过强',
    forWho:'喜欢明显大直径、完整妆容的人',
    notFor:'偏好自然感、小眼裂或日常素颜的人',
    lens:{brand:'moody',name:'焦糖黑巧',color:'棕色',dia:'14.2 mm',gdia:'13.8 mm',water:'55%',cycle:'日抛',rating:3,comfort:4},
    emoji:'🤎'
  },
  {
    id:'p3',kind:'recommend',user:'示例用户 C',avatar:'C',days:'佩戴 6 次',
    title:'我会复购，但主要是因为“省心”',
    text:'它不是最惊艳的一副，但日常通勤不需要想太多，妆淡也不会突兀。对我来说，“稳定好用”比一次性的惊艳更重要。',
    pros:'自然、好搭妆、日常使用成本低',
    cons:'拍照时存在感比较弱',
    forWho:'通勤、上课、喜欢低存在感的人',
    notFor:'想要强显色或明显混血感的人',
    lens:{brand:'海俪恩',name:'奶茶棕',color:'棕色',dia:'14.0 mm',gdia:'13.3 mm',water:'42%',cycle:'日抛',rating:5,comfort:5},
    emoji:'☕'
  }
];
let communityFilter='all';
const communityUI=JSON.parse(localStorage.getItem('lensDiaryCommunityUI')||'{"likes":[],"saves":[]}');

let diaryCoverDraft={zoom:1,x:0,y:0,dragging:false,lastX:0,lastY:0};
let cropState={src:'', naturalW:0, naturalH:0, baseScale:1, zoom:1, x:0, y:0, dragging:false, lastX:0, lastY:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1900)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(e){console.error(e);toast('本地空间不足，请删几张大图');return false}}
function compress(file,max=1080,q=.72){return new Promise((res,rej)=>{if(!file)return res('');const r=new FileReader();r.onerror=()=>rej(new Error('图片读取失败'));r.onload=()=>{const img=new Image();img.onerror=()=>rej(new Error('图片解析失败'));img.onload=()=>{let w=img.width,h=img.height,s=Math.min(1,max/Math.max(w,h));w=Math.round(w*s);h=Math.round(h*s);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);res(c.toDataURL('image/jpeg',q))};img.src=r.result};r.readAsDataURL(file)})}
async function compressMany(files){const out=[];for(const f of [...files])out.push(await compress(f));return out}
function strip(images,small=false){if(!images?.length)return'';return `<div class="photo-strip">${images.map(i=>`<div class="photo ${small?'small':''}"><img src="${i}" alt=""></div>`).join('')}</div>`}
function chosen(selId,customId){const s=$(selId),c=$(customId);return s.value==='__custom'?c.value.trim():s.value}
function setChoice(selId,customId,value){const s=$(selId),c=$(customId);const vals=[...s.options].map(o=>o.value);if(!value){s.value='';c.value='';c.classList.remove('show');return}if(vals.includes(value)){s.value=value;c.value='';c.classList.remove('show')}else{s.value='__custom';c.value=value;c.classList.add('show')}}
function bindCustom(selId,customId){const s=$(selId),c=$(customId);s.onchange=()=>{const yes=s.value==='__custom';c.classList.toggle('show',yes);if(yes)c.focus();else c.value=''}}

function lensHTML(x){
return `<div class="card">
<div class="archive-main">
  <div class="product-cover">${x.productImage?`<img src="${x.productImage}" alt="${esc(x.name)} 产品图">`:'暂无产品图'}</div>
  <div class="archive-info">
    <div class="card-top">
      <div><div class="lens-title">${esc(x.brand)} · ${esc(x.name)}</div><div class="lens-sub"><span class="rating">★ ${esc(x.rating)}</span> · 舒适度 ${esc(x.comfort)}/5</div></div>
      <button class="icon-btn" onclick="editLens('${x.id}')">编辑</button>
    </div>
    <div class="meta-row">${[x.color,x.dia&&'DIA '+x.dia,x.gdia&&'G.DIA '+x.gdia,x.limbal,x.water&&'含水 '+x.water,x.bc&&'BC '+x.bc,x.cycle].filter(Boolean).map(v=>`<span class="chip">${esc(v)}</span>`).join('')}</div>
    ${x.note?`<div class="note">${esc(x.note)}</div>`:''}
  </div>
</div>
${strip(x.images,true)}</div>`}
function diaryFrameHTML(d,imageIndex,displayPos,total){
  const src=d.images?.[imageIndex];
  if(!src)return'';
  const isCover=imageIndex===(d.coverIndex??0);
  const z=isCover?(d.coverZoom??1):1;
  const x=isCover?(d.coverX??0):0;
  const y=isCover?(d.coverY??0):0;
  return `<div class="diary-frame" onclick="openViewer('${d.id}',${imageIndex})">
    <img class="diary-frame-bg" src="${src}" alt="">
    <img class="diary-frame-fg" src="${src}" alt=""
      style="left:${50+x}%;top:${50+y}%;transform:translate(-50%,-50%) scale(${z})">
    ${isCover?'<span class="cover-tag">封面</span>':''}
    <span class="photo-index">${displayPos+1} / ${total}</span>
  </div>`;
}

function diaryCollapsedHTML(d){
  const imgs=d.images||[];
  if(!imgs.length)return'';
  const cover=Math.max(0,Math.min(d.coverIndex??0,Math.max(0,imgs.length-1)));
  const order=[cover,...imgs.map((_,i)=>i).filter(i=>i!==cover)];
  const visible=order.slice(0,4);

  return `<div class="diary-collapsed">
    ${visible.map((idx,pos)=>{
      const remaining=imgs.length-4;
      const isLast=pos===3 && remaining>0;
      return `<div class="diary-mini ${isLast?'more':''}" ${isLast?`data-more="+${remaining}"`:''}
        onclick="${isLast?`toggleDiaryExpand('${d.id}')`:`openViewer('${d.id}',${idx})`}">
        <img src="${imgs[idx]}" alt="">
      </div>`;
    }).join('')}
  </div>`;
}

window.toggleDiaryExpand=id=>{
  if(expandedDiaries.has(id)) expandedDiaries.delete(id);
  else expandedDiaries.add(id);
  renderDiaries();
};

function diaryHTML(d){
  const l=state.lenses.find(x=>x.id===d.lensId);
  const imgs=d.images||[];
  const cover=Math.max(0,Math.min(d.coverIndex??0,Math.max(0,imgs.length-1)));
  const order=imgs.length?[cover,...imgs.map((_,i)=>i).filter(i=>i!==cover)]:[];
  const expanded=expandedDiaries.has(d.id);

  return `<div class="card">
    <div class="card-top">
      <div>
        <div class="lens-title">${l?esc(l.brand+' · '+l.name):'未绑定美瞳'}</div>
        <div class="lens-sub">${esc(d.date||'未填写日期')} · ${esc(d.scene||'')}</div>
      </div>
      <button class="icon-btn" onclick="editDiary('${d.id}')">编辑</button>
    </div>

    ${d.note?`<div class="note">${esc(d.note)}</div>`:''}

    ${imgs.length ? diaryCollapsedHTML(d) : ''}

    ${imgs.length ? `<div class="diary-expand-row">
      <div class="lens-sub">${imgs.length} 张照片</div>
      <button class="expand-btn" onclick="toggleDiaryExpand('${d.id}')">${expanded?'收起':'展开查看'}</button>
    </div>` : ''}

    <div class="diary-expanded ${expanded?'show':''}">
      ${imgs.length?`<div class="diary-strip">${order.map((idx,pos)=>diaryFrameHTML(d,idx,pos,imgs.length)).join('')}</div>`:''}
    </div>
  </div>`;
}


function communityKindLabel(kind){return kind==='avoid'?'避雷':'种草'}
function saveCommunityUI(){
  localStorage.setItem('lensDiaryCommunityUI',JSON.stringify(communityUI));
}
function renderCommunity(){
  const feed=$('#communityFeed');
  if(!feed)return;
  const posts=communityPosts.filter(p=>communityFilter==='all'||p.kind===communityFilter);
  feed.innerHTML=posts.length?posts.map(p=>{
    const liked=communityUI.likes.includes(p.id), saved=communityUI.saves.includes(p.id);
    return `<article class="post-card">
      <div class="post-cover placeholder">
        <span>${p.emoji}</span>
        <div class="post-kind">${communityKindLabel(p.kind)}</div>
      </div>
      <div class="post-body">
        <div class="post-user">
          <div class="user-main"><div class="avatar">${esc(p.avatar)}</div><div><div class="user-name">${esc(p.user)}</div><div class="user-meta">${esc(p.days)} · 示例用户</div></div></div>
          <span class="chip">${p.kind==='avoid'?'不推荐 ≠ 产品一定差':'喜欢 ≠ 人人必买'}</span>
        </div>
        <h4 class="post-title">${esc(p.title)}</h4>
        <p class="post-text">${esc(p.text)}</p>

        <div class="truth-grid">
          <div class="truth-box"><b>我喜欢的</b><span>${esc(p.pros)}</span></div>
          <div class="truth-box"><b>我不喜欢的</b><span>${esc(p.cons)}</span></div>
          <div class="truth-box"><b>可能适合</b><span>${esc(p.forWho)}</span></div>
          <div class="truth-box"><b>可能不适合</b><span>${esc(p.notFor)}</span></div>
        </div>

        <div class="post-lens">
          <b>${esc(p.lens.brand)} · ${esc(p.lens.name)}</b><br>
          ${esc(p.lens.color)} · DIA ${esc(p.lens.dia)} · G.DIA ${esc(p.lens.gdia)} · 含水 ${esc(p.lens.water)} · ${esc(p.lens.cycle)}
        </div>

        <div class="post-actions">
          <button class="${liked?'active':''}" onclick="toggleCommunityLike('${p.id}')">${liked?'♥ 已赞':'♡ 有帮助'}</button>
          <button class="${saved?'active':''}" onclick="toggleCommunitySave('${p.id}')">${saved?'★ 已收藏':'☆ 收藏'}</button>
          <button onclick="addCommunityLens('${p.id}')">＋ 加入我的档案</button>
        </div>
      </div>
    </article>`;
  }).join(''):`<div class="community-empty">这个筛选下暂时没有内容。</div>`;
}
window.toggleCommunityLike=id=>{
  const i=communityUI.likes.indexOf(id);
  if(i>=0)communityUI.likes.splice(i,1);else communityUI.likes.push(id);
  saveCommunityUI();renderCommunity();
}
window.toggleCommunitySave=id=>{
  const i=communityUI.saves.indexOf(id);
  if(i>=0)communityUI.saves.splice(i,1);else communityUI.saves.push(id);
  saveCommunityUI();renderCommunity();
}
window.addCommunityLens=id=>{
  const p=communityPosts.find(x=>x.id===id);if(!p)return;
  openLens();
  setTimeout(()=>{
    setChoice('#brandSelect','#brandCustom',p.lens.brand);
    $('#productName').value=p.lens.name;
    setChoice('#colorSelect','#colorCustom',p.lens.color);
    setChoice('#diaSelect','#diaCustom',p.lens.dia);
    setChoice('#gdiaSelect','#gdiaCustom',p.lens.gdia);
    setChoice('#waterSelect','#waterCustom',p.lens.water);
    setChoice('#cycleSelect','#cycleCustom',p.lens.cycle);
    $('#rating').value=String(p.lens.rating||4);
    $('#comfort').value=String(p.lens.comfort||4);
    $('#lensNote').value='来自社区参考：'+p.title+'。请按自己的真实佩戴体验修改。';
    toast('已预填参考参数，请按自己的体验修改');
  },0);
}
$$('[data-community-filter]').forEach(b=>{
  b.onclick=()=>{
    communityFilter=b.dataset.communityFilter;
    $$('[data-community-filter]').forEach(x=>x.classList.toggle('active',x===b));
    renderCommunity();
  }
});


function lensAgentInsight(){
  if(!state.lenses.length){
    return '先记录 2–3 款你真实戴过的美瞳，我会从你的历史里慢慢总结偏好，而不是根据热门榜单催你消费。';
  }

  const avgComfort=(state.lenses.reduce((s,x)=>s+Number(x.comfort||0),0)/state.lenses.length).toFixed(1);
  const colorCount={};
  state.lenses.forEach(x=>{if(x.color)colorCount[x.color]=(colorCount[x.color]||0)+1});
  const topColor=Object.entries(colorCount).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const best=[...state.lenses].sort((a,b)=>{
    return (Number(b.rating||0)+Number(b.comfort||0))-(Number(a.rating||0)+Number(a.comfort||0));
  })[0];

  const parts=[];
  if(topColor)parts.push(`你目前最常记录的是 ${topColor}`);
  parts.push(`平均舒适度约 ${avgComfort}/5`);
  if(best)parts.push(`${best.brand} · ${best.name} 暂时是综合表现比较好的记录`);
  return parts.join('；')+'。这些结论只基于你自己的数据。';
}

function lensAgentAnswer(q){
  const text=(q||'').trim();
  if(!text){
    return '可以问我：我更常戴什么颜色？哪款最舒服？哪款值得复购？';
  }
  if(!state.lenses.length){
    return '你现在还没有足够的个人记录。先添加几款真实戴过的美瞳，我再帮你分析。';
  }

  const colors={};
  state.lenses.forEach(x=>{if(x.color)colors[x.color]=(colors[x.color]||0)+1});
  const topColor=Object.entries(colors).sort((a,b)=>b[1]-a[1])[0]?.[0]||'暂时看不出来';

  const mostComfort=[...state.lenses].sort((a,b)=>Number(b.comfort||0)-Number(a.comfort||0))[0];
  const best=[...state.lenses].sort((a,b)=>{
    return (Number(b.rating||0)+Number(b.comfort||0))-(Number(a.rating||0)+Number(a.comfort||0));
  })[0];

  if(/颜色|色系|灰|棕|黑|蓝|绿|紫/.test(text)){
    return `按你现有的 ${state.lenses.length} 条档案，你最常记录的是 ${topColor}。不过“最常买”不等于“最适合”，最好再结合照片日记里的真实出片效果判断。`;
  }

  if(/舒服|舒适|干|干涩|异物/.test(text)){
    return mostComfort
      ? `目前舒适度最高的是 ${mostComfort.brand} · ${mostComfort.name}（${mostComfort.comfort}/5）。以后如果增加“佩戴时长”和“几点开始干”的记录，我还能区分短时舒服和全天舒服。`
      : '目前舒适度记录还不够。';
  }

  if(/复购|再买|值得|推荐|回购/.test(text)){
    return best
      ? `如果只看你自己的评分与舒适度，${best.brand} · ${best.name} 目前最值得优先回看。不过先确认手头有没有相似款，不需要因为“高分”就马上再买。`
      : '目前还没有足够数据判断。';
  }

  if(/直径|着色|放大|小直径|大直径/.test(text)){
    const vals=state.lenses.map(x=>parseFloat(x.gdia)).filter(Number.isFinite);
    if(vals.length){
      const avg=(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);
      return `你已记录的着色直径平均约 ${avg} mm。这只能反映历史选择，不代表更大或更小一定更适合；还要结合眼裂、妆容和你想要的自然程度。`;
    }
    return '你现在的档案里着色直径数据还不够。';
  }

  return lensAgentInsight();
}

function renderLensAgent(){
  return `
  <div class="agent-card">
    <div class="agent-head">
      <div class="agent-avatar">AI</div>
      <div>
        <h3>Lens Agent</h3>
        <p>只理解你的记录，不催你买更多</p>
      </div>
    </div>

    <div class="agent-insight">${esc(lensAgentInsight())}</div>

    <div class="agent-chips">
      <button class="agent-chip" onclick="askLensAgent('我更常戴什么颜色？')">我更常戴什么颜色？</button>
      <button class="agent-chip" onclick="askLensAgent('哪款最舒服？')">哪款最舒服？</button>
      <button class="agent-chip" onclick="askLensAgent('哪款值得复购？')">哪款值得复购？</button>
    </div>

    <div class="agent-chat">
      <input id="agentInput" placeholder="问问我的美瞳记录…" />
      <button class="primary" onclick="askLensAgent()">问一下</button>
    </div>

    <div class="agent-answer" id="agentAnswer"></div>
    <div class="agent-disclaimer">MVP 版目前使用本地规则分析。正式产品可接入 AI，让它理解更多照片、日记与长期偏好。</div>
  </div>`;
}

window.askLensAgent=(preset='')=>{
  const input=$('#agentInput');
  const q=preset || input?.value || '';
  if(input && preset) input.value=preset;
  const ans=$('#agentAnswer');
  if(!ans)return;
  ans.textContent=lensAgentAnswer(q);
  ans.classList.add('show');
};

function renderHome(){
const e=$('#homeContent');

if(!state.lenses.length){
  e.innerHTML=`
  <div class="home-carousel" id="homeCarousel">
    <div class="home-slide">
      <div class="eyebrow">Lens Diary</div>
      <h3>记住每一次好看的眼睛。</h3>
      <p>把产品参数、佩戴照片和真实感受放在一起，下次不用再重新翻订单、找照片、回忆感受。</p>
      <div class="actions"><button class="primary" onclick="openLens()">＋ 记录第一款</button></div>
    </div>
    <div class="home-slide">
      <div class="eyebrow">更轻松地开始</div>
      <h3>淘宝截图可以先帮你填参数。</h3>
      <p>让识别负责第一遍录入，你只需要检查和修正。截图里没有的信息不会强行猜。</p>
      <div class="actions"><button class="secondary" onclick="openLens()">试试截图识别</button></div>
    </div>
    <div class="home-slide">
      <div class="eyebrow">照片日记</div>
      <h3>出片照保留原比例。</h3>
      <p>列表里紧凑浏览，需要时再展开，点开还能按原始比例左右滑动。</p>
    </div>
  </div>

  <div class="carousel-dots" id="homeDots">
    <i class="carousel-dot active"></i><i class="carousel-dot"></i><i class="carousel-dot"></i>
  </div>

  ${renderLensAgent()}

  <div class="section-head"><h3>发现</h3><span>未来可扩展</span></div>
  <div class="sponsor-slot">
    <div class="sponsor-icon">✦</div>
    <div>
      <b>品牌合作 / 内容推荐位</b>
      <p>未来可以放护理知识、新品试戴或品牌活动，但推荐逻辑不以“让你买更多”为目标。</p>
      <small>当前仅为 MVP 占位，不展示真实广告</small>
    </div>
  </div>`;

  requestAnimationFrame(bindHomeCarousel);
  return;
}

const avg=(state.lenses.reduce((s,x)=>s+Number(x.rating||0),0)/state.lenses.length).toFixed(1);
const latest=state.diaries.slice(-1)[0];
const top=[...state.lenses].sort((a,b)=>b.rating-a.rating).slice(0,3);

e.innerHTML=`
<div class="home-carousel" id="homeCarousel">
  <div class="home-slide">
    <div class="eyebrow">你的个人美瞳数据库</div>
    <h3>已经记录 ${state.lenses.length} 款。</h3>
    <p>不是种草清单，而是你自己的佩戴历史。</p>
    <div class="actions">
      <button class="primary" onclick="openDiary()">＋ 写照片日记</button>
      <button class="secondary" onclick="openLens()">＋ 添加美瞳</button>
    </div>
  </div>

  <div class="home-slide">
    <div class="eyebrow">本周复盘</div>
    <h3>${latest?'最近一次：'+esc(latest.scene||'日常'):'还没有新的照片日记'}</h3>
    <p>${latest?esc(latest.note||'已经记录了这次真实佩戴。'):'下次出片时顺手留下一条真实感受。'}</p>
    <div class="actions"><button class="secondary" onclick="switchView('diaryView')">查看照片日记</button></div>
  </div>

  <div class="home-slide">
    <div class="eyebrow">值得再戴</div>
    <h3>${top[0]?esc(top[0].brand+' · '+top[0].name):'慢慢找到你的高分款'}</h3>
    <p>${top[0]?`当前评分 ${esc(top[0].rating)}/5，舒适度 ${esc(top[0].comfort)}/5。`:'记录两三款后，这里会更有参考价值。'}</p>
    <div class="actions"><button class="secondary" onclick="switchView('lensesView')">查看档案</button></div>
  </div>
</div>

<div class="carousel-dots" id="homeDots">
  <i class="carousel-dot active"></i><i class="carousel-dot"></i><i class="carousel-dot"></i>
</div>

<div class="stats" style="margin-top:14px">
  <div class="stat"><strong>${state.lenses.length}</strong><span>美瞳档案</span></div>
  <div class="stat"><strong>${state.diaries.length}</strong><span>照片日记</span></div>
  <div class="stat"><strong>${avg}</strong><span>平均评分</span></div>
</div>

${renderLensAgent()}

<div class="section-head"><h3>可能会喜欢</h3><span>未来推荐位</span></div>
<div class="sponsor-slot">
  <div class="sponsor-icon">✦</div>
  <div>
    <b>品牌合作 / 内容推荐位</b>
    <p>未来可以结合用户自己选择的偏好展示护理知识、新品试戴或活动链接，同时保留“不买也可以”的产品立场。</p>
    <small>当前仅为 MVP 占位，不展示真实广告</small>
  </div>
</div>`;

requestAnimationFrame(bindHomeCarousel);
}

function bindHomeCarousel(){
  const c=$('#homeCarousel'), dots=$$('#homeDots .carousel-dot');
  if(!c||!dots.length)return;
  let raf=0;
  c.onscroll=()=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      const slide=c.querySelector('.home-slide');
      if(!slide)return;
      const step=slide.getBoundingClientRect().width+12;
      const idx=Math.max(0,Math.min(dots.length-1,Math.round(c.scrollLeft/step)));
      dots.forEach((d,i)=>d.classList.toggle('active',i===idx));
    });
  };
}
function renderLenses(){
const q=$('#lensSearch').value.trim().toLowerCase();
const f=state.lenses.filter(x=>[x.brand,x.name,x.color,x.dia,x.gdia,x.limbal,x.water,x.bc,x.cycle,x.note].join(' ').toLowerCase().includes(q));
$('#lensCountText').textContent=`${state.lenses.length} 款`;$('#lensSearchNote').textContent=q?`找到 ${f.length} 条`:'';
$('#lensList').innerHTML=f.length?f.slice().reverse().map(lensHTML).join(''):`<div class="empty"><h3>${state.lenses.length?'没有匹配结果':'还没有档案'}</h3><p>${state.lenses.length?'换一个关键词试试。':'先记录一款最近戴过的美瞳。'}</p></div>`;
}
function renderDiaries(){
const q=$('#diarySearch').value.trim().toLowerCase();
const f=state.diaries.filter(d=>{const l=state.lenses.find(x=>x.id===d.lensId);return[d.date,d.scene,d.note,l?.brand,l?.name,l?.color,l?.dia,l?.gdia,l?.limbal].join(' ').toLowerCase().includes(q)});
$('#diaryCountText').textContent=`${state.diaries.length} 条`;$('#diarySearchNote').textContent=q?`找到 ${f.length} 条`:'';
$('#diaryList').innerHTML=f.length?f.slice().reverse().map(diaryHTML).join(''):`<div class="empty"><h3>${state.diaries.length?'没有匹配结果':'还没有照片日记'}</h3><p>${state.diaries.length?'换一个关键词试试。':'把一次真实佩戴和照片绑定起来。'}</p></div>`;
}
function renderSelect(){const s=$('#diaryLensSelect');s.innerHTML=state.lenses.map(x=>`<option value="${x.id}">${esc(x.brand)} · ${esc(x.name)}</option>`).join('')}
function render(){renderHome();renderLenses();renderDiaries();renderCommunity();renderSelect()}
function switchView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'})}
function show(id){$('#'+id).classList.add('show')}function hide(id){$('#'+id).classList.remove('show')}

function thumbRender(target,arr){$(target).innerHTML=arr.map((i,n)=>`<div class="thumb"><img src="${i}"><button type="button" onclick="removeWorking('${target}',${n})">×</button></div>`).join('')}
function diaryThumbRender(){
  $('#diaryImagePreview').innerHTML=diaryWorkingImages.map((i,n)=>`
    <div class="diary-thumb">
      <div class="thumb"><img src="${i}"><button type="button" onclick="removeWorking('#diaryImagePreview',${n})">×</button></div>
      <button type="button" class="thumb-cover-btn ${n===diaryCoverIndex?'active':''}" onclick="setDiaryCover(${n})">
        ${n===diaryCoverIndex?'✓ 当前封面':'设为封面'}
      </button>
    </div>`).join('');
  $('#diaryCoverActions').classList.toggle('show',diaryWorkingImages.length>0);
}
window.setDiaryCover=n=>{
  if(n<0||n>=diaryWorkingImages.length)return;
  diaryCoverIndex=n;diaryCoverZoom=1;diaryCoverX=0;diaryCoverY=0;
  diaryThumbRender();
  toast('已设为封面，可继续调整构图');
}
function productPreview(){
  $('#productImagePreview').innerHTML = productWorkingImage
    ? `<div class="thumb"><img src="${productWorkingImage}"><button type="button" onclick="clearProductImage()">×</button></div>`
    : '';
  $('#productImageActions').style.display = productWorkingImage ? 'flex' : 'none';
}
window.clearProductImage=()=>{productWorkingImage='';productOriginalImage='';productPreview()}

window.removeWorking=(target,n)=>{
  if(target==='#lensImagePreview'){
    lensWorkingImages.splice(n,1);thumbRender(target,lensWorkingImages);return;
  }
  if(target==='#diaryImagePreview'){
    diaryWorkingImages.splice(n,1);
    if(!diaryWorkingImages.length){
      diaryCoverIndex=0;diaryCoverZoom=1;diaryCoverX=0;diaryCoverY=0;
    }else if(n===diaryCoverIndex){
      diaryCoverIndex=Math.min(n,diaryWorkingImages.length-1);
      diaryCoverZoom=1;diaryCoverX=0;diaryCoverY=0;
    }else if(n<diaryCoverIndex){
      diaryCoverIndex--;
    }
    diaryThumbRender();
  }
}

function resetLensForm(){
$('#lensForm').reset();$('#lensEditId').value='';$('#lensModalTitle').textContent='添加美瞳';$('#lensDeleteBar').style.display='none';lensWorkingImages=[];productWorkingImage='';productOriginalImage='';thumbRender('#lensImagePreview',lensWorkingImages);productPreview();$('#ocrStatus').textContent='';$('#ocrProgress').style.display='none';
['#brandSelect','#colorSelect','#diaSelect','#gdiaSelect','#limbalSelect','#waterSelect','#bcSelect','#cycleSelect'].forEach((s,i)=>setChoice(s,['#brandCustom','#colorCustom','#diaCustom','#gdiaCustom','#limbalCustom','#waterCustom','#bcCustom','#cycleCustom'][i],''));
}
window.openLens=()=>{resetLensForm();show('lensModal')}
window.editLens=id=>{const x=state.lenses.find(v=>v.id===id);if(!x)return;resetLensForm();$('#lensEditId').value=id;$('#lensModalTitle').textContent='修改美瞳档案';$('#lensDeleteBar').style.display='flex';$('#productName').value=x.name||'';setChoice('#brandSelect','#brandCustom',x.brand);setChoice('#colorSelect','#colorCustom',x.color);setChoice('#diaSelect','#diaCustom',x.dia);setChoice('#gdiaSelect','#gdiaCustom',x.gdia);setChoice('#limbalSelect','#limbalCustom',x.limbal);setChoice('#waterSelect','#waterCustom',x.water);setChoice('#bcSelect','#bcCustom',x.bc);setChoice('#cycleSelect','#cycleCustom',x.cycle);$('#comfort').value=x.comfort||5;$('#rating').value=x.rating||5;$('#lensNote').value=x.note||'';lensWorkingImages=[...(x.images||[])];productWorkingImage=x.productImage||'';productOriginalImage=x.productOriginalImage||x.productImage||'';thumbRender('#lensImagePreview',lensWorkingImages);productPreview();show('lensModal')}

function resetDiaryForm(){
  $('#diaryForm').reset();$('#diaryEditId').value='';$('#diaryModalTitle').textContent='写照片日记';
  $('#diaryDeleteBar').style.display='none';diaryWorkingImages=[];
  diaryCoverIndex=0;diaryCoverZoom=1;diaryCoverX=0;diaryCoverY=0;
  diaryThumbRender();renderSelect()
}
window.openDiary=()=>{if(!state.lenses.length){toast('先添加一款美瞳');openLens();return}resetDiaryForm();show('diaryModal')}
window.editDiary=id=>{
  const d=state.diaries.find(v=>v.id===id);if(!d)return;
  resetDiaryForm();$('#diaryEditId').value=id;$('#diaryModalTitle').textContent='修改照片日记';
  $('#diaryDeleteBar').style.display='flex';$('#diaryLensSelect').value=d.lensId;
  $('#diaryDate').value=d.date||'';$('#diaryScene').value=d.scene||'日常';$('#diaryNote').value=d.note||'';
  diaryWorkingImages=[...(d.images||[])];
  diaryCoverIndex=Math.max(0,Math.min(d.coverIndex??0,Math.max(0,diaryWorkingImages.length-1)));
  diaryCoverZoom=d.coverZoom??1;diaryCoverX=d.coverX??0;diaryCoverY=d.coverY??0;
  diaryThumbRender();show('diaryModal')
}

function readImageDataURL(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onerror=()=>reject(new Error('图片读取失败'));
    r.onload=()=>resolve(r.result);
    r.readAsDataURL(file);
  });
}
function openCropper(srcData){
  if(!srcData){toast('请先选择图片');return}
  cropState.src=srcData;
  cropState.zoom=1;
  cropState.x=0;
  cropState.y=0;
  $('#cropZoom').value='1';

  const img=$('#cropImage');
  img.onload=()=>{
    cropState.naturalW=img.naturalWidth;
    cropState.naturalH=img.naturalHeight;
    requestAnimationFrame(()=>{
      const stage=$('#cropStage');
      const size=stage.clientWidth;
      cropState.baseScale=Math.max(size/img.naturalWidth, size/img.naturalHeight);
      cropState.x=0; cropState.y=0;
      updateCropTransform();
    });
  };
  img.src=srcData;
  show('cropModal');
}
function cropMetrics(){
  const stage=$('#cropStage');
  const size=stage.clientWidth;
  const scale=cropState.baseScale*cropState.zoom;
  const w=cropState.naturalW*scale, h=cropState.naturalH*scale;
  const maxX=Math.max(0,(w-size)/2);
  const maxY=Math.max(0,(h-size)/2);
  cropState.x=Math.min(maxX,Math.max(-maxX,cropState.x));
  cropState.y=Math.min(maxY,Math.max(-maxY,cropState.y));
  return {size,scale,w,h,maxX,maxY};
}
function updateCropTransform(){
  if(!cropState.naturalW)return;
  const m=cropMetrics();
  const img=$('#cropImage');
  img.style.width=m.w+'px';
  img.style.height=m.h+'px';
  img.style.transform=`translate(calc(-50% + ${cropState.x}px), calc(-50% + ${cropState.y}px))`;
}
function saveCrop(){
  const stage=$('#cropStage');
  const size=stage.clientWidth;
  const output=900;
  const c=document.createElement('canvas');
  c.width=output;c.height=output;
  const ctx=c.getContext('2d',{alpha:false});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,output,output);

  const img=$('#cropImage');
  const m=cropMetrics();

  // 计算裁切框在“缩放后图片”中的左上角，再换算回原图坐标。
  const leftInStage=(size-m.w)/2+cropState.x;
  const topInStage=(size-m.h)/2+cropState.y;
  const sx=(-leftInStage)/m.scale;
  const sy=(-topInStage)/m.scale;
  const sw=size/m.scale;
  const sh=size/m.scale;

  ctx.drawImage(img,sx,sy,sw,sh,0,0,output,output);
  productWorkingImage=c.toDataURL('image/jpeg',.82);
  productPreview();
  hide('cropModal');
  toast('产品主图裁切已保存');
}


function updateDiaryCoverStage(){
  const src=diaryWorkingImages[diaryCoverIndex];
  if(!src)return;
  $('#diaryCoverBg').src=src;$('#diaryCoverFg').src=src;
  $('#diaryCoverFg').style.left=(50+diaryCoverDraft.x)+'%';
  $('#diaryCoverFg').style.top=(50+diaryCoverDraft.y)+'%';
  $('#diaryCoverFg').style.transform=`translate(-50%,-50%) scale(${diaryCoverDraft.zoom})`;
}
function openDiaryCoverEditor(){
  if(!diaryWorkingImages.length){toast('请先上传照片');return}
  diaryCoverDraft={zoom:diaryCoverZoom,x:diaryCoverX,y:diaryCoverY,dragging:false,lastX:0,lastY:0};
  $('#diaryCoverZoom').value=diaryCoverDraft.zoom;
  updateDiaryCoverStage();show('diaryCoverModal');
}
$('#adjustDiaryCoverBtn').onclick=openDiaryCoverEditor;
$('#diaryCoverZoom').oninput=e=>{diaryCoverDraft.zoom=Number(e.target.value);updateDiaryCoverStage()};
$('#diaryCoverCancel').onclick=()=>hide('diaryCoverModal');
$('#diaryCoverSave').onclick=()=>{
  diaryCoverZoom=diaryCoverDraft.zoom;diaryCoverX=diaryCoverDraft.x;diaryCoverY=diaryCoverDraft.y;
  hide('diaryCoverModal');toast('封面构图已保存');
};
const diaryCoverStage=$('#diaryCoverStage');
diaryCoverStage.addEventListener('pointerdown',e=>{
  diaryCoverDraft.dragging=true;diaryCoverDraft.lastX=e.clientX;diaryCoverDraft.lastY=e.clientY;
  diaryCoverStage.setPointerCapture?.(e.pointerId)
});
diaryCoverStage.addEventListener('pointermove',e=>{
  if(!diaryCoverDraft.dragging)return;
  const rect=diaryCoverStage.getBoundingClientRect();
  diaryCoverDraft.x+=((e.clientX-diaryCoverDraft.lastX)/rect.width)*100;
  diaryCoverDraft.y+=((e.clientY-diaryCoverDraft.lastY)/rect.height)*100;
  diaryCoverDraft.x=Math.max(-42,Math.min(42,diaryCoverDraft.x));
  diaryCoverDraft.y=Math.max(-42,Math.min(42,diaryCoverDraft.y));
  diaryCoverDraft.lastX=e.clientX;diaryCoverDraft.lastY=e.clientY;
  updateDiaryCoverStage()
});
const stopDiaryCoverDrag=e=>{
  diaryCoverDraft.dragging=false;
  try{diaryCoverStage.releasePointerCapture?.(e.pointerId)}catch(_){}
};
diaryCoverStage.addEventListener('pointerup',stopDiaryCoverDrag);
diaryCoverStage.addEventListener('pointercancel',stopDiaryCoverDrag);

window.openViewer=(diaryId,imageIndex=0)=>{
  const d=state.diaries.find(v=>v.id===diaryId);if(!d?.images?.length)return;
  $('#viewerTrack').innerHTML=d.images.map(src=>`<div class="viewer-slide"><img src="${src}" alt=""></div>`).join('');
  $('#viewerCount').textContent=`${imageIndex+1} / ${d.images.length}`;
  show('viewerModal');
  requestAnimationFrame(()=>{
    const track=$('#viewerTrack');
    track.scrollLeft=imageIndex*track.clientWidth;
    track.onscroll=()=>{
      const idx=Math.round(track.scrollLeft/Math.max(1,track.clientWidth));
      $('#viewerCount').textContent=`${Math.min(d.images.length,idx+1)} / ${d.images.length}`;
    };
  });
};
$('#viewerClose').onclick=()=>hide('viewerModal');
$('#viewerModal').addEventListener('click',e=>{if(e.target.id==='viewerModal')hide('viewerModal')});

$('#productImageInput').onchange=async e=>{
  try{
    const f=e.target.files[0];
    if(f){
      productOriginalImage=await readImageDataURL(f);
      openCropper(productOriginalImage);
    }
    e.target.value='';
  }catch(err){toast(err.message)}
}
$('#reCropProductBtn').onclick=()=>openCropper(productOriginalImage||productWorkingImage);
$('#cropZoom').oninput=e=>{
  const oldZoom=cropState.zoom;
  cropState.zoom=Number(e.target.value);
  // 保留当前视觉中心，随后由边界约束纠正。
  if(oldZoom>0){
    cropState.x*=cropState.zoom/oldZoom;
    cropState.y*=cropState.zoom/oldZoom;
  }
  updateCropTransform();
};
$('#cropSaveBtn').onclick=saveCrop;
$('#cropCancelBtn').onclick=()=>hide('cropModal');

const cropStage=$('#cropStage');
cropStage.addEventListener('pointerdown',e=>{
  cropState.dragging=true;
  cropState.lastX=e.clientX;
  cropState.lastY=e.clientY;
  cropStage.setPointerCapture?.(e.pointerId);
});
cropStage.addEventListener('pointermove',e=>{
  if(!cropState.dragging)return;
  cropState.x+=e.clientX-cropState.lastX;
  cropState.y+=e.clientY-cropState.lastY;
  cropState.lastX=e.clientX;
  cropState.lastY=e.clientY;
  updateCropTransform();
});
const stopCropDrag=e=>{
  cropState.dragging=false;
  try{cropStage.releasePointerCapture?.(e.pointerId)}catch(_){}
};
cropStage.addEventListener('pointerup',stopCropDrag);
cropStage.addEventListener('pointercancel',stopCropDrag);
$('#lensImages').onchange=async e=>{try{const a=await compressMany(e.target.files);lensWorkingImages.push(...a);thumbRender('#lensImagePreview',lensWorkingImages);e.target.value=''}catch(err){toast(err.message)}}
$('#diaryImages').onchange=async e=>{
  try{
    const wasEmpty=diaryWorkingImages.length===0;
    const a=await compressMany(e.target.files);diaryWorkingImages.push(...a);
    if(wasEmpty&&diaryWorkingImages.length){diaryCoverIndex=0;diaryCoverZoom=1;diaryCoverX=0;diaryCoverY=0}
    diaryThumbRender();e.target.value=''
  }catch(err){toast(err.message)}
}

$('#lensForm').onsubmit=e=>{
e.preventDefault();const brand=chosen('#brandSelect','#brandCustom'),name=$('#productName').value.trim();if(!brand||!name){toast('请至少填写品牌和产品名');return}
const item={id:$('#lensEditId').value||'l'+Date.now(),brand,name,color:chosen('#colorSelect','#colorCustom'),dia:chosen('#diaSelect','#diaCustom'),gdia:chosen('#gdiaSelect','#gdiaCustom'),limbal:chosen('#limbalSelect','#limbalCustom'),water:chosen('#waterSelect','#waterCustom'),bc:chosen('#bcSelect','#bcCustom'),cycle:chosen('#cycleSelect','#cycleCustom'),comfort:Number($('#comfort').value),rating:Number($('#rating').value),note:$('#lensNote').value.trim(),productImage:productWorkingImage,productOriginalImage:productOriginalImage,images:[...lensWorkingImages]};
const idx=state.lenses.findIndex(x=>x.id===item.id);if(idx>=0)state.lenses[idx]=item;else state.lenses.push(item);if(!persist())return;hide('lensModal');render();toast(idx>=0?'档案已修改':'档案已保存')
}
$('#diaryForm').onsubmit=e=>{
e.preventDefault();if(!diaryWorkingImages.length){toast('至少上传一张照片');return}
const item={
  id:$('#diaryEditId').value||'d'+Date.now(),
  lensId:$('#diaryLensSelect').value,date:$('#diaryDate').value,
  scene:$('#diaryScene').value,note:$('#diaryNote').value.trim(),
  images:[...diaryWorkingImages],
  coverIndex:diaryCoverIndex,coverZoom:diaryCoverZoom,coverX:diaryCoverX,coverY:diaryCoverY
};
const idx=state.diaries.findIndex(x=>x.id===item.id);if(idx>=0)state.diaries[idx]=item;else state.diaries.push(item);if(!persist())return;hide('diaryModal');render();switchView('diaryView');toast(idx>=0?'日记已修改':'日记已保存')
}
$('#deleteLensBtn').onclick=()=>{const id=$('#lensEditId').value;if(!id)return;if(!confirm('删除这条美瞳档案？相关日记会保留，但会显示为未绑定。'))return;state.lenses=state.lenses.filter(x=>x.id!==id);persist();hide('lensModal');render();toast('已删除')}
$('#deleteDiaryBtn').onclick=()=>{const id=$('#diaryEditId').value;if(!id)return;if(!confirm('删除这条照片日记？'))return;state.diaries=state.diaries.filter(x=>x.id!==id);persist();hide('diaryModal');render();toast('已删除')}

function normalizeOCR(text){
  return String(text||'')
    .replace(/[：﹕]/g,':')
    .replace(/[％﹪]/g,'%')
    .replace(/[ \t]+/g,' ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}
function grab(text,patterns){
  for(const p of patterns){
    const m=text.match(p);
    if(m?.[1]) return m[1].trim();
  }
  return '';
}
function cleanNum(v){
  if(!v) return '';
  return String(v).replace(/[Oo]/g,'0').replace(/[,，]/g,'.').replace(/\s+/g,'').trim();
}
function mm(v){ v=cleanNum(v); return v ? (/\bmm\b/i.test(v)?v:v+' mm') : ''; }
function percent(v){ v=cleanNum(v); return v ? (v.includes('%')?v:v+'%') : ''; }

function parseOCR(raw){
  const t=normalizeOCR(raw);
  const compact=t.replace(/\s+/g,' ');
  const out={};

  // 商品名：很多淘宝分享图是“#无尽夏”，并不会写“商品名称：无尽夏”
  out.name=grab(compact,[
    /#\s*([A-Za-z0-9\u4e00-\u9fa5·\-]{2,20})/,
    /(?:品名|产品名称|商品名称|款式|系列)\s*:?\s*([A-Za-z0-9\u4e00-\u9fa5·\-\s]{2,35})/i
  ]);

  out.brand=grab(compact,[
    /(?:品牌|Brand)\s*:?\s*([A-Za-z0-9\u4e00-\u9fa5·\-]{2,24})/i
  ]);

  // 先处理最规范的“标签在前”
  out.dia=mm(grab(compact,[
    /(?:镜片直径|镜片总直径|DIA)\s*:?\s*(1[234]\s*[.,]\s*\d)/i
  ]));
  out.gdia=mm(grab(compact,[
    /(?:着色直径|着色外径|着色径|G\.?\s*DIA)\s*:?\s*(1[234]\s*[.,]\s*\d)/i
  ]));
  out.bc=mm(grab(compact,[
    /(?:基弧|BC)\s*:?\s*(8\s*[.,]\s*\d{1,2})/i
  ]));
  out.water=percent(grab(compact,[
    /(?:含水量|含水率)\s*:?\s*(\d{2})\s*%?/i
  ]));

  // 再处理商品卡常见的“数字在前、标签在后”
  if(!out.bc){
    out.bc=mm(grab(compact,[
      /(8\s*[.,]\s*\d{1,2})\s*(?:mm)?\s*(?:基弧|BC)/i,
      /(8\s*[.,]\s*\d{1,2})\s*(?:基弧|BC)\s*(?:mm)?/i
    ]));
  }
  if(!out.water){
    out.water=percent(grab(compact,[
      /(\d{2})\s*%?\s*(?:含水量|含水率)/i,
      /(\d{2})\s*(?:含水量|含水率)\s*%?/i
    ]));
  }

  // 如果只识别到“14.2 直径 / 13.4 直径”，按商品参数卡常见顺序：
  // 第一项视为 DIA，第二项视为着色直径；用户可随后手动更正。
  const diameterMatches=[...compact.matchAll(/(1[234]\s*[.,]\s*\d)\s*(?:mm)?\s*(?:直径|镜片直径)/gi)]
    .map(m=>cleanNum(m[1]));
  if(!out.dia && diameterMatches[0]) out.dia=mm(diameterMatches[0]);
  if(!out.gdia && diameterMatches[1]) out.gdia=mm(diameterMatches[1]);

  // 有些 OCR 会把标签和数字顺序打乱；只在“直径/基弧/含水量”同时出现时做参数卡兜底。
  if(/直径/.test(compact) && /基弧|BC/i.test(compact) && /含水/.test(compact)){
    const nums=[...compact.matchAll(/(?:^|\s)(1[234][.,]\d|8[.,]\d{1,2}|\d{2})(?=\s|$|%|mm)/g)]
      .map(m=>cleanNum(m[1]));
    const lensNums=nums.filter(v=>/^1[234]\.\d$/.test(v));
    if(!out.dia && lensNums[0]) out.dia=mm(lensNums[0]);
    if(!out.gdia && lensNums[1]) out.gdia=mm(lensNums[1]);
    if(!out.bc){
      const b=nums.find(v=>/^8\.\d{1,2}$/.test(v));
      if(b) out.bc=mm(b);
    }
    if(!out.water){
      const w=nums.find(v=>/^\d{2}$/.test(v) && Number(v)>=30 && Number(v)<=80);
      if(w) out.water=percent(w);
    }
  }

  // 领域语义兜底：不依赖截图里的固定顺序，只依赖“中文标签 + 数值范围 + 参数之间的关系”。
  // 1) BC 基弧通常约 8.0–9.2 mm；
  // 2) DIA / G.DIA 通常约 12–15 mm，且物理上 DIA >= G.DIA；
  // 3) 含水量通常是 30–80% 左右；
  // 这比“第一项=直径、第二项=着色直径”的顺序假设更稳健。
  if(!out.dia || !out.gdia || !out.bc || !out.water){
    const numberTokens=[...compact.matchAll(/(?<![\d.])(\d{1,2}(?:[.,]\d{1,2})?)(?![\d.])/g)]
      .map(m=>cleanNum(m[1]))
      .filter(Boolean);

    const nums=numberTokens.map(Number).filter(Number.isFinite);

    // BC：范围非常有辨识度。
    if(!out.bc){
      const bcCandidates=nums.filter(v=>v>=8.0 && v<=9.2);
      if(bcCandidates.length===1){
        out.bc=mm(String(bcCandidates[0]));
        out._semanticFallback = true;
      }
    }

    // DIA 与 G.DIA：不用顺序，用“总直径 >= 着色直径”的物理关系。
    if(!out.dia || !out.gdia){
      const dCandidates=[...new Set(nums.filter(v=>v>=12.0 && v<=15.0))]
        .sort((a,b)=>a-b);

      if(dCandidates.length>=2){
        const gd=dCandidates[0], dia=dCandidates[dCandidates.length-1];
        if(dia>=gd && dia-gd>=0.1 && dia-gd<=2.5){
          if(!out.dia) out.dia=mm(String(dia));
          if(!out.gdia) out.gdia=mm(String(gd));
          out._semanticFallback = true;
        }
      }
    }

    // 含水量：优先寻找 OCR 中直接带 % 的数字；如果 % 丢失，
    // 只有在已经识别到至少两个“镜片结构参数”时，才允许从 30–80 的整数中补推。
    if(!out.water){
      const pctMatch=compact.match(/(?<!\d)([3-7]\d)\s*%/);
      if(pctMatch){
        out.water=percent(pctMatch[1]);
      }else{
        const waterCandidates=[...new Set(nums.filter(v=>Number.isInteger(v) && v>=30 && v<=80))];
        const structuralHits=[out.dia,out.gdia,out.bc].filter(Boolean).length;
        if(waterCandidates.length===1 && structuralHits>=2){
          out.water=percent(String(waterCandidates[0]));
          out._semanticFallback = true;
        }
      }
    }
  }

  out.cycle=grab(compact,[
    /(日抛|双周抛|半月抛|月抛|季抛|半年抛|年抛)/
  ]);

  out.color=grab(compact,[
    /(?:颜色|花色|色号)\s*:?\s*([\u4e00-\u9fa5A-Za-z0-9·\-]{1,18})/i
  ]);

  if(/无锁边|无环|无外环/.test(compact)) out.limbal='无锁边';
  else if(/明显锁边|粗环|黑环|大外环/.test(compact)) out.limbal='明显锁边';
  else if(/渐变锁边|渐变环/.test(compact)) out.limbal='渐变锁边';
  else if(/浅锁边|细环|微环/.test(compact)) out.limbal='浅锁边';

  return out;
}

function fillOCR(o){
  if(o.brand) setChoice('#brandSelect','#brandCustom',o.brand);
  if(o.name) $('#productName').value=o.name;
  if(o.color) setChoice('#colorSelect','#colorCustom',o.color);
  if(o.dia) setChoice('#diaSelect','#diaCustom',o.dia);
  if(o.gdia) setChoice('#gdiaSelect','#gdiaCustom',o.gdia);
  if(o.limbal) setChoice('#limbalSelect','#limbalCustom',o.limbal);
  if(o.water) setChoice('#waterSelect','#waterCustom',o.water);
  if(o.bc) setChoice('#bcSelect','#bcCustom',o.bc);
  if(o.cycle) setChoice('#cycleSelect','#cycleCustom',o.cycle);
}

function makeOCRCrop(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onerror=()=>reject(new Error('图片读取失败'));
    r.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('图片解析失败'));
      img.onload=()=>{
        // 关键信息集中在上半部，裁掉淘宝二维码/分享提示，降低 OCR 干扰。
        const cropH=Math.round(img.height*0.70);
        const scale=Math.min(2.2,1800/img.width);
        const c=document.createElement('canvas');
        c.width=Math.round(img.width*scale);
        c.height=Math.round(cropH*scale);
        const ctx=c.getContext('2d');
        ctx.drawImage(img,0,0,img.width,cropH,0,0,c.width,c.height);

        // 灰度 + 适度增强对比度，让参数条上的浅色文字更容易识别。
        const im=ctx.getImageData(0,0,c.width,c.height), d=im.data;
        for(let i=0;i<d.length;i+=4){
          const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
          const v=Math.max(0,Math.min(255,(g-128)*1.45+128));
          d[i]=d[i+1]=d[i+2]=v;
        }
        ctx.putImageData(im,0,0);
        c.toBlob(blob=>blob?resolve(blob):reject(new Error('图片预处理失败')),'image/png');
      };
      img.src=r.result;
    };
    r.readAsDataURL(file);
  });
}

$('#ocrBtn').onclick=async()=>{
  const f=$('#ocrImage').files[0];
  if(!f){toast('请先选择商品截图');return}
  if(!productWorkingImage){
    try{
      productOriginalImage=await readImageDataURL(f);
      // OCR 仍继续进行；主图先保留原图，用户可识别后点“重新调整裁切”。
      productWorkingImage=await compress(f);
      productPreview();
    }catch(e){}
  }
  if(!window.Tesseract){toast('OCR 组件未加载，请联网后重试');return}

  $('#ocrProgress').style.display='block';
  $('#ocrProgress i').style.width='0%';
  $('#ocrStatus').textContent='正在优化截图并识别参数…';
  $('#ocrDebug').style.display='none';
  $('#ocrRawText').textContent='';

  try{
    const prepared=await makeOCRCrop(f);
    const r=await Tesseract.recognize(prepared,'chi_sim+eng',{
      logger:m=>{
        if(m.status==='recognizing text'){
          const p=Math.round((m.progress||0)*100);
          $('#ocrProgress i').style.width=p+'%';
          $('#ocrStatus').textContent='正在识别… '+p+'%';
        }
      }
    });

    const raw=r.data.text||'';
    $('#ocrRawText').textContent=raw||'（没有识别到文字）';
    $('#ocrDebug').style.display='block';

    const parsed=parseOCR(raw);
    fillOCR(parsed);

    const labels={brand:'品牌',name:'名称',color:'颜色',dia:'DIA',gdia:'着色直径',limbal:'锁边',water:'含水量',bc:'基弧',cycle:'周期'};
    const fields=Object.entries(parsed)
      .filter(([k,v])=>v && !k.startsWith('_'))
      .map(([k])=>labels[k]||k);

    if(fields.length){
      $('#ocrStatus').textContent = parsed._semanticFallback
        ? `识别完成：已结合中文标签、数值范围与镜片参数关系填入 ${fields.join('、')}。请重点核对后保存。`
        : `识别完成：已填入 ${fields.join('、')}。请逐项检查后保存。`;
    }else{
      $('#ocrStatus').textContent='识别到了文字，但暂时没能映射到参数。可展开“原始文字”查看，或手动填写。';
    }
  }catch(err){
    console.error(err);
    $('#ocrStatus').textContent='识别失败。可换一张更完整的商品参数截图，或手动填写。';
  }
}

['#brandSelect','#colorSelect','#diaSelect','#gdiaSelect','#limbalSelect','#waterSelect','#bcSelect','#cycleSelect'].forEach((s,i)=>bindCustom(s,['#brandCustom','#colorCustom','#diaCustom','#gdiaCustom','#limbalCustom','#waterCustom','#bcCustom','#cycleCustom'][i]));
$$('nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$$('[data-close]').forEach(b=>b.onclick=()=>hide(b.dataset.close));

const THEME_KEY='lensDiaryTheme';
function applyTheme(theme){
  const allowed=['rose','sage','lavender','ocean','mono'];
  if(!allowed.includes(theme))theme='rose';
  document.documentElement.dataset.theme=theme;
  localStorage.setItem(THEME_KEY,theme);
  $$('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===theme));
}
applyTheme(localStorage.getItem(THEME_KEY)||'rose');

$('#settingsBtn').onclick=()=>{applyTheme(localStorage.getItem(THEME_KEY)||'rose');show('settingsModal')};
$$('[data-theme-choice]').forEach(b=>{
  b.onclick=()=>{applyTheme(b.dataset.themeChoice);toast('主题已切换')};
});
$('#resetInsideSettings').onclick=()=>{
  if(confirm('清空当前浏览器里的所有 Lens Diary 测试数据？这个操作无法撤销。')){
    state.lenses=[];state.diaries=[];localStorage.removeItem(KEY);
    hide('settingsModal');render();switchView('homeView');toast('已重置所有数据');
  }
};

$('#fab').onclick=()=>show('choiceModal');$('#addLensChoice').onclick=()=>{hide('choiceModal');openLens()};$('#addDiaryChoice').onclick=()=>{hide('choiceModal');openDiary()};
$('#lensSearch').oninput=renderLenses;$('#diarySearch').oninput=renderDiaries;

render();
