# The Almanac — Deploy Guide

The HTML calls `/api/almanac` on its own origin. That endpoint is a tiny
serverless function that holds your Anthropic API key and forwards the
request. The key never ships to the browser.

## Prerequisites

1. An Anthropic API key — get one at https://console.anthropic.com/
2. A Vercel or Netlify account (both have free tiers that cover this easily)

---

## Option A — Vercel

**File layout:**
```
your-project/
├── index.html
└── api/
    └── almanac.js
```

**Steps:**

1. Drop `index.html` and `api/almanac.js` into a folder.
2. `git init`, commit, push to GitHub.
3. Go to https://vercel.com/new, import the repo.
4. Before deploying, add an environment variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key (starts with `sk-ant-...`)
5. Deploy. Your site will be at `https://<project>.vercel.app`.

You can also drag-and-drop the folder at https://vercel.com/new without a
git repo if you prefer — just remember to add the env var in the project
settings afterward and redeploy.

---

## Option B — Netlify

**File layout:**
```
your-project/
├── index.html
└── netlify/
    └── functions/
        └── almanac.js
```

**Steps:**

1. Drop `index.html` and `netlify/functions/almanac.js` into a folder.
2. Go to https://app.netlify.com/drop and drag the folder in (no git needed).
   Or connect a GitHub repo if you prefer.
3. Once deployed, go to Site configuration → Environment variables and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key (starts with `sk-ant-...`)
4. Trigger a redeploy (Deploys → Trigger deploy → Deploy site) so the
   function picks up the env var.

The function is configured to respond at `/api/almanac` (set via `export const config`),
so the HTML works on both platforms without modification.

---

## Local testing

**Vercel:** `npm i -g vercel` then `vercel dev` in the project folder.
Set the env var locally with `vercel env add ANTHROPIC_API_KEY`.

**Netlify:** `npm i -g netlify-cli` then `netlify dev`. Add the key with
`netlify env:set ANTHROPIC_API_KEY sk-ant-...`.

---

## Cost

The function is a 1-2 second pass-through; serverless time is negligible.
Anthropic API cost per click is roughly $0.01-0.03 depending on response
length. If you put this on the open internet, consider adding a rate limit.

## Adding rate limiting (optional)

For a public-facing site, prevent abuse with something like Upstash Redis +
`@upstash/ratelimit`, or just front it with Cloudflare's free WAF rules.

## Troubleshooting

- **500 "Server missing ANTHROPIC_API_KEY"** — the env var isn't set, or you
  set it after deploying and haven't redeployed since.
- **CORS errors** — shouldn't happen since the HTML and function are on the
  same origin; if you split them, add proper CORS headers in the function.
- **401 from Anthropic** — bad API key. Regenerate at console.anthropic.com.
- **Slow first request** — cold-start latency on the function. Normal,
  subsequent calls are fast.
