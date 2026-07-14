"use client";

import { useEffect, useMemo, useState } from "react";

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

const STORAGE_KEY = "np-ai-aware-course";

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
      output.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
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
  { mark: "01", label: "Notice", tone: "blue" },
  { mark: "02", label: "Connect", tone: "purple" },
  { mark: "03", label: "Consider", tone: "orange" },
  { mark: "04", label: "Support", tone: "teal" },
  { mark: "05", label: "Structure", tone: "green" },
  { mark: "06", label: "Clarify", tone: "blue" },
  { mark: "07", label: "Use wisely", tone: "purple" },
  { mark: "08", label: "Bring together", tone: "orange" },
  { mark: "↺", label: "Reflect", tone: "teal" },
  { mark: "✓", label: "Recap", tone: "green" },
  { mark: "→", label: "Next step", tone: "blue" },
];

const sectionBridges = [
  "Consider where AI may already be showing up in a module you teach or support.",
  "With that module in mind, see how NP’s approaches give us a shared set of questions.",
  "Begin with curriculum: what must students still learn, and where might AI add value?",
  "Once the learning is clear, consider how AI might support practice without replacing it.",
  "PAIR then gives students a simple process for learning and problem-solving with AI.",
  "The same focus on visible learning helps us make sound assessment decisions.",
  "Clear assessment conditions also depend on suitable tools, safe data use and human oversight.",
  "Bring the questions together and take an AI-aware look at one module.",
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
  const options = ["Student learning", "Assessment", "Teaching preparation", "Feedback", "Not sure yet"];
  return (
    <section className="activity-block pulse-activity">
      <span className="activity-eyebrow">30-second pulse</span>
      <h2>Where are you noticing AI in your work?</h2>
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
      {selected.length > 0 && <p className="pulse-note">Keep these areas in mind as you move through the course.</p>}
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
      <span className="activity-eyebrow">Look back</span><h2>Which question will you carry into your module?</h2><p>Choose the one that feels most useful right now.</p>
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
      <span className="activity-eyebrow">Quick self-check</span><h2>What are you now better prepared to do?</h2>
      <p>Select each statement that feels true for you.</p>
      <div className="confidence-list">{items.map((item) => <button key={item} className={selected.includes(item) ? "selected" : ""} onClick={() => onChange((selected.includes(item) ? selected.filter((x) => x !== item) : [...selected, item]).join("|"))}><span>{selected.includes(item) ? "✓" : ""}</span>{item}</button>)}</div>
      {selected.length === items.length && <div className="activity-feedback"><strong>You have covered the Level 1 foundation</strong><p>The next step is to use these questions when reviewing your own module.</p></div>}
    </section>
  );
}

