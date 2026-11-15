#!/usr/bin/env python3
"""Turns the approved landing page (landing/index.html) into public/landing.html for the real app.

The real app serves it at "/" (see next.config.ts). Changes made here, so the landing source stays one file:
- links go to the real pages: /signin and /register
- the sign-in card on the page sends the TeamPulse ID to /signin
- the Mac and Windows downloads are served from web/public/downloads
- prototype wording is replaced
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent   # the web folder
src = (ROOT / "landing" / "index.html").read_text(encoding="utf-8")

# 1. wrap as a normal page
html = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        "<style>body{margin:0}[hidden]{display:none!important}</style></head><body>\n" + src + "\n</body></html>\n")

# 2. downloads: the zips live in web/public/downloads and are served at /downloads/
def size(name, fallback):
    f = ROOT / "public" / "downloads" / name
    return f"{max(1, round(f.stat().st_size / 1024))} KB" if f.exists() else fallback
html = html.replace("{{MAC_SIZE}}", size("TeamPulse-mac.zip", "about 200 KB")).replace("{{WIN_SIZE}}", size("TeamPulse-windows.zip", "about 100 KB"))
html = html.replace('href="downloads/', 'href="/downloads/')

# 3. links
html = html.replace('href="app.html#register"', 'href="/register"').replace('href="app.html"', 'href="/signin"')
html = html.replace("if($('#appview'))location.hash='app-signin';else location.href='app.html#signin';", "location.href='/signin?id='+encodeURIComponent(id);")
html = html.replace("try{sessionStorage.setItem('tp_id',id)}catch(_){}\n", "")
html = re.sub(r"\$\('#forgot'\)\.addEventListener\('click',\(\)=>toast\([^\n]*\);\n", "$('#forgot').addEventListener('click',()=>{location.href='/forgot'});\n", html)

# 4. wording
html = html.replace('<span class="ex">Preview</span>', '<span class="ex">Example</span>')
html = html.replace("Prototype: what you enter stays in your own browser. TeamPulse is an independent", "TeamPulse is an independent")
html = html.replace("Example TeamPulse dashboard", "Illustration of a TeamPulse dashboard")

out = ROOT / "public" / "landing.html"
out.write_text(html, encoding="utf-8")
left = [w for w in ("app.html", "downloads/", "TP_DESKTOP", "data-dl") if w in html]
print("wrote", out.relative_to(ROOT), "| leftovers:", left or "none")
