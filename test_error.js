import fetch from 'node-fetch';
import fs from 'fs';

const directusUrl = 'http://91.99.137.101:8057';
const token = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function main() {
    console.log("Teste profundo...");
    const res = await fetch(`${directusUrl}/fields/follow?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: "origem_lat", type: "float", meta: { interface: "input" } })
    });

    if (!res.ok) {
        const errorData = await res.json();
        fs.writeFileSync('directus_error.json', JSON.stringify(errorData, null, 2));
        console.log("Erro gravado em directus_error.json");
    } else {
        console.log("Sucesso!");
    }
}
main();
