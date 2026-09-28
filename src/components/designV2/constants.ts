/**
 * User-facing strings, URLs and routes for the design-v2 layout.
 * Components import from here instead of embedding literals, so copy can be
 * reviewed and changed in one place (and later localised).
 */
import { NAME as BLANK_SAMPLE_NAME } from "../../samples/blank";

export const URLS = {
  discord: "https://discord.com/invite/Zm99SKhhtA",
  github: "https://github.com/accordproject/template-playground",
  readme: "https://github.com/accordproject/template-playground/blob/main/README.md",
  issues: "https://github.com/accordproject/template-playground/issues",
  engineDocs: "https://github.com/accordproject/template-engine/blob/main/README.md",
  concertoSite: "https://concerto.accordproject.org/",
  concertoSpec: "https://concerto.accordproject.org/docs/category/specification",
  templateMark: "https://github.com/accordproject/markdown-transform/blob/main/packages/markdown-template/README.md",
  // A clause here is Clojure, run by Trustblocks' clause runtime.
  logicDocs: "https://github.com/TrustBlocks/trustblocks-templates/blob/main/docs/runtime.md",
  concertoIntro: "https://concerto.accordproject.org/docs/intro",
  /** Docs site: what a template is made of (text, model, logic). "How it works" on the hero opens it. */
  templateDocs: "https://docs.accordproject.org/docs/accordproject-template/",
} as const;

export const RAIL = {
  navLabel: "Playground navigation",
  menuButton: "Playground menu",
  settings: "Settings",
  discord: "Discord",
  github: "GitHub",
  menuTitle: "Playground",
  menuSubtitle: "Open a demo, learn the format, or start over.",
  items: {
    demo: { label: "Open the demo document", hint: (sample: string) => `See the rendered ${sample} as a signer would` },
    tour: { label: "Replay the guided tour", hint: "Back to step 0 — pick a starting point" },
    examples: { label: "Browse example templates", hint: "Employment offer, NDA, supply agreement…" },
    docs: { label: "Docs: template format", hint: "Text, model and logic explained" },
    reset: { label: "Reset the playground", hint: "Clear edits and start from the sample" },
  },
} as const;

export const HEADER = {
  eyebrow: "TRUSTBLOCKS · TEMPLATE PLAYGROUND",
  docs: "docs ↗",
  help: "Help",
  helpMenuLabel: "Help",
  helpGroupInfo: "Info",
  helpGroupDocs: "Documentation",
  stepperLabel: "Steps",
  links: {
    about: "About",
    community: "Community",
    issues: "Issues",
    documentation: "Documentation",
  },
} as const;

export const FOOTER = {
  noProblems: "✓ no problems",
  applyAndCompileDirty: "Apply & Compile*",
  /** Problems pill while the app store reports an error; the full message follows it. */
  problem: "✕ error",
  problemLabel: "Problem",
  /** Problems pill on the Simulate step: "✕ 1 failed run · run #3" */
  failedRuns: (count: number, lastId: string) =>
    `✕ ${count} failed ${count === 1 ? "run" : "runs"} · run ${lastId}`,
  back: "← Back",
  applyAndCompile: "Apply & Compile",
  next: "Next →",
} as const;

export const HELP_RAIL = {
  ariaLabel: "Step guidance",
  checklist: "CHECKLIST",
  tabWhy: "WHY THIS STEP",
  tabHow: "HOW IT WORKS",
  /** "2 / 3" done-of-total counter next to the checklist title. */
  count: (done: number, total: number) => `${done} / ${total}`,
  close: "Close help",
  /** Chip next to the step title that brings the rail back. */
  reopen: "? Help",
} as const;

export const PREVIEW = {
  ariaLabel: "Preview",
  /** Toggle in the Text and Data step headers; aria-pressed says whether the drawer is open. */
  toggle: "◧ Preview",
  title: "Preview",
  liveBadge: "live",
  pdf: "↓ PDF",
  close: "Close preview",
} as const;

