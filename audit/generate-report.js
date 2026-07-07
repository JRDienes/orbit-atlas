#!/usr/bin/env node
// Reads a Lighthouse JSON report, writes a Claude-optimized markdown report to stdout,
// and appends a scores entry to audit/scores-history.jsonl (rolling 90 days).
// Usage: node audit/generate-report.js <lighthouse-report.json> > audit/latest-report.md

const fs = require('fs');
const path = require('path');

const reportPath = process.argv[2];
if (!reportPath || !fs.existsSync(reportPath)) {
  process.stderr.write(`Usage: node generate-report.js <lighthouse-report.json>\n`);
  process.exit(1);
}

const lhr = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const cats = lhr.categories;
const audits = lhr.audits;
const date = new Date(lhr.fetchTime).toISOString().split('T')[0];

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(val) {
  if (val === null || val === undefined) return 'N/A';
  const n = Math.round(val * 100);
  if (n >= 90) return `${n} ✅`;
  if (n >= 50) return `${n} ⚠️`;
  return `${n} ❌`;
}

function rating(audit) {
  if (!audit || audit.score === null) return '';
  if (audit.score >= 0.9) return 'Good ✅';
  if (audit.score >= 0.5) return 'Needs Improvement ⚠️';
  return 'Poor ❌';
}

function auditVal(id) {
  return audits[id]?.displayValue ?? 'N/A';
}

function auditMs(id) {
  return audits[id]?.numericValue ?? 0;
}

// ── Source file hints — maps Lighthouse audit IDs to files in this repo ──────
// Update these as the codebase evolves.

const SOURCE_HINTS = {
  'unused-javascript':
    'orbit-atlas-web/src/components/SatVisual.js, satWorker.js (Three.js tree-shaking — import only used classes)',
  'unused-css-rules':
    'orbit-atlas-web/src/App.css, index.css',
  'render-blocking-resources':
    'orbit-atlas-web/public/index.html (add preload/defer)',
  'total-byte-weight':
    'orbit-atlas-web/src/assets/ (textures), Three.js bundle',
  'uses-long-cache-ttl':
    'Vercel headers config (vercel.json)',
  'efficient-animated-content':
    'orbit-atlas-web/src/components/SatVisual.js (Three.js render loop)',
  'uses-optimized-images':
    'orbit-atlas-web/src/assets/ (compress/convert to WebP)',
  'dom-size':
    'orbit-atlas-web/src/components/FilterPanel.js, CountryCodesPanel.js (virtualize long lists)',
  'mainthread-work-breakdown':
    'orbit-atlas-web/src/satWorker.js (move more computation off-thread)',
  'bootup-time':
    'orbit-atlas-web/src/App.js, satWorker.js (defer heavy init)',
  'uses-passive-event-listeners':
    'orbit-atlas-web/src/components/SatVisual.js (Three.js mouse/touch listeners → passive)',
  'largest-contentful-paint-element':
    'orbit-atlas-web/src/components/LoadingOverlay.js, App.js',
  'long-tasks':
    'orbit-atlas-web/src/satWorker.js (chunk postMessage payloads; max 50ms per task)',
  'third-party-facades':
    'External: wheretheiss.at ISS API calls',
  'critical-request-chains':
    'orbit-atlas-web/src/index.js (reduce critical path depth)',
  'network-rtt':
    'Vercel edge network / CDN config',
  'uses-text-compression':
    'Vercel / react-scripts build output (brotli/gzip)',
  'uses-rel-preconnect':
    'orbit-atlas-web/public/index.html (preconnect to Supabase URL)',
  'non-composited-animations':
    'orbit-atlas-web/src/components/LoadingOverlay.js, About.js (use transform/opacity only)',
};

// ── Collect opportunities (audits with details.type === 'opportunity') ────────

const opportunities = Object.values(audits)
  .filter(a => a.details?.type === 'opportunity' && (a.numericValue ?? 0) > 100)
  .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))
  .slice(0, 8);

