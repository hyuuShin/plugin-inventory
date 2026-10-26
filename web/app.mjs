import {parseViewState,serializeViewState} from './state.mjs';
import {renderApp,node} from './render.mjs';
const root=document.querySelector('#app');
let config,data,state=parseViewState(location.search),listScroll=0;
function draw(){
  const active=document.activeElement,id=active?.id,start=active?.selectionStart,end=active?.selectionEnd;
  renderApp(root,{config,data,state,now:new Date().toISOString()});
  if(id){const next=document.getElementById(id);next?.focus({preventScroll:true});if(next?.setSelectionRange&&typeof start==='number')try{next.setSelectionRange(start,end);}catch{}}
}
function update(patch,{replace=false,focus=false}={}){
  state={...state,...patch};const url=location.pathname+serializeViewState(state);
  history[replace?'replaceState':'pushState']({listScroll},'',url);draw();
  if(focus)root.querySelector('h1')?.focus({preventScroll:true});
}
async function load(){
  try{
    const responses=await Promise.all([fetch('./config.json',{cache:'no-cache'}),fetch('./data/current.json',{cache:'no-cache'})]);
    if(responses.some(r=>!r.ok))throw Error('load');
    [config,data]=await Promise.all(responses.map(r=>r.json()));
    if(data.schemaVersion!==1||!Array.isArray(data.registrations)||!Array.isArray(data.tools))throw Error('schema');draw();
  }catch{root.replaceChildren(node('main',{class:'load-error'},node('h1',{},'자료를 불러오지 못했습니다'),node('p',{},'연결을 확인한 뒤 다시 시도해 주세요.'),node('button',{type:'button','data-action':'retry',class:'button'},'다시 시도')));}
}
root.addEventListener('click',event=>{
  const nav=event.target.closest('[data-view]');if(nav&&!event.metaKey&&!event.ctrlKey){event.preventDefault();update({view:nav.dataset.view,selectedId:null},{focus:true});window.scrollTo(0,0);return;}
  const el=event.target.closest('[data-action]');if(!el)return;
  const action=el.dataset.action;
  if(action==='retry'){load();return;}
  if(action==='register'||action==='watchlist'){update({view:action==='register'?'register':'watchlist',selectedId:null},{focus:true});window.scrollTo(0,0);}
  if(action==='signal')update({signal:el.dataset.signal,limit:20,selectedId:null});
  if(action==='detail'){listScroll=scrollY;update({selectedId:el.dataset.id});if(matchMedia('(max-width:700px)').matches){root.querySelector('.detail')?.scrollIntoView();root.querySelector('.mobile-back')?.focus({preventScroll:true});}}
  if(action==='back'){update({selectedId:null},{replace:true});window.scrollTo(0,listScroll);root.querySelector('.tool-name')?.focus({preventScroll:true});}
  if(action==='more')update({limit:state.limit+20});
  if(action==='clear'){update({query:'',limit:20,selectedId:null},{replace:true});document.querySelector('#query')?.focus({preventScroll:true});}
  if(action==='reset')update({query:'',kind:'all',category:'all',signal:'all',limit:20,selectedId:null});
});
root.addEventListener('input',event=>{if(event.target.id==='query'&&!event.isComposing)update({query:event.target.value,limit:20,selectedId:null},{replace:true});});
root.addEventListener('compositionend',event=>{if(event.target.id==='query')update({query:event.target.value,limit:20,selectedId:null},{replace:true});});
root.addEventListener('change',event=>{if(['kind','category','sort'].includes(event.target.id))update({[event.target.id]:event.target.value,limit:20,selectedId:null});});
window.addEventListener('popstate',()=>{state=parseViewState(location.search);listScroll=history.state?.listScroll??listScroll;if(config&&data){draw();if(!state.selectedId)window.scrollTo(0,listScroll);}});
await load();
setInterval(()=>{if(config&&data&&!document.activeElement?.matches('input,select,button,a'))draw();},60000);
