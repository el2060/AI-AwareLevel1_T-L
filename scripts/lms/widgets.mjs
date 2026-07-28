// Static equivalents of the interactive React components in app/page.tsx.
// Each renders the same markup and class names the app produces in its initial
// state, and carries its data in a JSON script tag that lms.js picks up to
// restore the click behaviour.
import { icon } from "./icons.mjs";

let uid = 0;
const nextId = (prefix) => `${prefix}-${(uid += 1)}`;

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function data(id, payload) {
  // </script> inside JSON would close the tag early.
  const json = JSON.stringify(payload).replaceAll("<", "\\u003c");
  return `<script type="application/json" data-widget="${id}">${json}</script>`;
}

/* ------------------------------------------------------------------ quizzes */

export function scenarioSorter({ eyebrow, title, prompt, options, scenarios, countNoun, trio = false, storageKey }) {
  const id = nextId("sorter");
  const first = scenarios[0];
  const tabs = scenarios
    .map(
      (s, index) =>
        `<button type="button" role="tab" aria-selected="${index === 0}" class="${index === 0 ? "active" : ""} " data-index="${index}">${index + 1}</button>`,
    )
    .join("");
  const opts = options.map((option) => `<button type="button" data-option="${esc(option)}">${esc(option)}</button>`).join("");
  return `<div class="widget" data-kind="sorter" data-id="${id}">${data(id, { options, scenarios, storageKey })}
<section class="activity-block domain-spotter">
  <div class="activity-head-row">
    <div><span class="activity-eyebrow">${esc(eyebrow)}</span><h3>${esc(title)}</h3></div>
    <span class="activity-count" data-role="count">0 / ${scenarios.length} ${esc(countNoun)}</span>
  </div>
  <p>${esc(prompt)}</p>
  <div class="domain-spotter-tabs" role="tablist" aria-label="Scenarios" data-role="tabs">${tabs}</div>
  <div class="domain-spotter-case" data-role="case"><p>${esc(first.context)}</p></div>
  <div class="domain-spotter-options${trio ? " trio" : ""}" data-role="options">${opts}</div>
  <div data-role="feedback"></div>
</section></div>`;
}

export function tapChecklist({ prompt, items, tips, storageKey, eyebrow, title }) {
  const id = nextId("checklist");
  const cells = items
    .map(
      (item, index) =>
        `<button type="button" data-index="${index}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${esc(item)}</strong></div></button>`,
    )
    .join("");
  const head =
    eyebrow || title
      ? `<div>${eyebrow ? `<span class="activity-eyebrow">${esc(eyebrow)}</span>` : ""}${title ? `<h2>${esc(title)}</h2>` : ""}</div>`
      : "<div></div>";
  return `<div class="widget" data-kind="checklist" data-id="${id}">${data(id, { items, tips: tips ?? [], storageKey })}
<section class="activity-block tap-checklist">
  <div class="activity-head-row">${head}<span class="activity-count" data-role="count">0 / ${items.length}</span></div>
  <p>${esc(prompt)}</p>
  <div class="tap-check-grid" data-role="grid">${cells}</div>
</section></div>`;
}

export function nextStep() {
  const id = nextId("nextstep");
  const options = [
    { label: "Review one learning outcome, activity or assessment using the 3As.", feedback: "A single 3As review is a manageable way to begin identifying what may need attention." },
    { label: "Apply PAIR to one learning activity.", feedback: "Applying PAIR to a single activity is a focused way to check how AI can support, rather than replace learning." },
    { label: "Check one assessment's AI conditions.", feedback: "Checking one assessment’s AI conditions is a focused way to apply the guidance in practice." },
    { label: "Explore one suitable use of an AI tool or learning data.", feedback: "Start with a clear teaching and learning need, then check the output, data considerations and your oversight." },
  ];
  const buttons = options
    .map(
      (option, index) =>
        `<button type="button" class="choice-button" data-index="${index}"><span>${String.fromCharCode(65 + index)}</span>${esc(option.label)}</button>`,
    )
    .join("");
  return `<div class="widget" data-kind="nextstep" data-id="${id}">${data(id, { options, storageKey: "activity-notes:nextstep" })}
<section class="activity-block next-step-block">
  <div class="choice-grid" data-role="grid">${buttons}</div>
  <div data-role="feedback"></div>
</section></div>`;
}

export function quickSenseCheck() {
  const id = nextId("sense");
  const items = [
    { situation: "An AI tutor gives an explanation that differs from the module materials.", reveal: "Check the source content and accuracy before deciding whether the materials or tutor setup need adjustment." },
    { situation: "Students use a discipline-specific AI tool to produce a technically strong solution.", reveal: "Check whether they can explain, evaluate and apply the underlying disciplinary knowledge." },
    { situation: "You want to upload assessment results into an AI tool.", reveal: "Check whether the tool and process are appropriate for the information involved." },
    { situation: "Learning data suggests that several students may need support.", reveal: "Review the evidence and learner context before deciding what action is appropriate." },
  ];
  const cells = items
    .map(
      (item, index) =>
        `<button type="button" aria-expanded="false" data-index="${index}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${esc(item.situation)}</strong></div></button>`,
    )
    .join("");
  return `<div class="widget" data-kind="sense" data-id="${id}">${data(id, { items, storageKey: "quiz-sense-check" })}
<section class="activity-block quick-sense-check">
  <div class="activity-head-row"><div><span class="activity-eyebrow">Quick sense check</span><h2>What Would You Check?</h2></div></div>
  <p>Tap each situation to reveal what to consider.</p>
  <div class="sense-check-grid" data-role="grid">${cells}</div>
  <p class="sense-check-closing"><strong>AI can help you create resources, extend learning support, enable disciplinary practice and identify patterns.</strong> You provide the context, check the outputs and decide how they are used.</p>
</section></div>`;
}

/* ---------------------------------------------------------------- explorers */

