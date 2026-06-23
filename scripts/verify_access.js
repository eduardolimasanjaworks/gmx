
const DIRECTUS_URL = "https://gmx.sanjaworks.com/api";
const TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE = "cadastro_motorista";

async function verifyAccess() {
    console.log("🔍 Diagnosing Access...");

    // Test 1: Public Access
    console.log("\n1️⃣ Testing PUBLIC access (No Token)...");
    try {
        const res = await fetch(`${DIRECTUS_URL}/items/${TABLE}?limit=1`);
        if (res.ok) {
            console.log("✅ Public Access: OK");
        } else {
            console.log(`❌ Public Access: FAILED (${res.status} ${res.statusText})`);
            const json = await res.json();
            console.log("   Reason:", JSON.stringify(json));
        }
    } catch (e) {
        console.log("❌ Public Access: Network Error", e.message);
    }

    // Test 2: Token Access
    console.log(`\n2️⃣ Testing ADMIN access (Token: ${TOKEN.slice(0, 5)}...)...`);
    try {
        const res = await fetch(`${DIRECTUS_URL}/items/${TABLE}?limit=1`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            }
        });
        if (res.ok) {
            console.log("✅ Admin Access: OK");
        } else {
            console.log(`❌ Admin Access: FAILED (${res.status} ${res.statusText})`);
            const json = await res.json();
            console.log("   Reason:", JSON.stringify(json));
        }
    } catch (e) {
        console.log("❌ Admin Access: Network Error", e.message);
    }
}

verifyAccess();
