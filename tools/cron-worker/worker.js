// Cloudflare Worker (free plan, Cron Triggers): starts the data Actions on time. GitHub's own schedule drops many runs
// (Summit weather: 8 planned a day, ~3 run). The Worker calls "Run workflow" (workflow_dispatch) through the GitHub API.
// Secret GH_TOKEN (set in the Cloudflare dashboard → Worker → Settings → Variables → Secret; never in a file or chat):
// a fine-grained GitHub token, only this repository, permission "Actions: Read and write".
const REPO = 'taskrti76/Slovenija2k-Challenge';
// cron (UTC, as in wrangler.toml / dashboard Triggers) -> workflow file
const JOBS = {
  '41 1,4,7,10,13,16,19,22 * * *': ['weather.yml'],
  '17 4 * * *': ['snow.yml'],
  '20 2,8,14 * * *': ['snowpack.yml'],
  '7 18 * * *': ['snowpack.yml'],
  '23 17 * * *': ['snowsat.yml'],
};
async function dispatch(env, wf){
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${wf}/dispatches`, {method: 'POST',
    headers: {Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'dvatisocaki-cron', 'X-GitHub-Api-Version': '2022-11-28'},
    body: JSON.stringify({ref: 'main'})});
  if (r.status !== 204) throw new Error(`${wf}: HTTP ${r.status} ${await r.text()}`);
}
export default {
  async scheduled(ev, env, ctx){ for (const wf of JOBS[ev.cron] || []) ctx.waitUntil(dispatch(env, wf)); },
  // open the Worker's address with ?run=weather.yml to test by hand (only the listed files)
  async fetch(req, env){ const wf = new URL(req.url).searchParams.get('run');
    if (!wf || !Object.values(JOBS).flat().includes(wf)) return new Response('ok');
    try{ await dispatch(env, wf); return new Response('started ' + wf); }catch(e){ return new Response(String(e), {status: 500}); } },
};
