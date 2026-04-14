import os
import re

TEMPLATE_PATH = "components/header_template.html"

try:
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template_content = f.read()
except FileNotFoundError:
    print(f"Error: {TEMPLATE_PATH} not found.")
    exit(1)

# Extract header from template
header_match = re.search(r'<header>.*?</header>', template_content, flags=re.DOTALL)
header_template = header_match.group(0) if header_match else ""

def extract_nav_overlay(content):
    # Match the start of the nav-overlay
    start_match = re.search(r'<div\s+class="nav-overlay"[^>]*>', content)
    if not start_match:
        return ""
    
    start_idx = start_match.start()
    depth = 1
    i = start_match.end()
    
    while depth > 0 and i < len(content):
        next_div_start = content.find('<div', i)
        next_div_end = content.find('</div', i)
        
        if next_div_end == -1:
            break
            
        if next_div_start != -1 and next_div_start < next_div_end:
            depth += 1
            i = next_div_start + 4
        else:
            depth -= 1
            i = next_div_end + 6
            if depth == 0:
                return content[start_idx:i]
    return ""

nav_overlay_template = extract_nav_overlay(template_content)

def process_file(filepath):
    # Calculate depth for relative paths
    norm_path = os.path.normpath(filepath)
    parts = norm_path.split(os.sep)
    # "." is stripped by normpath usually unless it's just "."
    # Depth logic based on rel_path from '.'
    rel_path = os.path.relpath(filepath, ".")
    # Count of directory separators
    # E.g. 'index.html' -> 0 separators -> depth 0
    # E.g. 'project/youtube-auto-translator.html' -> 1 separator -> depth 1
    depth = rel_path.count(os.sep)
    root_prefix = "../" * depth
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    original = content
    
    # 1. Update <header>
    if header_template:
        new_h = header_template.replace("{{ROOT}}", root_prefix)
        content = re.sub(r'<header>.*?</header>', new_h, content, flags=re.DOTALL)
        
    # 2. Update <div class="nav-overlay">
    if nav_overlay_template:
        new_n = nav_overlay_template.replace("{{ROOT}}", root_prefix)
        old_n = extract_nav_overlay(content)
        if old_n:
            content = content.replace(old_n, new_n)
            
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {filepath}")

# Iterate all .html files
count = 0
for root, dirs, files in os.walk("."):
    if ".git" in root or "components" in root or "node_modules" in root:
        continue
    for f in files:
        if f.endswith(".html"):
            filepath = os.path.join(root, f)
            process_file(filepath)
            count += 1

print(f"Update completed. Processed {count} HTML files in total.")