// ── Collect failed accessibility audits ──────────────────────────────────────

const a11yRefs = new Set((cats.accessibility?.auditRefs ?? []).map(r => r.id));
const a11yFails = Object.values(audits)
  .filter(a => a11yRefs.has(a.id) && a.score !== null && a.score < 1)
  .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  .slice(0, 10);

// ── Network breakdown ─────────────────────────────────────────────────────────

const netItems = audits['network-requests']?.details?.items ?? [];
const byType = {};
let totalBytes = 0;
netItems.forEach(req => {
  const t = req.resourceType || 'Other';
  byType[t] = (byType[t] ?? 0) + (req.transferSize ?? 0);
  totalBytes += (req.transferSize ?? 0);
});

// ── Previous scores for trend arrows ─────────────────────────────────────────

const historyPath = path.join(__dirname, 'scores-history.jsonl');
let prevEntry = null;
if (fs.existsSync(historyPath)) {
  const lines = fs.readFileSync(historyPath, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length > 0) {
    try { prevEntry = JSON.parse(lines[lines.length - 1]); } catch (_) {}
  }
}

function trend(now, prev, key) {
  if (!prev || prev[key] == null || now == null) return '';
  const delta = Math.round(now * 100) - Math.round(prev[key] * 100);
  if (delta > 0) return ` ↑${delta}`;
  if (delta < 0) return ` ↓${Math.abs(delta)}`;
  return ' →';
}

function trendMs(nowMs, prev, key) {
  if (!prev || prev[key] == null || nowMs == null) return '';
  const delta = Math.round(nowMs - prev[key]);
  if (delta < -50) return ` ↓${Math.abs(delta)}ms faster`;
  if (delta > 50) return ` ↑${delta}ms slower`;
  return ' →';
}

// ── Prioritised action list ───────────────────────────────────────────────────

const tbt  = auditMs('total-blocking-time');
const lcp  = auditMs('largest-contentful-paint');
const tti  = auditMs('interactive');
const fcp  = auditMs('first-contentful-paint');
const cls  = auditMs('cumulative-layout-shift');

const actions = [];

if (tbt > 300) {
  actions.push({
    priority: 'HIGH', metric: 'TBT',
    action: `Total Blocking Time is ${audits['total-blocking-time']?.displayValue}. Break large \`postMessage\` payloads from the satellite worker into smaller chunks so the main thread is never blocked > 50 ms.`,
    files: 'orbit-atlas-web/src/satWorker.js',
  });
}
if (lcp > 2500) {
  actions.push({
    priority: 'HIGH', metric: 'LCP',
    action: `LCP is ${audits['largest-contentful-paint']?.displayValue}. Add \`<link rel="preload">\` for the Earth texture in index.html and consider lazy-loading non-critical panels.`,
    files: 'orbit-atlas-web/public/index.html, orbit-atlas-web/src/App.js',
  });
}
const unusedJs = audits['unused-javascript'];
if ((unusedJs?.numericValue ?? 0) > 150) {
  actions.push({
    priority: 'HIGH', metric: 'Bundle / Unused JS',
    action: `${unusedJs.displayValue} potential savings from unused JavaScript. Tree-shake Three.js — import only \`BufferGeometry\`, \`Points\`, \`PointsMaterial\`, etc. instead of the full \`three\` package.`,
    files: 'orbit-atlas-web/src/components/SatVisual.js, orbit-atlas-web/src/satWorker.js',
  });
}
if (tti > 3800) {
  actions.push({
    priority: 'HIGH', metric: 'TTI',
    action: `Time to Interactive is ${audits['interactive']?.displayValue}. Defer satellite worker initialization until after first paint; show the loading overlay immediately to unblock the main thread.`,
    files: 'orbit-atlas-web/src/App.js, orbit-atlas-web/src/satWorker.js',
  });
}
const renderBlocking = audits['render-blocking-resources'];
if ((renderBlocking?.numericValue ?? 0) > 100) {
  actions.push({
    priority: 'MEDIUM', metric: 'FCP',
    action: `Render-blocking resources cost ${renderBlocking.displayValue}. Add \`defer\` or \`async\` to non-critical scripts; preload critical CSS.`,
    files: 'orbit-atlas-web/public/index.html',
  });
}
const domNodes = audits['dom-size']?.numericValue ?? 0;
if (domNodes > 1500) {
  actions.push({
    priority: 'MEDIUM', metric: 'DOM Size',
    action: `DOM has ${audits['dom-size']?.displayValue}. Virtualise the country code list in CountryCodesPanel — only render codes for visible categories.`,
    files: 'orbit-atlas-web/src/components/CountryCodesPanel.js, FilterPanel.js',
  });
}
const preconnect = audits['uses-rel-preconnect'];
if (preconnect && preconnect.score !== null && preconnect.score < 1) {
  actions.push({
    priority: 'LOW', metric: 'Network',
    action: 'Add `<link rel="preconnect">` for the Supabase URL so the first DB query doesn\'t pay DNS + TLS setup time.',
    files: 'orbit-atlas-web/public/index.html',
  });
}
if (cls > 0.1) {
  actions.push({
    priority: 'MEDIUM', metric: 'CLS',
    action: `CLS is ${audits['cumulative-layout-shift']?.displayValue}. Reserve dimensions for the globe canvas and panels before they paint.`,
    files: 'orbit-atlas-web/src/App.css, orbit-atlas-web/src/components/SatVisual.js',
  });
}

