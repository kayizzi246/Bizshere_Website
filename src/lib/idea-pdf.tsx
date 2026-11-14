/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> draws into the PDF and has no alt prop */
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * The business plan PDF for one business idea (served by /business-ideas/[slug]/pdf and shown
 * inside the idea page). A4, brand colours: deep blue header band with the logo, the photo,
 * key facts as tiles, then overview, business profile, requirements, start-up budget and steps.
 *
 * It only lays out plain data: the route decides what the viewer may see (visitors get the
 * same preview as the page, members everything), so nothing hidden is ever passed in.
 */
export type IdeaPdfData = {
  name: string;
  category: string | null;
  summary: string | null;
  overview: string | null;
  logo: Buffer | null;
  photo: Buffer | null;
  photoCredit: string | null;
  url: string;
  reviewed: string;
  facts: [string, string][];
  profile: [string, string, string | null][];
  requirements: { name: string; group: string; key: boolean }[];
  requirementTotal: number;
  budgets: {
    label: string;
    place: string;
    lines: { item: string; group: string; qty: string; price: string; amount: string }[];
    hidden: number;
    total: string | null;
    assumptions: string | null;
  }[];
  steps: { n: number; title: string; text: string | null }[];
  hiddenSteps: number;
  member: boolean;
};

const C = { deep: "#0550ae", brand: "#0969da", tint: "#E7F2FA", accent: "#1f883d", accentTint: "#FEF1E4", ink: "#111111", soft: "#2B2B2B", muted: "#6B6B6B", line: "#E9E7E4", page: "#F4F7FA" };

