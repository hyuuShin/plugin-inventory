import {deriveToolSignals} from './signals.mjs';
export function parseViewState(search){
  const p=new URLSearchParams(search),limit=Number(p.get('limit')??20);
  return {view:['watchlist','weekly','register'].includes(p.get('view'))?p.get('view'):'watchlist',query:(p.get('q')??'').slice(0,500),kind:['Skill','MCP','Plugin'].includes(p.get('kind'))?p.get('kind'):'all',category:p.get('category')??'all',sort:['name','activity'].includes(p.get('sort'))?p.get('sort'):'activity',selectedId:/^[1-9]\d*$/.test(p.get('selected')??'')?p.get('selected'):null,limit:Number.isFinite(limit)&&limit>=20?Math.min(1000,Math.ceil(limit/20)*20):20,signal:['new','attention'].includes(p.get('status'))?p.get('status'):'all'};
}
export function serializeViewState(state){
  const p=new URLSearchParams();
  for(const [key,value] of Object.entries({view:state.view==='watchlist'?null:state.view,q:state.query||null,kind:state.kind==='all'?null:state.kind,category:state.category==='all'?null:state.category,sort:state.sort==='activity'?null:state.sort,selected:state.selectedId,limit:state.limit===20?null:state.limit,status:state.signal==='all'?null:state.signal}))if(value!=null)p.set(key,value);
  return p.toString()?'?'+p:'';
}
export function selectVisibleTools(data,state,now=new Date().toISOString()){
  const map=new Map(data.tools.map(t=>[t.id,t])),q=state.query.trim().toLocaleLowerCase('ko');
  const all=data.registrations.map(r=>{const tool=map.get(r.id),signals=tool?deriveToolSignals(tool,now):{recentRelease:false,attention:r.validation.status!=='valid',stale:false};return {...r,tool,signals,displayName:r.name||tool?.metadata.value?.fullName||r.target?.repo||'등록 #'+r.issueNumber};});
  const filtered=all.filter(r=>(state.kind==='all'||r.kind===state.kind)&&(state.category==='all'||r.category===state.category)&&[r.displayName,r.memo,r.category,r.tool?.metadata.value?.description??''].join(' ').toLocaleLowerCase('ko').includes(q));
  const counts={all:filtered.length,new:filtered.filter(r=>r.signals.recentRelease).length,attention:filtered.filter(r=>r.signals.attention).length};
  const rows=filtered.filter(r=>state.signal==='all'||state.signal==='new'&&r.signals.recentRelease||state.signal==='attention'&&r.signals.attention);
  rows.sort((a,b)=>state.sort==='activity'?((Date.parse(b.tool?.activity.value?.lastCommitDate)||0)-(Date.parse(a.tool?.activity.value?.lastCommitDate)||0)||a.displayName.localeCompare(b.displayName,'ko')):a.displayName.localeCompare(b.displayName,'ko'));
  return {rows:rows.slice(0,state.limit),total:rows.length,hasMore:rows.length>state.limit,counts,selected:rows.find(r=>r.id===state.selectedId)??null};
}