if (actions.length === 0) {
  actions.push({
    priority: 'INFO', metric: 'General',
    action: 'No critical issues detected. Review the Opportunities section above for incremental gains.',
    files: '',
  });
}

// ── Build markdown ────────────────────────────────────────────────────────────

const perfScore = Math.round((cats.performance?.score ?? 0) * 100);

let md = `# Orbit Atlas — Nightly Performance Audit
**Date:** ${date}
**URL:** ${lhr.finalDisplayedUrl}
**Mode:** Desktop (Lighthouse ${lhr.lighthouseVersion})

---

## Scores

| Category | Score | Trend |
|---|---|---|
| Performance | ${pct(cats.performance?.score)} | ${trend(cats.performance?.score, prevEntry, 'performance')} |
| Accessibility | ${pct(cats.accessibility?.score)} | ${trend(cats.accessibility?.score, prevEntry, 'accessibility')} |
| Best Practices | ${pct(cats['best-practices']?.score)} | ${trend(cats['best-practices']?.score, prevEntry, 'bestPractices')} |
| SEO | ${pct(cats.seo?.score)} | ${trend(cats.seo?.score, prevEntry, 'seo')} |

---

## Core Web Vitals

| Metric | Value | Rating | Trend |
|---|---|---|---|
| First Contentful Paint (FCP) | ${auditVal('first-contentful-paint')} | ${rating(audits['first-contentful-paint'])} | ${trendMs(fcp, prevEntry, 'fcp')} |
| Largest Contentful Paint (LCP) | ${auditVal('largest-contentful-paint')} | ${rating(audits['largest-contentful-paint'])} | ${trendMs(lcp, prevEntry, 'lcp')} |
| Total Blocking Time (TBT) | ${auditVal('total-blocking-time')} | ${rating(audits['total-blocking-time'])} | ${trendMs(tbt, prevEntry, 'tbt')} |
| Cumulative Layout Shift (CLS) | ${auditVal('cumulative-layout-shift')} | ${rating(audits['cumulative-layout-shift'])} | ${trendMs(cls * 1000, prevEntry, 'cls')} |
| Speed Index | ${auditVal('speed-index')} | ${rating(audits['speed-index'])} | |
| Time to Interactive (TTI) | ${auditVal('interactive')} | ${rating(audits['interactive'])} | ${trendMs(tti, prevEntry, 'tti')} |
| Interaction to Next Paint (INP) | ${auditVal('interaction-to-next-paint')} | ${rating(audits['interaction-to-next-paint'])} | |

---

## Diagnostics

| Metric | Value |
|---|---|
| JS Execution Time | ${auditVal('bootup-time')} |
| Main Thread Work | ${auditVal('mainthread-work-breakdown')} |
| DOM Size | ${auditVal('dom-size')} |
| Total Page Weight | ${auditVal('total-byte-weight')} |
| Network Requests | ${netItems.length || 'N/A'} |

`;

