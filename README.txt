# SkillBinder Video Creator — Cloudflare Worker

## Deploy in 5 minutes

### 1. Install Wrangler (one time)
npm install -g wrangler

### 2. Login to Cloudflare
wrangler login

### 3. Add your API key as a secret
wrangler secret put HIGGSFIELD_API_KEY
(paste your key when prompted: fc91ae815b97c793b461a258bb89f99f600643a83dd2cf51c3837b09f771927a)

### 4. Deploy
wrangler deploy

Your app will be live at:
https://skillbinder-video-creator.[your-subdomain].workers.dev

## That's it
No servers, no npm install, no local Node needed after setup.
Every update: just run wrangler deploy again.
