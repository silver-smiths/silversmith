// Extends the existing story page; uses the existing authenticated admin API.
const storyPage=document.getElementById('t-story');
if(storyPage){
  const css=document.createElement('style');css.textContent='#storyProductionTable{min-width:520px}#storyMetricsTable{min-width:680px}#storyProductionTable button{white-space:nowrap}#storyRecordSummary p{white-space:pre-wrap}';document.head.append(css);
  const help=storyPage.querySelector('[data-h]');if(help)help.dataset.h='공개·참여 동의 일기 선정 → 자동 검수 → 작성자 알림 → 24시간 후 제작 → YouTube·Instagram·Threads 게시. 매일 한국 시간 10시 GitHub Actions가 실행합니다. 영상 자동 생성 스위치로 새 선정·제작을 중단할 수 있습니다.';
  const controls=document.createElement('div'); controls.className='card';
  controls.innerHTML='<h3>영상 자동 생성</h3><p>공개·참여 동의 일기 선정 → 자동 검수 → 작성자에게 알림 → 24시간 후 제작 → YouTube·Instagram·Threads 게시</p><button id="storyGenerationSwitch" class="ghost" disabled>설정 확인 중…</button><p id="storyControlStatus" class="muted"></p><p class="muted">끄면 새 선정·생성 요청을 중단합니다. 이미 시작한 외부 생성 요청은 취소되지 않을 수 있습니다. 완성 영상 게시, 성과 수집, 삭제 요청 처리는 계속됩니다. 하루 최대 새 후보 1편 · 자동 제작 1편.</p>';
  storyPage.prepend(controls);
  const evidence=document.createElement('div');evidence.className='card';
  evidence.innerHTML='<h3>제작 기록</h3><p class="muted">후보 번호로 게시 기록과 연결됩니다. 기록 보기에서 실제 대본·장면 지시문·가이드·검수·재시도를 확인할 수 있습니다.</p><div style="overflow:auto"><table id="storyProductionTable"></table></div><details id="storyRecordPanel"><summary>선택한 제작 기록</summary><div id="storyRecordSummary"></div><details><summary>전체 기술 기록</summary><pre id="storyRecordContent" style="white-space:pre-wrap;max-height:600px;overflow:auto"></pre></details></details><h3>게시 후 성과</h3><p class="muted">24시간·72시간·7일 이후 첫 관측값입니다. 실제 경과 시간을 함께 표시하며, 플랫폼 간 조회수를 같은 기준으로 비교하지 않습니다. 조회 불가는 0회와 다릅니다.</p><div style="overflow:auto"><table id="storyMetricsTable"></table></div>';
  storyPage.append(evidence);
  const baseLoadStory=loadStory;
  loadStory=async function(){await baseLoadStory();await loadStoryAutomation();};
}
async function loadStoryAutomation(){
  const button=document.getElementById('storyGenerationSwitch');
  try{
    const d=await api('story.dashboard');
    button.disabled=false;button.textContent=d.enabled?'켜짐 · 눌러서 생성 중단':'꺼짐 · 눌러서 자동 생성 시작';button.setAttribute('aria-pressed',String(d.enabled));
    button.onclick=async()=>{button.disabled=true;try{await api('policies.set',{key:'story.generation_enabled',value:!d.enabled});toast(!d.enabled?'자동 생성을 켰습니다. 다음 예약 실행부터 적용됩니다.':'새 영상 생성을 중단했습니다.');await loadStoryAutomation();}catch(e){button.disabled=false;toast(e.message,true);}};
    document.getElementById('storyControlStatus').textContent='매일 10:00(한국 시간) 실행 예정 · 예약 서비스 사정으로 지연 가능 · '+(d.control?.updated_at?'마지막 변경 '+fmtT(d.control.updated_at):'');
    const phases={before_generation:'생성 전',rendered:'제작 완료',failed:'실패'};
    document.getElementById('storyProductionTable').innerHTML='<tr><th>일시</th><th>후보</th><th>상태</th><th>기록</th></tr>'+d.runs.map((r,i)=>`<tr><td>${esc(fmtT(r.created_at))}</td><td>${esc(r.candidate_id.slice(0,8))}</td><td>${esc(phases[r.phase]||r.phase)}</td><td><button class="ghost" data-record-index="${i}">기록 보기</button></td></tr>`).join('');
    if(!d.runs.length)document.getElementById('storyProductionTable').innerHTML='<tr><td>아직 제작 기록이 없습니다.</td></tr>';
    document.querySelectorAll('[data-record-index]').forEach(b=>b.onclick=async()=>{const r=d.runs[Number(b.dataset.recordIndex)];try{const x=await api('story.record',{run_id:r.run_id,phase:r.phase});const ev=x.record.evidence||{};document.getElementById('storyRecordSummary').innerHTML='<h4>'+esc(ev.title||'제작 기록')+'</h4><p>'+esc(ev.script||'대본 없음')+'</p><p>가이드: '+esc(x.record.backend_guide_version||'이전 기록 · 확인 불가')+' · 장면 '+(ev.plan?.shots?.length||0)+'개</p><p>생성 전 검사: '+(x.record.preflight?.passed?'통과':'미통과 또는 확인 불가')+'</p>'+((ev.plan?.shots||[]).map((s,i)=>'<details><summary>장면 '+(i+1)+' · '+esc(s.caption||'')+'</summary><p>'+esc(s.scene||'')+'</p><p>'+esc(s.video_prompt||'')+'</p></details>').join(''));document.getElementById('storyRecordContent').textContent=JSON.stringify(x.record,null,2);document.getElementById('storyRecordPanel').open=true;}catch(e){toast(e.message,true);}});
    document.getElementById('storyMetricsTable').innerHTML='<tr><th>후보 · 플랫폼</th><th>기준</th><th>실제 경과</th><th>조회수</th><th>상태</th></tr>'+d.metrics.map(m=>{const p=d.posts.find(p=>p.id===m.post_id);return `<tr><td>${esc(p?.candidate_id?.slice(0,8)||'-')} · ${esc(p?.platform||'-')}</td><td>${m.checkpoint}시간</td><td>${Number(m.elapsed_hours).toFixed(1)}시간</td><td>${m.status==='ok'?esc(String(m.metrics.views??'미제공')):'—'}</td><td>${m.status==='ok'?'수집 완료':'조회 불가 · 권한/연결 확인 ('+esc(m.error_code||'unknown')+')'}</td></tr>`;}).join('');
    if(!d.metrics.length)document.getElementById('storyMetricsTable').innerHTML='<tr><td>게시 후 24시간부터 성과를 수집합니다. 아직 관측값이 없습니다.</td></tr>';
  }catch(e){button.disabled=true;document.getElementById('storyControlStatus').textContent='설정을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.';toast(e.message,true);}
}
