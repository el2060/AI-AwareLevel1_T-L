// Builds a self-contained, multi-page static copy of the package for upload to
// Brightspace (or any plain file host). One HTML file per section, real <a>
// navigation between them, every asset local and every path relative, so it
// works from a folder with no server and no build step.
//
//   node scripts/build-lms.mjs
//
// Output: lms-build/  (and AI_TL_Essentials_Level1_LMS.zip via the npm script)
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { icon } from "./lms/icons.mjs";
import { markdownToHtml, splitSections, withoutTitle } from "./lms/markdown.mjs";
import * as W from "./lms/widgets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "lms-build");

const contentsMeta = [
  { title: "Start here", label: "AI-enabled T&L context · Package overview" },
  { title: "NP’s Approach to AI-Enabled T&L", label: "Five strategies · AI-ready graduates" },
  { title: "Curriculum Design and Development", label: "3As · Competencies and learning outcomes" },
  { title: "Facilitation of Learning", label: "PAIR · Scaffolding AI-supported learning" },
  { title: "Assessment", label: "GenAI guidance · Conditions and evidence" },
  { title: "Data and Tech-Enhanced T&L", label: "AI tools · Learning support and data" },
  { title: "Bring It Together", label: "Four-area module review · Next step" },
];

const partIcons = { 1: "Compass", 2: "BookOpen", 3: "Lightbulb", 4: "ClipboardCheck", 5: "ShieldCheck", 6: "Layers" };

const sectionBridges = [
  "See how these four areas connect to NP’s direction for AI-enabled T&L.",
  "Begin with curriculum: what competencies should our students develop and demonstrate as professional practice changes?",
  "Explore PAIR, a simple framework for helping students use AI purposefully, critically and responsibly in their learning.",
  "Consider how clear GenAI conditions and assessment design can provide valid and reliable evidence of learning and students' own contribution.",
  "Explore how AI tools and learning data can be used purposefully to support learning, while protecting information, verifying outputs and retaining human oversight.",
  "Bring the four areas together by reviewing one module you teach, lead or support.",
];

const markerRenderers = {
  "<!--use-case-explorer-->": W.useCaseExplorer,
  "<!--tandl-uses-->": W.tandlUses,
  "<!--tool-guidance-->": W.toolGuidance,
  "<!--tool-fit-visual-->": W.chooseToolsVisual,
  "<!--pair-infographic-->": W.pairInfographic,
  "<!--assessment-actions-infographic-->": W.assessmentActionsInfographic,
  "<!--alignment-check-visual-->": W.alignmentCheckVisual,
  "<!--alignment-flow-visual-->": W.alignmentFlowVisual,
  "<!--module-preview-->": W.modulePreviewVisual,
  "<!--student-baseline-visual-->": W.studentBaselineVisual,
  "<!--baseline-3as-relation-->": W.baselineThreeAsRelation,
  "<!--three-as-visual-->": W.threeAsInfographic,
  "<!--strategy-map-->": W.strategyMap,
  "<!--support-or-replace-->": W.supportReplaceSorter,
  "<!--three-as-misconception-check-->": W.threeAsMisconceptionCheck,
  "<!--genai-conditions-check-->": W.genAiConditionsSorter,
  "<!--module-review-->": W.fourLensReview,
  "<!--next-step-->": W.nextStep,
  "<!--pair-apply-checklist-->": W.pairApplyChecklist,
  "<!--quiz-readiness-recap-->": W.quizReadinessRecap,
};

const pageName = (index) => (index === 0 ? "index.html" : `part-${index}.html`);

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderBody(section, index, total) {
  if (index === 0) return W.homeFlow() + "\n" + W.openingVisual();

  const markdown = withoutTitle(section.markdown);
  const pattern = new RegExp(`(${Object.keys(markerRenderers).map((m) => m.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&")).join("|")})`, "g");
  const segments = markdown.split(pattern).filter((segment) => segment !== "");

  let first = true;
  const parts = segments.map((segment) => {
    const render = markerRenderers[segment];
    if (render) return `<div>${render()}</div>`;
    const className = first ? "course-content" : "course-content course-content-continuation";
    first = false;
    return `<article class="${className}">${markdownToHtml(segment)}</article>`;
  });

  if (section.title.startsWith("Part 5")) {
    parts.push(W.quickSenseCheck(), W.partFiveTakeaway());
  }
  return parts.join("\n");
}

