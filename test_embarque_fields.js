const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

// Delete previous test record
await fetch(`${URL}/items/embarques/738`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` }
});

// Try writing nome_tp + produto + razao_social
const payload = {
    status: 'new',
    pedido: 'TEST-999',
    origin: 'F. LAGES',
    destination: 'BALL RECIFE',
    nome_tp: 'CARGO X',
    produto: 'TESTE 1',
    razao_social: 'CARGO X LTDA',
    uf_destino: 'PE'
};

const res = await fetch(`${URL}/items/embarques`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});

const data = await res.json();
const id = data.data?.id;

// Read it back  
const res2 = await fetch(`${URL}/items/embarques/${id}?fields=pedido,origin,destination,nome_tp,produto,razao_social,uf_destino`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
});
const data2 = await res2.json();
console.log('Saved fields:', JSON.stringify(data2.data, null, 2));
if (data2.errors) console.log('Errors:', JSON.stringify(data2.errors, null, 2));
