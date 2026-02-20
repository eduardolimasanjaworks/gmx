const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

// Fetch the most recently created embarque with ALL fields
const res = await fetch(`${URL}/items/embarques/738?fields=*`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
});
const data = await res.json();
console.log(JSON.stringify(data.data, null, 2));
