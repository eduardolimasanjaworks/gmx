import fs from 'fs';

const schemaAnalysis = JSON.parse(fs.readFileSync('full_db_analysis.json', 'utf8'));

// User Requirements & Needs:
// 1. Separate driver location tracking from availability ("aqueles que só informaram que estão disponíveis e localização") -> Tabela `motoristas` com lat/lng e `disponivel` ?
// 2. See localizations of "Follow" loads -> Tabela `follow` tem campos de geolocalização ou precisamos cruzar com `embarques`?
// 3. Save manual locations globally -> Precisa de uma tabela `locais_salvos` ou `pontos_interesse`.
// 4. Save path history & speed -> Tabela `historico_localizacao` ou array em `motoristas`.

function checkFieldExists(collection, fieldMatch) {
    if (!schemaAnalysis[collection]) return false;
    return schemaAnalysis[collection].fields.some(f => typeof fieldMatch === 'string' ? f.field === fieldMatch : fieldMatch.test(f.field));
}

function verifyRequirement(name, checks) {
    console.log(`\n--- Requirement: ${name} ---`);
    let allPass = true;
    for (const check of checks) {
        if (!schemaAnalysis[check.collection]) {
            console.log(`❌ Collection missing: ${check.collection}`);
            allPass = false;
            break;
        }

        const hasFields = check.fields.map(f => ({
            field: f,
            exists: checkFieldExists(check.collection, f)
        }));

        const missing = hasFields.filter(f => !f.exists);
        if (missing.length > 0) {
            console.log(`❌ Sub-check failed for ${check.collection}. Missing: ${missing.map(m => m.field).join(', ')}`);
            allPass = false;
        } else {
            console.log(`✅ Sub-check passed for ${check.collection}.`);
        }
    }

    if (allPass) console.log(`👉 RESULT: ALL NECESSARY TABLES/FIELDS EXIST.`);
    else console.log(`👉 RESULT: MISSING TABLES OR FIELDS FOR THIS REQUIREMENT.`);
}

console.log("=== DB SCHEMA VERIFICATION REPORT ===\n");

verifyRequirement("1. Driver Status (Real-time vs Predicted)", [
    { collection: 'disponivel', fields: ['localizacao_atual', 'latitude', 'longitude', 'data_previsao_disponibilidade', 'local_disponibilidade', 'status'] },
    { collection: 'motoristas', fields: ['id', 'nome'] }
]);

verifyRequirement("2. Follow Loads Map Geolocations", [
    { collection: 'follow', fields: ['origem', 'destino'] },
    // Checking if follow has lat/lng or if we derive it from names.
    { collection: 'follow', fields: [/lat/, /lng/] } // Regex check
]);

verifyRequirement("3. Global Saved Points", [
    { collection: 'pontos_interesse', fields: ['nome', 'latitude', 'longitude'] } // Ou similar
]);

verifyRequirement("4. Driver Path History & Speed", [
    { collection: 'historico_localizacao', fields: ['motorista_id', 'latitude', 'longitude', 'velocidade', 'timestamp'] }
]);

