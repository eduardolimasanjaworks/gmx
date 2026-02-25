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
        console.error(`ERROR ON ${method} ${path}: \n`, JSON.stringify(data.errors, null, 2));
    }
    return data;
}

async function createField(collection, fieldObj) {
    try {
        await req(`/fields/${collection}`, 'POST', fieldObj);
        console.log(`✅ Campo ${fieldObj.field} criado em ${collection}`);
    } catch (e) {
    }
}

async function main() {
    console.log("=== FINAL DB SETUP ===");

    // Assegurar os campos (não vai quebrar se já existirem graças ao try/catch dentro de req)
    await createField('follow', { field: "origem_lat", type: "float", meta: { interface: "input" } });
    await createField('follow', { field: "origem_lng", type: "float", meta: { interface: "input" } });
    await createField('follow', { field: "destino_lat", type: "float", meta: { interface: "input" } });
    await createField('follow', { field: "destino_lng", type: "float", meta: { interface: "input" } });

    // Collection locais_salvos
    console.log("Criando locais_salvos...");
    await req('/collections', 'POST', {
        collection: "locais_salvos",
        meta: { icon: "map" },
        schema: { name: "locais_salvos" },
        fields: [
            { field: "id", type: "integer", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
            { field: "nome", type: "string", meta: { interface: "input" } },
            { field: "latitude", type: "float", meta: { interface: "input" } },
            { field: "longitude", type: "float", meta: { interface: "input" } },
            { field: "icone", type: "string", meta: { interface: "input" } },
            { field: "usuario_id", type: "uuid", meta: { interface: "input" } }
        ]
    });

    // Collection historico_localizacao
    console.log("Criando historico_localizacao...");
    await req('/collections', 'POST', {
        collection: "historico_localizacao",
        meta: { icon: "history" },
        schema: { name: "historico_localizacao" },
        fields: [
            { field: "id", type: "integer", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
            { field: "motorista_id", type: "integer", meta: { interface: "input" } },
            { field: "latitude", type: "float", meta: { interface: "input" } },
            { field: "longitude", type: "float", meta: { interface: "input" } },
            { field: "velocidade_estimada", type: "float", meta: { interface: "input" } },
            { field: "date_created", type: "timestamp", meta: { special: ['cast-timestamp'] } }
        ]
    });

    // Relacionamentos
    console.log("Criando Relacionamento usuario_id...");
    await req('/relations', 'POST', {
        collection: "locais_salvos",
        field: "usuario_id",
        related_collection: "directus_users"
    });

    console.log("Criando Relacionamento motorista_id...");
    await req('/relations', 'POST', {
        collection: "historico_localizacao",
        field: "motorista_id",
        related_collection: "motoristas"
    });

    console.log("Feito!");
}

main();
