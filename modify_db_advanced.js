import { createDirectus, rest, createCollection, createField, createRelation } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directus = createDirectus(directusUrl).with(rest());
const token = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';
directus.setToken(token);

async function addGeoFieldsToFollow() {
    console.log("Adicionando campos geo no follow...");
    const fields = [
        { field: 'origem_lat', type: 'float', meta: { interface: 'input' } },
        { field: 'origem_lng', type: 'float', meta: { interface: 'input' } },
        { field: 'destino_lat', type: 'float', meta: { interface: 'input' } },
        { field: 'destino_lng', type: 'float', meta: { interface: 'input' } }
    ];

    for (const f of fields) {
        try {
            await directus.request(createField('follow', f));
            console.log(`Campo ${f.field} adicionado em follow.`);
        } catch (e) {
            console.log(`Campo ${f.field} possivelmente já existe ou log de erro:`, e.errors?.[0]?.message || e.message);
        }
    }
}

async function createLocaisSalvos() {
    console.log("Criando coleção locais_salvos...");
    try {
        await directus.request(createCollection({
            collection: 'locais_salvos',
            meta: {
                collection: 'locais_salvos',
                icon: 'map',
                display_template: '{{nome}}'
            },
            schema: { name: 'locais_salvos' },
            fields: [
                {
                    field: 'id',
                    type: 'integer',
                    schema: { is_primary_key: true, has_auto_increment: true },
                    meta: { hidden: true }
                },
                { field: 'nome', type: 'string', meta: { interface: 'input' } },
                { field: 'latitude', type: 'float', meta: { interface: 'input' } },
                { field: 'longitude', type: 'float', meta: { interface: 'input' } },
                { field: 'icone', type: 'string', meta: { interface: 'input', default_value: 'map-pin' } },
                {
                    field: 'usuario_id',
                    type: 'uuid',
                    meta: { interface: 'select-dropdown-m2o' },
                    schema: { foreign_key_table: 'directus_users', foreign_key_column: 'id' }
                }
            ]
        }));
        console.log("Coleção locais_salvos criada.");

        // Criar relação M2O com directus_users
        await directus.request(createRelation({
            collection: 'locais_salvos',
            field: 'usuario_id',
            related_collection: 'directus_users'
        }));
        console.log("Relação usuario_id criada.");

    } catch (e) {
        console.log("Coleção locais_salvos já existe ou erro:", e.errors?.[0]?.message || e.message);
    }
}

async function createHistoricoLocalizacao() {
    console.log("Criando coleção historico_localizacao...");
    try {
        await directus.request(createCollection({
            collection: 'historico_localizacao',
            meta: {
                collection: 'historico_localizacao',
                icon: 'history'
            },
            schema: { name: 'historico_localizacao' },
            fields: [
                {
                    field: 'id',
                    type: 'integer',
                    schema: { is_primary_key: true, has_auto_increment: true },
                    meta: { hidden: true }
                },
                {
                    field: 'motorista_id',
                    type: 'integer',
                    meta: { interface: 'select-dropdown-m2o' },
                    schema: { foreign_key_table: 'motoristas', foreign_key_column: 'id' }
                },
                { field: 'latitude', type: 'float', meta: { interface: 'input' } },
                { field: 'longitude', type: 'float', meta: { interface: 'input' } },
                { field: 'velocidade_estimada', type: 'float', meta: { interface: 'input' } },
                { field: 'date_created', type: 'timestamp', meta: { special: ['cast-timestamp'] } }
            ]
        }));
        console.log("Coleção historico_localizacao criada.");

        await directus.request(createRelation({
            collection: 'historico_localizacao',
            field: 'motorista_id',
            related_collection: 'motoristas'
        }));
        console.log("Relação motorista_id criada no historico.");

    } catch (e) {
        console.log("Coleção historico_localizacao já existe ou erro:", e.errors?.[0]?.message || e.message);
    }
}

async function main() {
    await addGeoFieldsToFollow();
    await createLocaisSalvos();
    await createHistoricoLocalizacao();
    console.log("Processo de DB concluído.");
}

main();
