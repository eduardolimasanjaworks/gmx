import fs from 'fs';
const data = JSON.parse(fs.readFileSync('driver_fields.json', 'utf8'));
console.log("FIELDS:", data.map(f => f.field).join(', '));
