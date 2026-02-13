// Salvar lista completa em arquivo
const fs = require('fs');
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

async function saveAllCollections() {
    try {
        const response = await fetch(`${DIRECTUS_URL}/collections`, {
            headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` }
        });

        const result = await response.json();
        const collections = result.data || [];

        const appCollections = collections.filter(c => !c.collection.startsWith('directus_'));
        const sysCollections = collections.filter(c => c.collection.startsWith('directus_'));

        let output = `TODAS AS TABELAS DO DIRECTUS\n`;
        output += `Conectado em: ${DIRECTUS_URL}\n`;
        output += `Total: ${collections.length} collections\n\n`;
        output += `${'='.repeat(80)}\n`;
        output += `APLICAÇÃO (${appCollections.length} tabelas):\n`;
        output += `${'='.repeat(80)}\n\n`;

        appCollections.sort((a, b) => a.collection.localeCompare(b.collection)).forEach((col, i) => {
            output += `${(i + 1).toString().padStart(3)}. ${col.collection}\n`;
        });

        output += `\n${'='.repeat(80)}\n`;
        output += `SISTEMA DIRECTUS (${sysCollections.length} tabelas):\n`;
        output += `${'='.repeat(80)}\n\n`;

        sysCollections.sort((a, b) => a.collection.localeCompare(b.collection)).forEach((col, i) => {
            output += `${(i + 1).toString().padStart(3)}. ${col.collection}\n`;
        });

        output += `\n${'='.repeat(80)}\n`;
        output += `TOTAL: ${collections.length} collections\n`;
        output += `${'='.repeat(80)}\n`;

        fs.writeFileSync('directus_tables_complete.txt', output);
        console.log('\n✅ Lista completa salva em: directus_tables_complete.txt\n');
        console.log(output);

    } catch (error) {
        console.error('❌ ERRO:', error.message);
    }
}

saveAllCollections();
