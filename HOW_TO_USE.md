# How to Use XPath & Selector Generation Copilot

A web app that turns an HTML snippet plus a plain-English request ("Find the submit button") into a ranked, resilient **XPath**, a **CSS selector**, a **Playwright locator**, and ready-to-paste code for six test frameworks.

---

## 1. Setup (one time)

**Requirements:** Node.js 18+ (20+ recommended) and npm.

```bash
npm install
cp .env.example .env      # optional, only needed for the Gemini AI engine
npm run dev
```

Open **http://localhost:3000**.

- **No API key needed.** The built-in offline engine parses your HTML, finds the element you describe, and returns only locators it has verified match exactly one element. The header shows `Engine: heuristic-engine`.
- **Optional Gemini engine:** put your key in `.env` as `GEMINI_API_KEY="..."` and restart. Both key types work: Google AI Studio keys (`AIza...`) and Vertex AI express-mode keys (`AQ....`, detected automatically). Gemini is tried first; its XPath is checked against your HTML, and if it is wrong or Gemini is unreachable the offline engine answers and the header shows `(Gemini unavailable)`.
- **Gemini settings (optional):** `GEMINI_MODEL` (default `gemini-2.5-flash`) and `GEMINI_TIMEOUT_MS` (default `20000`).
- **Never commit or share your `.env`.** It is git-ignored; the exported ZIP does not include it.
- **Port:** set `PORT=4000` in `.env` or the shell to change it.
- **Production:** `npm run build`, then `NODE_ENV=production npm run dev` serves the built `dist/`.

---

## 2. Quick start: generate your first locator

1. Open the **Copilot Studio** tab (the default).
2. In the left pane, paste your HTML into **HTML Markup (DOM)**. Or click a scenario chip (for example *E-Commerce Checkout*) to load a sample.
3. Type what you want in the request box, for example `Find the submit button in the checkout form`. Clicking a suggested prompt fills it in for you.
4. Click **Generate**.

> Scenario chips only load the sample HTML and a suggested request. You still need to click **Generate**.

---

## 3. Reading the results (right pane)

| Section | What it tells you |
|---|---|
| **Best XPath** + strategy badge | The top-ranked locator and which tier of the hierarchy produced it. **Copy** puts it on your clipboard. |
| **Confidence** | The engine's certainty, 0-100%. |
| **In-Browser DOM Match** | The XPath is run against your pasted HTML. You want **1 Unique Match**. 0 or many matches means the locator needs work. |
| **Architect's Rationale** | A short explanation of why this locator won. |
| **Resilience Indicator** | Letter grade A+ to F, a stability score, flakiness risk, and per-factor scores (attribute durability, DOM independence, whitespace defence). Low grades come with tips and a suggested more-stable locator. |
| **Alternative selectors** | Backup XPaths, an equivalent CSS selector, and the Playwright semantic locator (`getByRole`, `getByTestId`...). Each has **Copy**, **Test** and **Inspect**. |
| **Live XPath Tester** | Type or tweak any XPath and click **Evaluate** to see the match count and matched nodes. |
| **Framework snippets** | Code for Playwright (TS), Selenium (Java), Selenium (Python), Cypress, Robot Framework and Puppeteer. Pick a tab, then **Copy Snippet**. |

### How the engine ranks locators

1. `data-testid` / `data-qa` / `data-cy` / `data-test`
2. Unique, static `id` / `name` / `placeholder` (hashed or auto-generated values are rejected)
3. Visible text with `normalize-space()`
4. Relational / axis navigation (`following-sibling::`, `parent::`...)
5. Partial matching (`contains()`, `starts-with()`)

It never produces absolute `/html/body/...` paths or relies on framework hash classes.

---

## 4. Other features

### Interactive Element Inspector
In the left pane, switch from *HTML Markup* to **Interactive Element Inspector** to browse the parsed elements instead of reading raw markup.

### Fetch a live page
Click **Fetch URL** (header) or **Fetch Live URL** (left pane), enter an `http://` or `https://` address, and the page's HTML loads into the editor. The server fetches the page, so it must be able to reach that URL.
Pages rendered by JavaScript will only return their initial HTML. For those, copy the rendered DOM from your browser's DevTools (*Elements → Copy outerHTML*) and paste it instead.

