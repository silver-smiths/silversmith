import os
import glob
import re

base_dir = '/Users/jeongheeyoon/Desktop/developer/Antigravity/silver-smiths.com'
html_files = glob.glob(os.path.join(base_dir, '**/*.html'), recursive=True)

for path in html_files:
    rel_path = os.path.relpath(path, base_dir)
    depth = rel_path.count('/')
    prefix = '../' * depth if depth > 0 else ''
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. CSS 파일 참조에서 .min.css 제거 (로컬 편집 원활화)
    content = content.replace('style.min.css', 'style.css')
    content = content.replace('pages.min.css', 'pages.css')
    
    # 2. 로컬에서 링크 이동을 위해 /index.html# 컨벤션 등으로 통일
    # 먼저 루트 링크들을 복구
    if depth > 0:
        index_target = prefix + 'index.html'
        # href="/" -> href="../index.html"
        content = re.sub(r'href="/(?!#)([^"]*)"', lambda m: f'href="{prefix}{m.group(1)}"', content)
        content = re.sub(r'href="/#([^"]*)"', f'href="{index_target}#\\1"', content)
        content = content.replace('href="/"', f'href="{index_target}"')
    else:
        # index.html 안에서
        content = re.sub(r'href="/([^"]*)"', r'href="\1"', content)
        content = content.replace('href="/"', 'href="index.html"')
    
    # 혹시 href="" 빈 값 처리
    content = content.replace('href=""', 'href="#"')

    # 3. body 태그에 home-page 클래스 추가 (index.html 한정)
    if depth == 0 and 'index.html' in rel_path:
        content = content.replace('<body>', '<body class="home-page">')

    # 4. 모바일 메뉴 아코디언 관련 디자인 단일화 (아코디언 없이 계층형 구조로 단순화하여 기존 UI와 일치시킴)
    mobile_nav_new = f'''
    <div class="nav-overlay" id="nav-overlay" role="dialog" aria-label="모바일 메뉴">
        <div class="nav-mobile-group">
            <a href="{prefix if depth>0 else ''}index.html#consulting" class="nav-mobile-title">컨설팅</a>
            <a href="{prefix}consulting/seo-aeo-geo.html" class="nav-mobile-sub">- SEO / AEO / GEO</a>
            <a href="{prefix}consulting/ax-rpa.html" class="nav-mobile-sub">- AX / RPA</a>
            <a href="{prefix}consulting/ad-monetization.html" class="nav-mobile-sub">- Ad Monetization</a>
        </div>
        <div class="nav-mobile-group">
            <a href="{prefix if depth>0 else ''}index.html#service" class="nav-mobile-title">에이전시</a>
            <a href="{prefix}agency/search-display-ads.html" class="nav-mobile-sub">- SA/DA 광고</a>
            <a href="{prefix}agency/sms-lms-mms-rcs.html" class="nav-mobile-sub">- SKT 문자광고</a>
        </div>
        <div class="nav-mobile-group">
            <a href="{prefix if depth>0 else ''}index.html#projects" class="nav-mobile-title">프로젝트</a>
            <a href="{prefix}project/ggeujag.html" class="nav-mobile-sub">- 그작그작</a>
            <a href="{prefix}project/blifeing.html" class="nav-mobile-sub">- Blifeing</a>
        </div>
        <a href="{prefix}story.html" style="margin-top:0.5rem">회사 스토리</a>
        <a href="{prefix}contact.html" class="btn-nav-mobile" style="margin-top:1rem">문의하기</a>
    </div>
    '''
    
    # nav-overlay 부분을 문자열 검색으로 교체 (정규식 회피)
    start_idx = content.find('<div class="nav-overlay" id="nav-overlay"')
    if start_idx != -1:
        end_idx = content.find('</div>', start_idx)
        # </div>가 중첩되어 있을 수 있으므로 <main> 태그를 찾아서 그 전까지 교체
        main_idx = content.find('<main>', start_idx)
        if main_idx != -1:
            content = content[:start_idx] + mobile_nav_new + content[main_idx:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# style.css 제일 뒤에 서브페이지 스크롤 복구 로직 + 모바일 메뉴 새로 추가된 클래스 CSS 추가
css_path = os.path.join(base_dir, 'css', 'style.css')
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

if '/* ========================================================' not in css_content:
    with open(css_path, 'a', encoding='utf-8') as f:
        f.write('''\n
/* ========================================================
   서브페이지 스크롤 복구 및 신규 모바일 네비게이션 스타일 
   ======================================================== */
body:not(.home-page) {
    overflow-y: auto !important;
    height: auto !important;
}
html:not(.home-page) {
    overflow-y: auto !important;
    height: auto !important;
}

.nav-mobile-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
}
.nav-mobile-title {
    color: var(--clr-text);
    font-size: 1.3rem;
    font-weight: 600;
    padding: 0.5rem 2rem;
}
.nav-mobile-sub {
    color: var(--clr-text-muted) !important;
    font-size: 1.05rem !important;
    font-weight: 500 !important;
    padding: 0.2rem 2rem !important;
}
.nav-mobile-sub:hover {
    color: var(--clr-text) !important;
}
''')

# main.js 아코디언 스크립트 삭제
js_path = os.path.join(base_dir, 'js', 'main.js')
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

if '// Accordion toggle' in js_content:
    start_acc = js_content.find('// Accordion toggle')
    end_acc = js_content.find('// Close on overlay link', start_acc)
    if start_acc != -1 and end_acc != -1:
        js_content = js_content[:start_acc] + js_content[end_acc:]
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js_content)

print("HTML paths, Mobile UI and CSS overflow fix applied to all files.")
