
import fetch from 'node-fetch';

const URL = "http://91.99.137.101:8057";
const TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

async function fetchDirectusData() {
  try {
    const headers = { 
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    };

    // 1. Fetch Collections
    console.log("Fetching Collections...");
    const collectionsRes = await fetch(`${URL}/collections`, { headers });
    const collectionsData = await collectionsRes.json();
    const collections = collectionsData.data.filter(c => !c.collection.startsWith('directus_'));

    // 2. Fetch Fields
    console.log("Fetching Fields...");
    const fieldsRes = await fetch(`${URL}/fields`, { headers });
    const fieldsData = await fieldsRes.json();
    const fields = fieldsData.data;

    // 3. Fetch Relations
    console.log("Fetching Relations...");
    const relationsRes = await fetch(`${URL}/relations`, { headers });
    const relationsData = await relationsRes.json();
    const relations = relationsData.data;

    // Report
    console.log("\n--- DIRECTUS SCHEMA AUDIT ---\n");
    
    // Check key collections
    const expectedCollections = ['drivers', 'embarques', 'vehicle_matches', 'operational_alerts', 'driver_field_config'];
    
    for (const name of expectedCollections) {
      const exists = collections.find(c => c.collection === name);
      console.log(`Collection '${name}': ${exists ? 'EXISTS' : 'MISSING'}`);
      
      if (exists) {
        const colFields = fields.filter(f => f.collection === name).map(f => f.field);
        console.log(`  Fields: ${colFields.join(', ')}`);
      }
    }

    // List ALL user collections to start
    console.log("\nALL USER COLLECTIONS:");
    collections.forEach(c => console.log(`- ${c.collection}`));

  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

fetchDirectusData();
