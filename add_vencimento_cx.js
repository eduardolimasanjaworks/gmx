import fetch from 'node-fetch';

const directusUrl = 'http://91.99.137.101:8057';
const token = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function req(path, method, body) {
    const res = await fetch(`${directusUrl}${path}?access_token=${token}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) {
        console.error(`ERROR ON ${method} ${path}: \n`, JSON.stringify(data.errors, null, 2));
    }
    return data;
}

async function createField(collection, fieldObj) {
    try {
        await req(`/fields/${collection}`, 'POST', fieldObj);
        console.log(`✅ Campo ${fieldObj.field} criado em ${collection}`);
    } catch (e) {
        console.log(`Erro ao criar campo ${fieldObj.field}: ${e.message}`);
    }
}

async function main() {
    console.log("Adicionando campo vencimento_cx");
    await createField('cadastro_motorista', { 
        field: "vencimento_cx", 
        type: "string", // Usando string para flexibilidade de formato DD/MM/AAAA por enquanto, ou date? Melhor date
        type: "date",
        meta: { interface: "datetime" } 
    });
    console.log("Feito!");
}

main();