export function strategyMap() {
  const id = nextId("strategy");
  const items = [
    { name: "Embed AI-Integrated Pedagogy · PAIR", question: "How can we help students learn and work with AI purposefully, critically and responsibly?", iconName: "Lightbulb", covers: "Part 3 · Facilitation of Learning", coversTone: 3 },
    { name: "Transform the Curriculum · 3As", question: "What competencies should our students develop and demonstrate as professional practice changes?", iconName: "BookOpen", covers: "Part 2 · Curriculum Design and Development", coversTone: 2 },
    { name: "Redesign Assessment", question: "How can we design assessment that provides valid and reliable evidence of learning in an AI-enabled context?", iconName: "ClipboardCheck", covers: "Part 4 · Assessment", coversTone: 4 },
    { name: "Enable Personalised Learning", question: "How can AI extend opportunities for practice, feedback and coaching in our modules?", iconName: "Bot", covers: "Part 5 · Data and Tech-Enhanced T&L", coversTone: 5 },
    { name: "Strengthen Human Skills and Resilience", question: "How can we strengthen the human qualities students need in an AI-enabled world?", iconName: "Users", covers: null, coversTone: null },
  ];
  const buttons = items
    .map(({ name, question, iconName, covers, coversTone }, index) => {
      const tone = coversTone ? `strategy-tone-${coversTone}` : "strategy-tone-base";
      return `<button type="button" class="${tone}${index === 0 ? " active" : ""}" aria-pressed="${index === 0}" data-index="${index}"><i>${icon(iconName, { size: 22, strokeWidth: 2 })}</i><span><strong>Strategy ${index + 1} · ${esc(name)}</strong><small>${esc(question)}</small>${covers ? `<em class="strategy-covers covers-tone-${coversTone}">${esc(covers)}</em>` : ""}</span></button>`;
    })
    .join("");
  return `<div class="widget" data-kind="press-group" data-id="${id}">
<section class="strategy-map" aria-label="How NP approaches connect across this package">
  <div class="strategy-heading">
    <h2>NP’s Five Strategies at a Glance</h2>
    <p>NP’s five strategies support one intended outcome:</p>
  </div>
  <div class="strategy-goal" aria-label="Outcome: AI-ready graduates who combine strong human qualities, deep domain expertise and effective use of AI in professional practice">
    <div class="graduate-core">
      <i>${icon("UserRound", { size: 36, strokeWidth: 2 })}</i>
      <div>
        <small>Outcome</small>
        <strong>AI-ready graduates</strong>
        <span>Strong human qualities · Deep domain expertise · Effective use of AI in professional practice</span>
        <p>NP graduates should combine deep domain expertise with strong human qualities and the ability to use AI effectively and responsibly in professional practice.</p>
      </div>
    </div>
  </div>
  <div class="strategy-path" data-role="group">${buttons}</div>
</section></div>`;
}

export function useCaseExplorer() {
  const id = nextId("usecase");
  const uses = [
    { label: "Learning resource", tool: "An AI assistant suitable for the task, such as M365 Copilot.", task: "Create a simpler explanation, a step-by-step worksheet or a short self-check from the same source material.", starter: "Create a simpler explanation and five self-check questions for [concept]. Preserve the technical meaning and intended learning standard. Flag anything you are uncertain how to simplify.", check: "Check accuracy, the intended learning standard, and whether the examples are inclusive and accessible.", decision: "Choose and adapt the format that is most useful for your learners." },
    { label: "Student practice", tool: "Brightspace Lumi Tutor or a course-specific AI tutor.", task: "Extend practice and feedback beyond class time using material and boundaries set for the module.", starter: "Decide which topic needs additional practice, what sources the tutor can use, and when students should seek support from a lecturer instead.", check: "Check that the tutor's explanations and feedback align with the module materials and intended learning.", decision: "Set the role of the tool clearly so it complements, rather than replaces, facilitation." },
    { label: "Disciplinary practice", tool: "A suitable course- or profession-specific AI tool.", task: "Help students apply disciplinary knowledge through an authentic AI-supported workflow, such as coding, design, simulation or data analysis.", starter: "Clarify the capability students should develop and what they must still understand, decide or perform themselves.", check: "Check that the tool supports the intended learning and that students can evaluate and explain its output.", decision: "Decide how the tool fits within the activity, what scaffolding students need and what evidence will show their learning." },
    { label: "Learning data", tool: "A suitable analytics view or AI-supported summary process.", task: "Look for a pattern in participation, performance or feedback that may indicate a need for support.", starter: "Review the original evidence and learner context before deciding whether a pattern needs action.", check: "Check that the information and process are appropriate, and that the apparent pattern is supported by the evidence.", decision: "Use your judgement to decide whether an intervention is needed and whether it helped." },
  ];
  const picker = uses
    .map((use, index) => `<button type="button" aria-pressed="${index === 0}" class="${index === 0 ? "active" : ""}" data-index="${index}">${esc(use.label)}</button>`)
    .join("");
  return `<div class="widget" data-kind="usecase" data-id="${id}">${data(id, { uses })}
<section class="use-case-explorer" aria-label="Four practical uses of AI tools and learning data">
  <div class="use-case-picker" role="group" aria-label="Choose a teaching and learning use" data-role="picker">${picker}</div>
  <div class="use-case-detail" aria-live="polite" data-role="detail">${useCaseDetail(uses[0])}</div>
</section></div>`;
}

export function useCaseDetail(use) {
  return `<div class="use-case-context"><div><strong>Possible approach</strong><p>${esc(use.tool)}</p></div><div><strong>T&amp;L purpose</strong><p>${esc(use.task)}</p></div></div>
    <div class="prompt-starter"><strong>Start here</strong><p>${esc(use.starter)}</p></div>
    <div class="use-case-checks"><div><b>Check</b><p>${esc(use.check)}</p></div><div><b>Your decision</b><p>${esc(use.decision)}</p></div></div>
    <p class="use-case-tool-note"><strong>Keep the learning purpose in view.</strong> The tool supports the activity; you determine how it is used.</p>`;
}

