#!/usr/bin/env python3
"""Photo -> badge emblem (same technique as the app logo, tools/icon/poster2.py):
crop -> find the sky line -> mean-shift + k-means posterise (LAB, light only) -> tone bands traced as contours -> SVG paths.
Usage: emblem.py photo.jpg out.svg [--crop x0,y0,x1,y1 (fractions)] [--k 6] [--size 100]
The emblem fits a 100 x 100 box, mountain base at y = 100; the sky is left transparent (the badge paints its own)."""
import argparse, cv2, numpy as np
from sklearn.cluster import KMeans

ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--crop', default='0,0,1,1'); ap.add_argument('--k', type=int, default=6); ap.add_argument('--size', type=int, default=100)
ap.add_argument('--work', type=int, default=220); ap.add_argument('--ramp', default='#2c385a,#4a5a82,#8692b3,#c9c6cc,#eedcc8,#fff5e8')
ap.add_argument('--png'); ap.add_argument('--truecolor', type=float, default=0); ap.add_argument('--greena', type=float, default=122); ap.add_argument('--greenb', type=float, default=99); ap.add_argument('--greenbmin', type=float, default=128); ap.add_argument('--wide', action='store_true'); ap.add_argument('--maxline', default=''); ap.add_argument('--ridge', action='store_true'); ap.add_argument('--hut', action='store_true'); ap.add_argument('--despike', type=int, default=5); ap.add_argument('--chroma', type=float, default=0.25); ap.add_argument('--clahe', type=float, default=1.4); ap.add_argument('--green', default='#2f4a2c,#3b5733,#567a3f,#7a9a52'); ap.add_argument('--eps', type=float, default=1.6); ap.add_argument('--tol', type=float, default=3.5); ap.add_argument('--blur', type=float, default=3.2)
ap.add_argument('--snap', type=float, default=0, help='with --maxline: the sky line is the strongest edge within ± this fraction of the crop height around the given line (sharp ridges, tree tips)')
ap.add_argument('--wb', type=float, default=0, help='--truecolor: grey-world white balance 0..1 (removes a blue cast)')
ap.add_argument('--skyd', type=float, default=10, help='--snap: colour distance to the sky that still counts as sky just under the line')
ap.add_argument('--clouds', default='', help='--snap: "x0:x1" (fractions) - there smooth white-grey under the line is cloud (clouds behind a tree)')
ap.add_argument('--pathmed', type=int, default=1, help='--snap: median over this many columns of the found line (removes blocky teeth on hazy ridges)')
ap.add_argument('--lam', type=float, default=0.015, help='--snap: cost of a jump in the line (higher = calmer ridge, lower = tree tips)')
ap.add_argument('--skycls', default='', help='colour sky test (backgrounds): "b,L,tex" - smooth pixels bluer than b (LAB b) or brighter than L and grey (clouds) that touch the sky count as sky')
a = ap.parse_args()

img = cv2.imread(a.src); H, W = img.shape[:2]
x0, y0, x1, y1 = [float(v) for v in a.crop.split(',')]
img = img[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]
h, w = img.shape[:2]
if a.wide: PAD, CH, SQ = 0, h, h                                     # --wide: keep the photo's shape (page backgrounds)
else:
    PAD, CH, SQ = max(0, w - h), min(h, w), max(w, h) if w > h else w   # sky rows added on top, crop height, square side
    if w > h: img = np.vstack([np.repeat(img[:1], w - h, 0), img])       # wide view: add sky on top instead of cutting the sides
    else: img = img[h - w:]                                              # tall: keep the bottom
N = a.work; NW = round(N * img.shape[1] / img.shape[0]); sm = cv2.resize(img, (NW, N), interpolation=cv2.INTER_AREA)

