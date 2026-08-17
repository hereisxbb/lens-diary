(()=>{
const K='trippins_open_v3', OLD='trippins_mobile_v1';
const S={places:[],map:null,markers:[],selected:null,detailId:null,xhsPlaceId:null,searchAbort:null,longPressTimer:null,manual:null};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const uid=()=>crypto.randomUUID?crypto.randomUUID():'id_'+Date.now()+'_'+Math.random().toString(16).slice(2);

function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),2100)}
function saveStore(){localStorage.setItem(K,JSON.stringify(S.places))}
function loadStore(){
  try{S.places=JSON.parse(localStorage.getItem(K)||'[]')}catch(_){S.places=[]}
  if(!S.places.length){
    try{
      const old=JSON.parse(localStorage.getItem(OLD)||'[]');
      if(Array.isArray(old)&&old.length){
        const m=new Map();
        old.forEach(p=>{
          const k=p.placeKey||`${norm(p.poiName)}|${(+p.lat).toFixed(5)}|${(+p.lon).toFixed(5)}`;
          if(!m.has(k))m.set(k,{id:uid(),placeKey:k,name:p.poiName||'地点',address:'',lat:+p.lat,lon:+p.lon,collection:p.collection||'旅行',category:p.category||'想去',note:'',links:[],createdAt:p.createdAt||new Date().toISOString()});
          if(p.sourceUrl||p.sourceTitle)m.get(k).links.push({id:uid(),title:p.sourceTitle||'小红书攻略',url:p.sourceUrl||'',note:p.note||'',createdAt:p.createdAt||new Date().toISOString()});
        });
        S.places=[...m.values()];saveStore();
      }
    }catch(_){}
  }
}
function placeKey(p){return p.placeKey||`${norm(p.name)}|${(+p.lat).toFixed(5)}|${(+p.lon).toFixed(5)}`}
function findDup(p){return S.places.find(x=>placeKey(x)===placeKey(p)||(norm(x.name)===norm(p.name)&&Math.abs(x.lat-p.lat)<.00008&&Math.abs(x.lon-p.lon)<.00008))}
function countLinks(){return S.places.reduce((n,p)=>n+(p.links?.length||0),0)}

function initMap(){
  S.map=new maplibregl.Map({
    container:'map',
    style:'https://tiles.openfreemap.org/styles/liberty',
    center:[139.75,35.68],
    zoom:10.4,
    attributionControl:true
  });
  S.map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:false}),'bottom-right');
  S.map.on('load',()=>{
    try{S.map.setProjection({type:'globe'})}catch(_){}
    render();
  });

  S.map.on('click',e=>{
    const features=S.map.queryRenderedFeatures(e.point);
    const f=features.find(x=>{
      const n=x.properties?.name||x.properties?.['name:zh']||x.properties?.['name:en'];
      const layer=(x.layer?.id||'').toLowerCase();
      return n && !/boundary|water|landcover|building|road|transportation/.test(layer);
    });
    if(f){
      const name=f.properties?.['name:zh']||f.properties?.name||f.properties?.['name:en'];
      const kind=f.properties?.class||f.properties?.subclass||f.layer?.id||'地图地点';
      selectCandidate({name,address:kind,lat:e.lngLat.lat,lon:e.lngLat.lng,placeKey:'map:'+norm(name)+':'+e.lngLat.lng.toFixed(5)+':'+e.lngLat.lat.toFixed(5)});
      openPlaceSheet(true);
      $('sheetHeading').textContent='标记「'+name+'」';
    }
  });

  const startLong=e=>{
    clearTimeout(S.longPressTimer);
    S.longPressTimer=setTimeout(()=>{
      const ll=e.lngLat;
      S.manual={name:'我的标记',address:'自定义地图坐标',lat:ll.lat,lon:ll.lng,placeKey:'manual:'+ll.lng.toFixed(5)+':'+ll.lat.toFixed(5)};
      selectCandidate(S.manual);
      openPlaceSheet(true);
      $('sheetHeading').textContent='标记这里';
      setMode('manual');
      updateManual();
    },650)
  };
  const cancelLong=()=>clearTimeout(S.longPressTimer);
  S.map.on('mousedown',startLong);S.map.on('mouseup',cancelLong);S.map.on('dragstart',cancelLong);
  S.map.on('touchstart',e=>{if(e.points?.length===1)startLong(e)});S.map.on('touchend',cancelLong);S.map.on('touchmove',cancelLong);
}

