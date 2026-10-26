# XPath & Selector Generation Copilot (State-of-the-Art QA Studio)

Production-grade XPath, CSS selector, and Playwright semantic locator generator for test automation engineers across **Selenium**, **Playwright**, and **Cypress**.

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
- **Instant AST / DOM Heuristic Engine**: Runs 100% offline with zero configuration and sub-50ms latency.
- **Gemini 3.8 Flash AI Engine**: Provides deep contextual reasoning when an API key is provided.

To enable the Gemini AI engine, create a `.env` file:
```bash
cp .env.example .env
```
And set your Gemini API key:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
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
   - Actionable stability improvement tips and a 1-click **Auto-Upgrade to Grade A** button.

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