export const WELCOME = {
  /**
   * Accord Project's wordmark: this is Trustblocks' fork of Accord's
   * playground (github.com/TrustBlocks/template-playground), and says so.
   */
  logoAlt: "Built on Accord Project",
  logoSrc: `${import.meta.env.BASE_URL}APLogo.png`,
  titleLine: "Contracts a town can read",
  titleAccent: "and software can run.",
  subtitleLine1: "Trustblocks' fork of Accord Project's Template Playground: the logic is Clojure, run exactly as Trustblocks runs it.",
  subtitleLine2: "Build and test a template in your browser — every lifecycle step, every refusal.",
  start: "Start building",
  /** Opens URLS.templateDocs in a new tab. */
  howItWorks: "How it works ↗",
} as const;

export const START = {
  title: "Choose a template",
  hint: "everything stays editable later",
  blank: "+ Start blank",
  blankName: "Blank template",
  /** Primary button on every card: pick the template and open the first editor step. */
  open: "Start with this template →",
  /** Accessible name of a card's button, so each one is distinct: "Start with Counter Contract". */
  openLabel: (name: string) => `Start with ${name}`,
  /** Tag on the card whose template is currently loaded (shown after coming back from a later step). */
  current: "✓ current",
  /** Accessible name of the list of things a card's template demonstrates. */
  learnLabel: (name: string) => `What ${name} demonstrates`,
} as const;

export type StartAccent = "teal" | "amber" | "blue";
/** Which of the three line-art illustrations (see SampleArt.tsx) a card shows. */
export type StartArt = "counter" | "offer" | "nda";

/** One card in the "Choose a template type" gallery. */
export interface StartSample {
  /** Short display name on the card. */
  name: string;
  /** NAME of the matching sample in src/samples, loaded when the user starts with this template. */
  sampleName: string;
  /** Colour of the card's spine and illustration. */
  accent: StartAccent;
  /** Illustration at the top of the card. */
  art: StartArt;
  /** One line under the name: what the template is, in plain words. */
  tagline: string;
  /**
   * Two or three short points on what the reader learns from this template —
   * the reason to pick it over the others. The gallery is a curated set, so
   * this matters more than a text preview.
   */
  demonstrates: readonly string[];
}

/**
 * Gallery cards shown on the Start step: Trustblocks' templates, from
 * trustblocks-templates (src/samples/trustblocks.generated.ts). Every card's
 * sample runs -- a clause, a lifecycle, or both -- so every card walks the
 * same steps.
 */
export const START_SAMPLES: readonly StartSample[] = [
  {
    name: "Contractor Pay Request",
    sampleName: "Trustblocks · Street Resurfacing Pay Application",
    accent: "teal",
    art: "counter",
    tagline: "A lifecycle, certified at every step — start here.",
    demonstrates: [
      "Received, inspected, certified, approved, paid",
      "Checks the Contractor's figures to the cent",
      "Refuses what the engineer has not approved",
    ],
  },
  {
    name: "Town Manager Contract",
    sampleName: "Trustblocks · Manager Employment Contract",
    accent: "amber",
    art: "offer",
    tagline: "Approved by the Council, certified by the Clerk.",
    demonstrates: [
      "One approval, certified by the Town Clerk",
      "Attestations only after it",
      "An effective date that may be retroactive",
    ],
  },
  {
    name: "Vendor Information Form",
    sampleName: "Trustblocks · Street Resurfacing Vendor Form",
    accent: "blue",
    art: "nda",
    tagline: "A lifecycle and no clause at all.",
    demonstrates: [
      "Received by the Finance Director",
      "Then given a vendor number",
      "Nothing else to decide",
    ],
  },
];

/**
 * NAME of the sample in src/samples to load for a card picked on the Start
 * step, or undefined when nothing (or an unknown name) is selected.
 */
export const sampleNameFor = (selectedTemplate: string | null): string | undefined => {
  if (selectedTemplate === START.blankName) return BLANK_SAMPLE_NAME;
  return START_SAMPLES.find((card) => card.name === selectedTemplate)?.sampleName;
};

/**
 * Step "Logic": the clause, clause.clj, in Clojure -- checked by Trustblocks'
 * clause runtime on Apply & Compile, and run by it in Simulate.
 */
