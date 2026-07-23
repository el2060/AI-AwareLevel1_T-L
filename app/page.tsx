"use client";

import { ReactElement, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowLeftRight, ArrowRight, BookOpen, Bot, Check, CheckCircle2, ChevronRight, ClipboardCheck, Compass, Eye, Layers, Lightbulb, RefreshCw, Rocket, Scale, ShieldCheck, Target, UserRound, Users, X } from "lucide-react";

type Section = {
  id: string;
  title: string;
  shortTitle: string;
  markdown: string;
};

type ActivityNotes = Record<string, string>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/  $/, "<br />");
}

const INFO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
const WARNING_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const CHECK_CIRCLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';

function isTableDivider(line: string) {
  return /^\|?[\s:|-]+\|[\s:|-]+\|?$/.test(line.trim());
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function markdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      output.push("<hr />");
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      // "Key Takeaway" sections get a highlighted treatment keyed to the
      // current part's accent colour, instead of a plain heading.
      if (level === 2 && heading[2].trim() === "Key Takeaway") {
        const body: string[] = [];
        i += 1;
        while (
          i < lines.length &&
          !/^#{1,4}\s+/.test(lines[i].trim()) &&
          !/^---+$/.test(lines[i].trim())
        ) {
          body.push(lines[i]);
          i += 1;
        }
        output.push(
          `<div class="key-takeaway"><p class="key-takeaway-head">${CHECK_CIRCLE_SVG}<span>${inlineMarkdown(heading[2])}</span></p>${markdownToHtml(body.join("\n"))}</div>`,
        );
        continue;
      }
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1])
    ) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      output.push(
        `<div class="table-wrap"><table><thead><tr>${headers
          .map((cell) => `<th>${inlineMarkdown(cell)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell) => `<td>${inlineMarkdown(cell)}</td>`)
                .join("")}</tr>`,
          )
          .join("")}</tbody></table></div>`,
      );
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      output.push(`<blockquote>${quote.map(inlineMarkdown).join("<br />")}</blockquote>`);
      continue;
    }

    const details = trimmed.match(/^:::details\s+(.+)$/);
    if (details) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim() === ":::") i += 1;
      output.push(
        `<details class="policy-detail"><summary>${inlineMarkdown(details[1])}</summary><div>${markdownToHtml(body.join("\n"))}</div></details>`,
      );
      continue;
    }

    const callout = trimmed.match(/^:::(warning|note)\s+(.+)$/);
    if (callout) {
      const [, kind, title] = callout;
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim() === ":::") i += 1;
      const glyph = kind === "warning" ? WARNING_SVG : INFO_SVG;
      output.push(
        `<div class="callout callout-${kind}"><p class="callout-head">${glyph}${inlineMarkdown(title)}</p>${markdownToHtml(body.join("\n"))}</div>`,
      );
      continue;
    }

    const labelOnly = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (labelOnly) {
      const cards: string[] = [];
      while (i < lines.length) {
        const currentLabel = lines[i].trim().match(/^\*\*(.+?)\*\*$/);
        if (!currentLabel) break;
        i += 1;
        while (i < lines.length && !lines[i].trim()) i += 1;

        const body: string[] = [];
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^(#{1,4})\s+/.test(lines[i].trim()) &&
          !/^---+$/.test(lines[i].trim()) &&
          !/^>\s?/.test(lines[i].trim()) &&
          !/^-\s+/.test(lines[i].trim()) &&
          !/^\d+\.\s+/.test(lines[i].trim()) &&
          !lines[i].trim().startsWith("|") &&
          !/^:::details\s+/.test(lines[i].trim()) &&
          !/^\*\*(.+?)\*\*$/.test(lines[i].trim())
        ) {
          body.push(lines[i].trim());
          i += 1;
        }

        if (!body.length) {
          output.push(`<p><strong>${inlineMarkdown(currentLabel[1])}</strong></p>`);
          continue;
        }

        cards.push(`<section><strong>${inlineMarkdown(currentLabel[1])}</strong><p>${inlineMarkdown(body.join(" "))}</p></section>`);
        while (i < lines.length && !lines[i].trim()) i += 1;
      }
      output.push(`<div class="definition-grid">${cards.join("")}</div>`);
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^-\s+/, ""));
        i += 1;
      }
      const listClass = items.length >= 5 ? "course-list course-list-long" : "course-list";
      output.push(`<ul class="${listClass}">${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      output.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^-\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("|")
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    const text = paragraph.join(" ");
    if (/^\*\*(Suggested response|Answer):\*\*/.test(text)) {
      output.push(
        `<details class="response"><summary>View suggested response</summary><p>${inlineMarkdown(text)}</p></details>`,
      );
    } else {
      output.push(`<p>${inlineMarkdown(text)}</p>`);
    }
  }

  return output.join("\n");
}

function makeId(title: string, index: number) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `section-${index + 1}`;
}

function shortTitle(title: string) {
  if (title === "AI T&L Essentials: Level 1 (AI-Aware)") return "Start here";
  return title.replace(/^Part \d+:\s*/, "");
}

function splitSections(markdown: string): Section[] {
  const headings = [...markdown.matchAll(/^# (.+)$/gm)];
  return headings.map((match, index) => {
    const title = match[1].trim();
    const start = match.index ?? 0;
    const end = headings[index + 1]?.index ?? markdown.length;
    return {
      id: makeId(title, index),
      title,
      shortTitle: shortTitle(title),
      markdown: markdown.slice(start, end).trim(),
    };
  });
}

function withoutTitle(markdown: string) {
  return markdown.replace(/^# .+\r?\n?/, "").trim();
}

const contentsMeta = [
  { title: "Start here", label: "AI-enabled T&L overview · Up to 2 hours" },
  { title: "NP’s AI-enabled T&L approach", label: "5 strategies · 3As · PAIR" },
  { title: "Curriculum design and competencies", label: "3As · Learning design alignment" },
  { title: "Facilitation with PAIR", label: "AI-supported learning · Scaffolding" },
  { title: "Assessment in a GenAI-enabled context", label: "Policy requirements · Conditions · Evidence" },
  { title: "AI tools and learning analytics", label: "Lecturer support · AI tutors · Learning data" },
  { title: "Bring it together", label: "Four-area module review" },
];

// Each part carries the accent colour of the T&L domain it covers, so the
// four-colour code doubles as wayfinding across the package.
const partIcons: Record<number, typeof BookOpen> = {
  1: Compass,
  2: BookOpen,
  3: Lightbulb,
  4: ClipboardCheck,
  5: ShieldCheck,
  6: Layers,
};

const sectionBridges = [
  "See how these four areas connect to NP’s direction for AI-enabled T&L.",
  "Begin with curriculum: what competencies should our students develop and demonstrate as professional practice changes?",
  "Explore PAIR, a simple framework for helping students use AI purposefully, critically and responsibly in their learning.",
  "Consider how clear GenAI conditions and assessment design can provide authentic and credible evidence of learning and students' own contribution.",
  "Explore how AI tools and learning data can be used purposefully to support learning, while protecting information, verifying outputs and retaining human oversight.",
  "Bring the four areas together by reviewing one module you teach, lead or support.",
];

type SorterScenario = { id: string; context: string; answer: string; feedback: string };

function ScenarioSorter({ eyebrow, title, prompt, options, scenarios, countNoun, trio }: { eyebrow: string; title: string; prompt: string; options: string[]; scenarios: SorterScenario[]; countNoun: string; trio?: boolean }) {
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const current = scenarios[active];
  const picked = answers[current.id];
  const solved = scenarios.filter((scenario) => answers[scenario.id] === scenario.answer).length;
  return (
    <section className="activity-block domain-spotter">
      <div className="activity-head-row">
        <div><span className="activity-eyebrow">{eyebrow}</span><h3>{title}</h3></div>
        <span className={`activity-count${solved === scenarios.length ? " complete" : ""}`}>{solved} / {scenarios.length} {countNoun}</span>
      </div>
      <p>{prompt}</p>
      <div className="domain-spotter-tabs" role="tablist" aria-label="Scenarios">
        {scenarios.map((s, index) => {
          const a = answers[s.id];
          const state = !a ? "" : a === s.answer ? "solved" : "attempted";
          return <button key={s.id} type="button" role="tab" aria-selected={active === index} className={`${active === index ? "active" : ""} ${state}`} onClick={() => setActive(index)}>{a ? (a === s.answer ? <Check size={14} strokeWidth={2.8} aria-hidden="true" /> : <X size={14} strokeWidth={2.8} aria-hidden="true" />) : index + 1}</button>;
        })}
      </div>
      <div className="domain-spotter-case"><p>{current.context}</p></div>
      <div className={`domain-spotter-options${trio ? " trio" : ""}`}>
        {options.map((d) => <button key={d} type="button" className={picked === d ? (d === current.answer ? "selected correct" : "selected wrong") : ""} onClick={() => setAnswers((a) => ({ ...a, [current.id]: d }))}>{d}</button>)}
      </div>
      {picked && (
        <div className={`activity-feedback ${picked !== current.answer ? "try-again" : ""}`}>
          <strong>{current.answer}</strong>
          <p>{current.feedback}</p>
        </div>
      )}
    </section>
  );
}

function SupportReplaceSorter() {
  return <ScenarioSorter
    eyebrow="Quick Check"
    title="Is AI Supporting the Learning?"
    prompt="For each situation, decide whether AI supports students in developing the intended capability or does the work they are meant to do."
    options={["Supports the intended learning", "Replaces the intended learning"]}
    countNoun="sorted"
    scenarios={[
      { id: "compare", context: "Students ask AI for a different worked example of a concept, then attempt the practice set on their own.", answer: "Supports the intended learning", feedback: "AI provides an additional explanation, but students still apply the concept themselves in the practice set." },
      { id: "submit", context: "A student pastes the assignment brief into GenAI and submits a lightly edited version of the response.", answer: "Replaces the intended learning", feedback: "AI has produced the response that the student was expected to develop. Light editing does not demonstrate the intended analysis, judgement or creation." },
      { id: "critique", context: "Students generate three AI draft answers, then critique and rank them against the success criteria.", answer: "Supports the intended learning", feedback: "Generating material for critique keeps the evaluating and judging with students." },
      { id: "reflection", context: "A student asks AI to write their reflection on what they learned from the project.", answer: "Replaces the intended learning", feedback: "The reflection is intended to make the student’s own learning and judgement visible. Asking AI to write it replaces that process." },
    ]}
  />;
}

function ThreeAsMisconceptionCheck() {
  return <ScenarioSorter
    eyebrow="Quick Check"
    title="Understanding the 3As"
    prompt="For each statement, decide whether it is accurate or needs correction."
    options={["Accurate", "Needs correction"]}
    countNoun="checked"
    scenarios={[
      { id: "revise-all", context: "Every module must revise its learning outcomes and assessment to include GenAI.", answer: "Needs correction", feedback: "All modules should consider how AI may affect the competencies students need. Changes are only needed where the review identifies a gap or misalignment." },
      { id: "no-change", context: "A module may emphasise one or several of the 3As, and the review may conclude that no change is needed.", answer: "Accurate", feedback: "The relevant emphasis depends on the discipline, module level, intended learning outcomes and professional context." },
      { id: "tutor-augment", context: "Using an AI tutor or learning assistant in a module means the module is developing Augment capabilities.", answer: "Needs correction", feedback: "AI tutors and learning assistants support facilitation. Augment refers to students learning to use AI productively in disciplinary or professional work, with appropriate judgement and oversight." },
      { id: "anchor-complex", context: "Anchor can involve complex human and disciplinary judgement, and is not a lower-order category.", answer: "Accurate", feedback: "Anchor includes capabilities such as professional judgement, empathy, ethics, creativity, safety-critical reasoning and other capabilities that remain distinctly human. To identify what should remain Anchor, lecturers need an informed view of what current AI tools can and cannot do." },
      { id: "prohibit-simply", context: "A module that focuses on Anchor can simply prohibit AI without considering what current AI tools can do.", answer: "Needs correction", feedback: "Understanding current AI capabilities helps lecturers identify what students must genuinely demonstrate themselves and design learning activities and assessment accordingly. Lecturers may test relevant tools or use guided activities such as PAIR to understand how AI could support or bypass the intended learning." },
    ]}
  />;
}

function GenAiConditionsSorter() {
  return <ScenarioSorter
    eyebrow="Check the conditions"
    title="Allowed, Restricted or Prohibited?"
    prompt="Decide how each situation sits under NP's GenAI policy for summative assessment."
    options={["Allowed", "Restricted", "Prohibited"]}
    countNoun="checked"
    trio
    scenarios={[
      { id: "default", context: "The brief states nothing about GenAI, and a student uses it to brainstorm approaches for a take-home assignment.", answer: "Allowed", feedback: "GenAI use is allowed by default in summative assessment unless it is explicitly restricted or prohibited. The student must still cite and declare the use." },
      { id: "live", context: "Students may use GenAI to prepare, but must complete the live presentation and question-and-answer session without it.", answer: "Restricted", feedback: "This is a restricted-use condition: GenAI is allowed for preparation but prohibited during the live component. State the condition clearly for each component." },
      { id: "declared", context: "A student submits a fully AI-generated report and declares the use on the cover page.", answer: "Prohibited", feedback: "Submitting purely AI-generated content as one's own is always prohibited — declaring prohibited use does not make it acceptable." },
      { id: "images", context: "Students may include GenAI-generated images provided they frame the task, select and refine the output, and explain their choices.", answer: "Restricted", feedback: "This is a restricted-use condition: GenAI content is permitted provided students shape, refine and explain it." },
    ]}
  />;
}

function TapChecklist({ eyebrow, title, prompt, items, tips, value, onChange, completionTitle, completionText }: { eyebrow?: string; title?: string; prompt: string; items: string[]; tips?: string[]; value: string; onChange: (value: string) => void; completionTitle?: string; completionText?: string }) {
  const selected = value ? value.split("|") : [];
  return (
    <section className="activity-block tap-checklist">
      <div className="activity-head-row">
        {(eyebrow || title) ? <div>{eyebrow && <span className="activity-eyebrow">{eyebrow}</span>}{title && <h2>{title}</h2>}</div> : <div />}
        <span className={`activity-count${selected.length === items.length ? " complete" : ""}`}>{selected.length} / {items.length}</span>
      </div>
      <p>{prompt}</p>
      <div className="tap-check-grid">{items.map((item, index) => {
        const isSelected = selected.includes(item);
        return (
          <button key={item} className={isSelected ? "selected" : ""} onClick={() => onChange((isSelected ? selected.filter((x) => x !== item) : [...selected, item]).join("|"))}>
            <span>{isSelected ? <Check size={16} strokeWidth={2.8} aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</span>
            <div><strong>{item}</strong>{isSelected && tips?.[index] && <small className="tap-check-tip">{tips[index]}</small>}</div>
          </button>
        );
      })}</div>
      {completionTitle && completionText && selected.length === items.length && <div className="activity-feedback"><strong>{completionTitle}</strong><p>{completionText}</p></div>}
    </section>
  );
}

function NextStepActivity({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = [
    { label: "Review one learning outcome, activity or assessment using the 3As.", feedback: "A single 3As review is a manageable way to begin identifying what may need attention." },
    { label: "Apply PAIR to one learning activity.", feedback: "Applying PAIR to a single activity is a focused way to check that AI is supporting, rather than replacing, the intended learning." },
    { label: "Check one assessment's GenAI conditions.", feedback: "Checking one assessment’s GenAI conditions is a focused way to apply the guidance in practice." },
    { label: "Explore one suitable use of an AI tool or learning data.", feedback: "Start with a clear teaching and learning need, then check the output, data considerations and your oversight." },
  ];
  const selected = options.find((option) => option.label === value);
  return (
    <section className="activity-block next-step-block">
      <div className="choice-grid">{options.map((option, index) => { const letter = String.fromCharCode(65 + index); const isSelected = value === option.label; return <button key={option.label} className={`choice-button ${isSelected ? "selected" : ""}`} onClick={() => onChange(option.label)}><span>{isSelected ? <Check size={14} strokeWidth={2.8} aria-hidden="true" /> : letter}</span>{option.label}</button>; })}</div>
      {selected && <div className="activity-feedback"><strong>A Practical Place to Start</strong><p>{selected.feedback}</p></div>}
    </section>
  );
}

function FourLensReview({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <TapChecklist prompt="Tap each question once you have considered it for your module." items={["Curriculum: Do the learning outcomes still reflect the competencies students need?", "Facilitation: How could students use AI while still doing the intended thinking, judging or performing?", "Assessment: What must students demonstrate, and how may GenAI be used?", "Data and Tech-Enhanced T&L: What learning need could an AI tool or learning data help address?"]} tips={["Use the 3As to consider distinctly human and disciplinary capabilities, productive use of AI, and new AI-enabled professional practice.", "Use PAIR to structure the task, AI use, interaction and reflection, with support appropriate to students’ readiness.", "Make the GenAI conditions clear and ensure the evidence shows the intended learning and students’ own contribution.", "Consider whether the approach is suitable, what information and outputs need checking, and how its value will be reviewed."]} value={value} onChange={onChange} />;
}

function StrategyMap() {
  const [active, setActive] = useState(0);
  const items = [
    { name: "Embed AI-Integrated Pedagogy · PAIR", question: "How can we help students learn and work with AI purposefully, critically and responsibly?", icon: Lightbulb, covers: "Part 3 · Facilitation of Learning", coversTone: 3 },
    { name: "Transform the Curriculum · 3As", question: "What competencies should our students develop and demonstrate as professional practice changes?", icon: BookOpen, covers: "Part 2 · Curriculum Design and Development", coversTone: 2 },
    { name: "Redesign Assessment", question: "How can we design assessment that provides authentic and credible evidence of learning in an AI-enabled context?", icon: ClipboardCheck, covers: "Part 4 · Assessment", coversTone: 4 },
    { name: "Enable Personalised Learning", question: "How can AI extend opportunities for practice, feedback and coaching in our modules?", icon: Bot, covers: "Part 5 · Data and Tech-Enhanced T&L", coversTone: 5 },
    { name: "Strengthen Human Skills and Resilience", question: "How can we strengthen the human qualities students need in an AI-enabled world?", icon: Users },
  ];
  return (
    <section className="strategy-map" aria-label="How NP approaches connect across this package">
      <div className="strategy-heading">
        <h2>NP’s Five Strategies at a Glance</h2>
        <p>NP’s five strategies support one intended outcome:</p>
      </div>
      <div className="strategy-goal" aria-label="Outcome: AI-ready graduates who combine strong human qualities, deep domain expertise and effective use of AI in professional practice">
        <div className="graduate-core">
          <i><UserRound size={36} strokeWidth={2} aria-hidden="true" /></i>
          <div>
            <small>Outcome</small>
            <strong>AI-ready graduates</strong>
            <span>Strong human qualities · Deep domain expertise · Effective use of AI in professional practice</span>
            <p>NP graduates should combine deep domain expertise with strong human qualities and the ability to use AI effectively and responsibly in professional practice.</p>
          </div>
        </div>
      </div>
      <div className="strategy-path">
        {items.map(({ name, question, icon: Icon, covers, coversTone }, index) => <button key={name} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-pressed={active === index}>
          <i><Icon size={22} strokeWidth={2} aria-hidden="true" /></i><span><strong>Strategy {index + 1} · {name}</strong><small>{question}</small>{covers && <em className={`strategy-covers covers-tone-${coversTone}`}>{covers}</em>}</span>
        </button>)}
      </div>
    </section>
  );
}

function UseCaseExplorer() {
  const [active, setActive] = useState(0);
  const uses = [
    {
      label: "Learning resource",
      tool: "An AI assistant suitable for the task, such as M365 Copilot.",
      task: "Create a simpler explanation, a step-by-step worksheet or a short self-check from the same source material.",
      starter: "Create a simpler explanation and five self-check questions for [concept]. Preserve the technical meaning and intended learning standard. Flag anything you are uncertain how to simplify.",
      check: "Check accuracy, the intended learning standard, and whether the examples are inclusive and accessible.",
      decision: "Choose and adapt the format that is most useful for your learners.",
    },
    {
      label: "Student practice",
      tool: "Brightspace Lumi Tutor or a course-specific AI tutor.",
      task: "Extend practice and feedback beyond class time using material and boundaries set for the module.",
      starter: "Decide which topic needs additional practice, what sources the tutor can use, and when students should seek support from a lecturer instead.",
      check: "Check that the tutor's explanations and feedback align with the module materials and intended learning.",
      decision: "Set the role of the tool clearly so it complements, rather than replaces, facilitation.",
    },
    {
      label: "Disciplinary practice",
      tool: "A suitable course- or profession-specific AI tool.",
      task: "Help students apply disciplinary knowledge through an authentic AI-supported workflow, such as coding, design, simulation or data analysis.",
      starter: "Clarify the capability students should develop and what they must still understand, decide or perform themselves.",
      check: "Check that the tool supports the intended learning and that students can evaluate and explain its output.",
      decision: "Decide how the tool fits within the activity, what scaffolding students need and what evidence will show their learning.",
    },
    {
      label: "Learning data",
      tool: "A suitable analytics view or AI-supported summary process.",
      task: "Look for a pattern in participation, performance or feedback that may indicate a need for support.",
      starter: "Review the original evidence and learner context before deciding whether a pattern needs action.",
      check: "Check that the information and process are appropriate, and that the apparent pattern is supported by the evidence.",
      decision: "Use your judgement to decide whether an intervention is needed and whether it helped.",
    },
  ];
  const selected = uses[active];
  return (
    <section className="use-case-explorer" aria-label="Four practical uses of AI tools and learning data">
      <div className="use-case-picker" role="group" aria-label="Choose a teaching and learning use">
        {uses.map((use, index) => <button key={use.label} type="button" aria-pressed={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)}>{use.label}</button>)}
      </div>
      <div className="use-case-detail" aria-live="polite">
        <div className="use-case-context"><div><strong>Possible approach</strong><p>{selected.tool}</p></div><div><strong>T&L purpose</strong><p>{selected.task}</p></div></div>
        <div className="prompt-starter"><strong>Start here</strong><p>{selected.starter}</p></div>
        <div className="use-case-checks"><div><b>Check</b><p>{selected.check}</p></div><div><b>Lecturer decision</b><p>{selected.decision}</p></div></div>
        <p className="use-case-tool-note"><strong>Keep the learning purpose in view.</strong> The tool supports the activity; the lecturer determines how it is used.</p>
      </div>
    </section>
  );
}

function TandlUsesExplorer() {
  const [active, setActive] = useState(0);
  const uses = [
    {
      label: "Learning resources",
      icon: BookOpen,
      title: "Prepare and improve learning resources",
      detail: "Use AI as a starting point to review module materials, draft practice examples, create alternative formats, check assignment clarity or summarise feedback themes.",
      focus: "You provide the context and intended learning, then check, adapt and decide what to use.",
    },
    {
      label: "Learning support",
      icon: Lightbulb,
      title: "Extend learning support",
      detail: "AI-enabled tutors and learning assistants can extend opportunities for explanation, practice and feedback beyond class time. This may include Brightspace Lumi Tutor, course-specific tutors or student AI tools used within clear conditions.",
      focus: "Set the intended learning, source materials, boundaries and role of the support within the module.",
    },
    {
      label: "Disciplinary practice",
      icon: Target,
      title: "Support disciplinary and professional practice",
      detail: "AI may be embedded in authentic workflows such as coding and testing, design and media, data analysis, simulation, or research and evidence review.",
      focus: "Help students apply disciplinary knowledge, evaluate outputs and exercise appropriate judgement—not simply operate the tool.",
    },
    {
      label: "Learning data",
      icon: ShieldCheck,
      title: "Use learning data to inform support",
      detail: "Learning data can reveal patterns in participation or performance, indicate possible learner needs, inform targeted support and help review whether support is working.",
      focus: "Treat AI-generated summaries, patterns or predictions as starting points. Review the evidence and learner context before acting.",
    },
  ];
  const selected = uses[active];
  const Icon = selected.icon;
  return (
    <section className="tandl-uses-explorer" aria-label="Four practical uses of AI tools and learning data">
      <div className="tandl-uses-intro"><span>Choose a use to explore</span><p>Explore how each use can support a T&L purpose and what the lecturer still needs to decide.</p></div>
      <div className="tandl-use-nav" role="group" aria-label="Choose a practical use">
        {uses.map((use, index) => {
          const UseIcon = use.icon;
          const isActive = active === index;
          return <button key={use.label} type="button" aria-pressed={isActive} className={isActive ? "active" : ""} onClick={() => setActive(index)}><i><UseIcon size={17} strokeWidth={2.1} aria-hidden="true" /></i><span>{use.label}</span></button>;
        })}
      </div>
      <div className="tandl-use-detail" aria-live="polite">
        <i><Icon size={24} strokeWidth={2} aria-hidden="true" /></i>
        <div><small>How AI and data can help</small><h3>{selected.title}</h3><p>{selected.detail}</p><strong>{selected.focus}</strong></div>
      </div>
    </section>
  );
}

function ToolGuidance() {
  return (
    <section className="tool-information-guidance" aria-label="Using information in AI tools">
      <p className="tool-information-intro">The information you may enter depends on the tool being used.</p>
      <div className="tool-information-list">
        <div><strong>M365 Copilot</strong><span>Up to <b>Official (Closed) – Restricted</b> within NP’s Microsoft 365 environment.</span></div>
        <div><strong>Pair Chat <small>pair.gov.sg</small></strong><span>Up to <b>Official (Closed) – Sensitive Normal</b>.</span></div>
        <div><strong>Public or personal-account AI tools</strong><span>Do not enter personal, sensitive, confidential or proprietary information.</span></div>
      </div>
      <p className="tool-information-closing">Check that the tool is suitable for the information involved, and review its outputs before use.</p>
    </section>
  );
}

function QuickSenseCheck() {
  const [revealed, setRevealed] = useState<number[]>([]);
  const items = [
    { situation: "An AI tutor gives an explanation that differs from the module materials.", reveal: "Check the source content and accuracy before deciding whether the materials or tutor setup need adjustment." },
    { situation: "Students use a discipline-specific AI tool to produce a technically strong solution.", reveal: "Check whether they can explain, evaluate and apply the underlying disciplinary knowledge." },
    { situation: "You want to upload assessment results into an AI tool.", reveal: "Check whether the tool and process are appropriate for the information involved." },
    { situation: "Learning data suggests that several students may need support.", reveal: "Review the evidence and learner context before deciding what action is appropriate." },
  ];
  function toggle(index: number) {
    setRevealed((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]));
  }
  return (
    <section className="activity-block quick-sense-check">
      <div className="activity-head-row"><div><span className="activity-eyebrow">Quick sense check</span><h2>What Would You Check?</h2></div></div>
      <p>Tap each situation to reveal what to consider.</p>
      <div className="sense-check-grid">
        {items.map((item, index) => {
          const isRevealed = revealed.includes(index);
          return (
            <button key={item.situation} type="button" className={isRevealed ? "revealed" : ""} onClick={() => toggle(index)} aria-expanded={isRevealed}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{item.situation}</strong>{isRevealed && <small>{item.reveal}</small>}</div>
            </button>
          );
        })}
      </div>
      <p className="sense-check-closing"><strong>AI can create resources, extend support, enable disciplinary practice and identify patterns.</strong> You provide the context, check the outputs and decide how they are used.</p>
    </section>
  );
}

function OpeningVisual() {
  const areas = [
    {
      title: "Curriculum Design and Development",
      detail: "What competencies your students need as professional practice changes.",
      icon: BookOpen,
    },
    {
      title: "Facilitation of Learning",
      detail: "How AI can support learning and practice without replacing the intended thinking, judgement or performance.",
      icon: Lightbulb,
    },
    {
      title: "Assessment",
      detail: "How assessment can provide authentic and credible evidence of learning and students’ own contribution.",
      icon: ClipboardCheck,
    },
    {
      title: "Data and Tech-Enhanced T&L",
      detail: "How AI tools and learning data can enhance learning purposefully and responsibly.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="opening-visual" aria-label="What this package covers">
      <div className="overview-heading">
        <span>At a Glance</span>
        <h2>Applying an AI Lens to Four TLCF Domains</h2>
      </div>
      <div className="overview-areas">
        {areas.map((area, index) => {
          const Icon = area.icon;
          return <div className={`overview-area overview-area-static area-${index + 1}`} key={area.title}>
            <span><Icon size={20} strokeWidth={2.1} aria-hidden="true" /></span>
            <div><strong>{area.title}</strong><small>{area.detail}</small></div>
          </div>;
        })}
      </div>
    </section>
  );
}

function HomeFlow() {
  const outcomes = [
    "recognise how AI is changing the competencies students need and the implications for curriculum design",
    "explain how AI can support learning and practice without replacing the intended thinking, judgement or performance",
    "apply NP's GenAI policy requirements for summative assessment to clarify conditions and make the intended learning and students' own contribution visible",
    "identify appropriate uses of AI tools and learning data and apply key considerations for purposeful and responsible use",
  ];

  return (
    <section className="home-flow" aria-label="Welcome and module outcomes">
      <article className="home-intro-card">
        <span>Welcome</span>
        <h2>T&amp;L in an AI-Enabled Context</h2>
        <p>
          AI is increasingly shaping how our students learn, how professional
          practice is changing and what NP graduates will need to be able to do.
        </p>
        <p>
          Used purposefully, AI can extend opportunities for practice, feedback
          and personalised learning. It can also help us develop learning
          resources, identify learning needs and respond more effectively.
          But AI can also become a shortcut that bypasses the
          thinking, judgement or performance students are meant to develop.
        </p>
        <p className="home-challenge">
          The challenge for T&amp;L is to help students benefit from AI while
          continuing to develop strong disciplinary foundations, independent
          thinking and human judgement.
        </p>
        <figure className="home-quote">
          <blockquote>
            &ldquo;If we treat AI as a shortcut&hellip; we will diminish the
            very purpose of education. But if we treat AI as a catalyst&hellip;
            it can strengthen our IHLs and strengthen our people.&rdquo;
          </blockquote>
          <figcaption>
            Mr Desmond Lee, Minister for Education <i aria-hidden="true">·</i> April 2026
          </figcaption>
        </figure>
        <h3>Building on the TLCF</h3>
        <p>
          The T&amp;L Competency Framework (TLCF) sets out six domains of
          T&amp;L practice. This package applies an AI lens to four selected
          domains: the three functional T&amp;L domains and Data and
          Tech-Enhanced T&amp;L.
        </p>
        <div className="home-domain-chips">
          <span className="home-domain-chip chip-1"><BookOpen size={14} strokeWidth={2.2} aria-hidden="true" />Curriculum Design and Development</span>
          <span className="home-domain-chip chip-2"><Lightbulb size={14} strokeWidth={2.2} aria-hidden="true" />Facilitation of Learning</span>
          <span className="home-domain-chip chip-3"><ClipboardCheck size={14} strokeWidth={2.2} aria-hidden="true" />Assessment</span>
          <span className="home-domain-chip chip-4"><ShieldCheck size={14} strokeWidth={2.2} aria-hidden="true" />Data and Tech-Enhanced T&amp;L</span>
        </div>
        <p>
          Across these areas, we will consider how AI affects what students
          need to learn, how learning is facilitated and assessed, and how AI
          tools and learning data can be used purposefully and responsibly.
        </p>
      </article>

      <div className="home-learn-stack">
        <article className="home-outcome-card">
          <header>
            <span>What You Will Learn</span>
            <p>By the end of this package, you will be able to:</p>
          </header>
          <ol>
            {outcomes.map((outcome) => (
              <li key={outcome}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{outcome}</span>
              </li>
            ))}
          </ol>
        </article>

        <aside className="home-time-note" aria-label="Learning time">
          <span>Learning Time</span>
          <strong>Up to 2 hours</strong>
          <p>
            The package includes the learning content, activities and
            completion quiz. You may move through the sections at your own pace
            and spend more time on areas most relevant to your role or module.
          </p>
        </aside>
      </div>
    </section>
  );
}

function StudentBaselineVisual() {
  const items = [
    {
      icon: BookOpen,
      title: "Learn About AI",
      focus: "Understand AI and its capabilities",
      detail: "Recognise key AI terms and approaches, how AI is evolving, and what different forms of AI can and cannot do.",
      example: "Explain why an AI system may produce a plausible but inaccurate response.",
    },
    {
      icon: Bot,
      title: "Learn With AI",
      focus: "Use AI to strengthen learning and thinking",
      detail: "Use AI to break down problems, compare explanations, identify gaps in reasoning and deepen understanding.",
      example: "Ask AI to explain a difficult concept in different ways, then evaluate which explanation is most accurate and useful.",
    },
    {
      icon: Rocket,
      title: "Learn to Use AI",
      focus: "Apply AI purposefully and evaluate its outputs",
      detail: "Select suitable tools, provide appropriate inputs and assess outputs for accuracy, relevance, bias and fitness for purpose.",
      example: "Use AI to develop an initial solution, then verify, refine and adapt it for the intended context.",
    },
    {
      icon: Scale,
      title: "Learn Beyond AI",
      focus: "Exercise judgement, responsibility and oversight",
      detail: "Consider the ethical, legal and societal implications of AI while retaining human accountability for decisions and outputs.",
      example: "Decide whether an AI-assisted recommendation is fair, appropriate and safe to use.",
    },
  ];
  return (
    <details className="policy-detail student-baseline-accordion">
      <summary>View what students should progressively be able to do with AI</summary>
      <div>
        <p>The POLITE student AI baseline sets out four complementary areas of foundational AI competency that students should progressively develop across their learning journey.</p>
        <div className="lens-strip baseline-strip">
          {items.map(({ icon: Icon, title, focus, detail, example }) => (
            <section key={title}>
              <i><Icon size={18} strokeWidth={2.1} aria-hidden="true" /></i>
              <b>{title}</b>
              <strong>{focus}</strong>
              <small>{detail}</small>
              <em><span>For example:</span> {example}</em>
            </section>
          ))}
        </div>
        <section className="baseline-module-panel" aria-label="What this means for your module">
          <h4>What This Means for Your Module</h4>
          <p>Not every module is expected to teach or assess all four areas. Consider:</p>
          <ul className="course-list">
            <li>which competencies are relevant to your discipline and module;</li>
            <li>where students will practise and progressively develop them;</li>
            <li>how students' own thinking, judgement and contribution will remain visible.</li>
          </ul>
          <blockquote>The student AI baseline provides a common foundation. The 3As help lecturers interpret these competencies in relation to disciplinary learning and emerging professional practice.</blockquote>
        </section>
      </div>
    </details>
  );
}

function AlignmentFlowVisual() {
  const steps = [
    { key: "competency", label: "Competency", detail: "What students need to develop." },
    { key: "outcome", label: "Learning outcome", detail: "What students should be able to demonstrate." },
    { key: "activities", label: "Learning activities", detail: "How students practise and develop it." },
    { key: "evidence", label: "Assessment evidence", detail: "How achievement and students’ own contribution are made visible." },
  ];
  return (
    <figure className="concept-visual alignment-story" aria-label="Flow from competency to assessment evidence">
      <p className="alignment-sentence">
        A <span className="alignment-chip"><i aria-hidden="true">1</i>competency</span> is expressed through a{" "}
        <span className="alignment-chip"><i aria-hidden="true">2</i>learning outcome</span>, developed through{" "}
        <span className="alignment-chip"><i aria-hidden="true">3</i>learning activities</span> and demonstrated through{" "}
        <span className="alignment-chip"><i aria-hidden="true">4</i>assessment evidence</span>.
      </p>
      <div className="alignment-captions">
        {steps.map((step, index) => (
          <div className="alignment-caption" key={step.key}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <b>{step.label}</b>
              <p>{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

function ThreeAsInfographic() {
  const lenses = [
    {
      key: "anchor",
      name: "Anchor",
      icon: UserRound,
      tagline: "Distinctly human capabilities",
      body: "Develop the human qualities, disciplinary judgement and essential capabilities students need even as AI becomes more capable.",
    },
    {
      key: "augment",
      name: "Augment",
      icon: Bot,
      tagline: "Productive use of AI",
      body: "Develop students' ability to use AI effectively to improve the quality, productivity or effectiveness of their work while exercising appropriate judgement and oversight.",
    },
    {
      key: "advance",
      name: "Advance",
      icon: Rocket,
      tagline: "New AI-enabled practice",
      body: "Develop students' ability to use AI to create new possibilities, workflows or forms of professional practice beyond established pre-AI job boundaries.",
    },
  ];
  return (
    <figure className="concept-visual three-as-infographic" aria-labelledby="three-as-title">
      <figcaption>
        <span>The 3As</span>
        <strong id="three-as-title">A simple lens for reviewing the competencies students need and aligning learning outcomes, activities and assessment.</strong>
      </figcaption>
      <div className="three-as-path">
        {lenses.map((lens) => {
          const Icon = lens.icon;
          return (
            <section key={lens.key} className={`three-as-band ${lens.key}-band`}>
              <Icon className="three-as-watermark" size={92} strokeWidth={1.5} aria-hidden="true" />
              <div className="three-as-top">
                <div className="three-as-icon"><Icon size={21} strokeWidth={2.1} aria-hidden="true" /></div>
              </div>
              <b>{lens.name}</b>
              <small>{lens.tagline}</small>
              <p>{lens.body}</p>
            </section>
          );
        })}
      </div>
    </figure>
  );
}

function PairInfographic() {
  const stages = [
    { letter: "P", name: "Problem", icon: Target, action: "Students clarify or frame the task or challenge", detail: "Understand the intended outcome, requirements, constraints and success criteria. Depending on the activity, the problem may be provided, guided or defined by students.", cue: "What must we understand before using AI?", tone: "problem" },
    { letter: "A", name: "AI", icon: Bot, action: "Students consider and select a suitable AI tool", detail: "Identify what support is needed and consider the tool’s capabilities, limitations, accessibility and permitted use.", cue: "What could AI contribute, and which tool is suitable?", tone: "ai" },
    { letter: "I", name: "Interaction", icon: RefreshCw, action: "Students experiment, evaluate and refine", detail: <>Interact with the tool, try different approaches and critically evaluate the outputs for relevance, accuracy, bias and suitability. Refine the interaction or output as needed.<br /><br />Important claims should be checked against primary, official or trusted sources, especially for legal, regulatory, technical or specialised information.</>, cue: "How will we test and improve the output?", tone: "interaction" },
    { letter: "R", name: "Reflection", icon: Eye, action: "Students examine the process, learning and implications", detail: "Consider how AI supported or hindered the work, what was learnt, where human judgement was needed and how their approach could improve.", cue: "What did we learn about the task, the tool and our own judgement?", tone: "reflection" },
  ];
  return (
    <figure className="concept-visual pair-infographic" aria-labelledby="pair-title">
      <figcaption>
        <span>PAIR</span>
        <strong id="pair-title">A structured process for learning and problem-solving with AI</strong>
      </figcaption>
      <div className="pair-flow">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div className={`pair-flow-row pair-${stage.tone}`} key={stage.name}>
              <div className="pair-flow-rail">
                <div className="pair-flow-node"><Icon size={19} strokeWidth={2.1} aria-hidden="true" /></div>
                {index < stages.length - 1 && <span className="pair-flow-line" aria-hidden="true" />}
              </div>
              <div className="pair-flow-body">
                <div className="pair-flow-kicker">{stage.letter} · {stage.name}</div>
                <strong>{stage.action}</strong>
                <p>{stage.detail}</p>
                <small>{stage.cue}</small>
              </div>
            </div>
          );
        })}
      </div>
      <div className="infographic-note pair-loop"><span aria-hidden="true"><ArrowLeftRight size={14} strokeWidth={2.2} /></span><p>Students may revisit the problem, reconsider the tool and refine their interactions as their understanding develops.</p></div>
    </figure>
  );
}

function AssessmentActionsInfographic() {
  const steps = [
    { number: "1", title: "Start With the Learning Outcome", detail: "Identify the capability being assessed and what students must still demonstrate themselves." },
    { number: "2", title: "State the GenAI Conditions Clearly", detail: "Clarify whether GenAI use is allowed, restricted or prohibited for each component." },
    { number: "3", title: "Make Learning and Contribution Visible", detail: "State what students must do themselves and what evidence is required." },
    { number: "4", title: "Prepare Students and Require Declaration", detail: "Explain the conditions early, provide suitable formative preparation and require the GenAI Use Declaration." },
  ];
  return (
    <figure className="concept-visual action-infographic" aria-labelledby="action-title">
      <figcaption>
        <strong id="action-title">A Practical Sequence for Assessment Design</strong>
      </figcaption>
      <div className="action-journey">
        {steps.map((step, index) => (
          <div className="action-step-wrap" key={step.number}>
            <section className="action-stage">
              <div className="action-stage-head"><i aria-hidden="true">{step.number}</i><b>{step.title}</b></div>
              <p>{step.detail}</p>
            </section>
            {index < steps.length - 1 && <span className="action-connector" aria-hidden="true"><ArrowRight size={15} strokeWidth={2.2} /></span>}
          </div>
        ))}
      </div>
    </figure>
  );
}

function AlignmentCheckVisual() {
  const items = [
    { icon: Target, title: "Learning outcome", detail: "Does it state the intended competency clearly?" },
    { icon: BookOpen, title: "Learning activities", detail: "Do they help students develop the intended competency?" },
    { icon: ClipboardCheck, title: "Assessment", detail: "Does it provide credible evidence of the intended competency and students’ own contribution?" },
  ];
  return (
    <figure className="concept-visual" aria-label="Check constructive alignment across learning outcome, activities and assessment">
      <div className="icon-panel-grid trio alignment-trio">
        {items.map(({ icon: Icon, title, detail }) => (
          <section key={title}>
            <i><Icon size={18} strokeWidth={2.1} aria-hidden="true" /></i>
            <div><b>{title}</b><small>{detail}</small></div>
          </section>
        ))}
      </div>
    </figure>
  );
}

function BringTogetherVisual() {
  const lenses = [
    { icon: BookOpen, title: "Curriculum", detail: "What may need review?" },
    { icon: Lightbulb, title: "Facilitation", detail: "Does AI support the intended learning?" },
    { icon: ClipboardCheck, title: "Assessment", detail: "What evidence keeps learning visible?" },
    { icon: ShieldCheck, title: "Data and Tools", detail: "What needs checking before use?" },
  ];
  return (
    <figure className="concept-visual bring-together-visual" aria-label="Four areas for reviewing one module">
      <figcaption><span>Bring it together</span><strong>Review one module through four areas</strong></figcaption>
      <div className="lens-strip">
        {lenses.map(({ icon: Icon, title, detail }) => (
          <section key={title}>
            <i><Icon size={18} strokeWidth={2.1} aria-hidden="true" /></i>
            <b>{title}</b>
            <small>{detail}</small>
          </section>
        ))}
      </div>
    </figure>
  );
}

function QuizReadinessRecap() {
  return (
    <details className="policy-detail quiz-recap-accordion">
      <summary>View Key Points to Remember</summary>
      <div className="quiz-recap">
        <section className="recap-panel recap-tone-2">
          <div className="recap-panel-head"><i><BookOpen size={18} strokeWidth={2.1} aria-hidden="true" /></i><h4>Curriculum · 3As</h4></div>
          <div className="recap-chip-row">
            <div className="recap-chip"><b>Anchor</b><p>Human qualities, disciplinary judgement and essential capabilities that remain important as AI becomes more capable.</p></div>
            <div className="recap-chip"><b>Augment</b><p>Productive use of AI to improve work while applying appropriate judgement and oversight.</p></div>
            <div className="recap-chip"><b>Advance</b><p>New AI-enabled possibilities, workflows or forms of professional practice.</p></div>
          </div>
          <p className="recap-note">Begin with the intended competency, then align the learning outcome, activities and assessment.</p>
        </section>

        <section className="recap-panel recap-tone-3">
          <div className="recap-panel-head"><i><Lightbulb size={18} strokeWidth={2.1} aria-hidden="true" /></i><h4>Facilitation · PAIR</h4></div>
          <div className="recap-pair-row">
            <div className="recap-pair-step"><b>Problem</b><p>Clarify or frame the task, requirements and intended outcome.</p></div>
            <ArrowRight className="recap-pair-arrow" size={14} strokeWidth={2.2} aria-hidden="true" />
            <div className="recap-pair-step"><b>AI</b><p>Consider and select suitable AI support.</p></div>
            <ArrowRight className="recap-pair-arrow" size={14} strokeWidth={2.2} aria-hidden="true" />
            <div className="recap-pair-step"><b>Interaction</b><p>Experiment with, evaluate and refine the outputs.</p></div>
            <ArrowRight className="recap-pair-arrow" size={14} strokeWidth={2.2} aria-hidden="true" />
            <div className="recap-pair-step"><b>Reflection</b><p>Consider what was learnt, where human judgement was needed and how the approach could improve.</p></div>
          </div>
          <p className="recap-note">AI should support students in developing the intended capability rather than doing the work for them.</p>
        </section>

        <section className="recap-panel recap-tone-4">
          <div className="recap-panel-head"><i><ClipboardCheck size={18} strokeWidth={2.1} aria-hidden="true" /></i><h4>Assessment · NP&rsquo;s GenAI Policy</h4></div>
          <ul className="recap-list">
            <li>GenAI is allowed by default in summative assessment unless explicitly restricted or prohibited.</li>
            <li>State any conditions clearly for each assessment component.</li>
            <li>Students must cite and declare relevant GenAI use.</li>
            <li>For restricted use, specify what AI may support, what students must do themselves and what evidence is required.</li>
            <li>Evidence should be proportionate; a complete AI interaction history is not required by default.</li>
            <li>AI-detection results or changes in writing style are not proof of misconduct.</li>
            <li>Staff remain responsible for every grade and feedback decision.</li>
          </ul>
          <p className="recap-warning"><strong>Always prohibited:</strong> submitting purely AI-generated work as one&rsquo;s own; disguising AI content as original; relying solely on AI for insights or reflection; and simulating human interactions where real interaction is required.</p>
        </section>

        <section className="recap-panel recap-tone-5">
          <div className="recap-panel-head"><i><ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" /></i><h4>Data and Tech-Enhanced T&amp;L</h4></div>
          <p className="recap-lead">Start with the learning need. Consider:</p>
          <ul className="recap-list">
            <li>Whether the tool or use of data supports the intended purpose.</li>
            <li>Whether it is suitable and accessible.</li>
            <li>Whether the information and outputs are appropriate and accurate.</li>
            <li>Who interprets the information and decides what action to take.</li>
          </ul>
          <p className="recap-note">AI may draft, identify patterns or suggest possibilities. We retain professional judgement and responsibility.</p>
        </section>
      </div>
    </details>
  );
}

function ModulePreviewVisual() {
  const areas = [
    { icon: BookOpen, title: "Curriculum Design and Development", detail: "Use the 3As to review the competencies students need as professional practice changes." },
    { icon: Lightbulb, title: "Facilitation of Learning", detail: "Use PAIR and personalised learning approaches to help students learn and work with AI purposefully." },
    { icon: ClipboardCheck, title: "Assessment", detail: "Apply NP's GenAI assessment requirements and design approaches to provide authentic and credible evidence of learning and students' own contribution." },
    { icon: ShieldCheck, title: "Data and Tech-Enhanced T&L", detail: "Use suitable AI tools and learning data to support learning and disciplinary practice, with appropriate checks and human oversight." },
  ];
  return (
    <figure className="concept-visual module-preview-visual" aria-label="What the next four sections cover">
      <div className="lens-strip">
        {areas.map(({ icon: Icon, title, detail }) => (
          <section key={title}>
            <i><Icon size={18} strokeWidth={2.1} aria-hidden="true" /></i>
            <b>{title}</b>
            <small>{detail}</small>
          </section>
        ))}
      </div>
    </figure>
  );
}

function SectionVisual({ title }: { title: string }) {
  if (title.startsWith("Part 6")) return <BringTogetherVisual />;
  return null;
}

export default function Home() {
  const [course, setCourse] = useState("");
  const [active, setActive] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [activityNotes, setActivityNotes] = useState<ActivityNotes>({});
  const [contentsOpen, setContentsOpen] = useState(false);

  const sections = useMemo(() => splitSections(course), [course]);
  const current = sections[active];
  const isHome = active === 0;
  const progress = sections.length
    ? Math.round((completed.length / sections.length) * 100)
    : 0;

  useEffect(() => {
    fetch("/course.md")
      .then((response) => response.text())
      .then(setCourse);
  }, []);

  useLayoutEffect(() => {
    // Move to the start of the new section before it is painted. This avoids
    // replaying a long upward scroll whenever a lecturer moves on.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [active]);

  function selectSection(index: number) {
    setActive(index);
    setContentsOpen(false);
  }

  function goNext() {
    if (!current) return;
    const nextIndex = Math.min(active + 1, sections.length - 1);
    // Only the section being left counts as complete; arriving at a section
    // should not mark it done.
    setCompleted((items) => Array.from(new Set([...items, current.id])));
    setActive(nextIndex);
  }

  function setActivityValue(key: string, value: string) {
    setActivityNotes((items) => ({ ...items, [key]: value }));
  }

  if (!current) {
    return (
      <main className="loading-shell">
        <div className="loading-mark" />
        <p>Loading course content…</p>
      </main>
    );
  }

  const useCaseMarker = "<!--use-case-explorer-->";
  const tandlUsesMarker = "<!--tandl-uses-->";
  const toolGuidanceMarker = "<!--tool-guidance-->";
  const pairInfographicMarker = "<!--pair-infographic-->";
  const moduleReviewMarker = "<!--module-review-->";
  const actionInfographicMarker = "<!--assessment-actions-infographic-->";
  const modulePreviewMarker = "<!--module-preview-->";
  const studentBaselineMarker = "<!--student-baseline-visual-->";
  const threeAsMarker = "<!--three-as-visual-->";
  const alignmentCheckMarker = "<!--alignment-check-visual-->";
  const alignmentFlowMarker = "<!--alignment-flow-visual-->";
  const strategyMapMarker = "<!--strategy-map-->";
  const supportReplaceMarker = "<!--support-or-replace-->";
  const threeAsMisconceptionMarker = "<!--three-as-misconception-check-->";
  const genAiConditionsMarker = "<!--genai-conditions-check-->";
  const nextStepMarker = "<!--next-step-->";
  const pairApplyMarker = "<!--pair-apply-checklist-->";
  const quizRecapMarker = "<!--quiz-readiness-recap-->";
  const sectionMarkdown = withoutTitle(current.markdown);
  const hasInlineNextPrompt = /^\s*(\*\*Next\*\*|#{1,4}\s+Next)\s*$/m.test(sectionMarkdown);
  const markerRenderers: Record<string, ReactElement> = {
    [useCaseMarker]: <UseCaseExplorer />,
    [tandlUsesMarker]: <TandlUsesExplorer />,
    [toolGuidanceMarker]: <ToolGuidance />,
    [pairInfographicMarker]: <PairInfographic />,
    [actionInfographicMarker]: <AssessmentActionsInfographic />,
    [alignmentCheckMarker]: <AlignmentCheckVisual />,
    [alignmentFlowMarker]: <AlignmentFlowVisual />,
    [modulePreviewMarker]: <ModulePreviewVisual />,
    [studentBaselineMarker]: <StudentBaselineVisual />,
    [threeAsMarker]: <ThreeAsInfographic />,
    [strategyMapMarker]: <StrategyMap />,
    [supportReplaceMarker]: <SupportReplaceSorter />,
    [threeAsMisconceptionMarker]: <ThreeAsMisconceptionCheck />,
    [genAiConditionsMarker]: <GenAiConditionsSorter />,
    [moduleReviewMarker]: <FourLensReview value={activityNotes.snapshotcheck ?? ""} onChange={(value) => setActivityValue("snapshotcheck", value)} />,
    [nextStepMarker]: <NextStepActivity value={activityNotes.nextstep ?? ""} onChange={(value) => setActivityValue("nextstep", value)} />,
    [pairApplyMarker]: <TapChecklist prompt="Tap each prompt once you have considered it for your activity." items={["what students should understand or do before using AI;", "what role AI should play;", "how students will evaluate and improve the output;", "what reflection or evidence will make their learning and judgement visible."]} value={activityNotes.pairapply ?? ""} onChange={(value) => setActivityValue("pairapply", value)} />,
    [quizRecapMarker]: <QuizReadinessRecap />,
  };
  const markerPattern = new RegExp(`(${Object.keys(markerRenderers).join("|")})`, "g");
  const contentSegments = sectionMarkdown.split(markerPattern).filter((segment) => segment !== "");
  const partNumber = current.title.match(/^Part (\d+)/)?.[1];
  const partClass = partNumber ? `part-tone-${partNumber}` : "";
  const PartIcon = partNumber ? partIcons[Number(partNumber)] : null;
  const [titleMain, ...titleRest] = current.shortTitle.split(" — ");
  const titleSubtitle = titleRest.join(" — ") || null;

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="global-progress" style={{ width: `${progress}%` }} />
        <div className="topbar-inner">
          <button
            type="button"
            className="brand brand-home"
            onClick={() => selectSection(0)}
            aria-label="Return to course home"
            aria-current={active === 0 ? "page" : undefined}
            title="Course home"
          >
            <img className="np-logo" src="/np-logo.png" alt="Ngee Ann Polytechnic" />
            <span className="brand-divider" aria-hidden="true" />
            <span className="course-identity">
              <span className="course-name">AI T&amp;L Essentials</span>
              <small className="course-programme">Mandatory programme for NP teaching staff</small>
            </span>
          </button>
          {!isHome && (
            <div className="top-actions">
              <span className="level-badge">Level 1 · AI-Aware</span>
            </div>
          )}
        </div>
      </header>

      <nav className="chapter-nav" aria-label="Course navigation">
        <div className="chapter-nav-inner">
          <div className="chapter-nav-left">
            {active > 0 && <button className="chapter-icon" onClick={() => setActive((index) => Math.max(0, index - 1))} aria-label="Previous section" title="Previous section"><ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" /></button>}
            <span className="chapter-position" aria-live="polite">{active + 1} <i aria-hidden="true">/</i> {sections.length}</span>
          </div>
          <div className="chapter-nav-actions">
            <button
              className="contents-button"
              onClick={() => setContentsOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={contentsOpen}
            >
              Contents
            </button>
            {active < sections.length - 1 && <button className="chapter-icon" onClick={goNext} aria-label="Next section" title="Next section"><ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" /></button>}
          </div>
        </div>
      </nav>

      <main className={`reader ${partClass}`}>
        {isHome ? (
          <h1 className="page-title home-title">
            <span>AI T&amp;L Essentials</span>
            <small>Level 1 <i aria-hidden="true">·</i> AI-Aware</small>
          </h1>
        ) : (
          <div className="section-head">
            {partNumber && <span className="part-eyebrow">Part {partNumber}</span>}
            <h1 className="page-title part-title">{titleMain}</h1>
            {titleSubtitle && <p className="page-subtitle">{titleSubtitle}</p>}
            {PartIcon && <PartIcon className="section-watermark" size={116} strokeWidth={1.4} aria-hidden="true" />}
          </div>
        )}
        {!isHome && <SectionVisual title={current.title} />}
        {isHome ? (
          <>
            <HomeFlow />
            <OpeningVisual />
          </>
        ) : (
          contentSegments.map((segment, index) =>
            markerRenderers[segment] ? (
              <div key={`${current.id}-marker-${index}`}>{markerRenderers[segment]}</div>
            ) : (
              <article
                key={`${current.id}-text-${index}`}
                className={index === 0 ? "course-content" : "course-content course-content-continuation"}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(segment) }}
              />
            )
          )
        )}

        {current.title.startsWith("Part 5") && <QuickSenseCheck />}

        {current.title.startsWith("Part 5") && (
          <div className="key-takeaway part-five-takeaway">
            <p className="key-takeaway-head"><CheckCircle2 size={18} aria-hidden="true" /><span>Key Takeaway</span></p>
            <p>Use AI tools and learning data where they add learning value or support authentic disciplinary practice. Select an appropriate approach, check the information and outputs, and retain professional judgement and responsibility.</p>
          </div>
        )}

        {sectionBridges[active] && active < sections.length - 1 && !hasInlineNextPrompt && (
          <div className="section-bridge">
            <span>Next</span>
            <p>{sectionBridges[active]}</p>
          </div>
        )}

        <div className="section-actions">
          <div className="pager">
            <button
              onClick={() => setActive((index) => Math.max(0, index - 1))}
              disabled={active === 0}
            >
              Previous
            </button>
            {active < sections.length - 1 && <button className="next-button" onClick={goNext}>Next section</button>}
          </div>
        </div>
      </main>

      {contentsOpen && (
        <div className="contents-overlay" role="presentation" onClick={() => setContentsOpen(false)}>
          <section className="contents-panel" role="dialog" aria-modal="true" aria-label="Course contents" onClick={(event) => event.stopPropagation()}>
            <div className="contents-heading">
              <div>
                <span className="eyebrow">{completed.length} of {sections.length} complete</span>
                <h2>Learning package</h2>
                <p>Jump to a section</p>
              </div>
              <button className="close-button" onClick={() => setContentsOpen(false)} aria-label="Close course contents">×</button>
            </div>
            <div className="contents-list">
              {sections.map((section, index) => {
                const concise = contentsMeta[index];
                const title = concise?.title ?? section.shortTitle;
                const label = concise?.label ?? "";
                return (
                <button key={section.id} className={index === active ? "active" : ""} onClick={() => selectSection(index)} aria-current={index === active ? "page" : undefined}>
                  <span className={`contents-number ${completed.includes(section.id) ? "done" : ""}`}>{completed.includes(section.id) ? <Check size={15} strokeWidth={2.8} aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</span>
                  <span><strong>{title}</strong>{label && <small>{label}</small>}</span>
                  <i aria-hidden="true"><ChevronRight size={15} strokeWidth={2.2} /></i>
                </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
