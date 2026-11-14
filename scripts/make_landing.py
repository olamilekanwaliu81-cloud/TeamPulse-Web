#!/usr/bin/env python3
"""Turns the approved landing page (../landing/index.html) into web/public/landing.html for the real app.

The real app serves it at "/" (see next.config.ts). Changes made here, so the landing source stays one file:
- links go to the real pages: /signin and /register
- the sign-in card on the page sends the TeamPulse ID to /signin
- the Mac and Windows download section is removed (the downloads are still the prototype)
- prototype wording is replaced
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
src = (ROOT / "landing" / "index.html").read_text(encoding="utf-8")

# 1. wrap as a normal page
html = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        "<style>body{margin:0}[hidden]{display:none!important}</style></head><body>\n" + src + "\n</body></html>\n")

# 2. remove the download section and links to it
html = re.sub(r'<section id="download">.*?</section>\s*', "", html, flags=re.S)
html = re.sub(r'<a [^>]*data-dl-link[^>]*>.*?</a>', "", html, flags=re.S)
html = re.sub(r'<p class="sub-link" data-dl-link>.*?</p>', "", html, flags=re.S)
html = re.sub(r'/\* downloads: recommend.*?\}\)\(\);\n', "", html, flags=re.S)

# 3. links
html = html.replace('href="app.html#register"', 'href="/register"').replace('href="app.html"', 'href="/signin"')
html = html.replace("if($('#appview'))location.hash='app-signin';else location.href='app.html#signin';", "location.href='/signin?id='+encodeURIComponent(id);")
html = html.replace("try{sessionStorage.setItem('tp_id',id)}catch(_){}\n", "")
html = re.sub(r"\$\('#forgot'\)\.addEventListener\('click',\(\)=>toast\([^\n]*\);\n", "$('#forgot').addEventListener('click',()=>{location.href='/forgot'});\n", html)

# 4. wording
html = html.replace('<span class="ex">Preview</span>', '<span class="ex">Example</span>')
html = html.replace("Prototype: what you enter stays in your own browser. TeamPulse is an independent", "TeamPulse is an independent")
html = html.replace("Example TeamPulse dashboard", "Illustration of a TeamPulse dashboard")

out = ROOT / "web" / "public" / "landing.html"
out.write_text(html, encoding="utf-8")
left = [w for w in ("app.html", "downloads/", "TP_DESKTOP", "data-dl") if w in html]
print("wrote", out.relative_to(ROOT), "| leftovers:", left or "none")
