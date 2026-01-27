
const DIRECTUS_URL = 'http://91.99.137.101:8057';

async function checkFailures() {
    const checks = [
        { table: 'embarques', field: 'date_created' },
        { table: 'operational_alerts', field: 'date_created' },
        { table: 'disponivel', field: 'date_created' }
    ];

    for (const check of checks) {
        const response = await fetch(`${DIRECTUS_URL}/items/${check.table}?fields=${check.field}&limit=1`);
        if (!response.ok) {
            console.log(`❌ FALHA em [${check.table}]: O campo '${check.field}' ainda está bloqueado (403).`);
        } else {
            console.log(`✅ [${check.table}] OK.`);
        }
    }
}

checkFailures();