# --- sky: flood fill from the top edge, neighbour-relative (follows the sky's gradient, stops at the mountain's edge)
blur = cv2.GaussianBlur(sm, (0, 0), 1.2); ff = np.zeros((N + 2, NW + 2), np.uint8)
for x in range(0, NW, 4):
    if ff[1, x + 1]: continue
    cv2.floodFill(blur.copy(), ff, (x, 0), 0, (a.tol,) * 3, (a.tol,) * 3, 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
sky = ff[1:-1, 1:-1] > 0
if a.skycls:   # clouds and saturated sky near the horizon stop the flood fill; add smooth blue / white-grey areas joined to the sky
    tb, tL, tt = [float(v) for v in a.skycls.split(',')]
    lb = cv2.cvtColor(blur, cv2.COLOR_BGR2LAB).astype(np.float32); Lc = lb[..., 0]
    tex = np.sqrt(np.maximum(cv2.blur(Lc * Lc, (5, 5)) - cv2.blur(Lc, (5, 5)) ** 2, 0))
    cand = (tex < tt) & ((lb[..., 2] < tb) | ((Lc > tL) & (np.abs(lb[..., 1] - 128) < 7) & (np.abs(lb[..., 2] - 128) < 14)))
    n, cc = cv2.connectedComponents((cand | sky).astype(np.uint8), connectivity=4)
    top = set(np.unique(cc[0][cc[0] > 0])); sky = np.isin(cc, list(top))
sky = cv2.morphologyEx(sky.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)) > 0
line = np.array([np.argmax(~sky[:, x]) if (~sky[:, x]).any() else N - 1 for x in range(NW)], float)
from scipy.ndimage import median_filter, grey_closing
if a.maxline:   # hand-given highest possible land line 'x:y,...' (fractions of the crop): clouds and gaps above it are sky
    P = sorted(tuple(map(float, q.split(':'))) for q in a.maxline.split(','))
    lim = np.interp(np.arange(NW) / NW, [q[0] for q in P], [q[1] for q in P])
    lim = (PAD + lim * (CH if w > h else w)) / SQ * N
    line = np.maximum(line, lim) if not a.ridge else np.where(np.abs(line - lim) <= N * .03, line, lim)   # --ridge: the given line is the ridge
if a.maxline and a.snap:   # follow the real ridge: best path along the strongest sky->land edge in a band around the given line
    lb = cv2.cvtColor(cv2.GaussianBlur(sm, (0, 0), .8), cv2.COLOR_BGR2LAB).astype(np.float32)
    dy = np.zeros((N, NW), np.float32)
    for c, wgt in ((0, 1.0), (1, 1.5), (2, 2.0)): d = np.zeros((N, NW), np.float32); d[2:-2] = lb[4:, :, c] - lb[:-4, :, c]; dy += wgt * np.abs(d)
    B2 = a.snap * N; Y = np.arange(N)[:, None]; inb = np.abs(Y - lim[None, :]) <= B2
    E = np.where(inb, dy, 0); E = E / (np.percentile(E[inb], 99.5) + 1e-6); E = np.minimum(E, 1.5) - 0.6 * np.abs(Y - lim[None, :]) / B2; E[~inb] = -1e4; lam = a.lam   # stay near the given line unless the edge is clear
    acc2 = E[:, 0].copy(); bk = np.zeros((N, NW), np.int32); ys = np.arange(N)
    for x in range(1, NW):   # Viterbi: score + edge - lam*|jump|; jumps are allowed (tree tips) but cost
        sc = acc2[None, :] - lam * np.abs(ys[:, None] - ys[None, :]); bk[:, x] = np.argmax(sc, 1); acc2 = sc[ys, bk[:, x]] + E[:, x]
    y = int(np.argmax(acc2)); path = np.zeros(NW)
    for x in range(NW - 1, -1, -1): path[x] = y; y = bk[y, x]
    line = median_filter(path, size=a.pathmed) + 1 if a.pathmed > 1 else path + 1
