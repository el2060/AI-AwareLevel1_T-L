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
  { mark: "01", label: "AI in your module", tone: "blue" },
  { mark: "02", label: "NP’s approach", tone: "purple" },
  { mark: "03", label: "Curriculum", tone: "orange" },
  { mark: "04", label: "Learning", tone: "teal" },
  { mark: "05", label: "PAIR", tone: "green" },
  { mark: "06", label: "Assessment", tone: "blue" },
  { mark: "07", label: "Tools and data", tone: "purple" },
  { mark: "08", label: "Bring it together", tone: "orange" },
  { mark: "↺", label: "Reflect", tone: "teal" },
  { mark: "✓", label: "Recap", tone: "green" },
  { mark: "→", label: "Next step", tone: "blue" },
];

const sectionBridges = [
  "Consider where AI may already be showing up in a module you teach or support.",
  "See how NP’s approaches appear across four practical areas of T&L.",
  "Start with curriculum: what must students learn, and where might AI add value?",
  "Then consider how AI might support practice without taking over the learning.",
  "Use PAIR to structure how students learn and solve problems with AI.",
  "Apply the same focus on visible learning to assessment.",
  "Clear assessment conditions go together with suitable tools, safe data use and human oversight.",
  "Bring the four areas together for a module you teach or support.",
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

function PulseActivity({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = value ? value.split("|") : [];
  const options = ["Curriculum", "Learning", "Assessment", "Tools and data", "Not sure yet"];
  return (
    <section className="activity-block pulse-activity">
      <span className="activity-eyebrow">30-second pulse</span>
      <h2>Where are you seeing AI in your work?</h2>
      <p>Select all that feel relevant. There is no right answer.</p>
      <div className="chip-row">
        {options.map((option) => (
          <button
            key={option}
            className={selected.includes(option) ? "selected" : ""}
            onClick={() => onChange((selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]).join("|"))}
          >
            {selected.includes(option) ? "✓ " : "+ "}{option}
          </button>
        ))}
      </div>
      {selected.length > 0 && <p className="pulse-note">Keep these areas in mind as you continue.</p>}
    </section>
  );
}

function TapChecklist({ eyebrow, title, prompt, items, value, onChange, completionTitle, completionText }: { eyebrow: string; title: string; prompt: string; items: string[]; value: string; onChange: (value: string) => void; completionTitle: string; completionText: string }) {
  const selected = value ? value.split("|") : [];
  return (
    <section className="activity-block tap-checklist">
      <div className="activity-head-row"><div><span className="activity-eyebrow">{eyebrow}</span><h2>{title}</h2></div><span className="activity-count">{selected.length} / {items.length}</span></div>
      <p>{prompt}</p>
      <div className="tap-check-grid">{items.map((item, index) => <button key={item} className={selected.includes(item) ? "selected" : ""} onClick={() => onChange((selected.includes(item) ? selected.filter((x) => x !== item) : [...selected, item]).join("|"))}><span>{selected.includes(item) ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></button>)}</div>
      {selected.length === items.length && <div className="activity-feedback"><strong>{completionTitle}</strong><p>{completionText}</p></div>}
    </section>
  );
}

function CarryForwardActivity({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = [
    ["What must students still learn and do?", "Start with the capability, not the tool."],
    ["How will students’ learning remain visible?", "Look for evidence of thinking, judgement and contribution."],
    ["Is the tool and information suitable?", "Check the purpose, output, data and human oversight."],
  ];
  const feedback = options.find(([question]) => question === value)?.[1];
  return (
    <section className="activity-block carry-forward-block">
      <span className="activity-eyebrow">Look back</span><h2>Which question will you take back to your module?</h2><p>Choose the one that feels most useful right now.</p>
      <div className="choice-grid">{options.map(([question], index) => <button key={question} className={`choice-button ${value === question ? "selected" : ""}`} onClick={() => onChange(question)}><span>{value === question ? "✓" : String.fromCharCode(65 + index)}</span>{question}</button>)}</div>
      {feedback && <div className="activity-feedback"><strong>A useful question to keep asking</strong><p>{feedback}</p></div>}
    </section>
  );
}

function ConfidenceActivity({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = value ? value.split("|") : [];
  const items = ["Spot where AI affects learning", "Use the 3As and PAIR", "Set clearer assessment conditions", "Check tools, data and output"];
  return (
    <section className="activity-block confidence-block">
      <span className="activity-eyebrow">Quick self-check</span><h2>What do you now feel ready to do?</h2>
      <p>Select each statement that feels true for you.</p>
      <div className="confidence-list">{items.map((item) => <button key={item} className={selected.includes(item) ? "selected" : ""} onClick={() => onChange((selected.includes(item) ? selected.filter((x) => x !== item) : [...selected, item]).join("|"))}><span>{selected.includes(item) ? "✓" : ""}</span>{item}</button>)}</div>
      {selected.length === items.length && <div className="activity-feedback"><strong>You have covered the Level 1 foundation</strong><p>Use these questions when reviewing a module you teach or support.</p></div>}
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
      preview: "Use the 3As to review aligned learning outcomes, activities and assessment; use PAIR to structure learning with AI.",
      takeaway: "Anchor foundations, Augment authentic work and Advance new possibilities. The 3As guide a review of what students should learn, how they will practise it and how they will demonstrate it. NP has adopted and adapted PAIR as a process for learning with AI.",
      practice: "Check that your learning outcome, learning activity and assessment are aligned. Use AI to support practice and learning—not to take over the thinking.",
      icon: Sparkles,
      tone: "purple",
    },
    {
      label: "Assessment",
      title: "Make learning credible",
      preview: "Start with the learning outcome and evidence of what students can do.",
      takeaway: "GenAI is allowed in summative assessment unless explicitly prohibited. Every submission cover page needs a GenAI Use Declaration; declaring a prohibited use does not make it acceptable.",
      practice: "State the conditions clearly in the assignment descriptor and discuss them with students.",
      icon: ClipboardCheck,
      tone: "orange",
    },
    {
      label: "Tools and data",
      title: "Enhance T&L purposefully",
      preview: "Start with a T&L activity, then check the information, output and oversight.",
      takeaway: "M365 Copilot can support activities such as reviewing materials, drafting examples and summarising de-identified feedback. Use any tool only for the information and purpose it is approved for.",
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
  const options = ["Discuss one change with my module team", "Review one learning outcome, activity and assessment using the 3As", "Check one assessment’s GenAI conditions", "Try one small AI-supported learning activity"];
  return (
    <section className="activity-block next-step-block">
      <span className="activity-eyebrow">Before you leave</span><h2>Choose one small next step</h2>
      <div className="choice-grid">{options.map((option, index) => <button key={option} className={`choice-button ${value === option ? "selected" : ""}`} onClick={() => onChange(option)}><span>{value === option ? "✓" : String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
      {value && <div className="activity-feedback"><strong>A practical place to start</strong><p>{value}. This is a focused way to put Level 1 awareness into practice.</p></div>}
    </section>
  );
}

function ThreeAsActivity() {
  const prompts = [
    { text: "Learning outcome: Students explain a core procedure without AI. Which 3A should guide the aligned learning activity and assessment?", answer: "Anchor" },
    { text: "Learning outcome: Students use AI to compare options before making a professional judgement. Which 3A should guide the aligned learning activity and assessment?", answer: "Augment" },
    { text: "Learning outcome: Students prototype a new AI-enabled service. Which 3A should guide the aligned learning activity and assessment?", answer: "Advance" },
  ];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const current = prompts[index];
  return (
    <section className="activity-block three-as-activity">
      <div className="activity-head-row">
        <div>
          <span className="activity-eyebrow">Quick sort</span>
          <h2>Which of the 3As fits best?</h2>
        </div>
        <span className="activity-count">{index + 1} / {prompts.length}</span>
      </div>
      <blockquote>{current.text}</blockquote>
      <div className="three-as-options">
        {[
          ["Anchor", "Keep the foundations strong"],
          ["Augment", "Enhance an authentic workflow"],
          ["Advance", "Explore new possibilities"],
        ].map(([name, description]) => (
          <button key={name} className={selected === name ? "selected" : ""} onClick={() => setSelected(name)}>
            <strong>{name}</strong><small>{description}</small>
          </button>
        ))}
      </div>
      {selected && (
        <div className={`activity-feedback ${selected !== current.answer ? "try-again" : ""}`}>
          <strong>{selected === current.answer ? "That’s it" : "Look again"}</strong>
          <p>The best fit is <b>{current.answer}</b>. Next, check that the learning activity gives suitable practice and the assessment makes this outcome visible.</p>
          {selected === current.answer && index < prompts.length - 1 && (
            <button className="inline-next" onClick={() => { setIndex(index + 1); setSelected(null); }}>Try the next one →</button>
          )}
        </div>
      )}
    </section>
  );
}

function PairBuilder() {
  const steps = ["Problem", "AI", "Interaction", "Reflection"];
  const shuffled = ["Reflection", "Interaction", "Problem", "AI"];
  const [picked, setPicked] = useState<string[]>([]);
  const [nudge, setNudge] = useState("");
  const next = steps[picked.length];
  const complete = picked.length === steps.length;
  return (
    <section className="activity-block pair-builder">
      <span className="activity-eyebrow">Build the flow</span>
      <h2>Tap the PAIR stages in order</h2>
      <div className="pair-track">
        {steps.map((step, index) => <div key={step} className={picked[index] === step ? "filled" : ""}>{picked[index] ? <><b>{step[0]}</b><span>{step}</span></> : <em>{index + 1}</em>}</div>)}
      </div>
      <div className="pair-options">
        {shuffled.map((step) => (
          <button
            key={step}
            disabled={picked.includes(step)}
            onClick={() => {
              if (step === next) {
                setPicked([...picked, step]);
                setNudge("");
              } else {
                setNudge(picked.length === 0 ? "Start with the problem or task students need to address." : "Not quite—think about what should follow the stage you just placed.");
              }
            }}
          >{step}</button>
        ))}
      </div>
      <p className={`pair-hint ${nudge ? "pair-nudge" : ""}`}>{complete ? "PAIR keeps the learning process visible from problem framing to reflection." : nudge || `Next: think about what comes ${picked.length === 0 ? "first" : "next"}.`}</p>
    </section>
  );
}

function PairDesignGuide() {
  const [active, setActive] = useState(0);
  const stages = [
    { name: "Problem", action: "Formulate the problem", learner: "Identify the core problem, its components and constraints.", facilitator: "What is the context and problem? Is it complex or open to different approaches? What is the deliverable?", icon: Lightbulb, tone: "problem" },
    { name: "AI", action: "Select suitable AI tools", learner: "Explore and identify the most suitable AI tools for the problem.", facilitator: "Which tools may be relevant? How will students review and justify their choice?", icon: Bot, tone: "ai" },
    { name: "Interaction", action: "Interact with the AI tools", learner: "Experiment with different ways to interact; critically evaluate outputs and integrate them to tackle the problem.", facilitator: "What will students do with the tool—for example, generate ideas, gather resources, craft an outline or refine a draft? How will they evaluate the output?", icon: MessageCircle, tone: "interaction" },
    { name: "Reflection", action: "Reflect on the experience", learner: "Evaluate how the AI tool helped or hindered problem-solving, and reflect on collaborating with AI and its broader implications.", facilitator: "How will students evaluate their use of AI, including what helped, what got in the way and where human judgement mattered?", icon: Scale, tone: "reflection" },
  ];
  const selected = stages[active];
  const Icon = selected.icon;
  return (
    <section className={`pair-design-guide tone-${selected.tone}`} aria-label="Design an AI-enabled learning experience with PAIR">
      <div className="pair-design-heading"><span>Design with PAIR</span><h2>Use the four stages to shape an activity</h2><p>Choose a stage to see what students do and the design questions you can use as a facilitator.</p></div>
      <div className="pair-design-tabs" role="tablist" aria-label="PAIR stages">
        {stages.map((stage, index) => <button key={stage.name} type="button" role="tab" aria-selected={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>{stage.name[0]}</span>{stage.name}</button>)}
      </div>
      <div className="pair-design-detail" role="tabpanel">
        <span className="pair-design-icon"><Icon size={22} strokeWidth={2} /></span>
        <div><span className="pair-design-kicker">{selected.name}</span><h3>{selected.action}</h3><div className="pair-design-columns"><section><strong>Learners will</strong><p>{selected.learner}</p></section><section><strong>Consider as facilitator</strong><p>{selected.facilitator}</p></section></div></div>
      </div>
    </section>
  );
}

function StrategyMap() {
  const [active, setActive] = useState(0);
  const items = [
    { name: "Pedagogy · PAIR", question: "Help students learn with AI", detail: "NP has adopted and adapted PAIR as a visible process for problem framing, AI tool selection, critical interaction and reflection.", icon: MessageCircle },
    { name: "Curriculum · 3As", question: "Keep outcomes, learning and assessment aligned", detail: "The 3As help course and module teams review learning outcomes, learning activities and assessment together as AI changes the discipline.", icon: Sparkles },
    { name: "Assessment", question: "Keep learning visible", detail: "Assessment conditions should show what students must demonstrate and how AI may be used.", icon: ClipboardCheck },
    { name: "Personalised learning", question: "Scaffold practice and feedback", detail: "AI-enabled tutors and learning assistants can support practice, feedback and different learning needs.", icon: Bot },
    { name: "Human skills and resilience", question: "Keep judgement at the centre", detail: "Ethics, communication, creativity, resilience and professional judgement remain essential.", icon: Users },
  ];
  return (
    <section className="strategy-map" aria-label="How NP approaches connect across this package">
      <div className="strategy-heading"><span>NP’s approach</span><h2>NP’s five strategies at a glance</h2><p>Explore each strategy to see where it appears in this package.</p></div>
      <div className="strategy-goal"><strong>AI-ready graduates</strong><span>Human qualities · domain expertise · responsible use of AI</span></div>
      <div className="strategy-path">
        {items.map(({ name, question, detail, icon: Icon }, index) => <button key={name} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-pressed={active === index}>
          <i><Icon size={18} strokeWidth={2.2} aria-hidden="true" /></i><span><strong>{name}</strong><b>{question}</b>{active === index && <small>{detail}</small>}</span>
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
      check: "Verify each flag against the actual document. The tool can misread structure or highlight an intentional choice.",
      judgement: "What changes to make, with your module team and the 3As in mind.",
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
      use: "Group de-identified open-ended feedback into themes so you can review it more efficiently.",
      prompt: "Summarise these de-identified feedback comments into themes. For each, give a short label and approximate number of related comments. List minority views separately. Do not infer causes or recommend actions.",
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

function ToolChecksActivity({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <TapChecklist eyebrow="Four checks" title="Before using AI output with students, what will you check?" prompt="Select all four. Each one matters." items={["Learning value", "Output quality", "Data and ethics", "Human oversight"]} value={value} onChange={onChange} completionTitle="A sound AI-aware check" completionText="A suitable use has a clear learning purpose, an appropriate tool, checked output, safe information handling and a person making the final decision." />;
}

function SectionInteractive({ title, notes, onChange }: { title: string; notes: ActivityNotes; onChange: (key: string, value: string) => void }) {
  if (title === "AI in T&L Essentials: Level 1 (AI-Aware)") return null;
  if (title.startsWith("Part 1")) return <PulseActivity value={notes.pulse ?? ""} onChange={(value) => onChange("pulse", value)} />;
  if (title.startsWith("Part 2")) return <StrategyMap />;
  if (title.startsWith("Part 3")) return <ThreeAsActivity />;
  if (title.startsWith("Part 4")) return <ChoiceCheck eyebrow="Support or replace?" question="Which use better protects the learning?" choices={[
    { label: "AI explains a concept; the student checks it against module material and then applies it to a practice task.", correct: true, feedback: "AI supports clarification, while the student still checks, practises and applies the intended learning." },
    { label: "AI completes the assignment; the student lightly edits and submits the response.", correct: false, feedback: "Here, AI replaces the thinking and performance the student needs to develop." },
    { label: "AI gives students a model answer before they have attempted the problem themselves.", correct: false, feedback: "A model answer may be useful later, but giving it first can remove the productive struggle and practice students need." },
  ]} />;
  if (title.startsWith("Part 5")) return <PairBuilder />;
  if (title.startsWith("Part 6")) return <div className="activity-stack"><ChoiceCheck eyebrow="Assessment judgement" question="A student declares that GenAI created a required interview. Is that acceptable?" choices={[
    { label: "Yes. Declaration makes the use acceptable.", correct: false, feedback: "Declaration is required, but it does not make a prohibited use acceptable." },
    { label: "It depends on how realistic the generated responses are.", correct: false, feedback: "The issue is not realism. The assessment requires a real human interaction." },
    { label: "No. GenAI cannot replace the real interaction required by the task.", correct: true, feedback: "Correct. Simulating a required human interaction is always prohibited." },
  ]} /><TapChecklist eyebrow="Make it clear" title="What should the assignment descriptor spell out?" prompt="The instruction says only: ‘You may use AI appropriately.’ Select every detail students still need." items={["What AI may be used for", "What students must do themselves", "What evidence they must keep", "What they must check, cite and declare", "What is restricted or prohibited"]} value={notes.assessmentcheck ?? ""} onChange={(value) => onChange("assessmentcheck", value)} completionTitle="That is the clearer brief" completionText="Students should know the permitted purpose, their own contribution, the evidence to retain, and the checking and declaration requirements." /></div>;
  if (title.startsWith("Part 7")) return <ChoiceCheck eyebrow="Tool judgement" question="Which is the soundest use?" choices={[
    { label: "Use an approved AI tool, such as M365 Copilot, to suggest activities, then check and adapt one.", correct: true, feedback: "The purpose is clear, the tool is suitable, and the lecturer reviews the output." },
    { label: "Use an unapproved public tool to analyse named student records.", correct: false, feedback: "The tool is not approved for the information involved." },
    { label: "Let an AI summary decide which students need intervention.", correct: false, feedback: "AI may support an initial review, but a person must interpret the context and make the decision." },
  ]} />;
  if (title.startsWith("Part 8")) return <TapChecklist eyebrow="Bring it together" title="Take an AI-aware look at one module" prompt="Keep a module you teach, lead or support in mind. Tap each question once you have considered it." items={["Curriculum: What is AI changing in what students must learn and do?", "Learning: Where might AI support learning without replacing it?", "Assessment: What must students still demonstrate themselves?", "Tools and data: Where could AI tools or learning data enhance a T&L activity—and what needs checking before use?"]} value={notes.snapshotcheck ?? ""} onChange={(value) => onChange("snapshotcheck", value)} completionTitle="You have an AI-aware module snapshot" completionText="You have considered what is changing, the learning to protect, what students need to demonstrate, and where AI tools or learning data could help with appropriate checks." />;
  if (title.startsWith("Look Back")) return <CarryForwardActivity value={notes.lookbackchoice ?? ""} onChange={(value) => onChange("lookbackchoice", value)} />;
  if (title === "Module Summary") return <ConfidenceActivity value={notes.confidence ?? ""} onChange={(value) => onChange("confidence", value)} />;
  if (title.startsWith("You Have Completed")) return <NextStepActivity value={notes.nextstep ?? ""} onChange={(value) => onChange("nextstep", value)} />;
  return null;
}

function OpeningVisual() {
  const areas = [
    {
      title: "Curriculum",
      detail: "What AI may change in your module",
      icon: BookOpen,
    },
    {
      title: "Learning",
      detail: "How AI can support practice and feedback",
      icon: Lightbulb,
    },
    {
      title: "Assessment",
      detail: "How students show their learning credibly",
      icon: ClipboardCheck,
    },
    {
      title: "Tools and data",
      detail: "How AI tools and learning data can enhance a T&L activity",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="opening-visual" aria-label="What this package covers">
      <div className="overview-heading">
        <span>At a glance</span>
        <h2>Four areas of AI-aware T&amp;L</h2>
        <p>This package looks at four parts of your teaching work.</p>
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
  return (
    <figure className="concept-visual three-as-infographic" aria-labelledby="three-as-title">
      <figcaption>
        <span>The 3As</span>
        <strong id="three-as-title">Review aligned learning outcomes, activities and assessment</strong>
      </figcaption>
      <div className="three-as-path">
        <section className="three-as-band advance-band">
          <div className="three-as-label"><i aria-hidden="true">A</i><div><b>Advance</b><small>Explore what becomes possible</small></div></div>
          <p>Emerging or transformative AI applications within the discipline.</p>
          <em>New services · new workflows · future practice</em>
        </section>
        <section className="three-as-band augment-band">
          <div className="three-as-label"><i aria-hidden="true">A</i><div><b>Augment</b><small>Improve authentic practice</small></div></div>
          <p>AI-enabled practice that strengthens a real professional workflow.</p>
          <em>Generate · compare · analyse · improve</em>
        </section>
        <section className="three-as-band anchor-band">
          <div className="three-as-label"><i aria-hidden="true">A</i><div><b>Anchor</b><small>Protect the foundations</small></div></div>
          <p>Core disciplinary, human and professional learning students must develop.</p>
          <em>Knowledge · skills · reasoning · judgement</em>
        </section>
      </div>
      <div className="infographic-note"><span aria-hidden="true">↑</span><p><strong>Start with Anchor.</strong> Then review how learning outcomes, activities and assessment align when AI may Augment practice or Advance the discipline.</p></div>
    </figure>
  );
}

function PairInfographic() {
  const stages = [
    { letter: "P", name: "Problem", action: "Formulate the problem", detail: "Identify the core problem, its components and constraints.", cue: "What are we trying to solve?", tone: "problem" },
    { letter: "A", name: "AI", action: "Select suitable AI tools", detail: "Explore and identify the most suitable AI tools for the problem.", cue: "What can the tool help with?", tone: "ai" },
    { letter: "I", name: "Interaction", action: "Interact with AI tools", detail: "Experiment, critically evaluate outputs and integrate them to tackle the problem.", cue: "How will we test and use the output?", tone: "interaction" },
    { letter: "R", name: "Reflection", action: "Learn from the process", detail: "Identify what helped or hindered, where human judgement mattered and what to change next time.", cue: "What did we learn?", tone: "reflection" },
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
      <div className="infographic-note pair-loop"><span aria-hidden="true">↺</span><p><strong>PAIR is iterative.</strong> Reflection can lead to a better-framed problem and a stronger next attempt.</p></div>
    </figure>
  );
}

function LecturerPracticeMap() {
  const [active, setActive] = useState(0);
  const areas = [
    {
      title: "Curriculum",
      domain: "Curriculum Design & Development",
      work: "Plan outcomes, examples and activities",
      question: "What is AI changing in what students must learn and do?",
      detail: "Review the learning outcomes, activities and assessment together as AI changes the discipline and its practice.",
      icon: BookOpen,
      tone: "design",
    },
    {
      title: "Learning",
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
      work: "Task design, integrity and GenAI conditions",
      question: "What must students still demonstrate themselves?",
      detail: "Decide what students need to demonstrate, then make the GenAI conditions clear and aligned to that evidence.",
      icon: ClipboardCheck,
      tone: "assess",
    },
    {
      title: "Tools and data",
      domain: "Data & Tech-Enhanced T&L",
      work: "AI-supported activities, feedback and learning data",
      question: "Where could AI tools or learning data enhance a T&L activity—and what needs checking before use?",
      detail: "Consider how an AI tool or learning information could enhance an activity, feedback process or teaching decision. Then check the information involved, the output and the judgement needed before acting.",
      icon: Database,
      tone: "review",
    },
  ];
  const selected = areas[active];
  const SelectedIcon = selected.icon;
  return (
    <figure className="concept-visual lecturer-practice-visual" aria-labelledby="lecturer-practice-title">
      <figcaption><span>In your module</span><strong id="lecturer-practice-title">Four AI-aware questions for your teaching work</strong></figcaption>
      <p className="practice-map-intro">Start with one part of your teaching work. Select an area to see the question to ask.</p>
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
  if (title.startsWith("Part 3")) return <ThreeAsInfographic />;
  if (title.startsWith("Part 4")) return (
    <figure className="concept-visual support-visual" aria-label="AI should support rather than replace learning">
      <figcaption><span>A useful test</span><strong>Is AI supporting or replacing the learning?</strong></figcaption>
      <div className="support-scale"><div className="support-side good"><span>✓</span><b>Support</b><small>Explain · practise · check · improve</small></div><div className="scale-pivot"><span /></div><div className="support-side caution"><span>!</span><b>Replace</b><small>Complete · copy · submit</small></div></div>
    </figure>
  );
  if (title.startsWith("Part 5")) return <PairInfographic />;
  if (title.startsWith("Part 6")) return (
    <figure className="concept-visual assessment-visual" aria-label="Assessment decisions begin with the learning outcome">
      <figcaption><span>Assessment</span><strong>Begin with what students must demonstrate</strong></figcaption>
      <div className="assessment-flow"><div><i>01</i><b>Learning outcome</b><small>What capability matters?</small></div><span>→</span><div><i>02</i><b>Evidence</b><small>What must students show?</small></div><span>→</span><div><i>03</i><b>AI conditions</b><small>What is allowed and clear?</small></div></div>
    </figure>
  );
  if (title.startsWith("Part 7")) return (
    <figure className="concept-visual tool-visual" aria-label="Four checks for responsible AI tool use">
      <figcaption><span>Before you use a tool</span><strong>Apply four checks</strong></figcaption>
      <div className="tool-checks"><div><i>01</i><b>Learning value</b><small>Does it help learning?</small></div><div><i>02</i><b>Output quality</b><small>Is it checked?</small></div><div><i>03</i><b>Data and ethics</b><small>Is the use safe?</small></div><div><i>04</i><b>Human oversight</b><small>Who decides?</small></div></div>
    </figure>
  );
  if (title.startsWith("Part 8")) return (
    <figure className="concept-visual module-lens-visual" aria-label="Review a module through four AI-aware lenses">
      <figcaption><span>Bring it together</span><strong>Review one module through four lenses</strong></figcaption>
      <div className="module-lens"><div className="lens-core">My<br />module</div><div className="lens-item lens-one"><b>Curriculum</b><small>What changes?</small></div><div className="lens-item lens-two"><b>Learning</b><small>What helps?</small></div><div className="lens-item lens-three"><b>Assessment</b><small>What shows learning?</small></div><div className="lens-item lens-four"><b>Tools &amp; data</b><small>What is safe?</small></div></div>
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

  const meta = sectionMeta[active] ?? sectionMeta[0];
  const useCaseMarker = "<!--use-case-explorer-->";
  const pairDesignMarker = "<!--pair-design-guide-->";
  const moduleSummaryMarker = "<!--module-summary-->";
  const sectionMarkdown = withoutTitle(current.markdown);
  const hasUseCaseExplorer = current.title.startsWith("Part 7") && sectionMarkdown.includes(useCaseMarker);
  const hasPairDesignGuide = current.title.startsWith("Part 5") && sectionMarkdown.includes(pairDesignMarker);
  const hasModuleSummary = current.title === "Module Summary" && sectionMarkdown.includes(moduleSummaryMarker);
  const activeMarker = hasUseCaseExplorer ? useCaseMarker : hasPairDesignGuide ? pairDesignMarker : hasModuleSummary ? moduleSummaryMarker : "";
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
          <button className="chapter-step" onClick={() => setActive((index) => Math.max(0, index - 1))} disabled={active === 0} aria-label="Previous section"><span aria-hidden="true">←</span><b>Previous</b></button>
          <div className="current-section" aria-live="polite">
            <span>Section {active + 1} of {sections.length}</span>
            <strong>{current.shortTitle}</strong>
          </div>
          <button
            className="contents-button"
            onClick={() => setContentsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={contentsOpen}
          >
            Contents
          </button>
          <button className="chapter-step next-step" onClick={goNext} disabled={active === sections.length - 1} aria-label="Next section"><b>Next</b><span aria-hidden="true">→</span></button>
        </div>
      </nav>

      <main className="reader">
        <div className={`section-intro tone-${meta.tone}`}>
          <div className="section-mark">{meta.mark}</div>
          <div>
            <div className="section-kicker">{meta.label}</div>
          </div>
        </div>
        {active === 0 ? (
          <h1 className="page-title home-title">
            <span>AI in T&amp;L Essentials</span>
            <small>Level 1 <i aria-hidden="true">·</i> AI-Aware</small>
          </h1>
        ) : <h1 className="page-title">{current.shortTitle}</h1>}
        {active === 0 ? <OpeningVisual /> : <SectionVisual title={current.title} />}
        {active > 0 && active !== 5 && <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />}
        <article
          key={`${current.id}-before`}
          className="course-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(contentBeforeInteractive) }}
        />

        {hasUseCaseExplorer && <UseCaseExplorer />}
        {hasPairDesignGuide && <PairDesignGuide />}
        {hasModuleSummary && <ModuleSummary />}

        {contentAfterInteractive && <article
          key={`${current.id}-after`}
          className="course-content course-content-continuation"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(contentAfterInteractive) }}
        />}

        {active === 5 && <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />}
        {current.title.startsWith("Part 7") && <ToolChecksActivity value={activityNotes.toolchecks ?? ""} onChange={(value) => setActivityValue("toolchecks", value)} />}

        {sectionBridges[active] && active < sections.length - 1 && (
          <div className="section-bridge">
            <span>Next</span>
            <p>{sectionBridges[active]}</p>
          </div>
        )}

        {progress === 100 && active === sections.length - 1 && (
          <div className="completion-moment">
            <div className="completion-burst"><span>✓</span></div>
            <div><strong>Learning package complete</strong><p>You have worked through every section and practised the key Level 1 decisions.</p></div>
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
