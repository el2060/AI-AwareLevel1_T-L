"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BookOpen, Bot, ClipboardCheck, Database, Lightbulb, MessageCircle, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";

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
  { mark: "01", label: "AI in your T&L work", tone: "blue" },
  { mark: "02", label: "Curriculum", tone: "orange" },
  { mark: "03", label: "Facilitation", tone: "teal" },
  { mark: "04", label: "Assessment", tone: "blue" },
  { mark: "05", label: "Data and Tools", tone: "purple" },
  { mark: "06", label: "Apply", tone: "orange" },
  { mark: "07", label: "Key takeaways", tone: "green" },
];

const sectionBridges = [
  "Next, see where AI already touches your own T&L work.",
  "Begin with curriculum: what must students learn, and how should learning outcomes, activities and assessment align?",
  "Then consider how AI can support learning and practice—and use PAIR to give that learning a clear structure.",
  "Next, consider how assessment keeps learning authentic, credible and visible.",
  "Then choose suitable tools and data uses, checking information, output and human oversight.",
  "Bring the four areas together for a module you teach, lead or support.",
  "Finish with the key ideas and one appropriate next step.",
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
          <strong>{choice.correct === false ? "Consider this" : "Good call"}</strong>
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

function TapChecklist({ eyebrow, title, prompt, items, tips, value, onChange, completionTitle, completionText }: { eyebrow: string; title: string; prompt: string; items: string[]; tips?: string[]; value: string; onChange: (value: string) => void; completionTitle: string; completionText: string }) {
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
      {selected.length === items.length && <div className="activity-feedback"><strong>{completionTitle}</strong><p>{completionText}</p></div>}
    </section>
  );
}