export const LOGIC = {
  icon: "ƒ",
  title: "Add logic",
  subtitle:
    "One expression, one job: given the contract, a request, the state and the time, say what follows — or refuse.",
  paneLabel: "Logic",
  file: "clause.clj",
  badge: "Clojure",
  copy: "⧉ copy",
  copied: "clause.clj copied",
  copyFailed: "Couldn't copy — the clipboard is not available here",
  doneCount: (done: number, total: number) => `${done} of ${total} done`,
  chipsLabel: "Progress",
  /** Tag on the types chip: the request/response transactions found in model.cto, or that they are missing. */
  typesFound: (request: string, response: string) => `${request} → ${response}`,
  typesMissing: "not in model.cto",
  typesMissingHint: "Declare a request and a response transaction in model.cto",
  /** The two parts of the job, as chips in the card head; the hints are their tooltips. */
  chips: {
    types: {
      label: "Request & Response types",
      hint: "declared in model.cto",
      action: "model.cto ‣",
    },
    pair: {
      label: "The clause",
      hint: "answer each request, or refuse it by throwing",
    },
  },
  /** Same five states, same order, as the legacy logic panel's badge. */
  status: {
    dirty: "unsaved changes",
    compiling: "checking…",
    failed: "refused by the vocabulary",
    compiled: "checked",
    notCompiled: "not checked yet",
    empty: "no clause",
  },
  help: {
    checklistTitle: "BEFORE SIMULATE",
    why: {
      note:
        "Logic is optional — templates without it still render. With it, the contract answers requests and keeps state between them. It runs in Trustblocks' clause runtime: no clock, no I/O, so the same request always gets the same answer — here and in Trustblocks.",
      links: [{ label: "The clause runtime", href: URLS.logicDocs }],
    },
    how: [
      "data, request, state and now are bound; state is nil before the first event.",
      "Return {:response …} and, when the state changes, {:state …}.",
      "Refuse by throwing: (throw (ex-info \"Not yet approved\" {})).",
      "A lifecycle.json decides which events may happen, and who certifies them.",
    ],
  },
} as const;

/** Step "Text": text.md in the TemplateMark editor, wired to the app store. */
export const TEXT = {
  icon: "¶",
  title: "Write the agreement text",
  subtitle: "Plain markdown plus variables in double braces that pull values from your model.",
  paneLabel: "Text",
  file: "text.md",
  badge: "TemplateMark",
  copy: "⧉ copy",
  copied: "text.md copied",
  ok: "✓ renders",
  error: "✕ error",
  toolbarLabel: "Formatting",
  /** Buttons map onto the legacy markdown editor commands. */
  toolbar: [
    { key: "toggleBold", label: "B", title: "Bold", className: "nd-tb-bold" },
    { key: "toggleItalic", label: "I", title: "Italic", className: "nd-tb-italic" },
    { key: "toggleHeading1", label: "H1", title: "Heading 1", className: "" },
    { key: "toggleHeading2", label: "H2", title: "Heading 2", className: "" },
    { key: "toggleUnorderedList", label: "•", title: "Bulleted list", className: "" },
    { key: "insertLink", label: "↗", title: "Insert link", className: "" },
  ],
  help: {
    checklistTitle: "THIS STEP NEEDS",
    checks: { renders: "the text renders" },
    why: {
      note:
        "This is what a human signs or an agent reads. Every variable resolves against the data model, so a typo surfaces here long before execution.",
      links: [{ label: "TemplateMark syntax", href: URLS.templateMark }],
    },
    how: [
      "Markdown handles headings, bold and lists.",
      "Double braces pull a value straight from the model.",
      "The preview re-renders on every change.",
    ],
  },
} as const;