function render(){
  S.markers.forEach(m=>m.remove());S.markers=[];
  S.places.forEach(p=>{
    const el=document.createElement('div');el.className='marker'+((p.links?.length||0)?' haslinks':'');el.textContent=(p.links?.length||0)>1?p.links.length:'⌖';
    el.onclick=ev=>{ev.stopPropagation();openDetail(p.id)};
    const m=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([p.lon,p.lat]).addTo(S.map);S.markers.push(m);
  });
  $('stats').textContent=`${S.places.length} 个地点 · ${countLinks()} 篇攻略`;
  $('chips').innerHTML=S.places.length?S.places.slice(0,8).map(p=>`<button class="chip" data-id="${p.id}">${esc(p.name)}${p.links?.length?` · ${p.links.length}`:''}</button>`).join(''):'<span class="helper">先标一个你想去的地方。</span>';
  $('chips').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>openDetail(b.dataset.id));
  renderList();
}
function renderList(){
  $('placeList').innerHTML=S.places.length?S.places.map(p=>`
    <article class="placeCard" data-place="${p.id}">
      <div class="placeTop">
        <div class="pinDot">⌖</div>
        <div><b>${esc(p.name)}</b><small>${esc(p.collection||'旅行')} · ${esc(p.category||'想去')}${p.address?`<br>${esc(p.address)}`:''}</small></div>
        <span class="badge">${p.links?.length||0} 篇</span>
      </div>
      ${(p.links||[]).slice(0,2).map(l=>`<div class="linkRow"><div><b>${esc(l.title)}</b><small>${esc(l.note||'小红书攻略')}</small></div>${l.url?`<button class="openXhs" data-url="${esc(l.url)}">原帖 ↗</button>`:''}</div>`).join('')}
    </article>`).join(''):'<div class="empty">还没有地点。<br><br>回到地图，点一个地图 POI、搜索地点，或者长按地图。</div>';
  $('placeList').querySelectorAll('[data-place]').forEach(card=>card.onclick=e=>{if(!e.target.closest('[data-url]'))openDetail(card.dataset.place)});
  $('placeList').querySelectorAll('[data-url]').forEach(b=>b.onclick=e=>{e.stopPropagation();window.open(b.dataset.url,'_blank')});
}
function fitAll(){
  if(!S.places.length){S.map.flyTo({center:[139.75,35.68],zoom:10.4});return}
  if(S.places.length===1){S.map.flyTo({center:[S.places[0].lon,S.places[0].lat],zoom:14});return}
  const b=new maplibregl.LngLatBounds();S.places.forEach(p=>b.extend([p.lon,p.lat]));
  S.map.fitBounds(b,{padding:{top:100,bottom:180,left:35,right:35},maxZoom:12,duration:750});
}

