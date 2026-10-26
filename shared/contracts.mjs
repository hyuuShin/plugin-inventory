export const KINDS = ['Skill','MCP','Plugin'];
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const ensure = (yes,message) => { if(!yes) throw new Error(message); };
export function validateConfig(value) {
  ensure(object(value),'설정이 필요합니다');
  for (const key of ['owner','repository']) ensure(typeof value[key]==='string' && /^[A-Za-z0-9_.-]+$/.test(value[key]),'잘못된 '+key);
  ensure(typeof value.basePath==='string' && /^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value.basePath),'잘못된 basePath');
  ensure(Array.isArray(value.categories) && value.categories.length>0 && value.categories.every(x=>typeof x==='string'),'용도 분류가 필요합니다');
  ensure(object(value.limits) && value.limits.registrations>0 && value.limits.candidates>0,'수집 한도가 필요합니다');
  ensure(Array.isArray(value.discoveryQueries),'검색 설정이 필요합니다');
  return value;
}
export function createEmptyStored(config,now=null) {
  validateConfig(config);
  return {current:{schemaVersion:1,registrations:[],tools:[],weekly:null,run:{lastAttemptAt:now,lastSuccessfulAt:null,lastPublishedAt:null,status:'never',workflowUrl:null}},history:[],candidates:[],weeks:[]};
}
export function validateSiteData(value) {
  ensure(object(value) && value.schemaVersion===1,'지원하지 않는 자료 형식');
  ensure(Array.isArray(value.registrations) && Array.isArray(value.tools),'목록 자료가 필요합니다');
  ensure(object(value.run) && ['never','ok','partial','error'].includes(value.run.status),'실행 상태가 필요합니다');
  for (const r of value.registrations) {
    ensure(typeof r.id==='string' && Number.isSafeInteger(r.issueNumber) && r.issueNumber>0,'잘못된 등록 ID');
    ensure(object(r.validation) && ['valid','invalid','duplicate','over-limit'].includes(r.validation.status),'잘못된 등록 상태');
    ensure(typeof r.memo==='string' && typeof r.name==='string','잘못된 등록 문구');
    if(r.validation.status==='valid') ensure(r.target && Number.isSafeInteger(r.target.repositoryId),'잘못된 추적 대상');
  }
  for(const t of value.tools) {
    ensure(typeof t.id==='string' && object(t.target),'잘못된 도구 자료');
    for(const k of ['metadata','release','activity']) ensure(object(t[k]) && ['ok','missing','error','partial'].includes(t[k].status),'잘못된 필드 상태');
  }
  for (const key of ['lastAttemptAt','lastSuccessfulAt','lastPublishedAt']) ensure(value.run[key]==null || Number.isFinite(Date.parse(value.run[key])),'잘못된 시각');
  if(value.weekly) validateWeekly(value.weekly);
  return value;
}
export function validateWeekly(value) {
  ensure(object(value) && typeof value.weekId==='string' && Array.isArray(value.growth) && Array.isArray(value.newcomers),'잘못된 주간 자료');
  for(const item of value.growth) ensure(Number.isInteger(item.delta) && item.delta>0 && item.stars-item.baselineStars===item.delta,'잘못된 주간 비교');
  return value;
}
export function validateStoredData(value) {
  validateSiteData(value.current);
  for(const k of ['history','candidates','weeks']) ensure(Array.isArray(value[k]),'잘못된 저장 자료: '+k);
  value.weeks.forEach(validateWeekly);
  return value;
}
export function field(value,status,now,previous=null,errorCode=null) {
  const failed=status==='error';
  return {value:failed?(previous?.value??null):value,status,attemptedAt:now,succeededAt:failed?(previous?.succeededAt??null):now,errorCode};
}
