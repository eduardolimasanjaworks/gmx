
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    // Handling optional quotes
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const url = env.VITE_DIRECTUS_URL;
const token = env.VITE_DIRECTUS_TOKEN;

console.log(`Checking ${url}...`);

async function inspect() {
    try {
        const response = await fetch(`${url}/fields/cadastro_motorista`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const json = await response.json();

        if (json.errors) {
            console.error('API Error:', JSON.stringify(json.errors, null, 2));
            return;
        }

        console.log('--- FIELDS ---');
        if (json.data) {
            json.data.forEach(f => {
                console.log(`- ${f.field} (${f.type})`);
            });
        } else {
            console.log('No data found');
        }

    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

inspect();
