// Run manually before an approved deployment. Never prints secret material.
const fs = require('node:fs');
const crypto = require('node:crypto');
const pair = crypto.createECDH('prime256v1'); pair.generateKeys();
const email = process.argv[2];
if (!email || !/^[^\s@]+@[^\s@]+$/.test(email)) throw new Error('Usage: node scripts/generate-vapid-secret.cjs your-contact@example.com');
fs.mkdirSync('work', { recursive: true });
fs.writeFileSync('work/vapid-secret.json', JSON.stringify({ publicKey: pair.getPublicKey().toString('base64url'), privateKey: pair.getPrivateKey().toString('base64url'), subject: 'mailto:' + email }), { flag: 'wx', mode: 0o600 });
console.log('Saved work/vapid-secret.json. Upload it as a Cloudflare encrypted secret; never commit or share it.');
