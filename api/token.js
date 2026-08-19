import { issueToken } from '../lib/token.js';

// Vydá krátkodobý podepsaný token pro odeslání formuláře.
// Stránka si ho vyzvedne při načtení, bot posílající POST naslepo ne.
export default function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ token: issueToken() });
}
