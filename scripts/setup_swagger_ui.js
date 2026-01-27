
import fs from 'fs';
import path from 'path';

const SPEC_URL = "http://91.99.137.101:8057/server/specs/oas";
const PUBLIC_DIR = path.resolve('public');
const TARGET_JSON = path.join(PUBLIC_DIR, 'directus-spec.json');
const TARGET_HTML = path.join(PUBLIC_DIR, 'docs.html');

async function setupSwagger() {
  try {
    console.log(`Fetching OpenAPI Spec from ${SPEC_URL}...`);
    const response = await fetch(SPEC_URL, {
      headers: {
        "Authorization": "Bearer 1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`);
    }

    const spec = await response.json();

    if (spec.servers && spec.servers.length > 0) {
      console.log("Original Servers:", spec.servers);
      spec.servers = [{ url: "http://91.99.137.101:8057", description: "Directus Server" }];
    }

    console.log(`Writing JSON to ${TARGET_JSON}...`);
    fs.writeFileSync(TARGET_JSON, JSON.stringify(spec, null, 2));

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Directus API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: '/directus-spec.json',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: "BaseLayout"
    });
  };
</script>
</body>
</html>
        `;

    console.log(`Writing HTML to ${TARGET_HTML}...`);
    fs.writeFileSync(TARGET_HTML, htmlContent);

    console.log("✅ Swagger UI setup complete!");
    console.log("👉 Access it at: http://localhost:8080/docs.html");

  } catch (e) {
    console.error("❌ Error:", e);
  }
}

setupSwagger();
