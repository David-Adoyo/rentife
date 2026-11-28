import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/** "How to pay rent" building notice (masterplan §11 step 5). English and Kiswahili, A4. */
export type NoticeData = {
  property: string;
  method: "mpesa_paybill" | "mpesa_till" | "bank_paybill";
  shortcode: string;
  bankAccountHint: string;
  units: { label: string; code: string }[];
  logoUrl: string;
};

const plum = "#4a2052", pink = "#b0236c", ink = "#1a1219", grey = "#6b5c68", cream = "#f5f1f0";
const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, color: ink, fontFamily: "Helvetica" },
  band: { backgroundColor: plum, borderRadius: 14, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 110, height: 27 },
  bandText: { color: "#ffffff", fontSize: 10 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 20, color: plum },
  sub: { fontSize: 12, color: grey, marginTop: 2 },
  cols: { flexDirection: "row", gap: 16, marginTop: 16 },
  col: { flex: 1, backgroundColor: cream, borderRadius: 12, padding: 14 },
  lang: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pink, letterSpacing: 1, marginBottom: 6 },
  step: { flexDirection: "row", marginBottom: 7 },
  num: { width: 16, height: 16, borderRadius: 8, backgroundColor: plum, color: "#ffffff", fontSize: 9, textAlign: "center", paddingTop: 3, marginRight: 8 },
  stepText: { flex: 1, lineHeight: 1.35 },
  big: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  key: { marginTop: 16, borderWidth: 1.5, borderColor: plum, borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-around" },
  keyLabel: { fontSize: 9, color: grey, textAlign: "center" },
  keyValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: plum, textAlign: "center", marginTop: 2 },
  codesTitle: { marginTop: 18, fontFamily: "Helvetica-Bold", fontSize: 11 },
  codes: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  code: { width: "16.66%", paddingVertical: 3, fontSize: 9.5 },
  foot: { position: "absolute", bottom: 26, left: 36, right: 36, fontSize: 8.5, color: grey, textAlign: "center" },
});

export function NoticeDocument(d: NoticeData) {
  const example = d.units[0]?.code ?? "ABC-B4";
  const paybill = d.method !== "mpesa_till";
  const en = paybill
    ? [
        <>Open <Text style={s.big}>M-PESA</Text> › Lipa na M-PESA › <Text style={s.big}>Pay Bill</Text>.</>,
        <>Business number: <Text style={s.big}>{d.shortcode}</Text></>,
        d.method === "bank_paybill" && d.bankAccountHint
          ? <>Account number: <Text style={s.big}>{d.bankAccountHint}</Text>, then pay from your registered phone.</>
          : <>Account number: <Text style={s.big}>your unit code</Text>, for example <Text style={s.big}>{example}</Text>.</>,
        <>Enter the amount and your M-PESA PIN.</>,
        <>Your Rentife receipt arrives by SMS within minutes.</>,
      ]
    : [
        <>Open <Text style={s.big}>M-PESA</Text> › Lipa na M-PESA › <Text style={s.big}>Buy Goods and Services</Text>.</>,
        <>Till number: <Text style={s.big}>{d.shortcode}</Text></>,
        <>Pay from the phone number your landlord has on record.</>,
        <>Enter the amount and your M-PESA PIN.</>,
        <>Your Rentife receipt arrives by SMS within minutes.</>,
      ];
  const sw = paybill
    ? [
        <>Fungua <Text style={s.big}>M-PESA</Text> › Lipa na M-PESA › <Text style={s.big}>Pay Bill</Text>.</>,
        <>Namba ya biashara: <Text style={s.big}>{d.shortcode}</Text></>,
        d.method === "bank_paybill" && d.bankAccountHint
          ? <>Namba ya akaunti: <Text style={s.big}>{d.bankAccountHint}</Text>, kisha lipa kutoka kwa simu yako iliyosajiliwa.</>
          : <>Namba ya akaunti: <Text style={s.big}>namba ya nyumba yako</Text>, kwa mfano <Text style={s.big}>{example}</Text>.</>,
        <>Weka kiasi na PIN yako ya M-PESA.</>,
        <>Risiti yako ya Rentife itafika kwa SMS baada ya dakika chache.</>,
      ]
    : [
        <>Fungua <Text style={s.big}>M-PESA</Text> › Lipa na M-PESA › <Text style={s.big}>Buy Goods and Services</Text>.</>,
        <>Namba ya Till: <Text style={s.big}>{d.shortcode}</Text></>,
        <>Lipa kutoka kwa namba ya simu ambayo mwenye nyumba anayo.</>,
        <>Weka kiasi na PIN yako ya M-PESA.</>,
        <>Risiti yako ya Rentife itafika kwa SMS baada ya dakika chache.</>,
      ];
  const steps = (items: React.ReactNode[]) =>
    items.map((t, i) => (
      <View key={i} style={s.step}><Text style={s.num}>{i + 1}</Text><Text style={s.stepText}>{t}</Text></View>
    ));
  return (
    <Document title={`How to pay rent - ${d.property}`} author="Rentife" language="en-GB">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={d.logoUrl} style={s.logo} />
          <Text style={s.bandText}>Rent notice · Tangazo la kodi</Text>
        </View>
        <Text style={s.title}>How to pay rent at {d.property}</Text>
        <Text style={s.sub}>Jinsi ya kulipa kodi – {d.property}</Text>

        <View style={s.key}>
          <View><Text style={s.keyLabel}>{paybill ? "PAYBILL / NAMBA YA BIASHARA" : "TILL NUMBER / NAMBA YA TILL"}</Text><Text style={s.keyValue}>{d.shortcode}</Text></View>
          {paybill && d.method !== "bank_paybill" && <View><Text style={s.keyLabel}>ACCOUNT / AKAUNTI</Text><Text style={s.keyValue}>Your unit code</Text></View>}
        </View>

        <View style={s.cols}>
          <View style={s.col}><Text style={s.lang}>ENGLISH</Text>{steps(en)}</View>
          <View style={s.col}><Text style={s.lang}>KISWAHILI</Text>{steps(sw)}</View>
        </View>

        {paybill && d.method !== "bank_paybill" && d.units.length > 0 && (
          <>
            <Text style={s.codesTitle}>Unit codes · Namba za nyumba</Text>
            <View style={s.codes}>{d.units.map((u) => <Text key={u.code} style={s.code}>{u.label}: {u.code}</Text>)}</View>
          </>
        )}
        <Text style={s.foot} fixed>Rent goes straight to your landlord’s own account. Keep your M-PESA message as proof of payment. · Kodi inaenda moja kwa moja kwa akaunti ya mwenye nyumba.</Text>
      </Page>
    </Document>
  );
}
