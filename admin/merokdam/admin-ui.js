// Display-only enhancement. Reads existing cache; never fetches or writes data.
(() => {
  const root = document.getElementById('overviewSummary');
  function card(label, value, detail, planned = false) {
    const el = document.createElement('div');
    el.className = 'summary-card' + (planned ? ' planned' : '');
    for (const [tag, text, cls] of [['span', label, 'label'], ['strong', value, ''], ['small', detail, '']]) {
      const child = document.createElement(tag); child.textContent = text; child.className = cls; el.append(child);
    }
    return el;
  }
  function render() {
    const o = cache.overview;
    const n = v => typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('ko-KR') : '—';
    const policy = (key, fallback) => {
      const entry = cache.policies.find(p => p.key === key);
      const value = entry ? Number(entry.value) : fallback;
      return Number.isFinite(value) ? value : null;
    };
    const tiers = o?.users?.tiers;
    const priceP = policy('price.purple_month_krw', 9900), priceG = policy('price.gold_month_krw', 19800);
    const revenue = tiers && priceP !== null && priceG !== null ? (tiers.purple ?? 0) * priceP + (tiers.gold ?? 0) * priceG : null;
    const costs = [policy('cost.per_diary_krw', 30), policy('cost.per_image_krw', 80), policy('cost.per_autobio_krw', 200)];
    const cost = o && costs.every(v => v !== null) ? (o.diaries.d30-o.diaries.manual)*costs[0]+o.diaries.with_image*costs[1]+o.autobiographies_30d*costs[2] : null;
    root.replaceChildren(
      card('전체 회원', n(o?.users?.total), o ? '오늘 활성 '+n(o.active.d1)+'명 · 최근 7일 '+n(o.active.d7)+'명' : '기존 통계를 불러오면 표시됩니다.'),
      card('신규 회원 · 오늘', n(o?.users?.new_1d), '최근 7일 '+n(o?.users?.new_7d)+'명'),
      card('작성된 일기 · 오늘', n(o?.diaries?.d1), '최근 7일 '+n(o?.diaries?.d7)+'편'),
      card('가정 월매출', revenue === null ? '—' : '₩'+n(revenue), '등급별 인원 × 월가격. 무료 체험 포함 · 실제 결제 매출 아님'),
      card('추정 AI 비용 · 최근 30일', cost === null ? '—' : '₩'+n(cost), '기존 설정 단가 기준 · 서버 비용 및 실제 청구액 미포함'),
      card('마케팅', '연동 예정', '유입·전환·획득 비용을 연결할 자리입니다.', true)
    );
  }
  function title() {
    const active = document.querySelector('#tabs .tab.on');
    document.getElementById('pageTitle').textContent = active?.childNodes[0]?.textContent || '종합 현황';
    document.querySelectorAll('#tabs .tab').forEach(el => el.setAttribute('aria-current', el.classList.contains('on') ? 'page' : 'false'));
  }
  new MutationObserver(render).observe(document.getElementById('todayStats'), {childList:true,subtree:true});
  new MutationObserver(title).observe(document.getElementById('tabs'), {attributes:true,attributeFilter:['class'],subtree:true});
  // Policy loading is asynchronous. Refresh display once its existing request settles into cache.
  let previous = '';
  const update = () => { const value = JSON.stringify(cache.policies); if(value!==previous){previous=value;render();} };
  const timer = setInterval(update, 2000);
  window.addEventListener('pagehide', () => clearInterval(timer), {once:true});
  render(); title();
})();
