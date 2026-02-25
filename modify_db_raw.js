import fetch from 'node-fetch'; // No need in node 18+, but using global fetch if possible
import fs from 'fs';

const directusUrl = 'http://91.99.137.101:8057';
const token = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function req(path, method, body) {
    const res = await fetch(`${directusUrl}${path}?access_token=${token}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(JSON.stringify(data.errors));
    }
    return data;
}

async function createField(collection, fieldObj) {
    try {
        await req(`/fields/${collection}`, 'POST', fieldObj);
        console.log(`✅ Campo ${fieldObj.field} criado em ${collection}`);
    } catch (e) {
        console.log(`⚠️ Campo ${fieldObj.field} em ${collection}:`, e.message);
    }
}

async function createCollection(collectionObj) {
    try {
        await req(`/collections`, 'POST', collectionObj);
        console.log(`✅ Coleção ${collectionObj.collection} criada`);
    } catch (e) {
        console.log(`⚠️ Coleção ${collectionObj.collection}:`, e.message);
    }
}

async function createRelation(relationObj) {
    try {
        await req(`/relations`, 'POST', relationObj);
        console.log(`✅ Relação ${relationObj.field} criada`);
    } catch (e) {
        console.log(`⚠️ Relação ${relationObj.field}:`, e.message);
    }
}

async function main() {
    console.log("=== INICIANDO CRIAÇÃO DE ESTRUTURAS DB ===");

    // 1. Follow Fields
    await createField('follow', { field: 'origem_lat', type: 'float', meta: { interface: 'input' } });
    await createField('follow', { field: 'origem_lng', type: 'float', meta: { interface: 'input' } });
    await createField('follow', { field: 'destino_lat', type: 'float', meta: { interface: 'input' } });
    await createField('follow', { field: 'destino_lng', type: 'float', meta: { interface: 'input' } });

    // 2. Coleção locais_salvos
    await createCollection({
        collection: 'locais_salvos',
        meta: { icon: 'map', display_template: '{{nome}}' },
        schema: { name: 'locais_salvos' },
        fields: [
            { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
            { field: 'nome', type: 'string', meta: { interface: 'input' } },
            { field: 'latitude', type: 'float', meta: { interface: 'input' } },
            { field: 'longitude', type: 'float', meta: { interface: 'input' } },
            { field: 'icone', type: 'string', meta: { interface: 'input', default_value: 'map-pin' } },
            { field: 'usuario_id', type: 'uuid', meta: { interface: 'input' } }
        ]
    });

    // Relação M2O para locais_salvos
    await createRelation({
        collection: 'locais_salvos',
        field: 'usuario_id',
        related_collection: 'directus_users'
    });

    // 3. Coleção historico_localizacao
    await createCollection({
        collection: 'historico_localizacao',
        meta: { icon: 'history' },
        schema: { name: 'historico_localizacao' },
        fields: [
            { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
            { field: 'motorista_id', type: 'integer', meta: { interface: 'input' } },
            { field: 'latitude', type: 'float', meta: { interface: 'input' } },
            { field: 'longitude', type: 'float', meta: { interface: 'input' } },
            { field: 'velocidade_estimada', type: 'float', meta: { interface: 'input' } },
            { field: 'date_created', type: 'timestamp', meta: { special: ['cast-timestamp'] } }
        ]
    });

    // Relação M2O para historico_localizacao
    await createRelation({
        collection: 'historico_localizacao',
        field: 'motorista_id',
        related_collection: 'motoristas'
    });

    console.log("=== FIM DA CRIAÇÃO ===");
}

main();
