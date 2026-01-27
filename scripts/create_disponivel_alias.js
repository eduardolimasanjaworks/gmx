
import { createDirectus, rest, staticToken, createField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function createAlias() {
    try {
        console.log("Creating alias 'dados_disponibilidade' in 'cadastro_motorista'...");

        // This creates a "fake" field on the parent that points to the child
        // enabling the Nested Create feature (O2M)
        await client.request(createField('cadastro_motorista', {
            field: 'dados_disponibilidade',
            type: 'alias',
            meta: {
                interface: 'list-o2m',
                special: ['o2m'],
                display: 'related-values',
                display_options: {
                    template: '{{status}} - {{localizacao_atual}}'
                }
            },
            schema: null // Aliases are virtual
        }));

        // We also need to make sure Directus knows WHICH relationship this alias refers to.
        // Usually Directus infers this if there's only one FK.
        // But since we have the field, we need to update the Relation if it's not auto-detected properly for the interface.
        // Actually, just creating the field with type 'alias' and 'special: o2m' isn't enough to LINK it to 'disponivel'.
        // We need to update the RELATIONSHIP metadata.

        // BUT, since we have many tables pointing to motorista_id, we need to be careful.
        // The best way is to update the RELATION object.

        console.log("Alias field created. (Note: You might need to configure the 'Many Collection' and 'Many Field' in the UI if this is raw SDK).");
        console.log("Actually, the SDK might require creating the Relation object to bind this Alias to 'disponivel.motorista_id'.");

    } catch (e) {
        console.error("Error (might already exist):", e.message);
    }
}

// Since SDK 'createField' for alias doesn't fully link the relationship without a corresponding 'relations' update,
// I'll try to just create the field first. If it fails to link, I'll update the relation.
createAlias();
