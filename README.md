# bitwallet — Money, but chunkier.

The 128bit family's pixel wallet app. Landing page + working mock live at https://hootywhooo86.github.io/bitwallet/

## What it is

A chunky, tangible wallet for the 128bit family: visible balances, tappable cards, a transaction feed that reads like a story, and savings quests that pay XP into 128bitlife. The mock on the landing page does all of that (with sample money): send/request flows, card switching, and a "$50 saved this week" quest bar.

## Relationship to 128bitgold

128bitgold is the budget tracker (plans, categories, spending analysis). bitwallet is the wallet itself (balances, cards, moving money). They share the family feed: wallet transactions flow into gold's budgets automatically, and gold's goals become wallet savings quests.

## Architecture

- One 128bit account + the shared family event feed (`supabase/family-feed.sql` — same `family_events` schema as the rest of the family). Wallet emits `payment.sent` / `payment.received` / `savings.goal` events so gold and 128bitlife can subscribe.
- Landing page is a static mock only; the real app build is Carlos's lane (see below).

## Open product questions (Daniel's call)

- **What does it hold?** Fiat only, or crypto too? (Rocky recommends fiat first — crypto adds regulatory and custody headaches.)
- **Real money or tracker?** Does it move real money (bank connections, cards), or track balances manually? Bank sync (e.g. Plaid) is paywalled in the gold plan — same call here.
- **Family wallet:** shared household pots (trips, gifts, pizza fund), or strictly per-account?
- **Cards:** virtual cards in-app, or just a view over existing bank cards?
- **Security:** PIN, biometrics, spending limits for kids' accounts?
- **Platform:** iOS/Android/both, native build or wrapped web app?

## The app (`app/`)

Live at https://hootywhooo86.github.io/bitwallet/app/ (installable PWA, works offline, data stays on the device).

- **WALLET**: your payment cards as chunky pixel cards (nickname, network, last 4 only, never the full number or CVV), per-card spending this month vs an optional limit, default card, this month's spending vs the same point last month, money in, net.
- **⚡ PAY**: pick a card, enter amount + where, and the purchase is logged and auto-categorized (it learns when you correct a category).
- **SPENDING**: every purchase grouped into **monthly dropdowns**. Each month shows its total, change vs the previous month and a pixel bar of where the money went, then **category sections** (Groceries, Dining, Gas, Shopping, Bills, Subscriptions, Transport, Entertainment, Health, Travel, Other, Money in), each its own dropdown with its transactions. Filter by card or category, set monthly budgets per category (bars go red when over), import a bank CSV, export CSV.
- **PASSES**: loyalty, membership and gift cards with a scannable Code 128 barcode.
- Starts with sample data (one tap to clear).

### About "pay for everything"

Real tap-to-pay like Google Wallet needs a native Android app using NFC host card emulation **plus** a card-tokenization deal with Visa/Mastercard through an issuer or a provider (e.g. Stripe Issuing, Marqeta). A web page can't do NFC payments. So today you pay with your physical card and bitwallet logs it in one tap. Bank auto-sync (Plaid, etc.) would fill the dropdowns without manual entry. Both need a backend and are the next big decisions.

## Android app

`android/` wraps the same web app with [Capacitor](https://capacitorjs.com) as an offline Android app (everything bundled, no internet needed). GitHub Actions builds the APK on every push (`.github/workflows/android.yml`); pushes to `main` publish it at https://github.com/Hootywhooo86/bitwallet/releases/tag/android-latest. Open that page on your phone, download `bitwallet.apk`, and allow installs from your browser. Later builds install over the old one and keep your data.

- Build it yourself: `npm ci && npx cap sync android && cd android && ./gradlew assembleDebug` (JDK 21 + Android SDK). `tools/make_icons.py` regenerates the pixel icons.
- The app keeps its own saved data, separate from the browser version, and the "use on every 128bit app" colour switch can't reach across separate Android apps.
- Signed with `android/app/sideload.keystore`, a key committed to the repo for sideloading. A Play Store release needs a private key kept out of the repo.

## Status

- Landing page: live, links to the app.
- App: v1 working (`app/index.html`) as a wallet + spending tracker; NFC payments and bank sync not built (see above).
