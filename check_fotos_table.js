// Script para verificar dados na tabela 'fotos'
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

async function checkFotosTable() {
    try {
        console.log('\n📷 VERIFICANDO TABELA "fotos"\n');
        console.log('='.repeat(80));

        // Query items na tabela fotos
        const response = await fetch(`${DIRECTUS_URL}/items/fotos?limit=5`, {
            headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const fotos = result.data || [];

        console.log(`\n✅ Registros encontrados: ${fotos.length}\n`);

        if (fotos.length === 0) {
            console.log('⚠️  Nenhum registro de foto encontrado ainda.\n');
        } else {
            fotos.forEach((foto, i) => {
                console.log(`\n--- REGISTRO ${i + 1} ---`);
                console.log(`ID: ${foto.id}`);
                console.log(`Motorista ID: ${foto.motorista_id}`);
                console.log(`Telefone: ${foto.telefone || 'N/A'}`);
                console.log(`Foto Cavalo: ${foto.foto_cavalo || 'Não enviada'}`);
                console.log(`Foto Lateral: ${foto.foto_lateral || 'Não enviada'}`);
                console.log(`Foto Traseira: ${foto.foto_traseira || 'Não enviada'}`);
                console.log(`Criado em: ${foto.date_created}`);
            });
        }

        console.log('\n' + '='.repeat(80));

        // Verificar campos da collection
        const fieldsResponse = await fetch(`${DIRECTUS_URL}/fields/fotos`, {
            headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` }
        });

        const fieldsResult = await fieldsResponse.json();
        const fields = fieldsResult.data || [];

        console.log('\n📋 CAMPOS DA TABELA "fotos":\n');
        fields.forEach(field => {
            console.log(`- ${field.field} (${field.type})`);
        });

        console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
    }
}

checkFotosTable();
