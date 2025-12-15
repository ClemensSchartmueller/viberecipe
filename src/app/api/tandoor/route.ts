import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const tandoorUrl = req.headers.get("x-tandoor-url");
        const token = req.headers.get("x-tandoor-token");

        if (!tandoorUrl || !token) {
            return NextResponse.json({ error: "Missing Tandoor configuration" }, { status: 401 });
        }

        // Clean token: remove 'Bearer ' or 'Token ' if present, to avoid double prefixing
        const cleanToken = token.replace(/^(Bearer|Token)\s+/i, "").trim();
        console.log(`[Tandoor] Sending to ${tandoorUrl} with token ending in ...${cleanToken.slice(-4)}`);

        // Helpers for parsing metadata
        const parseDuration = (isoDuration: string | undefined): number => {
            if (!isoDuration) return 0;
            // Simple regex for PT#H#M format
            const durationRegex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
            const match = isoDuration.match(durationRegex);
            if (!match) return 0;
            const hours = parseInt(match[1] || '0', 10);
            const minutes = parseInt(match[2] || '0', 10);
            return (hours * 60) + minutes;
        };

        const parseServings = (yieldStr: string | number | undefined): { amount: number, text: string } => {
            if (!yieldStr) return { amount: 1, text: "" };
            if (typeof yieldStr === 'number') return { amount: yieldStr, text: "" };

            // Extract first number found
            const match = yieldStr.match(/(\d+)/);
            const amount = match ? parseInt(match[1], 10) : 1;
            // Use the whole string as text if it's not just a number
            const text = yieldStr.trim();
            return { amount, text };
        };

        const payload = await req.json();
        let { name, description, steps, ingredients, url, image, prepTime, cookTime, recipeYield } = payload;

        // 1. Handle Description (Ingredients now go into structured data, but we keep text backup if needed)
        // If we have structured ingredients, we won't put them in description to avoid duplication if Tandoor displays them nicely.
        // But for safety, let's keep them in description for now or maybe just the simple list.
        const finalDescription = description || "Imported via VibeRecipe";

        // 2. Handle Structured Ingredients Mapping
        const mappedIngredients = Array.isArray(ingredients) ? ingredients.map((ing: any) => {
            if (typeof ing === 'string') {
                // Check if it's a simple string, return as string (Tandoor might not like this if strict)
                // Actually Tandoor requires object with food, unit, amount.
                // Fallback: 
                return {
                    food: { name: ing },
                    unit: null,
                    amount: 0,
                    note: ""
                };
            } else {
                return {
                    food: { name: ing.food },
                    unit: ing.unit ? { name: ing.unit } : null,
                    amount: parseFloat(ing.quantity) || 0,
                    note: "" // We could put original text here if needed
                };
            }
        }) : [];

        // 3. Handle Steps
        // Tandoor allows attaching ingredients to specific steps. 
        // We will attach ALL ingredients to the FIRST step for simplicity, as specific mapping is hard.
        const finalSteps = Array.isArray(steps) ? steps.map((s: any, index: number) => ({
            instruction: s.instruction || s.text || JSON.stringify(s),
            ingredients: index === 0 ? mappedIngredients : [] // Attach all ingredients to step 1
        })) : [];

        // If no steps exist, create a dummy one for ingredients
        if (finalSteps.length === 0 && mappedIngredients.length > 0) {
            finalSteps.push({
                instruction: "Prepare ingredients",
                ingredients: mappedIngredients
            });
        }

        // 3. Handle Metadata
        const workingTime = parseDuration(prepTime);
        const waitingTime = parseDuration(cookTime);
        const { amount: servings, text: servingsText } = parseServings(recipeYield);

        const tandoorPayload = {
            name: name,
            description: finalDescription,
            steps: finalSteps,
            source_url: url,
            working_time: workingTime,
            waiting_time: waitingTime,
            servings: servings,
            servings_text: servingsText,
            internal: true
        };

        // Helper to send request with specific auth prefix
        const sendToTandoor = async (authPrefix: string) => {
            const targetUrl = new URL("/api/recipe/", tandoorUrl).toString();
            return fetch(targetUrl, {
                method: "POST",
                headers: {
                    "Authorization": `${authPrefix} ${cleanToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(tandoorPayload),
            });
        };

        // Try 'Token' scheme first (Standard DRF)
        let authPrefix = "Token";
        let response = await sendToTandoor(authPrefix);
        console.log(`[Tandoor] Tried '${authPrefix}' scheme. Status: ${response.status}`);

        // If 'Token' fails with 401/403, try 'Bearer' (OAuth/JWT style)
        if (response.status === 401 || response.status === 403) {
            console.log("[Tandoor] 'Token' scheme failed. Retrying with 'Bearer'...");
            authPrefix = "Bearer";
            response = await sendToTandoor(authPrefix);
            console.log(`[Tandoor] Tried '${authPrefix}' scheme. Status: ${response.status}`);
        }

        // Tandoor returns 201 Created on success
        if (response.status === 201) {
            const data = await response.json();
            console.log(`[Tandoor] Success! Created recipe ID: ${data.id || 'unknown'}`);

            // Upload Image if present
            if (image && data.id) {
                try {
                    console.log(`[Tandoor] Fetching image from ${image}`);
                    const imgRes = await fetch(image);
                    if (imgRes.ok) {
                        const imgBlob = await imgRes.blob();
                        const formData = new FormData();
                        formData.append('image', imgBlob, 'recipe_image.jpg');

                        const updateUrl = new URL(`/api/recipe/${data.id}/image/`, tandoorUrl).toString();
                        console.log(`[Tandoor] Uploading image to ${updateUrl} using ${authPrefix}`);

                        // We need to use the same token for the update
                        const updateRes = await fetch(updateUrl, {
                            method: 'PUT',
                            headers: {
                                "Authorization": `${authPrefix} ${cleanToken}`,
                                // Note: fetch with FormData automatically sets Content-Type to multipart/form-data with boundary
                            },
                            body: formData
                        });

                        if (updateRes.ok) {
                            console.log("[Tandoor] Image uploaded successfully");
                        } else {
                            console.error("[Tandoor] Failed to upload image", await updateRes.text());
                        }
                    }
                } catch (imgErr) {
                    console.error("[Tandoor] Image upload error", imgErr);
                }
            }

            return NextResponse.json(data, { status: 201 });
        } else {
            const text = await response.text();
            console.error("Tandoor Error", response.status, text);
            return NextResponse.json({ error: "Tandoor API Error", details: text }, { status: response.status });
        }

    } catch (error) {
        console.error("Proxy Error", error);
        return NextResponse.json({ error: "Failed to send to Tandoor" }, { status: 500 });
    }
}
