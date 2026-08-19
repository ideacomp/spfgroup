import { Resend } from 'resend';
import { verifyToken } from '../lib/token.js';
import { spamReasons, originAllowed, rateLimited } from '../lib/spam.js';

// Příjemce a odesílatel jsou konfigurovatelné přes env, ať se dají přepnout
// bez zásahu do kódu (např. při testování na jinou schránku).
const MAIL_TO   = process.env.MAIL_TO   || 'info@spfgroup.org';
const MAIL_FROM = process.env.MAIL_FROM || 'Web SPF Group <web@spfgroup.org>';

// Limity délky — chrání před zahlcením schránky i před náklady na odeslání.
const LIMITS = { name: 120, email: 200, organization: 200, message: 5000 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Barvy odpovídají :root proměnným ve style.css
const NAVY = '#0d1b3e';
const RED  = '#bc1d23';

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function buildHtml({ name, email, organization, message, receivedAt }) {
    const rows = [
        ['Jméno', escapeHtml(name)],
        ['E-mail', `<a href="mailto:${escapeHtml(email)}" style="color:${NAVY};text-decoration:underline">${escapeHtml(email)}</a>`],
        ['Organizace', organization ? escapeHtml(organization) : '<span style="color:#8892a4">neuvedeno</span>']
    ].map(([label, value]) => `
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #eef1f7;font-size:13px;color:#8892a4;width:120px;vertical-align:top">${label}</td>
                    <td style="padding:10px 0;border-bottom:1px solid #eef1f7;font-size:15px;color:#1a202c;font-weight:600">${value}</td>
                  </tr>`).join('');

    // Tabulkový layout a inline styly — jediné, co spolehlivě projde všemi
    // poštovními klienty (Outlook ignoruje <style> bloky i flex/grid).
    return `<!doctype html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

          <tr>
            <td style="background:${NAVY};padding:28px 32px">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-.4px">SPF&nbsp;Group</div>
              <div style="width:40px;height:3px;background:${RED};margin-top:10px"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 32px 8px">
              <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${RED}">Nová poptávka</div>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:${NAVY};font-weight:700">Z kontaktního formuláře na webu</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#8892a4">${escapeHtml(receivedAt)}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0">
              <div style="font-size:13px;color:#8892a4;margin-bottom:8px">Zpráva</div>
              <div style="background:#f5f7fa;border-left:3px solid ${RED};border-radius:0 6px 6px 0;padding:16px 18px;font-size:15px;line-height:1.65;color:#1a202c;white-space:pre-wrap">${escapeHtml(message)}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 32px">
              <a href="mailto:${escapeHtml(email)}" style="display:inline-block;background:${RED};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 26px;border-radius:6px">Odpovědět odesílateli</a>
              <p style="margin:14px 0 0;font-size:12px;color:#8892a4">Na tento e-mail můžete odpovědět přímo — odpověď dorazí na ${escapeHtml(email)}.</p>
            </td>
          </tr>

          <tr>
            <td style="background:#f5f7fa;padding:18px 32px;font-size:12px;color:#8892a4;line-height:1.6">
              SPF Group, s.r.o. · Bozděchova 99/6, 400 01 Ústí nad Labem<br>
              Automatická zpráva z kontaktního formuláře na <a href="https://www.spfgroup.org" style="color:#8892a4">www.spfgroup.org</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildText({ name, email, organization, message, receivedAt }) {
    return [
        'NOVÁ POPTÁVKA Z KONTAKTNÍHO FORMULÁŘE',
        receivedAt,
        '',
        `Jméno:      ${name}`,
        `E-mail:     ${email}`,
        `Organizace: ${organization || 'neuvedeno'}`,
        '',
        'Zpráva:',
        message,
        '',
        '--',
        'SPF Group, s.r.o. · www.spfgroup.org'
    ].join('\n');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ success: false, error: 'method_not_allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!body || typeof body !== 'object') {
        return res.status(400).json({ success: false, error: 'invalid_body' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

    // 1. vrstva — původ požadavku. Bot střílející rovnou na endpoint
    // nemá Origin ani Referer naší domény.
    if (!originAllowed(req)) {
        console.warn('[kontakt] zamítnuto: cizí původ', {
            ip, origin: req.headers.origin, referer: req.headers.referer
        });
        return res.status(403).json({ success: false, error: 'forbidden_origin' });
    }

    // 2. vrstva — honeypot. Pole je v DOM skryté, vyplní ho jen bot.
    // Tváříme se úspěšně, ať se nedozví, že byl odhalen.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
        console.warn('[kontakt] zamítnuto: honeypot', { ip });
        return res.status(200).json({ success: true });
    }

    // 3. vrstva — podepsaný token dokazuje, že klient načetl stránku
    // a spustil JS. Chybu vracíme poctivě, aby si ji prohlížeč mohl
    // opravit vyzvednutím nového tokenu a opakováním.
    const tokenError = verifyToken(body.token);
    if (tokenError) {
        console.warn('[kontakt] zamítnuto: token', { ip, duvod: tokenError });
        return res.status(400).json({ success: false, error: 'bad_token' });
    }

    if (rateLimited(ip)) {
        console.warn('[kontakt] zamítnuto: limit odeslání', { ip });
        return res.status(429).json({ success: false, error: 'rate_limited' });
    }

    const name         = String(body.name         || '').trim();
    const email        = String(body.email        || '').trim();
    const organization = String(body.organization || '').trim();
    const message      = String(body.message      || '').trim();

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'missing_fields' });
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ success: false, error: 'invalid_email' });
    }
    const tooLong = Object.entries(LIMITS)
        .find(([field, max]) => String(body[field] || '').length > max);
    if (tooLong) {
        return res.status(400).json({ success: false, error: 'too_long', field: tooLong[0] });
    }

    // 4. vrstva — obsahové heuristiky. Tiše zahazujeme, ať se bot nepoučí.
    const reasons = spamReasons({ name, organization, message });
    if (reasons.length) {
        console.warn('[kontakt] zamítnuto: obsah', { ip, duvody: reasons, name, email });
        return res.status(200).json({ success: true });
    }

    if (!process.env.RESEND_API_KEY) {
        console.error('[kontakt] chybí RESEND_API_KEY');
        return res.status(500).json({ success: false, error: 'not_configured' });
    }

    const receivedAt = new Intl.DateTimeFormat('cs-CZ', {
        dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Prague'
    }).format(new Date());

    const payload = { name, email, organization, message, receivedAt };

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: MAIL_FROM,
            to: [MAIL_TO],
            replyTo: email,
            subject: `Nová poptávka z webu — ${name}${organization ? ` (${organization})` : ''}`,
            html: buildHtml(payload),
            text: buildText(payload)
        });

        if (error) {
            console.error('[kontakt] Resend odmítl odeslání:', error);
            return res.status(502).json({ success: false, error: 'send_failed' });
        }

        console.log('[kontakt] odesláno, id:', data?.id);
        return res.status(200).json({ success: true, id: data?.id });
    } catch (err) {
        console.error('[kontakt] výjimka při odesílání:', err);
        return res.status(502).json({ success: false, error: 'send_failed' });
    }
}
