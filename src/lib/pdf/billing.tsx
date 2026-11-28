import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { dateKE, ksh } from "@/lib/money";

/** Invoice and tenant statement PDFs (masterplan §7.1). A4, English. Money in cents, shown as KSh. */
export type Party = {
  org: string; orgPhone: string | null; tenant: string; phone: string | null; unitCode: string; unitLabel: string; property: string;
  pay: { method: string; shortcode: string | null; bankAccountHint: string } | null; logoUrl: string;
};
export type InvoiceData = Party & {
  number: string; issuedOn: string; dueDate: string; period: string;
  lines: { description: string; amount: number; outstanding: number; status: string }[];
  accountBalance: number;
};
export type StatementData = Party & {
  from: string | null; to: string; opening: number;
  lines: { date: string; description: string; debit: number; credit: number; balance: number }[];
  closing: number; generatedOn: string;
};

const plum = "#4a2052", pink = "#b0236c", ink = "#1a1219", grey = "#6b5c68", cream = "#f5f1f0", line = "#e6dde3", green = "#1e7a4f";
const s = StyleSheet.create({
  page: { padding: 36, paddingBottom: 60, fontSize: 10, color: ink, fontFamily: "Helvetica" },
  band: { backgroundColor: plum, borderRadius: 14, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 104, height: 26 },
  bandRight: { alignItems: "flex-end" },
  bandOrg: { color: "#ffffff", fontSize: 12, fontFamily: "Helvetica-Bold" },
  bandText: { color: "#ffffff", fontSize: 9, opacity: 0.85, marginTop: 2 },
  head: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
  kind: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pink, letterSpacing: 1.2 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: plum, marginTop: 3 },
  meta: { alignItems: "flex-end" },
  metaRow: { flexDirection: "row", marginTop: 2 },
  metaLabel: { color: grey, width: 70, textAlign: "right", marginRight: 8 },
  metaValue: { fontFamily: "Helvetica-Bold", minWidth: 80, textAlign: "right" },
  boxes: { flexDirection: "row", gap: 12, marginTop: 18 },
  box: { flex: 1, backgroundColor: cream, borderRadius: 10, padding: 12 },
  boxLabel: { fontSize: 8, color: grey, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, marginBottom: 4 },
  strong: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 18 },
  th: { flexDirection: "row", borderBottomWidth: 1.2, borderColor: plum, paddingBottom: 5, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: plum },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderColor: line, paddingVertical: 5 },
  c1: { flex: 1 }, cDate: { width: 72 }, cAmt: { width: 78, textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: 250 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 1.2, borderColor: plum },
  grandText: { fontSize: 12, fontFamily: "Helvetica-Bold", color: plum },
  pay: { marginTop: 22, borderWidth: 1.2, borderColor: plum, borderRadius: 10, padding: 12 },
  payRow: { flexDirection: "row", gap: 24, marginTop: 6 },
  payLabel: { fontSize: 8, color: grey },
  payValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: plum, marginTop: 1 },
  note: { marginTop: 10, color: grey, fontSize: 8.5, lineHeight: 1.4 },
  foot: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: grey, flexDirection: "row", justifyContent: "space-between" },
});

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;
const signed = (c: number) => (c < 0 ? `${ksh(-c)} in credit` : ksh(c));

function Band({ d }: { d: Party }) {
  return (
    <View style={s.band}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={d.logoUrl} style={s.logo} />
      <View style={s.bandRight}>
        <Text style={s.bandOrg}>{d.org}</Text>
        {d.orgPhone && <Text style={s.bandText}>{d.orgPhone}</Text>}
      </View>
    </View>
  );
}

function Parties({ d }: { d: Party }) {
  return (
    <View style={s.boxes}>
      <View style={s.box}>
        <Text style={s.boxLabel}>TENANT</Text>
        <Text style={s.strong}>{d.tenant}</Text>
        {d.phone && <Text style={{ marginTop: 2 }}>{d.phone}</Text>}
      </View>
      <View style={s.box}>
        <Text style={s.boxLabel}>UNIT</Text>
        <Text style={s.strong}>{d.unitCode}</Text>
        <Text style={{ marginTop: 2 }}>{d.unitLabel} · {d.property}</Text>
      </View>
    </View>
  );
}

function HowToPay({ d }: { d: Party }) {
  if (!d.pay || d.pay.method === "none_yet" || !d.pay.shortcode) {
    return <Text style={s.note}>Ask {d.org} how to pay. Always quote your unit code {d.unitCode}.</Text>;
  }
  const till = d.pay.method === "mpesa_till";
  const account = d.pay.method === "bank_paybill" && d.pay.bankAccountHint ? d.pay.bankAccountHint : d.unitCode;
  return (
    <View style={s.pay} wrap={false}>
      <Text style={s.boxLabel}>HOW TO PAY · M-PESA</Text>
      <View style={s.payRow}>
        <View><Text style={s.payLabel}>{till ? "Buy Goods till number" : "Pay Bill business number"}</Text><Text style={s.payValue}>{d.pay.shortcode}</Text></View>
        {!till && <View><Text style={s.payLabel}>Account number</Text><Text style={s.payValue}>{account}</Text></View>}
      </View>
      <Text style={s.note}>{till ? "Pay from the phone number your landlord has on record. " : ""}Your receipt arrives by SMS within minutes of paying.</Text>
    </View>
  );
}

