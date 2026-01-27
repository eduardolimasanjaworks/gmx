
const { Directus } = require('@directus/sdk');

// Admin client to check permissions
const directus = new Directus('http://91.99.137.101:8057', {
  auth: {
    staticToken: 'EQ35A8-16012024-VELOZ'
  }
});

async function checkPublicPermissions() {
  try {
    console.log('--- Checking Public Role Permissions ---');
    
    // Get Public Role ID
    const roles = await directus.roles.readMany();
    const publicRole = roles.data.find(r => r.name === 'Public');
    
    if (!publicRole) {
      console.log('Public role not found! This is critical.');
      return;
    }
    
    console.log(`Public Role ID: ${publicRole.id}`);

    // Check Permissions for critical tables
    const tables = ['embarques', 'vehicle_matches', 'disponivel', 'frota', 'rotas'];
    
    for (const table of tables) {
      const permissions = await directus.permissions.readMany({
        filter: {
          role: { _eq: publicRole.id },
          collection: { _eq: table }
        }
      });
      
      console.log(`\nTable: ${table}`);
      if (permissions.data.length === 0) {
        console.log(`❌ No permissions defined for Public role.`);
      } else {
        permissions.data.forEach(p => {
          console.log(`✅ Action: ${p.action} | Fields: ${p.fields ? p.fields.join(',') : '*'}`);
        });
      }
    }

  } catch (error) {
    console.error('Error checking permissions:', error);
  }
}

checkPublicPermissions();
