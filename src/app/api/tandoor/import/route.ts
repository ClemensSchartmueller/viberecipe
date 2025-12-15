import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const tandoorUrl = req.headers.get("x-tandoor-url");
        const token = req.headers.get("x-tandoor-token");

        if (!tandoorUrl || !token) {
            return NextResponse.json({ error: "Missing Tandoor configuration" }, { status: 401 });
        }

        const body = await req.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: "Missing URL to import" }, { status: 400 });
        }

        // Clean token
        const cleanToken = token.replace(/^(Bearer|Token)\s+/i, "").trim();
        const targetUrl = new URL("/api/recipe-from-source/", tandoorUrl).toString();

        console.log(`[Tandoor Import] Proxying ${url} to ${targetUrl}`);

        const sendRequest = async (authPrefix: string) => {
            // Tandoor expects this exact JSON structure and seemingly requires Origin/Referer
            return fetch(targetUrl, {
                method: "POST",
                headers: {
                    "Authorization": `${authPrefix} ${cleanToken}`,
                    "Content-Type": "application/json",
                    "Origin": tandoorUrl,
                    "Referer": new URL("/data/import/url", tandoorUrl).toString(),
                    "Accept": "application/json, text/plain, */*",
                },
                body: JSON.stringify({
                    url: url,
                    data: ""
                }),
            });
        };

        let successfulAuthPrefix = "Token";
        let response = await sendRequest("Token");

        if (response.status === 401 || response.status === 403) {
            console.log("[Tandoor Import] Retry with Bearer...");
            successfulAuthPrefix = "Bearer";
            response = await sendRequest("Bearer");
        }

        if (response.ok) {
            // Step 1: Parse Successful
            const parseData = await response.json();

            // Check if we got valid recipe data
            if (!parseData.recipe_json) {
                return NextResponse.json({ error: "No recipe data found in Tandoor response" }, { status: 422 });
            }

            console.log(`[Tandoor Import] Parsed successfully. Creating recipe '${parseData.recipe_json.name}'...`);

            // Step Split Fix: If Tandoor returns one single giant step with newlines, split it.
            if (parseData.recipe_json.steps && parseData.recipe_json.steps.length === 1) {
                const singleStep = parseData.recipe_json.steps[0];
                if (singleStep.instruction && singleStep.instruction.includes('\n')) {
                    console.log("[Tandoor Import] Refine: Splitting single step into multiple steps...");
                    const lines = singleStep.instruction.split('\n')
                        .map((l: string) => l.trim())
                        .filter((l: string) => l.length > 0);

                    if (lines.length > 1) {
                        parseData.recipe_json.steps = lines.map((line: string, index: number) => ({
                            instruction: line,
                            // Keep ingredients attached to the first step so we don't lose them
                            ingredients: index === 0 ? singleStep.ingredients : [],
                            show_ingredients_table: index === 0 ? (singleStep.show_ingredients_table ?? true) : false
                        }));
                    }
                }
            }

            // Step 2: Create Recipe
            // We Post the 'recipe_json' back to /api/recipe/
            const createUrl = new URL("/api/recipe/", tandoorUrl).toString();

            const createResponse = await fetch(createUrl, {
                method: "POST",
                headers: {
                    "Authorization": `${successfulAuthPrefix} ${cleanToken}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                // We use the exact payload Tandoor gave us
                body: JSON.stringify(parseData.recipe_json),
            });

            if (createResponse.ok) {
                const createData = await createResponse.json();
                console.log(`[Tandoor Import] Recipe created! ID: ${createData.id}`);

                // Step 3: Handle Image Upload
                // The parse response includes 'image' in 'recipe_json' which is the main image URL
                const imageUrl = parseData.recipe_json.image;

                if (imageUrl && createData.id) {
                    try {
                        console.log(`[Tandoor Import] Fetching image from ${imageUrl}`);
                        const imgRes = await fetch(imageUrl);
                        if (imgRes.ok) {
                            const imgBlob = await imgRes.blob();
                            const formData = new FormData();
                            formData.append('image', imgBlob, 'recipe_image.jpg');

                            const updateUrl = new URL(`/api/recipe/${createData.id}/image/`, tandoorUrl).toString();
                            console.log(`[Tandoor Import] Uploading image to ${updateUrl}`);

                            const updateRes = await fetch(updateUrl, {
                                method: 'PUT',
                                headers: {
                                    "Authorization": `${successfulAuthPrefix} ${cleanToken}`,
                                },
                                body: formData
                            });

                            if (updateRes.ok) {
                                console.log("[Tandoor Import] Image uploaded successfully");
                            } else {
                                console.error("[Tandoor Import] Failed to upload image", await updateRes.text());
                            }
                        }
                    } catch (imgErr) {
                        console.error("[Tandoor Import] Image upload error", imgErr);
                    }
                }

                return NextResponse.json(createData, { status: 201 });
            } else {
                const errorText = await createResponse.text();
                console.error(`[Tandoor Import] Creation failed: ${createResponse.status}`, errorText);
                return NextResponse.json({
                    error: "Import parsed but failed to save.",
                    details: errorText,
                    parsed: parseData
                }, { status: createResponse.status });
            }

        } else {
            const text = await response.text();
            console.error("[Tandoor Import] Parse Error", response.status, text);
            if (response.status === 500) {
                return NextResponse.json({
                    error: "Tandoor failed to import this URL directly.",
                    details: "The Tandoor server returned an internal error (500). This often means its internal scraper couldn't parse the website. Please try unchecking 'Use Tandoor Importer' to use VibeRecipe's AI extraction instead."
                }, { status: 502 });
            }
            return NextResponse.json({ error: "Tandoor Import Failed", details: text }, { status: response.status });
        }

    } catch (error) {
        console.error("Proxy Error", error);
        return NextResponse.json({ error: "Failed to connect to Tandoor" }, { status: 500 });
    }
}
