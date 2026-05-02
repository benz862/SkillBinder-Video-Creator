# SkillBinder Video Creator

## Deploy to Vercel

1. Push this folder to a GitHub repo (e.g. benz862/skillbinder-video-creator)

2. Go to vercel.com → New Project → Import that repo

3. In Vercel project settings → Environment Variables, add:
   HIGGSFIELD_API_KEY = fc91ae815b97c793b461a258bb89f99f600643a83dd2cf51c3837b09f771927a

4. Deploy — done. Your app will be live at:
   https://skillbinder-video-creator.vercel.app

## API Routes
- GET  /api/balance         — Higgsfield credit balance
- POST /api/generate        — Submit video generation job
- GET  /api/job/[jobId]     — Poll job status
- POST /api/upload-audio    — Upload audio file (base64) → returns media_id

## Features
- 8 shot types (drone push-in, orbit, reveal, street walk, product, pan, fashion, bokeh)
- Start + end frame support
- Audio upload (voiceover / music) synced to video
- Kling 3.0 or Seedance 2.0 model selection
- Aspect ratio: 16:9 / 9:16 / 1:1
- Duration: 4–15 seconds
- Live credit balance display
- Generation history (localStorage)
- Download button on completion
