// 운영 콘솔의 인증된 api()를 재사용한다. 새 정책을 저장해도 운영에는 적용하지 않는다.
let diaryPromptState = null;
let diaryPromptBusy = false;
const diaryPromptLabels = { analysis:'재료 분석', writer:'일기 작성', review:'검수', fix:'지적 사항 수정' };
const diaryStyleLabels = { len:{short:'간결하게',normal:'재료에 맞게',long:'자세하게'}, warmth:{plain:'담백하게',warm:'다정하게'}, focus:{fact:'기록 위주',balance:'균형',feeling:'감정 위주'}, pov:{first:'나',second:'너',third:'그 사람'} };
function dpMessage(e) {
  const m = String(e.message || e);
  for(const [k,v] of Object.entries({prompt_version_conflict:'다른 화면에서 버전이 변경됐습니다. 새로고침 후 다시 확인해 주세요.',prompt_draft_changed:'저장된 초안이 바뀌었습니다. 다시 불러와 주세요.',prompt_runtime_not_ready:'서버가 새 프롬프트 관리를 아직 지원하지 않습니다. 서버 배포 후 이용할 수 있습니다.',eval_secret_missing:'서버의 시험 생성 인증 설정이 필요합니다.',prompt_invalid_model:'모델 ID를 확인해 주세요. 사진 관찰과 검수에는 Gemini 모델이 필요합니다.'})) if(m.includes(k)) return v;
  return m;
}
async function loadDiaryPrompts() {
  if(diaryPromptBusy) return;
  $('diaryPromptEditor').textContent = '불러오는 중…';
  try {
    diaryPromptState = await api('diary_prompts.get');
    renderDiaryPromptEditor(diaryPromptState.draft || diaryPromptState.active);
    await loadDiaryPromptHistory();
  } catch(e) { $('diaryPromptEditor').textContent = '프롬프트 관리 화면을 불러오지 못했습니다. '+dpMessage(e); }
}
function renderDiaryPromptEditor(b) {
  const s=diaryPromptState;
  $('diaryPromptStatus').textContent = '운영: '+s.active.label+' · '+s.active.id+' / '+(s.draft?'저장된 초안: '+s.draft.id:'저장된 초안 없음');
  $('diaryPromptEditor').innerHTML = `<label>버전 이름<input id="dpLabel" maxlength="120" value="${esc(b.label)}"></label>
    <div class="grid2" style="margin-top:12px">${Object.entries(b.models).map(([stage,m])=>`<label>${({observe:'사진 관찰',editor:'재료 분석',writer:'일기 작성·수정',review:'검수'})[stage]} 모델<input id="dpModel_${stage}" value="${esc(m)}" maxlength="100"></label>`).join('')}</div>
    <p class="muted">모델의 API ID를 입력하세요. 모델 이름을 저장하는 것만으로 연결·품질이 검증되지는 않습니다. API 키는 입력하지 않습니다.</p>
    ${Object.entries(diaryPromptLabels).map(([k,l])=>`<details ${k==='writer'?'open':''}><summary>${l} 규칙</summary><textarea id="dpText_${k}" rows="9" maxlength="16000">${esc(b[k])}</textarea></details>`).join('')}
    <details><summary>사용자 설정별 작성 규칙</summary>${Object.entries(diaryStyleLabels).map(([axis,choices])=>Object.entries(choices).map(([k,l])=>`<label>${esc(l)}<textarea rows="2" maxlength="4000" id="dpStyle_${axis}_${k}">${esc(b.styles[axis][k])}</textarea></label>`).join('')).join('')}</details>
    <div class="row" style="margin-top:12px"><button class="ghost" onclick="saveDiaryPrompt()">초안 저장</button><button class="ghost" onclick="copyActiveDiaryPrompt()">운영 버전 불러오기</button><button class="ghost" onclick="resetDiaryPrompt()">기본 규칙 불러오기</button><button class="pri" onclick="applyDiaryPrompt()">저장한 초안 운영 적용</button></div>`;
  $('diaryPromptEditor').oninput=()=>{$('diaryPromptEditState').textContent='수정 중 · 저장 전입니다. 운영에는 반영되지 않았습니다.';};
  $('diaryPromptEditState').textContent='편집한 내용은 초안 저장 후 운영 적용해야 새 일기에 반영됩니다.';
}
function readDiaryPrompt() {
  const b=structuredClone(diaryPromptState.draft || diaryPromptState.active);
  b.label=$('dpLabel').value.trim();
  for(const k of Object.keys(diaryPromptLabels)) b[k]=$('dpText_'+k).value;
  for(const k of Object.keys(b.models)) b.models[k]=$('dpModel_'+k).value.trim();
  for(const [axis,choices] of Object.entries(diaryStyleLabels)) for(const k of Object.keys(choices)) b.styles[axis][k]=$('dpStyle_'+axis+'_'+k).value;
  return b;
}
async function withDiaryPromptBusy(fn) {
  if(diaryPromptBusy) return;
  diaryPromptBusy=true;
  const controls=[...$('t-diaryprompts').querySelectorAll('button,input,textarea,select')];
  controls.forEach(b=>b.disabled=true);
  try { await fn(); } catch(e) {toast(dpMessage(e),true);} finally {diaryPromptBusy=false;controls.forEach(b=>b.disabled=false);}
}
async function saveDiaryPrompt() {await withDiaryPromptBusy(async()=>{
  const r=await api('diary_prompts.save',{bundle:readDiaryPrompt(),expected_id:diaryPromptState.draft?.id??null});
  diaryPromptState.draft=r.bundle;
  $('diaryPromptEditState').textContent='초안 저장 완료 · '+r.bundle.id+' · 운영은 그대로입니다.';
  toast('초안 저장 완료');
});}
function copyActiveDiaryPrompt(){if(confirm('편집 중인 내용을 운영 버전으로 바꿀까요?'))renderDiaryPromptEditor(diaryPromptState.active);}
function resetDiaryPrompt(){if(confirm('편집 중인 내용을 기본 규칙으로 바꿀까요? 운영은 바뀌지 않습니다.'))renderDiaryPromptEditor(diaryPromptState.defaults);}
async function applyDiaryPrompt(){await withDiaryPromptBusy(async()=>{
  if(!diaryPromptState.draft) throw new Error('먼저 초안을 저장해 주세요.');
  const edit=readDiaryPrompt(), saved=diaryPromptState.draft;
  edit.id=saved.id;
  if(JSON.stringify(edit)!==JSON.stringify(saved)) throw new Error('저장하지 않은 수정이 있습니다. 초안 저장 후 적용해 주세요.');
  if(!confirm('저장된 초안을 운영에 적용할까요? 진행 중인 생성과 기존 일기는 유지되며, 새 생성부터 변경됩니다.'))return;
  const r=await api('diary_prompts.apply',{draft_id:saved.id,expected_id:diaryPromptState.active_id});
  diaryPromptState.active=r.bundle;diaryPromptState.active_id=r.bundle.id;
  $('diaryPromptStatus').textContent='운영 적용 저장 완료 · '+r.bundle.label+' · '+r.bundle.id+' · 서버 캐시 갱신 후 새 생성부터 반영';
  $('diaryPromptEditState').textContent='저장된 초안을 운영 버전으로 적용했습니다.';
  await loadDiaryPromptHistory();toast('운영 적용 저장 완료');
});}
function diaryTestInput(){return {target_date:$('dpDate').value,seed_line:$('dpSeed').value+( $('dpMaterials').value.trim()?'\n추가 기록:\n'+$('dpMaterials').value:''),style:{len:$('dpLen').value,warmth:$('dpWarmth').value,focus:$('dpFocus').value},pov:$('dpPov').value,locale:'ko'};}
function showDiaryTest(id,r){
  const box=$(id);box.replaceChildren();
  const meta=document.createElement('p');meta.className='muted';meta.textContent='버전 '+r.meta.prompt_version+' · 작성 '+(r.meta.models.writer||'미확인')+' · 본문 '+r.body.length+'자 (합격 기준 아님)';
  const title=document.createElement('h3');title.textContent=r.title;
  const body=document.createElement('div');body.style.whiteSpace='pre-wrap';body.textContent=r.body;
  box.append(meta,title,body);
}
async function testDiaryPrompts(){await withDiaryPromptBusy(async()=>{
  const bundle=readDiaryPrompt(),input=diaryTestInput();
  if(!input.target_date || !input.seed_line.trim())throw new Error('날짜와 오늘의 생각 또는 재료를 입력해 주세요.');
  $('dpActiveResult').textContent='운영 버전 생성 중…';$('dpDraftResult').textContent='초안 대기 중…';
  // 한 요청이 실패해도 다른 결과를 확인할 수 있게 분리한다. 재료는 같은 스냅샷을 사용한다.
  for(const [which,id] of [['active','dpActiveResult'],['draft','dpDraftResult']]) {
    try { const r=await api('diary_prompts.test',{which,bundle,input});showDiaryTest(id,r); }
    catch(e){$(id).textContent='생성 실패: '+dpMessage(e);}
  }
});}
async function loadDiaryPromptHistory(){
  const r=await api('diary_prompts.history');
  const root=$('diaryPromptHistory');root.replaceChildren();
  for(const row of r.rows){if(!row.new_value)continue;const line=document.createElement('div');line.className='row';
    const label=document.createElement('span');label.textContent=row.changed_at+' · '+row.new_value.label+' · '+row.new_value.id;
    const button=document.createElement('button');button.className='ghost';button.textContent='이 버전으로 복원';
    button.onclick=()=>restoreDiaryPrompt(row.id);line.append(label,button);root.append(line);
  }
  if(!root.children.length)root.textContent='아직 운영 적용 이력이 없습니다.';
}
async function restoreDiaryPrompt(id){await withDiaryPromptBusy(async()=>{
  if(!confirm('선택한 버전의 규칙과 모델을 함께 복원할까요?'))return;
  const r=await api('diary_prompts.restore',{audit_id:id,expected_id:diaryPromptState.active_id});
  diaryPromptState.active=r.bundle;diaryPromptState.active_id=r.bundle.id;
  $('diaryPromptStatus').textContent='복원 저장 완료 · '+r.bundle.label+' · '+r.bundle.id;
  $('diaryPromptEditState').textContent='운영 버전을 복원했습니다. 편집 중인 초안은 유지됩니다.';
  await loadDiaryPromptHistory();toast('이전 규칙 복원 완료');
});}