export function tandlUses() {
  const id = nextId("tandl");
  const uses = [
    { label: "Learning resources", iconName: "BookOpen", title: "Prepare and improve learning resources", detail: "Use AI as a starting point to review module materials, draft practice examples, create alternative formats, check assignment clarity or summarise feedback themes.", focus: "You provide the context and intended learning, then check, adapt and decide what to use." },
    { label: "Learning support", iconName: "Lightbulb", title: "Extend learning support", detail: "AI-enabled tutors and learning assistants can extend opportunities for explanation, practice and feedback during and beyond class time. This may include Brightspace Lumi Tutor, course-specific tutors or students’ AI tools used appropriately.", focus: "Set the intended learning, source materials, boundaries and role of the support within the module." },
    { label: "Disciplinary practice", iconName: "Target", title: "Support disciplinary and professional practice", detail: "AI may be embedded in authentic workflows such as coding and testing, design and media, data analysis, simulation, or research and evidence review.", focus: "Help students apply disciplinary knowledge, evaluate outputs and exercise appropriate judgement—not simply operate the tool." },
    { label: "Learning data", iconName: "ShieldCheck", title: "Use learning data to inform support", detail: "Learning data can reveal patterns in participation or performance, indicate possible learner needs, inform targeted support and help review whether support is working.", focus: "Treat AI-generated summaries, patterns or predictions as starting points. Review the evidence and learner context before acting." },
  ];
  const nav = uses
    .map(
      (use, index) =>
        `<button type="button" aria-pressed="${index === 0}" class="${index === 0 ? "active" : ""}" data-index="${index}"><i>${icon(use.iconName, { size: 17, strokeWidth: 2.1 })}</i><span>${esc(use.label)}</span></button>`,
    )
    .join("");
  const icons = uses.map((use) => icon(use.iconName, { size: 24, strokeWidth: 2 }));
  return `<div class="widget" data-kind="tandl" data-id="${id}">${data(id, { uses: uses.map((u, i) => ({ ...u, svg: icons[i] })) })}
<section class="tandl-uses-explorer" aria-label="Four practical uses of AI tools and learning data">
  <div class="tandl-uses-intro"><span>Choose a use to explore</span><p>Explore how each use can support a T&amp;L purpose and what you still need to decide.</p></div>
  <div class="tandl-use-nav" role="group" aria-label="Choose a practical use" data-role="nav">${nav}</div>
  <div class="tandl-use-detail" aria-live="polite" data-role="detail">
    <i>${icons[0]}</i>
    <div><small>How AI and data can help</small><h3>${esc(uses[0].title)}</h3><p>${esc(uses[0].detail)}</p><strong>${esc(uses[0].focus)}</strong></div>
  </div>
</section></div>`;
}

/* ------------------------------------------------------------ static visuals */

export function chooseToolsVisual() {
  const items = [
    { iconName: "Target", title: "Learning fit", detail: "Does the tool or data use support the intended learning or learner need?" },
    { iconName: "CheckCircle2", title: "Suitability", detail: "Is it appropriate and accessible for the task and learners?" },
    { iconName: "Eye", title: "Information and output", detail: "Is the information appropriate to use, and is the output accurate, relevant and suitable for learners?" },
    { iconName: "ShieldCheck", title: "Oversight and impact", detail: "Who reviews the output, decides what action to take and checks whether it helped?" },
  ];
  return `<figure class="concept-visual tool-fit-visual" aria-labelledby="tool-fit-title">
  <figcaption><span>Before You Choose</span><strong id="tool-fit-title">Four questions to check before using a tool or learning data</strong></figcaption>
  <div class="tool-fit-grid">${items
    .map(({ iconName, title, detail }) => `<div class="tool-fit-card"><i>${icon(iconName, { size: 20, strokeWidth: 2 })}</i><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>`)
    .join("")}</div>
</figure>`;
}

export function toolGuidance() {
  return `<section class="tool-information-guidance" aria-label="Using T&amp;L information in AI tools">
  <p class="tool-information-intro">When using module materials, student information or assessment-related data, what you may enter depends on the tool and account being used.</p>
  <div class="tool-information-list">
    <div><strong>M365 Copilot <small>using your NP account</small></strong><span>May be used with information classified up to <b>Restricted / Sensitive Normal</b> within NP’s Microsoft 365 environment.</span></div>
    <div><strong>Pair Chat <small>pair.gov.sg</small></strong><span>May be used with information classified up to <b>Restricted / Sensitive Normal</b>.</span></div>
    <div><strong>Public or personal-account AI tools</strong><span>Do not enter personal, sensitive, confidential or proprietary information.</span></div>
  </div>
  <p class="tool-information-closing">Use an approved tool appropriate to the T&amp;L information involved. Check its outputs before using them with students or to inform teaching decisions.</p>
</section>`;
}

export function openingVisual() {
  const areas = [
    { title: "Curriculum Design and Development", detail: "What competencies your students need as professional practice changes.", iconName: "BookOpen" },
    { title: "Facilitation of Learning", detail: "How AI can support the development of Anchor, Augment and Advance (3As) competencies in your lessons.", iconName: "Lightbulb" },
    { title: "Assessment", detail: "How assessment can provide valid and reliable evidence of students’ achievement of 3As-adjusted learning outcomes.", iconName: "ClipboardCheck" },
    { title: "Data and Tech-Enhanced T&L", detail: "How AI tools and data can be used purposefully and responsibly to enhance learning experiences and performances.", iconName: "ShieldCheck" },
  ];
  return `<section class="opening-visual" aria-label="What this package covers">
  <div class="overview-heading"><span>At a Glance</span><h2>Applying an AI Lens to Four TLCF Domains</h2></div>
  <div class="overview-areas">${areas
    .map(({ title, detail, iconName }, index) => `<div class="overview-area overview-area-static area-${index + 1}"><span>${icon(iconName, { size: 20, strokeWidth: 2.1 })}</span><div><strong>${esc(title)}</strong><small>${esc(detail)}</small></div></div>`)
    .join("")}</div>
</section>`;
}

