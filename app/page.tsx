"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BookOpen, Bot, CheckCircle2, ClipboardCheck, Database, Eye, Lightbulb, LockKeyhole, MessageCircle, Scale, ShieldCheck, Sparkles, Target, Users } from "lucide-react";

type Section = {
  id: string;
  title: string;
  shortTitle: string;
  markdown: string;
};

type Choice = {
  label: string;
  correct?: boolean;
  feedback: string;
  feedbackTitle?: string;
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
  if (title === "AI in T&L Essentials: Level 1 (AI-Aware)") return "Start here";
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
  { mark: "✦", label: "Start", tone: "blue" },
  { mark: "01", label: "NP direction", tone: "blue" },
  { mark: "02", label: "Curriculum", tone: "orange" },
  { mark: "03", label: "Facilitation", tone: "teal" },
  { mark: "04", label: "Assessment", tone: "blue" },
  { mark: "05", label: "Data and Tools", tone: "purple" },
  { mark: "06", label: "Bring together", tone: "green" },
];

const sectionBridges = [
  "See how these four areas connect to NP’s direction for AI-enabled T&L.",
  "Begin with curriculum: what must students learn and demonstrate as AI changes professional practice?",
  "Then consider how AI can support learning and practice—and use PAIR to give that learning a clear structure.",
  "Next, consider how assessment keeps learning authentic, credible and visible.",
  "Then choose suitable tools and data uses, checking information, output and human oversight.",
  "Bring the four areas together for a module you teach, lead or support.",
];

function ChoiceCheck({ question, eyebrow, choices }: { question: string; eyebrow: string; choices: Choice[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const choice = selected === null ? null : choices[selected];
  return (
    <section className="activity-block">
      <span className="activity-eyebrow">{eyebrow}</span>
      <h2>{question}</h2>
      <div className="choice-grid">
        {choices.map((item, index) => (
          <button
            key={item.label}
            className={`choice-button ${selected === index ? "selected" : ""}`}
            onClick={() => setSelected(index)}
          >
            <span>{String.fromCharCode(65 + index)}</span>
            {item.label}
          </button>
        ))}
      </div>
      {choice && (
        <div className={`activity-feedback ${choice.correct === false ? "try-again" : ""}`}>
          <strong>{choice.feedbackTitle ?? (choice.correct === false ? "Consider this" : "Good call")}</strong>
          <p>{choice.feedback}</p>
        </div>
      )}
    </section>
  );
}

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

function ThreeAsActivity() {
  const cases = [
    {
      id: "business",
      domain: "Business and Creative Practice",
      label: "Example 1",
      capability: "Students use AI to compare options, then evaluate the evidence and justify a recommendation for a client.",
      answer: "Augment",
      feedback: "Students use AI to strengthen the work, while retaining responsibility for evaluating the evidence and making the final recommendation.",
    },
    {
      id: "engineering",
      domain: "Engineering and Technology",
      label: "Example 2",
      capability: "Students use AI-assisted development to create and test a new workflow that extends what the role previously involved.",
      answer: "Advance",
      feedback: "AI enables a new workflow that goes beyond the role’s previous scope.",
    },
  ];
  const lenses = [
    { name: "Anchor", description: "A capability students must demonstrate without AI." },
    { name: "Augment", description: "Using AI to improve the quality or productivity of work." },
    { name: "Advance", description: "Using AI to extend work beyond established job boundaries." },
  ];
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const current = cases[active];
  const selected = answers[current.id];
  return (
    <section className="activity-block three-as-activity competency-studio">
      <div className="activity-head-row">
        <div>
          <span className="activity-eyebrow">Quick check</span>
          <h2>Which 3A best fits?</h2>
        </div>
        <span className="activity-count">{cases.length} examples</span>
      </div>
      <p>Choose the 3A that best describes each capability.</p>
      <div className="competency-case-tabs" role="tablist" aria-label="Professional contexts">
        {cases.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label} · {item.domain}</strong></button>)}
      </div>
      <div className="competency-case" role="tabpanel">
        <span>{current.domain}</span>
        <h3>Capability being assessed</h3>
        <p>{current.capability}</p>
      </div>
      <p className="competency-question">Which 3A best describes this capability?</p>
      <div className="competency-lenses">
        {lenses.map((lens) => <button key={lens.name} type="button" className={selected === lens.name ? "selected" : ""} onClick={() => setAnswers((items) => ({ ...items, [current.id]: lens.name }))}><strong>{lens.name}</strong><small>{lens.description}</small></button>)}
      </div>
      {selected && (
        <div className={`activity-feedback ${selected !== current.answer ? "try-again" : ""}`}>
          <strong>{selected === current.answer ? `Correct answer: ${current.answer}` : `Correct answer: ${current.answer}`}</strong>
          <p>{selected === current.answer ? current.feedback : `This capability is best framed as ${current.answer}. ${current.feedback}`}</p>
        </div>
      )}
    </section>
  );
}

