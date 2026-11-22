(function(){
'use strict';
if(window.fsMountNotificationWidget)return;
const css=`
.fsn-host{display:inline-flex;position:relative;align-items:center;color:var(--ink,#20252d);font:13px/1.5 system-ui,sans-serif}
.fsn-bell{width:40px;height:40px;background:#fff;border:1px solid #ddd;border-radius:12px;cursor:pointer;position:relative;font-size:20px}
.fsn-badge{position:absolute;right:-7px;top:-7px;background:#b63e41;border:2px solid white;border-radius:20px;min-width:21px;height:21px;padding:0 3px;color:#fff;font-size:10px;font-weight:800;display:grid;place-items:center}
.fsn-pop{position:absolute;top:48px;right:0;width:min(370px,calc(100vw - 24px));z-index:3000;background:#fff;border:1px solid #dedbd4;box-shadow:0 16px 35px #2223;border-radius:14px;padding:13px;max-height:75vh;overflow:auto}
.fsn-item{width:100%;display:block;text-align:left;border:0;border-bottom:1px solid #eee;padding:11px 8px;background:#fff;cursor:pointer;color:#242424}
.fsn-item.unread{background:#f0f3f6}.fsn-item strong{display:block}.fsn-item small{display:block;color:#666;margin-top:4px}
.fsn-tools{display:flex;gap:6px;flex-wrap:wrap;justify-content:space-between;margin:9px 0}
.fsn-tools button{background:#f5f5f2;border:1px solid #dedbd4;border-radius:8px;padding:8px;cursor:pointer;font-size:12px;color:#272727}
.fsn-overlay{position:fixed;inset:0;z-index:20000;background:#1119;display:flex;justify-content:center;align-items:flex-start;padding:6vh 12px;overflow:auto}
.fsn-dialog{width:min(600px,100%);background:#fff;color:#202020;border-radius:16px;padding:18px;max-height:85vh;overflow:auto}
.fsn-header{display:flex;justify-content:space-between;align-items:center;gap:12px}.fsn-row{display:grid;grid-template-columns:minmax(0,1fr) 65px 65px;gap:6px;padding:13px 2px;border-bottom:1px solid #eee;align-items:center}
.fsn-row input{margin:auto;width:17px;height:17px}.fsn-row small{color:#666;display:block}
`;
if(!document.querySelector('#fsn-global-style')){const st=document.createElement('style');st.id='fsn-global-style';st.textContent=css;document.head.append(st)}
function el(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e}
window.fsMountNotificationWidget=function(client,host){
if(!client||!host)return {destroy(){}};
host.replaceChildren();host.classList.add('fsn-host');
let items=[],unread=0,popOpen=false,timer=null,stopped=false,view='list',overlay=null;
const bell=el('button','fsn-bell','♧');bell.type='button';bell.textContent='🔔';bell.setAttribute('aria-label','Уведомления');host.append(bell);
const badge=el('span','fsn-badge');badge.hidden=true;bell.append(badge);
const pop=el('div','fsn-pop');pop.hidden=true;host.append(pop);
async function rpc(p){const {data,error}=await client.rpc('fs_notification_center',p);if(error)throw Error(error.message);return data}
function heading(container,title){const head=el('div','fsn-header');head.append(el('strong','',title));return head}
function button(text,cb){const b=el('button','',text);b.type='button';b.onclick=cb;return b}
async function mark(n){if(!n.read_at){await rpc({p_action:'mark_read',p_id:n.id});n.read_at=new Date().toISOString();unread=Math.max(0,unread-1);setBadge()}}
function setBadge(){badge.hidden=!unread;badge.textContent=unread>10?'10+':String(unread);bell.setAttribute('aria-label','Уведомления'+(unread?' · '+unread+' непрочитанных':''))}
function row(n){const b=el('button','fsn-item'+(n.read_at?'':' unread'));b.type='button';b.append(el('strong','',(n.read_at?'':'● ')+n.title+(n.count>1?' · '+n.count:'')),el('small','',n.body),el('small','',new Date(n.updated_at).toLocaleString('ru-RU')));
b.onclick=async()=>{try{await mark(n)}catch{}hide();location.assign(n.link&&n.link.startsWith('/')&&!n.link.startsWith('//')?n.link:'/feedback/')};return b}
async function markAll(){try{await rpc({p_action:'mark_all'});await load()}catch(e){alert('Ошибка уведомлений: '+e.message)}}
function hide(){pop.hidden=true;popOpen=false}
function controls(container,full){const tools=el('div','fsn-tools');tools.append(button('Прочитать все',markAll),button('Настройки',settings));if(!full)tools.append(button('Все уведомления',()=>all()));container.append(tools)}
function drawPop(){pop.replaceChildren(heading(pop,'Уведомления'));let shown=items.filter(n=>!n.read_at).slice(0,5);if(!shown.length)shown=items.slice(0,5);if(!shown.length)pop.append(el('p','', 'Новых уведомлений нет'));else shown.forEach(n=>pop.append(row(n)));controls(pop,false)}
function showModal(title){hide();if(overlay)overlay.remove();overlay=el('div','fsn-overlay');const dialog=el('div','fsn-dialog');const h=heading(dialog,title);h.append(button('Закрыть ✕',()=>overlay.remove()));dialog.append(h);overlay.append(dialog);document.body.append(overlay);overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};return dialog}
function all(){view='list';const d=showModal('Все уведомления');controls(d,true);if(!items.length)d.append(el('p','','Уведомлений пока нет'));items.forEach(n=>d.append(row(n)))}
async function settings(){
 view='settings';const d=showModal('Настройки уведомлений');
 d.append(el('p','','Категории зависят от роли. Внутренние уведомления можно отключать; обязательные сообщения остаются.'));
 try{
 const cats=await rpc({p_action:'categories'});
 const h=el('div','fsn-row');h.append(el('span','','Категория'),el('small','','На сайте'),el('small','','Push'));d.append(h);
 for(const c of cats){const line=el('div','fsn-row'),label=el('div');label.append(el('strong','',c.label));if(!c.ready)label.append(el('small','','Ожидает подключения модуля'));line.append(label);
 const check=el('input');check.type='checkbox';check.checked=c.inapp;check.disabled=c.id==='system';check.setAttribute('aria-label',c.label);check.onchange=async()=>{check.disabled=true;try{await rpc({p_action:'set_preference',p_category:c.id,p_inapp:check.checked,p_push:!!c.push});await load()}catch(e){check.checked=!check.checked;alert('Не удалось сохранить: '+e.message)}finally{check.disabled=c.id==='system'}};line.append(check);
 const push=el('small','',c.push_available?'Настроить в «Обратной связи»':'—');line.append(push);d.append(line)}
 d.append(el('p','','Для включения push на конкретном устройстве откройте «Обратная связь» → колокольчик → «Настройки».'));
 }catch(e){d.append(el('p','','Не удалось загрузить настройки: '+e.message))}
}
async function load(){if(stopped)return;try{const d=await rpc({p_action:'list',p_limit:60});if(stopped)return;items=d.items||[];unread=d.unread||0;setBadge();if(popOpen)drawPop()}catch(e){console.warn('Future School notifications:',e.message)}}
bell.onclick=()=>{popOpen=!popOpen;pop.hidden=!popOpen;if(popOpen){drawPop();load()}};
const onDoc=e=>{if(!host.contains(e.target))hide()};
document.addEventListener('click',onDoc);
load();timer=setInterval(()=>{if(document.visibilityState==='visible')load()},45000);
return {destroy(){stopped=true;clearInterval(timer);document.removeEventListener('click',onDoc);if(overlay)overlay.remove();host.replaceChildren()}};
};
})();