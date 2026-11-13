"""Profile / friends page backgrounds (badges/bg_pano*.svg) from three photos: emblem.py with a hand-given ridge line
(--maxline, fractions of the photo) that --snap follows to the real edge. Run from the repo root: python3 tools/badges/backdrops.py [q0 qa qb]"""
import subprocess,sys
A = 'tools/badges/photos/backdrops/'   # the three photos (not in the repo: put them here to rebuild)
E = 'tools/badges/emblem.py'
G={'q0':('10c1ee5d-image.png',0.22,"0:.34,.05:.33,.1:.31,.2:.33,.3:.30,.35:.29,.4:.30,.45:.29,.5:.30,.55:.29,.6:.31,.65:.33,.7:.33,.8:.32,.9:.32,1:.33",['--wb','.35','--skyd','8','--lam','.05','--pathmed','9','--snap','0.022']),
   'qa':('b0f95768-image.png',0.30,"0:.45,.1:.43,.15:.43,.2:.42,.25:.41,.3:.38,.35:.40,.4:.39,.45:.38,.48:.36,.5:.38,.55:.39,.6:.40,.64:.37,.7:.41,.8:.43,.85:.43,.9:.42,1:.43",['--skyd','8','--lam','.05','--pathmed','9','--snap','0.022']),
   'qb':('00765014-image.png',0.0,"0:.33,.03:.30,.08:.33,.12:.32,.16:.30,.2:.29,.22:.30,.25:.36,.28:.41,.3:.44,.32:.42,.35:.38,.38:.32,.42:.25,.45:.21,.47:.21,.5:.27,.55:.35,.57:.37,.59:.36,.62:.38,.65:.32,.67:.31,.7:.31,.73:.30,.76:.31,.79:.36,.81:.38,.83:.30,.845:.12,.855:.04,.865:.12,.88:.22,.9:.30,.93:.30,.96:.29,1:.32",['--skyd','26','--clouds','.8:.92'])}
for k in (sys.argv[1:] or G):
  f,y0,g,ex=G[k]; gg=','.join(f"{p.split(':')[0]}:{(float(p.split(':')[1])-y0)/(1-y0):.4f}" for p in g.split(','))
  cmd=['python3',E,A+f,'badges/'+{'q0':'bg_pano','qa':'bg_pano_a','qb':'bg_pano_b'}[k]+'.svg','--wide','--size','300','--crop',f'0,{y0},1,1','--truecolor','1.15','--work','520','--blur','2.8','--eps','1.6','--k','9','--chroma','0.8','--clahe','1.5','--maxline',gg,'--snap','0.045']+ex
  r=subprocess.run(cmd,capture_output=True,text=True); print(k,r.stdout.strip(),r.stderr[-400:])