export function homeFlow() {
  const outcomes = [
    "AI is changing the competencies students need and the implications for curriculum design, by reference to NP's 3As framework (Anchor, Augment and Advance)",
    "you might adjust your learning outcomes and designs for the impact of AI in your discipline, domain, course and/or module",
    "you might redesign your summative assessments to efficiently and validly assess the achievement of those adjusted learning outcomes",
    "you could use AI tools and data purposefully and responsibly to improve students' learning experience and performance",
  ];
  return `<section class="home-flow" aria-label="Welcome and module outcomes">
  <article class="home-intro-card">
    <span>Welcome</span>
    <h2>T&amp;L in an AI-Enabled Context</h2>
    <p>AI is increasingly shaping how our students learn, how professional practice is changing and what NP graduates will need to be able to do.</p>
    <p>Used purposefully, AI can extend opportunities for practice, feedback and personalised learning. It can also help us develop learning resources, identify learning needs and respond more effectively. But AI can also become a shortcut that bypasses the thinking, judgement or performance students are meant to develop.</p>
    <p class="home-challenge">The challenge for T&amp;L is to help students benefit from AI while continuing to develop strong disciplinary foundations, independent thinking and human judgement.</p>
    <figure class="home-quote">
      <blockquote>&ldquo;If we treat AI as a shortcut&hellip; we will diminish the very purpose of education. But if we treat AI as a catalyst&hellip; it can strengthen our IHLs and strengthen our people.&rdquo;</blockquote>
      <figcaption>Mr Desmond Lee, Minister for Education <i aria-hidden="true">·</i> April 2026</figcaption>
    </figure>
    <h3>Building on the TLCF</h3>
    <p>The T&amp;L Competency Framework (TLCF) sets out six domains of T&amp;L practice. This package applies an AI lens to four selected domains: the three functional T&amp;L domains and Data and Tech-Enhanced T&amp;L.</p>
    <div class="home-domain-chips">
      <span class="home-domain-chip chip-1">${icon("BookOpen", { size: 14, strokeWidth: 2.2 })}Curriculum Design and Development</span>
      <span class="home-domain-chip chip-2">${icon("Lightbulb", { size: 14, strokeWidth: 2.2 })}Facilitation of Learning</span>
      <span class="home-domain-chip chip-3">${icon("ClipboardCheck", { size: 14, strokeWidth: 2.2 })}Assessment</span>
      <span class="home-domain-chip chip-4">${icon("ShieldCheck", { size: 14, strokeWidth: 2.2 })}Data and Tech-Enhanced T&amp;L</span>
    </div>
    <p>Across these areas, we will consider how AI affects what students need to learn, how learning is facilitated and assessed, and how AI tools and learning data can be used purposefully and responsibly.</p>
  </article>
  <div class="home-learn-stack">
    <article class="home-outcome-card">
      <header><span>What You Will Learn</span><p>By the end of this package, you will be able to describe how:</p></header>
      <ol>${outcomes.map((outcome) => `<li>${icon("CheckCircle2", { size: 16 })}<span>${esc(outcome)}</span></li>`).join("")}</ol>
    </article>
    <aside class="home-time-note" aria-label="Learning time">
      <span>Learning Time</span>
      <strong>Up to 2 hours</strong>
      <p>The package includes the learning content, activities and completion quiz. You may move through the sections at your own pace and spend more time on areas most relevant to your needs.</p>
    </aside>
  </div>
</section>`;
}

export function studentBaselineVisual() {
  const items = [
    { iconName: "BookOpen", title: "Learn About AI", focus: "Understand AI and its capabilities", detail: "Students should recognise different forms of AI, understand broadly what they can and cannot do, and be aware that AI outputs may be incomplete, biased or inaccurate.", practice: "Explain why a convincing AI-generated response may still be wrong." },
    { iconName: "Bot", title: "Learn With AI", focus: "Use AI to support thinking and problem-solving", detail: "Students should be able to work with AI to break down problems, explore patterns, test explanations and identify gaps in their own reasoning—without handing over the thinking to AI.", practice: "Use AI to break a complex problem into parts, then examine and improve the proposed reasoning." },
    { iconName: "Rocket", title: "Learn to Use AI", focus: "Apply AI purposefully and evaluate its outputs", detail: "Students should select suitable tools and inputs, use AI to improve a task or outcome, and evaluate the output before relying on it.", practice: "Generate an initial output with AI, then check its accuracy, relevance, bias and suitability for the context." },
    { iconName: "Scale", title: "Learn Beyond AI", focus: "Exercise judgement and responsibility", detail: "Students should consider the ethical, legal and societal implications of AI, retain human oversight and remain accountable for AI-supported decisions and outputs.", practice: "Decide whether an AI-supported recommendation is fair, appropriate and safe to act on." },
  ];
  return `<details class="policy-detail student-baseline-accordion">
  <summary>What should students progressively understand and be able to do with AI?</summary>
  <div>
    <div class="baseline-intro">
      <p>The POLITE baseline identifies four broad areas.</p>
      <p class="baseline-refer">The summary below highlights the key ideas and NP context. Refer to the <a href="https://nplms.polite.edu.sg/d2l/le/lessons/998763/topics/14624182" target="_blank" rel="noopener noreferrer">full sector AI baseline competencies and learning outcomes</a> for the detailed competency statements and descriptors.</p>
    </div>
    <ol class="baseline-map">${items
      .map(({ iconName, title, focus, detail, practice }, index) => `<li><span class="baseline-index" aria-hidden="true">0${index + 1}</span><i>${icon(iconName, { size: 18, strokeWidth: 2.1 })}</i><div class="baseline-copy"><b>${esc(title)}</b><strong>${esc(focus)}</strong><p>${esc(detail)}</p><div class="baseline-practice"><span class="baseline-practice-label">In Practice</span><p>${esc(practice)}</p></div></div></li>`)
      .join("")}</ol>
  </div>
</details>`;
}

