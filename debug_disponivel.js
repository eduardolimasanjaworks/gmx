// Check real disponivel records - full output
const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

const res = await fetch(`${URL}/items/disponivel?sort=-date_created&limit=3&fields=*`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
});
const data = await res.json();
console.log(JSON.stringify(data.data, null, 2));
