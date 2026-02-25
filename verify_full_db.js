import { createDirectus, rest } from '@directus/sdk';
import fs from 'fs';

const directusUrl = 'http://91.99.137.101:8057';
const token = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function verifyDb() {
    try {
        console.log("Fetching all collections...");
        const collectionsResponse = await fetch(`${directusUrl}/collections?access_token=${token}`);
        const collectionsResult = await collectionsResponse.json();
        const allCollections = collectionsResult.data.map(c => c.collection).filter(c => !c.startsWith('directus_'));

        console.log(`Found ${allCollections.length} custom collections.`);

        const schemaAnalysis = {};

        for (const col of allCollections) {
            const fieldsResponse = await fetch(`${directusUrl}/fields/${col}?access_token=${token}`);
            const fieldsResult = await fieldsResponse.json();

            const relationsResponse = await fetch(`${directusUrl}/relations/${col}?access_token=${token}`);
            const relationsResult = await relationsResponse.json();

            schemaAnalysis[col] = {
                fields: fieldsResult.data.map(f => ({
                    field: f.field,
                    type: f.type,
                    schema: f.schema ? {
                        is_primary_key: f.schema.is_primary_key,
                        has_auto_increment: f.schema.has_auto_increment,
                        foreign_key_column: f.schema.foreign_key_column,
                        foreign_key_table: f.schema.foreign_key_table
                    } : null
                })),
                relations: relationsResult.data ? relationsResult.data.map(r => ({
                    field: r.field,
                    related_collection: r.related_collection
                })) : []
            };
        }

        fs.writeFileSync('full_db_analysis.json', JSON.stringify(schemaAnalysis, null, 2));
        console.log("Full DB analysis saved to full_db_analysis.json");
    } catch (e) {
        console.error("Error verifying DB:", e);
    }
}

verifyDb();