// Opportunities
if (opportunities.length > 0) {
  md += `---\n\n## Opportunities (Estimated Savings)\n\n`;
  opportunities.forEach((opp, i) => {
    const hint = SOURCE_HINTS[opp.id] ? `\n   > **Source:** \`${SOURCE_HINTS[opp.id]}\`` : '';
    md += `${i + 1}. **${opp.title}** — _${opp.displayValue ?? '?'}_${hint}\n\n`;
  });
}

// Network breakdown
if (Object.keys(byType).length > 0) {
  md += `---\n\n## Network Breakdown\n\n`;
  md += `| Resource Type | Transfer Size |\n|---|---|\n`;
  Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, bytes]) => {
      md += `| ${type} | ${(bytes / 1024).toFixed(0)} KB |\n`;
    });
  md += `| **Total** | **${(totalBytes / 1024).toFixed(0)} KB** |\n\n`;
}

// Accessibility
if (a11yFails.length > 0) {
  md += `---\n\n## Accessibility Issues\n\n`;
  a11yFails.forEach(a => {
    const count = a.details?.items?.length ? ` (${a.details.items.length})` : '';
    md += `- [ ] **${a.title}**${count} — ${(a.description ?? '').split('.')[0]}\n`;
  });
  md += '\n';
}

// Prioritised action list
md += `---\n\n## Suggested Actions for Claude Code\n\n`;
md += `> Read this file at the start of a session. Each item below maps to specific source files — pick the highest-priority unfixed item and implement it.\n\n`;

actions.forEach((s, i) => {
  md += `### ${i + 1}. [${s.priority}] ${s.metric}\n\n${s.action}\n`;
  if (s.files) md += `\n**Files:** \`${s.files}\`\n`;
  md += '\n';
});

// Trend history note
md += `---\n\n## Score History\n\n`;
md += `See [\`audit/scores-history.jsonl\`](scores-history.jsonl) for the rolling 90-day log.\n\n`;

md += `---\n*Generated by [\`.github/workflows/nightly-audit.yml\`](../.github/workflows/nightly-audit.yml) • Lighthouse ${lhr.lighthouseVersion}*\n`;

// ── Write markdown to stdout ──────────────────────────────────────────────────

process.stdout.write(md);

// ── Append to scores-history.jsonl (side-effect) ─────────────────────────────

const entry = {
  date,
  performance: cats.performance?.score ?? null,
  accessibility: cats.accessibility?.score ?? null,
  bestPractices: cats['best-practices']?.score ?? null,
  seo: cats.seo?.score ?? null,
  fcp,
  lcp,
  tbt,
  cls,
  tti,
  totalBytes,
};

let lines = [];
if (fs.existsSync(historyPath)) {
  lines = fs.readFileSync(historyPath, 'utf8').trim().split('\n').filter(Boolean);
}

// Prune entries older than 90 days
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);
lines = lines.filter(line => {
  try {
    const e = JSON.parse(line);
    return new Date(e.date) >= cutoff;
  } catch (_) { return false; }
});

lines.push(JSON.stringify(entry));
fs.writeFileSync(historyPath, lines.join('\n') + '\n', 'utf8');
process.stderr.write(`History updated: ${historyPath} (${lines.length} entries)\n`);
