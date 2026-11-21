'use strict';
self.addEventListener('push',event=>{
 let data={title:'Future School',body:'В личном кабинете доступна новая обратная связь.',url:'/feedback/'};
 try{if(event.data){const v=event.data.json();data={...data,...v}}}catch{}
 const safePath=typeof data.url==='string'&&data.url.startsWith('/feedback/')?data.url:'/feedback/';
 event.waitUntil(self.registration.showNotification('Future School',{
  body:'Доступна новая еженедельная обратная связь. Откройте личный кабинет.',
  tag:typeof data.tag==='string'?data.tag:'fs-feedback',
  icon:'/feedback/icon.svg',badge:'/feedback/icon.svg',
  data:{url:safePath},renotify:false
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL('/feedback/',self.location.origin);
 event.waitUntil((async()=>{
  const all=await clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of all){
   if(new URL(client.url).origin===url.origin&&new URL(client.url).pathname.startsWith('/feedback/')){
    await client.focus();return;
   }
  }
  await clients.openWindow(url.href);
 })());
});
