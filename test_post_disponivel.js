// Script para testar criação direta via API com diferentes tokens
const directusUrl = 'http://91.99.137.101:8057';
const adminToken = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function testDirectPost() {
    console.log('\n🧪 Testando POST direto na API do Directus...\n');

    // Primeiro buscar um motorista para usar
    const motoristasRes = await fetch(`${directusUrl}/items/cadastro_motorista?limit=1&access_token=${adminToken}`);
    const motoristasData = await motoristasRes.json();

    if (!motoristasData.data || motoristasData.data.length === 0) {
        console.log('❌ Nenhum motorista encontrado');
        return;
    }

    const motoristaId = motoristasData.data[0].id;
    console.log(`✅ Motorista ID: ${motoristaId}\n`);

    // Testar POST com campos mínimos
    const payload = {
        motorista_id: motoristaId,
        status: 'disponivel',
        localizacao_atual: 'São Paulo',
        local_disponibilidade: 'São Paulo'
    };

    console.log('📝 Payload:', JSON.stringify(payload, null, 2));
    console.log('\n🚀 Enviando POST...\n');

    try {
        const response = await fetch(`${directusUrl}/items/disponivel?access_token=${adminToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        const responseData = await response.json();

        if (response.ok) {
            console.log('\n✅ SUCESSO!');
            console.log(JSON.stringify(responseData, null, 2));
        } else {
            console.log('\n❌ ERRO:');
            console.log(JSON.stringify(responseData, null, 2));
        }
    } catch (error) {
        console.error('\n❌ Erro na requisição:', error.message);
    }
}

testDirectPost();
