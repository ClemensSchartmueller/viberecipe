const fs = require('fs');

try {
    const raw = fs.readFileSync('c:/dev/recipeextractor/tandoorapi.json', 'utf8');

    // Split into lines for easier processing
    const lines = raw.split('\n');
    let currentPath = '';
    let currentMethod = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track current path (indented by 2 spaces generally in root of paths)
        // YAML structure:
        // paths:
        //   /api/foo/:
        //     post:
        const pathMatch = line.match(/^  (\/.*):$/);
        if (pathMatch) {
            currentPath = pathMatch[1];
        }

        const methodMatch = line.match(/^    (post|put|patch|get|delete):$/);
        if (methodMatch) {
            currentMethod = methodMatch[1];
        }

        // Look for RecipeImage usage in request body
        // $ref: '#/components/schemas/RecipeImage'
        if (line.includes('RecipeImage') && currentPath && currentMethod) {
            console.log(`FOUND: ${currentMethod.toUpperCase()} ${currentPath} uses RecipeImage`);
        }
    }
} catch (e) {
    console.error(e);
}
