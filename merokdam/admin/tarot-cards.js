// 타로 카드 관리 (2026-09-30) — 번호별 이미지 등록(jpg·png·webp), 이름·키워드·미록담의 시선 편집, 마이너 카드 사용 여부.
// 특별 아이템(character-items.js)과 같은 방식: 어드민 게이트웨이(tarot_cards.*)만 쓰고, 이미지는 버전별 불변 경로라 앱 캐시가 그대로 유지된다.
let tcRows=[], tcEditing=null, tcImage=null, tcMinor=true;
const TC_MAX_SIDE=1200; // 앱 카드 표시 168×280(3x 이하) — 이보다 크면 줄여서 보낸다
function tcUrl(p){return sb.storage.from('tarot-cards').getPublicUrl(p).data.publicUrl;}
function tcLabel(r){return `${r.number}. ${r.name_ko.replace(/^[0IVX]+\.\s*/,'')}`;}
function tcHelp(t){return `<span class="help" data-h="${esc(t)}">?</span>`;}
async function tcLoad(){
 try{
  const [r,p]=await Promise.all([api('tarot_cards.list'),api('policies.list')]);
  tcRows=r.rows||[];
  const minor=(p.rows||[]).find(x=>x.key==='tarot.minor_enabled');tcMinor=minor?minor.value!==false:true;$('tcMinor').checked=tcMinor;
  $('tcMinorState').textContent=tcMinor?'마이너 56장까지 78장을 펼칩니다.':'메이저 22장만 펼칩니다.';
  const grid=(rows,title)=>`<h4 class="tc-group">${title} <small>${rows.length}장 · 이미지 등록 ${rows.filter(x=>x.image_path).length}장</small></h4><div class="tc-list">`+rows.map(x=>`<button class="ghost tc-card${tcEditing&&tcEditing.id===x.id?' on':''}" data-tc="${esc(x.id)}">${x.image_path?`<img src="${esc(tcUrl(x.image_path))}" alt="">`:'<div class="tc-ph">앱 기본<br>그림</div>'}<b>${esc(tcLabel(x))}</b><small>${x.guarded?'보호 카드':''}</small></button>`).join('')+'</div>';
  $('tcList').innerHTML=grid(tcRows.filter(x=>x.arcana==='major'),'메이저 아르카나')+grid(tcRows.filter(x=>x.arcana==='minor'),'마이너 아르카나');
  $('tcList').querySelectorAll('[data-tc]').forEach(el=>el.onclick=()=>tcEdit(el.dataset.tc));
  if(tcEditing)tcEdit(tcEditing.id);
 }catch(e){$('tcStatus').textContent=e.message;toast(e.message,true);}
}
function tcEdit(id){
 tcEditing=tcRows.find(r=>r.id===id)||null;if(!tcEditing)return;
 tcImage=tcEditing.image_path?{image_path:tcEditing.image_path,image_version:tcEditing.image_version}:null;
 const r=tcEditing;
 $('tcTitle').textContent=`${tcLabel(r)} · ${r.arcana==='major'?'메이저':'마이너'} · ${r.name_en}`;
 for(const k of ['name_ko','name_en','keywords_ko','keywords_en','insight_ko','insight_en'])$('tc_'+k).value=r[k]||'';
 $('tcGuarded').checked=!!r.guarded;$('tcFile').value='';
 tcPreview(tcImage?tcUrl(tcImage.image_path):'');
 $('tcStatus').textContent=r.image_path?`이미지 버전 ${r.image_version.slice(0,8)} · 마지막 수정 ${r.updated_by} (${new Date(r.updated_at).toLocaleString('ko-KR')})`:'앱에 들어 있는 기본 그림을 쓰고 있습니다. 새 이미지를 올리면 이 카드만 바뀝니다.';
 $('tcList').querySelectorAll('.tc-card').forEach(el=>el.classList.toggle('on',el.dataset.tc===id));
 $('tcEditor').classList.remove('hidden');$('tcEditor').scrollIntoView({block:'nearest'});
}
function tcPreview(url){const box=$('tcPreview');box.replaceChildren();if(!url){const d=document.createElement('div');d.className='tc-ph big';d.textContent='앱 기본 그림 사용 중';box.append(d);return;}const im=new Image();im.src=url;im.alt='카드 미리보기';box.append(im);}
async function tcUpload(){
 const file=$('tcFile').files[0];if(!tcEditing||!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)return toast('12MB 이하 JPG·PNG·WebP 를 선택해 주세요.',true);
 $('tcSave').disabled=true;$('tcFile').disabled=true;
 try{
  let blob=file;
  const bitmap=await createImageBitmap(file);
  const long=Math.max(bitmap.width,bitmap.height);
  // 크거나 1.5MB 를 넘으면 줄여서 WebP 로. 세로 카드 비율(약 1:1.68)이 아니면 알려만 준다(자르지 않는다).
  const ratio=bitmap.height/bitmap.width;
  if(ratio<1.5||ratio>1.85)toast(`카드 비율이 ${ratio.toFixed(2)} 입니다. 앱은 1.67(168×280) 비율로 잘라 보여 줍니다.`);
  if(long>TC_MAX_SIDE||file.size>1.4*1024*1024||file.type==='image/jpeg'&&file.size>700*1024){
   const s=Math.min(1,TC_MAX_SIDE/long),c=document.createElement('canvas');c.width=Math.round(bitmap.width*s);c.height=Math.round(bitmap.height*s);
   c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);
   blob=await new Promise(res=>c.toBlob(res,'image/webp',0.86));
   if(!blob||blob.size>1.4*1024*1024)blob=await new Promise(res=>c.toBlob(res,'image/jpeg',0.82));
  }
  bitmap.close();
  if(!blob||blob.size>1.5*1024*1024)throw Error('줄여도 1.5MB 를 넘습니다. 더 작은 이미지를 사용해 주세요.');
  const data=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result.split(',')[1]);fr.onerror=rej;fr.readAsDataURL(blob);});
  tcImage=await api('tarot_cards.upload',{id:tcEditing.id,data});
  tcPreview(tcUrl(tcImage.image_path));$('tcStatus').textContent=`이미지 준비 완료(${Math.round(blob.size/1024)}KB). 저장해야 앱에 반영됩니다.`;
 }catch(e){$('tcStatus').textContent=e.message;toast(e.message,true);}finally{$('tcSave').disabled=false;$('tcFile').disabled=false;}
}
function tcResetImage(){if(!tcEditing)return;tcImage=null;tcPreview('');$('tcStatus').textContent='저장하면 앱 기본 그림으로 돌아갑니다(올린 파일은 지우지 않습니다).';}
async function tcSave(){
 if(!tcEditing)return;$('tcSave').disabled=true;
 try{
  const card={id:tcEditing.id,guarded:$('tcGuarded').checked,image_path:tcImage?tcImage.image_path:null,image_version:tcImage?tcImage.image_version:null};
  for(const k of ['name_ko','name_en','keywords_ko','keywords_en','insight_ko','insight_en'])card[k]=$('tc_'+k).value.trim();
  const r=await api('tarot_cards.save',{card,expected_revision:tcEditing.revision});
  const i=tcRows.findIndex(x=>x.id===r.card.id);if(i>=0)tcRows[i]=r.card;tcEditing=r.card;
  await tcLoad();$('tcStatus').textContent='저장 완료. 앱은 다음 실행(또는 씨앗 화면 진입) 때 목록을 다시 확인하고, 바뀐 카드 그림만 내려받습니다.';toast('카드 저장 완료');
 }catch(e){$('tcStatus').textContent=e.message;toast(e.message,true);if(/다른 변경/.test(e.message))tcLoad();}finally{$('tcSave').disabled=false;}
}
async function tcSetMinor(on){
 $('tcMinor').disabled=true;
 try{await api('policies.set',{key:'tarot.minor_enabled',value:!!on});tcMinor=!!on;$('tcMinorState').textContent=on?'마이너 56장까지 78장을 펼칩니다.':'메이저 22장만 펼칩니다.';toast(on?'마이너 카드 사용':'메이저 카드만 사용');}
 catch(e){$('tcMinor').checked=tcMinor;toast(e.message,true);}finally{$('tcMinor').disabled=false;}
}
(() => {
 const button=document.createElement('button');button.className='tab';button.type='button';button.dataset.t='tarotcards';button.textContent='타로 카드';
 (document.querySelector('[data-t="characteritems"]')||document.querySelector('[data-t="jev"]')).after(button);
 const panel=document.createElement('section');panel.id='t-tarotcards';panel.className='hidden';panel.innerHTML=`
 <div class="card"><h2>타로 카드 ${tcHelp('일기 재료로 뽑는 타로 78장의 그림과 문구를 관리합니다. 바꾸면 앱은 다음 실행 때(또는 씨앗 화면을 열 때) 목록을 확인해 바뀐 카드만 내려받습니다. 이미 뽑아 저장된 일기의 카드 문구는 그대로입니다.')}</h2>
 <label class="tc-minor"><input id="tcMinor" type="checkbox"> 마이너 카드 사용(56장 전체) ${tcHelp('끄면 앱이 메이저 22장만 펼칩니다. 이미 마이너 카드로 만들어진 일기는 그대로 보입니다. 앱 다음 실행 때 반영. 기본값: 사용.')}<span id="tcMinorState" class="muted"></span></label>
 <div class="row"><button id="tcReload" class="ghost">새로고침</button></div><div id="tcList"></div></div>
 <div id="tcEditor" class="card hidden"><h3 id="tcTitle">카드</h3>
 <div class="tc-edit"><div class="tc-imgcol"><div id="tcPreview" class="tc-preview"></div>
  <label>이미지 파일 ${tcHelp('JPG·PNG·WebP. 세로 카드(가로:세로 ≈ 1:1.67, 앱 표시 168×280). 긴 쪽 1200px 이하로 줄여 저장합니다. 올린 뒤 저장을 눌러야 적용됩니다. 그림은 카드별 새 버전으로 저장돼 다른 카드·이전 캐시에 영향이 없습니다.')}<input id="tcFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
  <button id="tcResetImage" class="ghost">앱 기본 그림으로</button></div>
 <div class="tc-fields">
  <label>카드 이름(한국어) ${tcHelp('카드 뒤집힘·일기 상단 “오늘의 카드 — …”에 표시. 예: “XVIII. 달 (The Moon)”. 60자 이내.')}<input id="tc_name_ko" maxlength="60"></label>
  <label>카드 이름(영어)<input id="tc_name_en" maxlength="60"></label>
  <label>키워드(한국어) ${tcHelp('카드 아래 한 줄. 가운뎃점(·)으로 구분. 일기 생성 프롬프트에도 전달됩니다. 120자 이내.')}<input id="tc_keywords_ko" maxlength="120"></label>
  <label>키워드(영어)<input id="tc_keywords_en" maxlength="120"></label>
  <label>미록담의 시선(한국어) ${tcHelp('카드별 자체 해석 한 줄. 모델이 카드를 임의로 해석하지 않도록 이 문장을 기준으로 씁니다. 200자 이내.')}<textarea id="tc_insight_ko" rows="2" maxlength="200"></textarea></label>
  <label>미록담의 시선(영어)<textarea id="tc_insight_en" rows="2" maxlength="200"></textarea></label>
  <label class="tc-check"><input id="tcGuarded" type="checkbox"> 보호 카드 ${tcHelp('죽음·악마·탑처럼 어두운 도상. 켜면 모델이 카드 의미를 스스로 풀지 못하고 “미록담의 시선”만 기준으로 씁니다.')}</label>
 </div></div>
 <p id="tcStatus" role="status" class="muted"></p><button id="tcSave" class="pri">저장</button></div>`;
 document.getElementById('t-today').parentNode.append(panel);TABS.push('tarotcards');
 const prior=openTab;openTab=function(name,force){prior(name,force);if(name==='tarotcards')tcLoad();};
 $('tcReload').onclick=tcLoad;$('tcFile').onchange=tcUpload;$('tcSave').onclick=tcSave;$('tcResetImage').onclick=tcResetImage;$('tcMinor').onchange=e=>tcSetMinor(e.target.checked);
 const style=document.createElement('style');style.textContent='.tc-group{margin:18px 0 8px}.tc-group small{color:#7a6d8a;font-weight:500;margin-left:8px}.tc-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}.tc-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;font-size:12px}.tc-card.on{outline:2px solid #4B0082}.tc-card img,.tc-ph{width:72px;height:120px;border-radius:8px;object-fit:cover;background:#f1eaf6}.tc-ph{display:flex;align-items:center;justify-content:center;text-align:center;color:#7a6d8a;font-size:11px;line-height:1.4}.tc-ph.big{width:168px;height:280px;font-size:13px}.tc-edit{display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start}.tc-imgcol{display:flex;flex-direction:column;gap:10px}.tc-preview img{width:168px;height:280px;object-fit:cover;border-radius:12px;border:1.5px solid #C9B88A}.tc-fields{display:grid;grid-template-columns:repeat(2,minmax(200px,1fr));gap:12px}.tc-fields label{display:flex;flex-direction:column;gap:6px}.tc-check{flex-direction:row!important;align-items:center;gap:8px!important}.tc-minor{display:flex;align-items:center;gap:8px;margin:8px 0 12px}@media(max-width:720px){.tc-edit,.tc-fields{grid-template-columns:1fr}}';document.head.append(style);
})();
