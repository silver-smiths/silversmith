import os
import re
from glob import glob

def check_seo_rules(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    head_match = re.search(r'<head>(.*?)</head>', content, re.DOTALL | re.IGNORECASE)
    if not head_match:
        return {"error": "No <head> found"}
    head = head_match.group(1)

    issues = []

    # 1. Order of elements check:
    # charset -> viewport -> meta -> OG -> JSON-LD -> GTM -> fonts -> CSS
    
    # Check charset is first (or very close to top of head)
    if not re.search(r'^\s*<meta charset="UTF-8"', head):
        issues.append("charset is not at the top of <head>")

    # Check for presence of key tags
    tags_to_check = {
        'viewport': r'<meta name="viewport"',
        'description': r'<meta name="description"',
        'robots': r'<meta name="robots"',
        'canonical': r'<link rel="canonical"',
        'hreflang': r'<link rel="alternate" hreflang="ko"',
        'og:type': r'<meta property="og:type"',
        'og:url': r'<meta property="og:url"',
        'og:title': r'<meta property="og:title"',
        'og:description': r'<meta property="og:description"',
        'og:image': r'<meta property="og:image"',
        'twitter:card': r'<meta name="twitter:card"',
        'twitter:title': r'<meta name="twitter:title"',
        'title': r'<title>.*?</title>',
        'json-ld': r'<script type="application/ld\+json">',
        'gtm-head': r'<!-- Google Tag Manager -->',
        'fonts': r'<link rel="preconnect" href="https://fonts.googleapis.com"',
        'css-preload': r'<link rel="preload" href="(\.\./)*css/style\.css" as="style"'
    }

    for name, pattern in tags_to_check.items():
        if not re.search(pattern, head, re.DOTALL):
            issues.append(f"Missing {name} in <head>")

    # Check body GTM
    body_match = re.search(r'<body.*?>\s*(<!-- Google Tag Manager \(noscript\) -->)', content, re.DOTALL | re.IGNORECASE)
    if not body_match:
        issues.append("Missing or misordered GTM (noscript) right after <body>")

    # Specifically check if JSON-LD parsing is valid json
    json_ld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', head, re.DOTALL)
    import json
    for block in json_ld_blocks:
        try:
            json.loads(block)
        except Exception as e:
            issues.append(f"Invalid JSON in JSON-LD: {e}")

    return issues

html_files = glob("**/*.html", recursive=True)
all_issues = {}

for f in html_files:
    issues = check_seo_rules(f)
    if issues:
        all_issues[f] = issues

if all_issues:
    print("SEO Rules Issues Found:")
    for f, issues in all_issues.items():
        print(f"\n--- {f} ---")
        for issue in issues:
            print(f"- {issue}")
else:
    print("All SEO Rules passed for all HTML files!")
