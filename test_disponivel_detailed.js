// Script para testar criação e salvar resultado em arquivo
import { writeFileSync } from 'fs';

const directusUrl = 'http://91.99.137.101:8057';
const adminToken = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function testAndSave() {
    const log = [];

    log.push('=== TESTE DE CRIAÇÃO EM DISPONIVEL ===\n');

    try {
        // Buscar motorista
        const motoristasRes = await fetch(`${directusUrl}/items/cadastro_motorista?limit=1&access_token=${adminToken}`);
        const motoristasData = await motoristasRes.json();

        if (!motoristasData.data || motoristasData.data.length === 0) {
            log.push('❌ Nenhum motorista encontrado');
            writeFileSync('disponivel_test_result.txt', log.join('\n'));
            console.log(log.join('\n'));
            return;
        }

        const motoristaId = motoristasData.data[0].id;
        log.push(`Motorista ID: ${motoristaId}\n`);

        const payload1 = {
            motorista_id: motoristaId,
            status: 'disponivel',
            localizacao_atual: 'São Paulo',
            local_disponibilidade: 'São Paulo'
        };

        log.push('TESTE 1: Payload básico');
        log.push(JSON.stringify(payload1, null, 2));

        const response1 = await fetch(`${directusUrl}/items/disponivel?access_token=${adminToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload1)
        });

        const result1 = await response1.json();

        log.push(`\nStatus: ${response1.status}`);
        log.push('Response:');
        log.push(JSON.stringify(result1, null, 2));

        // Se falhou, tentar com data_liberacao
        if (!response1.ok) {
            log.push('\n\n=== TESTE 2: Com data_liberacao ===\n');

            const payload2 = {
                ...payload1,
                data_liberacao: new Date().toISOString().split('T')[0]
            };

            log.push(JSON.stringify(payload2, null, 2));

            const response2 = await fetch(`${directusUrl}/items/disponivel?access_token=${adminToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload2)
            });

            const result2 = await response2.json();

            log.push(`\nStatus: ${response2.status}`);
            log.push('Response:');
            log.push(JSON.stringify(result2, null, 2));
        }

    } catch (error) {
        log.push(`\n❌ ERRO: ${error.message}`);
        log.push(error.stack);
    }

    const output = log.join('\n');
    writeFileSync('disponivel_test_result.txt', output);
    console.log(output);
}

testAndSave();