export function baselineThreeAsRelation() {
  const areas = [
    { title: "Learn About AI", detail: "Informs students&rsquo; understanding of what should remain distinctly human, where AI may augment work and where new AI-enabled practice may emerge." },
    { title: "Learn With AI", detail: "Supports learning and thinking. This may involve PAIR activities or tools such as Lumi Tutor, but using an AI learning assistant is not, by itself, an <b>Augment</b> curriculum outcome." },
    { title: "Learn to Use AI", detail: "Most directly supports <b>Augment</b> when students use AI productively in authentic disciplinary or professional work. It may support <b>Advance</b> when students develop new AI-enabled workflows, services or forms of practice." },
    { title: "Learn Beyond AI", detail: "Strengthens the judgement, responsibility and oversight needed across <b>Anchor</b>, <b>Augment</b> and <b>Advance</b>." },
  ];
  return `<details class="policy-detail baseline-relation-accordion">
  <summary>How does the student AI baseline relate to the 3As?</summary>
  <div>
    <div class="baseline-intro">
      <p>The frameworks serve different purposes:</p>
      <ul class="course-list">
        <li>The <b>student AI baseline</b> describes the foundational AI competencies students should progressively develop.</li>
        <li>The <b>3As</b> help lecturers review the disciplinary and professional competencies required in their modules.</li>
      </ul>
      <p>They are related but do not map one-to-one.</p>
    </div>
    <ul class="baseline-relation-list">${areas.map(({ title, detail }) => `<li><b>${esc(title)}</b><p>${detail}</p></li>`).join("")}</ul>
    <section class="baseline-module-panel">
      <h4>Applying This to Your Module</h4>
      <p>Use the student baseline as a reference when applying the 3As. Consider:</p>
      <ul class="course-list">
        <li>which AI competencies are relevant to your discipline and module;</li>
        <li>where students progressively develop them across the course;</li>
        <li>whether any learning outcomes, activities or assessment need adjustment; and</li>
        <li>how students’ reasoning, judgement and contribution should be made visible.</li>
      </ul>
      <p>Not every module needs to address all four areas or be redesigned.</p>
    </section>
  </div>
</details>`;
}

export function alignmentFlowVisual() {
  const steps = [
    { label: "Competency", detail: "What students need to develop." },
    { label: "Learning outcome", detail: "What students should be able to demonstrate." },
    { label: "Learning activities", detail: "How students develop and practise the outcome." },
    { label: "Assessment evidence", detail: "How achievement of the outcome is made visible." },
  ];
  return `<figure class="concept-visual alignment-story" aria-label="Flow from competency to assessment evidence">
  <p class="alignment-sentence">A <span class="alignment-chip"><i aria-hidden="true">1</i>competency</span> is expressed through a <span class="alignment-chip"><i aria-hidden="true">2</i>learning outcome</span>, developed through <span class="alignment-chip"><i aria-hidden="true">3</i>learning activities</span> and demonstrated through <span class="alignment-chip"><i aria-hidden="true">4</i>assessment evidence</span>.</p>
  <div class="alignment-captions">${steps
    .map((step, index) => `<div class="alignment-caption"><span aria-hidden="true">${index + 1}</span><div><b>${esc(step.label)}</b><p>${esc(step.detail)}</p></div></div>`)
    .join("")}</div>
</figure>`;
}

export function threeAsInfographic() {
  const lenses = [
    { key: "anchor", name: "Anchor", iconName: "UserRound", tagline: "Distinctly human capabilities", body: "Develop the human qualities, disciplinary judgement and essential capabilities students need even as AI becomes more capable." },
    { key: "augment", name: "Augment", iconName: "Bot", tagline: "Productive use of AI", body: "Develop students' ability to use AI effectively to improve the quality, productivity or effectiveness of their work while exercising appropriate judgement and oversight." },
    { key: "advance", name: "Advance", iconName: "Rocket", tagline: "New AI-enabled practice", body: "Develop students' ability to use AI to create new possibilities, workflows or forms of professional practice beyond established pre-AI job boundaries." },
  ];
  return `<figure class="concept-visual three-as-infographic" aria-labelledby="three-as-title">
  <figcaption><span>The 3As</span><strong id="three-as-title">A simple lens for reviewing the competencies students need and aligning learning outcomes, activities and assessment.</strong></figcaption>
  <div class="three-as-path">${lenses
    .map((lens) => `<section class="three-as-band ${lens.key}-band">${icon(lens.iconName, { size: 92, strokeWidth: 1.5, className: "three-as-watermark" })}<div class="three-as-top"><div class="three-as-icon">${icon(lens.iconName, { size: 21, strokeWidth: 2.1 })}</div></div><b>${esc(lens.name)}</b><small>${esc(lens.tagline)}</small><p>${esc(lens.body)}</p></section>`)
    .join("")}</div>
</figure>`;
}

