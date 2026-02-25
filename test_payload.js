import fetch from 'node-fetch';

const directusUrl = 'http://91.99.137.101:8057';
const token = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function req(path, method, body) {
    const res = await fetch(`${directusUrl}${path}?access_token=${token}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) {
        console.error(JSON.stringify(data.errors, null, 2));
        throw new Error("Failed");
    }
    return data;
}

async function main() {
    console.log("Teste payload com meta...");
    try {
        await req(`/fields/follow`, 'POST', {
            field: "origem_lat",
            type: "float",
            meta: { interface: "input" }
        });
        console.log("Sucesso part 1!");
    } catch (e) {
        console.log("Falhou part 1.", e.message);
    }
}
main();
