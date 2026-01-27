
import http from 'http';
import fs from 'fs';

const CONFIG = {
    hostname: '91.99.137.101',
    port: 8057,
    path: '',
    headers: {
        'Authorization': 'Bearer 1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah'
    }
};

const fetchAndSave = (endpoint, filename) => {
    return new Promise((resolve, reject) => {
        const options = { ...CONFIG, path: endpoint };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                fs.writeFileSync(filename, data);
                console.log(`Saved ${filename}`);
                resolve(JSON.parse(data));
            });
        });
        req.on('error', reject);
        req.end();
    });
};

async function run() {
    try {
        console.log("Starting audit...");
        const collections = await fetchAndSave('/collections', 'collections.json');
        const fields = await fetchAndSave('/fields', 'fields.json');
        const relations = await fetchAndSave('/relations', 'relations.json');

        console.log("\n--- AUDIT RESULTS ---");
        const userCollections = collections.data.filter(c => !c.collection.startsWith('directus_'));
        console.log("Existing Collections:", userCollections.map(c => c.collection));

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
