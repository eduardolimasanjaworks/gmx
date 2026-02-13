// Verifica se o token é válido
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const USER_TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function checkToken() {
    try {
        console.log(`\n🔑 Verificando token: ${USER_TOKEN}\n`);

        // Tenta obter dados do usuário atual
        const response = await fetch(`${DIRECTUS_URL}/users/me?fields=id,first_name,last_name,email,role.name`, {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            }
        });

        if (!response.ok) {
            console.error(`❌ Token INVÁLIDO ou EXPIRADO`);
            console.error(`Status: ${response.status} ${response.statusText}`);
            const error = await response.text();
            console.error('Detalhes:', error);
            return;
        }

        const result = await response.json();
        const user = result.data;

        console.log(`✅ Token VÁLIDO!`);
        console.log(`👤 Usuário: ${user.first_name} ${user.last_name}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🆔 ID: ${user.id}`);
        console.log(`🛡️ Role: ${user.role?.name || 'Sem role definida'}`);

    } catch (error) {
        console.error('\n❌ ERRO DE CONEXÃO:', error.message);
    }
}

checkToken();
