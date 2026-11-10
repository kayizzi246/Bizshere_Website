import { ImageResponse } from "next/og";

/**
 * The picture shown when a link to the site is shared on WhatsApp, Facebook, X or LinkedIn:
 * the navy of the heroes, the name, and what is here. 1200×630, the size every network uses.
 */
export const runtime = "edge";
export const alt = "BizSphere-Ug: B2B Information Portal for business in Uganda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #071A33 0%, #0B2240 60%, #0E3A6E 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#F5A524", display: "flex", alignItems: "center", justifyContent: "center", color: "#071A33", fontSize: 40, fontWeight: 900 }}>B</div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>BizSphere-Ug</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 900, letterSpacing: -4, lineHeight: 1 }}>
            <span style={{ color: "#F5A524" }}>B2B&nbsp;</span><span>Information Portal</span>
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.82)", lineHeight: 1.3, maxWidth: 1000 }}>
            Market prices, business ideas, trusted suppliers, machines, funding and experts for business in Uganda.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 24, color: "rgba(255,255,255,0.7)" }}>
          <span style={{ padding: "8px 18px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.25)" }}>MTN MoMo</span>
          <span style={{ padding: "8px 18px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.25)" }}>Airtel Money</span>
          <span style={{ padding: "8px 18px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.25)" }}>Visa · Mastercard</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
