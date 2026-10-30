# Stub

A receipt maker for the web. Edit a receipt in the browser, watch the preview update as you type, and download it as a PNG, JPEG, PDF or HTML file. Sign in with Google to keep every receipt you make and to get API keys, so your own code can make receipts too.

[Live site](https://stub.vedantagrw.com) · [Open the editor](https://stub.vedantagrw.com/app)

![Demo: typing a store name while the preview follows, stepping through the four templates, then choosing PDF and downloading](docs/demo.gif)

The full clip is in [docs/demo.mp4](docs/demo.mp4).

## Features

- Four templates: an itemised till receipt, a self-service order slip, a barcode slip and a ticket with a tear-off stub
- 78 generic logo marks to pick from, or upload your own
- Tax on top or included (VAT, GST), item discounts, tips, cash change and 28 currencies
- Barcodes and QR codes that scan
- Edit with a form or as JSON, checked as you type
- Signed in: every receipt saved as you edit, with a searchable history
- An HTTP API that takes the same payload as Receiptable
- Light and dark mode, and a key for every action (press `?`)

## Using the website

Signed out, you can make and download receipts. The receipt you're editing stays in this browser so a refresh loses nothing, but there's no history.

Signed in with Google:

- Receipts are saved to your account as you edit. There's nothing to remember to save.
- The Receipts panel on the right lists them with a preview. Open one to keep editing, or download, duplicate or delete it from there.
- Profile holds your API keys, and Delete account, which removes the account with every receipt and key.

Either way:

- Press ⌘S (Ctrl S on Windows and Linux) to download in the format on the Download button. Its menu picks PNG, JPEG, PDF or HTML, the resolution, copies the receipt as an image or exports its JSON.
- New starts the next receipt for the same store with the order number bumped, a blank one, the example, or one imported from JSON.
- Switch the editor panel from Form to JSON to edit the receipt as the JSON the API takes. Anything Stub would ignore, clamp or misread is flagged with its line, and the preview waits until it's valid.
- Keyboard: ⌘S download, `N` new, `F` format, `J` form or JSON, `H` receipts, `P` profile, `A` API, `D` dark mode, `1` to `4` templates, `+` `-` `0` zoom. `?` lists them all.

Files are made in your browser, never uploaded. Signed in, your receipts and a fingerprint of each API key are stored in the database, and only you can read them. The [privacy page](https://stub.vedantagrw.com/privacy) has the details.

## API

Sign in at [stub.vedantagrw.com](https://stub.vedantagrw.com), open Profile and create a key. The key is shown once, so copy it then. The API dialog shows the request for the receipt you're editing, as cURL, JavaScript or Python.

```sh
curl -X POST https://stub.vedantagrw.com/api/v1/receipt \
  -H 'Authorization: Bearer stub_...' \
  -H 'Content-Type: application/json' \
  -d '{
    "template": "default",
    "content": {
      "store": { "name": "Corner Bakery" },
      "currency": "inr",
      "items": [{ "name": "Croissant", "quantity": 2, "price": 120 }],
      "tax": { "rate": 5, "label": "GST" }
    }
  }' \
  -o receipt.html
```

The answer is the receipt as a standalone HTML page. For PNG, JPEG or PDF, open the receipt on the website and download it there, or turn the HTML into an image with any headless browser. `X-API-Key: <key>` and Receiptable's `X-AUTH-TOKEN: <key>` work in place of the Authorization header.

| Field | What it does |
|---|---|
| `template` | `default`, `self-service`, `barcode` or `ticket` |
| `content` | What gets printed: store, items, tax, payment, codes and messages |
| `style` | Font, sizes, colours, width in characters, and `"edge": "zigzag"` for torn edges |

Other endpoints:

- `GET /api/v1/receipt?template=ticket` returns an example of any template, no key needed.
- `GET /api/v1/templates` lists the templates.
- `GET /api/health` says whether the server is up and has accounts set up.

The payload matches [Receiptable](https://github.com/tom-draper/receiptable)'s, so its docs apply too.

### Limits

| Limit | |
|---|---|
| Requests per key | 30 a minute and 1,000 a day |
| Keys per person | 5 |
| Receipts per person | 1,000 |

Days reset at 00:00 UTC. Over a limit the API answers `429` with a `Retry-After` header, and every answer says what's left in `X-RateLimit-Remaining-Minute` and `X-RateLimit-Remaining-Day`.

## Running it locally

Requirements: Node 22.17 or newer. Accounts need a [Supabase](https://supabase.com) project; without one the app runs signed out only.

```sh
git clone https://github.com/Vedant-29/stub.git
cd stub
npm install
cp .dev.vars.example .dev.vars   # then fill it in, or leave it empty for signed out only
npm run dev
```

`npm run dev` serves http://localhost:4545 with hot reload, with Cloudflare's runtime emulated: the home page at `/` and the editor at `/app`. `npm run preview` builds the Worker and runs it on http://localhost:8787 exactly as it runs in production.

### Settings

| Name | What it is |
|---|---|
| `SUPABASE_URL` | Your Supabase project's URL |
| `SUPABASE_PUBLISHABLE_KEY` | Its publishable key. Public by design; it only reaches the Worker. |

Locally they go in `.dev.vars`, which git ignores. In production they're Worker secrets. There are no other secrets: the app never uses Supabase's secret key, so the database's row level security decides what every request can see.

## Hosting your own

1. Create a Supabase project, then `npx supabase link --project-ref <ref>` and `npx supabase db push`. That applies [`supabase/migrations`](supabase/migrations): the tables, their row level security, and the functions that make and check API keys.
2. In Google Cloud, create an OAuth client of type Web application with the redirect URI `https://<ref>.supabase.co/auth/v1/callback`. In Supabase, under Authentication: enable Google with that client's ID and secret, set the site URL to your domain, add `https://<your domain>/auth/callback` (and `http://localhost:4545/auth/callback` for local work) to the redirect URLs, and turn off email sign-in.
3. Change the custom domain under `routes` in `wrangler.jsonc`. Store the settings with `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_PUBLISHABLE_KEY`, then run `npm run deploy`.

Deploys run from your machine with wrangler. The repository has no deploy workflow, so pushing to it changes nothing live.

## How it works

- One SvelteKit app, running as a Cloudflare Worker. The home page, FAQ, privacy and terms are plain server-rendered HTML with no JavaScript; the editor at `/app` runs in the browser.
- The page only talks to the Worker. The Worker talks to Supabase as the signed-in person, with their session from cookies the page can't read, so the database's row level security applies to everything it does.
- The editor, preview and files all use the same renderer (`src/lib/receipt`), which turns a receipt into inline-styled HTML. Images and PDFs are drawn from that HTML in your browser.
- API keys are `stub_` plus 32 random bytes, made in the database. Only their SHA-256 is kept, so a lost key can't be recovered: revoke it and make a new one.

## Notes

- A PDF from Stub is an image of the receipt, so its text can't be selected.
- Downloaded HTML files load their font from Google Fonts, so they look the same anywhere. The editor and images use the fonts bundled in `static/fonts`.
- Logos given as a link may not appear in downloads, since the browser can't always fetch them. Upload the image instead.
- The logo marks are generic on purpose. There are no real brand logos.

## Credits

- [Receiptable](https://github.com/tom-draper/receiptable) by Tom Draper, which this is based on. Stub is a new implementation with no code copied (Receiptable is SSPL licensed), but its templates and API payload follow Receiptable's design.
- Logo marks are made from [Lucide](https://lucide.dev) icons (ISC).
- Receipt fonts come from Google Fonts through [Fontsource](https://fontsource.org), under the SIL Open Font License (see `static/fonts/licenses`). The interface is set in [Geist](https://vercel.com/font).
- Barcodes are encoded with [JsBarcode](https://github.com/lindell/JsBarcode) and QR codes with [node-qrcode](https://github.com/soldair/node-qrcode).

## License

MIT. See [LICENSE](LICENSE). The bundled fonts keep their own SIL Open Font License.
