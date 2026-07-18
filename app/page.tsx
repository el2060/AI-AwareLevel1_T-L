"use client";

import { ReactElement, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BookOpen, Bot, CheckCircle2, ClipboardCheck, Eye, Lightbulb, LockKeyhole, MessageCircle, RefreshCw, Rocket, Scale, ShieldCheck, Target, UserRound, Users, Zap } from "lucide-react";

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
      const glyph = kind === "warning" ? "⚠" : "ℹ";
      output.push(
        `<div class="callout callout-${kind}"><p class="callout-head"><span aria-hidden="true">${glyph}</span>${inlineMarkdown(title)}</p>${markdownToHtml(body.join("\n"))}</div>`,
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

const sectionMeta = [
  { mark: "✦", label: "4 domains · 2 hours", tone: "blue" },
  { mark: "01", label: "5 strategies · PAIR · 3As", tone: "blue" },
  { mark: "02", label: "Anchor · Augment · Advance", tone: "orange" },
  { mark: "03", label: "The PAIR framework", tone: "teal" },
  { mark: "04", label: "GenAI conditions & policy", tone: "blue" },
  { mark: "05", label: "M365 Copilot & four checks", tone: "purple" },
  { mark: "06", label: "Four-lens module review", tone: "green" },
];

const contentsMeta = [
  { title: "Start here", label: "4 domains · 2 hours" },
  { title: "NP AI-enabled T&L approach", label: "5 strategies · PAIR · 3As" },
  { title: "Curriculum competencies", label: "Anchor · Augment · Advance" },
  { title: "Facilitation with PAIR", label: "PAIR framework" },
  { title: "Assessment design", label: "GenAI conditions" },
  { title: "Data and tools", label: "M365 Copilot · 4 checks" },
  { title: "Bring it together", label: "Four-lens module review" },
];

const sectionBridges = [
  "See how these four areas connect to NP’s direction for AI-enabled T&L.",
  "Begin with curriculum: what competencies should students develop and demonstrate as AI changes professional practice?",
  "Explore PAIR, a simple framework for helping students use AI purposefully, critically and responsibly in their learning.",
  "Consider how clear GenAI conditions and assessment design can keep learning authentic, credible and visible.",
  "Explore how AI tools and learning data can be used purposefully to support learning, while protecting information, verifying outputs and retaining human oversight.",
  "Bring the four areas together by reviewing one module you teach, lead or support.",
];

function DomainSpotter() {
  const domains = ["Curriculum", "Facilitation", "Assessment", "Data and Tools"];
  const scenarios = [
    { id: "curriculum", context: "Your diploma team is reviewing which coding capabilities students must demonstrate independently of AI and which should include effective use of AI-assisted development.", answer: "Curriculum", feedback: "This is Curriculum: AI is changing what students need to learn and how it’s taught." },
    { id: "facilitation", context: "A student asks an AI tutor to explain a concept a second way before attempting the practice questions.", answer: "Facilitation", feedback: "This is Facilitation: AI is supporting explanation and practice." },
    { id: "assessment", context: "A student’s submission reads as clearly GenAI-polished, and you need to decide what still counts as their own work.", answer: "Assessment", feedback: "This is Assessment: providing authentic, credible evidence of learning." },
    { id: "tools", context: "You want to use AI to summarise a term’s worth of student feedback comments to spot common themes.", answer: "Data and Tools", feedback: "This is Data and Tools: using AI and learning data safely and responsibly." },
  ];
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const current = scenarios[active];
  const picked = answers[current.id];
  const solved = Object.keys(answers).length;
  return (
    <section className="activity-block domain-spotter">
      <div className="activity-head-row">
        <div><span className="activity-eyebrow">Spot the domain</span><h2>Where does each moment belong?</h2></div>
        <span className="activity-count">{solved} / {scenarios.length} spotted</span>
      </div>
      <p>This package is organised around four familiar areas of your T&amp;L work. Read each moment, then tap the area it mainly touches.</p>
      <div className="domain-spotter-tabs" role="tablist" aria-label="Scenarios">
        {scenarios.map((s, index) => {
          const a = answers[s.id];
          const state = !a ? "" : a === s.answer ? "solved" : "attempted";
          return <button key={s.id} type="button" role="tab" aria-selected={active === index} className={`${active === index ? "active" : ""} ${state}`} onClick={() => setActive(index)}>{a ? (a === s.answer ? "✓" : "•") : index + 1}</button>;
        })}
      </div>
      <div className="domain-spotter-case"><p>{current.context}</p></div>
      <div className="domain-spotter-options">
        {domains.map((d) => <button key={d} type="button" className={picked === d ? (d === current.answer ? "selected correct" : "selected wrong") : ""} onClick={() => setAnswers((a) => ({ ...a, [current.id]: d }))}>{d}</button>)}
      </div>
      {picked && (
        <div className={`activity-feedback ${picked !== current.answer ? "try-again" : ""}`}>
          <strong>{picked === current.answer ? current.answer : `This one is ${current.answer}`}</strong>
          <p>{current.feedback}</p>
        </div>
      )}
    </section>
  );
}

function TapChecklist({ eyebrow, title, prompt, items, tips, value, onChange, completionTitle, completionText }: { eyebrow: string; title: string; prompt: string; items: string[]; tips?: string[]; value: string; onChange: (value: string) => void; completionTitle?: string; completionText?: string }) {
  const selected = value ? value.split("|") : [];
  return (
    <section className="activity-block tap-checklist">
      <div className="activity-head-row"><div><span className="activity-eyebrow">{eyebrow}</span><h2>{title}</h2></div><span className="activity-count">{selected.length} / {items.length}</span></div>
      <p>{prompt}</p>
      <div className="tap-check-grid">{items.map((item, index) => {
        const isSelected = selected.includes(item);
        return (
          <button key={item} className={isSelected ? "selected" : ""} onClick={() => onChange((isSelected ? selected.filter((x) => x !== item) : [...selected, item]).join("|"))}>
            <span>{isSelected ? "✓" : String(index + 1).padStart(2, "0")}</span>
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
    { label: "Identify one outcome, activity or assessment for further 3As review", feedback: "A single 3As review is a manageable way to begin identifying what may need attention." },
    { label: "Try one Generate → Compare → Check → Improve activity", feedback: "A structured activity gives students practice in evaluating and improving AI output rather than accepting the first response." },
    { label: "Check one assessment’s GenAI conditions", feedback: "Checking one assessment’s GenAI conditions is a focused way to put Level 1 awareness into practice." },
    { label: "Explore one small, appropriate use of M365 Copilot or another approved tool", feedback: "Start with a clear teaching and learning need, then check the output, data considerations and your oversight." },
  ];
  const selected = options.find((option) => option.label === value);
  return (
    <section className="activity-block next-step-block">
      <span className="activity-eyebrow">Before you leave</span><h2>Choose one small next step</h2>
      <div className="choice-grid">{options.map((option, index) => { const letter = String.fromCharCode(65 + index); const isSelected = value === option.label; return <button key={option.label} className={`choice-button ${isSelected ? "selected" : ""}`} onClick={() => onChange(option.label)}><span>{isSelected ? `✓ ${letter}` : letter}</span>{option.label}</button>; })}</div>
      {selected && <div className="activity-feedback"><strong>A Practical Place to Start</strong><p>{selected.feedback}</p></div>}
      <div className="final-next-step-closing">
        <blockquote><strong>Being AI-aware means knowing what to consider, which NP approaches apply and when to seek further guidance.</strong></blockquote>
        <p>Complete the separately administered quiz to fulfil the programme requirements.</p>
      </div>
    </section>
  );
}

function FourLensReview({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <TapChecklist eyebrow="Review one module" title="Four-Lens Review" prompt="Tap each question after considering it for your module." items={["Curriculum: What may need review in the learning outcomes, activities or assessment?", "Facilitation: Where could students compare, check or improve AI-generated output?", "Assessment: What must students demonstrate independently, and where might GenAI use be appropriate?", "Data and Tools: What T&L need could a tool support, and what would need checking before use?"]} tips={["Use the 3As to consider whether the capability is Anchor, Augment or Advance.", "Use PAIR to keep students evaluating, refining and reflecting.", "Check that the conditions and evidence of learning are clear.", "Consider learning value, output quality, data and ethics, and human oversight."]} value={value} onChange={onChange} />;
}

function StrategyMap() {
  const [active, setActive] = useState(0);
  const items = [
    { name: "Embed AI-Integrated Pedagogy · PAIR", question: "How can students learn and work with AI while developing judgement, transferable skills and responsible use?", icon: Lightbulb },
    { name: "Transform the Curriculum · 3As", question: "What competencies should students develop and demonstrate as AI changes professional practice?", icon: BookOpen },
    { name: "Redesign Assessment", question: "How can assessment provide authentic and credible evidence of learning in an AI-enabled context?", icon: ClipboardCheck },
    { name: "Enable Personalised Learning", question: "How can AI extend opportunities for practice, feedback and coaching?", icon: Bot },
    { name: "Strengthen Human Skills and Resilience", question: "How can we strengthen students’ purpose, resilience, collaboration and judgement in an AI-enabled world?", icon: Users },
  ];
  return (
    <section className="strategy-map" aria-label="How NP approaches connect across this package">
      <div className="strategy-heading">
        <h2>NP’s Five Strategies at a Glance</h2>
        <p>NP’s five strategies bring together curriculum, pedagogy, assessment, personalised learning and human capabilities to support one intended outcome:</p>
      </div>
      <div className="strategy-goal" aria-label="Outcome: AI-ready graduates who combine strong human qualities, deep domain expertise and effective use of AI in professional practice">
        <div className="graduate-core">
          <i><UserRound size={36} strokeWidth={2} aria-hidden="true" /></i>
          <div>
            <small>Outcome</small>
            <strong>AI-ready graduates</strong>
            <span>Strong human qualities · Deep domain expertise · Effective use of AI in professional practice</span>
            <p>Graduates who combine deep domain expertise with purpose, resilience, collaboration and sound judgement, and who use AI productively and responsibly without losing the human capabilities that distinguish professional practice.</p>
          </div>
        </div>
      </div>
      <div className="strategy-path">
        {items.map(({ name, question, icon: Icon }, index) => <button key={name} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-pressed={active === index}>
          <i><Icon size={22} strokeWidth={2} aria-hidden="true" /></i><span><strong>Strategy {index + 1} · {name}</strong><small>{question}</small></span>
        </button>)}
      </div>
    </section>
  );
}

function UseCaseExplorer() {
  const [active, setActive] = useState(0);
  const useCases = [
    {
      title: "Review module materials",
      tool: "M365 Copilot",
      icon: BookOpen,
      use: "Flag outdated references, duplicated content, misalignment or inconsistent instructions across module documents.",
      prompt: "Review these module documents. List outdated references, duplicated content, misalignment with learning outcomes and inconsistent student instructions. Name the source document. Do not rewrite.",
      check: "Verify each finding against the original material.",
      judgement: "Decide what, if anything, should change.",
    },
    {
      title: "Draft practice examples",
      tool: "M365 Copilot",
      icon: Lightbulb,
      use: "Generate a first set of worked examples, scenarios or practice questions in an authentic context.",
      prompt: "Draft three Year [1/2/3] practice examples for [concept] in [diploma]. Include a common misconception to spot. Use plain English for a first exposure.",
      check: "Check accuracy, learner level, tone and whether the context is realistic.",
      judgement: "What is technically and professionally correct, and what goes in front of students.",
    },
    {
      title: "Summarise feedback themes",
      tool: "M365 Copilot",
      icon: MessageCircle,
      use: "Group feedback that is appropriate for the tool into themes so you can review possible needs and decide what support may help.",
      prompt: "Summarise these feedback comments into themes. For each, give a short label and approximate number of related comments. List minority views separately. Do not infer causes or recommend actions.",
      check: "Read a sample of original comments. Look for omissions, minority views and identifying details.",
      judgement: "How to interpret the feedback, what intervention is appropriate and how you will review whether it helped.",
    },
    {
      title: "Test assignment clarity",
      tool: "M365 Copilot",
      icon: ClipboardCheck,
      use: "Surface instructions or GenAI conditions that a student may read in more than one way.",
      prompt: "Read this assignment brief as a Year 2 student. Identify unclear instructions, marking expectations and GenAI conditions. Then ask five questions a confused student may ask.",
      check: "Compare with questions students actually ask. The tool simulates a reader; it does not know your students.",
      judgement: "The assessment design and how you will explain the conditions in class.",
    },
    {
      title: "Spot patterns in quiz results",
      tool: "M365 Copilot in Excel",
      icon: Scale,
      use: "Identify low-success questions or topic patterns in a de-identified question-level results export so you can review possible teaching or support needs.",
      prompt: "This sheet contains de-identified question-level quiz results. Identify low-success questions, possible flawed questions and weak topic areas. Make no claims about individual students or causes.",
      check: "Verify the figures and consider context: a weak result may reflect a flawed question, timing or teaching sequence.",
      judgement: "What to revisit in teaching, what support to provide and how to check whether the support improved learning.",
    },
    {
      title: "Create alternative formats",
      tool: "M365 Copilot",
      icon: Users,
      use: "Create a simpler explanation, step-by-step version or short self-check activity from the same source material.",
      prompt: "Create a simpler explanation, a step-by-step worksheet version and five self-check questions for [concept]. Keep the technical meaning identical and flag anything you were unsure how to simplify.",
      check: "Check that the meaning and learning standard are preserved, and that examples are inclusive and accessible.",
      judgement: "How to support your learners without replacing appropriate human or institutional support.",
    },
  ];
  const selected = useCases[active];
  const Icon = selected.icon;
  return (
    <section className="use-case-explorer" aria-label="Explore common AI-supported teaching and learning tasks">
      <div className="use-case-heading"><span>Explore common T&amp;L uses</span><h2>Start with a task you already do</h2><p>Choose one use case. Notice the boundary between a useful first pass and the judgement that remains yours.</p></div>
      <div className="use-case-tabs">
        {useCases.map((item, index) => {
          const ItemIcon = item.icon;
          return <button key={item.title} type="button" className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-pressed={active === index}><ItemIcon size={18} aria-hidden="true" /><span>{item.title}</span></button>;
        })}
      </div>
      <div className="use-case-detail" aria-live="polite">
        <div className="use-case-title"><span><Icon size={22} aria-hidden="true" /></span><div><small>Suggested tool</small><strong>{selected.tool}</strong></div></div>
        {selected.tool.startsWith("M365 Copilot") && <p className="use-case-classification">Available within NP’s environment for approved use with information classified up to <strong>Official (Closed) – Restricted</strong>, subject to NP’s current data-handling requirements and approved use conditions.</p>}
        <h3>{selected.title}</h3><p>{selected.use}</p>
        <div className="prompt-starter"><strong>Prompt starter</strong><p>{selected.prompt}</p></div>
        <div className="use-case-checks"><div><b>Check</b><p>{selected.check}</p></div><div><b>Your judgement</b><p>{selected.judgement}</p></div></div>
      </div>
    </section>
  );
}

function QuickSenseCheck() {
  const [revealed, setRevealed] = useState<number[]>([]);
  const items = [
    { situation: "The tool suggests that several students are disengaged.", reveal: "Check the underlying data and context before deciding whether support is needed." },
    { situation: "An AI-generated summary of student feedback sounds plausible.", reveal: "Verify that the themes are supported by the original comments." },
    { situation: "You want to upload assessment results into an AI tool.", reveal: "Check whether the tool is approved for that information and purpose." },
    { situation: "An AI tool recommends a learning intervention.", reveal: "Use professional judgement to decide whether it is appropriate, then review whether it helped." },
  ];
  function toggle(index: number) {
    setRevealed((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]));
  }
  return (
    <section className="activity-block quick-sense-check">
      <div className="activity-head-row"><div><span className="activity-eyebrow">Quick sense check</span><h2>Before You Act</h2></div></div>
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
      <p className="sense-check-closing"><strong>AI can flag, summarise and suggest.</strong> The lecturer checks, interprets and decides.</p>
    </section>
  );
}

function SectionInteractive({ title, notes, onChange }: { title: string; notes: ActivityNotes; onChange: (key: string, value: string) => void }) {
  if (title === "AI T&L Essentials: Level 1 (AI-Aware)") return null;
  if (title.startsWith("Part 1")) return null;
  if (title.startsWith("Part 2")) return null;
  if (title.startsWith("Part 3")) return null;
  if (title.startsWith("Part 4")) return null;
  return null;
}

function OpeningVisual() {
  const areas = [
    {
      title: "Curriculum Design and Development",
      detail: "What competencies students need as AI changes professional practice.",
      icon: BookOpen,
    },
    {
      title: "Facilitation of Learning",
      detail: "How AI can support learning without replacing the intended thinking, judgement or performance.",
      icon: Lightbulb,
    },
    {
      title: "Assessment",
      detail: "How assessment keeps learning authentic, credible and visible in an AI-enabled context.",
      icon: ClipboardCheck,
    },
    {
      title: "Data and Tech-Enhanced T&L",
      detail: "How AI tools and learning data can improve learning safely and responsibly.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="opening-visual" aria-label="What this package covers">
      <div className="overview-heading">
        <span>At a Glance</span>
        <h2>Four Areas of AI-Aware T&amp;L</h2>
        <p>This package applies an AI lens to four T&amp;L Competency Framework domains.</p>
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

function StudentBaselineVisual() {
  const items = [
    { icon: BookOpen, title: "Learn About AI", detail: "Understand key AI terms, approaches, capabilities and limitations." },
    { icon: Bot, title: "Learn With AI", detail: "Use AI as a learning partner to break down problems, compare explanations, identify gaps and deepen understanding." },
    { icon: Rocket, title: "Learn to Use AI", detail: "Apply AI to create value, and evaluate outputs for accuracy, relevance, bias and suitability before using them." },
    { icon: Scale, title: "Learn Beyond AI", detail: "Consider the societal, ethical and legal implications of AI, and exercise human judgement and oversight." },
  ];
  return (
    <details className="policy-detail student-baseline-accordion">
      <summary>View the sector AI baseline competencies</summary>
      <div>
        <p>The POLITE sector AI baseline identifies foundational AI competencies that students should progressively develop across their learning.</p>
        <div className="lens-strip">
          {items.map(({ icon: Icon, title, detail }) => (
            <section key={title}>
              <i><Icon size={18} strokeWidth={2.1} aria-hidden="true" /></i>
              <b>{title}</b>
              <small>{detail}</small>
            </section>
          ))}
        </div>
        <p className="baseline-note">Individual modules may contribute to different areas. Not every module is expected to address all four.</p>
      </div>
    </details>
  );
}

function AlignmentFlowVisual() {
  const steps = [
    { key: "competency", label: "Competency", detail: "What students need to develop." },
    { key: "outcome", label: "Learning outcome", detail: "What students should be able to demonstrate." },
    { key: "activities", label: "Learning activities", detail: "How students practise and develop it." },
    { key: "evidence", label: "Assessment evidence", detail: "How achievement and student contribution are made visible." },
  ];
  return (
    <figure className="concept-visual alignment-story" aria-label="Flow from competency to assessment evidence">
      <p className="alignment-sentence">
        A <span className="alignment-chip alignment-competency">competency</span> is expressed through a{" "}
        <span className="alignment-chip alignment-outcome">learning outcome</span>, developed through{" "}
        <span className="alignment-chip alignment-activities">learning activities</span> and demonstrated through{" "}
        <span className="alignment-chip alignment-evidence">assessment evidence</span>.
      </p>
      <div className="alignment-captions">
        {steps.map((step) => (
          <div className={`alignment-caption alignment-${step.key}`} key={step.key}>
            <span aria-hidden="true" />
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
        <strong id="three-as-title">Guiding lenses for reviewing the competencies students need and aligning learning outcomes, activities and assessment</strong>
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
      <div className="infographic-note"><span aria-hidden="true">↔</span><p>A learning outcome or module may emphasise one or combine several, depending on the intended competency and professional context.</p></div>
    </figure>
  );
}

function PairInfographic() {
  const stages = [
    { letter: "P", name: "Problem", icon: Target, action: "Students define the task or challenge", detail: "Clarify the intended outcome, requirements, constraints and success criteria.", cue: "What must we understand before using AI?", tone: "problem" },
    { letter: "A", name: "AI", icon: Bot, action: "Students select a suitable AI tool", detail: "Consider what support is needed, what the tool can do and whether its use is permitted.", cue: "What could AI contribute?", tone: "ai" },
    { letter: "I", name: "Interaction", icon: RefreshCw, action: "Students experiment, evaluate and refine", detail: "Evaluate outputs for relevance and accuracy, and verify important claims against primary, official or trusted sources.", cue: "How will we test and improve the output?", tone: "interaction" },
    { letter: "R", name: "Reflection", icon: Eye, action: "Students examine the process and learning", detail: "Evaluate how AI supported or hindered the learning process, and identify where human judgement was necessary.", cue: "What did we learn about the task, the tool and our own judgement?", tone: "reflection" },
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
      <div className="infographic-note pair-loop"><span aria-hidden="true">↔</span><p>Students may revisit the problem, reconsider the tool and refine their interactions as their understanding develops.</p></div>
    </figure>
  );
}

function AssessmentActionsInfographic() {
  const steps = [
    { number: "1", title: "Start With the Learning Outcome", detail: "Identify the capability being measured, and check AI cannot complete it unassisted." },
    { number: "2", title: "State the GenAI Conditions Clearly", detail: "Declare whether AI use is allowed, restricted or prohibited for each component." },
    { number: "3", title: "Make Learning and Contribution Visible", detail: "Set specific conditions and design evidence of the student's own contribution." },
    { number: "4", title: "Prepare Students and Require Declaration", detail: "Explain conditions early and require a GenAI Use Declaration." },
  ];
  return (
    <figure className="concept-visual action-infographic" aria-labelledby="action-title">
      <figcaption>
        <span>Four lecturer actions</span>
        <strong id="action-title">A practical sequence for assessment design</strong>
      </figcaption>
      <div className="action-journey">
        {steps.map((step, index) => (
          <div className="action-step-wrap" key={step.number}>
            <section className="action-stage">
              <div className="action-stage-head"><i aria-hidden="true">{step.number}</i><b>{step.title}</b></div>
              <p>{step.detail}</p>
            </section>
            {index < steps.length - 1 && <span className="action-connector" aria-hidden="true">→</span>}
          </div>
        ))}
      </div>
    </figure>
  );
}

function ToolChecksVisual() {
  const items = [
    { icon: Target, title: "Learning value", detail: "Does it support the intended learning or learner need?" },
    { icon: CheckCircle2, title: "Output quality", detail: "Is the output accurate, relevant and suitable?" },
    { icon: LockKeyhole, title: "Data, privacy and ethics", detail: "Is the information appropriate to use in this tool and for this purpose?" },
    { icon: Eye, title: "Human oversight", detail: "Who reviews the output, decides what action to take and remains responsible?" },
  ];
  return (
    <figure className="concept-visual tool-visual" aria-label="Four checks for responsible AI tool use">
      <figcaption><span>Before you use a tool</span><strong>Apply four checks</strong></figcaption>
      <div className="icon-panel-grid">
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

function AlignmentCheckVisual() {
  const items = [
    { icon: Target, title: "Learning outcome", detail: "Is the intended competency stated clearly?" },
    { icon: BookOpen, title: "Learning activities", detail: "Do students have suitable opportunities to practise and develop it?" },
    { icon: ClipboardCheck, title: "Assessment", detail: "Does the assessment provide credible evidence of the intended competency and the student's own contribution?" },
  ];
  return (
    <figure className="concept-visual" aria-label="Check constructive alignment across learning outcome, activities and assessment">
      <div className="icon-panel-grid trio">
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
    { icon: Lightbulb, title: "Facilitation", detail: "Where should students check and improve?" },
    { icon: ClipboardCheck, title: "Assessment", detail: "What evidence keeps learning visible?" },
    { icon: ShieldCheck, title: "Data and Tools", detail: "What needs checking before use?" },
  ];
  return (
    <figure className="concept-visual bring-together-visual" aria-label="Four lenses for reviewing one module">
      <figcaption><span>Bring it together</span><strong>Review one module through four lenses</strong></figcaption>
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

function ModulePreviewVisual() {
  const areas = [
    { icon: BookOpen, title: "Curriculum Design and Development", detail: "The competencies students need as professional practice changes." },
    { icon: Lightbulb, title: "Facilitation of Learning", detail: "How AI may support learning and practice without replacing the intended learning." },
    { icon: ClipboardCheck, title: "Assessment", detail: "How assessment keeps learning and student contribution authentic, credible and visible." },
    { icon: ShieldCheck, title: "Data and Tech-Enhanced T&L", detail: "How AI tools and learning data can improve learning safely and responsibly." },
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
  if (title.startsWith("Part 1")) return <StrategyMap />;
  if (title.startsWith("Part 2")) return null;
  if (title.startsWith("Part 3")) return null;
  if (title.startsWith("Part 4")) return null;
  if (title.startsWith("Part 5")) return null;
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
    const nextSection = sections[nextIndex];
    const completedIds = nextSection ? [current.id, nextSection.id] : [current.id];
    setCompleted((items) => Array.from(new Set([...items, ...completedIds])));
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
  const pairInfographicMarker = "<!--pair-infographic-->";
  const moduleReviewMarker = "<!--module-review-->";
  const actionInfographicMarker = "<!--assessment-actions-infographic-->";
  const modulePreviewMarker = "<!--module-preview-->";
  const toolChecksMarker = "<!--tool-checks-visual-->";
  const studentBaselineMarker = "<!--student-baseline-visual-->";
  const threeAsMarker = "<!--three-as-visual-->";
  const alignmentCheckMarker = "<!--alignment-check-visual-->";
  const alignmentFlowMarker = "<!--alignment-flow-visual-->";
  const sectionMarkdown = withoutTitle(current.markdown);
  const hasModuleReview = sectionMarkdown.includes(moduleReviewMarker);
  const hasInlineNextPrompt = /^\s*(\*\*Next\*\*|#{1,4}\s+Next)\s*$/m.test(sectionMarkdown);
  const markerRenderers: Record<string, ReactElement> = {
    [useCaseMarker]: <UseCaseExplorer />,
    [pairInfographicMarker]: <PairInfographic />,
    [actionInfographicMarker]: <AssessmentActionsInfographic />,
    [alignmentCheckMarker]: <AlignmentCheckVisual />,
    [alignmentFlowMarker]: <AlignmentFlowVisual />,
    [modulePreviewMarker]: <ModulePreviewVisual />,
    [toolChecksMarker]: <ToolChecksVisual />,
    [studentBaselineMarker]: <StudentBaselineVisual />,
    [threeAsMarker]: <ThreeAsInfographic />,
    [moduleReviewMarker]: <FourLensReview value={activityNotes.snapshotcheck ?? ""} onChange={(value) => setActivityValue("snapshotcheck", value)} />,
  };
  const markerPattern = new RegExp(`(${Object.keys(markerRenderers).join("|")})`, "g");
  const contentSegments = sectionMarkdown.split(markerPattern).filter((segment) => segment !== "");

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
              <small className="course-programme">Mandatory 2-hour programme for teaching staff as part of NP’s Level 1 AI-Aware baseline</small>
            </span>
          </button>
          <div className="top-actions">
            <span className="level-badge">Level 1 · AI-Aware</span>
          </div>
        </div>
      </header>

      <nav className="chapter-nav" aria-label="Course navigation">
        <div className="chapter-nav-inner">
          <div className="chapter-nav-left">
            {active > 0 && <button className="chapter-icon" onClick={() => setActive((index) => Math.max(0, index - 1))} aria-label="Previous section" title="Previous section"><span aria-hidden="true">←</span></button>}
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
            {active < sections.length - 1 && <button className="chapter-icon" onClick={goNext} aria-label="Next section" title="Next section"><span aria-hidden="true">→</span></button>}
          </div>
        </div>
      </nav>

      <main className="reader">
        {active === 0 ? (
          <h1 className="page-title home-title">
            <span>AI T&amp;L Essentials</span>
            <small>Level 1 <i aria-hidden="true">·</i> AI-Aware</small>
          </h1>
        ) : <h1 className="page-title">{current.shortTitle}</h1>}
        {active === 0 ? <OpeningVisual /> : <SectionVisual title={current.title} />}
        {contentSegments.map((segment, index) =>
          markerRenderers[segment] ? (
            <div key={`${current.id}-marker-${index}`}>{markerRenderers[segment]}</div>
          ) : (
            <article
              key={`${current.id}-text-${index}`}
              className={index === 0 ? "course-content" : "course-content course-content-continuation"}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(segment) }}
            />
          )
        )}

        {hasModuleReview && <NextStepActivity value={activityNotes.nextstep ?? ""} onChange={(value) => setActivityValue("nextstep", value)} />}

        {!current.title.startsWith("Part 1") && !hasModuleReview && <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />}
        {current.title.startsWith("Part 5") && <QuickSenseCheck />}

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
                <h2>Course outline</h2>
                <p>Jump to a section</p>
              </div>
              <button className="close-button" onClick={() => setContentsOpen(false)} aria-label="Close course contents">×</button>
            </div>
            <div className="contents-list">
              {sections.map((section, index) => {
                const concise = contentsMeta[index];
                const title = concise?.title ?? section.shortTitle;
                const label = concise?.label ?? sectionMeta[index]?.label ?? "Learn";
                return (
                <button key={section.id} className={index === active ? "active" : ""} onClick={() => selectSection(index)} aria-current={index === active ? "page" : undefined}>
                  <span className={`contents-number ${completed.includes(section.id) ? "done" : ""}`}>{completed.includes(section.id) ? "✓" : String(index + 1).padStart(2, "0")}</span>
                  <span><strong>{title}</strong><small>{label}</small></span>
                  <i aria-hidden="true">→</i>
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
