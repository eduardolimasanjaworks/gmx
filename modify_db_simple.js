import fetch from 'node-fetch';

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
        console.log(`⚠️ Erro criar campo ${fieldObj.field} em ${collection}: ${e.message}`);
    }
}

async function createCollection(collectionObj) {
    try {
        await req(`/collections`, 'POST', collectionObj);
        console.log(`✅ Coleção ${collectionObj.collection} criada`);
    } catch (e) {
        console.log(`⚠️ Erro criar coleção ${collectionObj.collection}: ${e.message}`);
    }
}

async function main() {
    await createField('follow', { field: 'origem_lat', type: 'float', meta: { interface: 'input' } });
    await createField('follow', { field: 'origem_lng', type: 'float', meta: { interface: 'input' } });
    await createField('follow', { field: 'destino_lat', type: 'float', meta: { interface: 'input' } });
    await createField('follow', { field: 'destino_lng', type: 'float', meta: { interface: 'input' } });

    // Simplest version of creating a collection
    await createCollection({
        collection: 'locais_salvos',
        meta: { icon: 'map', display_template: '{{nome}}' },
        fields: [
            { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
            { field: 'nome', type: 'string', meta: { interface: 'input' } },
            { field: 'latitude', type: 'float', meta: { interface: 'input' } },
            { field: 'longitude', type: 'float', meta: { interface: 'input' } },
            { field: 'icone', type: 'string', meta: { interface: 'input' } }
        ]
    });

    await createCollection({
        collection: 'historico_localizacao',
        meta: { icon: 'history' },
        fields: [
            { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
            { field: 'motorista_id', type: 'integer', meta: { interface: 'input' } },
            { field: 'latitude', type: 'float', meta: { interface: 'input' } },
            { field: 'longitude', type: 'float', meta: { interface: 'input' } },
            { field: 'velocidade_estimada', type: 'float', meta: { interface: 'input' } },
            { field: 'date_created', type: 'timestamp', meta: { special: ['cast-timestamp'] } }
        ]
    });
}
main();
