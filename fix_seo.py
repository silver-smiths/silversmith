import os
import re

files_to_fix = {
    'contact.html': ['hreflang', 'og_twitter', 'json_ld'],
    'story.html': ['hreflang', 'og_twitter', 'json_ld'],
    'post/202502/ggeujag-activity.html': ['hreflang', 'twitter_only'],
    'agency/sms-lms-mms-rcs.html': ['hreflang'],
    'agency/search-display-ads.html': ['hreflang'],
}

for fname, fixes in files_to_fix.items():
    if not os.path.exists(fname): continue
    
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
        
    url_path = fname if fname != 'index.html' else ''
    full_url = f"https://silver-smiths.com/{url_path}"
    
    # 1. hreflang
    if 'hreflang' in fixes:
        if '<link rel="canonical"' in content and 'hreflang="ko"' not in content:
            hreflang_tags = f'\n    <link rel="alternate" hreflang="ko" href="{full_url}" />\n    <link rel="alternate" hreflang="x-default" href="{full_url}" />'
            content = re.sub(r'(<link rel="canonical" href="[^"]+" />)', r'\1' + hreflang_tags, content)
            
    # 2. og_twitter (missing og:image, twitter:card, twitter:title)
    if 'og_twitter' in fixes:
        if 'twitter:card' not in content:
            twitter_tags = f"""
    <meta property="og:image" content="https://silver-smiths.com/images/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Silversmith 대표 이미지" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:site_name" content="Silversmith" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Silversmith" />
    <meta name="twitter:image" content="https://silver-smiths.com/images/og-image.png" />"""
            content = re.sub(r'(<meta property="og:description"[^>]+>)', r'\1' + twitter_tags, content)
            
    if 'twitter_only' in fixes:
        if 'twitter:card' not in content:
            twitter_tags = f"""
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Silversmith" />
    <meta name="twitter:image" content="https://silver-smiths.com/images/og-image.png" />"""
            content = re.sub(r'(<meta property="og:site_name"[^>]+>)', r'\1' + twitter_tags, content)

    # 3. JSON-LD
    if 'json_ld' in fixes:
        if 'application/ld+json' not in content:
            name_match = re.search(r'<title>(.*?)</title>', content)
            name = name_match.group(1) if name_match else "Silversmith"
            desc_match = re.search(r'<meta name="description"[\s\n]*content="(.*?)"', content, re.IGNORECASE)
            desc = desc_match.group(1) if desc_match else "Silversmith"
            
            json_ld = f"""
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@graph": [
        {{
          "@type": "WebPage",
          "@id": "{full_url}#webpage",
          "url": "{full_url}",
          "name": "{name}",
          "description": "{desc}",
          "isPartOf": {{ "@id": "https://silver-smiths.com/#website" }},
          "about": {{ "@id": "https://silver-smiths.com/#org" }}
        }}
      ]
    }}
    </script>
"""
            content = re.sub(r'(<title>.*?</title>)', r'\1\n' + json_ld, content)

    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)

print("SEO tags injected.")
