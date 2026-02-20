// Insert one test embarque and print what comes back
const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

const payload = {
    status: 'new',
    pedido: 'TEST-001',
    origin: 'F. LAGES',
    destination: 'BALL RECIFE',
    nome_tp: 'CARGO X',
    produto: 'TESTE 1',
    uf_destino: 'PE',
    client_name: 'Amostra Cliente GMX'
};

const res = await fetch(`${URL}/items/embarques`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});

const data = await res.json();
console.log('Created embarque:', JSON.stringify(data.data, null, 2));
console.log('Status:', res.status);
if (data.errors) console.log('Errors:', JSON.stringify(data.errors, null, 2));
