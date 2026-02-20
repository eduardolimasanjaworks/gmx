import { createDirectus, rest, readFieldsByCollection, staticToken } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq'; // Admin token

const client = createDirectus(directusUrl)
    .with(staticToken(directusToken))
    .with(rest());

async function checkEmbarquesSchema() {
    try {
        const fields = await client.request(
            readFieldsByCollection('embarques')
        );

        console.log('📋 CAMPOS DA COLLECTION "embarques":\n');
        fields.forEach(field => {
            console.log(`- ${field.field} (${field.type})`);
        });

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

checkEmbarquesSchema();