function Footer({ left }: { left: string }) {
  return (
    <View style={s.foot} fixed>
      <Text>{left}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} · Prepared with Rentife`} />
    </View>
  );
}

export function InvoiceDocument(d: InvoiceData) {
  const total = d.lines.reduce((t, l) => t + l.amount, 0);
  const owed = d.lines.reduce((t, l) => t + l.outstanding, 0);
  return (
    <Document title={`Invoice ${d.number}`} author={d.org} creator="Rentife">
      <Page size="A4" style={s.page}>
        <Band d={d} />
        <View style={s.head}>
          <View><Text style={s.kind}>INVOICE</Text><Text style={s.title}>{monthLabel(d.period)}</Text></View>
          <View style={s.meta}>
            <View style={s.metaRow}><Text style={s.metaLabel}>Invoice no.</Text><Text style={s.metaValue}>{d.number}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Issued</Text><Text style={s.metaValue}>{dateKE(d.issuedOn)}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Due</Text><Text style={s.metaValue}>{dateKE(d.dueDate)}</Text></View>
          </View>
        </View>
        <Parties d={d} />
        <View style={s.table}>
          <View style={s.th}><Text style={s.c1}>Description</Text><Text style={s.cAmt}>Amount</Text><Text style={s.cAmt}>Still owed</Text></View>
          {d.lines.map((l, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.c1}>{l.description}{l.status === "waived" ? " (waived)" : ""}</Text>
              <Text style={s.cAmt}>{ksh(l.amount)}</Text>
              <Text style={[s.cAmt, l.outstanding === 0 ? { color: green } : {}]}>{l.outstanding === 0 ? "Settled" : ksh(l.outstanding)}</Text>
            </View>
          ))}
        </View>
        <View style={s.totals} wrap={false}>
          <View style={s.totRow}><Text>Invoice total</Text><Text style={s.strong}>{ksh(total)}</Text></View>
          <View style={s.totRow}><Text>Paid or credited</Text><Text>{ksh(total - owed)}</Text></View>
          <View style={s.grand}><Text style={s.grandText}>Due on this invoice</Text><Text style={s.grandText}>{ksh(owed)}</Text></View>
          <View style={[s.totRow, { marginTop: 6 }]}><Text style={{ color: grey }}>Whole account balance today</Text><Text style={{ color: grey }}>{signed(d.accountBalance)}</Text></View>
        </View>
        <HowToPay d={d} />
        <Footer left={`${d.number} · ${d.unitCode}`} />
      </Page>
    </Document>
  );
}

export function StatementDocument(d: StatementData) {
  const debits = d.lines.reduce((t, l) => t + l.debit, 0), credits = d.lines.reduce((t, l) => t + l.credit, 0);
  return (
    <Document title={`Statement ${d.unitCode}`} author={d.org} creator="Rentife">
      <Page size="A4" style={s.page}>
        <Band d={d} />
        <View style={s.head}>
          <View><Text style={s.kind}>TENANT STATEMENT</Text><Text style={s.title}>{d.from ? `${dateKE(d.from)} – ${dateKE(d.to)}` : `Up to ${dateKE(d.to)}`}</Text></View>
          <View style={s.meta}>
            <View style={s.metaRow}><Text style={s.metaLabel}>Prepared</Text><Text style={s.metaValue}>{dateKE(d.generatedOn)}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Balance</Text><Text style={s.metaValue}>{signed(d.closing)}</Text></View>
          </View>
        </View>
        <Parties d={d} />
        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={s.cDate}>Date</Text><Text style={s.c1}>Description</Text><Text style={s.cAmt}>Charged</Text><Text style={s.cAmt}>Paid / credit</Text><Text style={s.cAmt}>Balance</Text>
          </View>
          {d.from && (
            <View style={s.tr}><Text style={s.cDate}>{dateKE(d.from)}</Text><Text style={[s.c1, s.strong]}>Balance brought forward</Text><Text style={s.cAmt} /><Text style={s.cAmt} /><Text style={[s.cAmt, s.strong]}>{ksh(d.opening)}</Text></View>
          )}
          {d.lines.map((l, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cDate}>{dateKE(l.date)}</Text>
              <Text style={s.c1}>{l.description}</Text>
              <Text style={s.cAmt}>{l.debit ? ksh(l.debit) : ""}</Text>
              <Text style={[s.cAmt, { color: green }]}>{l.credit ? ksh(l.credit) : ""}</Text>
              <Text style={s.cAmt}>{ksh(l.balance)}</Text>
            </View>
          ))}
          {!d.lines.length && <Text style={[s.note, { marginTop: 8 }]}>Nothing was charged or paid in this period.</Text>}
        </View>
        <View style={s.totals} wrap={false}>
          <View style={s.totRow}><Text>Opening balance</Text><Text>{ksh(d.opening)}</Text></View>
          <View style={s.totRow}><Text>Charged</Text><Text>{ksh(debits)}</Text></View>
          <View style={s.totRow}><Text>Paid and credited</Text><Text>{ksh(credits)}</Text></View>
          <View style={s.grand}><Text style={s.grandText}>{d.closing < 0 ? "In credit" : "Balance due"}</Text><Text style={s.grandText}>{ksh(Math.abs(d.closing))}</Text></View>
        </View>
        <HowToPay d={d} />
        <Footer left={`Statement · ${d.unitCode} · ${d.tenant}`} />
      </Page>
    </Document>
  );
}
