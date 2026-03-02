/* =====================================================
   Silversmith main.js — Shared functionality
   SEO·AEO·GEO 최적화 적용 버전
   - debounce 최상단 선언 (hoisting 의존 제거)
   - document.head에 js-enabled 클래스 → no-JS fallback 해제
   - IntersectionObserver 미지원 fallback (구형 크롤러 대응)
   - FAQ ARIA: aria-controls / aria-labelledby 동적 설정 (AEO)
   ===================================================== */

(function () {
  'use strict';

  /* ── Utility: debounce (최상단 배치 — 참조 전 선언 보장) ── */
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ── No-JS fallback 해제: JS 활성 표시 ── */
  // style.css의 :root:not(.js-enabled) .reveal 규칙을 무력화
  document.documentElement.classList.add('js-enabled');

  /* ── 1. Navigation ── */
  const nav = document.getElementById('main-nav');
  const toggle = document.getElementById('nav-toggle');
  const overlay = document.getElementById('nav-overlay');

  // Scroll shadow
  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // Mobile menu
  if (toggle && overlay) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.classList.toggle('open');
      overlay.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on overlay link click
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        overlay.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
    // Close on ESC
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        toggle.classList.remove('open');
        overlay.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });

    // Mobile Accordion
    document.querySelectorAll('.nav-acc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const isOpen = btn.classList.contains('open');

        // Optionally close other accordions
        document.querySelectorAll('.nav-acc-btn.open').forEach(openBtn => {
          if (openBtn !== btn) {
            openBtn.classList.remove('open');
            openBtn.setAttribute('aria-expanded', 'false');
            if (openBtn.nextElementSibling) {
              openBtn.nextElementSibling.style.maxHeight = null;
            }
          }
        });

        if (!isOpen) {
          btn.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          if (btn.nextElementSibling) {
            btn.nextElementSibling.style.maxHeight = btn.nextElementSibling.scrollHeight + 'px';
          }
        } else {
          btn.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          if (btn.nextElementSibling) {
            btn.nextElementSibling.style.maxHeight = null;
          }
        }
      });
    });
  }

  /* ── 2. Reveal on scroll ──
     IntersectionObserver 미지원 환경(구형 크롤러, IE 등)에서
     모든 .reveal 요소를 즉시 visible로 처리 → opacity:0 고착 방지.
     SEO: Googlebot fallback 렌더링 대응. ── */
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        }
      }),
      { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: IntersectionObserver 미지원 → 전체 즉시 표시
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  /* ── 3. Lazy loading ── */
  if ('IntersectionObserver' in window) {
    const lazyImgObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
            if (img.dataset.srcset) { img.srcset = img.dataset.srcset; delete img.dataset.srcset; }
            img.classList.add('loaded');
            lazyImgObserver.unobserve(img);
          }
        });
      },
      { rootMargin: '150% 0px' }
    );
    document.querySelectorAll('img[loading="lazy"][data-src]').forEach(img => lazyImgObserver.observe(img));
  }

  /* ── 4. Responsive image sizing ── */
  function applyResponsiveSizes() {
    document.querySelectorAll('img[data-sizes="auto"]').forEach(img => {
      const w = img.offsetWidth || img.parentElement?.offsetWidth || 320;
      img.sizes = `${w}px`;
    });
  }
  window.addEventListener('load', applyResponsiveSizes);
  window.addEventListener('resize', debounce(applyResponsiveSizes, 150), { passive: true });

  /* ── 5. FAQ accordion ──
     AEO(AI 답변 엔진) 최적화:
     - aria-controls / aria-labelledby 동적 설정
     - role="region" 패널에 부여
     → ChatGPT·Gemini·Perplexity가 FAQ 구조를 정확히 파싱·인용 가능 ── */
  document.querySelectorAll('.faq-item').forEach((item, i) => {
    const btn = item.querySelector('.faq-q');
    const panel = item.querySelector('.faq-a');
    if (!btn || !panel) return;

    // 고유 ID 부여
    const btnId = btn.id || `faq-btn-${i}`;
    const panelId = panel.id || `faq-panel-${i}`;
    btn.id = btnId;
    panel.id = panelId;

    // ARIA 연결
    btn.setAttribute('aria-controls', panelId);
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', btnId);

    // 클릭 핸들러
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // 모두 닫기
      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        const openBtn = openItem.querySelector('.faq-q');
        const openPanel = openItem.querySelector('.faq-a');
        if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
        if (openPanel) openPanel.style.maxHeight = '';
      });
      // 선택 항목 열기
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  /* ── 6. Billing toggle (Blifeing page) ── */
  document.querySelectorAll('.billing-toggle .bt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const billing = btn.dataset.billing;
      document.querySelectorAll('.billing-toggle .bt-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-billing-price]').forEach(el => {
        el.classList.toggle('plan-price-hidden', el.dataset.billingPrice !== billing);
      });
    });
  });

  /* ── 7. Active nav link highlight ── */
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a, .nav-overlay a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && currentPath.endsWith(href) && href !== '/') {
      a.classList.add('active');
    }
  });

  /* ── 8. Hero Canvas — Geometric Network Background ──
     메탈릭 실버/블루/골드 노드들이 연결선을 그리며 이동.
     prefers-reduced-motion 환경에서 자동 비활성화.
     ── */
  (function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    // prefers-reduced-motion 대응
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      canvas.style.display = 'none';
      return;
    }

    const ctx = canvas.getContext('2d');
    let W, H, nodes, raf;

    const COLORS = [
      'rgba(200,205,215,',   // silver
      'rgba(61,127,255,',    // blue
      'rgba(200,155,60,',    // gold
      'rgba(148,163,210,',   // muted silver
    ];

    const NODE_COUNT = Math.min(50, Math.floor(window.innerWidth / 24));
    const LINK_DIST = 160;
    const SPEED = 0.3;

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    function createNodes() {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        r: 1 + Math.random() * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Move
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      // Links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.45;
            ctx.beginPath();
            ctx.strokeStyle = nodes[i].color + alpha + ')';
            ctx.lineWidth = 0.75;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Nodes
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + '0.85)';
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(() => { resize(); });
    ro.observe(canvas.parentElement || canvas);
    resize();
    createNodes();
    draw();

    // 페이지 숨김 시 중단
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else { raf = requestAnimationFrame(draw); }
    });
  })();

  /* ── 9. Section Pagination Dots ──
     #scroll-container 기반 IntersectionObserver로 현재 섹션 감지.
     .sn-dot 클릭 시 해당 섹션으로 스크롤.
     ── */
  (function initSectionNav() {
    const scrollContainer = document.getElementById('scroll-container');
    const dots = document.querySelectorAll('.sn-dot');
    const sections = document.querySelectorAll('[data-section]');

    if (!scrollContainer || !dots.length || !sections.length) return;

    // dot 클릭 → 섹션 스크롤
    dots.forEach(dot => {
      dot.addEventListener('click', e => {
        e.preventDefault();
        const targetId = dot.dataset.target;
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // IntersectionObserver로 현재 섹션 감지 → dot 활성화
    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
          }
        });
      }, {
        root: scrollContainer,
        threshold: 0.5,
      });

      sections.forEach(s => sectionObserver.observe(s));
    }

    // nav 스크롤 이벤트 → scrolled 클래스 (기존 window 리스너 보완)
    scrollContainer.addEventListener('scroll', () => {
      const navEl = document.getElementById('main-nav');
      if (navEl) navEl.classList.toggle('scrolled', scrollContainer.scrollTop > 40);
    }, { passive: true });
  })();

})();

