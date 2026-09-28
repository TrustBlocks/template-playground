import * as playground from "./playground";
import * as helloworld from "./helloworld";
import * as formulanow from "./formulanow";
import * as join from "./join";
import * as clause from "./clause";
import * as list from "./list";
import * as optional from "./optional";
import * as markdown from "./markdown";
import * as formula from "./formula";
import * as clausecondition from "./clausecondition";
import * as invitation from "./invitation";
import * as announcement from "./announcement";
import * as blank from "./blank";
import * as paymentReceipt from './paymentReceipt';
import * as employmentOffer from "./employmentOffer";
import * as nda from "./nda";
import * as counterLogic from "./counterLogic";
import * as latePaymentPenalty from "./latePaymentPenalty";
import { TRUSTBLOCKS_SAMPLES } from "./trustblocks.generated";

export type Sample = {
  NAME: string;
  MODEL: string;
  TEMPLATE: string;
  DATA: object;
  /** One line on what the template is -- Trustblocks' package.json description. */
  DESCRIPTION?: string;
  /**
   * Optional Clojure logic -- the clause, one expression, run by
   * trustblocks-logic.js (see src/store/store.ts). When present, the Logic
   * Editor and Contract Runner panels are activated.
   */
  LOGIC?: string;
  /** Optional lifecycle (Trustblocks lifecycle.json): which events may happen, from which states, certified how. */
  LIFECYCLE?: object;
  /** Default request JSON shown in the Contract Runner request editor (only used when LOGIC is set). */
  REQUEST?: object;
};

// Trustblocks' templates first (src/samples/trustblocks.generated.ts, from
// trustblocks-templates), then Accord's own text samples. Accord's
// TypeScript-logic samples (latePaymentPenalty, counterLogic) stay in the
// tree for easy merges from upstream but are not listed: this playground
// runs Clojure logic, and Accord's own playground runs theirs.
void latePaymentPenalty;
void counterLogic;

export const SAMPLES: Array<Sample> = [
  ...TRUSTBLOCKS_SAMPLES,
  playground,
  helloworld,
  employmentOffer,
  formula,
  formulanow,
  join,
  nda,
  clause,
  clausecondition,
  invitation,
  announcement,
  blank,
  list,
  optional,
  markdown,
  paymentReceipt
];
