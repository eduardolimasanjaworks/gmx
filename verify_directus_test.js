import { createDirectus, rest, readItems, staticToken } from '@directus/sdk';

const url = "http://91.99.137.101:8057";
const token = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(url)
  .with(staticToken(token))
  .with(rest());

async function checkEmbarques() {
  try {
    console.log(`Connecting to ${url}...`);
    const embarques = await client.request(readItems('embarques', { limit: 5 }));
    console.log("Successfully connected!");
    console.log(`Found ${embarques.length} embarques.`);
    if (embarques.length > 0) {
      console.log("Sample embarque:", JSON.stringify(embarques[0], null, 2));
    }
  } catch (error) {
    console.error("Error fetching embarques:", error.message);
    if (error.errors) {
      console.error("Details:", JSON.stringify(error.errors, null, 2));
    }
  }
}

checkEmbarques();
