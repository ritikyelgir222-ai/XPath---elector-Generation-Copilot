import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';
import { generateHeuristicSelector, countXPathMatches } from './src/engine/heuristic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client.
// Keys starting with "AQ." are Vertex AI express-mode keys; everything else is a Gemini Developer API key.
const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();
const IS_VERTEX_KEY = GEMINI_KEY.startsWith('AQ.');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '20000', 10);
const ai = new GoogleGenAI(
  IS_VERTEX_KEY ? { vertexai: true, apiKey: GEMINI_KEY } : { apiKey: GEMINI_KEY || 'unset' }
);

export interface CopilotResult {
  target_functionality: string;
  best_xpath: string;
  strategy_used: string;
  alternative_xpaths: string[];
  alternative_css_selector: string | null;
  playwright_semantic_locator: string;
  confidence_score: string | number;
  explanation: string;
}

const SYSTEM_INSTRUCTION = `You are an expert Test Automation Architect specializing in XPath generation, DOM parsing, and resilient locator strategies across Selenium, Playwright, and Cypress. 
Your primary task is to receive an HTML snippet (or DOM fragment) along with a target functionality/user request (e.g., "Find the submit button in the checkout form" or "Find the email input field next to the login label") and generate the single BEST, most resilient XPath, along with alternative backup selectors.

Selection Hierarchy Strategy (Strict Order of Priority):
When determining the "BEST" XPath, you MUST evaluate choices using the following priority rules:

1. Standard QA Attributes (Gold Standard for Stability):
   - Prioritize explicitly configured testing attributes: \`data-testid\`, \`data-qa\`, \`data-cy\`, \`data-test\`.
   - Pattern: \`//*[@data-testid='value']\`

2. Unique Persistent Attributes:
   - Unique \`id\`, \`name\`, or \`placeholder\` (ensure they are static and NOT auto-generated hashes like \`input_9824a\`).
   - Pattern: \`//input[@id='username']\` or \`//input[@name='email']\`

3. Semantic Text & Space Normalization:
   - Visible inner text using \`normalize-space()\` or \`text()\` (for buttons, links, labels).
   - Pattern: \`//button[normalize-space()='Submit']\` or \`//a[contains(text(),'Sign In')]\`

4. Relational & Axis Navigation (For dynamic tables or unlabelled inputs):
   - Locate a stable anchor (e.g., \`<label>\` or \`<td>\`) and traverse relative to it using axes (\`following-sibling::\`, \`parent::\`, \`ancestor::\`).
   - Pattern: \`//label[normalize-space()='Email']/following-sibling::input[1]\`

5. Partial Matching (For dynamic prefixes/suffixes):
   - Use \`contains()\` or \`starts-with()\` for semi-dynamic attributes.
   - Pattern: \`//button[contains(@id, 'btn-submit')]\`

Anti-Patterns (STRICTLY FORBIDDEN):
- NEVER generate Absolute XPaths starting from \`/html/body/...\`.
- NEVER use brittle positional indices like \`(//div/span/input)[14]\` unless no other unique hook exists.
- NEVER rely on auto-generated framework class names (e.g., Tailwind/CSS-in-JS hashes like \`class="css-1a2b3c4"\`).

Output Format Requirement:
You MUST return ONLY a valid, raw JSON object matching the following schema without any conversational filler or markdown blocks:

{
  "target_functionality": "<brief description of requested element>",
  "best_xpath": "<the single highest-priority resilient XPath>",
  "strategy_used": "<e.g., QA Attribute / Text Normalized / Axis Traversal / Partial Match>",
  "alternative_xpaths": [
    "<backup XPath 1>",
    "<backup XPath 2>"
  ],
  "alternative_css_selector": "<equivalent CSS selector if possible, else null>",
  "playwright_semantic_locator": "<e.g., page.getByRole(...) or page.getByTestId(...)>",
  "confidence_score": "<0.0 to 1.0>",
  "explanation": "<1-2 sentence explanation of why this XPath was chosen over others>"
}`;

// API Route to fetch any live web page HTML for testers
app.post('/api/fetch-url', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'Please provide a valid http:// or https:// URL.' });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const fetchRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!fetchRes.ok) {
      res.status(fetchRes.status).json({
        error: `Target URL returned HTTP status ${fetchRes.status} ${fetchRes.statusText}`,
      });
      return;
    }

    const html = await fetchRes.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    res.json({
      success: true,
      url,
      title,
      html,
    });
  } catch (err: any) {
    res.status(500).json({
      error: `Failed to fetch URL: ${err.message || 'Network request failed'}`,
    });
  }
});

// Helper to recursively add project files to JSZip
function addDirToZip(zip: JSZip, currentDir: string, rootDir: string) {
  const entries = fs.readdirSync(currentDir);
  for (const entry of entries) {
    if (
      entry === 'node_modules' || 
      entry === 'dist' || 
      entry === '.git' || 
      entry === '.aistudio' ||
      entry.endsWith('.zip')
    ) {
      continue;
    }
    const fullPath = path.join(currentDir, entry);
    const relPath = path.relative(rootDir, fullPath);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addDirToZip(zip, fullPath, rootDir);
    } else {
      const fileData = fs.readFileSync(fullPath);
      zip.file(relPath, fileData);
    }
  }
}

