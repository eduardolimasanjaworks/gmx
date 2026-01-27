import { createDirectus, rest, staticToken, createCollection, createField } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const TABLE_NAME = 'cadastro_motorista';

async function createMotoristaTable() {
    console.log(`Creating collection: ${TABLE_NAME}...`);

    try {
        // 1. Create Collection
        await client.request(createCollection({
            collection: TABLE_NAME,
            schema: { name: TABLE_NAME },
            meta: {
                singleton: false,
                sort_field: 'date_created',
                note: 'Tabela de cadastro de motoristas'
            }
        }));
        console.log(`✅ Collection ${TABLE_NAME} created.`);

        // 2. Create Fields
        const fields = [
            { name: 'nome', type: 'string', interface: 'input' },
            { name: 'sobrenome', type: 'string', interface: 'input' },
            { name: 'telefone', type: 'string', interface: 'input' },
            {
                name: 'forma_pagamento', type: 'string', interface: 'select-dropdown',
                options: {
                    choices: [
                        { text: 'PIX', value: 'pix' },
                        { text: 'Transferência', value: 'transferencia' },
                        { text: 'Boleto', value: 'boleto' }
                    ]
                }
            }, // Defaulting to simple text/select for now, can be changed.
            { name: 'rastreador', type: 'string', interface: 'input' },
            { name: 'login', type: 'string', interface: 'input' },
            { name: 'senha', type: 'string', interface: 'input-hash' }, // Using secure interface usually good, but input for now per request literal
            { name: 'pis', type: 'string', interface: 'input' },
            { name: 'cliente', type: 'string', interface: 'input' }
        ];

        for (const field of fields) {
            console.log(`  Creating field ${field.name}...`);
            try {
                await client.request(createField(TABLE_NAME, {
                    field: field.name,
                    type: field.type,
                    meta: {
                        interface: field.interface,
                        display_name: field.name.charAt(0).toUpperCase() + field.name.slice(1).replace('_', ' '),
                        options: field.options
                    }
                }));
                console.log(`  ✅ Field ${field.name} created.`);
            } catch (err) {
                console.error(`  ❌ Failed to create field ${field.name}:`, err.message);
            }
        }

    } catch (err) {
        console.error(`❌ Global Error:`, err);
    }
}

createMotoristaTable();
