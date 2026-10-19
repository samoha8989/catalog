'use strict';
const app=document.getElementById('app');let catalog=[];let currentIndex=0;let scrollFrame;const positions=new Map();let oldRoute='';let heroTimer=null;let heroItems=[];let heroIndex=0;let heroPaused=false;let heroSwapId=0;
// Сайт открыт внутри обёртки Claude (iframe), поэтому SDK Telegram сюда не подключить.
// Просим Telegram развернуть мини-ап на всю высоту напрямую, тем же способом, что и telegram-web-app.js.
function tgPostEvent(type,data){const payload=JSON.stringify(data||{});try{if(window.TelegramWebviewProxy)window.TelegramWebviewProxy.postEvent(type,payload);}catch{}try{if(window.external&&'notify' in window.external)window.external.notify(JSON.stringify({eventType:type,eventData:data||{}}));}catch{}try{for(let w=window;w.parent&&w.parent!==w;w=w.parent)w.parent.postMessage(JSON.stringify({eventType:type,eventData:data||{}}),'*');}catch{}}
function tgExpand(){tgPostEvent('web_app_ready');tgPostEvent('web_app_expand');}
tgExpand();window.addEventListener('load',tgExpand);setTimeout(tgExpand,600);
const tg=window.Telegram?.WebApp;const inTelegram=!!tg?.initData;
const num=id=>String(id).padStart(3,'0');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=s=>s==='Mercedes'?'Mercedes-Benz':s==='CS'?'Дизайн CS':'Кузов '+s;
const brandName=p=>p.series==='Mercedes'?'Mercedes-Benz':'BMW';
function brandCards(){return `<div class="buy-grid brand-grid"><a class="buy-card brand-card" href="#/brand/BMW"><span class="eyebrow">BMW</span><strong>Рули BMW</strong><span>В наличии и под заказ</span></a><a class="buy-card brand-card" href="#/brand/Mercedes"><span class="eyebrow">Mercedes-Benz</span><strong>Рули Mercedes</strong><span>Под заказ</span></a></div>`;}
function mercedesCompatibility(){return `<details class="compatibility mercedes-compatibility"><summary>Посмотреть кузова</summary><p>Подходит на все Mercedes с 2008 по 2018 год.</p></details>`;}
function brandPage(brand){return `${backLink('buy','Выбор марки')}<div class="page-heading"><h1>Рули ${brand==='Mercedes'?'Mercedes-Benz':'BMW'}</h1></div>${brand==='Mercedes'?mercedesCompatibility():''}${buyCards(brand)}`;}
const modeName=mode=>mode==='stock'?'В наличии':'Под заказ';
const groupName={E60:'E60',Eother:'Другие E-кузова',Fsmall:'1–4-я серии, X и M2/M3/M4',Flarge:'5–7-я серии, M5/M6/M8 и 5 GT'};
const branchSeries=branch=>branch.startsWith('E')?'E':branch.startsWith('F')?'F':branch;
function context(branch){return groupName[branch]||title(branch);}
function seriesRoute(mode,series){return series==='E'?'e-groups/'+mode:series==='F'&&mode==='stock'?'f-groups/stock':'catalog/'+mode+'/'+series;}
function productsFor(mode,branch){return catalog.filter(p=>p.availability===mode&&(p.compatibleSeries||[p.series]).includes(branchSeries(branch))&&(!p.groups||p.groups.includes(branch)));}
function buyCards(brand='BMW'){return `<div class="buy-grid ${brand==='Mercedes'?'mercedes-buy-grid':''}">${brand==='BMW'?`<a class="buy-card" href="#/series/stock"><span class="eyebrow">Наличие</span><strong>Купить из наличия</strong><span>Отправим в день заказа</span></a>`:''}<a class="buy-card" href="#/${brand==='Mercedes'?'catalog/order/Mercedes':'series/order'}"><span class="eyebrow">Под заказ</span><strong>Купить под заказ</strong><span>Привезём за 2–3 недели</span></a></div>`;}
function deliveryNote(mode){return mode==='order'?'<p class="delivery-note">Привезём за 2–3 недели</p>':'';}
function modeTabs(mode,series){if(series==='Mercedes')return `<nav class="mode-tabs" aria-label="Способ покупки"><a href="#/catalog/order/Mercedes" class="active">Под заказ</a></nav>${deliveryNote(mode)}`;return `<nav class="mode-tabs" aria-label="Способ покупки"><a href="#/series/stock" class="${mode==='stock'?'active':''}">В наличии</a><a href="#/series/order" class="${mode==='order'?'active':''}">Под заказ</a></nav>${deliveryNote(mode)}`;}
function backLink(route,label){return `<a href="#/${route}" class="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>${label}</a>`;}
function seriesCards(mode){return `<div class="series-grid">${['E','F','G'].map(series=>`<a class="series-card" data-series="${series}" href="#/${seriesRoute(mode,series)}"><span class="series-letter">${series==='Mercedes'?'MB':series}</span><strong>${title(series)}</strong><small>${mode==='order'?catalog.filter(p=>p.series===series&&p.availability==='order').length+' моделей':'Смотреть наличие'}</small></a>`).join('')}</div>`;}
const socialLinks=[['Telegram','https://t.me/bmw_steeringwheels'],['Instagram','https://www.instagram.com/bmw_steeringwheels?stkn=dWgzMW5zdzc1cWRj&utm_source=qr'],['TikTok','https://www.tiktok.com/@bmw_steeringwheel'],['YouTube','https://www.youtube.com/@awe-h1z'],['Avito','https://www.avito.ru/user/3b89b717f65198910ebc1def268e6770/profile']];
function socials(){return `<div class="socials" aria-label="Социальные сети">${socialLinks.map(([name,url])=>`<a href="${esc(url)}" ${name==='Telegram'?'data-telegram':'data-external target="_blank" rel="noopener noreferrer"'}>${name}</a>`).join('')}</div>`;}
const featuredIds=new Set(['012','021','030','033','034','035','039','048','066','067','068','071','073','074','079','081','083','084','088','093','094','098','100','107','111','112','115','125','126']);
function shuffledWheels(items){const pool=items.filter(p=>p.availability==='order'&&featuredIds.has(p.legacyId));for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,7);}
function frameStyle(f){return f?`position:absolute;width:${f.width}%;height:${f.height}%;left:${f.left}%;top:${f.top}%;object-fit:fill`:'';}
function heroRoute(p){return '#/wheel/order/'+p.id+'/' +(p.series==='E'?'Eother':p.series);}
function home(){heroItems=shuffledWheels(catalog);heroIndex=0;heroPaused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const p=heroItems[0];return `<section class="home-hero"><div><div class="eyebrow">BMW Steering Wheels</div><h1>Характер BMW.<br><span class="hero-highlight">В твоих руках.</span></h1><a class="primary" href="#/buy">Выбрать руль</a></div><section class="hero-image" aria-label="Рули из каталога"><a id="heroLink" href="${heroRoute(p)}" aria-label="Открыть руль №${p.displayNumber}"><div class="hero-stage"><img id="heroPhoto" style="${frameStyle(p.frame)}" src="${p.photos[0]}" alt="Руль BMW №${p.displayNumber}" fetchpriority="high"></div><span class="hero-tag" id="heroLabel">№ ${p.displayNumber} · ${title(p.series)}</span></a><div class="hero-dots">${heroItems.map((_,i)=>`<button class="hero-dot" data-hero="${i}" aria-label="Показать фото ${i+1}" aria-current="${i===0}"></button>`).join('')}</div></section></section><div class="section-top"><h2>Выберите марку автомобиля</h2></div>${brandCards()}${socials()}`;}
async function showHero(index){
 const previous=document.getElementById('heroPhoto');if(!previous)return;
 const nextIndex=(index+heroItems.length)%heroItems.length,p=heroItems[nextIndex],swapId=++heroSwapId;
 // Prepare the image and its crop off screen; keep the visible image untouched.
 const next=new Image();next.id='heroPhoto';next.alt='Руль BMW №'+p.displayNumber;next.style.cssText=frameStyle(p.frame);next.src=p.photos[0];
 try{await next.decode();}catch{return;}
 if(swapId!==heroSwapId||document.getElementById('heroPhoto')!==previous)return;
 previous.replaceWith(next);heroIndex=nextIndex;
 const link=document.getElementById('heroLink');link.href=heroRoute(p);link.setAttribute('aria-label','Открыть руль №'+p.displayNumber);
 document.getElementById('heroLabel').textContent='№ '+p.displayNumber+' · '+title(p.series);
 document.querySelectorAll('[data-hero]').forEach((el,i)=>el.setAttribute('aria-current',String(i===heroIndex)));
}
function scheduleHero(){clearInterval(heroTimer);heroTimer=null;if(heroPaused||document.hidden||!document.getElementById('heroPhoto'))return;heroTimer=setInterval(()=>showHero(heroIndex+1),4000);}
function initHero(){heroItems.forEach(p=>{const image=new Image();image.src=p.photos[0];image.decode().catch(()=>{});});document.querySelectorAll('[data-hero]').forEach(el=>el.addEventListener('click',()=>{showHero(Number(el.dataset.hero));scheduleHero();}));scheduleHero();}
document.addEventListener('visibilitychange',scheduleHero);
const eModels=[['1-я серия','E81 / E82 / E87 / E88','2008–2011'],['3-я серия','E90 / E91 / E92 / E93','2005–2012'],['X1','E84','2012–2015'],['X5','E70','2008–2013'],['X6','E71','2008–2013'],['Z4','E89','']];
const fSmall=[['1-я серия','F20 / F21 / F40'],['2-я серия','F22 / F23 / F44 / F45'],['3-я серия','F30 / F31 / F35'],['4-я серия','F32 / F33 / F36'],['X1','F48 / F49'],['X2','F39'],['X3','F25'],['X4','F26'],['X5','F15'],['X6','F16'],['M2','F87'],['M3','F80'],['M4','F82 / F83'],['GT','F34']];
const fLarge=[['5-я серия','F10 / F11 / F18'],['6-я серия','F06 / F12 / F13'],['7-я серия','F01 / F02 / F03'],['M5','F10 / F90'],['M6','F06 / F12 / F13'],['M8','F91 / F92 / F93'],['5-я серия GT','F07']];
function modelList(rows){return `<div class="model-list">${rows.map(([model,codes,years])=>`<div><strong>${model}</strong><span>${codes}</span>${years?`<small>${years}</small>`:''}</div>`).join('')}</div>`;}
function groupTile(mode,branch,name,desc,rows){return `<section class="group-panel"><a class="group-card" href="#/catalog/${mode}/${branch}"><span class="group-label">${modeName(mode)}</span><strong>${name}</strong><small>${desc}</small><span class="group-action">Посмотреть рули</span></a>${rows?`<details class="compatibility"><summary>Кузова${branch==='Eother'?' и годы':''}</summary>${modelList(rows)}</details>`:''}</section>`;}
function groups(mode,series='E'){const isE=series==='E';return `${backLink('series/'+mode,'Выбор кузова')}${modeTabs(mode)}<div class="page-heading"><h1>${title(series)}</h1><p class="muted">Выбери свой автомобиль</p></div><div class="groups">${isE?groupTile(mode,'E60','E60','5-я серия BMW')+groupTile(mode,'Eother','Другие E-кузова','1-я и 3-я серии, X1, X5, X6, Z4',eModels):groupTile('stock','Fsmall','1–4-я серии и X','M2, M3, M4 и GT F34',fSmall)+groupTile('stock','Flarge','5-я, 6-я и 7-я серии','M5, M6, M8 и 5 GT F07',fLarge)}</div>${isE&&mode==='order'?'<p class="hint">Варианты рулей одинаковые. Стоимость зависит от группы кузовов.</p>':''}`;}
function photo(p){const f=p.frame;const style=f?`width:${f.width}%;height:${f.height}%;left:${f.left}%;top:${f.top}%;object-fit:fill`:'object-fit:contain';return `<div class="product-photo"><img src="${p.photos[0]}" style="${style}" alt="Руль ${brandName(p)} №${p.displayNumber}" loading="lazy" decoding="async">${p.photos.length>1?`<span class="photo-count">${p.photos.length} фото</span>`:''}</div>`;}
function prices(p,branch){return p.prices[branch]??p.prices.default??{heated:null,unheated:null};}
function money(value){return value==null?'—':new Intl.NumberFormat('ru-RU').format(value)+' ₽';}
function basePrice(p,branch){const v=prices(p,branch);return Object.hasOwn(v,'single')?v.single:v.unheated;}
function priceFields(p,branch,compact=false){return `<div class="${compact?'card-prices':'price-fields'} single-price"><div class="price-option"><span>Цена</span><strong>от ${money(basePrice(p,branch))}</strong></div></div>`;}
function listing(mode,branch){const series=branchSeries(branch),products=productsFor(mode,branch);const parent=series==='Mercedes'?'brand/Mercedes':series==='E'?'e-groups/'+mode:series==='F'&&mode==='stock'?'f-groups/stock':'series/'+mode;return `${backLink(parent,series==='E'||series==='F'&&mode==='stock'?'Группы кузовов':'Выбор кузова')}${modeTabs(mode,series)}<div class="page-heading"><h1>${title(series)}</h1>${groupName[branch]?`<p class="muted">${context(branch)}</p>`:''}</div>${series==='Mercedes'?mercedesCompatibility():`<nav class="tabs" aria-label="Кузова BMW">${['E','F','G'].map(g=>`<a class="tab ${g===series?'active':''}" ${g===series?'aria-current="page"':''} href="#/${seriesRoute(mode,g)}">${g}</a>`).join('')}</nav>`}${products.length?`<div class="catalog-info"><span>${products.length} моделей</span><span>${modeName(mode)}</span></div><div class="product-grid">${products.map(p=>`<a href="#/wheel/${mode}/${p.id}/${branch}" class="product-card ${p.series==='Mercedes'?'mercedes-card':''}">${photo(p)}<div class="product-meta"><strong>№ ${p.displayNumber}</strong></div>${p.series==='Mercedes'&&(p.material!=='Кожа / алькантара'||p.hasScreen)?`<p class="product-type">${[p.material!=='Кожа / алькантара'?esc(p.material):'',p.hasScreen?'с экраном':''].filter(Boolean).join(' · ')}</p>`:''}${priceFields(p,branch,true)}</a>`).join('')}</div>`:`<section class="stock-empty"><h2>Рули скоро появятся</h2><p>Каталог наличия пополняется.</p><a class="primary" href="#/series/order">Посмотреть рули под заказ</a></section>`}`;}
// Фото руля - прямая ссылка на картинку на сайте ChatGPT (там те же файлы photos/): Telegram покажет из неё превью с фото.
const PHOTO_HOST='https://samoha8989.github.io/catalog/';
function photoUrl(p){return p.photos?.length?PHOTO_HOST+p.photos[0].split('/').map(encodeURIComponent).join('/'):'';}
function purchaseLink(p,branch,mode,opts={}){const lines=[`Хочу узнать цену руля №${p.displayNumber}`,mode==='stock'?'В наличии':'Под заказ'];if(opts.heat)lines.push('Подогрев: '+opts.heat);if(opts.vibro)lines.push('Вибромотор: '+opts.vibro);const ph=photoUrl(p);if(ph)lines.push('Фото руля: '+ph);lines.push('','Подписывайся на наш лайв-канал: @bmw_steeringwheels');return 'https://t.me/samoha8989?text='+encodeURIComponent(lines.join('\n'));}
function optionToggle(name,label){return `<fieldset class="wheel-option"><legend>${label}</legend><div class="option-switch"><label><input type="radio" name="${name}" value="нужен"><span>Нужен</span></label><label><input type="radio" name="${name}" value="не нужен" checked><span>Не нужен</span></label></div></fieldset>`;}
function wheelOptions(){return `<div class="wheel-options">${optionToggle('heat','Подогрев')}${optionToggle('vibro','Вибромотор')}<p class="option-note">Подогрев и вибрация работают, только если они были в машине с завода.</p></div>`;}
function updateBuyLink(p,branch,mode){const a=document.querySelector('.buy-wheel');if(!a)return;const v=n=>document.querySelector(`input[name="${n}"]:checked`)?.value;a.href=purchaseLink(p,branch,mode,{heat:v('heat'),vibro:v('vibro')});}
function detail(p,branch,mode){return `${backLink('catalog/'+mode+'/'+branch,'К каталогу')}<div class="detail"><section class="gallery-shell" aria-label="Фотографии руля №${p.displayNumber}"><div class="gallery ${p.photoFrames?'square-gallery':''}" tabindex="0" aria-label="Листайте фотографии влево и вправо">${p.photos.map((src,i)=>`<div class="slide"><img style="${frameStyle(p.photoFrames?.[i])}" src="${src}" alt="Руль №${p.displayNumber}, фото ${i+1} из ${p.photos.length}" ${i?'loading="lazy"':'fetchpriority="high"'}></div>`).join('')}</div><span class="gallery-index" id="galleryIndex">1 / ${p.photos.length}</span>${p.photos.length>1?`<div class="gallery-controls"><button data-step="-1" id="prevPhoto" disabled>Назад</button><div class="dots">${p.photos.map((_,i)=>`<button class="dot" data-photo="${i}" aria-label="Фото ${i+1}" aria-current="${i===0}"></button>`).join('')}</div><button data-step="1" id="nextPhoto">Далее</button></div>`:''}${wheelOptions()}<a class="primary buy-wheel" href="${esc(purchaseLink(p,branch,mode,{heat:'не нужен',vibro:'не нужен'}))}" data-telegram>Узнать цену</a><p class="purchase-hint">Откроется чат в Telegram: номер руля и выбранные опции уже будут в сообщении.</p></section><section class="detail-info"><div class="eyebrow">${modeName(mode)} · ${title(branchSeries(branch))}</div><h1>Руль ${p.hasScreen?'с экраном ':''}№ ${p.displayNumber}</h1><p class="group-name">${context(branch)}</p>${priceFields(p,branch)}${deliveryNote(mode)}<p class="order-help">При заказе укажи кузов и год автомобиля.</p><a class="secondary" href="https://t.me/bmw_steeringwheels" data-telegram>Telegram-канал</a></section></div>`;}
function notify(s){const el=document.getElementById('toast');el.textContent=s;el.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),2500);}
function movePhoto(i){const gallery=document.querySelector('.gallery');if(!gallery)return;const count=gallery.children.length;const next=Math.max(0,Math.min(count-1,i));gallery.scrollTo({left:next*gallery.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function updateGallery(){const el=document.querySelector('.gallery');if(!el)return;currentIndex=Math.round(el.scrollLeft/el.clientWidth);document.getElementById('galleryIndex').textContent=`${currentIndex+1} / ${el.children.length}`;document.querySelectorAll('.dot').forEach((d,i)=>d.setAttribute('aria-current',String(i===currentIndex)));const prev=document.getElementById('prevPhoto'),next=document.getElementById('nextPhoto');if(prev)prev.disabled=currentIndex===0;if(next)next.disabled=currentIndex===el.children.length-1;}
function render(){
 window.BMWGallery?.close();
 heroSwapId++;clearInterval(heroTimer);heroTimer=null;
 const route=location.hash.slice(2);positions.set(oldRoute,window.scrollY);oldRoute=route;
 const parts=route.split('/'),view=parts[0];let mode=parts[1],branch=parts[2];currentIndex=0;let back='',pageTitle='Каталог рулей';
 if(view==='catalog'&&branch==='CS'){location.replace('#/catalog/'+mode+'/G');return;}
 if(view==='wheel'&&parts[3]==='CS'){location.replace('#/wheel/'+mode+'/'+parts[2]+'/G');return;}
 // Keep old shared catalog links working after the numbering change.
 if(view==='wheel'&&mode!=='stock'&&mode!=='order'){const item=catalog.find(p=>p.legacyId===mode);location.replace(item?'#/wheel/order/'+item.id+'/'+(branch==='E56'?'E60':branch):'#/buy');return;}
 if(view==='catalog'&&mode!=='stock'&&mode!=='order'){location.replace('#/catalog/order/'+(mode==='E56'?'E60':mode));return;}
 if((view==='series'||view==='e-groups')&&!mode){location.replace(view==='series'?'#/buy':'#/e-groups/order');return;}
 if(!view){app.innerHTML=home();initHero();}
 else if(view==='buy'){pageTitle='Выбор марки';app.innerHTML=`${backLink('','Главная')}<div class="page-heading"><h1>Выберите марку автомобиля</h1></div>${brandCards()}`;}
 else if(view==='brand'){if(!['BMW','Mercedes'].includes(mode)){location.replace('#/buy');return;}back='buy';pageTitle='Рули '+(mode==='Mercedes'?'Mercedes-Benz':'BMW');app.innerHTML=brandPage(mode);}
 else if(['series','e-groups','f-groups','catalog','wheel'].includes(view)&&!['stock','order'].includes(mode)){location.replace('#/buy');return;}
 else if(view==='series'){back='brand/BMW';pageTitle=modeName(mode);app.innerHTML=`${backLink('brand/BMW','Способ покупки')}${modeTabs(mode)}<div class="page-heading"><h1>Выберите кузов BMW</h1></div>${seriesCards(mode)}`;}
 else if(view==='e-groups'){back='series/'+mode;pageTitle='Кузов E';app.innerHTML=groups(mode);}
 else if(view==='f-groups'){if(mode==='order'){location.replace('#/catalog/order/F');return;}back='series/stock';pageTitle='Кузов F';app.innerHTML=groups('stock','F');}
 else if(view==='catalog'){
  const valid=mode==='stock'?['E60','Eother','Fsmall','Flarge','G','CS']:['E60','Eother','F','G','CS','Mercedes'];
  if(!valid.includes(branch)){location.replace('#/series/'+mode);return;}
  back=branch==='Mercedes'?'brand/Mercedes':branch.startsWith('E')?'e-groups/'+mode:branch.startsWith('F')&&mode==='stock'?'f-groups/stock':'series/'+mode;pageTitle=title(branchSeries(branch));app.innerHTML=listing(mode,branch);
 }
 else if(view==='wheel'){
  const id=parts[2];branch=parts[3];const p=catalog.find(p=>p.id===id&&p.availability===mode);
  if(!p||!branch||!(p.compatibleSeries||[p.series]).includes(branchSeries(branch))||!productsFor(mode,branch).includes(p)){location.replace('#/series/'+mode);return;}
  back='catalog/'+mode+'/'+branch;pageTitle='Руль № '+p.displayNumber;app.innerHTML=detail(p,branch,mode);
  const gallery=document.querySelector('.gallery');
  window.BMWAnalytics?.track('product_view',{mode,series:p.series,product:p.id});
  let press=null;gallery.addEventListener('pointerdown',e=>press={x:e.clientX,y:e.clientY,left:gallery.scrollLeft},{passive:true});
  gallery.querySelectorAll('.slide').forEach((el,i)=>{el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Увеличить фото '+(i+1));const open=()=>window.BMWGallery.open(p,i,j=>movePhoto(j));el.addEventListener('click',e=>{if(press&&(Math.hypot(e.clientX-press.x,e.clientY-press.y)>10||Math.abs(gallery.scrollLeft-press.left)>10))return;open()});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}})});
  const hint=document.createElement('p');hint.className='photo-hint';hint.textContent='Нажми на фото, чтобы увеличить';gallery.after(hint);
  gallery.addEventListener('scroll',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(updateGallery);},{passive:true});
  gallery.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();movePhoto(currentIndex+(e.key==='ArrowRight'?1:-1));}});
  document.querySelectorAll('[data-photo]').forEach(el=>el.addEventListener('click',()=>movePhoto(Number(el.dataset.photo))));document.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('click',()=>movePhoto(currentIndex+Number(el.dataset.step))));
 }else{location.replace('#/');return;}
 document.title=pageTitle+' | BMW Steering Wheels';
 window.BMWAnalytics?.track('page_view',{mode:['order','stock'].includes(mode)?mode:null,series:view==='wheel'?branchSeries(branch):['catalog','e-groups','f-groups'].includes(view)?(view==='e-groups'?'E':view==='f-groups'?'F':branchSeries(branch)):null});
 document.querySelectorAll('.buy-card,.mode-tabs a').forEach(el=>el.addEventListener('click',()=>window.BMWAnalytics?.track('mode_select',{mode:el.hash.includes('stock')?'stock':'order'})));
 document.querySelectorAll('.series-card,.tabs .tab,.group-card').forEach(el=>el.addEventListener('click',()=>{const path=el.hash.split('/'),last=path.at(-1);window.BMWAnalytics?.track('series_select',{mode,series:el.dataset.series||(el.hash.includes('e-groups')?'E':el.hash.includes('f-groups')?'F':branchSeries(last))})}));
 if(view==='wheel'){const wp=catalog.find(x=>x.id===parts[2]&&x.availability===mode);if(wp)document.querySelectorAll('.wheel-options input').forEach(el=>el.addEventListener('change',()=>updateBuyLink(wp,branch,mode)));}
 document.querySelector('.buy-wheel')?.addEventListener('click',()=>window.BMWAnalytics?.track('buy_click',{mode,series:branchSeries(branch),product:parts[2]}));
 document.querySelectorAll('.socials a').forEach(el=>el.addEventListener('click',()=>window.BMWAnalytics?.track('social_click')));
 if(inTelegram){telegramTheme();}
 document.querySelectorAll('[data-external]').forEach(el=>el.addEventListener('click',e=>{if(inTelegram){e.preventDefault();tg.openLink(el.href);}}));
 if(inTelegram){tg.BackButton.offClick(telegramBack);telegramBack.target=back;if(view){tg.BackButton.show();tg.BackButton.onClick(telegramBack);}else tg.BackButton.hide();}
 document.querySelectorAll('[data-telegram]').forEach(el=>el.addEventListener('click',e=>{if(inTelegram){e.preventDefault();tg.openTelegramLink(el.href);}}));
 window.scrollTo(0,view==='catalog'?(positions.get(route)||0):0);app.focus({preventScroll:true});
}
function telegramBack(){if(window.BMWGallery?.isOpen){window.BMWGallery.close();return;}location.hash='#/'+(telegramBack.target||'');}
function telegramTheme(){if(!inTelegram)return;document.documentElement.dataset.theme=tg.colorScheme;const dark=tg.colorScheme==='dark';try{tg.setHeaderColor(dark?'#121c29':'#ffffff');tg.setBackgroundColor(dark?'#121c29':'#ffffff');}catch{}const inset=tg.contentSafeAreaInset||{};document.documentElement.style.setProperty('--safe-top',(inset.top||0)+'px');document.documentElement.style.setProperty('--safe-bottom',(inset.bottom||0)+'px');}
async function start(){try{const res=await fetch('catalog.json?v=45',{cache:'no-cache'});if(!res.ok)throw Error('catalog');catalog=await res.json();if(!Array.isArray(catalog)||!catalog.length)throw Error('empty');telegramTheme();if(inTelegram){tg.expand();tg.onEvent('themeChanged',telegramTheme);tg.onEvent('contentSafeAreaChanged',telegramTheme);}render();tg?.ready();}catch{app.innerHTML='<div class="error"><h2>Не удалось загрузить каталог</h2><p class="muted">Проверь подключение к интернету и попробуй ещё раз.</p><button class="primary" id="retry">Попробовать снова</button></div>';document.getElementById('retry').onclick=start;}}
window.addEventListener('hashchange',()=>{if(catalog.length)render();});start();
