import json,re,sys,os
# Builds index.html from src/. Run from the repo root:  python3 build.py
os.chdir(os.path.dirname(os.path.abspath(__file__)))
D='src/data/'
t=open('src/template.html').read()
# the globe script lives in src/globe.js and is spliced into the template
g=open('src/globe.js').read().rstrip();i=t.index('/* ---------- globe hero');e=t.index('</script>',i);seg=t[i:e];m='  requestAnimationFrame(frame);\n})();';k=seg.rindex(m)+len(m);t=t[:i]+g+seg[k:]+t[e:]
imgs=json.load(open(D+'imgs2.json'));imgs['fbase']=open(D+'fiord_base.txt').read();imgs['fpatch']=open(D+'fiord_patch.txt').read();vids=json.load(open(D+'vids.json'))
logo=open('src/logo.svg').read()
logo=re.sub(r'<!--.*?-->','',logo,flags=re.S); logo=re.sub(r'\s+',' ',logo).strip()
logo=logo.replace('width="190.80" height="34.90" ','',1)
S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">'
icons={
 'gh':'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>',
 'arrow':S+'<path d="M5 12h14M13 6l6 6-6 6"/></svg>',
 'i-radio':S+'<path d="M3 12h3l3-7 4 14 3-7h5"/></svg>',
 'i-book':S+'<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/></svg>',
 'i-bell':S+'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
 'i-net':S+'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><path d="M6.5 10v4h11M17.5 10V6.5H10"/></svg>',
 'i-rec':S+'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
 'i-sat':S+'<path d="M4 20a16 16 0 0 1 16-16"/><path d="M4 20a10 10 0 0 1 10-10"/><circle cx="5" cy="19" r="1.5" fill="currentColor"/></svg>',
 'i-box':S+'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
 'i-phone':S+'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
}
t=t.replace('{{logo}}',logo)
import os
if '{{sjs}}' in t: t=t.replace('{{sjs}}',open('src/vendor/satellite.min.js').read().replace('</script','<\\/script')).replace('{{tle}}',open(D+'tle_iss.json').read()).replace('{{countries}}',open(D+'countries_sel.json').read())
if '{{three}}' in t: t=t.replace('{{three}}',open('src/vendor/three.min.js').read().replace('</script','<\\/script'))
for k,v in icons.items(): t=t.replace('{{'+k+'}}',v)
t=re.sub(r'src="\{\{img:([a-z0-9-]+)\}\}"',r'data-img="\1"',t)
used_vids={k:v for k,v in vids.items() if f'data-vid="{k}"' in t}
t=t.replace('{{imgjson}}',json.dumps(imgs)).replace('{{vidjson}}',json.dumps(used_vids))
left=re.findall(r'\{\{[^}]+\}\}',t); print('left:',left)
t=t.replace('{{vec}}',open(D+'vec.json').read()).replace('{{landmask}}',open(D+'landmask.txt').read())
open('index.html','w').write(t); print(len(t)//1024,'KB')
