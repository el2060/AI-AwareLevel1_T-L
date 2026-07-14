"use client";

import { useEffect, useMemo, useState } from "react";

type Section = {
  id: string;
  title: string;
  shortTitle: string;
  markdown: string;
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

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">NP</span>
          <span>AI in T&amp;L Essentials</span>
        </div>
        <div className="top-actions">
          <span className="level-badge">Level 1 · AI-Aware</span>
          <button className="notes-button" onClick={() => setNotesOpen(true)}>
            My notes
          </button>
        </div>
      </header>

      <aside className="sidebar" aria-label="Course sections">
        <div className="progress-card">
          <div className="progress-copy">
            <span>Your progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track" aria-label={`${progress}% complete`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{completed.length} of {sections.length} sections</small>
        </div>

        <nav>
          {sections.map((section, index) => (
            <button
              key={section.id}
              className={`nav-item ${index === active ? "active" : ""}`}
              onClick={() => selectSection(index)}
              aria-current={index === active ? "page" : undefined}
            >
              <span className={`nav-dot ${completed.includes(section.id) ? "done" : ""}`}>
                {completed.includes(section.id) ? "✓" : index + 1}
              </span>
              <span>{section.shortTitle}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="reader">
        <div className="mobile-nav">
          <label htmlFor="section-select">Section</label>
          <select
            id="section-select"
            value={active}
            onChange={(event) => selectSection(Number(event.target.value))}
          >
            {sections.map((section, index) => (
              <option key={section.id} value={index}>
                {index + 1}. {section.shortTitle}
              </option>
            ))}
          </select>
        </div>

        <div className="section-kicker">
          Section {active + 1} of {sections.length}
        </div>
        <article
          className="course-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(current.markdown) }}
        />

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
