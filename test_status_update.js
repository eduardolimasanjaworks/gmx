import { createDirectus, rest, readItems, updateItem, staticToken } from '@directus/sdk';
import fs from 'fs';

const directusUrl = 'http://91.99.137.101:8057';
const ADMIN_TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';
const client = createDirectus(directusUrl).with(staticToken(ADMIN_TOKEN)).with(rest());

async function run() {
  try {
    // Pegar o primeiro motorista
    const items = await client.request(readItems('cadastro_motorista', { limit: 1 }));
    if (!items.length) return;
    const driverId = items[0].id;
    console.log("Motorista atual:", items[0].nome, "Status anterior:", items[0].status);
    
    // Tentar setar status = "CADASTRADO"
    const result = await client.request(updateItem('cadastro_motorista', driverId, { status: "CADASTRADO" }));
    console.log("Status apos update:", result.status);
    
    fs.writeFileSync('status_test_result.json', JSON.stringify({
      antes: items[0].status,
      depois: result.status,
      payload_enviado: "CADASTRADO",
      result
    }, null, 2));

  } catch (err) {
    console.error("ERRO!");
    fs.writeFileSync('status_test_result.json', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  }
}
run();
