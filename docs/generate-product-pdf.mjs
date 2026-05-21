/**
 * Generates docs/Muhafiz-Armour-Product-Overview.pdf from PRODUCT_OVERVIEW.md
 * Run: node docs/generate-product-pdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, 'PRODUCT_OVERVIEW.md');
const cssPath = path.join(__dirname, 'pdf-styles.css');
const mmdcBin = path.join(
  __dirname,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc',
);
const mermaidConfigPath = path.join(__dirname, 'mermaid-config.json');
const outPath = path.join(__dirname, 'Muhafiz-Armour-Product-Overview.pdf');
const tmpDir = path.join(__dirname, '_pdf-tmp');

const generatedDate = new Date().toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function decodeHtmlEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function renderMermaidToSvg(source, index) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const base = path.join(tmpDir, `diagram-${index}`);
  const inputPath = `${base}.mmd`;
  const outputPath = `${base}.svg`;

  fs.writeFileSync(inputPath, source, 'utf8');

  const width = source.trimStart().startsWith('stateDiagram') ? '1100' : '900';
  await execFileAsync(
    mmdcBin,
    ['-i', inputPath, '-o', outputPath, '-c', mermaidConfigPath, '-b', 'transparent', '-w', width],
    { cwd: __dirname, windowsHide: true, shell: true },
  );

  let svg = fs.readFileSync(outputPath, 'utf8');
  // Drop XML declaration for inline HTML embedding
  svg = svg.replace(/<\?xml[^>]*\?>\s*/i, '');
  return svg;
}

/** Replace markdown mermaid fences with rendered SVG (same source as chat). */
async function convertMermaidBlocks(html) {
  const blocks = [...html.matchAll(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g)];
  let out = html;
  let index = 0;

  for (const match of blocks) {
    const source = decodeHtmlEntities(match[1].trim());
    const svg = await renderMermaidToSvg(source, index);
    const figure = `<div class="mermaid-diagram" role="img" aria-label="Diagram ${index + 1}">${svg}</div>`;
    out = out.replace(match[0], figure);
    index += 1;
  }

  return { html: out, count: index };
}

function buildHtml(bodyHtml, css) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Muhafiz Armour: Product & Feature Overview</title>
  <style>${css}</style>
</head>
<body>
  <section class="cover">
    <div class="cover-inner">
      <div class="cover-badge">Business overview</div>
      <h1>Muhafiz Armour</h1>
      <p class="subtitle">Product and feature overview for Pakistan&apos;s armoured mobility marketplace</p>
      <div class="cover-meta">
        <p><strong>Document type</strong> · Product &amp; operations brief</p>
        <p><strong>Prepared</strong> · ${generatedDate}</p>
        <p><strong>Platforms</strong> · Mobile app · API · Admin portal</p>
      </div>
    </div>
    <div class="cover-footer">CONFIDENTIAL · INTERNAL &amp; STAKEHOLDER USE</div>
  </section>

  <section class="content">
    <div class="doc-header">
      <div class="brand">Muhafiz Armour</div>
      <h2>Product &amp; Feature Overview</h2>
    </div>
    ${bodyHtml}
  </section>
</body>
</html>`;
}

async function main() {
  if (!fs.existsSync(mmdcBin)) {
    throw new Error('mmdc not found. Run: npm install (in docs folder)');
  }

  const md = fs.readFileSync(mdPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  let bodyHtml = marked.parse(md, { gfm: true });
  const { html: withDiagrams, count } = await convertMermaidBlocks(bodyHtml);
  bodyHtml = withDiagrams;

  if (count === 0) {
    console.warn('Warning: no mermaid diagrams found in markdown');
  }

  const html = buildHtml(bodyHtml, css);
  const htmlPath = path.join(__dirname, '_pdf-preview.html');
  fs.writeFileSync(htmlPath, html, 'utf8');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 1400, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width:100%;font-size:8px;color:#8896a8;padding:0 18mm;font-family:Segoe UI,Arial,sans-serif;
          display:flex;justify-content:space-between;">
          <span>Muhafiz Armour · Product Overview</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
      margin: { top: '14mm', bottom: '18mm', left: '0', right: '0' },
    });
  } finally {
    await browser.close();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  console.log(`PDF written: ${outPath} (${count} mermaid diagram(s))`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
