// Tenta fazer upload de um arquivo fake para o Directus
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const USER_TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function testUpload() {
    try {
        console.log(`\n🚀 Testando Upload para Directus: ${DIRECTUS_URL}\n`);

        // Criar um Blob simulando um arquivo
        const blob = new Blob(['Teste de upload via script'], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', blob, 'teste_upload_script.txt');

        const response = await fetch(`${DIRECTUS_URL}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            },
            body: formData
        });

        if (!response.ok) {
            console.error(`❌ Upload FALHOU!`);
            console.error(`Status: ${response.status} ${response.statusText}`);
            const error = await response.text();
            console.error('Detalhes:', error);
            return;
        }

        const result = await response.json();
        const file = result.data;

        console.log(`✅ Upload SUCESSO!`);
        console.log(`📂 ID do Arquivo: ${file.id}`);
        console.log(`🔗 URL: ${DIRECTUS_URL}/assets/${file.id}`);
        console.log(`📦 Tipo: ${file.type}`);
        console.log(`📏 Tamanho: ${file.filesize} bytes`);

    } catch (error) {
        console.error('\n❌ ERRO DE CONEXÃO:', error.message);
    }
}

testUpload();
