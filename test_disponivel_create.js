import { createDirectus, rest, readItems, createItem, authentication } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const adminToken = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

const client = createDirectus(directusUrl).with(rest()).with(authentication('json'));

async function testDisponivelCreation() {
    try {
        console.log('\n🧪 Testando criação de registro em "disponivel"...\n');

        // Primeiro, vamos buscar um motorista existente para usar como referência
        const motoristas = await client.request(
            readItems('cadastro_motorista', { limit: 1 })
        );

        if (motoristas.length === 0) {
            console.log('❌ Nenhum motorista encontrado para teste');
            return;
        }

        const motoristaId = motoristas[0].id;
        console.log(`✅ Usando motorista ID: ${motoristaId}`);

        // Tentar criar um registro simples primeiro
        console.log('\n📝 Tentando criar registro com campos mínimos...\n');

        const payload = {
            motorista_id: motoristaId,
            status: 'disponivel'
        };

        console.log('Payload:', JSON.stringify(payload, null, 2));

        const result = await client.request(
            createItem('disponivel', payload)
        );

        console.log('\n✅ SUCESSO! Registro criado:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('\n❌ ERRO ao criar registro:');
        console.error('Mensagem:', error.message);

        if (error.errors && error.errors.length > 0) {
            console.error('\nDetalhes dos erros:');
            error.errors.forEach((err, idx) => {
                console.error(`\nErro ${idx + 1}:`);
                console.error(`  Mensagem: ${err.message}`);
                console.error(`  Extensões:`, JSON.stringify(err.extensions, null, 2));
            });
        }
    }
}

testDisponivelCreation();