export function pairInfographic() {
  const stages = [
    { letter: "P", name: "Problem", iconName: "Target", action: "Students clarify or frame the task or challenge", detail: "Understand the intended outcome, requirements, constraints and success criteria. Depending on the activity, the problem may be provided, guided or defined by students.", cue: "What must we understand before using AI?", tone: "problem" },
    { letter: "A", name: "AI", iconName: "Bot", action: "Students consider and select a suitable AI tool", detail: "Identify what support is needed and consider the tool’s capabilities, limitations, accessibility and permitted use.", cue: "What could AI contribute, and which tool is suitable?", tone: "ai" },
    { letter: "I", name: "Interaction", iconName: "RefreshCw", action: "Students experiment, evaluate and refine", detail: "Interact with the tool, try different approaches and critically evaluate the outputs for relevance, accuracy, bias and suitability. Refine the interaction or output as needed.<br /><br />Important claims should be checked against primary, official or trusted sources, especially for legal, regulatory, technical or specialised information.", cue: "How will we test and improve the output?", tone: "interaction", raw: true },
    { letter: "R", name: "Reflection", iconName: "Eye", action: "Students examine the process, learning and implications", detail: "Consider how AI supported or hindered the work, what was learnt, where human judgement was needed and how their approach could improve.", cue: "What did we learn about the task, the tool and our own judgement?", tone: "reflection" },
  ];
  return `<figure class="concept-visual pair-infographic" aria-labelledby="pair-title">
  <figcaption><span>PAIR</span><strong id="pair-title">A structured process for learning and problem-solving with AI</strong></figcaption>
  <div class="pair-flow">${stages
    .map(
      (stage, index) =>
        `<div class="pair-flow-row pair-${stage.tone}"><div class="pair-flow-rail"><div class="pair-flow-node">${icon(stage.iconName, { size: 19, strokeWidth: 2.1 })}</div>${index < stages.length - 1 ? '<span class="pair-flow-line" aria-hidden="true"></span>' : ""}</div><div class="pair-flow-body"><div class="pair-flow-kicker">${stage.letter} · ${esc(stage.name)}</div><strong>${esc(stage.action)}</strong><p>${stage.raw ? stage.detail : esc(stage.detail)}</p><small>${esc(stage.cue)}</small></div></div>`,
    )
    .join("")}</div>
  <div class="infographic-note pair-loop"><span aria-hidden="true">${icon("ArrowLeftRight", { size: 14, strokeWidth: 2.2 })}</span><p>Students may revisit the problem, reconsider the tool and refine their interactions as their understanding develops.</p></div>
</figure>`;
}

export function assessmentActionsInfographic() {
  const steps = [
    { number: "1", title: "Start With the Learning Outcome", detail: "Describe the capability being assessed and what students must still demonstrate themselves." },
    { number: "2", title: "State the AI Conditions Clearly", detail: "State whether AI use is restricted or prohibited for each component. If no AI use conditions are stipulated, AI is allowed - it is NP's default position - you would still need to inform students of the always-prohibited list of AI uses." },
    { number: "3", title: "Make Students’ Contribution Visible", detail: "Describe how students will be expected to show you they have achieved the learning outcome." },
    { number: "4", title: "Prepare Students and Require Declaration", detail: "Explain your conditions and other details to students early, provide suitable formative preparation and remind students if you are assessing an Augment or Advance outcome that AI use declarations are necessary." },
  ];
  return `<figure class="concept-visual action-infographic" aria-labelledby="action-title">
  <figcaption><strong id="action-title">A Practical Sequence for Assessment Design</strong></figcaption>
  <div class="action-journey">${steps
    .map(
      (step, index) =>
        `<div class="action-step-wrap"><section class="action-stage"><div class="action-stage-head"><i aria-hidden="true">${step.number}</i><b>${esc(step.title)}</b></div><p>${esc(step.detail)}</p></section>${index < steps.length - 1 ? `<span class="action-connector" aria-hidden="true">${icon("ArrowRight", { size: 15, strokeWidth: 2.2 })}</span>` : ""}</div>`,
    )
    .join("")}</div>
</figure>`;
}

export function alignmentCheckVisual() {
  const items = [
    { iconName: "Target", title: "Learning outcome", detail: "Does it clearly describe how the revised competency is to be demonstrated?" },
    { iconName: "BookOpen", title: "Learning activities", detail: "Do they help students to develop the revised competency?" },
    { iconName: "ClipboardCheck", title: "Assessment", detail: "Does it provide valid and reliable evidence of the achievement of the revised competency?" },
  ];
  return `<figure class="concept-visual" aria-labelledby="alignment-check-title">
  <figcaption><span>Check the Alignment</span><strong id="alignment-check-title">Does each part still line up with the revised competency?</strong></figcaption>
  <div class="alignment-check-journey">${items
    .map(
      ({ iconName, title, detail }, index) =>
        `<div class="alignment-check-step"><section class="alignment-check-card"><div class="alignment-check-head"><i>${icon(iconName, { size: 16, strokeWidth: 2.1 })}</i><b>${esc(title)}</b></div><p>${esc(detail)}</p></section>${index < items.length - 1 ? `<span class="alignment-check-connector" aria-hidden="true">${icon("ArrowRight", { size: 15, strokeWidth: 2.2 })}</span>` : ""}</div>`,
    )
    .join("")}</div>
</figure>`;
}

export function bringTogetherVisual() {
  const lenses = [
    { iconName: "BookOpen", title: "Curriculum", detail: "What may need review?" },
    { iconName: "Lightbulb", title: "Facilitation", detail: "Does AI support the intended learning?" },
    { iconName: "ClipboardCheck", title: "Assessment", detail: "What evidence keeps learning visible?" },
    { iconName: "ShieldCheck", title: "Data and Tools", detail: "What needs checking before use?" },
  ];
  return `<figure class="concept-visual bring-together-visual" aria-label="Four areas for reviewing one module">
  <figcaption><span>Bring it together</span><strong>Review one module through four areas</strong></figcaption>
  <div class="lens-strip">${lenses
    .map(({ iconName, title, detail }) => `<section><i>${icon(iconName, { size: 18, strokeWidth: 2.1 })}</i><b>${esc(title)}</b><small>${esc(detail)}</small></section>`)
    .join("")}</div>
</figure>`;
}

