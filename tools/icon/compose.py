import re
from ridge import R
X0,Y0,S=640,335,512/650
def P(pts,dy=0): return ' '.join(f'{(x-X0)*S:.1f},{(y-Y0)*S+dy:.1f}' for x,y in pts)
m=open('mtn.svg').read(); paths='\n'.join(re.findall(r'<path[^>]*/>',m))
hillL=[(600,905),(660,915),(720,935),(790,950),(860,972),(900,1000),(900,1100),(600,1100)]
hillR=[(860,975),(960,935),(1060,890),(1160,845),(1250,805),(1320,780),(1320,1100),(860,1100)]
# path: valley -> Planika hut -> up to Mali Triglav -> along the ridge -> Triglav summit
path=[(1165,995),(1195,935),(1158,885),(1212,835),(1175,785),(1228,735),(1196,688),(1236,648),(1210,606),(1188,586),(1166,556),(1142,526),(1118,505),(1098,490),(1084,480),(1068,482),(1052,488),(1036,496),(1020,499),(1004,499),(990,493),(976,485),(960,476),(946,466),(935,455),(927,444)]
hut=(1210,606)
X=lambda x,y:((x-X0)*S,(y-Y0)*S)
ridge_pts=[X(x,y+5) for x,y in R if 927<=x<=1084][::-1]
pts=[X(*q) for q in [(1150,995),(1110,920),(1050,862),(985,815),(930,778),(912,735),(948,705),(918,672),(945,648),(942,628),(975,605),(1020,585),(1062,566),(1098,530),(1102,495),(1090,470)]]+ridge_pts
def cr(pts):
    d=f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
    for i in range(len(pts)-1):
        p0=pts[max(i-1,0)];p1=pts[i];p2=pts[i+1];p3=pts[min(i+2,len(pts)-1)]
        c1=(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6); c2=(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)
        d+=f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d
pd=cr(pts); hutxy=X(942,624)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e3a86"/><stop offset=".5" stop-color="#2a73c6"/><stop offset="1" stop-color="#9cc9ec"/></linearGradient>
<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a9a52"/><stop offset="1" stop-color="#3b5733"/></linearGradient>
<linearGradient id="gr2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b8a4a"/><stop offset="1" stop-color="#2f4a2c"/></linearGradient>
<clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath></defs>
<g clip-path="url(#r)">
<rect width="512" height="512" fill="url(#sk)"/>
<clipPath id="mt"><polygon points="{P(R+[(1400,1100),(500,1100)])}"/></clipPath>
<g clip-path="url(#mt)"><rect width="512" height="512" fill="#3a4870"/>{paths}</g>
<polyline points="{P(R)}" fill="none" stroke="#fff6ea" stroke-width="2.2" stroke-linejoin="round" opacity=".8"/>
<path d="{pd}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
<path d="{pd}" fill="none" stroke="#e0312b" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
<polygon points="{P(hillR)}" fill="url(#gr)"/>
<polygon points="{P(hillL)}" fill="url(#gr2)"/>
<circle cx="{(930-X0)*S:.1f}" cy="{(440-Y0)*S:.1f}" r="15" fill="#e0312b" stroke="#fff" stroke-width="6"/>
</g></svg>'''
open('T2.svg','w').write(svg); print(len(svg))
