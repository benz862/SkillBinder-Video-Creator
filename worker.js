const HIGGSFIELD_BASE = 'https://platform.higgsfield.ai';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const keyId = env.HIGGSFIELD_KEY_ID;
    const keySecret = env.HIGGSFIELD_KEY_SECRET;
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: 'HIGGSFIELD_KEY_ID or HIGGSFIELD_KEY_SECRET not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = `Key ${keyId}:${keySecret}`;
    const path = url.pathname;

    try {
      // GET /api/balance
      if (path === '/api/balance' && request.method === 'GET') {
        const r = await fetch(`${HIGGSFIELD_BASE}/users/me/balance`, {
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
        });
        const data = await r.json();
        return new Response(JSON.stringify(data), {
          status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /api/generate
      if (path === '/api/generate' && request.method === 'POST') {
        const { model, prompt, aspect_ratio, duration, medias, resolution } = await request.json();

        // Map model IDs to platform.higgsfield.ai route format
        const modelRoutes = {
          'kling3_0': 'kling/v3/image-to-video',
          'seedance_2_0': 'bytedance/seedance/v2/image-to-video'
        };
        const route = modelRoutes[model] || 'kling/v3/image-to-video';

        const startImage = medias?.find(m => m.role === 'start_image')?.value;
        const endImage = medias?.find(m => m.role === 'end_image')?.value;
        const audio = medias?.find(m => m.role === 'audio')?.value;

        const input = {
          prompt,
          aspect_ratio,
          duration,
          ...(startImage && { start_image_url: startImage }),
          ...(endImage && { end_image_url: endImage }),
          ...(audio && { audio_url: audio })
        };

        const r = await fetch(`${HIGGSFIELD_BASE}/requests/${route}`, {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, withPolling: false })
        });
        const data = await r.json();
        return new Response(JSON.stringify(data), {
          status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /api/job/:jobId
      if (path.startsWith('/api/job/') && request.method === 'GET') {
        const jobId = path.replace('/api/job/', '');
        const r = await fetch(`${HIGGSFIELD_BASE}/requests/${jobId}/status`, {
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
        });
        const data = await r.json();
        return new Response(JSON.stringify(data), {
          status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /api/upload-audio
      if (path === '/api/upload-audio' && request.method === 'POST') {
        const { filename, contentType, fileData } = await request.json();
        const uploadReq = await fetch(`${HIGGSFIELD_BASE}/media/upload`, {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, content_type: contentType, method: 'upload_url' })
        });
        const uploadData = await uploadReq.json();
        if (!uploadReq.ok) throw new Error(uploadData.message || 'Failed to get upload URL');
        const { upload_url, media_id } = uploadData;
        const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
        const s3Res = await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: fileBuffer
        });
        if (!s3Res.ok) throw new Error('Failed to upload to storage');
        return new Response(JSON.stringify({ media_id }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Serve index.html for root
      if (path === '/' || path === '/index.html') {
        return new Response(getHTML(), {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SkillBinder Video Creator</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Lora:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0e1218; --surface: #151b24; --surface2: #1c2533;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.14);
    --text: #eef0f4; --muted: #6b7585;
    --navy: #1d3a5c; --navy-light: #2a5080;
    --gold: #c9a84c; --gold-light: #e8c86e; --gold-dim: rgba(201,168,76,0.12);
    --red: #e05555; --green: #4caf7d;
    --radius: 10px; --radius-lg: 16px;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 0 20px 80px; }
  header { width: 100%; max-width: 680px; padding: 28px 0 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand-logo { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold); }
  .brand-text { display: flex; flex-direction: column; gap: 1px; }
  .brand-name { font-family: 'Lora', serif; font-size: 20px; font-weight: 600; color: var(--text); letter-spacing: -0.01em; }
  .brand-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--gold); letter-spacing: 0.1em; text-transform: uppercase; }
  .balance-badge { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); background: var(--surface2); border: 1px solid var(--border2); border-radius: 20px; padding: 6px 14px; display: flex; align-items: center; gap: 6px; }
  .balance-badge span { color: var(--gold); font-weight: 500; }
  .card { width: 100%; max-width: 680px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px 28px; margin-bottom: 14px; }
  .card-title { font-size: 10px; font-family: 'DM Mono', monospace; color: var(--gold); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
  .card-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .shot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .shot-btn { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; cursor: pointer; text-align: left; transition: border-color 0.15s, background 0.15s; color: var(--text); }
  .shot-btn:hover { border-color: var(--border2); }
  .shot-btn.active { border-color: var(--gold); background: var(--gold-dim); }
  .shot-btn .sn { font-size: 13px; font-weight: 500; margin-bottom: 3px; display: block; }
  .shot-btn .sd { font-size: 11px; color: var(--muted); display: block; }
  .shot-btn.active .sn { color: var(--gold-light); }
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .field:last-child { margin-bottom: 0; }
  .label { font-size: 10px; font-family: 'DM Mono', monospace; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
  input[type=text], textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); outline: none; transition: border-color 0.15s; }
  input[type=text]:focus, textarea:focus { border-color: var(--gold); }
  input[type=text]::placeholder, textarea::placeholder { color: var(--muted); }
  textarea { resize: vertical; min-height: 70px; font-family: 'DM Sans', sans-serif; font-size: 13px; }
  .pills { display: flex; gap: 8px; flex-wrap: wrap; }
  .pill { background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 7px 16px; font-size: 12px; font-family: 'DM Mono', monospace; color: var(--muted); cursor: pointer; transition: all 0.15s; }
  .pill:hover { border-color: var(--border2); color: var(--text); }
  .pill.active { border-color: var(--gold); color: var(--gold-light); background: var(--gold-dim); }
  .range-row { display: flex; align-items: center; gap: 14px; }
  input[type=range] { flex: 1; -webkit-appearance: none; height: 3px; background: var(--border2); border-radius: 2px; outline: none; padding: 0; border: none; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--gold); cursor: pointer; }
  .range-val { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--gold); min-width: 50px; text-align: right; }
  .audio-drop { border: 1px dashed var(--border2); border-radius: var(--radius); padding: 20px; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; position: relative; }
  .audio-drop:hover { border-color: var(--gold); background: var(--gold-dim); }
  .audio-drop.has-file { border-color: var(--gold); background: var(--gold-dim); border-style: solid; }
  .audio-drop input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
  .audio-drop-text { font-size: 13px; color: var(--muted); }
  .audio-drop-text span { color: var(--gold); }
  .audio-file-name { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--gold-light); margin-top: 6px; }
  .audio-uploading { display: none; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--gold); margin-top: 8px; align-items: center; gap: 6px; }
  .audio-uploading.visible { display: flex; }
  .generate-btn { width: 100%; max-width: 680px; background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); color: var(--gold-light); border: 1px solid var(--gold); border-radius: var(--radius); padding: 16px; font-size: 15px; font-weight: 600; font-family: 'Lora', serif; cursor: pointer; letter-spacing: 0.02em; transition: all 0.2s; margin-bottom: 14px; }
  .generate-btn:hover { background: linear-gradient(135deg, var(--navy-light) 0%, #3a6898 100%); }
  .generate-btn:disabled { background: var(--surface2); color: var(--muted); border-color: var(--border); cursor: not-allowed; }
  .status-card { width: 100%; max-width: 680px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px 28px; display: none; margin-bottom: 14px; }
  .status-card.visible { display: block; }
  .status-line { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); margin-bottom: 10px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); animation: pulse 1.2s ease-in-out infinite; flex-shrink: 0; }
  .dot.done { background: var(--green); animation: none; }
  .dot.error { background: var(--red); animation: none; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
  .job-id { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); }
  .error-msg { color: var(--red); font-size: 12px; margin-top: 10px; font-family: 'DM Mono', monospace; display: none; }
  .result-area { margin-top: 16px; }
  video { width: 100%; border-radius: var(--radius); background: #000; }
  .dl-btn { display: inline-block; margin-top: 10px; font-size: 12px; font-family: 'DM Mono', monospace; color: var(--gold); text-decoration: none; border: 1px solid var(--gold); border-radius: 6px; padding: 6px 16px; }
  .history-item { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 14px; }
  .history-meta { flex: 1; }
  .history-shot { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .history-time { font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; }
  .history-status { font-size: 10px; font-family: 'DM Mono', monospace; padding: 3px 10px; border-radius: 10px; background: var(--gold-dim); color: var(--gold); }
  .settings-row { margin-bottom: 18px; }
  .settings-row:last-child { margin-bottom: 0; }
</style>
</head>
<body>
<header>
  <div class="brand">
    <img src="https://raw.githubusercontent.com/benz862/SkillBinder-Video-Creator/main/logo.png" class="brand-logo" alt="SkillBinder" />
    <div class="brand-text">
      <span class="brand-name">SkillBinder Video Creator</span>
      <span class="brand-sub">Powered by Higgsfield AI</span>
    </div>
  </div>
  <div class="balance-badge">Credits: <span id="balance-val">—</span></div>
</header>

<div class="card">
  <div class="card-title">Shot type</div>
  <div class="shot-grid">
    <button class="shot-btn active" data-value="Slow drone push-in toward the front of the subject, camera descends slightly as it approaches" onclick="selectShot(this)"><span class="sn">Drone push-in</span><span class="sd">Wide to close approach</span></button>
    <button class="shot-btn" data-value="Cinematic drone orbit circling slowly around the subject" onclick="selectShot(this)"><span class="sn">Drone orbit</span><span class="sd">Circle around subject</span></button>
    <button class="shot-btn" data-value="Drone rises up from low to reveal the full subject from above" onclick="selectShot(this)"><span class="sn">Drone reveal</span><span class="sd">Rise up to reveal</span></button>
    <button class="shot-btn" data-value="Smooth ground-level walking approach toward the subject" onclick="selectShot(this)"><span class="sn">Street level walk</span><span class="sd">Ground-level approach</span></button>
    <button class="shot-btn" data-value="Slow cinematic product push-in with shallow depth of field and studio lighting" onclick="selectShot(this)"><span class="sn">Product close-up</span><span class="sd">Studio macro push-in</span></button>
    <button class="shot-btn" data-value="Slow cinematic pan across the subject from left to right" onclick="selectShot(this)"><span class="sn">Cinematic pan</span><span class="sd">Left to right sweep</span></button>
    <button class="shot-btn" data-value="Fashion editorial slow walk toward camera with cinematic lighting" onclick="selectShot(this)"><span class="sn">Fashion walk</span><span class="sd">Editorial approach</span></button>
    <button class="shot-btn" data-value="Slow zoom in on subject with bokeh background blur increasing" onclick="selectShot(this)"><span class="sn">Zoom with bokeh</span><span class="sd">Soft focus pull-in</span></button>
  </div>
</div>

<div class="card">
  <div class="card-title">Image frames</div>
  <div class="field"><div class="label">Start frame URL</div><input type="text" id="start-url" placeholder="https://..." /></div>
  <div class="field"><div class="label">End frame URL (optional)</div><input type="text" id="end-url" placeholder="https://... leave blank for single frame" /></div>
</div>

<div class="card">
  <div class="card-title">Audio (optional)</div>
  <div class="field">
    <div class="label">Upload voiceover or music (MP3 / WAV — max 20MB)</div>
    <div class="audio-drop" id="audio-drop">
      <input type="file" id="audio-file" accept="audio/*" onchange="handleAudioFile(this)" />
      <div class="audio-drop-text">🎙 Drop audio file here or <span>browse</span></div>
      <div class="audio-file-name" id="audio-file-name"></div>
    </div>
    <div class="audio-uploading" id="audio-uploading"><div class="dot"></div><span>Uploading audio...</span></div>
  </div>
  <div class="field" style="margin-top:4px"><div class="label">Or paste a public audio URL</div><input type="text" id="audio-url" placeholder="https://... .mp3 or .wav" /></div>
</div>

<div class="card">
  <div class="card-title">Settings</div>
  <div class="settings-row"><div class="label" style="margin-bottom:8px">Aspect ratio</div><div class="pills" id="ratio-group"><button class="pill active" data-value="16:9" onclick="selectPill(this,'ratio-group')">16:9 landscape</button><button class="pill" data-value="9:16" onclick="selectPill(this,'ratio-group')">9:16 vertical</button><button class="pill" data-value="1:1" onclick="selectPill(this,'ratio-group')">1:1 square</button></div></div>
  <div class="settings-row"><div class="label" style="margin-bottom:8px">Duration</div><div class="range-row"><input type="range" id="duration" min="4" max="15" value="10" step="1" oninput="document.getElementById('dur-val').textContent=this.value+' sec'" /><span class="range-val" id="dur-val">10 sec</span></div></div>
  <div class="settings-row"><div class="label" style="margin-bottom:8px">Model</div><div class="pills" id="model-group"><button class="pill active" data-value="kling3_0" onclick="selectPill(this,'model-group')">Kling 3.0 — ~17 credits</button><button class="pill" data-value="seedance_2_0" onclick="selectPill(this,'model-group')">Seedance 2.0 — ~90 credits</button></div></div>
</div>

<div class="card">
  <div class="card-title">Extra prompt details (optional)</div>
  <textarea id="extra" placeholder="e.g. golden hour lighting, snow on the ground, steam rising from food..."></textarea>
</div>

<button class="generate-btn" id="gen-btn" onclick="generate()">Generate Video</button>

<div class="status-card" id="status-card">
  <div class="status-line"><div class="dot" id="status-dot"></div><span id="status-text">Submitting job...</span></div>
  <div class="job-id" id="job-id-label"></div>
  <div class="error-msg" id="error-msg"></div>
  <div class="result-area" id="result-area"></div>
</div>

<div class="card" id="history-card" style="display:none">
  <div class="card-title">Recent generations</div>
  <div id="history-list"></div>
</div>

<script>
let selectedShot = document.querySelector('.shot-btn.active').dataset.value;
let audioMediaId = null;
let pollTimer = null;

function selectShot(btn) {
  document.querySelectorAll('.shot-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedShot = btn.dataset.value;
}
function selectPill(btn, groupId) {
  document.querySelectorAll('#' + groupId + ' .pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function getPill(groupId) {
  const a = document.querySelector('#' + groupId + ' .pill.active');
  return a ? a.dataset.value : '';
}
async function fetchBalance() {
  try {
    const r = await fetch('/api/balance');
    const d = await r.json();
    document.getElementById('balance-val').textContent = Math.round(d.credits ?? d.balance ?? 0);
  } catch(e) { document.getElementById('balance-val').textContent = '—'; }
}
async function handleAudioFile(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('audio-drop').classList.add('has-file');
  document.getElementById('audio-file-name').textContent = file.name;
  document.getElementById('audio-uploading').classList.add('visible');
  audioMediaId = null;
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      const res = await fetch('/api/upload-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'audio/mpeg', fileData: base64 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      audioMediaId = data.media_id;
      document.getElementById('audio-uploading').classList.remove('visible');
      document.getElementById('audio-file-name').textContent = '✓ ' + file.name + ' — ready';
    };
    reader.readAsDataURL(file);
  } catch(e) {
    document.getElementById('audio-uploading').classList.remove('visible');
    document.getElementById('audio-file-name').textContent = 'Upload failed: ' + e.message;
  }
}
async function generate() {
  const startUrl = document.getElementById('start-url').value.trim();
  const endUrl = document.getElementById('end-url').value.trim();
  const audioUrl = document.getElementById('audio-url').value.trim();
  const duration = parseInt(document.getElementById('duration').value);
  const ratio = getPill('ratio-group');
  const model = getPill('model-group');
  const extra = document.getElementById('extra').value.trim();
  if (!startUrl) { alert('Please enter a start frame URL.'); return; }
  const medias = [{ role: 'start_image', value: startUrl }];
  if (endUrl) medias.push({ role: 'end_image', value: endUrl });
  if (audioMediaId) medias.push({ role: 'audio', value: audioMediaId });
  else if (audioUrl) medias.push({ role: 'audio', value: audioUrl });
  let prompt = selectedShot + '. Smooth continuous camera motion, photorealistic, cinematic style, natural lighting, no abrupt cuts.';
  if (extra) prompt += ' ' + extra;
  const body = { model, prompt, aspect_ratio: ratio, duration, medias, resolution: '1080p' };
  const btn = document.getElementById('gen-btn');
  btn.disabled = true; btn.textContent = 'Submitting...';
  const sc = document.getElementById('status-card');
  sc.classList.add('visible');
  document.getElementById('status-dot').className = 'dot';
  document.getElementById('status-text').textContent = 'Submitting job to Higgsfield...';
  document.getElementById('job-id-label').textContent = '';
  document.getElementById('error-msg').style.display = 'none';
  document.getElementById('result-area').innerHTML = '';
  try {
    const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || data.error || 'API error');
    const jobId = data.id || data.job_id;
    document.getElementById('job-id-label').textContent = 'Job: ' + jobId;
    document.getElementById('status-text').textContent = 'Generating — this takes 2–3 minutes...';
    saveHistory({ jobId, shot: document.querySelector('.shot-btn.active .sn').textContent, time: new Date().toLocaleTimeString(), status: 'processing' });
    renderHistory();
    pollJob(jobId);
  } catch(e) {
    document.getElementById('status-dot').className = 'dot error';
    document.getElementById('status-text').textContent = 'Submission failed';
    document.getElementById('error-msg').textContent = e.message;
    document.getElementById('error-msg').style.display = 'block';
    btn.disabled = false; btn.textContent = 'Generate Video';
  }
}
async function pollJob(jobId) {
  clearTimeout(pollTimer);
  try {
    const r = await fetch('/api/job/' + jobId);
    const data = await r.json();
    const status = (data.status || '').toLowerCase();
    if (status === 'completed' || status === 'done' || status === 'succeeded') {
      const url = data.video?.url || data.url || data.video_url || (data.images && data.images[0]?.url) || (data.results && data.results[0] && data.results[0].url);
      document.getElementById('status-dot').className = 'dot done';
      document.getElementById('status-text').textContent = 'Done! Your video is ready.';
      if (url) {
        document.getElementById('result-area').innerHTML = '<video controls autoplay loop src="' + url + '"></video><a href="' + url + '" download class="dl-btn">Download video</a>';
      }
      updateHistory(jobId, 'done'); renderHistory();
      document.getElementById('gen-btn').disabled = false;
      document.getElementById('gen-btn').textContent = 'Generate Video';
      fetchBalance();
    } else if (status === 'failed' || status === 'error') {
      document.getElementById('status-dot').className = 'dot error';
      document.getElementById('status-text').textContent = 'Generation failed.';
      document.getElementById('error-msg').textContent = data.error || data.message || 'Job failed.';
      document.getElementById('error-msg').style.display = 'block';
      updateHistory(jobId, 'error'); renderHistory();
      document.getElementById('gen-btn').disabled = false;
      document.getElementById('gen-btn').textContent = 'Generate Video';
    } else {
      pollTimer = setTimeout(() => pollJob(jobId), 6000);
    }
  } catch(e) { pollTimer = setTimeout(() => pollJob(jobId), 8000); }
}
function saveHistory(item) {
  const h = JSON.parse(localStorage.getItem('svc_history') || '[]');
  h.unshift(item); localStorage.setItem('svc_history', JSON.stringify(h.slice(0, 20)));
}
function updateHistory(jobId, status) {
  const h = JSON.parse(localStorage.getItem('svc_history') || '[]');
  const i = h.find(x => x.jobId === jobId); if (i) i.status = status;
  localStorage.setItem('svc_history', JSON.stringify(h));
}
function renderHistory() {
  const h = JSON.parse(localStorage.getItem('svc_history') || '[]');
  if (!h.length) return;
  document.getElementById('history-card').style.display = 'block';
  document.getElementById('history-list').innerHTML = h.map(item =>
    '<div class="history-item"><div class="history-meta"><div class="history-shot">' + (item.shot || 'Video') + '</div><div class="history-time">' + item.time + ' · ' + (item.jobId ? item.jobId.slice(0,14) + '...' : '') + '</div></div><div class="history-status">' + item.status + '</div></div>'
  ).join('');
}
fetchBalance();
renderHistory();
</script>
</body>
</html>`;
}