function renderPage({ sections, index }) {
  const section = sections[index];
  const total = sections.length;
  const isHome = index === 0;
  const isLast = index === total - 1;
  const partNumber = section.title.match(/^Part (\d+)/)?.[1] ?? null;
  const partClass = partNumber ? `part-tone-${partNumber}` : "";
  const [titleMain, ...titleRest] = section.shortTitle.split(" — ");
  const titleSubtitle = titleRest.join(" — ") || null;
  const bridge = sectionBridges[index];
  const hasInlineNextPrompt = /^\s*(\*\*Next\*\*|#{1,4}\s+Next)\s*$/m.test(withoutTitle(section.markdown));

  const head = isHome
    ? `<h1 class="page-title home-title"><span>AI T&amp;L Essentials</span><small>Level 1 <i aria-hidden="true">·</i> AI-Aware</small></h1>`
    : `<div class="section-head">
        ${partNumber ? `<span class="part-eyebrow">Part ${partNumber}</span>` : ""}
        <h1 class="page-title part-title">${esc(titleMain)}</h1>
        ${titleSubtitle ? `<p class="page-subtitle">${esc(titleSubtitle)}</p>` : ""}
        ${partNumber ? icon(partIcons[Number(partNumber)], { size: 116, strokeWidth: 1.4, className: "section-watermark" }) : ""}
      </div>`;

  const contentsList = sections
    .map((item, i) => {
      const meta = contentsMeta[i];
      const title = meta?.title ?? item.shortTitle;
      const label = meta?.label ?? "";
      return `<a href="${pageName(i)}" class="${i === index ? "active" : ""}" ${i === index ? 'aria-current="page"' : ""} data-section="${item.id}">
        <span class="contents-number" data-number="${String(i + 1).padStart(2, "0")}">${String(i + 1).padStart(2, "0")}</span>
        <span><strong>${esc(title)}</strong>${label ? `<small>${esc(label)}</small>` : ""}</span>
        <i aria-hidden="true">${icon("ChevronRight", { size: 15, strokeWidth: 2.2 })}</i>
      </a>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(section.title === sections[0].title ? "AI T&L Essentials: Level 1 (AI-Aware)" : `${section.title} — AI T&L Essentials`)}</title>
<meta name="description" content="A practical AI-aware learning package for Ngee Ann Polytechnic academic staff." />
<link rel="icon" href="assets/favicon.svg" />
<link rel="stylesheet" href="assets/styles.css" />
</head>
<body>
<div class="site-shell" data-section-index="${index}" data-section-id="${section.id}" data-section-count="${total}">
  <header class="topbar">
    <div class="global-progress" data-role="progress" style="width:0%"></div>
    <div class="topbar-inner">
      <a class="brand brand-home" href="index.html" aria-label="Return to course home"${isHome ? ' aria-current="page"' : ""} title="Course home">
        <img class="np-logo" src="assets/np-logo.png" alt="Ngee Ann Polytechnic" />
        <span class="brand-divider" aria-hidden="true"></span>
        <span class="course-identity">
          <span class="course-name">AI T&amp;L Essentials</span>
          <small class="course-programme">Mandatory programme for NP teaching staff</small>
        </span>
      </a>
      ${isHome ? "" : `<div class="top-actions"><span class="level-badge">Level 1 · AI-Aware</span></div>`}
    </div>
  </header>

  <nav class="chapter-nav" aria-label="Course navigation">
    <div class="chapter-nav-inner">
      <div class="chapter-nav-left">
        ${index > 0 ? `<a class="chapter-icon" href="${pageName(index - 1)}" aria-label="Previous section" title="Previous section">${icon("ArrowLeft", { size: 16, strokeWidth: 2.2 })}</a>` : ""}
        <span class="chapter-position">${index + 1} <i aria-hidden="true">/</i> ${total}</span>
      </div>
      <div class="chapter-nav-actions">
        <button class="contents-button" type="button" data-role="open-contents" aria-haspopup="dialog" aria-expanded="false">Contents</button>
        ${index < total - 1 ? `<a class="chapter-icon" href="${pageName(index + 1)}" aria-label="Next section" title="Next section">${icon("ArrowRight", { size: 16, strokeWidth: 2.2 })}</a>` : ""}
      </div>
    </div>
  </nav>

  <main class="reader ${partClass}">
    ${head}
    ${section.title.startsWith("Part 6") ? W.bringTogetherVisual() : ""}
    ${renderBody(section, index, total)}

    ${bridge && index < total - 1 && !hasInlineNextPrompt ? `<div class="section-bridge"><span>Next</span><p>${esc(bridge)}</p></div>` : ""}

    ${isLast ? `<div class="completion-panel" role="status" data-role="completion" hidden><i aria-hidden="true">${icon("CheckCircle2", { size: 22, strokeWidth: 2.2 })}</i><div><strong>Package complete</strong><p>You have worked through every section. When you are ready, complete the separately administered quiz to fulfil the package requirements.</p></div></div>` : ""}

    <div class="section-actions">
      <div class="pager">
        ${index > 0 ? `<a class="pager-link" href="${pageName(index - 1)}">Previous</a>` : `<button disabled>Previous</button>`}
        ${index < total - 1 ? `<a class="pager-link next-button" href="${pageName(index + 1)}" data-role="next">Next section</a>` : ""}
        ${isLast ? `<button class="next-button" type="button" data-role="finish">Mark package as complete</button>` : ""}
      </div>
    </div>
  </main>

  <div class="contents-overlay" role="presentation" data-role="contents-overlay" hidden>
    <section class="contents-panel" role="dialog" aria-modal="true" aria-label="Course contents">
      <div class="contents-heading">
        <div>
          <span class="eyebrow" data-role="complete-count">0 of ${total} complete</span>
          <h2>Learning package</h2>
          <p>Jump to a section</p>
        </div>
        <button class="close-button" type="button" data-role="close-contents" aria-label="Close course contents">×</button>
      </div>
      <div class="contents-list" data-role="contents-list">${contentsList}</div>
    </section>
  </div>
</div>
<script src="assets/lms.js"></script>
</body>
</html>
`;
}

async function findBuiltCss() {
  const assets = path.join(root, "dist", "client", "assets");
  if (!existsSync(assets)) return null;
  const files = await readdir(assets);
  const css = files.filter((file) => file.endsWith(".css"));
  if (!css.length) return null;
  // Pick the largest: the app stylesheet, not a chunk.
  const sized = await Promise.all(
    css.map(async (file) => {
      const full = path.join(assets, file);
      const text = await readFile(full, "utf8");
      return { full, length: text.length };
    }),
  );
  sized.sort((a, b) => b.length - a.length);
  return sized[0].full;
}

async function main() {
  const cssPath = await findBuiltCss();
  if (!cssPath) {
    console.error("No built stylesheet found in dist/client/assets. Run `npm run build` first.");
    process.exit(1);
  }

  const markdown = await readFile(path.join(root, "public", "course.md"), "utf8");
  const sections = splitSections(markdown);
  if (sections.length !== 7) {
    console.warn(`Expected 7 sections, found ${sections.length}.`);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, "assets"), { recursive: true });

  let css = await readFile(cssPath, "utf8");
  // The stylesheet is served from /assets/ in both builds, so font URLs already
  // resolve; strip any leftover absolute root references just in case.
  css = css.replaceAll('url(/assets/', "url(");
  await writeFile(path.join(outDir, "assets", "styles.css"), css);

  await cp(path.join(root, "public", "np-logo.png"), path.join(outDir, "assets", "np-logo.png"));
  await cp(path.join(root, "public", "favicon.svg"), path.join(outDir, "assets", "favicon.svg"));

  // The stylesheet declares no @font-face rules — the site renders in the
  // Helvetica/Arial/Segoe UI stack — so the Geist webfonts are not copied.

  await cp(path.join(root, "scripts", "lms", "lms.js"), path.join(outDir, "assets", "lms.js"));
  await cp(path.join(root, "scripts", "lms", "README.txt"), path.join(outDir, "README.txt"));

  for (let index = 0; index < sections.length; index += 1) {
    const html = renderPage({ sections, index });
    await writeFile(path.join(outDir, pageName(index)), html);
  }

  console.log(`Built ${sections.length} pages into ${path.relative(root, outDir)}`);
  console.log("Entry point: index.html");
}

await main();
