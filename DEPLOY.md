# Deploy to Render (GitHub)

This guide gets the consignment shop live on [Render](https://render.com) with GitHub auto-deploy.

## What you need

- GitHub account + [Git](https://git-scm.com/) installed
- [Render](https://render.com) account (free tier works to start)
- [Cloudinary](https://cloudinary.com) account (free tier — stores item photos)
- Stripe account (optional — for online payments)
- SMTP credentials (optional — for receipt emails)

## 1. Push code to GitHub

From the project folder:

```bash
git init
git add .
git commit -m "Prepare for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Do **not** commit `.env` — it is gitignored.

## 2. Deploy with Render Blueprint (recommended)

1. In Render: **New → Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates:
   - A **PostgreSQL** database
   - A **Web Service** for the Next.js app
4. After the blueprint is created, open the web service **Environment** tab and set:

| Variable | Value |
|---|---|
| `NEXTAUTH_URL` | Your Render URL, e.g. `https://consignment-shop.onrender.com` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `STRIPE_SECRET_KEY` | Stripe test or live key |
| `STRIPE_PUBLISHABLE_KEY` | If needed client-side |
| `STRIPE_WEBHOOK_SECRET` | After creating Stripe webhook (step 5) |
| `SMTP_*` | Optional — for customer/owner emails |

`NEXTAUTH_SECRET` and `DATABASE_URL` are set automatically by the blueprint.

5. Trigger a **Manual Deploy** after saving env vars.

### Manual setup (without Blueprint)

If you prefer manual setup:

1. **New → PostgreSQL** (free) — copy the **Internal Database URL**
2. **New → Web Service** → connect GitHub repo
   - **Build command:** `npm ci && npx prisma generate && npx prisma db push && npm run build`
   - **Start command:** `npm start`
   - **Health check path:** `/api/health`
3. Add all environment variables from `.env.example`

## 3. Create your owner account (automatic on free tier)

On the **free plan**, Render does not include Shell access. The app **creates your owner account automatically** the first time the server starts.

1. In Render → your web service → **Environment**, set:
   - `OWNER_INITIAL_PASSWORD` → a strong password you choose
2. Save and redeploy (or wait for the next deploy after pushing the latest code).

Then log in at your Render URL as:

- **Email:** `owner@shop.com`
- **Password:** the value you set for `OWNER_INITIAL_PASSWORD`

If you skip `OWNER_INITIAL_PASSWORD`, the default is `owner123` — change it by setting that env var and deleting the owner user from the database, or use a paid Render plan and run `npm run db:seed:prod` in Shell.

### Optional: manual seed (Render Shell — paid plans only)

1. Render dashboard → your web service → **Shell**
2. Run:

```bash
OWNER_INITIAL_PASSWORD="YourStrongPassword123" npm run db:seed:prod
```

The production seed creates the owner account, categories, and shop settings — **no demo items or customers**.

## 4. Cloudinary setup

1. Create a free Cloudinary account
2. Dashboard → **Settings → API Keys**
3. Copy **Cloud name**, **API Key**, and **API Secret** into Render env vars
4. No upload preset is required — the app uses signed uploads

Photos uploaded in admin are stored on Cloudinary and persist across deploys.

## 5. Stripe webhook (if using online payments)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://YOUR-APP.onrender.com/api/webhooks/stripe`
3. Event: `checkout.session.completed`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` on Render
5. Redeploy or restart the service

## 6. Local development (PostgreSQL)

The app uses PostgreSQL locally and in production.

```bash
docker compose up -d
cp .env.example .env
# Edit .env — DATABASE_URL is pre-filled for Docker Postgres
npm install
npm run db:push
npm run db:seed
npm run dev
```

Local dev uses **local disk** for photos when Cloudinary env vars are empty. Production **requires** Cloudinary.

## Troubleshooting

| Issue | Fix |
|---|---|
| Build fails on `prisma db push` | Check `DATABASE_URL` is set and Postgres is running |
| Photos fail to upload on Render | Set all three `CLOUDINARY_*` env vars |
| Login redirects fail | `NEXTAUTH_URL` must match your public URL exactly (https, no trailing slash) |
| Stripe payments not confirming | Webhook URL and `STRIPE_WEBHOOK_SECRET` must match Stripe dashboard |
| App slow on first visit | Free tier spins down after inactivity — upgrade for always-on |

## Auto-deploy

Every push to `main` triggers a new Render deploy when GitHub is connected.

Build runs `prisma db push` to apply schema changes automatically.