export function modulePreviewVisual() {
  const areas = [
    { iconName: "BookOpen", title: "Curriculum Design and Development", detail: "Use the 3As to review the competencies students need as professional practice changes." },
    { iconName: "Lightbulb", title: "Facilitation of Learning", detail: "Use PAIR and personalised learning approaches to help students learn and work with AI purposefully." },
    { iconName: "ClipboardCheck", title: "Assessment", detail: "Apply NP's GenAI assessment requirements and design approaches to provide valid and reliable evidence of learning and students' own contribution." },
    { iconName: "ShieldCheck", title: "Data and Tech-Enhanced T&L", detail: "Use suitable AI tools and learning data to support learning and disciplinary practice, with appropriate checks and human oversight." },
  ];
  return `<figure class="concept-visual module-preview-visual" aria-label="What the next four sections cover">
  <div class="lens-strip">${areas
    .map(({ iconName, title, detail }) => `<section><i>${icon(iconName, { size: 18, strokeWidth: 2.1 })}</i><b>${esc(title)}</b><small>${esc(detail)}</small></section>`)
    .join("")}</div>
</figure>`;
}

export function quizReadinessRecap() {
  return `<details class="policy-detail quiz-recap-accordion">
  <summary>View Key Points to Remember</summary>
  <div class="quiz-recap">
    <section class="recap-panel recap-tone-2">
      <div class="recap-panel-head"><i>${icon("BookOpen", { size: 18, strokeWidth: 2.1 })}</i><h4>Curriculum · 3As</h4></div>
      <div class="recap-chip-row">
        <div class="recap-chip"><b>Anchor</b><p>Human qualities, disciplinary judgement and essential capabilities that remain important as AI becomes more capable.</p></div>
        <div class="recap-chip"><b>Augment</b><p>Productive use of AI to improve work while applying appropriate judgement and oversight.</p></div>
        <div class="recap-chip"><b>Advance</b><p>New AI-enabled possibilities, workflows or forms of professional practice.</p></div>
      </div>
      <p class="recap-note">Begin with the intended competency, then align the learning outcome, activities and assessment.</p>
    </section>
    <section class="recap-panel recap-tone-3">
      <div class="recap-panel-head"><i>${icon("Lightbulb", { size: 18, strokeWidth: 2.1 })}</i><h4>Facilitation · PAIR</h4></div>
      <div class="recap-pair-row">
        <div class="recap-pair-step"><b>Problem</b><p>Clarify or frame the task, requirements and intended outcome.</p></div>
        ${icon("ArrowRight", { size: 14, strokeWidth: 2.2, className: "recap-pair-arrow" })}
        <div class="recap-pair-step"><b>AI</b><p>Consider and select suitable AI support.</p></div>
        ${icon("ArrowRight", { size: 14, strokeWidth: 2.2, className: "recap-pair-arrow" })}
        <div class="recap-pair-step"><b>Interaction</b><p>Experiment with, evaluate and refine the outputs.</p></div>
        ${icon("ArrowRight", { size: 14, strokeWidth: 2.2, className: "recap-pair-arrow" })}
        <div class="recap-pair-step"><b>Reflection</b><p>Consider what was learnt, where human judgement was needed and how the approach could improve.</p></div>
      </div>
    </section>
    <section class="recap-panel recap-tone-4">
      <div class="recap-panel-head"><i>${icon("ClipboardCheck", { size: 18, strokeWidth: 2.1 })}</i><h4>Assessment · NP&rsquo;s GenAI Policy</h4></div>
      <ul class="recap-list">
        <li>AI is allowed by default in summative assessment unless explicitly restricted or prohibited.</li>
        <li>State any conditions clearly for each assessment component.</li>
        <li>Students must declare GenAI use.</li>
        <li>Evidence should be proportionate; for example, complete AI interaction histories should not be required by default.</li>
        <li>AI-detection results or changes in writing style are not by themselves proof of misconduct.</li>
        <li>Staff remain responsible for every grade and feedback decision.</li>
      </ul>
      <p class="recap-warning"><strong>Always prohibited:</strong> submitting purely AI-generated work as one&rsquo;s own; disguising AI content as original; relying solely on AI for insights or reflection; and simulating human interactions where real interaction is required.</p>
    </section>
    <section class="recap-panel recap-tone-5">
      <div class="recap-panel-head"><i>${icon("ShieldCheck", { size: 18, strokeWidth: 2.1 })}</i><h4>Data and Tech-Enhanced T&amp;L</h4></div>
      <p class="recap-lead">Start with the learning need. Consider:</p>
      <ul class="recap-list">
        <li>Whether the tool or use of data supports the intended purpose.</li>
        <li>Whether it is suitable and accessible.</li>
        <li>Whether the information and outputs are appropriate and accurate.</li>
        <li>Who interprets the information and decides what action to take.</li>
      </ul>
      <p class="recap-note">AI may draft, identify patterns or suggest possibilities. We retain professional judgement and responsibility.</p>
    </section>
  </div>
</details>`;
}

export function partFiveTakeaway() {
  return `<div class="key-takeaway part-five-takeaway">
  <p class="key-takeaway-head">${icon("CheckCircle2", { size: 18 })}<span>Key Takeaway</span></p>
  <p>Use AI tools and learning data where they add learning value or support authentic disciplinary practice. Select an appropriate approach, check the information and outputs, and retain professional judgement and responsibility.</p>
</div>`;
}

/* ------------------------------------------------------------ quiz payloads */

