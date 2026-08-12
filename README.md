# spfgroup

Statický web SPF Group (HTML/CSS/JS bez build kroku) doplněný o jednu serverless
funkci pro kontaktní formulář.

## Struktura

- `index.html`, `sekce-*.html`, `ref-*.html`, `blog-*.html` — stránky
- `style.css`, `script.js`, `translations.js` — styly, chování, i18n (CS/EN/DE)
- `api/kontakt.js` — serverless funkce, která přijme poptávku a odešle ji e-mailem
- `scripts/dev-server.mjs` — lokální náhrada `vercel dev` pro vývoj bez Vercel CLI

## Kontaktní formulář

Formulář v `index.html` odesílá JSON na `/api/kontakt`. Funkce zvaliduje vstup,
odfiltruje boty honeypot polem `website` a odešle e-mail přes [Resend](https://resend.com)
s HTML šablonou v barvách webu. `Reply-To` je nastaven na adresu odesílatele,
takže na poptávku lze odpovědět přímo z e-mailového klienta.

### Proměnné prostředí

| Proměnná | Povinná | Výchozí | Popis |
|---|---|---|---|
| `RESEND_API_KEY` | ano | — | Klíč z https://resend.com/api-keys |
| `MAIL_TO` | ne | `info@spfgroup.org` | Kam chodí poptávky |
| `MAIL_FROM` | ne | `Web SPF Group <web@spfgroup.org>` | Odesílatel; doména musí být ověřená v Resendu |

Vzor je v `.env.example`. Ve Vercelu se nastavují v **Project Settings → Environment Variables**.

### Nasazení na Vercel

Projekt nevyžaduje build. Vercel automaticky obslouží soubory v kořeni jako statický
web a `api/*.js` jako Node funkce (framework preset: *Other*, build command prázdný).

Aby e-maily odcházely z vlastní domény, je potřeba v Resendu ověřit `spfgroup.org`
přidáním DNS záznamů (SPF a DKIM). **Bez ověřené domény Resend nedovolí odeslat
poptávku na `info@spfgroup.org`** — nechá vás posílat jen na adresu, kterou je
registrovaný účet, a jen z `onboarding@resend.dev`.

### Lokální vývoj

```bash
npm install
RESEND_API_KEY=re_xxx npm run dev:local   # http://localhost:8934
```

Případně `npm run dev` (vyžaduje nainstalované a přihlášené Vercel CLI).
