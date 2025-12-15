# AGENTS.md

## 1. Project Mission: "VibeRecipe"
**Goal:** A specific recipe extractor that turns chaos (screenshots, messy URLs) into structured, import-ready data for Tandoor.
**Vibe:** Minimalist, mobile-first (PWA), "Apple-like" aesthetic. It should feel snappy and magic.

## 2. Tech Stack & Architecture
* **Framework:** Next.js (App Router) or SvelteKit. *Preference: Next.js for easier PWA plugins.*
* **Styling:** Tailwind CSS (Mobile-first utility classes).
* **State Management:** Minimal (Zustand or React Context).
* **Backend/API:** Serverless functions (embedded in the framework) to proxy API requests.
* **AI Analysis (Text & Vision):** **Google Gemini API (Free Tier)** using `gemini-1.5-flash`.
    * *Constraint:* Must strictly use the free tier API keys and models optimized for speed/cost.
* **Image Generation:** **Pollinations.ai API**.
    * *Constraint:* Must use the `model=flux` parameter.
* **Deployment:** Docker (optimized for Proxmox).

## 3. Core Features (The "What")

### A. Input Methods
1.  **Magic Paste:** A single input field that accepts:
    * **URLs:** Scrape content and pass to Gemini for extraction.
    * **Images:** Drag & drop or paste screenshots. Send directly to Gemini Vision for OCR/Analysis.
2.  **Camera Access (PWA):** On mobile, allow direct camera capture of physical cookbooks.

### B. Intelligent Processing (The Brain)
* **Normalization:** Convert all recipes to the **Metric System** (grams, ml, celsius). *Strict requirement.*
* **Schema:** Output must be valid `application/ld+json` adhering to `schema.org/Recipe`.
* **AI Analysis Workflow (Gemini Flash):**
    * Prompt the model to extract: Title, Description, Prep/Cook Time, Ingredients, Instructions, Yield.
    * *Prompt Instruction:* "You are a JSON-LD extraction machine. Output ONLY valid JSON."
* **Visual Generation (Pollinations.ai):**
    * If the source has no image, or if the user requests a "Better Image":
    * Construct a prompt based on the recipe title + key ingredients.
    * Fetch image from: `https://pollinations.ai/p/{URL_ENCODED_PROMPT}?model=flux&width=1024&height=1024`
    * Save or serve this URL in the JSON-LD output.

### C. Tandoor Integration
* **Settings Panel:** Allow user to save:
    * `TANDOOR_BASE_URL` (e.g., `https://recipes.myhome.lab`)
    * `TANDOOR_API_TOKEN`
    * `GEMINI_API_KEY` (User must provide their own free key).
* **Export Actions:**
    * **"Copy JSON-LD":** Copies the strict JSON string to clipboard.
    * **"Send to Tandoor":** POST request to Tandoor API (or create a draft import).

## 4. Coding Rules & "Vibecoding" Style
* **Don't Ask, Just Build:** If a design detail is missing, choose the most modern, accessible option.
* **Mobile Optimized:** The UI must be touch-friendly (large hit targets, bottom navigation/actions).
* **Feedback Loops:** Always show loading states (skeletons) and success toasts.
* **Single Container:** The final output must be a single `Dockerfile` that exposes port 3000, ready for Proxmox.

## 5. Verification & Constraints
* **Validation:** Ensure the JSON-LD output validates against Google's Structured Data Testing Tool standards.
* **Privacy:** Do not store recipes permanently in this app; it is a "pass-through" tool.
* **External Calls:** All external API calls (Gemini or Pollinations) must be proxied through the Next.js API routes to handle CORS and protect keys if necessary (though Pollinations is open).

## 6. Deployment Instructions (Proxmox)
* Create a `Dockerfile` based on `node:alpine`.
* Ensure `next.config.js` uses `output: 'standalone'` for minimal image size.
* Include a `docker-compose.yml` for easy local testing.