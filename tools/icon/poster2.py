import cv2, numpy as np
from sklearn.cluster import KMeans
src=cv2.imread('/mnt/user-data/attachments/47d1d9ac-eaf0-5345-88fd-782294c05024/f3d9f802-image.jpg')
X0,Y0,N=640,335,650; S=512/N
from ridge import R as ridge
poly=np.array([[(x-X0)*S,(y-Y0)*S] for x,y in ridge]+[(1400,1100),(500,1100)],np.int32)
mask=np.zeros((512,512),np.uint8); cv2.fillPoly(mask,[poly],255)
c=cv2.resize(src[Y0:Y0+N,X0:X0+N],(512,512),interpolation=cv2.INTER_AREA)
small=cv2.resize(c,(260,260),interpolation=cv2.INTER_AREA)
small=cv2.pyrMeanShiftFiltering(small,6,30)
lab=cv2.cvtColor(small,cv2.COLOR_BGR2LAB)
cl=cv2.createCLAHE(clipLimit=1.3,tileGridSize=(4,4)); lab[...,0]=cl.apply(lab[...,0]); lab=lab.astype(float); lab[...,1:]*=0.25
m2=cv2.resize(mask,(260,260),interpolation=cv2.INTER_NEAREST)>0
K=7; km=KMeans(K,n_init=6,random_state=2).fit(lab[m2]); L=np.full((260,260),255,np.uint8); L[m2]=km.labels_
cent=km.cluster_centers_; order=np.argsort(cent[:,0])
shade=['#334064','#47567d','#61709a','#8592b3','#b8b9c8','#e6d2bd','#fcf1e3']
Ls=cent[:,0]; lo,hi=np.percentile(lab[m2][:,0],[3,97])
stops=[(0,(0x2c,0x38,0x5a)),(.3,(0x4a,0x5a,0x82)),(.55,(0x86,0x92,0xb3)),(.75,(0xc9,0xc6,0xcc)),(.88,(0xee,0xdc,0xc8)),(1,(0xff,0xf5,0xe8))]
def ramp(v):
    v=min(1,max(0,v))
    for (a,ca),(b,cb) in zip(stops,stops[1:]):
        if v<=b: f=(v-a)/(b-a); return '#%02x%02x%02x'%tuple(int(ca[i]+(cb[i]-ca[i])*f) for i in range(3))
cols={k:ramp((Ls[k]-lo)/(hi-lo)) for k in range(K)}
# upsample labels smoothly: per-label soft mask -> argmax
acc=np.zeros((K,512,512),np.float32)
for k in range(K):
    a=cv2.resize((L==k).astype(np.float32),(512,512),interpolation=cv2.INTER_CUBIC)
    w=np.clip((np.arange(512)[:,None]-230)/80,0,1)
    acc[k]=cv2.GaussianBlur(a,(0,0),2.6)*(1-w)+cv2.GaussianBlur(a,(0,0),6)*w
lab512=np.argmax(acc,0)
img=np.zeros((512,512,4),np.uint8)
for k in range(K):
    h=cols[k]; img[(lab512==k)&(mask>0)]=[int(h[5:7],16),int(h[3:5],16),int(h[1:3],16),255]
cv2.imwrite('poster2.png',img); print(cols)