async function geocode(q){
  if(S.searchAbort)S.searchAbort.abort();
  S.searchAbort=new AbortController();
  const ctrl=S.searchAbort, timer=setTimeout(()=>ctrl.abort(),4500);
  try{
    const url='https://photon.komoot.io/api/?'+new URLSearchParams({q,limit:'7',lang:'zh'});
    const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});
    if(!r.ok)throw Error(r.status);
    const data=await r.json();
    return (data.features||[]).map(f=>{
      const p=f.properties||{}, c=f.geometry?.coordinates||[];
      const parts=[p.name,p.street,p.city||p.town,p.state,p.country].filter(Boolean);
      return {name:p.name||p.street||'地点',address:[...new Set(parts)].join(' · '),lat:+c[1],lon:+c[0],placeKey:p.osm_type&&p.osm_id?`osm:${p.osm_type}:${p.osm_id}`:''};
    }).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon));
  }finally{clearTimeout(timer)}
}
function showResults(container,rows){
  container.innerHTML=rows.length?rows.map((r,i)=>`<button class="result" data-i="${i}"><b>${esc(r.name)}</b><small>${esc(r.address||`${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}`)}</small></button>`).join(''):'<div class="loading">没有找到。试试“地点名 + 城市 / 国家”。</div>';
  container.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{selectCandidate(rows[+b.dataset.i]);openPlaceSheet(true)});
}
async function topSearch(){
  const q=$('search').value.trim();if(q.length<2){$('searchResults').classList.remove('on');return}
  $('searchResults').innerHTML='<div class="loading">正在查找真实地点…</div>';$('searchResults').classList.add('on');
  try{const rows=await geocode(q);showResults($('searchResults'),rows);$('searchResults').classList.toggle('on',true)}
  catch(e){if(e.name!=='AbortError')$('searchResults').innerHTML='<div class="loading">地点服务这次响应较慢，请再试一次。</div>'}
}
async function sheetSearch(){
  const q=$('sheetSearch').value.trim();if(q.length<2)return toast('请输入地点名');
  $('sheetResults').innerHTML='<div class="loading">正在查找真实地点…</div>';
  try{const rows=await geocode(q);showResults($('sheetResults'),rows)}
  catch(e){if(e.name!=='AbortError')$('sheetResults').innerHTML='<div class="loading">地点服务这次响应较慢，请再试一次。</div>'}
}
function selectCandidate(p){
  S.selected={...p};
  $('selectedPlace').innerHTML=`<b>⌖ ${esc(p.name)}</b><small>${esc(p.address||'地图地点')}<br>${(+p.lat).toFixed(6)}, ${(+p.lon).toFixed(6)}</small>`;
  $('collection').value=guessCollection(p.address)||'旅行';
  $('chooseBlock').style.display='none';$('selectedBlock').style.display='block';
}
function guessCollection(address){
  const a=String(address||'');
  for(const x of ['东京','京都','大阪','札幌','函馆','小樽','北京','上海','广州','深圳','成都','杭州','南京','苏州'])if(a.includes(x))return x;
  return '';
}
function openPlaceSheet(keep=false){
  $('placeSheet').classList.add('on');if(!keep)resetPlaceSheet();
}
function resetPlaceSheet(){
  S.selected=null;$('sheetHeading').textContent='标记一个地方';$('chooseBlock').style.display='block';$('selectedBlock').style.display='none';$('sheetResults').innerHTML='';$('sheetSearch').value='';$('placeNote').value='';$('collection').value='';setMode('search');
}
function setMode(mode){
  document.querySelectorAll('.modeRow button').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
  $('modeSearch').style.display=mode==='search'?'block':'none';$('modeXhs').style.display=mode==='xhs'?'block':'none';$('modeManual').style.display=mode==='manual'?'block':'none';
}
function updateManual(){
  const p=S.manual;$('manualPreview').innerHTML=p?`<b>⌖ ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}</b><small>你可以保存后再给它改成“某个机位”“巷口的拉面店”等个人名称。</small>`:'<b>还没有地图坐标</b><small>先关闭面板，在地图上长按。</small>';
}
function commitPlace(addXhs=false){
  if(!S.selected)return toast('还没有选择地点');
  const candidate={id:uid(),placeKey:S.selected.placeKey||'',name:S.selected.name,address:S.selected.address||'',lat:+S.selected.lat,lon:+S.selected.lon,collection:$('collection').value.trim()||'旅行',category:$('category').value,note:$('placeNote').value.trim(),links:[],createdAt:new Date().toISOString()};
  const dup=findDup(candidate);
  const p=dup||candidate;if(!dup){S.places.unshift(p);saveStore();render()}
  $('placeSheet').classList.remove('on');
  S.map.flyTo({center:[p.lon,p.lat],zoom:14,duration:650});
  toast(dup?'这个地点已经在旅迹里了':'地点已标记');
  if(addXhs)setTimeout(()=>openXhs(p.id),180);
}
function parseXhs(raw){
  raw=String(raw||'').trim();
  const url=(raw.match(/https?:\/\/[^\s\]\)）]+/i)||[])[0]?.replace(/[，。；;~～]+$/,'')||'';
  let title='';
  const bracket=raw.match(/【([^】]{1,80})】/);if(bracket)title=bracket[1].trim();
  if(!title){
    const before=url?raw.slice(0,raw.indexOf(url)):raw;
    title=before.split('\n').map(x=>x.trim()).filter(Boolean)[0]||'小红书攻略';
  }
  title=title.replace(/把口令复制下来.*$/,'').trim().slice(0,80);
  const lines=raw.split('\n').map(x=>x.trim()).filter(Boolean).filter(x=>!/^小红书[，,]/.test(x)&&!/^https?:\/\//.test(x));
  let category='',address='';
  if(bracket){
    const idx=lines.findIndex(x=>x.includes('【'+bracket[1]+'】'));
    category=lines[idx+1]||'';
    address=lines[idx+2]||'';
  }
  return {title:title||'小红书攻略',url,category,address};
}
function updateXhsPlacePreview(){
  const p=parseXhs($('xhsPlaceText').value);
  $('xhsParsed').classList.toggle('on',!!(p.title||p.address));
  $('xhsParsed').innerHTML=`<b>识别到：${esc(p.title)}</b><small>${esc(p.category||'')} ${p.address?'<br>'+esc(p.address):''}${p.url?'<br>已识别地点分享链接':''}</small>`;
  return p;
}
async function resolveXhsPlace(){
  const p=updateXhsPlacePreview();const q=[p.title,p.address].filter(Boolean).join(' ');
  if(!q.trim())return toast('还没有识别到地点信息');
  $('xhsParsed').insertAdjacentHTML('beforeend','<small>正在匹配开放地图地点…</small>');
  try{const rows=await geocode(q);if(rows.length){selectCandidate(rows[0]);$('collection').value=guessCollection(rows[0].address)||'旅行';toast('已匹配到地图地点')}else toast('没有自动匹配到，试试手动搜索')}
  catch(e){if(e.name!=='AbortError')toast('地点服务响应较慢')}
}

