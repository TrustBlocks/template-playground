import { useRef, useState } from "react";
import { Button, Drawer, Grid, message } from "antd";
import DOMPurify from "dompurify";
import useAppStore from "../../store/store";
import { PREVIEW } from "./constants";

interface PreviewDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Preview drawer anchored to the right edge of the workspace. Rendered inline
 * (getContainer={false}) so it overlays only the v2 body, without a mask.
 *
 * Shows the agreement as drafted: the store's agreementHtml, which it
 * rebuilds from the text, model and data on every edit -- the same rendering
 * the legacy layout's preview (AgreementHtml.tsx) shows -- or, while the
 * template does not draft, why not. "PDF" saves that page, as the legacy
 * layout's download does.
 */
const PreviewDrawer = ({ open, onClose }: PreviewDrawerProps) => {
  const screens = Grid.useBreakpoint();
  const agreementHtml = useAppStore((s) => s.agreementHtml);
  const error = useAppStore((s) => s.error);
  const page = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const savePdf = async () => {
    if (!page.current) return;
    setSaving(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 10,
          filename: "agreement.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(page.current)
        .save();
    } catch (e) {
      console.error("PDF generation failed:", e);
      void message.error(PREVIEW.pdfFailed);
    } finally {
      setSaving(false);
    }
  };

  const drafted = Boolean(agreementHtml) && !error;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      getContainer={false}
      mask={false}
      placement="right"
      width={screens.md ? "min(412px, 62%)" : "100%"}
      rootClassName="nd-preview"
      title={
        <span className="nd-preview-title">
          {PREVIEW.title} <span className="nd-badge nd-badge-teal">{PREVIEW.liveBadge}</span>
        </span>
      }
      extra={
        <Button type="text" size="small" onClick={() => { void savePdf(); }} loading={saving} disabled={!drafted}>
          {PREVIEW.pdf}
        </Button>
      }
    >
      {drafted ? (
        <div
          ref={page}
          className="nd-preview-page agreement"
          aria-label={PREVIEW.ariaLabel}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(agreementHtml) }}
        />
      ) : (
        <div className="nd-preview-page nd-preview-empty">
          {error ? (
            <>
              <p className="nd-preview-empty-title">{PREVIEW.notDrafted}</p>
              <p className="nd-preview-error">{error}</p>
            </>
          ) : (
            <p className="nd-preview-empty-title">{PREVIEW.drafting}</p>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default PreviewDrawer;