const s = StyleSheet.create({
  page: { paddingBottom: 56, fontFamily: "Helvetica", fontSize: 10, color: C.soft, lineHeight: 1.45 },
  band: { backgroundColor: C.deep, paddingHorizontal: 36, paddingTop: 26, paddingBottom: 22, color: "#FFFFFF" },
  bandTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  logoBox: { backgroundColor: "#FFFFFF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  logo: { height: 22 },
  bandLabel: { fontSize: 8, color: "#FFFFFF", opacity: 0.75, letterSpacing: 1.2 },
  chip: { alignSelf: "flex-start", backgroundColor: C.accent, color: C.ink, fontFamily: "Helvetica-Bold", fontSize: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 24, lineHeight: 1.15, color: "#FFFFFF" },
  lead: { marginTop: 6, fontSize: 10.5, color: "#FFFFFF", opacity: 0.85 },
  body: { paddingHorizontal: 36, paddingTop: 18 },
  photo: { width: "100%", height: 190, objectFit: "cover", borderRadius: 8 },
  credit: { fontSize: 7, color: C.muted, marginTop: 3 },
  tiles: { flexDirection: "row", flexWrap: "wrap", marginTop: 14, marginHorizontal: -4 },
  tile: { width: "33.33%", padding: 4 },
  tileIn: { backgroundColor: C.tint, borderRadius: 6, padding: 9, minHeight: 46 },
  tileK: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  tileV: { marginTop: 3, fontFamily: "Helvetica-Bold", fontSize: 11, color: C.ink },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 13, color: C.deep, marginTop: 18, marginBottom: 7 },
  bar: { width: 26, height: 3, backgroundColor: C.accent, borderRadius: 2, marginBottom: 6 },
  p: { fontSize: 10, color: C.soft },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 6 },
  row: { flexDirection: "row", paddingHorizontal: 9, paddingVertical: 6 },
  zebra: { backgroundColor: C.page },
  k: { width: "34%", color: C.muted, paddingRight: 8 },
  v: { width: "66%", color: C.ink, fontFamily: "Helvetica-Bold" },
  note: { fontFamily: "Helvetica", fontSize: 8, color: C.muted, marginTop: 1 },
  head: { flexDirection: "row", backgroundColor: C.deep, paddingHorizontal: 9, paddingVertical: 6, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  th: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  req: { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 5.5 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  keyTag: { marginLeft: "auto", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#B35F0C", backgroundColor: C.accentTint, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 6 },
  sub: { fontSize: 9, color: C.muted, marginBottom: 5 },
  total: { flexDirection: "row", paddingHorizontal: 9, paddingVertical: 7, borderTopWidth: 1.5, borderTopColor: C.ink },
  locked: { marginTop: 6, backgroundColor: C.accentTint, borderRadius: 6, padding: 8, fontSize: 9, color: "#7A4E00" },
  step: { flexDirection: "row", marginBottom: 8 },
  stepN: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.brand, color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 9, textAlign: "center", paddingTop: 3.5, marginRight: 9 },
  footL: { position: "absolute", left: 36, bottom: 22, fontSize: 7.5, color: C.muted },
  footLine: { position: "absolute", left: 36, right: 36, bottom: 36, borderTopWidth: 1, borderTopColor: C.line },
});

function Section({ title, children, wrap = true }: { title: string; children: React.ReactNode; wrap?: boolean }) {
  return (
    <View wrap={wrap}>
      <View minPresenceAhead={140} wrap={false}>
        <Text style={s.h2}>{title}</Text>
        <View style={s.bar} />
      </View>
      {children}
    </View>
  );
}

export function IdeaPdf({ d }: { d: IdeaPdfData }) {
  return (
    <Document title={`${d.name} business plan`} author="BizSphere-Ug" subject="Business plan" creator="BizSphere-Ug">
      <Page size="A4" style={s.page}>
        {/* Header band */}
        <View style={s.band}>
          <View style={s.bandTop}>
            {d.logo ? <View style={s.logoBox}><Image src={d.logo} style={s.logo} /></View> : <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14 }}>BizSphere-Ug</Text>}
            <Text style={s.bandLabel}>BUSINESS PLAN</Text>
          </View>
          {d.category ? <Text style={s.chip}>{d.category.toUpperCase()}</Text> : null}
          <Text style={s.title}>{d.name} business in Uganda</Text>
          {d.summary ? <Text style={s.lead}>{d.summary}</Text> : null}
        </View>

        <View style={s.body}>
          {d.photo ? (
            <View>
              <Image src={d.photo} style={s.photo} />
              {d.photoCredit ? <Text style={s.credit}>{d.photoCredit}</Text> : null}
            </View>
          ) : null}

          {/* Key facts */}
          {d.facts.length ? (
            <View style={s.tiles}>
              {d.facts.map(([k, v]) => (
                <View key={k} style={s.tile}>
                  <View style={s.tileIn}><Text style={s.tileK}>{k}</Text><Text style={s.tileV}>{v}</Text></View>
                </View>
              ))}
            </View>
          ) : null}

          {d.overview ? <Section title="Overview"><Text style={s.p}>{d.overview}</Text></Section> : null}

          {d.profile.length ? (
            <Section title="Business profile">
              <View style={s.table}>
                {d.profile.map(([k, v, note], n) => (
                  <View key={k} style={[s.row, n % 2 === 0 ? s.zebra : {}]} wrap={false}>
                    <Text style={s.k}>{k}</Text>
                    <View style={{ width: "66%" }}>
                      <Text style={{ color: C.ink, fontFamily: "Helvetica-Bold" }}>{v}</Text>
                      {note ? <Text style={s.note}>{note}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {d.requirements.length ? (
            <Section title={`Requirements (${d.requirementTotal})`}>
              <View style={s.table}>
                {d.requirements.map((r, n) => (
                  <View key={`${r.name}-${n}`} style={[s.req, n % 2 === 0 ? s.zebra : {}]} wrap={false}>
                    <View style={[s.dot, { backgroundColor: r.key ? C.brand : C.accent }]} />
                    <View>
                      <Text style={{ color: C.ink, fontFamily: "Helvetica-Bold" }}>{r.name}</Text>
                      <Text style={{ fontSize: 8, color: C.muted }}>{r.group}</Text>
                    </View>
                    {r.key ? <Text style={s.keyTag}>KEY</Text> : null}
                  </View>
                ))}
              </View>
              {d.requirements.length < d.requirementTotal ? <Text style={s.locked}>{d.requirementTotal - d.requirements.length} more requirements are in the full plan for members.</Text> : null}
            </Section>
          ) : null}

          {d.budgets.map((b) => (
            <Section key={b.label} title={`Start-up budget: ${b.label}`}>
              <Text style={s.sub}>{b.place}</Text>
              <View style={s.table}>
                <View style={s.head} fixed={false}>
                  <Text style={[s.th, { width: "46%" }]}>Item</Text>
                  <Text style={[s.th, { width: "12%", textAlign: "right" }]}>Qty</Text>
                  <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Price</Text>
                  <Text style={[s.th, { width: "22%", textAlign: "right" }]}>Amount</Text>
                </View>
                {b.lines.map((l, n) => (
                  <View key={`${l.item}-${n}`} style={[s.row, n % 2 === 1 ? s.zebra : {}]} wrap={false}>
                    <View style={{ width: "46%", paddingRight: 6 }}>
                      <Text style={{ color: C.ink }}>{l.item}</Text>
                      <Text style={{ fontSize: 7.5, color: C.muted }}>{l.group}</Text>
                    </View>
                    <Text style={{ width: "12%", textAlign: "right" }}>{l.qty}</Text>
                    <Text style={{ width: "20%", textAlign: "right" }}>{l.price}</Text>
                    <Text style={{ width: "22%", textAlign: "right", fontFamily: "Helvetica-Bold", color: C.ink }}>{l.amount}</Text>
                  </View>
                ))}
                {b.total ? (
                  <View style={s.total} wrap={false}>
                    <Text style={{ width: "78%", fontFamily: "Helvetica-Bold", color: C.ink }}>Total</Text>
                    <Text style={{ width: "22%", textAlign: "right", fontFamily: "Helvetica-Bold", color: C.deep, fontSize: 11 }}>{b.total}</Text>
                  </View>
                ) : null}
              </View>
              {b.hidden > 0 ? <Text style={s.locked}>{b.hidden} more {b.hidden === 1 ? "item" : "items"} and the total are in the full plan for members.</Text> : null}
              {b.assumptions ? <Text style={[s.sub, { marginTop: 5 }]}>Assumptions: {b.assumptions}</Text> : null}
            </Section>
          ))}

          {d.steps.length ? (
            <Section title="How to start" wrap={d.steps.length > 8}>
              {d.steps.map((st) => (
                <View key={st.n} style={s.step} wrap={false}>
                  <Text style={s.stepN}>{st.n}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Helvetica-Bold", color: C.ink }}>{st.title}</Text>
                    {st.text ? <Text style={{ fontSize: 9.5 }}>{st.text}</Text> : null}
                  </View>
                </View>
              ))}
              {d.hiddenSteps > 0 ? <Text style={s.locked}>{d.hiddenSteps} more {d.hiddenSteps === 1 ? "step" : "steps"} are in the full plan for members.</Text> : null}
            </Section>
          ) : null}

          {!d.member ? (
            <View style={{ marginTop: 18, backgroundColor: C.deep, borderRadius: 8, padding: 14 }} wrap={false}>
              <Text style={{ color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 12 }}>Get the full plan</Text>
              <Text style={{ color: "#FFFFFF", opacity: 0.85, marginTop: 3 }}>Members get every requirement, the full start-up budget with totals and all the steps.</Text>
              <Link src={d.url} style={{ color: C.accent, marginTop: 5, fontFamily: "Helvetica-Bold" }}>{d.url}</Link>
            </View>
          ) : null}

          <Text style={{ marginTop: 16, fontSize: 7.5, color: C.muted }}>
            Prices change. Confirm costs with sellers before you pay. Reviewed {d.reviewed}.
          </Text>
        </View>

        <View style={s.footLine} fixed />
        <Text style={s.footL} fixed>BizSphere-Ug · {d.name} business plan · bizsphere.ug</Text>
      </Page>
    </Document>
  );
}