function openDetail(id){
  const p=S.places.find(x=>x.id===id);if(!p)return;
  S.detailId=id;$('detailName').textContent=p.name;$('detailMeta').textContent=`${p.collection||'旅行'} · ${p.category||'想去'} · ${(p.links||[]).length} 篇攻略`;
  $('detailNote').textContent=p.note||p.address||`${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
  $('detailLinks').innerHTML=(p.links||[]).length?(p.links||[]).map(l=>`<div class="sourcePreview"><b>${esc(l.title)}</b><small>${esc(l.note||'小红书攻略')}</small>${l.url?`<button class="openXhs" data-url="${esc(l.url)}" style="margin-top:8px">打开原帖 ↗</button>`:''}</div>`).join(''):'<div class="helper">这里还没有攻略。你可以把任何一篇小红书链接挂到这个地点下面。</div>';
  $('detailLinks').querySelectorAll('[data-url]').forEach(b=>b.onclick=()=>window.open(b.dataset.url,'_blank'));
  $('detailSheet').classList.add('on');
}
function openXhs(placeId){
  const p=S.places.find(x=>x.id===placeId);if(!p)return;
  S.xhsPlaceId=placeId;$('xhsTarget').textContent=`绑定到：${p.name}`;$('xhsText').value='';$('xhsNote').value='';$('xhsPreview').style.display='none';$('xhsSheet').classList.add('on');
}
function previewXhs(){
  const p=parseXhs($('xhsText').value);if(!$('xhsText').value.trim()){$('xhsPreview').style.display='none';return}
  $('xhsPreview').style.display='block';$('xhsPreview').innerHTML=`<b>${esc(p.title)}</b><small>${p.url?'已识别小红书链接':'还没有识别到链接'}</small>`;
}
function saveXhs(){
  const p=S.places.find(x=>x.id===S.xhsPlaceId);if(!p)return;
  const parsed=parseXhs($('xhsText').value);if(!parsed.url)return toast('还没有识别到小红书链接');
  p.links=p.links||[];
  if(p.links.some(l=>norm(l.url)===norm(parsed.url)))return toast('这篇攻略已经挂过了');
  p.links.unshift({id:uid(),title:parsed.title,url:parsed.url,note:$('xhsNote').value.trim(),createdAt:new Date().toISOString()});
  saveStore();render();$('xhsSheet').classList.remove('on');$('detailSheet').classList.remove('on');toast('已挂到「'+p.name+'」');
}

document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  if(b.dataset.tab!=='map')$(b.dataset.tab).classList.add('on');else setTimeout(()=>S.map.resize(),40);
});
document.querySelectorAll('.modeRow button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('addPlace').onclick=()=>openPlaceSheet(false);$('sheetClose').onclick=()=>$('placeSheet').classList.remove('on');
$('sheetSearchBtn').onclick=sheetSearch;$('sheetSearch').onkeydown=e=>{if(e.key==='Enter')sheetSearch()};
let st; $('search').oninput=()=>{clearTimeout(st);if($('search').value.trim().length>=2)st=setTimeout(topSearch,550);else $('searchResults').classList.remove('on')};
$('search').onkeydown=e=>{if(e.key==='Enter'){clearTimeout(st);topSearch()}};
$('xhsPlaceText').oninput=updateXhsPlacePreview;$('xhsResolve').onclick=resolveXhsPlace;
$('savePlace').onclick=()=>commitPlace(false);$('saveAndAddXhs').onclick=()=>commitPlace(true);$('changePlace').onclick=()=>{S.selected=null;$('chooseBlock').style.display='block';$('selectedBlock').style.display='none'};
$('detailClose').onclick=()=>$('detailSheet').classList.remove('on');$('xhsClose').onclick=()=>$('xhsSheet').classList.remove('on');
$('addXhs').onclick=()=>openXhs(S.detailId);$('xhsText').oninput=previewXhs;$('saveXhs').onclick=saveXhs;
$('deletePlace').onclick=()=>{if(!S.detailId)return;if(confirm('删除这个地点和它下面的攻略？')){S.places=S.places.filter(p=>p.id!==S.detailId);saveStore();render();$('detailSheet').classList.remove('on');toast('已删除')}};
$('fitAll').onclick=fitAll;
$('locate').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>S.map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:13,duration:700}),()=>toast('没有获得定位权限'));
document.addEventListener('click',e=>{if(!e.target.closest('.searchbox')&&!e.target.closest('#searchResults'))$('searchResults').classList.remove('on')});
setTimeout(()=>$('mapHint').classList.add('hide'),6000);

loadStore();initMap();render();updateManual();
})();