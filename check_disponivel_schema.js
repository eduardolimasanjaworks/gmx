import { createDirectus, rest, readFieldsByCollection } from '@directus/sdk';

const directusUrl = process.env.VITE_DIRECTUS_URL || 'http://91.99.137.101:8057';
const directusToken = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq'; // Admin token

const client = createDirectus(directusUrl).with(rest());

async function checkDisponivelSchema() {
    try {
        console.log('\n🔍 Verificando schema da collection "disponivel"...\n');

        const fields = await client.request(
            readFieldsByCollection('disponivel')
        );

        console.log(`✅ Total de campos: ${fields.length}\n`);

        console.log('📋 CAMPOS DA COLLECTION "disponivel":\n');
        fields.forEach(field => {
            const required = field.meta?.required ? '🔴 OBRIGATÓRIO' : '⚪ Opcional';
            const type = field.type || 'unknown';
            const validation = field.meta?.validation ? JSON.stringify(field.meta.validation) : 'N/A';

            console.log(`Campo: ${field.field}`);
            console.log(`  Tipo: ${type}`);
            console.log(`  ${required}`);
            console.log(`  Interface: ${field.meta?.interface || 'N/A'}`);
            console.log(`  Validação: ${validation}`);
            console.log(`  Readonly: ${field.meta?.readonly || false}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Erro ao verificar schema:', error.message);
        if (error.errors && error.errors.length > 0) {
            console.error('Detalhes do erro:', JSON.stringify(error.errors, null, 2));
        }
    }
}

checkDisponivelSchema();
