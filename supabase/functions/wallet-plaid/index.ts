// bitwallet ⇄ Plaid bridge.
// The app never sees a Plaid secret or a bank access token. Each device holds a
// random "device key"; we store only its SHA-256 hash as the owner of a link.
// Secrets (set in Supabase → Edge Functions → Secrets): PLAID_CLIENT_ID,
// PLAID_SECRET, PLAID_ENV (sandbox | production), optional PLAID_REDIRECT_URI.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

class PlaidError extends Error {
  constructor(msg: string, public code = 'PLAID_ERROR', public status = 502) { super(msg); }
}

async function plaid(path: string, body: Record<string, unknown>) {
  const client_id = Deno.env.get('PLAID_CLIENT_ID'), secret = Deno.env.get('PLAID_SECRET');
  if (!client_id || !secret) {
    throw new PlaidError('Plaid keys are not set up yet. Add PLAID_CLIENT_ID and PLAID_SECRET in Supabase secrets.', 'NOT_CONFIGURED', 503);
  }
  const env = (Deno.env.get('PLAID_ENV') || 'sandbox').toLowerCase();
  const host = env === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';
  const r = await fetch(host + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id, secret, ...body }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (data.error_code === 'ITEM_LOGIN_REQUIRED') throw new PlaidError('Your bank needs you to sign in again. Unlink and link it again.', data.error_code, 409);
    throw new PlaidError(data.display_message || data.error_message || `Plaid error (${r.status})`, data.error_code || 'PLAID_ERROR');
  }
  return data;
}

async function ownLink(owner: string, id: string) {
  const { data, error } = await db.from('wallet_bank_links').select('*').eq('id', id).eq('owner_hash', owner).maybeSingle();
  if (error) throw error;
  if (!data) throw new PlaidError('That link was not found on this device.', 'NOT_FOUND', 404);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const key = String(body.device_key || '');
    if (!/^[a-f0-9]{64}$/.test(key)) return json({ error: 'Missing device key', code: 'BAD_KEY' }, 401);
    const owner = await sha256(key);

    switch (body.action) {
      case 'link_token': {
        const redirect = Deno.env.get('PLAID_REDIRECT_URI');
        const r = await plaid('/link/token/create', {
          client_name: 'bitwallet',
          user: { client_user_id: owner.slice(0, 32) },
          products: ['transactions'],
          transactions: { days_requested: 730 },
          country_codes: ['US', 'CA'],
          language: 'en',
          ...(redirect ? { redirect_uri: redirect } : {}),
        });
        return json({ link_token: r.link_token });
      }
      case 'exchange': {
        const pt = String(body.public_token || '');
        if (!pt.startsWith('public-')) return json({ error: 'Bad public token' }, 400);
        const r = await plaid('/item/public_token/exchange', { public_token: pt });
        const institution = String(body.institution || 'Bank').slice(0, 80);
        const { data, error } = await db.from('wallet_bank_links')
          .upsert({ owner_hash: owner, item_id: r.item_id, access_token: r.access_token, institution }, { onConflict: 'item_id' })
          .select('id, institution, created_at, last_synced').single();
        if (error) throw error;
        return json({ link: data });
      }
      case 'list': {
        const { data, error } = await db.from('wallet_bank_links')
          .select('id, institution, created_at, last_synced').eq('owner_hash', owner).order('created_at');
        if (error) throw error;
        return json({ links: data });
      }
      case 'sync': {
        const link = await ownLink(owner, String(body.link_id || ''));
        let cursor = body.cursor ? String(body.cursor) : undefined;
        const added: unknown[] = [], modified: unknown[] = [], removed: unknown[] = [];
        let accounts: unknown[] = [];
        for (let page = 0; page < 20; page++) {
          const r = await plaid('/transactions/sync', { access_token: link.access_token, count: 500, ...(cursor ? { cursor } : {}) });
          added.push(...r.added); modified.push(...r.modified); removed.push(...r.removed);
          accounts = r.accounts || accounts;
          cursor = r.next_cursor;
          if (!r.has_more) break;
        }
        await db.from('wallet_bank_links').update({ cursor, last_synced: new Date().toISOString() }).eq('id', link.id);
        const slim = (t: any) => ({
          transaction_id: t.transaction_id, account_id: t.account_id, amount: t.amount,
          iso_currency_code: t.iso_currency_code, date: t.date, authorized_date: t.authorized_date,
          name: t.name, merchant_name: t.merchant_name, pending: t.pending,
          category: t.personal_finance_category?.primary || null,
          detailed: t.personal_finance_category?.detailed || null,
        });
        return json({
          cursor, added: added.map(slim), modified: modified.map(slim),
          removed: removed.map((t: any) => t.transaction_id),
          accounts: accounts.map((a: any) => ({ account_id: a.account_id, name: a.name, official_name: a.official_name, mask: a.mask, type: a.type, subtype: a.subtype })),
        });
      }
      case 'unlink': {
        const link = await ownLink(owner, String(body.link_id || ''));
        try { await plaid('/item/remove', { access_token: link.access_token }); } catch (_) { /* still forget it locally */ }
        await db.from('wallet_bank_links').delete().eq('id', link.id);
        return json({ ok: true });
      }
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (e) {
    if (e instanceof PlaidError) return json({ error: e.message, code: e.code }, e.status);
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
});
