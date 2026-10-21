const fs = require('fs');
const f = 'frontend/src/app/page.tsx';
let s = fs.readFileSync(f, 'utf8');
s = s.replace(/'http:\/\/localhost:8000([^']*)'/g, '`${API}$1`');
s = s.split('http://localhost:8000').join('${API}');
s = s.replace("'use client';", "'use client';\n\nconst API = process.env.NEXT_PUBLIC_API ?? 'http://localhost:8000';");
fs.writeFileSync(f, s);