### POM Harvester (Page Object Model generator)
1. Put your page HTML in Copilot Studio.
2. Open the **POM Harvester** tab. It lists every interactable element (button, input, select, checkbox, radio, link, custom) with its best XPath and a risk grade.
3. Use the type filters and the search box to narrow the list. **Test** runs that locator against the DOM.
4. Set the **Page Class Name**, then choose **Playwright (TS)**, **Selenium (Java)**, **Selenium (Python)** or **Cypress** to preview the generated class.
5. **Copy POM**, **Download POM**, or **Export CSV** of all locators.

### Raw JSON
The **Raw JSON** tab shows the exact response from the last generation (useful for debugging or piping into your own tooling).

### Strategy Rules
The **Strategy Rules** button opens the full selection hierarchy, anti-patterns and the list of special scenarios.

### Export ZIP for VS Code
Downloads this project's source as a ZIP (also available at `GET /api/download-zip`).

---

## 5. Built-in scenarios

| Chip | What it demonstrates |
|---|---|
| E-Commerce Checkout | Test-id and static-id priority |
| Dynamic Data Table | Row-relative locators (`//tr[contains(., 'John Doe')]//button...`) |
| SVG Icons | Avoiding the `//svg` namespace trap; `aria-label` |
| Shadow DOM | Custom elements with shadow roots |
| Async Toasts, Alerts | `role="alert"` / `aria-live` |
| Combobox, Select | `role="combobox"` / `role="option"` |
| Embedded iFrames | Frame-switched locators (Stripe-style) |
| Unlabelled Form | Label-anchored axis navigation |

---

## 6. HTTP API

```bash
# Generate locators
curl -X POST http://localhost:3000/api/generate-xpath \
  -H 'content-type: application/json' \
  -d '{"html":"<button data-testid=\"go\">Submit</button>","targetFunctionality":"submit button"}'

# Fetch a page's HTML
curl -X POST http://localhost:3000/api/fetch-url \
  -H 'content-type: application/json' -d '{"url":"https://example.com"}'
```

`/api/generate-xpath` requires both `html` and `targetFunctionality` (otherwise HTTP 400). The response contains `data.best_xpath`, `data.alternative_xpaths`, `data.alternative_css_selector`, `data.playwright_semantic_locator`, `data.confidence_score`, `data.explanation`, and `source` (`heuristic-engine` or Gemini).

---

## 7. Writing good requests

The engine splits a request into **what you want** and **where it is**:

- `Find the delete button for John Doe in the table` -> target: delete button; context: John Doe's row.
- `Find the card number input inside the payment iframe` -> target: card number input; context: the iframe.
- Use words that appear on the element: its visible text, label, placeholder, `aria-label`, or test id.
- Name the element type (button, link, input, checkbox, dropdown, option, alert/toast, iframe, image, heading). It sharply improves ranking.
- Say "submit button" to target a form's submit control even if its text is unusual.
- If nothing matches, the app says so (confidence 10%, grade F) instead of guessing. Add more HTML or use words from the page.

## 8. Tips and known limitations

- Always check the **DOM Match** badge. "1 Unique Match" means the locator was verified against your HTML.
- Include enough HTML for the target and its surrounding context (labels, row, parent form).
- Plain XPath cannot cross a real **Shadow DOM** or **iframe** boundary. For those the app returns host/frame-scoped XPaths (the frame content is inlined for verification) plus Playwright locators that do pierce or switch frames.
- Locators are checked against the HTML you paste, not the live page. JavaScript-rendered pages should be pasted from DevTools (*Copy outerHTML*).
- A grade below B usually means missing `data-testid` attributes. Adding them to your app is the best fix.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm install` fails with `ERESOLVE` on `esbuild` | Use the updated `package.json` (esbuild `^0.28.0`), or run `npm install --legacy-peer-deps`. |
| Header says `heuristic-engine (Gemini unavailable)` | The key is wrong, the model name is not available to your key, or the server cannot reach Google. See the server log line `Gemini API Error:` for the reason. The offline engine still works. |
| Fetch URL says "fetch failed" | The server machine cannot reach that site (network, proxy, or firewall). Paste the HTML manually. |
| Port already in use | Set `PORT` to another value. |
| Type errors | Run `npm run lint`. |
