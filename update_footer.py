import os
import re

TEMPLATE_PATH = "components/footer_template.html"

try:
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template_content = f.read()
except FileNotFoundError:
    print(f"Error: {TEMPLATE_PATH} not found.")
    exit(1)

# Extract footer from template
footer_match = re.search(r'<footer.*?</footer>', template_content, flags=re.DOTALL)
footer_template = footer_match.group(0) if footer_match else ""

def process_file(filepath):
    # Calculate depth for relative paths
    norm_path = os.path.normpath(filepath)
    rel_path = os.path.relpath(filepath, ".")
    if os.path.basename(filepath) == "404.html":
        root_prefix = "/"
    else:
        depth = rel_path.count(os.sep)
        root_prefix = "../" * depth
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    original = content
    
    # Update <footer class="footer"...>
    if footer_template:
        new_f = footer_template.replace("{{ROOT}}", root_prefix)
        content = re.sub(r'<footer.*?</footer>', new_f, content, flags=re.DOTALL)
            
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
