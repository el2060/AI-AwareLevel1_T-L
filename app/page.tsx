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

const sectionMeta = [
  { mark: "✦", label: "Start", tone: "mint" },
  { mark: "01", label: "Notice", tone: "blue" },
  { mark: "02", label: "Connect", tone: "violet" },
  { mark: "03", label: "Consider", tone: "coral" },
  { mark: "04", label: "Support", tone: "amber" },
  { mark: "05", label: "Structure", tone: "mint" },
  { mark: "06", label: "Clarify", tone: "blue" },
  { mark: "07", label: "Use wisely", tone: "violet" },
  { mark: "08", label: "Bring together", tone: "coral" },
  { mark: "↺", label: "Reflect", tone: "amber" },
  { mark: "✓", label: "Recap", tone: "mint" },
  { mark: "→", label: "Next step", tone: "blue" },
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

function PulseActivity() {
  const [selected, setSelected] = useState<string[]>([]);
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
            onClick={() => setSelected((items) => items.includes(option) ? items.filter((item) => item !== option) : [...items, option])}
          >
            {selected.includes(option) ? "✓ " : "+ "}{option}
          </button>
        ))}
      </div>
      {selected.length > 0 && <p className="pulse-note">Keep these areas in mind as you move through the course.</p>}
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
            onClick={() => step === next && setPicked([...picked, step])}
          >{step}</button>
        ))}
      </div>
      <p className="pair-hint">{complete ? "PAIR keeps the learning process visible from problem framing to reflection." : `Next: think about what comes ${picked.length === 0 ? "first" : "next"}.`}</p>
    </section>
  );
}

function StrategyMap() {
  const [active, setActive] = useState(0);
  const items = [
    ["3As", "What capabilities should students develop?"],
    ["PAIR", "How can students learn and work with AI?"],
    ["Assessment", "How will students show what they can do?"],
    ["Tools & data", "How should AI be used responsibly?"],
  ];
  return (
    <section className="strategy-map" aria-label="NP AI-enabled T&L approaches">
      <div className="strategy-orbit">
        <div className="orbit-core"><strong>AI-ready</strong><span>graduates</span></div>
        {items.map(([name], index) => <button key={name} className={`orbit-node node-${index} ${active === index ? "active" : ""}`} onClick={() => setActive(index)}>{name}</button>)}
      </div>
      <div className="strategy-copy"><span>{items[active][0]}</span><p>{items[active][1]}</p></div>
    </section>
  );
}

function SectionInteractive({ title }: { title: string }) {
  if (title.startsWith("Part 1")) return <PulseActivity />;
  if (title.startsWith("Part 2")) return <StrategyMap />;
  if (title.startsWith("Part 3")) return <ThreeAsActivity />;
  if (title.startsWith("Part 4")) return <ChoiceCheck eyebrow="Support or replace?" question="Which use better protects the learning?" choices={[
    { label: "AI explains a concept; the student checks it and then practises.", correct: true, feedback: "AI supports clarification, while the student still checks and practises the intended learning." },
    { label: "AI completes the assignment; the student submits the response.", correct: false, feedback: "Here, AI replaces the thinking and performance the student needs to develop." },
  ]} />;
  if (title.startsWith("Part 5")) return <PairBuilder />;
  if (title.startsWith("Part 6")) return <ChoiceCheck eyebrow="Assessment judgement" question="A student declares that GenAI created a required interview. Is that acceptable?" choices={[
    { label: "Yes. Declaration makes the use acceptable.", correct: false, feedback: "Declaration is required, but it does not make a prohibited use acceptable." },
    { label: "It depends on how realistic the generated responses are.", correct: false, feedback: "The issue is not realism. The assessment requires a real human interaction." },
    { label: "No. GenAI cannot replace the real interaction required by the task.", correct: true, feedback: "Correct. Simulating a required human interaction is always prohibited." },
  ]} />;
  if (title.startsWith("Part 7")) return <ChoiceCheck eyebrow="Tool judgement" question="Which is the soundest use?" choices={[
    { label: "Use Pair.gov.sg to suggest activities, then check and adapt one.", correct: true, feedback: "The purpose is clear, the tool is suitable, and the lecturer reviews the output." },
    { label: "Use an unapproved public tool to analyse named student records.", correct: false, feedback: "The tool is not approved for the information involved." },
    { label: "Let an AI summary decide which students need intervention.", correct: false, feedback: "AI may support an initial review, but a person must interpret the context and make the decision." },
  ]} />;
  return null;
}

function OpeningVisual() {
  return (
    <div className="opening-visual" aria-label="AI-ready professionals combine human qualities, domain expertise and responsible AI use">
      <div className="visual-label">AI-ready professional</div>
      <div className="venn human"><span>Human</span><small>judgement</small></div>
      <div className="venn domain"><span>Domain</span><small>expertise</small></div>
      <div className="venn ai"><span>AI</span><small>capability</small></div>
    </div>
  );
}

export default function Home() {
  const [course, setCourse] = useState("");
  const [active, setActive] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);

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
      JSON.stringify({ completed, notes, active }),
    );
  }, [completed, notes, active, course]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  function selectSection(index: number) {
    setActive(index);
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
        <div className="brand">
          <span className="brand-mark">NP</span>
          <span>AI in T&amp;L Essentials</span>
        </div>
        <div className="top-actions">
          <span className="level-badge">Level 1 · AI-Aware</span>
          <span className="progress-summary">{completed.length}/{sections.length} complete</span>
          <button className="notes-button" onClick={() => setNotesOpen(true)}>
            My notes
          </button>
        </div>
      </header>

      <nav className="course-nav" aria-label="Course sections">
        <div className="course-nav-inner">
          {sections.map((section, index) => (
            <button
              key={section.id}
              className={`chapter-link ${index === active ? "active" : ""}`}
              onClick={() => selectSection(index)}
              aria-current={index === active ? "page" : undefined}
            >
              <span className={`chapter-number ${completed.includes(section.id) ? "done" : ""}`}>
                {completed.includes(section.id) ? "✓" : index + 1}
              </span>
              <span>{section.shortTitle}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="reader">
        <div className={`section-intro tone-${meta.tone}`}>
          <div className="section-mark">{meta.mark}</div>
          <div>
            <div className="section-kicker">Section {active + 1} of {sections.length}</div>
            <span>{meta.label}</span>
          </div>
        </div>
        {active === 0 && <OpeningVisual />}
        <article
          key={current.id}
          className="course-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(current.markdown) }}
        />

        <SectionInteractive title={current.title} />

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
