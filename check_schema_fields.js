import { createDirectus, rest, readFieldsByCollection, staticToken } from '@directus/sdk';
import fs from 'fs';
const client = createDirectus('http://91.99.137.101:8057').with(staticToken('WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq')).with(rest());
client.request(readFieldsByCollection('cadastro_motorista')).then(fields => {
  fs.writeFileSync('driver_fields.json', JSON.stringify(fields, null, 2));
});
