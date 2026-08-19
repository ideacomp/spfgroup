import { createHmac, timingSafeEqual } from 'node:crypto';

// Token podepsaný na serveru dokazuje, že klient skutečně načetl stránku
// a spustil JavaScript. Spamboti posílají POST rovnou na endpoint, takže
// si token nikdy nevyzvednou — a bez platného podpisu neprojdou.
// Stavově nic neukládáme, ověření stojí na HMAC podpisu.

const TTL_MS     = 12 * 60 * 60 * 1000;  // token platí půl dne
const MIN_AGE_MS = 2000;                 // člověk formulář nevyplní za 2 s

function secret() {
    // FORM_SECRET je preferovaný; fallback drží funkci provozuschopnou,
    // kdyby proměnná chyběla (bez něj by neprošlo vůbec nic).
    return process.env.FORM_SECRET || process.env.RESEND_API_KEY || 'dev-secret';
}

function sign(ts) {
    return createHmac('sha256', secret()).update(ts).digest('base64url');
}

export function issueToken(now = Date.now()) {
    const ts = String(now);
    return `${ts}.${sign(ts)}`;
}

/** Vrací null když je token v pořádku, jinak důvod zamítnutí. */
export function verifyToken(token, now = Date.now()) {
    if (typeof token !== 'string' || !token) return 'missing';

    const dot = token.indexOf('.');
    if (dot < 1) return 'malformed';

    const ts  = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    if (!/^\d+$/.test(ts)) return 'malformed';

    const expected = Buffer.from(sign(ts));
    const given    = Buffer.from(sig);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return 'bad_signature';
    }

    const age = now - Number(ts);
    if (age < MIN_AGE_MS) return 'too_fast';
    if (age > TTL_MS)     return 'expired';
    return null;
}
