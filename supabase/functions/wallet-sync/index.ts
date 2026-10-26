// bitwallet cloud backup: keeps an exact copy of this device's purchases in wallet_txs.
// Same device-key scheme as wallet-plaid: only the SHA-256 of the key is stored.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const clip = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const key = String(body.device_key || '');
    if (!/^[a-f0-9]{64}$/.test(key)) return json({ error: 'Missing device key', code: 'BAD_KEY' }, 401);
    const owner = await sha256(key);

    if (body.action === 'replace') {
      const txs = Array.isArray(body.txs) ? body.txs.slice(0, 20000) : [];
      const stamp = new Date().toISOString();
      const rows = txs
        .filter((t: any) => t && t.id && /^\d{4}-\d{2}-\d{2}$/.test(String(t.date)) && isFinite(+t.amt))
        .map((t: any) => ({
          owner_hash: owner, id: clip(t.id, 80)!, date: t.date, amt: Math.round(+t.amt * 100) / 100,
          merchant: clip(t.merchant, 120) || '', cat: clip(t.cat, 30) || 'other',
          card_name: clip(t.card_name, 60), card_last4: clip(t.card_last4, 4), note: clip(t.note, 200), source: clip(t.source, 20),
          updated_at: stamp,
        }));
      for (let i = 0; i < rows.length; i += 1000) {
        const { error } = await db.from('wallet_txs').upsert(rows.slice(i, i + 1000), { onConflict: 'owner_hash,id' });
        if (error) throw error;
      }
      // Anything this device no longer has (deleted or edited away) wasn't touched above, so it's older than this sync.
      const { error: e2, count } = await db.from('wallet_txs').delete({ count: 'exact' }).eq('owner_hash', owner).lt('updated_at', stamp);
      if (e2) throw e2;
      return json({ ok: true, saved: rows.length, removed: count ?? 0 });
    }
    if (body.action === 'wipe') {
      const { error } = await db.from('wallet_txs').delete().eq('owner_hash', owner);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
});