// API Route to download entire source code as a ZIP archive for VS Code
app.get('/api/download-zip', async (_req: Request, res: Response) => {
  try {
    const zip = new JSZip();
    addDirToZip(zip, __dirname, __dirname);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="xpath-copilot-project.zip"');
    res.setHeader('Content-Length', zipBuffer.length.toString());
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('ZIP generation error:', err);
    res.status(500).json({ error: 'Failed to create project zip file: ' + err.message });
  }
});

// API Route for XPath & Selector Generation
app.post('/api/generate-xpath', async (req: Request, res: Response) => {
  const { html, targetFunctionality } = req.body;

  if (!html || !targetFunctionality) {
    res.status(400).json({
      error: 'Both "html" and "targetFunctionality" fields are required.',
    });
    return;
  }

  const isKeyConfigured = GEMINI_KEY.length > 5 && GEMINI_KEY !== 'MY_GEMINI_API_KEY' && !/your-gemini-api-key/i.test(GEMINI_KEY);
  let geminiError = '';

  // Attempt Gemini API call if real key is present
  if (isKeyConfigured) {
    try {
      const prompt = `HTML Snippet:\n\`\`\`html\n${html}\n\`\`\`\n\nTarget Functionality / Element Request:\n"${targetFunctionality}"\n\nGenerate the single BEST resilient XPath and alternatives according to the strict priority hierarchy and return ONLY the JSON object.`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini API request timed out after ${GEMINI_TIMEOUT_MS}ms`)), GEMINI_TIMEOUT_MS)
      );

      const geminiPromise = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              target_functionality: {
                type: Type.STRING,
                description: 'Brief description of requested element',
              },
              best_xpath: {
                type: Type.STRING,
                description: 'The single highest-priority resilient XPath',
              },
              strategy_used: {
                type: Type.STRING,
                description: 'Strategy used e.g. QA Attribute, Text Normalized, Axis Traversal, Partial Match',
              },
              alternative_xpaths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Alternative backup XPaths',
              },
              alternative_css_selector: {
                type: Type.STRING,
                description: 'Equivalent CSS selector if possible, else null',
              },
              playwright_semantic_locator: {
                type: Type.STRING,
                description: 'e.g. page.getByRole(...) or page.getByTestId(...)',
              },
              confidence_score: {
                type: Type.STRING,
                description: 'Confidence score from 0.0 to 1.0',
              },
              explanation: {
                type: Type.STRING,
                description: '1-2 sentence explanation of why this XPath was chosen over others',
              },
            },
            required: [
              'target_functionality',
              'best_xpath',
              'strategy_used',
              'alternative_xpaths',
              'playwright_semantic_locator',
              'confidence_score',
              'explanation',
            ],
          },
        },
      });

      const response = await Promise.race([geminiPromise, timeoutPromise]);

      const text = response.text?.trim() || '';
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Unable to parse JSON from AI response: ' + text.slice(0, 200));
        parsed = JSON.parse(match[0]);
      }
      if (!parsed || typeof parsed.best_xpath !== 'string') throw new Error('AI response missing best_xpath');

      // Never trust the model blindly: verify its XPath against the supplied HTML.
      const n = countXPathMatches(html, parsed.best_xpath);
      if (n !== 1) {
        const alt = (Array.isArray(parsed.alternative_xpaths) ? parsed.alternative_xpaths : []).find(
          (x: any) => typeof x === 'string' && countXPathMatches(html, x) === 1
        );
        if (!alt) throw new Error(`Gemini XPath matched ${n} elements (expected exactly 1)`);
        parsed.alternative_xpaths = [parsed.best_xpath, ...parsed.alternative_xpaths.filter((x: string) => x !== alt)].slice(0, 3);
        parsed.best_xpath = alt;
      }
      res.json({ success: true, data: parsed, source: GEMINI_MODEL });
      return;
    } catch (err: any) {
      geminiError = String(err?.message || err).slice(0, 300);
      console.error('Gemini API Error:', geminiError);
      // Fall through to heuristic fallback
    }
  }

  // Heuristic offline engine fallback
  const fallbackResult = generateHeuristicSelector(html, targetFunctionality);
  res.json({
    success: true,
    data: fallbackResult,
    source: 'heuristic-engine',
    note: isKeyConfigured
      ? `Gemini unavailable (${geminiError}); used the offline DOM engine.`
      : 'Offline DOM engine (no GEMINI_API_KEY set).',
  });
});

// Dev and Prod Vite server integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      // Don't intercept API routes
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`XPath & Selector Copilot server running on http://0.0.0.0:${port}`);
  });
}

startServer();
