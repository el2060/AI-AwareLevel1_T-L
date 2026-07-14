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
  "See how NP’s approaches help you ask four practical questions.",
  "Start with curriculum: what must students learn, and where might AI add value?",
  "Then consider how AI might support practice without taking over the learning.",
  "Use PAIR to structure how students learn and solve problems with AI.",
  "Apply the same focus on visible learning to assessment.",
  "Clear assessment conditions go together with suitable tools, safe data use and human oversight.",
  "Bring the questions together for a module you teach or support.",
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

function NextStepActivity({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = ["Discuss one change with my module team", "Review one learning outcome using the 3As", "Check one assessment’s GenAI conditions", "Try one small AI-supported learning activity"];
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
    ["Pedagogy · PAIR", "Help students learn with AI", "PAIR gives students a visible process for framing problems, using AI critically and reflecting."],
    ["Curriculum · 3As", "Review what students need to learn", "The 3As help identify the foundations to keep strong and where AI may add value."],
    ["Assessment", "Keep learning visible", "Assessment conditions should show what students must demonstrate and how AI may be used."],
    ["Personalised learning", "Scaffold practice and feedback", "AI-enabled tutors and learning assistants can support practice, feedback and different learning needs."],
    ["Human skills and resilience", "Keep judgement at the centre", "Ethics, communication, creativity, resilience and professional judgement remain essential."],
  ];
  return (
    <section className="strategy-map" aria-label="How NP approaches connect across this package">
      <div className="strategy-heading"><span>NP’s approach</span><h2>NP’s five strategies at a glance</h2><p>Explore each strategy to see where it appears in this package.</p></div>
      <div className="strategy-goal"><strong>AI-ready graduates</strong><span>Human qualities · domain expertise · responsible use of AI</span></div>
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
      title: "Curriculum",
      detail: "What AI may change in your module and discipline",
    },
    {
      title: "Facilitation",
      detail: "How AI may support learning and practice",
    },
    {
      title: "Assessment",
      detail: "How students show their learning credibly",
    },
    {
      title: "Data and technology",
      detail: "How to choose tools and handle information safely",
    },
  ];

  return (
    <section className="opening-visual" aria-label="What this package covers">
      <div className="overview-heading">
        <span>At a glance</span>
        <h2>Four areas of AI-aware practice</h2>
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

function ThreeAsInfographic() {
  return (
    <figure className="concept-visual three-as-infographic" aria-labelledby="three-as-title">
      <figcaption>
        <span>The 3As</span>
        <strong id="three-as-title">Build from strong foundations to new possibilities</strong>
      </figcaption>
      <div className="three-as-path">
        <section className="three-as-band advance-band">
          <div className="three-as-label"><i aria-hidden="true">A</i><div><b>Advance</b><small>Explore what becomes possible</small></div></div>
          <p>Emerging or transformative AI applications within the discipline.</p>
          <em>New services · new workflows · future practice</em>
        </section>
        <section className="three-as-band augment-band">
          <div className="three-as-label"><i aria-hidden="true">A</i><div><b>Augment</b><small>Improve authentic practice</small></div></div>
          <p>AI-enabled capabilities that strengthen a real professional workflow.</p>
          <em>Generate · compare · analyse · improve</em>
        </section>
        <section className="three-as-band anchor-band">
          <div className="three-as-label"><i aria-hidden="true">A</i><div><b>Anchor</b><small>Protect the foundations</small></div></div>
          <p>Core disciplinary, human and professional capabilities students must develop.</p>
          <em>Knowledge · skills · reasoning · judgement</em>
        </section>
      </div>
      <div className="infographic-note"><span aria-hidden="true">↑</span><p><strong>Start with Anchor.</strong> Then identify where AI may Augment practice or Advance the discipline.</p></div>
    </figure>
  );
}

function PairInfographic() {
  const stages = [
    { letter: "P", name: "Problem", action: "Frame the task", detail: "Clarify the purpose, context, constraints and required outcome.", cue: "What are we trying to solve?", tone: "problem" },
    { letter: "A", name: "AI", action: "Choose deliberately", detail: "Decide whether AI is suitable, which tool fits and what information can be used safely.", cue: "What can the tool help with?", tone: "ai" },
    { letter: "I", name: "Interaction", action: "Work critically", detail: "Question, refine, compare and check the output before combining it with your own knowledge.", cue: "How will we test the output?", tone: "interaction" },
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

function SectionVisual({ title }: { title: string }) {
  if (title.startsWith("Part 1")) return (
    <figure className="concept-visual ai-map-visual" aria-label="AI may appear across teaching preparation, student learning, assessment and feedback">
      <figcaption><span>In your module</span><strong>Where might AI appear?</strong></figcaption>
      <div className="ai-map"><div className="ai-map-core">AI</div><div className="map-item map-a"><b>Prepare</b><small>Examples · activities</small></div><div className="map-item map-b"><b>Learn</b><small>Explain · practise</small></div><div className="map-item map-c"><b>Assess</b><small>Create · demonstrate</small></div><div className="map-item map-d"><b>Feedback</b><small>Review · improve</small></div></div>
    </figure>
  );
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
          <button className="chapter-step next-step" onClick={() => setActive((index) => Math.min(sections.length - 1, index + 1))} disabled={active === sections.length - 1} aria-label="Next section"><b>Next</b><span aria-hidden="true">→</span></button>
        </div>
      </nav>

      <main className="reader">
        <div className={`section-intro tone-${meta.tone}`}>
          <div className="section-mark">{meta.mark}</div>
          <div>
            <div className="section-kicker">{meta.label}</div>
          </div>
        </div>
        <h1 className="page-title">{active === 0 ? current.title : current.shortTitle}</h1>
        {active === 0 ? <OpeningVisual /> : <SectionVisual title={current.title} />}
        {active > 0 && active !== 5 && <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />}
        <article
          key={current.id}
          className="course-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(withoutTitle(current.markdown)) }}
        />

        {active === 5 && <SectionInteractive title={current.title} notes={activityNotes} onChange={setActivityValue} />}

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
