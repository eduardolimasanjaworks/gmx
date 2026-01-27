
import axios from 'axios';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

async function grantRaw() {
    try {
        console.log("Granting permissions via raw HTTP...");
        const response = await axios.post(`${DIRECTUS_URL}/permissions`, {
            role: null, // Public
            collection: "disponivel",
            action: "create",
            fields: ["*"],
            permissions: {},
            validation: {}
        }, {
            headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` }
        });

        console.log("✅ Success:", response.data);
    } catch (e) {
        console.error("❌ Error:", e.response?.data || e.message);
    }
}

grantRaw();
