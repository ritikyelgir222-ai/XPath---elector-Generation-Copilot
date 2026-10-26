# XPath & Selector Generation Copilot (State-of-the-Art QA Studio)

Production-grade XPath, CSS selector, and Playwright semantic locator generator for test automation engineers across **Selenium**, **Playwright**, and **Cypress**.

> 📘 New to the tool? See **[HOW_TO_USE.md](./HOW_TO_USE.md)** for the full usage guide.

---

## 🚀 Quick Start Guide (VS Code)

### Prerequisites
- **Node.js** v18 or higher (v20+ recommended)
- **npm** v9 or higher

### Step 1: Open in VS Code
Extract the zip archive and open the project folder in VS Code:
```bash
cd xpath-copilot-project
code .
```

### Step 2: Install Dependencies
Open a terminal in VS Code (`Ctrl + \`` or `Cmd + \``) and run:
```bash
npm install
```

### Step 3: Environment Setup (Optional)
The application includes a dual-engine architecture:
- **Offline DOM Engine**: Parses your HTML, scores every element against your request and verifies each locator matches exactly one element. Runs 100% offline with zero configuration.
- **Gemini AI Engine (optional)**: Provides deeper contextual reasoning when an API key is provided. Its XPath is always verified against your HTML before display; if it fails, the offline engine answers instead.

To enable the Gemini AI engine, create a `.env` file:
```bash
cp .env.example .env
```
And set your key (Google AI Studio `AIza...` keys and Vertex AI express `AQ....` keys are both supported):
```env
GEMINI_API_KEY="your-key-here"
```

### Step 4: Start the Application
Run the development server:
```bash
npm run dev
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Available Scripts

- `npm run dev`: Starts the full-stack Express server with Vite middleware on port 3000.
- `npm run build`: Compiles TypeScript and creates an optimized production bundle in `/dist`.
- `npm run lint`: Runs TypeScript validation checks (`tsc --noEmit`).

---

## ✨ Key Features & Capabilities

1. **Strict 5-Tier Priority Selection Hierarchy**:
   - **Tier 1 (Gold Standard)**: `data-testid`, `data-qa`, `data-cy`, `data-test` (`//*[@data-testid='...']`)
   - **Tier 2**: Unique persistent attributes (static `id`, `name`, `placeholder`, rejecting framework hashes)
   - **Tier 3**: Semantic text with space normalization (`//button[normalize-space()='Submit']`)
   - **Tier 4**: Relational axis navigation (`//tr[contains(., 'John')]//button[normalize-space()='Delete']`)
   - **Tier 5**: Partial prefix/suffix matching (`contains(@id, 'btn-')`)

2. **Resilience Indicator UI**:
   - Assigns a letter grade (**A+ to F**) and stability score (0–100%) based on reliance on volatile attributes versus stable test IDs.
   - Evaluates Attribute Durability, DOM Independence, and Whitespace Defense.
   - Actionable stability tips and a suggested more-stable replacement locator.

3. **Full Testing World Scenarios Catalog**:
   - **Dynamic Data Tables**: Relative row/cell traversal (`following-sibling::`, `parent::tr`).
   - **SVG Namespace Trap**: Automatically avoids broken `//svg` by using `//*[local-name()='svg']` or accessible `@aria-label`.
   - **Shadow DOM**: Pierce locators for custom web components.
   - **Async Toasts & Alerts**: `role="alert"` and `aria-live="assertive"`.
   - **Comboboxes & Autocomplete**: `role="combobox"` and `role="option"`.
   - **Payment iFrames**: Frame-switched locators for Stripe Elements and payment sandboxes.

4. **Batch Element Harvester & POM Generator**:
   - One-click batch scanner to extract all interactable elements across the entire page.
   - Exports complete **Page Object Model (POM)** classes in:
     - **Playwright (TypeScript)**
     - **Selenium WebDriver (Java PageFactory)**
     - **Selenium WebDriver (Python)**
     - **Cypress Custom Commands**
   - Export all locators to **CSV**.

5. **Live Web Page URL Fetcher**:
   - Input any live staging or test URL to inspect its live DOM and generate locators directly.

6. **In-Browser Real-Time DOM Evaluator**:
   - Validates generated locators live against DOM with match count and node attribute previews.
