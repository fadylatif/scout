"""Download Cairo font TTF files locally from Google Fonts CDN"""
import urllib.request
import os
import re

fonts_dir = os.path.join("frontend", "public", "fonts")
os.makedirs(fonts_dir, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

css_url = "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
req = urllib.request.Request(css_url, headers=headers)

with urllib.request.urlopen(req, timeout=15) as resp:
    css = resp.read().decode("utf-8")

weights = {300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black"}
pattern = r"font-weight:\s*(\d+).*?src:\s*url\(([^)]+\.ttf)\)"

for match in re.finditer(pattern, css, re.DOTALL):
    weight = int(match.group(1))
    url = match.group(2).strip("'\"")
    weight_name = weights.get(weight, str(weight))
    fname = f"Cairo-{weight_name}.ttf"
    out_path = os.path.join(fonts_dir, fname)
    req2 = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req2, timeout=15) as resp2:
        data = resp2.read()
    with open(out_path, "wb") as f:
        f.write(data)
    print(f"✓ Downloaded: {fname} ({len(data):,} bytes)")

print("\nAll Cairo fonts downloaded successfully!")
