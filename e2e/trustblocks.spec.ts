import { test, expect, type Page } from "@playwright/test";
import LZString from "lz-string";
import { TRUSTBLOCKS_SAMPLES } from "../src/samples/trustblocks.generated";

/*
 * Trustblocks' templates, run in the browser by Trustblocks' own clause
 * runtime (public/trustblocks-logic.js, from trustblocks-templates): the
 * clause is checked by the runtime, each step is taken as Trustblocks takes
 * it -- the lifecycle first, then the clause -- and a refusal reads as it
 * does in Trustblocks.
 *
 * Locally, PW_CHANNEL=chrome runs it in the installed Chrome.
 */
test.use({ channel: process.env.PW_CHANNEL });

const PAY = "com.trustblocks.municipal.construction.payapplication@1.0.0.";
const VENDOR = "com.trustblocks.municipal.construction.vendorform@1.0.0.";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Skip the welcome and the logic tour -- but only in the page itself;
    // the logic sandbox is an opaque-origin frame with no storage.
    if (window.top === window) {
      localStorage.setItem("hasVisited", "true");
      localStorage.setItem("hasVisitedLogicTour", "true");
    }
  });
  await page.goto("/");
  await page.getByText("Start building").click();
});

async function openSimulate(page: Page, card: string) {
  await page.getByRole("button", { name: `Start with ${card}` }).click();
  await page.locator(".nd-step-label", { hasText: "Simulate" }).click();
  const start = page.getByRole("button", { name: /Start the contract/ });
  // Enabled once the runtime has loaded and checked the clause.
  await expect(start).toBeEnabled({ timeout: 20_000 });
  await start.click();
  await expect(page.locator(".nd-run-summary", { hasText: "contract started" })).toBeVisible();
}

/**
 * Sets the request as a whole -- through the store, since Monaco makes
 * replacing an editor's text by keyboard unreliable -- sends it, and checks
 * the new run's message is the one sent.
 */
async function send(page: Page, request: { $class: string }) {
  await page.evaluate((json) => {
    type Store = { getState(): { setRequestJson(json: string): void } };
    (window as unknown as { __playgroundStore: Store }).__playgroundStore.getState().setRequestJson(json);
  }, JSON.stringify(request, null, 2));
  await page.getByRole("button", { name: /Send/ }).click();
  await expect(detail(page).locator(".nd-sim-pane").first()).toContainText(request.$class);
}

const detail = (page: Page) => page.locator(".nd-sim-detail");
/** The runs badge: "3 runs · 3 ok · 0 failed". */
const stats = (page: Page) => page.locator(".nd-sim-head .nd-badge");

test("the clause is checked by the runtime", async ({ page }) => {
  await page.getByRole("button", { name: "Start with Contractor Pay Request" }).click();
  await page.locator(".nd-step-label", { hasText: "Logic" }).click();
  // The runtime's own check: "checked", not "refused by the vocabulary".
  await expect(page.getByText("checked", { exact: true }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("refused by the vocabulary")).toHaveCount(0);
});

test("a pay request: refused out of order, then received and inspected", async ({ page }) => {
  await openSimulate(page, "Contractor Pay Request");

  // The lifecycle begins with the pay request received; nothing else first.
  await send(page, { $class: PAY + "InspectionCertified", approvedPayItems: ["5.1"] });
  await expect(detail(page)).toContainText(
    "InspectionCertified cannot happen before the lifecycle has begun (no-transition)",
  );

  // Received -- certified, simulated, by a Receipt under the authority the
  // lifecycle names.
  await send(page, { $class: PAY + "PayRequestReceived" });
  await expect(stats(page)).toContainText("2 ok");
  await expect(detail(page)).toContainText("RECEIVE_PAY_APPLICATIONS");
  await detail(page).getByRole("tab", { name: "State after" }).click();
  await expect(detail(page)).toContainText('"status": "RECEIVED"');

  // Inspected: the clause records the pay items the engineer approved.
  await send(page, { $class: PAY + "InspectionCertified", approvedPayItems: ["5.1"] });
  await expect(stats(page)).toContainText("3 ok");
  await detail(page).getByRole("tab", { name: "State after" }).click();
  await expect(detail(page)).toContainText('"status": "INSPECTED"');
  await expect(detail(page)).toContainText('"approvedPayItems"');
});

test("the vendor form: a lifecycle and no clause", async ({ page }) => {
  await openSimulate(page, "Vendor Information Form");

  await send(page, { $class: VENDOR + "VendorFormReceived" });
  await send(page, { $class: VENDOR + "VendorNumberAssigned", vendorNumber: "V-10482" });
  await expect(stats(page)).toContainText("3 ok");
  await detail(page).getByRole("tab", { name: "State after" }).click();
  await expect(detail(page)).toContainText('"status": "VENDOR_NUMBER_ASSIGNED"');
});

test("a Trustblocks share link opens with its clause and lifecycle, ready to simulate", async ({ page }) => {
  // What Trustblocks' "Open in Template Playground" link carries
  // (com.trustblocks.model.playground/template-status).
  const manager = TRUSTBLOCKS_SAMPLES.find((s) => s.NAME === "Trustblocks · Manager Employment Contract")!;
  const data = LZString.compressToEncodedURIComponent(JSON.stringify({
    templateMarkdown: manager.TEMPLATE,
    modelCto: manager.MODEL,
    data: JSON.stringify(manager.DATA),
    agreementHtml: "",
    logicTs: manager.LOGIC,
    lifecycleJson: JSON.stringify(manager.LIFECYCLE),
  }));
  // Only the hash differs from the page already open, so load it afresh --
  // as following a link does.
  await page.goto(`/#data=${data}`);
  await page.reload();
  await page.getByText("Start building").click();
  await page.locator(".nd-step-label", { hasText: "Simulate" }).click();
  const start = page.getByRole("button", { name: /Start the contract/ });
  await expect(start).toBeEnabled({ timeout: 20_000 });
  await start.click();

  await send(page, { $class: "com.trustblocks.municipal.employment@1.0.0.BoardApprovalRequest" });
  await expect(stats(page)).toContainText("2 ok");
  await expect(detail(page)).toContainText("CERTIFY_MINUTES");
  await detail(page).getByRole("tab", { name: "State after" }).click();
  await expect(detail(page)).toContainText('"status": "APPROVED"');
});
