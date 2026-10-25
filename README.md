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

## Status

- Landing page + mock: live (coming-soon).
- Real app build: not started. Formspree ID still needed in the waitlist form (`YOUR_FORM_ID` placeholder with a local-confirm fallback).
