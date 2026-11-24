/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> draws into the PDF and has no alt prop */
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * One market's price list as an A4 PDF (served by /prices/[market]/pdf, members only). It only lays
 * out plain data: the route decides who may have it. Colours follow src/lib/idea-pdf.tsx.
 */
export type PriceListPdfData = {
  market: string;
  place: string | null;
  /** The product category the list was narrowed to, if any. */
  category: string | null;
  logo: Buffer | null;
  printed: string;
  url: string;
  count: number;
  groups: { name: string; lines: { product: string; unit: string; type: string; price: string; date: string; stale: boolean }[] }[];
  staleDays: number;
};

const C = { deep: "#0550ae", accent: "#F28C28", ink: "#111111", soft: "#2B2B2B", muted: "#6B6B6B", line: "#E9E7E4", page: "#F4F7FA", bad: "#B42318" };

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 56, fontFamily: "Helvetica", fontSize: 9.5, color: C.soft, lineHeight: 1.4 },
  band: { backgroundColor: C.deep, marginTop: -30, paddingHorizontal: 36, paddingTop: 26, paddingBottom: 20, color: "#FFFFFF" },
  bandTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logoBox: { backgroundColor: "#FFFFFF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  logo: { height: 22 },
  label: { fontSize: 8, opacity: 0.75, letterSpacing: 1.2 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, lineHeight: 1.2 },
  lead: { marginTop: 4, fontSize: 10, opacity: 0.85 },
  body: { paddingHorizontal: 36, paddingTop: 14 },
  head: { flexDirection: "row", backgroundColor: C.deep, paddingHorizontal: 9, paddingVertical: 6 },
  th: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  group: { paddingHorizontal: 9, paddingTop: 9, paddingBottom: 4, fontFamily: "Helvetica-Bold", fontSize: 10.5, color: C.deep, borderBottomWidth: 1.5, borderBottomColor: C.accent },
  row: { flexDirection: "row", paddingHorizontal: 9, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.line },
  zebra: { backgroundColor: C.page },
  product: { width: "33%", paddingRight: 6 },
  unit: { width: "15%", paddingRight: 6 },
  type: { width: "13%" },
  price: { width: "23%", textAlign: "right" },
  date: { width: "16%", textAlign: "right" },
  note: { marginTop: 14, fontSize: 8, color: C.muted },
  footLine: { position: "absolute", left: 36, right: 36, bottom: 36, borderTopWidth: 1, borderTopColor: C.line },
  footL: { position: "absolute", left: 36, bottom: 22, fontSize: 7.5, color: C.muted },
});

export function PriceListPdf({ d }: { d: PriceListPdfData }) {
  const anyStale = d.groups.some((g) => g.lines.some((l) => l.stale));
  return (
    <Document title={`${d.market} price list`} author="BizSphere-Ug" subject="Market price list" creator="BizSphere-Ug">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View style={s.bandTop}>
            {d.logo ? <View style={s.logoBox}><Image src={d.logo} style={s.logo} /></View> : <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14 }}>BizSphere-Ug</Text>}
            <Text style={s.label}>MARKET PRICE LIST</Text>
          </View>
          <Text style={s.title}>{d.market}</Text>
          <Text style={s.lead}>{[d.place, d.category, `${d.count} ${d.count === 1 ? "price" : "prices"}`, `Downloaded ${d.printed}`].filter(Boolean).join("  ·  ")}</Text>
        </View>

        <View style={s.body}>
          {/* Repeated at the top of every page */}
          <View style={s.head} fixed>
            <Text style={[s.th, s.product]}>Product</Text>
            <Text style={[s.th, s.unit]}>Unit</Text>
            <Text style={[s.th, s.type]}>Type</Text>
            <Text style={[s.th, s.price]}>Price</Text>
            <Text style={[s.th, s.date]}>Updated</Text>
          </View>
          {d.groups.map((g) => (
            <View key={g.name}>
              <Text style={s.group} minPresenceAhead={40}>{g.name}</Text>
              {g.lines.map((l, n) => (
                <View key={n} style={[s.row, n % 2 === 1 ? s.zebra : {}]} wrap={false}>
                  <Text style={[s.product, { color: C.ink, fontFamily: "Helvetica-Bold" }]}>{l.product}</Text>
                  <Text style={s.unit}>{l.unit}</Text>
                  <Text style={s.type}>{l.type}</Text>
                  <Text style={[s.price, { color: C.ink, fontFamily: "Helvetica-Bold" }]}>{l.price}</Text>
                  <Text style={[s.date, l.stale ? { color: C.bad } : {}]}>{l.date}{l.stale ? " *" : ""}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={s.note} wrap={false}>
            {anyStale ? <Text style={{ color: C.bad }}>* More than {d.staleDays} days old; may be out of date.</Text> : null}
            <Text>The latest price recorded for each product at this market. Prices change: confirm with the seller before you pay.</Text>
            <Link src={d.url} style={{ color: C.deep }}>See the latest prices online</Link>
          </View>
        </View>

        <View style={s.footLine} fixed />
        <Text style={s.footL} fixed>BizSphere-Ug · {d.market} price list · bizsphere.ug</Text>
      </Page>
    </Document>
  );
}