if a.snap: a.despike = 1
line = grey_closing(line, size=a.despike)        # narrow upward spikes (cloud gaps, poles) -> removed; summits wider than that stay
if not a.snap: line = np.convolve(np.pad(line, 1, mode='edge'), np.ones(3) / 3, 'valid')
yy = np.arange(N)[:, None]; land = yy >= line[None, :]
if a.maxline and a.snap:   # sky seen between branches / teeth just under the line: smooth pixels coloured like the sky above them are sky
    lb2 = cv2.cvtColor(cv2.GaussianBlur(sm, (0, 0), .8), cv2.COLOR_BGR2LAB).astype(np.float32); Lc = lb2[..., 0]
    tex = np.sqrt(np.maximum(cv2.blur(Lc * Lc, (3, 3)) - cv2.blur(Lc, (3, 3)) ** 2, 0)); skyp = ~land
    cnt = cv2.blur(skyp.astype(np.float32), (1, N * 2 + 1)) + 1e-6
    ref = np.stack([cv2.blur(np.where(skyp, lb2[..., c], 0), (31, 1)) for c in range(3)], -1)[...]
    ref = np.stack([np.sum(np.where(skyp, lb2[..., c], 0), 0) / np.maximum(1, skyp.sum(0)) for c in range(3)], -1)   # sky colour per column
    ref = np.stack([np.convolve(np.pad(ref[:, c], 10, mode='edge'), np.ones(21) / 21, 'valid') for c in range(3)], -1)
    near = land & (yy < lim[None, :] + a.snap * N * 1.5)
    d = np.sqrt(((lb2 - ref[None, :, :]) ** 2 * np.array([.5, 1, 1])).sum(-1))
    cloud = (Lc > 150) & (np.abs(lb2[..., 1] - 128) < 8) & (lb2[..., 2] < 136) & (tex < 9)   # white-grey and smooth: cloud, not sunlit rock (rough)
    cx = np.zeros((N, NW), bool)
    if a.clouds: c0, c1 = [float(v) for v in a.clouds.split(':')]; cx[:, int(c0 * NW):int(c1 * NW)] = True
    if a.clouds:   # a tree against clouds: there the tree's own colour decides (green or dark = tree), not the line
        tree = cx & (((lb2[..., 1] < 123) & (lb2[..., 2] > 128)) | (Lc < 90)) & (yy > lim[None, :] - a.snap * N * 2.5)
        tree = cv2.morphologyEx(cv2.morphologyEx(tree.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)), cv2.MORPH_CLOSE, np.ones((7, 3), np.uint8)) > 0   # trunk tip joined
        land = (land & ~(cx & (yy < lim[None, :] + a.snap * N))) | tree | (land & ~cx)
        land = land & ~(cx & cloud & (yy < lim[None, :] + a.snap * N * 3) & ~tree)
    land = land & ~(near & (((d < np.where(cx, a.skyd, min(a.skyd, 8))) & (tex < 7)) | (cloud & cx)))

# --- posterise the land (light channel; colour only a little, as in the logo)
ms = cv2.pyrMeanShiftFiltering(sm, 8, 32); L = cv2.cvtColor(ms, cv2.COLOR_BGR2LAB).astype(float)
cl = cv2.createCLAHE(clipLimit=a.clahe, tileGridSize=(4, 4)); L[..., 0] = cl.apply(L[..., 0].astype(np.uint8)); L[..., 1:] = (L[..., 1:] - 128) * a.chroma + 128
km = KMeans(a.k, n_init=6, random_state=2).fit(L[land]); lab_k = np.full((N, NW), -1); lab_k[land] = km.labels_
order = np.argsort(km.cluster_centers_[:, 0]); rank = np.empty(a.k, int); rank[order] = np.arange(a.k)
Lraw = cv2.cvtColor(ms, cv2.COLOR_BGR2LAB).astype(float); med = lambda k, c: np.median(Lraw[land][km.labels_ == k][:, c])
green = {k for k in range(a.k) if (med(k, 1) < a.greena and med(k, 2) > a.greenbmin) or (med(k, 2) - 128) - (med(k, 1) - 128) * 1.5 > a.greenb}   # --greenb: yellow-green forests
ramp = a.ramp.split(','); gr = a.green.split(','); gk = sorted(green, key=lambda k: km.cluster_centers_[k, 0])
if a.truecolor:   # --truecolor S: each band keeps the photo's own mean colour (saturation × S) instead of the logo ramp
    import colorsys
    def tc(k):
        b, g, r = (sm[lab_k == k].mean(0) / 255) if (lab_k == k).any() else (.5, .5, .5)
        if a.wb: g0 = sm[land].reshape(-1, 3).mean(0); f = (g0.mean() / g0) ** a.wb; b, g, r = min(1, b * f[0]), min(1, g * f[1]), min(1, r * f[2])
        h, l, sa = colorsys.rgb_to_hls(r, g, b); sa = min(1, sa * a.truecolor)
        if .52 < h < .64: sa = min(sa, .32)                 # hazy blue distance: no saturated sky-blue in the land
        if .16 < h < .45: sa = min(1, sa * 1.25)            # forests and meadows a bit greener
        r, g, b = colorsys.hls_to_rgb(h, min(.97, l * 1.04), sa)
        return '#%02x%02x%02x' % (int(r * 255), int(g * 255), int(b * 255))
    TC = {k: tc(k) for k in range(a.k)}; green = set()
rk = [k for k in order if k not in green]                               # rock / snow tones get the whole ramp
col = lambda k: TC[k] if a.truecolor else gr[min(len(gr) - 1, gk.index(k))] if k in green else ramp[min(len(ramp) - 1, round(rk.index(k) * (len(ramp) - 1) / max(1, len(rk) - 1)))]

