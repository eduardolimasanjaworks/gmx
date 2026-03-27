import { createDirectus, rest, readFields, staticToken } from '@directus/sdk';
const directusUrl = 'http://91.99.137.101:8057';
const ADMIN_TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';
const client = createDirectus(directusUrl).with(staticToken(ADMIN_TOKEN)).with(rest());

async function run() {
  const fields = await client.request(readFields('cadastro_motorista'));
  const f = fields.find(x => x.field === 'status');
  console.log("STATUS FIELD SCHEMA:", JSON.stringify(f, null, 2));
}
run();
