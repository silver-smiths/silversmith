// Special items: administrator-only gateway, immutable image versions.
let ciRows=[], ciEditing=null, ciImage=null;
function ciKstInput(s){return s?new Date(Date.parse(s)+9*3600000).toISOString().slice(0,16):'';}
function ciDate(s){return s?new Date(s+':00+09:00').toISOString():null;}
function ciUrl(p){return sb.storage.from('character-items').getPublicUrl(p).data.publicUrl;}
function ciEdit(id){
 ciEditing=ciRows.find(r=>r.id===id)||null;ciImage=ciEditing?{image_path:ciEditing.image_path,image_version:ciEditing.image_version}:null;
 const r=ciEditing||{id:'',label:'',prompt:'',sort_order:ciRows.length,visible:false};
 $('ciId').value=r.id;$('ciId').disabled=!!ciEditing;$('ciLabel').value=r.label;$('ciPrompt').value=r.prompt;$('ciOrder').value=r.sort_order;$('ciVisible').checked=r.visible;
 $('ciStart').value=ciKstInput(r.starts_at);$('ciEnd').value=ciKstInput(r.ends_at);$('ciFile').value='';$('ciStatus').textContent=ciEditing?'수정 후 저장하면 적용됩니다.':'이미지 등록 후 저장해 주세요.';
 ciPreview(ciImage?ciUrl(ciImage.image_path):'');$('ciEditor').scrollIntoView({block:'nearest'});
}
function ciPreview(url){for(const id of ['ciLight','ciDark']){$(id).replaceChildren();if(url){const im=new Image();im.src=url;im.width=64;im.height=64;im.style.objectFit='contain';im.alt=$('ciLabel').value||'아이템 미리보기';$(id).append(im);}const t=document.createElement('span');t.textContent=$('ciLabel').value||'아이템 이름';$(id).append(t);}}
async function ciLoad(){
 try{const r=await api('character_items.list');ciRows=r.rows||[];
 $('ciList').innerHTML=ciRows.map(r=>`<button class="ghost ci-card" data-ci="${esc(r.id)}"><img src="${esc(ciUrl(r.image_path))}" width="64" height="64" alt=""><b>${esc(r.label)}</b><small>${r.visible?'공개':'숨김'} · 순서 ${Number(r.sort_order)}${r.starts_at||r.ends_at?' · 기간 설정':''}</small></button>`).join('')||'<p>등록된 아이템이 없습니다.</p>';
 $('ciList').querySelectorAll('[data-ci]').forEach(el=>el.onclick=()=>ciEdit(el.dataset.ci));
 }catch(e){$('ciStatus').textContent=e.message;toast(e.message,true);}
}
async function ciUpload(){
 const file=$('ciFile').files[0],id=$('ciId').value.trim();
 if(!/^[a-z][a-z0-9_]{0,47}$/.test(id))return toast('식별자는 영문 소문자로 시작하고 숫자·밑줄만 사용할 수 있습니다.',true);
 if(!file||file.type!=='image/png'||file.size>8*1024*1024)return toast('8MB 이하 투명 PNG를 선택해 주세요.',true);
 $('ciSave').disabled=true;$('ciFile').disabled=true;
 try{
 const bitmap=await createImageBitmap(file);if(bitmap.width>4096||bitmap.height>4096){bitmap.close();throw Error('4096px 이하 이미지가 필요합니다.');}
 const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();
 const pix=ctx.getImageData(0,0,canvas.width,canvas.height).data;let x0=canvas.width,y0=canvas.height,x1=-1,y1=-1,clear=0;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const a=pix[(y*canvas.width+x)*4+3];if(a<16)clear++;if(a>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
 if(clear<canvas.width||x1<x0)throw Error('배경을 제거한 투명 PNG를 사용해 주세요.');
 const out=document.createElement('canvas');out.width=out.height=192;const oc=out.getContext('2d');const w=x1-x0+1,h=y1-y0+1,scale=168/Math.max(w,h);oc.drawImage(canvas,x0,y0,w,h,(192-w*scale)/2,(192-h*scale)/2,w*scale,h*scale);
 const png=out.toDataURL('image/png').split(',')[1];
 ciImage=await api('character_items.upload',{id,png});ciPreview(ciUrl(ciImage.image_path));$('ciStatus').textContent='이미지 준비 완료. 저장해야 앱에 반영됩니다.';
 }catch(e){$('ciStatus').textContent=e.message;toast(e.message,true);}finally{$('ciSave').disabled=false;$('ciFile').disabled=false;}
}
async function ciSave(){
 if(!ciImage)return toast('이미지를 먼저 등록해 주세요.',true);
 $('ciSave').disabled=true;
 try{const item={id:$('ciId').value.trim(),label:$('ciLabel').value.trim(),prompt:$('ciPrompt').value.trim(),sort_order:Number($('ciOrder').value),visible:$('ciVisible').checked,starts_at:ciDate($('ciStart').value),ends_at:ciDate($('ciEnd').value),...ciImage};
 const r=await api('character_items.save',{item,expected_revision:ciEditing?.revision||null});await ciLoad();ciEdit(r.item.id);$('ciStatus').textContent='저장 완료. 새 앱에서 캐릭터 화면을 다시 열면 반영됩니다. 목록 확인 간격은 5분입니다.';toast('아이템 저장 완료');
 }catch(e){$('ciStatus').textContent=e.message;toast(e.message,true);}finally{$('ciSave').disabled=false;}
}
(() => {
 const button=document.createElement('button');button.className='tab';button.type='button';button.dataset.t='characteritems';button.textContent='특별 아이템';document.querySelector('[data-t="jev"]').after(button);
 const panel=document.createElement('section');panel.id='t-characteritems';panel.className='hidden';panel.innerHTML=`
 <div class="card"><h2>특별 아이템</h2><p>아이템을 추가하거나 계절별로 노출하세요. 숨겨도 기존에 선택한 사용자는 계속 사용합니다.</p><div class="row"><button id="ciNew" class="pri">새 아이템</button><button id="ciReload" class="ghost">새로고침</button></div><div id="ciList" class="ci-list"></div></div>
 <div id="ciEditor" class="card"><h3>아이템 등록·수정</h3><div class="ci-fields">
 <label>식별자(최초 등록 후 고정)<input id="ciId" maxlength="48" placeholder="winter_mittens"></label>
 <label>표시 이름(12자 이내)<input id="ciLabel" maxlength="12" placeholder="장갑"></label>
 <label>노출 순서(작은 숫자가 먼저)<input id="ciOrder" type="number" min="0" max="10000" value="0"></label>
 <label>이미지(투명 PNG)<input id="ciFile" type="file" accept="image/png"></label>
 <label>시작 시각(한국 시간, 비워두면 즉시)<input id="ciStart" type="datetime-local"></label>
 <label>종료 시각(한국 시간, 비워두면 계속)<input id="ciEnd" type="datetime-local"></label></div>
 <label style="display:block;margin:16px 0">그림 생성용 설명<textarea id="ciPrompt" maxlength="600" rows="3" placeholder="연한 라벤더색 벙어리장갑을 양손에 착용한다."></textarea></label>
 <label><input id="ciVisible" type="checkbox"> 선택 목록에 공개</label><p class="muted">미리보기는 앱과 같은 64px입니다. 투명 PNG를 192px로 줄이고 여백을 맞춥니다. 미공개로 저장한 뒤 공개할 수 있습니다.</p>
 <div class="ci-previews"><div id="ciLight"></div><div id="ciDark"></div></div><p id="ciStatus" role="status"></p><button id="ciSave" class="pri">저장</button></div>`;
 document.getElementById('t-today').parentNode.append(panel);TABS.push('characteritems');
 const prior=openTab;openTab=function(name,force){prior(name,force);if(name==='characteritems')ciLoad();};
 $('ciNew').onclick=()=>ciEdit(null);$('ciReload').onclick=ciLoad;$('ciFile').onchange=ciUpload;$('ciSave').onclick=ciSave;$('ciLabel').oninput=()=>ciPreview(ciImage?ciUrl(ciImage.image_path):'');
 const style=document.createElement('style');style.textContent='.ci-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-top:20px}.ci-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px}.ci-card img{object-fit:contain}.ci-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.ci-fields label{display:flex;flex-direction:column;gap:8px}.ci-previews{display:flex;gap:16px}.ci-previews>div{display:flex;flex-direction:column;align-items:center;gap:8px;width:120px;padding:18px;border-radius:24px}#ciLight{background:#fff9f3;color:#514267}#ciDark{background:#302641;color:#e9dff4}.ci-previews span{font-size:16px}';document.head.append(style);
})();
