## cardlol

Wallet is the product.  
The web app is a thin control panel.

### Routes

- **`/`**: landing (unchanged)
- **`/design`**: create meme/streak pass (no login required)
- **`/my`**: my passes (device-local anon, account-wide when logged in)
- **`/club/[slug]`**: club membership issuance + activation
- **`/p/[passId]/apple.pkpass`**: Apple Wallet `.pkpass` download (signed, if configured)
- **`/p/[passId]/google`**: Google Wallet “Save” link (JWT, if configured)

### Supabase setup

- **Create a project**
- **Run schema**: paste `supabase/schema.sql` into Supabase SQL editor
- **Storage bucket**: create a bucket named **`uploads`**
  - Keep it **private**. We use signed URLs for Google hero images (only when permanent).

### Env

Copy `.env.example` → `.env.local` and fill:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Uploads kill switch**: `ENABLE_IMAGE_UPLOADS`
- **Apple Wallet** (real `.pkpass` installs): `APPLE_*`
- **Google Wallet** (Save-to-Wallet): `GOOGLE_WALLET_*`

Apple streak updates (optional, real Wallet updates):

- Set `PUBLIC_BASE_URL`
- Configure `APPLE_APNS_*`
- Hit `POST /api/cron/streaks` with `Authorization: Bearer $CRON_SECRET`

### Clubs

Add a club row in Supabase:

- **slug**: `my-club`
- **name**: `My Club`
- **expiry_date**: `2026-12-31`
- **activation_code_hash**: SHA-256 hex of the activation code

Example:

```sql
insert into public.clubs (slug, name, expiry_date, activation_code_hash)
values (
  'my-club',
  'My Club',
  '2026-12-31',
  encode(digest('SECRET-CODE', 'sha256'), 'hex')
);
```

### Dev

```bash
npm install
npm run dev
```