# --- smooth label map at 4x, trace each tone band (darkest first, each band = everything at least that light)
U = N * 4; UW = NW * 4; acc = np.zeros((a.k, U, UW), np.float32)
wy = np.clip((np.arange(U)[:, None] / U - 0.55) / 0.35, 0, 1)      # foreground (bottom) smoother, as in the logo
for k in range(a.k):
    m = cv2.resize((lab_k == k).astype(np.float32), (UW, U), interpolation=cv2.INTER_CUBIC)
    acc[k] = cv2.GaussianBlur(m, (0, 0), a.blur) * (1 - wy) + cv2.GaussianBlur(m, (0, 0), a.blur * 2.6) * wy
big = np.argmax(acc, 0); landU = cv2.resize(land.astype(np.uint8), (UW, U), interpolation=cv2.INTER_LINEAR) > 0
if a.snap:   # backgrounds: a smooth, anti-aliased skyline (no stair steps from the work grid); specks of sky / land under ~3 px go
    lm = cv2.morphologyEx(land.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)); lm = cv2.morphologyEx(lm, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    n_, cc_, st_, _ = cv2.connectedComponentsWithStats(1 - lm, connectivity=4)
    for i in range(1, n_):
        if st_[i, cv2.CC_STAT_AREA] < 12 and st_[i, cv2.CC_STAT_TOP] > 0: lm[cc_ == i] = 1   # small sky holes inside the land
    landU = cv2.GaussianBlur(cv2.resize(lm.astype(np.float32), (UW, U), interpolation=cv2.INTER_CUBIC), (0, 0), 2.2) > .5
sc = a.size / U
def paths(m, eps, holes=False):
    cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP if holes else cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); out = []   # --snap: holes too (sky between branches)
    for c in cs:
        if cv2.contourArea(c) < (U / 70) ** 2: continue
        c = cv2.approxPolyDP(c, eps * a.eps, True)[:, 0]
        out.append('M' + ' L'.join(f'{x * sc:.1f},{y * sc:.1f}' for x, y in c) + 'Z')
    return ''.join(out)
FR = ' fill-rule="evenodd"' if a.snap else ''
base = paths(landU, 1.2, bool(a.snap))
layers = [f'<path d="{base}"{FR} fill="{col(order[0])}"/>']
if a.snap: layers.append(f'<defs><clipPath id="land"><path d="{base}" clip-rule="evenodd"/></clipPath></defs><g clip-path="url(#land)">')   # bands never fill the sky holes
for i in range(1, a.k):
    m = landU & np.isin(big, order[i:]); d = paths(m, 1.4)
    if d: layers.append(f'<path d="{d}" fill="{col(order[i])}"/>')
if a.snap: layers.append('</g>')
# a red roof (hut) is drawn as a small hut where the photo has it
red = (Lraw[..., 1] > 150) & land
if a.hut and red.sum() >= 2:
    ys, xs = np.nonzero(red); cx, cy = xs.mean() * a.size / N, ys.mean() * a.size / N; hw = max(3.2, (np.ptp(xs) + 1) * a.size / N * .6)
    layers.append(f'<path d="M{cx - hw:.1f},{cy + hw * .2:.1f} h{2 * hw:.1f} v{hw * 1.1:.1f} h{-2 * hw:.1f}Z" fill="#fff" stroke="#2c385a" stroke-width=".5"/>'
                  f'<path d="M{cx - hw * 1.2:.1f},{cy + hw * .3:.1f} L{cx - hw * .6:.1f},{cy - hw * .5:.1f} H{cx + hw * .6:.1f} L{cx + hw * 1.2:.1f},{cy + hw * .3:.1f}Z" fill="#c8312b" stroke="#2c385a" stroke-width=".5"/>')
# sky line highlight (as the logo's light ridge stroke)
pts = ' '.join(f'{x * a.size / N:.1f},{line[x] * a.size / N:.1f}' for x in range(0, NW, 2))
if not a.snap: layers.append(f'<polyline points="{pts}" fill="none" stroke="#fff6ea" stroke-width="{a.size / 220:.2f}" stroke-linejoin="round" opacity=".8"/>')
top = float(line.min()) * a.size / N
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {a.size * NW / N:.0f} {a.size}" data-top="{top:.1f}">' + ''.join(layers) + '</svg>'
open(a.out, 'w').write(svg); print(a.out, len(svg), 'bytes')
