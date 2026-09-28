/**
 * What a clause is written against, read from model.cto: the @template
 * concept, the request/response transactions and the state asset. From
 * those, a clause skeleton -- Clojure, run by Trustblocks' clause runtime
 * (trustblocks-templates' runtime/) -- with the right $class names and
 * fields; and the "what to commit on Apply & Compile" rule shared by the
 * legacy LogicEditor and the design-v2 footer.
 */
import { ModelManager } from "@accordproject/concerto-core";

/** Generic fallback when model.cto declares no request/response transactions. */
export const DEFAULT_LOGIC_BOILERPLATE = `;; The clause: one expression, evaluated with data (the contract), request,
;; state (nil before the first event) and now (an ISO-8601 string) bound.
;; It returns {:response ...} and, when the state changes, {:state ...};
;; it refuses by throwing. No clock, no I/O -- the same inputs, the same answer.
(let [event (get request "$class")]
  (cond
    :else {:response {"$class" "org.example.Response"
                      "$timestamp" now}}))
`;

export interface LogicField {
  name: string;
  /** Concerto type name: String, Integer, DateTime, or a concept/enum name. */
  type: string;
  isArray: boolean;
  isOptional: boolean;
}

export interface LogicType {
  name: string;
  /** Fully qualified name, the value of $class. */
  fqn: string;
  /** Declared (non-system) properties. */
  fields: LogicField[];
  /** `identified by` field of an asset, if any. */
  identifier?: string;
}

/** The parts of model.cto that logic.ts talks to. Each is missing when the model does not declare it. */
export interface LogicModel {
  namespace: string;
  /** The @template concept (or the first concept). */
  template?: LogicType;
  /** Transaction named *Request, else the first transaction. */
  request?: LogicType;
  /** Transaction named *Response, else the second transaction. */
  response?: LogicType;
  /** Asset named *State, else the first asset. */
  state?: LogicType;
}

/* Concerto's declaration classes, typed by the methods used here. */
interface ConcertoProperty {
  getName(): string;
  getType(): string;
  isArray(): boolean;
  isOptional(): boolean;
}
interface ConcertoDeclaration {
  getName(): string;
  getFullyQualifiedName(): string;
  getProperties(): ConcertoProperty[];
  getIdentifierFieldName(): string | null;
  getDecorator(name: string): unknown;
  isTransaction(): boolean;
  isAsset(): boolean;
  isEvent(): boolean;
  isConcept(): boolean;
}

const toType = (d: ConcertoDeclaration): LogicType => ({
  name: d.getName(),
  fqn: d.getFullyQualifiedName(),
  identifier: d.getIdentifierFieldName() ?? undefined,
  fields: d
    .getProperties()
    .filter((p) => !p.getName().startsWith("$"))
    .map((p) => ({ name: p.getName(), type: p.getType(), isArray: p.isArray(), isOptional: p.isOptional() })),
});

const endingWith = (list: ConcertoDeclaration[], suffix: string) => list.find((d) => d.getName().endsWith(suffix));

/**
 * Parses model.cto (syntax only — imports are not resolved, so this works
 * offline and before the model validates) and picks out the logic types.
 * Null when the model is empty or does not parse.
 */
export const describeLogicModel = (modelCto: string): LogicModel | null => {
  if (modelCto.trim() === "") return null;
  try {
    const modelManager = new ModelManager({ offline: true });
    const modelFile = modelManager.addCTOModel(modelCto, undefined, true) as unknown as {
      getNamespace(): string;
      getAllDeclarations(): ConcertoDeclaration[];
    };
    const declarations = modelFile.getAllDeclarations();
    const transactions = declarations.filter((d) => d.isTransaction());
    const assets = declarations.filter((d) => d.isAsset());
    const concepts = declarations.filter((d) => d.isConcept() && !d.isTransaction() && !d.isAsset() && !d.isEvent());

    const request = endingWith(transactions, "Request") ?? transactions[0];
    const response = endingWith(transactions, "Response") ?? transactions.find((d) => d !== request);
    const state = endingWith(assets, "State") ?? assets[0];
    const template = concepts.find((d) => d.getDecorator("template")) ?? concepts[0];

    return {
      namespace: modelFile.getNamespace(),
      template: template && toType(template),
      request: request && toType(request),
      response: response && toType(response),
      state: state && toType(state),
    };
  } catch {
    return null;
  }
};

const PRIMITIVE_PLACEHOLDER: Record<string, string> = {
  String: '""',
  Integer: "0",
  Long: "0",
  Double: "0.0",
  Boolean: "false",
  DateTime: "now",
};

/** A first value for a field, as a map entry, with the type as a comment when it is not a primitive. */
const fieldLine = (field: LogicField, indent: string): string => {
  const value = field.isArray ? "[]" : (PRIMITIVE_PLACEHOLDER[field.type] ?? "nil");
  const note = field.isArray || field.type in PRIMITIVE_PLACEHOLDER ? "" : ` ; ${field.type}`;
  return `${indent}"${field.name}" ${value}${note}`;
};

const fieldLines = (type: LogicType | undefined, indent: string, skip: string[] = []): string[] =>
  (type?.fields ?? [])
    .filter((f) => !f.isOptional && !skip.includes(f.name))
    .map((f) => fieldLine(f, indent));

/**
 * A clause skeleton for the model: answering the request transaction with
 * the response transaction, its $class and required fields filled with
 * first values, and -- when the model has a state asset -- a state to
 * merge. Falls back to the generic boilerplate when the model has no
 * request/response transactions.
 */
export const scaffoldFromModel = (model: LogicModel | null): string => {
  if (!model?.request || !model.response) return DEFAULT_LOGIC_BOILERPLATE;
  const { request, response, state } = model;
  const stateLines = state
    ? [
        ``,
        `     ;; What changes in the state -- merged over the state as it was.`,
        `     :state (merge state`,
        `                   {"$class" "${state.fqn}"`,
        ...(state.identifier ? [`                    "${state.identifier}" (get data "${state.identifier}")`] : []),
        ...fieldLines(state, "                    ", state.identifier ? [state.identifier] : []),
        `                    })`,
      ]
    : [];

  return `;; The clause for ${model.namespace}: one expression, evaluated with data
;; (the contract), request, state (nil before the first event) and now bound.
;; It refuses by throwing, e.g. (throw (ex-info "Not yet approved" {})).
(let [event (get request "$class")]
  (cond
    (= event "${request.fqn}")
    {:response {"$class" "${response.fqn}"
                "$timestamp" now
${fieldLines(response, "                ").join("\n")}
                }${stateLines.length ? "" : "}"}
${stateLines.join("\n")}${stateLines.length ? "}" : ""}

    :else
    (throw (ex-info (str "This contract does not answer " event) {}))))
`;
};

/**
 * Source to commit on "Apply & Compile": the editor content, or — when both
 * the editor and the committed logic are empty — a skeleton built from the
 * model (the generic boilerplate if the model has no request/response).
 */
export const nextLogicSource = (editorLogicTs: string, logicTs: string, modelCto: string): string =>
  editorLogicTs.trim() === '' && logicTs.trim() === '' ? scaffoldFromModel(describeLogicModel(modelCto)) : editorLogicTs;
