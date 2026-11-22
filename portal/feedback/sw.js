'use strict';
const FS_PUSH_ROUTES={
 feedback:'/feedback/',
 nis:'/nis/',
 knowledge:'/knowledge/',
 tasks:'/feedback/',
 system:'/'
};
const FS_PUSH_TEXT={
 feedback:'Пришла обратная связь',
 nis:'Доступны результаты НИШ-аналитики',
 knowledge:'Опубликован новый материал в базе знаний',
 tasks:'Появилась новая задача',
 system:'Новое уведомление Future School'
};
function fsSafeDestination(value,kind){
 const fallback=FS_PUSH_ROUTES[kind]||'/feedback/';
 if(typeof value!=='string')return fallback;
 try{
  const target=new URL(value,self.location.origin);
  if(target.origin!==self.location.origin)return fallback;
  if(!['/','/feedback/','/nis/','/knowledge/'].some(prefix=>prefix==='/'?target.pathname==='/':target.pathname===prefix||target.pathname.startsWith(prefix)))return fallback;
  return target.pathname+target.search+target.hash;
 }catch{return fallback}
}
self.addEventListener('push',event=>{
 let data={};
 try{if(event.data)data=event.data.json()||{}}catch{}
 const kind=typeof data.kind==='string'&&Object.prototype.hasOwnProperty.call(FS_PUSH_ROUTES,data.kind)?data.kind:'feedback';
 const body=FS_PUSH_TEXT[kind];
 const url=fsSafeDestination(data.url,kind);
 event.waitUntil(self.registration.showNotification('Future School',{
  body,
  tag:typeof data.tag==='string'&&data.tag.length<120?data.tag:'fs-'+kind,
  icon:'/feedback/icon.svg',
  badge:'/feedback/icon.svg',
  data:{url,kind},
  renotify:false
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const kind=event.notification.data?.kind||'feedback';
 const path=fsSafeDestination(event.notification.data?.url,kind);
 const destination=new URL(path,self.location.origin);
 event.waitUntil((async()=>{
  const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){
   try{
    if(new URL(client.url).origin!==destination.origin)continue;
    const current=new URL(client.url);
    if(current.pathname===destination.pathname&&current.search===destination.search){
      await client.focus();
      return;
    }
    if(typeof client.navigate==='function'){
      const navigated=await client.navigate(destination.href);
      if(navigated){await navigated.focus();return}
    }
   }catch{}
  }
  await clients.openWindow(destination.href);
 })());
});