function StrategyMap() {
  const [active, setActive] = useState(0);
  const items = [
    { name: "Embed AI-Integrated Pedagogy · PAIR", question: "Structure learning and problem-solving with AI while developing transferable skills, critical judgement and responsible use.", icon: MessageCircle },
    { name: "Transform the Curriculum · 3As", question: "Review AI-relevant outcomes, learning experiences and assessments.", icon: Sparkles },
    { name: "Redesign Assessment", question: "Assure authentic learning for AI-enabled professional practice.", icon: ClipboardCheck },
    { name: "Enable Personalised Learning", question: "Provide personalised practice, feedback and coaching.", icon: Bot },
    { name: "Strengthen Human Skills and Resilience", question: "Build human skills, resilience and judgement.", icon: Users },
  ];
  return (
    <section className="strategy-map" aria-label="How NP approaches connect across this package">
      <div className="strategy-heading"><h2>NP’s Five Strategies at a Glance</h2><p>Explore how each strategy connects to AI-enabled T&amp;L.</p></div>
      <div className="strategy-goal"><strong>AI-ready graduates</strong><span>Strong human qualities · deep domain expertise · effective use of AI</span></div>
      <div className="strategy-path">
        {items.map(({ name, question, icon: Icon }, index) => <button key={name} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-pressed={active === index}>
          <i><Icon size={18} strokeWidth={2.2} aria-hidden="true" /></i><span><strong>Strategy {index + 1} · {name}</strong><small>{question}</small></span>
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
        <h3>{selected.title}</h3><p>{selected.use}</p>
        <div className="prompt-starter"><strong>Prompt starter</strong><p>{selected.prompt}</p></div>
        <div className="use-case-checks"><div><b>Check</b><p>{selected.check}</p></div><div><b>Your judgement</b><p>{selected.judgement}</p></div></div>
      </div>
      <p className="use-case-reminder"><strong>The pattern:</strong> give relevant context, set a bounded task, state the constraints, then check the output. The tool drafts, flags or summarises. You interpret, decide and review impact.</p>
    </section>
  );
}

function ToolChecksActivity() {
  return <ChoiceCheck eyebrow="Four checks in practice" question="An approved AI tool summarises assessment results and flags three students for possible early intervention. The data use is approved and the figures are accurate. What should you do before acting?" choices={[
    { label: "Review the students’ learning context and other available evidence, decide whether support is needed, and later review whether it helped.", correct: true, feedback: "The tool can highlight a possible need, but the lecturer must interpret the evidence, decide on the intervention and review its impact." },
    { label: "Act on the flags because the tool and data use are approved.", correct: false, feedback: "Approval does not make the AI output a decision. A person must review the context and decide what action, if any, is appropriate." },
    { label: "Ask the tool to rank the students and intervene with the highest-ranked student first.", correct: false, feedback: "AI should not rank students for support decisions. Human oversight remains essential even when the figures are accurate." },
  ]} />;
}

function SectionInteractive({ title, notes, onChange }: { title: string; notes: ActivityNotes; onChange: (key: string, value: string) => void }) {
  if (title === "AI in T&L Essentials: Level 1 (AI-Aware)") return null;
  if (title.startsWith("Part 1")) return null;
  if (title.startsWith("Part 2")) return <ThreeAsActivity />;
  if (title.startsWith("Part 3")) return null;
  if (title.startsWith("Part 4")) return null;
  return null;
}

function OpeningVisual() {
  const areas = [
    {
      title: "Curriculum",
      detail: "How AI may change what students need to learn",
      icon: BookOpen,
    },
    {
      title: "Facilitation",
      detail: "How AI can support learning, practice and feedback",
      icon: Lightbulb,
    },
    {
      title: "Assessment",
      detail: "How assessment remains valid, authentic and credible",
      icon: ClipboardCheck,
    },
    {
      title: "Data and Tools",
      detail: "How AI tools and learning data may support learning safely and responsibly",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="opening-visual" aria-label="What this package covers">
      <div className="overview-heading">
        <span>At a glance</span>
        <h2>Four areas of AI-aware T&amp;L</h2>
        <p>This package applies an AI lens to four familiar areas of teaching practice.</p>
      </div>
      <div className="overview-areas">
        {areas.map((area, index) => {
          const Icon = area.icon;
          return <div className={`overview-area overview-area-static area-${index + 1}`} key={area.title}>
            <span><Icon size={20} strokeWidth={2.2} aria-hidden="true" /></span>
            <div><strong>{area.title}</strong><small>{area.detail}</small></div>
          </div>;
        })}
      </div>
    </section>
  );
}

function ThreeAsInfographic() {
  const lenses = [
    {
      key: "anchor",
      name: "Anchor",
      tagline: "What students must demonstrate independently of AI",
      body: "Disciplinary foundations, human qualities and professional judgement.",
    },
    {
      key: "augment",
      name: "Augment",
      tagline: "How students should use AI productively",
      body: "Use AI to improve the quality and efficiency of work while retaining disciplinary judgement.",
    },
    {
      key: "advance",
      name: "Advance",
      tagline: "What new possibilities AI may enable",
      body: "Use AI to create new services, workflows or forms of professional practice.",
    },
  ];
  return (
    <figure className="concept-visual three-as-infographic" aria-labelledby="three-as-title">
      <figcaption>
        <span>The 3As</span>
        <strong id="three-as-title">Three lenses for reviewing curriculum and assessment</strong>
      </figcaption>
      <div className="three-as-path">
        {lenses.map((lens) => (
          <section key={lens.key} className={`three-as-band ${lens.key}-band`}>
            <div className="three-as-label"><i aria-hidden="true">A</i><div><b>{lens.name}</b><small>{lens.tagline}</small></div></div>
            <p>{lens.body}</p>
          </section>
        ))}
      </div>
      <div className="infographic-note"><span aria-hidden="true">↔</span><p><strong>The 3As are lenses, not a sequence.</strong> Not every learning outcome or module will require all three.</p></div>
    </figure>
  );
}

function PairInfographic() {
  const stages = [
    { letter: "P", name: "Problem", action: "Define the task or challenge", detail: "Clarify the intended outcome, requirements, constraints and success criteria.", cue: "What must we understand before using AI?", tone: "problem" },
    { letter: "A", name: "AI", action: "Select a suitable AI tool", detail: "Consider what support is needed, what the tool can do and whether its use is permitted.", cue: "What could AI contribute?", tone: "ai" },
    { letter: "I", name: "Interaction", action: "Experiment, evaluate and refine", detail: "Question outputs, check relevance and accuracy, and compare with trusted sources.", cue: "How will we test and improve the output?", tone: "interaction" },
    { letter: "R", name: "Reflection", action: "Examine the process and learning", detail: "Consider what AI helped or hindered and where human judgement mattered.", cue: "What did we learn about the task, tool and our judgement?", tone: "reflection" },
  ];
  return (
    <figure className="concept-visual pair-infographic" aria-labelledby="pair-title">
      <figcaption>
        <span>PAIR</span>
        <strong id="pair-title">A structured process for learning and problem-solving with AI</strong>
      </figcaption>
      <div className="pair-journey">
        {stages.map((stage, index) => (
          <div className="pair-step-wrap" key={stage.name}>
            <section className={`pair-stage pair-${stage.tone}`}>
              <div className="pair-stage-head"><i aria-hidden="true">{stage.letter}</i><b>{stage.name}</b></div>
              <strong>{stage.action}</strong>
              <p>{stage.detail}</p>
              <small>{stage.cue}</small>
            </section>
            {index < stages.length - 1 && <span className="pair-connector" aria-hidden="true">→</span>}
          </div>
        ))}
      </div>
      <div className="infographic-note pair-loop"><span aria-hidden="true">↔</span><p><strong>PAIR is not a one-pass sequence.</strong> Students may revisit the problem, reconsider the tool and refine their interactions as their understanding develops.</p></div>
    </figure>
  );
}

function LecturerPracticeMap() {
  const [active, setActive] = useState(0);
  const areas = [
    {
      title: "Curriculum",
      domain: "Curriculum Design & Development",
      work: "Learning outcomes, activities and assessment",
      question: "What is AI changing in what students need to learn and how they are taught?",
      detail: "Consider how learning outcomes, activities and assessment may need to remain aligned as AI changes disciplinary and professional practice.",
      icon: BookOpen,
      tone: "design",
    },
    {
      title: "Facilitation",
      domain: "Facilitation of Learning",
      work: "Explanations, practice and student AI use",
      question: "Where might AI support learning without replacing it?",
      detail: "Use AI where it gives students a useful explanation, practice or feedback without doing the learning for them.",
      icon: Lightbulb,
      tone: "facilitate",
    },
    {
      title: "Assessment",
      domain: "Assessment",
      work: "Assessment design, validity and GenAI conditions",
      question: "How will assessment provide authentic evidence of students’ learning?",
      detail: "Decide what evidence is needed from students independently and, where relevant, with AI. Then make the GenAI conditions clear and aligned to that evidence.",
      icon: ClipboardCheck,
      tone: "assess",
    },
    {
      title: "Data and Tools",
      domain: "Data & Tech-Enhanced T&L",
      work: "AI-supported learning, feedback and learning data",
      question: "Where could AI tools or learning data improve engagement or support a learning outcome—and what needs checking before use?",
      detail: "Consider how an AI tool or learning information could support engagement, an activity or a teaching decision. Then check the information involved, the output and the judgement needed before acting.",
      icon: Database,
      tone: "review",
    },
  ];
  const selected = areas[active];
  const SelectedIcon = selected.icon;
  return (
    <figure className="concept-visual lecturer-practice-visual" aria-labelledby="lecturer-practice-title">
      <figcaption><span>In your module</span><strong id="lecturer-practice-title">Four AI-aware questions for your teaching work</strong></figcaption>
      <p className="practice-map-intro">Select an area to explore one key AI-aware question for your teaching practice.</p>
      <div className="lecturer-practice-map">
        <div className="practice-map-label"><span>AI-aware</span><strong>teaching practice</strong></div>
        <div className="practice-map-options">
          {areas.map((area, index) => {
            const Icon = area.icon;
            return <button key={area.title} type="button" className={`practice-map-option ${area.tone} ${active === index ? "active" : ""}`} onClick={() => setActive(index)} aria-pressed={active === index}>
              <i><Icon size={18} strokeWidth={2.2} aria-hidden="true" /></i>
              <span><strong>{area.title}</strong><small>{area.work}</small></span>
            </button>;
          })}
        </div>
        <div className={`practice-map-detail ${selected.tone}`}>
          <i><SelectedIcon size={21} strokeWidth={2.2} aria-hidden="true" /></i>
          <div><span>{selected.domain}</span><strong>{selected.question}</strong><p>{selected.detail}</p></div>
        </div>
        <p className="practice-map-footnote"><b>Across all four:</b> use professional judgement when AI is involved and keep the learning purpose in view.</p>
      </div>
    </figure>
  );
}

function AssessmentFocusVisual() {
  const items = [
    {
      icon: ClipboardCheck,
      title: "Apply NP’s GenAI requirements",
      detail: "GenAI is allowed by default in summative assessment unless restricted or prohibited. Students must cite and declare their use.",
    },
    {
      icon: Scale,
      title: "Protect the intended learning",
      detail: "Use the 3As to clarify what students demonstrate independently, how they should use AI, and where new AI-enabled practice may be assessed.",
    },
  ];
  return (
    <figure className="concept-visual assessment-visual" aria-label="What every AI-enabled assessment needs">
      <figcaption><span>Assessment focus</span><strong>Two assessment priorities</strong></figcaption>
      <div className="icon-panel-grid compact">
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

function ToolChecksVisual() {
  const items = [
    { icon: Target, title: "Learning value", detail: "Does it support the intended learning?" },
    { icon: CheckCircle2, title: "Output quality", detail: "Is the output accurate and suitable?" },
    { icon: LockKeyhole, title: "Data, privacy and ethics", detail: "Is the information safe and appropriate to use?" },
    { icon: Eye, title: "Human oversight", detail: "Who reviews, decides and remains responsible?" },
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

function BringTogetherVisual() {
  const lenses = [
    { icon: BookOpen, title: "Curriculum", detail: "What may need review?" },
    { icon: MessageCircle, title: "Facilitation", detail: "Where should students check and improve?" },
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

function SectionVisual({ title }: { title: string }) {
  if (title.startsWith("Part 1")) return <StrategyMap />;
  if (title.startsWith("Part 2")) return <ThreeAsInfographic />;
  if (title.startsWith("Part 3")) return null;
  if (title.startsWith("Part 4")) return <AssessmentFocusVisual />;
  if (title.startsWith("Part 5")) return <ToolChecksVisual />;
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
  const sectionMarkdown = withoutTitle(current.markdown);
  const hasUseCaseExplorer = current.title.startsWith("Part 5") && sectionMarkdown.includes(useCaseMarker);
  const hasPairInfographic = current.title.startsWith("Part 3") && sectionMarkdown.includes(pairInfographicMarker);
  const hasModuleReview = current.title.startsWith("Part 6") && sectionMarkdown.includes(moduleReviewMarker);
  const activeMarker = hasUseCaseExplorer ? useCaseMarker : hasPairInfographic ? pairInfographicMarker : hasModuleReview ? moduleReviewMarker : "";
  const [contentBeforeInteractive, contentAfterInteractive = ""] = activeMarker
    ? sectionMarkdown.split(activeMarker)
    : [sectionMarkdown];

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
            <span className="course-name">AI in T&amp;L Essentials</span>
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
            <span>AI in T&amp;L Essentials</span>
            <small>Level 1 <i aria-hidden="true">·</i> AI-Aware</small>
          </h1>
        ) : <h1 className="page-title">{current.shortTitle}</h1>}
        {active === 0 ? <OpeningVisual /> : <SectionVisual title={current.title} />}
        <article
          key={`${current.id}-before`}
          className="course-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(contentBeforeInteractive) }}
        />

        {hasUseCaseExplorer && <UseCaseExplorer />}
        {hasPairInfographic && <PairInfographic />}
        {hasModuleReview && <FourLensReview value={activityNotes.snapshotcheck ?? ""} onChange={(value) => setActivityValue("snapshotcheck", value)} />}
        {contentAfterInteractive && <article
          key={`${current.id}-after`}
          className="course-content course-content-continuation"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(contentAfterInteractive) }}
        />}

        {hasModuleReview && <NextStepActivity value={activityNotes.nextstep ?? ""} onChange={(value) => setActivityValue("nextstep", value)} />}

        {!current.title.startsWith("Part 1") && !hasModuleReview && <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />}
        {current.title.startsWith("Part 5") && <ToolChecksActivity />}

        {sectionBridges[active] && active < sections.length - 1 && (
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
              <div><span className="eyebrow">{completed.length} of {sections.length} complete</span><h2>Course contents</h2></div>
              <button className="close-button" onClick={() => setContentsOpen(false)} aria-label="Close course contents">×</button>
            </div>
            <div className="contents-list">
              {sections.map((section, index) => (
                <button key={section.id} className={index === active ? "active" : ""} onClick={() => selectSection(index)} aria-current={index === active ? "page" : undefined}>
                  <span className={`contents-number ${completed.includes(section.id) ? "done" : ""}`}>{completed.includes(section.id) ? "✓" : String(index + 1).padStart(2, "0")}</span>
                  <span><strong>{section.shortTitle}</strong><small>{sectionMeta[index]?.label ?? "Learn"}</small></span>
                  <i aria-hidden="true">→</i>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
