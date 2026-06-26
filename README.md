# Consignment Shop Platform

A beginner-friendly online consignment sales platform. The shop owner uploads item photos, sets prices and rules, and customers browse, claim or bid on items, then check out and pay online. Much simpler than selling through Facebook comments.

## Features

### For customers
- **Browse items** with photos, descriptions, and clear badges (Claim, Buy Now, Auction)
- **Create a free account** so the owner can track purchases and contact info
- **Claim, buy, or bid** depending on how each item is listed
- **Shopping cart** — add items while browsing, pay when done shopping
- **Online checkout** via Stripe (or manual payment mode)
- **My Account** — view order history and payment status
- **How It Works** guide written in plain English

### For the shop owner
- **Owner Dashboard** — overview of inventory, carts, sales, and revenue
- **Add & edit items** — upload photos, set price, choose sale mode per item
- **Three sale modes:**
  - **Claim** — customer reserves at listed price
  - **Buy Now** — fixed price, add to cart
  - **Auction** — customers place bids
- **Sales & Payments** — see who bought what, on which day, paid or unpaid
- **Mark orders paid manually** (for cash/check pickup)
- **Customer list** — names, emails, phones, purchase history
- **Shop Settings** — shop name, welcome message, default sale mode, auction rules, pickup instructions

## Quick start (easiest — no Node installer needed)

This project uses the **portable Node** from your `north-country-detailer-finder` project automatically.

1. **First time only:** double-click **`setup.bat`**
   - Installs npm packages
   - Creates the database
   - Sets up `.env`

2. **Every time:** double-click **`dev.bat`**
   - Opens the shop at **http://localhost:3000**
   - Owner dashboard: **http://localhost:3000/admin**

**Owner login:** `owner@shop.com` / `owner123`

---

## Manual setup (if you prefer the terminal)

### 1. Install Node.js
Download and install [Node.js 20+](https://nodejs.org/) if you don't have it — or use portable Node via `setup-portable-node.ps1`.

### 2. Install dependencies
```bash
cd Consignment
npm install
```

### 3. Set up environment
```bash
copy .env.example .env
```
Edit `.env` and set at minimum:
- `NEXTAUTH_SECRET` — any long random string
- Stripe keys (optional for testing without payments — set "Require online payment" to No in settings)

### 4. Set up the database
```bash
npm run db:push
npm run db:seed
```

### 5. Run the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Default owner login
- **Email:** `owner@shop.com`
- **Password:** `owner123`

Change this password after first login (register a new owner account or update in the database).

## Stripe setup (for online payments)

1. Create a [Stripe account](https://stripe.com) and get test API keys
2. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
3. For local webhooks, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env`

Without Stripe, go to **Owner Dashboard → Shop Settings** and set **Require online payment** to **No**. Orders complete immediately at checkout.

## How the flow works

1. Owner uploads items with photos and sets how each one sells
2. Customer creates an account and browses the shop
3. Customer claims, buys, or bids — item goes into their cart
4. Customer opens **My Cart** and clicks **Pay Now**
5. After payment, items are marked **SOLD** and removed from available inventory
6. Owner sees the sale in **Sales & Payments** with customer name and paid status

## Project structure

```
src/
  app/
    shop/          # Customer browsing
    cart/          # Shopping cart & checkout
    account/       # Customer account & orders
    admin/         # Owner dashboard
    api/           # Backend APIs
  components/
    shop/          # Item cards, cart UI
    admin/         # Owner forms & nav
    ui/            # Buttons, inputs, cards
  lib/             # Database, auth, Stripe, utilities
prisma/
  schema.prisma    # Database models
  seed.ts          # Initial owner account & settings
```

## Tech stack

- **Next.js 15** — React framework with App Router
- **TypeScript** — type safety
- **Tailwind CSS** — styling
- **Prisma + SQLite** — database (easy local setup; switch to PostgreSQL for production)
- **NextAuth** — sign in / accounts
- **Stripe** — online payments

## Production deployment

For a live shop, consider:
- Deploy on [Vercel](https://vercel.com) or similar
- Switch database to PostgreSQL (update `DATABASE_URL` in Prisma)
- Use cloud storage for photos (S3, Cloudinary) instead of local `/public/uploads`
- Set strong `NEXTAUTH_SECRET` and owner password
- Use Stripe live keys

## License

Private — for your consignment business.
