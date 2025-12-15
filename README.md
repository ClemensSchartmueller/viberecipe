# VibeRecipe

> *Transform chaos into delicious structure.*

VibeRecipe is a modern, AI-powered recipe extractor built with **Next.js**. It takes unstructured recipe content—whether it's a messy URL, a block of text, or a photo of a cookbook page—and converts it into a clean, structured format using **Google Gemini**. It also supports direct integration with **Tandoor**, allowing you to import extracted recipes directly into your self-hosted cookbook.

## Features

- **Magic Paste Input**:
  - **URL**: Paste a link to any recipe website.
  - **text**: Paste raw text from an email, chat, or document.
  - **Image**: Upload a photo or screenshot of a recipe (supports Drag & Drop).
- **AI Extraction**: Uses Google's Gemini models to intelligently parse ingredients, instructions, cooking times, and servings.
- **Image Generation**: Automatically generates beautiful food images using **Pollinations.ai (Flux model)** when the original recipe lacks a good image.
- **Tandoor Integration**:
  - Direct import from URL (using Tandoor's native parser).
  - Import extracted recipes (JSON) directly to your Tandoor instance.
  - Automatically uploads recipe images.
- **Modern UI**:
  - Fully responsive mobile-first design.
  - Dark/Light mode support.
  - Smooth animations and transitions.
  - Built with Tailwind CSS v4.

## Prerequisites

Before running the application, ensure you have:

- **Node.js**: Version 20 or higher is recommended.
- **Gemini API Key**: You can get a free API key from [Google AI Studio](https://aistudio.google.com/).
- **(Optional) Tandoor Instance**: A self-hosted running instance of [Tandoor Recipes](https://tandoor.dev/) if you want to use the import feature.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/recipeextractor.git
    cd recipeextractor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the application:**
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

VibeRecipe uses **localStorage** to manage your configuration securely in your browser. No server-side environment variables are required for basic usage.

1.  Click the **Settings (Gear Icon)** in the top-right corner of the app.
2.  **Gemini API Key**: Enter your Google Gemini API Key. This is **required** for extraction.
3.  **Tandoor Configuration** (Optional):
    - **Base URL**: The full URL to your Tandoor instance (e.g., `https://recipes.example.com`).
    - **API Token**: Your Tandoor API token (generated in Tandoor User Settings).

> **Note:** These keys are stored only in your browser's local storage and are sent to the backend via headers when making requests.

## Usage

1.  **Extract a Recipe**:
    - Paste a URL or text into the input field, OR
    - Click the image icon (or drag & drop) to upload a recipe image.
    - Click **"Extract"**.
2.  **Review**: The app will display the structured recipe card.
3.  **Retry**: If the result isn't perfect, you can click "Retry" to run the extraction again.
4.  **Import to Tandoor**:
    - If configured, click the "Import to Tandoor" button on the recipe card to save it to your collection.
    - For supported sites, you can also check "Use Tandoor Import" before extracting to let Tandoor handle the parsing directly.

## Development

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Lucide React (Icons)
- **AI Provider**: Google Generative AI SDK

### Commands
- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run start`: Start production server.
- `npm run lint`: Run ESLint.

### Project Structure
- `src/app`: App Router pages and API routes.
  - `api/extract`: Endpoint for Gemini extraction.
  - `api/tandoor`: Proxy endpoints for Tandoor API.
- `src/components`: React components (RecipeCard, MagicPasteInput, etc.).
- `src/lib`: Shared utilities, types, and constants.