function ModuleSummary() {
  const [active, setActive] = useState(0);
  const themes = [
    {
      label: "The aim",
      title: "AI-ready graduates",
      preview: "Human qualities, domain expertise and responsible AI capability.",
      takeaway: "At NP, AI readiness is not only about using a tool. Students need the human and professional judgement to use it well.",
      practice: "Keep asking what students need to understand, do and judge in your discipline.",
      icon: Users,
      tone: "blue",
    },
    {
      label: "Learning design",
      title: "3As and PAIR",
      preview: "Use the 3As to review curriculum and assessment; use PAIR to structure learning with AI.",
      takeaway: "Use the 3As to identify what students must demonstrate independently, how they should use AI productively, and where AI may enable new professional practice. Then align outcomes, activities and assessment. Use PAIR to structure the learning process with AI.",
      practice: "Check that your learning outcome, learning activity and assessment are aligned. Use AI to support practice and learning—not to take over the thinking.",
      icon: Sparkles,
      tone: "purple",
    },
    {
      label: "Assessment",
      title: "Assure authentic evidence",
      preview: "Start with the learning outcome and evidence of what students can do independently and with AI.",
      takeaway: "GenAI is allowed in summative assessment unless explicitly restricted or prohibited. Assessment should still confirm Anchor competencies independently of AI and, where relevant, evaluate the process behind students’ Augment use of AI—not just the final output.",
      practice: "State the conditions clearly in the assignment descriptor and discuss them with students.",
      icon: ClipboardCheck,
      tone: "orange",
    },
    {
      label: "Data and Tools",
      title: "Support engagement and outcomes",
      preview: "Use suitable AI tools and learning data to support learning safely and responsibly, then check the information, output and oversight.",
      takeaway: "Start with the T&L need. Use every tool only for the information and purpose covered by NP’s current guidance, then check the output before acting.",
      practice: "Use AI output or learning data as a starting point. You remain responsible for the teaching and learning decision that follows.",
      icon: ShieldCheck,
      tone: "teal",
    },
  ];
  const selected = themes[active];
  const Icon = selected.icon;

  return (
    <section className="module-summary" aria-label="Key ideas from this package">
      <div className="summary-heading">
        <span>Key ideas</span>
        <h2>Four ideas to carry into your teaching</h2>
        <p>Choose a theme to revisit its essential point and how it applies to your teaching.</p>
      </div>
      <div className="summary-layout">
        <div className="summary-topics" role="tablist" aria-label="Key ideas">
          {themes.map((theme, index) => {
            const ThemeIcon = theme.icon;
            return (
              <button
                key={theme.title}
                type="button"
                role="tab"
                aria-selected={active === index}
                className={`summary-topic ${active === index ? "active" : ""} tone-${theme.tone}`}
                onClick={() => setActive(index)}
              >
                <span className="summary-topic-icon"><ThemeIcon size={18} strokeWidth={2} /></span>
                <span><small>{theme.label}</small><strong>{theme.title}</strong><em>{theme.preview}</em></span>
              </button>
            );
          })}
        </div>
        <div className={`summary-detail tone-${selected.tone}`} role="tabpanel">
          <span className="summary-detail-icon"><Icon size={23} strokeWidth={2} /></span>
          <div className="summary-detail-copy">
            <span>{selected.label}</span>
            <h3>{selected.title}</h3>
            <p>{selected.takeaway}</p>
            <div><strong>In your teaching</strong><p>{selected.practice}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NextStepActivity({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = ["Discuss one change with my module team", "Identify one outcome, activity or assessment for further 3As review", "Check one assessment’s GenAI conditions", "Try one small AI-supported learning activity"];
  return (
    <section className="activity-block next-step-block">
      <span className="activity-eyebrow">Before you leave</span><h2>Choose one small next step</h2>
      <div className="choice-grid">{options.map((option, index) => <button key={option} className={`choice-button ${value === option ? "selected" : ""}`} onClick={() => onChange(option)}><span>{value === option ? "✓" : String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
      {value && <div className="activity-feedback"><strong>A practical place to start</strong><p>{value}. This is a focused way to put Level 1 awareness into practice.</p></div>}
    </section>
  );
}

function ThreeAsActivity() {
  const cases = [
    {
      id: "health",
      domain: "Health and life sciences",
      role: "A health professional",
      capability: "Interpret observed evidence, decide when to escalate, and explain the reasoning behind a safe course of action.",
      answer: "Anchor",
      feedback: "This capability centres on disciplinary judgement, safe decision-making and reasoning that students must demonstrate independently of AI.",
      alignment: "Where will students practise making and explaining this judgement without relying on an AI-generated answer?",
    },
    {
      id: "business",
      domain: "Business, design and media",
      role: "A business or creative professional",
      capability: "Use AI to compare options, then evaluate the evidence and justify a recommendation for a client.",
      answer: "Augment",
      feedback: "The capability uses AI to extend the work while students retain responsibility for evaluating evidence and justifying the final recommendation.",
      alignment: "How will students practise evaluating AI output and show why their final recommendation is appropriate?",
    },
    {
      id: "engineering",
      domain: "Engineering and ICT",
      role: "An engineering or technology professional",
      capability: "Use AI-assisted development to create and test a new workflow or solution beyond the previous scope of the role.",
      answer: "Advance",
      feedback: "The capability uses AI to create a new workflow or solution that extends professional practice beyond the role’s previous scope.",
      alignment: "What learning activity and assessment would let students explore the new possibility while testing its value, limits and risks?",
    },
  ];
  const lenses = [
    { name: "Anchor", description: "Capabilities students must retain and demonstrate independently of AI." },
    { name: "Augment", description: "Productive use of AI with disciplinary judgement and oversight." },
    { name: "Advance", description: "New AI-enabled possibilities beyond established professional practice." },
  ];
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const current = cases[active];
  const selected = answers[current.id];
  return (
    <section className="activity-block three-as-activity competency-studio">
      <div className="activity-head-row">
        <div>
          <span className="activity-eyebrow">Competency studio</span>
          <h2>Identify the capability before choosing the 3A</h2>
        </div>
        <span className="activity-count">{cases.length} contexts to explore</span>
      </div>
      <p>Choose a professional context, then decide which 3A best describes the capability being developed.</p>
      <div className="competency-case-tabs" role="tablist" aria-label="Professional contexts">
        {cases.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.domain}</strong></button>)}
      </div>
      <div className="competency-case" role="tabpanel">
        <span>{current.role}</span>
        <h3>Students need to be able to…</h3>
        <p>{current.capability}</p>
      </div>
      <p className="competency-question">Which 3A best describes this capability?</p>
      <div className="competency-lenses">
        {lenses.map((lens) => <button key={lens.name} type="button" className={selected === lens.name ? "selected" : ""} onClick={() => setAnswers((items) => ({ ...items, [current.id]: lens.name }))}><strong>{lens.name}</strong><small>{lens.description}</small></button>)}
      </div>
      {selected && (
        <div className={`activity-feedback ${selected !== current.answer ? "try-again" : ""}`}>
          <strong>{selected === current.answer ? `${current.answer}.` : "Look again"}</strong>
          <p>{selected === current.answer ? current.feedback : `This capability is best framed as ${current.answer}. ${current.feedback}`}</p>
          <p className="alignment-cue"><b>Alignment question:</b> {current.alignment}</p>
        </div>
      )}
    </section>
  );
}

function FacilitationRolePlay() {
  const scenario = {
    context: "A Year 1 class has used AI to obtain a simpler explanation of a difficult concept.",
    choices: [
      { label: "Ask students to compare it with the module material, identify one limitation and attempt a practice task.", good: true, feedback: "This keeps students actively checking, evaluating and applying the explanation. AI supports the learning process without replacing the practice students need." },
      { label: "Accept the AI explanation and move to the next topic.", good: false, feedback: "Students still need to verify the explanation and practise applying the concept. Moving on would leave the intended learning untested." },
      { label: "Prohibit the use of AI for explanations.", good: false, feedback: "The key question is whether AI supports the intended learning with suitable checks—not whether it is used at all." },
    ],
  };
  const [picked, setPicked] = useState<number | null>(null);
  const answer = picked === null ? null : scenario.choices[picked];
  return (
    <section className="activity-block facilitation-roleplay">
      <div className="roleplay-header"><span className="activity-eyebrow">Facilitation scenario</span><span className="roleplay-step">One teaching judgement</span></div>
      <h2>What should the lecturer do next?</h2>
      <div className="roleplay-scene"><span className="roleplay-avatar" aria-hidden="true">L</span><div><small>Lecturer context</small><p>{scenario.context}</p></div></div>
      <p className="roleplay-prompt">Choose the response that best supports the learning.</p>
      <div className="roleplay-moves">
        {scenario.choices.map((choice, index) => <button key={choice.label} type="button" className={picked === index ? `${choice.good ? "good" : "caution"} selected` : ""} onClick={() => setPicked(index)}><span>{String.fromCharCode(65 + index)}</span><strong>{choice.label}</strong></button>)}
      </div>
      {answer && <div className={`activity-feedback ${answer.good ? "" : "try-again"}`}><strong>{answer.good ? "A supports the learning" : "Pause and reconsider"}</strong><p>{answer.feedback}</p></div>}
    </section>
  );
}

function AssessmentBriefBuilder() {
  return <ChoiceCheck eyebrow="Briefing challenge" question="Which instruction is clearer?" choices={[
    { label: "You may use AI appropriately.", correct: false, feedback: "This is too vague. It does not state the permitted use, the student’s required contribution, or the evidence and declaration expectations." },
    { label: "You may use GenAI to brainstorm approaches and receive feedback on an early draft. Your final analysis and recommendation must be your own. Check AI-generated claims, retain evidence of your interaction, and cite and declare your use.", correct: true, feedback: "Clear instructions state the permitted use, required student contribution, evidence and declaration expectations." },
  ]} />;
}

function StrategyMap() {
  const [active, setActive] = useState(0);
  const items = [
    { name: "Pedagogy · PAIR", question: "Help students learn with AI", detail: "PAIR gives students a visible process for learning and problem-solving with AI.", icon: MessageCircle },
    { name: "Curriculum · 3As", question: "Review what students need to learn and demonstrate", detail: "The 3As help course and module teams review curriculum and assessment as AI changes the discipline, then align outcomes, activities and evidence of learning.", icon: Sparkles },
    { name: "Assessment", question: "Keep learning visible", detail: "Assessment conditions should show what students must demonstrate and how AI may be used.", icon: ClipboardCheck },
    { name: "Personalised learning", question: "Scaffold practice and feedback", detail: "AI-enabled tutors and learning assistants can support practice, feedback and different learning needs.", icon: Bot },
    { name: "Human Skills and Resilience", question: "Build the human edge", detail: "Develop purpose, resilience, human judgement and the ability to relate, think and act effectively in an AI-enabled world.", icon: Users },
  ];
  return (
    <section className="strategy-map" aria-label="How NP approaches connect across this package">
      <div className="strategy-heading"><span>NP’s approach</span><h2>NP’s five strategies at a glance</h2><p>These provide context for the package. Explore how each connects to your T&amp;L work.</p></div>
      <div className="strategy-goal"><strong>AI-ready graduates</strong><span>Human qualities · domain expertise · responsible use of AI</span></div>
      <div className="strategy-path">
        {items.map(({ name, question, detail, icon: Icon }, index) => <button key={name} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-pressed={active === index}>
          <i><Icon size={18} strokeWidth={2.2} aria-hidden="true" /></i><span><strong>Strategy {index + 1} · {name}</strong><b>{question}</b>{active === index && <small>{detail}</small>}</span>
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
      use: "Group feedback that is appropriate for the tool into themes so you can review it more efficiently.",
      prompt: "Summarise these feedback comments into themes. For each, give a short label and approximate number of related comments. List minority views separately. Do not infer causes or recommend actions.",
      check: "Read a sample of original comments. Look for omissions, minority views and identifying details.",
      judgement: "How to interpret the feedback and what action, if any, is appropriate.",
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
      use: "Identify low-success questions or topic patterns in a de-identified question-level results export.",
      prompt: "This sheet contains de-identified question-level quiz results. Identify low-success questions, possible flawed questions and weak topic areas. Make no claims about individual students or causes.",
      check: "Verify the figures and consider context: a weak result may reflect a flawed question, timing or teaching sequence.",
      judgement: "What to revisit in teaching. Decisions about individual students remain with you.",
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
      <p className="use-case-reminder"><strong>The pattern:</strong> give relevant context, set a bounded task, state the constraints, then check the output. The tool drafts, flags or summarises. You decide.</p>
    </section>
  );
}

function ToolChecksActivity() {
  return <ChoiceCheck eyebrow="Four checks in practice" question="An approved AI tool summarises results and flags three students for possible early intervention. The data use is approved and the figures are accurate. What should you do before acting?" choices={[
    { label: "Review the students’ context and make the decision yourself.", correct: true, feedback: "The AI-generated flags are inputs, not decisions. Review the context and apply your professional judgement before acting." },
    { label: "Act on the flags because the tool and data use are approved.", correct: false, feedback: "Approval does not make the AI output a decision. A person must review the context and decide what action, if any, is appropriate." },
    { label: "Ask the tool to choose the most urgent student first.", correct: false, feedback: "AI should not make student-support decisions. Human oversight remains essential even when the figures are accurate." },
  ]} />;
}

function SectionInteractive({ title, notes, onChange }: { title: string; notes: ActivityNotes; onChange: (key: string, value: string) => void }) {
  if (title === "AI in T&L Essentials: Level 1 (AI-Aware)") return null;
  if (title.startsWith("Part 1")) return <DomainSpotter />;
  if (title.startsWith("Part 2")) return <ThreeAsActivity />;
  if (title.startsWith("Part 3")) return <FacilitationRolePlay />;
  if (title.startsWith("Part 4")) return <AssessmentBriefBuilder />;
  if (title.startsWith("Part 6")) return <TapChecklist eyebrow="Bring it together" title="Take an AI-aware look at one module" prompt="Keep a module you teach, lead or support in mind. Tap each question once you have considered it—and see a reminder of what to check." items={["Curriculum: What is AI changing in what students must learn and how they are taught?", "Facilitation: Where might AI support learning without replacing it?", "Assessment: How will assessment provide authentic evidence of students’ learning?", "Data and Tools: Where could AI tools or learning data safely and responsibly support engagement or a learning outcome—and what needs checking before use?"]} tips={["Use the 3As: is this an Anchor, Augment or Advance capability?", "Use PAIR: has the student formulated the problem and reflected on the process, not just accepted the first AI output?", "Check the assignment descriptor states the GenAI stance, permitted purposes and declaration requirement.", "Confirm the tool is approved for the information involved, and that a person still reviews the output."]} value={notes.snapshotcheck ?? ""} onChange={(value) => onChange("snapshotcheck", value)} completionTitle="You have an AI-aware module snapshot" completionText="You have considered what is changing, the learning to protect, how assessment can provide authentic evidence, and where AI tools or learning data could safely and responsibly help with appropriate checks." />;
  if (title.startsWith("Part 7")) return <NextStepActivity value={notes.nextstep ?? ""} onChange={(value) => onChange("nextstep", value)} />;
  return null;
}

function OpeningVisual() {
  const areas = [
    {
      title: "Curriculum",
      detail: "How AI is changing what students learn and how they are taught",
      icon: BookOpen,
    },
    {
      title: "Facilitation",
      detail: "How AI can support learning, practice and feedback",
      icon: Lightbulb,
    },
    {
      title: "Assessment",
      detail: "How AI changes assessment—and how it can remain authentic and credible",
      icon: ClipboardCheck,
    },
    {
      title: "Data and Tools",
      detail: "How AI tools and learning data can support learning—safely and responsibly",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="opening-visual" aria-label="What this package covers">
      <div className="overview-heading">
        <span>At a glance</span>
        <h2>Four areas of AI-aware T&amp;L</h2>
        <p>This package explores AI across four areas of your teaching practice.</p>
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
      tagline: "What students must retain and demonstrate independently of AI",
      body: "Identify the disciplinary foundations, human qualities and professional judgement students must still demonstrate independently of AI.",
      cue: "Human judgement · empathy · ethical reasoning · creativity · interpersonal skills · professional responsibility",
    },
    {
      key: "augment",
      name: "Augment",
      tagline: "How students should use AI productively",
      body: "Develop and assess how well students use AI to improve the productivity and quality of their work while applying disciplinary judgement and oversight.",
      cue: "Generate · compare · analyse · evaluate · improve",
    },
    {
      key: "advance",
      name: "Advance",
      tagline: "What new possibilities AI may enable",
      body: "In suitable modules, enable students to use AI to go beyond established pre-AI job boundaries—not only doing the same work faster, but creating new services, workflows or roles.",
      cue: "New services · new workflows · new roles · future practice",
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
            <em>{lens.cue}</em>
          </section>
        ))}
      </div>
      <div className="infographic-note"><span aria-hidden="true">↔</span><p><strong>The 3As are lenses, not a sequence.</strong> Not every learning outcome or module will require all three.</p></div>
    </figure>
  );
}

function PairInfographic() {
  const stages = [
    { letter: "P", name: "Problem", action: "Define the problem", detail: "Clarify the context and constraints.", cue: "What are we trying to solve?", tone: "problem" },
    { letter: "A", name: "AI", action: "Select a suitable AI tool", detail: "Choose a tool that fits the learning purpose.", cue: "What can the tool help with?", tone: "ai" },
    { letter: "I", name: "Interaction", action: "Experiment and evaluate", detail: "Test, evaluate and refine the output.", cue: "How will we test and use it?", tone: "interaction" },
    { letter: "R", name: "Reflection", action: "Learn from the process", detail: "Consider what helped, what did not and where human judgement mattered.", cue: "What did we learn?", tone: "reflection" },
  ];
  return (
    <figure className="concept-visual pair-infographic" aria-labelledby="pair-title">
      <figcaption>
        <span>PAIR</span>
        <strong id="pair-title">A visible process for learning and problem-solving with AI</strong>
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
      <div className="infographic-note pair-loop"><span aria-hidden="true">↔</span><p><strong>Interaction is iterative.</strong> Students should question, refine and check AI outputs rather than rely on a single response.</p></div>
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

function SectionVisual({ title }: { title: string }) {
  if (title.startsWith("Part 1")) return <LecturerPracticeMap />;
  if (title.startsWith("Part 2")) return <ThreeAsInfographic />;
  if (title.startsWith("Part 3")) return null;
  if (title.startsWith("Part 4")) return (
    <figure className="concept-visual assessment-visual" aria-label="What every AI-enabled assessment needs">
      <figcaption><span>For every assessment</span><strong>Two things to get right</strong></figcaption>
      <div className="tool-checks"><div><i>1</i><b>Apply current guidance</b><small>GenAI is allowed by default unless explicitly restricted or prohibited. Conditions, declaration requirements and always-prohibited uses must still be clear.</small></div><div><i>2</i><b>Protect the intended learning</b><small>Use the 3As to clarify what students demonstrate independently of AI, with AI, or through new AI-enabled practice.</small></div></div>
    </figure>
  );
  if (title.startsWith("Part 5")) return (
    <figure className="concept-visual tool-visual" aria-label="Four checks for responsible AI tool use">
      <figcaption><span>Before you use a tool</span><strong>Apply four checks</strong></figcaption>
      <div className="tool-checks"><div><i>01</i><b>Learning value</b><small>Does it help learning?</small></div><div><i>02</i><b>Output quality</b><small>Is it checked?</small></div><div><i>03</i><b>Data and ethics</b><small>Is the use safe?</small></div><div><i>04</i><b>Human oversight</b><small>Who decides?</small></div></div>
    </figure>
  );
  if (title.startsWith("Part 6")) return (
    <figure className="concept-visual module-lens-visual" aria-label="Review a module through four AI-aware lenses">
      <figcaption><span>Bring it together</span><strong>Review one module through four lenses</strong></figcaption>
      <div className="module-lens"><div className="lens-core">My<br />module</div><div className="lens-item lens-one"><b>Curriculum</b><small>What changes?</small></div><div className="lens-item lens-two"><b>Facilitation</b><small>What helps?</small></div><div className="lens-item lens-three"><b>Assessment</b><small>What shows learning?</small></div><div className="lens-item lens-four"><b>Data &amp; tools</b><small>What helps—and what needs checking?</small></div></div>
    </figure>
  );
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
        <p>Preparing your learning package…</p>
      </main>
    );
  }

  const useCaseMarker = "<!--use-case-explorer-->";
  const pairInfographicMarker = "<!--pair-infographic-->";
  const moduleSummaryMarker = "<!--module-summary-->";
  const strategyMapMarker = "<!--strategy-map-->";
  const sectionMarkdown = withoutTitle(current.markdown);
  const hasUseCaseExplorer = current.title.startsWith("Part 5") && sectionMarkdown.includes(useCaseMarker);
  const hasPairInfographic = current.title.startsWith("Part 3") && sectionMarkdown.includes(pairInfographicMarker);
  const hasModuleSummary = current.title.startsWith("Part 7") && sectionMarkdown.includes(moduleSummaryMarker);
  const hasStrategyMap = current.title.startsWith("Part 1") && sectionMarkdown.includes(strategyMapMarker);
  const activeMarker = hasUseCaseExplorer ? useCaseMarker : hasPairInfographic ? pairInfographicMarker : hasModuleSummary ? moduleSummaryMarker : hasStrategyMap ? strategyMapMarker : "";
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
        {current.title.startsWith("Part 1") && <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />}
        <article
          key={`${current.id}-before`}
          className="course-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(contentBeforeInteractive) }}
        />

        {hasUseCaseExplorer && <UseCaseExplorer />}
        {hasPairInfographic && <PairInfographic />}
        {hasModuleSummary && <ModuleSummary />}
        {hasStrategyMap && <StrategyMap />}
        {contentAfterInteractive && <article
          key={`${current.id}-after`}
          className="course-content course-content-continuation"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(contentAfterInteractive) }}
        />}

        {!current.title.startsWith("Part 1") && <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />}
        {current.title.startsWith("Part 5") && <ToolChecksActivity />}

        {sectionBridges[active] && active < sections.length - 1 && (
          <div className="section-bridge">
            <span>Next</span>
            <p>{sectionBridges[active]}</p>
          </div>
        )}

        {progress === 100 && active === sections.length - 1 && (
          <div className="completion-moment">
            <div className="completion-burst"><span>✓</span></div>
            <div><strong>Learning package complete</strong><p>You have worked through every section and applied the key Level 1 considerations.</p></div>
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
            <button
              className="next-button"
              onClick={goNext}
              disabled={active === sections.length - 1}
            >
              Next section
            </button>
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
