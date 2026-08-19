// Heuristiky jsou až poslední záchranná síť za kontrolou původu a tokenem.
// Držíme je záměrně konzervativní — ztracená skutečná poptávka je horší
// než spam, který projde.

const CYRILLIC = /[Ѐ-ӿ]/;
const LINK     = /(https?:\/\/|www\.|\[url|\[link|<a\s)/gi;
const KEYWORDS = /\b(viagra|cialis|casino|crypto|bitcoin|backlink|seo\s+services|payday\s+loan|escort|porn)\b/i;

/**
 * Vrací pole důvodů, proč zprávu považujeme za spam.
 * Prázdné pole = propustit.
 */
export function spamReasons({ name = '', organization = '', message = '' }) {
    const reasons = [];

    // Jediné slovo bez mezer jako celá poptávka — typicky náhodný řetězec
    // ("GsteYbpkDELffKMmFQP"). Skutečná poptávka takhle nevypadá.
    if (message.length >= 10 && !/\s/.test(message)) reasons.push('gibberish');

    if (KEYWORDS.test(message) || KEYWORDS.test(name)) reasons.push('keywords');

    // Měkčí signály — samy o sobě neblokují
    const soft = [];
    if (name && organization && name.trim().toLowerCase() === organization.trim().toLowerCase()) {
        soft.push('name_equals_org');
    }
    if ((message.match(LINK) || []).length >= 2) soft.push('links');
    if (CYRILLIC.test(message) || CYRILLIC.test(name)) soft.push('cyrillic');

    if (soft.length >= 2) reasons.push(...soft);
    return reasons;
}

/** Povolené zdroje POST požadavku. Bot střílející přímo na endpoint hlavičku nemá. */
export function originAllowed(req) {
    const origin  = req.headers.origin;
    const referer = req.headers.referer;

    let host;
    try {
        host = new URL(origin || referer || '').host;
    } catch {
        return false;               // ani Origin, ani Referer → zamítnout
    }

    if (host === 'www.spfgroup.org' || host === 'spfgroup.org') return true;

    // Náhledová nasazení a lokální vývoj — nikdy ne v produkci
    if (process.env.VERCEL_ENV !== 'production') {
        if (host.endsWith('.vercel.app')) return true;
        if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) return true;
    }
    return false;
}

// Omezení počtu odeslání z jedné IP. Serverless instance jsou krátkodobé,
// takže tohle nezachytí vše — ale utne dávku poslanou v jedné vlně.
const hits = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export function rateLimited(ip, now = Date.now()) {
    if (!ip) return false;
    const fresh = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
    if (fresh.length >= MAX_PER_WINDOW) {
        hits.set(ip, fresh);
        return true;
    }
    fresh.push(now);
    hits.set(ip, fresh);
    if (hits.size > 500) hits.clear();   // pojistka proti růstu paměti
    return false;
}
