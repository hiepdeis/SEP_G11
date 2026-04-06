const fs = require('fs');
const code = fs.readFileSync('app/(protected)/purchasing/purchase-orders/[id]/page.tsx', 'utf-8');
const matches = [...code.matchAll(/t\(\s*["']([\s\S]*?)["']\s*\)/g)].map(m => m[1].replace(/\n\s*/g, ' '));
const en = JSON.parse(fs.readFileSync('public/locales/en/translation.json', 'utf-8'));
const vi = JSON.parse(fs.readFileSync('public/locales/vi/translation.json', 'utf-8'));
const missing = matches.filter(m => !en[m] || !vi[m]);
console.log(JSON.stringify([...new Set(missing)], null, 2));
