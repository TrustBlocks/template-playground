import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom";
import useAppStore from "../../../store/store";
import PreviewDrawer from "../../../components/designV2/PreviewDrawer";
import { PREVIEW } from "../../../components/designV2/constants";

describe("PreviewDrawer", () => {
  afterEach(cleanup);

  it("shows the agreement as drafted, sanitized", () => {
    useAppStore.setState({
      error: undefined,
      agreementHtml: '<h1>CONTRACTOR PAY REQUEST</h1><p>PROJECT: STR-27</p><img src=x onerror="alert(1)">',
    });
    render(<PreviewDrawer open onClose={() => undefined} />);
    const page = screen.getByLabelText(PREVIEW.ariaLabel);
    expect(page).toHaveTextContent("CONTRACTOR PAY REQUEST");
    expect(page).toHaveTextContent("PROJECT: STR-27");
    expect(page.innerHTML).not.toContain("onerror");
    expect(screen.getByRole("button", { name: PREVIEW.pdf })).toBeEnabled();
  });

  it("says why, when the template does not draft -- and offers no PDF", () => {
    useAppStore.setState({ agreementHtml: "<p>stale</p>", error: "Unknown property 'contractNumbr'" });
    render(<PreviewDrawer open onClose={() => undefined} />);
    expect(screen.getByText(PREVIEW.notDrafted)).toBeInTheDocument();
    expect(screen.getByText("Unknown property 'contractNumbr'")).toBeInTheDocument();
    expect(screen.queryByText("stale")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: PREVIEW.pdf })).toBeDisabled();
  });

  it("says it is drafting before there is anything to show", () => {
    useAppStore.setState({ agreementHtml: "", error: undefined });
    render(<PreviewDrawer open onClose={() => undefined} />);
    expect(screen.getByText(PREVIEW.drafting)).toBeInTheDocument();
  });
});