export const supportReplaceSorter = () =>
  scenarioSorter({
    eyebrow: "Quick Check",
    title: "Is AI Supporting the Learning?",
    prompt: "For each situation, decide whether AI supports students in developing the intended capability or does the work they are meant to do.",
    options: ["Supports the intended learning", "Replaces the intended learning"],
    countNoun: "sorted",
    storageKey: "quiz-support-replace",
    scenarios: [
      { id: "compare", context: "Students ask AI for a different worked example of a concept, then attempt the practice set on their own.", answer: "Supports the intended learning", feedback: "AI provides an additional explanation, but students still apply the concept themselves in the practice set." },
      { id: "submit", context: "A student pastes the assignment brief into GenAI and submits a lightly edited version of the response.", answer: "Replaces the intended learning", feedback: "AI has produced the response that the student was expected to develop. Light editing does not demonstrate the intended analysis, judgement or creation." },
      { id: "critique", context: "Students generate three AI draft answers, then critique and rank them against the success criteria.", answer: "Supports the intended learning", feedback: "Generating material for critique keeps evaluation and judgment with students." },
      { id: "reflection", context: "A student asks AI to write their reflection on what they learned from the project.", answer: "Replaces the intended learning", feedback: "The reflection is intended to make the student’s own learning and judgement visible. Asking AI to write it replaces that process." },
    ],
  });

export const threeAsMisconceptionCheck = () =>
  scenarioSorter({
    eyebrow: "Quick Check",
    title: "Understanding the 3As",
    prompt: "For each statement, decide whether it is accurate or needs correction.",
    options: ["Accurate", "Needs correction"],
    countNoun: "checked",
    storageKey: "quiz-three-as",
    scenarios: [
      { id: "revise-all", context: "Every module must revise its learning outcomes and assessment to include GenAI.", answer: "Needs correction", feedback: "All modules should consider how AI may affect the competencies students need. Changes are only needed where the review identifies a gap or misalignment." },
      { id: "no-change", context: "A module may emphasise one or several of the 3As, and the review may conclude that no change is needed.", answer: "Accurate", feedback: "The relevant emphasis depends on the discipline, module level, intended learning outcomes and professional context." },
      { id: "tutor-augment", context: "Using an AI tutor or learning assistant in a module means the module is developing Augment capabilities.", answer: "Needs correction", feedback: "AI tutors and learning assistants support facilitation. Augment refers to students learning to use AI productively in disciplinary or professional work, with appropriate judgement and oversight." },
      { id: "anchor-complex", context: "Anchor can involve complex human and disciplinary judgement, and is not a lower-order category.", answer: "Accurate", feedback: "Anchor includes capabilities such as professional judgement, empathy, ethics, creativity, safety-critical reasoning and other capabilities that remain distinctly human. To identify what should remain Anchor, lecturers need an informed view of what current AI tools can and cannot do." },
      { id: "prohibit-simply", context: "A module that focuses on Anchor can simply prohibit AI without considering what current AI tools can do.", answer: "Needs correction", feedback: "Understanding current AI capabilities helps lecturers identify what students must genuinely be able to do themselves to be work-ready, and to design learning activities and assessments accordingly. Lecturers may test relevant tools or use guided activities such as PAIR to understand how AI changes the nature of the work for which the course or module prepares students, and therefore what students must be able to do independently of AI." },
    ],
  });

export const genAiConditionsSorter = () =>
  scenarioSorter({
    eyebrow: "Check the conditions",
    title: "Allowed, Restricted or Prohibited?",
    prompt: "Decide how each situation sits under NP's GenAI guidance (policy from AY2027) for summative assessment.",
    options: ["Allowed", "Restricted", "Prohibited"],
    countNoun: "checked",
    storageKey: "quiz-genai-conditions",
    trio: true,
    scenarios: [
      { id: "default", context: "The brief states nothing about AI, and a student uses it to brainstorm approaches for a take-home assignment.", answer: "Allowed", feedback: "GenAI use is allowed by default in summative assessment unless it is explicitly restricted or prohibited. The student must still cite and declare the use." },
      { id: "live", context: "Students may use GenAI to prepare, but must complete the live presentation and question-and-answer session without it.", answer: "Restricted", feedback: "This is a restricted-use condition: GenAI is allowed for preparation but prohibited during the live component. Is such a restriction necessary, effective and aligned to 3As outcomes?" },
      { id: "declared", context: "A student submits a fully AI-generated report and declares the use on the cover page.", answer: "Allowed", feedback: "Submitting purely AI-generated content as one's own is always prohibited — but declaring AI use makes it honest - it is not “as one's own”. If you wish to punish lack of originality, do so in the grading rubric for the report." },
      { id: "images", context: "Students must produce AI-generated images but must also frame the task, select and refine the output, and explain their choices.", answer: "Allowed", feedback: "GenAI is permitted provided students show they are masters of the tool. This is an example of assessment of an Augment learning outcome." },
    ],
  });

export const fourLensReview = () =>
  tapChecklist({
    prompt: "Tap each question once you have considered it for your module.",
    storageKey: "activity-notes:snapshotcheck",
    items: [
      "Curriculum: Do the learning outcomes still reflect the competencies students need?",
      "Facilitation: How could students use AI while still doing the intended thinking, judging or performing?",
      "Assessment: What must students demonstrate, and how may GenAI be used?",
      "Data and Tech-Enhanced T&L: What learning need could an AI tool or learning data help address?",
    ],
    tips: [
      "Use the 3As to consider distinctly human capabilities, productive use of AI, and new AI-enabled professional practice.",
      "Use PAIR to structure the problem, AI use, interaction and reflection, with support appropriate to develop students’ 3As competencies.",
      "Align the outcomes to the 3As, make the AI conditions clear and collect evidence that validly and reliably measures students’ own contributions.",
      "Consider whether the approach is suitable, what information and outputs need checking, and how its value will be reviewed.",
    ],
  });

export const pairApplyChecklist = () =>
  tapChecklist({
    prompt: "Tap each prompt once you have considered it for your activity.",
    storageKey: "activity-notes:pairapply",
    items: [
      "what students should understand or do before using AI;",
      "what role AI should play;",
      "how students will evaluate and improve the output;",
      "what reflection or evidence will make their learning and judgement visible.",
    ],
  });
