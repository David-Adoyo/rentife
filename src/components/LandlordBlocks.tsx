import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { CollectionRing } from "./Vignettes";

export const faqs = [
  { q: "Do I need a Paybill?", a: "Rentife works with your own M-Pesa Paybill, Till or bank account. Rent goes straight to you. If you don’t have API access, you can import your M-Pesa or bank statement instead, and we’ll guide you through getting a Paybill." },
  { q: "What if a tenant pays without the unit code?", a: "Rentife tries the phone numbers it has learned, then the payer’s name and the amount. Anything it isn’t sure about goes to a one-tap review queue, and it remembers your choice for next time." },
  { q: "Can my caretaker see the money?", a: "Caretakers see whether a unit has paid, with amounts hidden by default. They can log meter readings, repairs and inspections, but they can never record payments." },
  { q: "Is my data safe?", a: "Every organisation’s data is isolated at the database level, payment credentials are encrypted, and every action is written to an audit trail that cannot be edited." },
  { q: "Do tenants need to download an app?", a: "No. Tenants pay with M-Pesa as they do today, get receipts by SMS or WhatsApp, and can open a lightweight web portal with a one-time code. No password, no app." },
  { q: "What about tax?", a: "The tax centre shows the gross residential rent you received each month and the figure due, with reminders before the due date and an export pack. It is information, not tax advice." },
  { q: "Can I import my Excel?", a: "Yes. Upload your existing sheet of units and tenants, check the preview, and fix anything flagged before it goes live." },
  { q: "What happens if I stop paying for Rentife?", a: "Rent keeps flowing into your own account, because it never passed through us. Your records stay available to view and export." },
];

export function BeforeAfter() {
  return (
    <div className="mt-16 grid overflow-hidden rounded-[2.5rem] border border-line md:grid-cols-2">
      <div className="bg-white p-8 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-overdue">Before</p>
        <ul className="mt-5 space-y-3 text-lg text-ink-600">
          {["Calling and WhatsApping tenants all week", "Scrolling M-Pesa messages against a notebook", "“I paid from my wife’s phone”", "Writing receipts by hand", "Guessing your monthly tax figure"].map((t) => (
            <li key={t} className="flex gap-3"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />{t}</li>
          ))}
        </ul>
      </div>
      <div className="bg-plum-800 p-8 text-white sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-pink-500">After</p>
        <ul className="mt-5 space-y-3 text-lg">
          {["Polite reminders go out on schedule", "Every payment matched to the right unit", "Rentife learns that phone for next time", "Numbered receipts sent instantly", "Tax figure ready before the 20th"].map((t) => (
            <li key={t} className="flex gap-3"><CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-pink-500" aria-hidden />{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AllPaidPanel() {
  const units = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4"];
  return (
    <div className="mt-12 overflow-hidden rounded-[2.5rem] bg-[radial-gradient(100%_100%_at_0%_0%,#fce6f1_0%,#f1e6ef_50%,#dcc6d8_100%)] p-4 sm:p-10">
      <div className="mx-auto max-w-4xl rounded-[1.75rem] bg-white p-6 shadow-float sm:p-8">
        <div className="relative overflow-hidden rounded-2xl bg-plum-800 px-5 py-4 text-white">
          <p className="font-medium">Every unit at Sunrise Court has paid for December</p>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,transparent,#e94098,transparent)] bg-[length:200%_100%] [animation:shimmer_2.4s_ease-out_1]" />
        </div>
        <div className="mt-6 grid items-center gap-8 sm:grid-cols-[auto_1fr]">
          <CollectionRing pct={100} size={176} stroke={14} />
          <div>
            <p className="text-sm font-semibold text-ink-600">Sunrise Court, Kasarani · 12 units</p>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {units.map((u) => (
                <div key={u} className="flex aspect-square items-center justify-center rounded-lg bg-paid text-xs font-semibold text-white">{u}</div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-600">Illustration with demo data. A product demo video will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
