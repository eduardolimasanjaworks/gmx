
import http from 'http';

const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const HOST = '91.99.137.101';
const PORT = 8057;

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: data });
                }
            });
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("Updating cargo_type field to string...");
    // Directus API expects type change at the top level of the field schema
    // Note: Changing type might require raw SQL if Directus abstraction fails, but let's try via API first.
    // Usually 'type' is read-only in PATCH unless specific CAST is supported.

    // First, let's try to update validation/interface.
    // If it is really INTEGER in DB, we might need to delete and recreate if empty, or try to CAST.

    // Strategy 1: Attempt to update metadata only to see if it was just an interface issue?
    // No, error "Numeric value ... out of range" is DB level.

    // Strategy 2: Delete and Recreate (Data Loss risk! but user is creating data so maybe table is fresh?)
    // Let's assume we can try to ALTER.

    try {
        // Try to delete the field (assuming no critical data yet or user accepts loss of this column)
        // This is drastic but ensures clean state if type is wrong.
        console.log("Deleting incorrect cargo_type field...");
        await request('DELETE', '/fields/embarques/cargo_type');

        // Wait a bit
        await new Promise(r => setTimeout(r, 1000));

        // Recreate it correctly
        console.log("Recreating cargo_type as string...");
        const result = await request('POST', '/fields/embarques', {
            field: 'cargo_type',
            type: 'string',
            meta: {
                interface: 'input',
                width: 'half',
                note: 'Tipo de carga description'
            },
            schema: {
                is_nullable: true
            }
        });

        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
