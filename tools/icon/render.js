const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
const jobs=[['T2.svg',512,'icon-512.png'],['T2.svg',192,'icon-192.png'],['T2_square.svg',512,'icon-maskable-512.png'],['T2_square.svg',180,'apple-touch-icon.png'],['T2.svg',256,'tmp256.png'],['T2.svg',48,'tmp48.png'],['T2.svg',32,'tmp32.png'],['T2.svg',16,'tmp16.png']];
for(const [src,s,out] of jobs){const p=await b.newPage({viewport:{width:s,height:s}});
require('fs').writeFileSync('r.html',`<html><body style="margin:0;background:transparent"><img src="${src}" width=${s} height=${s} style="display:block"></body></html>`);await p.goto('file://'+process.cwd()+'/r.html');
await p.waitForTimeout(150);await p.screenshot({path:'out/'+out,omitBackground:true});await p.close();}
await b.close();})();