/** Step "Data": model.cto on the left, data.json on the right — both wired to the app store. */
export const MODEL_DATA = {
  icon: "⬡",
  title: "Model the data",
  subtitle:
    "Declare every value once as a Concerto concept on the left, then give it a concrete value on the right. Both feed the preview live.",
  format: "≡ format",
  copy: "⧉ copy",
  reset: "↺ reset",
  /** Accessible name of the × on a pane header. */
  closePane: (file: string) => `Close ${file}`,
  /** Label of the chip that brings a closed pane back. */
  reopenPane: (file: string) => `+ ${file}`,
  keepOneOpen: "Keep at least one panel open",
  model: {
    paneLabel: "Model",
    file: "model.cto",
    badge: "Concerto",
    badgeHref: URLS.concertoSite,
    badgeTitle: "Open the Concerto site",
    ok: "✓ parses",
    copied: "model.cto copied",
    formatFailed: "Fix Concerto syntax errors before formatting.",
  },
  data: {
    paneLabel: "Data",
    file: "data.json",
    badge: "instance",
    ok: "✓ valid against the model",
    /** Shown instead of the ✓ while the model itself does not parse. */
    notChecked: "○ not checked — fix the model first",
    formatFailed: "Fix JSON syntax errors before formatting.",
    resetDone: (sample: string) => `data.json reset to the ${sample} sample`,
    resetTitle: (sample: string) => `Restore the ${sample} sample data`,
    resetUnavailable: "No sample to reset to.",
  },
  /** Status of a pane whose file the app store rejected; the message itself is in the footer. */
  error: "✕ error",
  /** Content of the help rail for this step. */
  help: {
    checklistTitle: "THIS STEP NEEDS",
    checks: {
      modelParses: "the model parses",
      dataValid: "data matches model",
      /** Tag on the data check while the model does not parse. */
      needsModel: "fix model",
    },
    why: {
      note:
        "The model is the contract’s vocabulary: name a field once and the text and the logic can use it. The data is the instance you test with, checked against the model field by field.",
      links: [
        { label: "Concerto site", href: URLS.concertoSite },
        { label: "Concerto specification", href: URLS.concertoSpec },
      ],
    },
    how: [
      "A namespace + version names your model so it can be shared.",
      "Concepts declare the fields of the agreement, each with a type such as String, Integer or DateTime.",
      "The data gives those fields concrete values and is checked against the model field by field.",
      "Valid data is what the preview and the simulator run on.",
    ],
  },
} as const;

/**
 * Step "Simulate". Plain words on purpose: the contract is "started" and
 * "sent a message", not initialised and sent a request — the request /
 * response vocabulary stays on the Logic step where the types are declared.
 */
export const SIMULATE = {
  title: "Simulate",
  restart: "↺ restart",
  restartHint: "Start the contract again and clear the runs",
  runsLabel: "Runs",
  /** "3 runs · 2 ok · 1 failed" — the pill next to the title. */
  stats: (runs: number, ok: number, failed: number) =>
    `${runs} ${runs === 1 ? "run" : "runs"} · ${ok} ok · ${failed} failed`,
  noRuns: "Nothing has happened yet — start the contract, then send its first event.",
  init: "▶ Start the contract",
  newRequest: "Send a message to the contract",
  json: "json",
  reuse: (id: string) => `reuse ${id} ▾`,
  reuseMenuLabel: "Reuse an earlier message",
  send: "▶ Send",
  sendHintNoInit: "Start the contract before sending a message",
  request: "Message",
  requestActions: "copy",
  copied: "copied",
  /** Tabs under the request — the same three the legacy ContractExecutionTabs shows. */
  resultLabel: "Result",
  response: "Response",
  errorTab: "Error",
  stateAfter: "State after",
  /** "Events (2)" */
  eventsTab: (count: number) => `Events (${count})`,
  /** "thrown in trigger() — state was left unchanged" */
  thrownIn: (method: string) => `refused${method === "init" ? " at the start" : ""} — state was left unchanged`,
  /** Second line of the error pane when the message never reached the logic. */
  notSent: "the message was not sent — fix the JSON and send again",
  openTrigger: "open the clause ↗",
  stateUnchanged: "This run failed, so the state is the same as before it.",
  noState: "No state yet — the lifecycle begins with the first event.",
  rerun: "↻ re-run",
  noSelection: "Pick a run on the left to see what was sent and what came back.",
  status: { ok: "✓ ok", failed: "✕ failed" },
  summary: {
    init: "contract started",
    initFailed: "could not start",
    triggerFailed: "refused",
    invalidRequest: "message is not valid JSON",
  },
  blocked: {
    title: "Simulate can’t run yet",
    body: "The clause hasn’t passed the runtime’s check yet, so there is nothing to send a message to. Finish the Logic step and hit Apply & Compile.",
    stay: "Stay here",
    jump: "Jump back to Logic",
  },
} as const;

export const DEPLOY = {
  title: "Deploy",
  cards: ["Download PDF", "Share link", "Copy to clipboard"],
} as const;
