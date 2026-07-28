// Renders the same SVG markup lucide-react produces at runtime, so the static
// LMS build can reuse the site's stylesheet without any React on the page.
import { __iconNode as arrowLeft } from "lucide-react/dist/esm/icons/arrow-left.mjs";
import { __iconNode as arrowLeftRight } from "lucide-react/dist/esm/icons/arrow-left-right.mjs";
import { __iconNode as arrowRight } from "lucide-react/dist/esm/icons/arrow-right.mjs";
import { __iconNode as bookOpen } from "lucide-react/dist/esm/icons/book-open.mjs";
import { __iconNode as bot } from "lucide-react/dist/esm/icons/bot.mjs";
import { __iconNode as check } from "lucide-react/dist/esm/icons/check.mjs";
import { __iconNode as checkCircle2 } from "lucide-react/dist/esm/icons/circle-check-big.mjs";
import { __iconNode as chevronRight } from "lucide-react/dist/esm/icons/chevron-right.mjs";
import { __iconNode as clipboardCheck } from "lucide-react/dist/esm/icons/clipboard-check.mjs";
import { __iconNode as compass } from "lucide-react/dist/esm/icons/compass.mjs";
import { __iconNode as externalLink } from "lucide-react/dist/esm/icons/external-link.mjs";
import { __iconNode as eye } from "lucide-react/dist/esm/icons/eye.mjs";
import { __iconNode as layers } from "lucide-react/dist/esm/icons/layers.mjs";
import { __iconNode as lightbulb } from "lucide-react/dist/esm/icons/lightbulb.mjs";
import { __iconNode as refreshCw } from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import { __iconNode as rocket } from "lucide-react/dist/esm/icons/rocket.mjs";
import { __iconNode as scale } from "lucide-react/dist/esm/icons/scale.mjs";
import { __iconNode as shieldCheck } from "lucide-react/dist/esm/icons/shield-check.mjs";
import { __iconNode as target } from "lucide-react/dist/esm/icons/target.mjs";
import { __iconNode as userRound } from "lucide-react/dist/esm/icons/user-round.mjs";
import { __iconNode as users } from "lucide-react/dist/esm/icons/users.mjs";
import { __iconNode as x } from "lucide-react/dist/esm/icons/x.mjs";

const NODES = {
  ArrowLeft: arrowLeft,
  ArrowLeftRight: arrowLeftRight,
  ArrowRight: arrowRight,
  BookOpen: bookOpen,
  Bot: bot,
  Check: check,
  CheckCircle2: checkCircle2,
  ChevronRight: chevronRight,
  ClipboardCheck: clipboardCheck,
  Compass: compass,
  ExternalLink: externalLink,
  Eye: eye,
  Layers: layers,
  Lightbulb: lightbulb,
  RefreshCw: refreshCw,
  Rocket: rocket,
  Scale: scale,
  ShieldCheck: shieldCheck,
  Target: target,
  UserRound: userRound,
  Users: users,
  X: x,
};

const KEBAB = {
  ArrowLeft: "arrow-left",
  ArrowLeftRight: "arrow-left-right",
  ArrowRight: "arrow-right",
  BookOpen: "book-open",
  Bot: "bot",
  Check: "check",
  CheckCircle2: "circle-check-big",
  ChevronRight: "chevron-right",
  ClipboardCheck: "clipboard-check",
  Compass: "compass",
  ExternalLink: "external-link",
  Eye: "eye",
  Layers: "layers",
  Lightbulb: "lightbulb",
  RefreshCw: "refresh-cw",
  Rocket: "rocket",
  Scale: "scale",
  ShieldCheck: "shield-check",
  Target: "target",
  UserRound: "user-round",
  Users: "users",
  X: "x",
};

// React camelCases these; the DOM wants them hyphenated.
const ATTR = {
  strokeWidth: "stroke-width",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  fillRule: "fill-rule",
  clipRule: "clip-rule",
};

function attrs(props) {
  return Object.entries(props)
    .filter(([key]) => key !== "key")
    .map(([key, value]) => ` ${ATTR[key] ?? key}="${value}"`)
    .join("");
}

export function icon(name, { size = 24, strokeWidth = 2, className = "" } = {}) {
  const node = NODES[name];
  if (!node) throw new Error(`Unknown icon: ${name}`);
  const children = node.map(([tag, props]) => `<${tag}${attrs(props)} />`).join("");
  const classes = ["lucide", `lucide-${KEBAB[name]}`, className].filter(Boolean).join(" ");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"` +
    ` fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"` +
    ` stroke-linejoin="round" class="${classes}" aria-hidden="true">${children}</svg>`
  );
}