function NextStepActivity({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = ["Discuss one change with my module team", "Review one learning outcome using the 3As", "Check one assessment’s GenAI conditions", "Try one small AI-supported learning activity"];
  return (
    <section className="activity-block next-step-block">
      <span className="activity-eyebrow">Before you leave</span><h2>Choose one small next step</h2>
      <div className="choice-grid">{options.map((option, index) => <button key={option} className={`choice-button ${value === option ? "selected" : ""}`} onClick={() => onChange(option)}><span>{value === option ? "✓" : String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
      {value && <div className="activity-feedback"><strong>A practical place to start</strong><p>{value}. Keep the scope small and use what you have learnt to guide the conversation or review.</p></div>}
    </section>
  );
}

function ThreeAsActivity() {
  const prompts = [
    { text: "Students explain a core procedure without AI.", answer: "Anchor" },
    { text: "Students use AI to compare options before making a professional judgement.", answer: "Augment" },
    { text: "Students prototype a new AI-enabled service.", answer: "Advance" },
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
          <p>The best fit is <b>{current.answer}</b>.</p>
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

function StrategyMap() {
  const [active, setActive] = useState(0);
  const items = [
    ["Curriculum · 3As", "What should students learn?", "Parts 3 looks at Anchor, Augment and Advance."],
    ["Learning · PAIR", "How can students learn with AI?", "Parts 4 and 5 focus on supporting learning and using PAIR."],
    ["Assessment", "How will students show what they can do?", "Part 6 focuses on credible evidence and clear GenAI conditions."],
    ["Tools & data", "How should AI be used responsibly?", "Part 7 focuses on suitable tools, safe information use and human oversight."],
  ];
  return (
    <section className="strategy-map" aria-label="How NP approaches connect across this package">
      <div className="strategy-heading"><span>For this package</span><h2>Carry four questions into the rest of the module</h2><p>Each question turns NP’s direction into something you can notice in your own module.</p></div>
      <div className="strategy-goal"><strong>Five NP strategies</strong><span>Four practical questions for an AI-aware lecturer</span></div>
      <div className="strategy-path">
        {items.map(([name, question, detail], index) => <button key={name} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-pressed={active === index}>
          <i>{String(index + 1).padStart(2, "0")}</i><span><strong>{name}</strong><b>{question}</b>{active === index && <small>{detail}</small>}</span>
        </button>)}
      </div>
    </section>
  );
}

function SectionInteractive({ title, notes, onChange }: { title: string; notes: ActivityNotes; onChange: (key: string, value: string) => void }) {
  if (title === "AI in T&L Essentials: Level 1 (AI-Aware)") return null;
  if (title.startsWith("Part 1")) return <PulseActivity value={notes.pulse ?? ""} onChange={(value) => onChange("pulse", value)} />;
  if (title.startsWith("Part 2")) return <StrategyMap />;
  if (title.startsWith("Part 3")) return <ThreeAsActivity />;
  if (title.startsWith("Part 4")) return <ChoiceCheck eyebrow="Support or replace?" question="Which use better protects the learning?" choices={[
    { label: "AI explains a concept; the student checks it and then practises.", correct: true, feedback: "AI supports clarification, while the student still checks and practises the intended learning." },
    { label: "AI completes the assignment; the student submits the response.", correct: false, feedback: "Here, AI replaces the thinking and performance the student needs to develop." },
  ]} />;
  if (title.startsWith("Part 5")) return <PairBuilder />;
  if (title.startsWith("Part 6")) return <div className="activity-stack"><ChoiceCheck eyebrow="Assessment judgement" question="A student declares that GenAI created a required interview. Is that acceptable?" choices={[
    { label: "Yes. Declaration makes the use acceptable.", correct: false, feedback: "Declaration is required, but it does not make a prohibited use acceptable." },
    { label: "It depends on how realistic the generated responses are.", correct: false, feedback: "The issue is not realism. The assessment requires a real human interaction." },
    { label: "No. GenAI cannot replace the real interaction required by the task.", correct: true, feedback: "Correct. Simulating a required human interaction is always prohibited." },
  ]} /><TapChecklist eyebrow="Make it clear" title="What should the assignment descriptor spell out?" prompt="The instruction says only: ‘You may use AI appropriately.’ Select every detail students still need." items={["What AI may be used for", "What students must do themselves", "What evidence they must keep", "What they must check, cite and declare", "What is restricted or prohibited"]} value={notes.assessmentcheck ?? ""} onChange={(value) => onChange("assessmentcheck", value)} completionTitle="That is the clearer brief" completionText="Students should know the permitted purpose, their own contribution, the evidence to retain, and the checking and declaration requirements." /></div>;
  if (title.startsWith("Part 7")) return <div className="activity-stack"><ChoiceCheck eyebrow="Tool judgement" question="Which is the soundest use?" choices={[
    { label: "Use Pair.gov.sg to suggest activities, then check and adapt one.", correct: true, feedback: "The purpose is clear, the tool is suitable, and the lecturer reviews the output." },
    { label: "Use an unapproved public tool to analyse named student records.", correct: false, feedback: "The tool is not approved for the information involved." },
    { label: "Let an AI summary decide which students need intervention.", correct: false, feedback: "AI may support an initial review, but a person must interpret the context and make the decision." },
  ]} /><TapChecklist eyebrow="Four checks" title="Before using AI output with students, what will you check?" prompt="Select all four. Each one matters." items={["Learning value", "Output quality", "Data and ethics", "Human oversight"]} value={notes.toolchecks ?? ""} onChange={(value) => onChange("toolchecks", value)} completionTitle="A sound AI-aware check" completionText="A suitable use has a clear learning purpose, an appropriate tool, checked output, safe information handling and a person making the final decision." /></div>;
  if (title.startsWith("Part 8")) return <TapChecklist eyebrow="Bring it together" title="Take an AI-aware look at one module" prompt="Keep your chosen module in mind. Tap each question once you have considered it." items={["What is AI changing?", "What must students still learn and do?", "Where might AI support learning?", "What assessment, tool or data condition needs attention?"]} value={notes.snapshotcheck ?? ""} onChange={(value) => onChange("snapshotcheck", value)} completionTitle="You have an AI-aware module snapshot" completionText="You have considered the change, the learning to protect, a possible support and a condition to check." />;
  if (title.startsWith("Look Back")) return <CarryForwardActivity value={notes.lookbackchoice ?? ""} onChange={(value) => onChange("lookbackchoice", value)} />;
  if (title === "Module Summary") return <ConfidenceActivity value={notes.confidence ?? ""} onChange={(value) => onChange("confidence", value)} />;
  if (title.startsWith("You Have Completed")) return <NextStepActivity value={notes.nextstep ?? ""} onChange={(value) => onChange("nextstep", value)} />;
  return null;
}

function OpeningVisual() {
  const areas = [
    {
      title: "AI in teaching and learning",
      detail: "How AI affects your modules and students",
    },
    {
      title: "NP’s approach to AI in T&L",
      detail: "How NP supports learning with AI",
    },
    {
      title: "AI in assessment",
      detail: "How to set clear expectations for GenAI use",
    },
    {
      title: "Tools, data and responsible use",
      detail: "How to choose tools and handle data safely",
    },
  ];

  return (
    <section className="opening-visual" aria-label="What this package covers">
      <div className="overview-heading">
        <span>At a glance</span>
        <h2>What this package covers</h2>
      </div>
      <div className="overview-areas">
        {areas.map((area, index) => (
          <div className={`overview-area area-${index + 1}`} key={area.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{area.title}</strong><small>{area.detail}</small></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionVisual({ title }: { title: string }) {
  if (title.startsWith("Part 1")) return (
    <figure className="concept-visual ai-map-visual" aria-label="AI may appear across teaching preparation, student learning, assessment and feedback">
      <figcaption><span>In your module</span><strong>Where might AI appear?</strong></figcaption>
      <div className="ai-map"><div className="ai-map-core">AI</div><div className="map-item map-a"><b>Prepare</b><small>Examples · activities</small></div><div className="map-item map-b"><b>Learn</b><small>Explain · practise</small></div><div className="map-item map-c"><b>Assess</b><small>Create · demonstrate</small></div><div className="map-item map-d"><b>Feedback</b><small>Review · improve</small></div></div>
    </figure>
  );
  if (title.startsWith("Part 3")) return (
    <figure className="concept-visual three-a-visual" aria-label="The 3As: Anchor, Augment and Advance">
      <figcaption><span>The 3As</span><strong>Start with strong foundations</strong></figcaption>
      <div className="three-a-stack"><div className="advance-layer"><b>Advance</b><span>Explore new possibilities</span></div><div className="augment-layer"><b>Augment</b><span>Improve authentic workflows</span></div><div className="anchor-layer"><b>Anchor</b><span>Protect core knowledge, skills and judgement</span></div></div>
    </figure>
  );
  if (title.startsWith("Part 4")) return (
    <figure className="concept-visual support-visual" aria-label="AI should support rather than replace learning">
      <figcaption><span>A useful test</span><strong>Is AI supporting or replacing the learning?</strong></figcaption>
      <div className="support-scale"><div className="support-side good"><span>✓</span><b>Support</b><small>Explain · practise · check · improve</small></div><div className="scale-pivot"><span /></div><div className="support-side caution"><span>!</span><b>Replace</b><small>Complete · copy · submit</small></div></div>
    </figure>
  );
  if (title.startsWith("Part 5")) return (
    <figure className="concept-visual pair-visual" aria-label="PAIR: Problem, AI, Interaction, Reflection">
      <figcaption><span>PAIR</span><strong>Keep the learning process visible</strong></figcaption>
      <div className="pair-flow"><div><b>P</b><span>Problem</span><small>Frame it</small></div><i>→</i><div><b>A</b><span>AI</span><small>Choose it</small></div><i>→</i><div><b>I</b><span>Interaction</span><small>Question it</small></div><i>→</i><div><b>R</b><span>Reflection</span><small>Learn from it</small></div></div>
    </figure>
  );
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
  const [notes, setNotes] = useState("");
  const [activityNotes, setActivityNotes] = useState<ActivityNotes>({});
  const [notesOpen, setNotesOpen] = useState(false);
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

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompleted(parsed.completed ?? []);
        setNotes(parsed.notes ?? "");
        setActivityNotes(parsed.activityNotes ?? {});
        setActive(parsed.active ?? 0);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!course) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completed, notes, activityNotes, active }),
    );
  }, [completed, notes, activityNotes, active, course]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  function selectSection(index: number) {
    setActive(index);
    setContentsOpen(false);
  }

  function markComplete() {
    if (!current) return;
    setCompleted((items) =>
      items.includes(current.id)
        ? items.filter((id) => id !== current.id)
        : [...items, current.id],
    );
  }

  function goNext() {
    if (!current) return;
    if (!completed.includes(current.id)) {
      setCompleted((items) => [...items, current.id]);
    }
    setActive((index) => Math.min(index + 1, sections.length - 1));
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

  const isComplete = completed.includes(current.id);
  const meta = sectionMeta[active] ?? sectionMeta[0];

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
            <button className="notes-button" onClick={() => setNotesOpen(true)}>
              Notes
            </button>
          </div>
        </div>
      </header>

      <nav className="chapter-dock" aria-label="Course navigation">
        <button className="dock-arrow" onClick={() => setActive((index) => Math.max(0, index - 1))} disabled={active === 0} aria-label="Previous section">←</button>
        <button
          className="contents-trigger"
          onClick={() => setContentsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={contentsOpen}
          aria-label={`Open all sections. Current section: ${current.shortTitle}`}
        >
          <span className="contents-menu-icon" aria-hidden="true">☰</span>
          <span className="contents-current">
            <span className="contents-label">Section {active + 1} of {sections.length}</span>
            <strong>{current.shortTitle}</strong>
          </span>
          <span className="contents-action">All sections <i aria-hidden="true">⌄</i></span>
        </button>
        <span className="dock-progress">{completed.length} complete</span>
        <button className="dock-arrow" onClick={() => setActive((index) => Math.min(sections.length - 1, index + 1))} disabled={active === sections.length - 1} aria-label="Next section">→</button>
      </nav>

      <main className="reader">
        <div className={`section-intro tone-${meta.tone}`}>
          <div className="section-mark">{meta.mark}</div>
          <div>
            <div className="section-kicker">Section {active + 1} of {sections.length}</div>
            <span>{meta.label}</span>
          </div>
        </div>
        <h1 className="page-title">{current.title}</h1>
        {active === 0 ? <OpeningVisual /> : <SectionVisual title={current.title} />}
        <article
          key={current.id}
          className="course-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(withoutTitle(current.markdown)) }}
        />

        <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />

        {sectionBridges[active] && active < sections.length - 1 && (
          <div className="section-bridge">
            <span>Next</span>
            <p>{sectionBridges[active]}</p>
          </div>
        )}

        {progress === 100 && active === sections.length - 1 && (
          <div className="completion-moment">
            <div className="completion-burst"><span>✓</span></div>
            <div><strong>Learning package complete</strong><p>You have worked through every section. Your progress is saved on this browser.</p></div>
          </div>
        )}

        <div className="section-actions">
          <button className={`complete-button ${isComplete ? "is-complete" : ""}`} onClick={markComplete}>
            {isComplete ? "✓ Section complete" : "Mark as complete"}
          </button>
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
              <div><span className="eyebrow">Jump to any section</span><h2>All sections</h2></div>
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

      {notesOpen && (
        <div className="notes-overlay" role="presentation" onClick={() => setNotesOpen(false)}>
          <aside className="notes-panel" role="dialog" aria-modal="true" aria-label="My notes" onClick={(event) => event.stopPropagation()}>
            <div className="notes-heading">
              <div>
                <span className="eyebrow">Private to this browser</span>
                <h2>My notes</h2>
              </div>
              <button className="close-button" onClick={() => setNotesOpen(false)} aria-label="Close notes">×</button>
            </div>
            <p>Capture a thought, question or next step as you go.</p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="One thing I want to remember…"
              autoFocus
            />
            <button className="done-button" onClick={() => setNotesOpen(false)}>Done</button>
          </aside>
        </div>
      )}
    </div>
  );
}
