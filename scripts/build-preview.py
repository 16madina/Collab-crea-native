#!/usr/bin/env python3
"""Construit un aperçu web autonome (un seul fichier HTML) de l'export Expo web.

Usage : npx expo export --platform web --output-dir /tmp/ccweb
        python3 scripts/build-preview.py /tmp/ccweb sortie.html

- Intègre en data URI les polices utiles et toutes les images (.jpg/.png) de l'app.
- Sur grand écran, affiche l'app dans un cadre d'iPhone ; sur téléphone, en plein écran.
"""
import base64, glob, os, re, sys

src, out = sys.argv[1], sys.argv[2]
js = open(glob.glob(os.path.join(src, "_expo/static/js/web/*.js"))[0]).read()
MIME = {"ttf": "font/ttf", "jpg": "image/jpeg", "png": "image/png"}
for p in set(re.findall(r'"(/assets/[^"]+\.(?:ttf|jpg|png))"', js)):
    ext = p.rsplit(".", 1)[1]
    if ext == "ttf" and not ("Ionicons" in p or "MaterialCommunityIcons" in p or "PlayfairDisplay_700Bold" in p):
        continue
    if "node_modules/expo-router" in p or "react-navigation" in p:
        continue
    f = os.path.join(src, p.lstrip("/"))
    if os.path.exists(f):
        js = js.replace('"' + p + '"', '"data:%s;base64,%s"' % (MIME[ext], base64.b64encode(open(f, "rb").read()).decode()))
js = js.replace("</script", "<\\/script")

CSS = """
:root{--bg:#0B0B0B}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0B0B0B}}
:root[data-theme="dark"]{--bg:#0B0B0B}
html,body{height:100%;margin:0;background:var(--bg)}
body{overflow:hidden}
#root{display:flex;height:100%}
html.framed{background:radial-gradient(ellipse at 50% 30%,#2a2116 0%,#0b0b0b 55%,#000 100%);height:100%;overflow:hidden}
html.framed body{position:absolute;left:50%;top:50%;width:366px;height:820px;margin:0;transform:translate(-50%,-50%) scale(var(--s,1));border:12px solid #0a0a0a;border-radius:58px;box-shadow:0 0 0 2px #6b5531,0 0 0 4px #1b1b1b,0 40px 90px rgba(0,0,0,.85),0 0 70px rgba(217,172,101,.18);overflow:hidden;background:#0B0B0B;box-sizing:content-box}
html.framed #root{position:absolute;top:50px;left:0;right:0;bottom:18px;height:auto}
.fx{display:none}
html.framed .fx{display:flex}
.island{position:fixed;top:11px;left:50%;transform:translateX(-50%);width:118px;height:34px;border-radius:20px;background:#000;z-index:100000;pointer-events:none}
.status{position:fixed;top:0;left:0;right:0;height:50px;z-index:99999;justify-content:space-between;align-items:center;padding:0 28px 0 36px;color:#F8F6F2;font:600 15px -apple-system,system-ui,sans-serif;pointer-events:none;background:#0B0B0B}
.homebar{position:fixed;bottom:6px;left:50%;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;background:#F8F6F2;z-index:100000;pointer-events:none;opacity:.85}
"""
HEAD = """try{history.replaceState(null,"","/")}catch(e){}
if(innerWidth>=480){
  document.documentElement.className="framed";
  document.documentElement.style.setProperty("--s",Math.min(1,(innerHeight-24)/844,(innerWidth-24)/390));
  var vv={width:366,height:770,scale:1,addEventListener:function(){},removeEventListener:function(){}};
  try{Object.defineProperty(window,"visualViewport",{get:function(){return vv}})}catch(e){}
}"""
html = (
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>'
    '<meta name="theme-color" content="#0B0B0B"/><title>Collab Créa</title>'
    "<style>" + CSS + "</style><script>" + HEAD + "</script></head><body>"
    '<div class="fx status"><span>9:41</span><span>●●●● ▮</span></div><div class="fx island"></div>'
    '<div id="root"></div><div class="fx homebar"></div>'
    "<script>" + js + "</script></body></html>"
)
open(out, "w").write(html)
print(out, len(html))
