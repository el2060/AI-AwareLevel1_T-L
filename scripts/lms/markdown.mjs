// Direct port of the markdown renderer in app/page.tsx. Kept deliberately
// line-for-line with the original so the static build and the site agree; if
// the app's renderer changes, change this alongside it.
// The app inlines three glyphs by hand rather than through lucide.
const INFO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
const WARNING =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const CHECK_CIRCLE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';

export function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/ {2}$/, "<br />");
}

function isTableDivider(line) {
  return /^\|?[\s:|-]+\|[\s:|-]+\|?$/.test(line.trim());
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

export function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // HTML comments are authoring notes, never content.
    if (trimmed.startsWith("<!--") && !/^<!--[a-z0-9-]+-->$/.test(trimmed)) {
      while (i < lines.length && !lines[i].includes("-->")) i += 1;
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
      if (level === 2 && heading[2].trim() === "Key Takeaway") {
        const body = [];
        i += 1;
        while (i < lines.length && !/^#{1,4}\s+/.test(lines[i].trim()) && !/^---+$/.test(lines[i].trim())) {
          body.push(lines[i]);
          i += 1;
        }
        output.push(
          `<div class="key-takeaway"><p class="key-takeaway-head">${CHECK_CIRCLE}<span>${inlineMarkdown(heading[2])}</span></p>${markdownToHtml(body.join("\n"))}</div>`,
        );
        continue;
      }
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|") && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      output.push(
        `<div class="table-wrap"><table><thead><tr>${headers
          .map((cell) => `<th>${inlineMarkdown(cell)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      output.push(`<blockquote>${quote.map(inlineMarkdown).join("<br />")}</blockquote>`);
      continue;
    }

    const details = trimmed.match(/^:::details\s+(.+)$/);
    if (details) {
      const body = [];
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
      const body = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim() === ":::") i += 1;
      const glyph = kind === "warning" ? WARNING : INFO;
      output.push(
        `<div class="callout callout-${kind}"><p class="callout-head">${glyph}${inlineMarkdown(title)}</p>${markdownToHtml(body.join("\n"))}</div>`,
      );
      continue;
    }

    const labelOnly = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (labelOnly) {
      const cards = [];
      while (i < lines.length) {
        const currentLabel = lines[i].trim().match(/^\*\*(.+?)\*\*$/);
        if (!currentLabel) break;
        i += 1;
        while (i < lines.length && !lines[i].trim()) i += 1;

        const body = [];
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
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^-\s+/, ""));
        i += 1;
      }
      const listClass = items.length >= 5 ? "course-list course-list-long" : "course-list";
      output.push(`<ul class="${listClass}">${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      output.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [trimmed];
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
      output.push(`<details class="response"><summary>View suggested response</summary><p>${inlineMarkdown(text)}</p></details>`);
    } else {
      output.push(`<p>${inlineMarkdown(text)}</p>`);
    }
  }

  return output.join("\n");
}

export function makeId(title, index) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || `section-${index + 1}`;
}

export function shortTitle(title) {
  if (title === "AI T&L Essentials: Level 1 (AI-Aware)") return "Start here";
  return title.replace(/^Part \d+:\s*/, "");
}

export function splitSections(markdown) {
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

export function withoutTitle(markdown) {
  return markdown.replace(/^# .+\r?\n?/, "").trim();
}

export { INFO, WARNING, CHECK_CIRCLE };
