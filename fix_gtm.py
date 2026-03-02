import os
import glob
import re

base_dir = '/Users/jeongheeyoon/Desktop/developer/Antigravity/silver-smiths.com'

# 1. GTM 코드 (Head용) 추출
with open(os.path.join(base_dir, 'index.html'), 'r', encoding='utf-8') as f:
    idx_content = f.read()

head_gtm_match = re.search(r'<!-- Google Tag Manager -->.*?<!-- End Google Tag Manager -->', idx_content, re.DOTALL)
head_gtm = head_gtm_match.group(0) if head_gtm_match else ''

html_files = glob.glob(os.path.join(base_dir, '**/*.html'), recursive=True)

# index.html 의 올바른 헤더 구조 추출 (nav 부분만)
nav_match = re.search(r'<nav id="main-nav" aria-label="주 내비게이션">.*?</nav>', idx_content, re.DOTALL)
correct_nav = nav_match.group(0) if nav_match else ''

for path in html_files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    rel_path = os.path.relpath(path, base_dir)
    depth = rel_path.count('/')
    prefix = '../' * depth if depth > 0 else ''

    # GTM 삽입
    if '<!-- Google Tag Manager -->' not in content and head_gtm:
        content = re.sub(r'<head>', f'<head>\n  {head_gtm}\n', content, count=1)

    # 문의하기, 스토리 등 메뉴 헤더 통일 (nav 부분 교체)
    if 'index.html' not in rel_path and correct_nav:
        # 기존 파일의 nav 영역을 통째로 교체하되, prefix 적용
        # 올바른 nav에서 href="/" 등의 부분을 prefix에 맞게 치환
        page_nav = correct_nav
        if depth > 0:
            index_target = prefix + 'index.html'
            page_nav = re.sub(r'href="/(?!#)([^"]*)"', lambda m: f'href="{prefix}{m.group(1)}"', page_nav)
            page_nav = re.sub(r'href="/#([^"]*)"', f'href="{index_target}#\\1"', page_nav)
            page_nav = page_nav.replace('href="/"', f'href="{index_target}"')
        else:
            page_nav = re.sub(r'href="/([^"]*)"', r'href="\1"', page_nav)
            page_nav = page_nav.replace('href="/"', 'href="index.html"')
            
        content = re.sub(r'<nav id="main-nav".*?</nav>', page_nav, content, flags=re.DOTALL)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# main.js 에서 모바일 오버레이 메뉴 내부의 a 태그 클릭 시 모바일 메뉴가 닫히는 로직이 모든 a 태그에 걸려있는데,
# 이것을 class="nav-mobile-title" 로 열고 닫기가 전혀 없었으므로 작동하지 않음
# CSS 에 클릭으로 여닫는 기능이 없으므로 JS에 추가 혹은 구조 수정 필요
# 사용자 요청: 모바일 메뉴가 작동하지 않음 → 기존 아코디언 관련 로직을 지웠으나 a 태그 클릭 시 창 닫히는 기능 때문에 이동 불가 혹은 아무일 안일어남 방지
js_path = os.path.join(base_dir, 'js', 'main.js')
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

# ".nav-overlay a" 이 클릭되면 무조건 닫히는 로직을 수정 (href가 #에 불과하면 안 닫히게 하거나 등등)
# 이번에 구조를 a 태그로 모두 만들었으므로 href가 앵커나 다른곳을 향하면 닫히고 이동하게 함.
if 'Close on overlay link click' in js_content:
    pass # 이미 있음

print("GTM apply and Header sync done.")
