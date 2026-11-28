/**
 * Tenant message templates, copied verbatim from masterplan §12 (EN + SW).
 * Sending starts in Stage 7; onboarding uses these for previews. The Kiswahili must be reviewed by a
 * native speaker before launch ({{SW_REVIEW_DONE}}).
 */
export const TEMPLATES = {
  welcome: {
    en: "Hi {first_name}, welcome to {property}. Pay rent via Paybill {paybill}, Account {unit_code}. Your receipts and statement: {link}",
    sw: "Habari {first_name}, karibu {property}. Lipa kodi kupitia Paybill {paybill}, Akaunti {unit_code}. Risiti na taarifa zako: {link}",
  },
  reminder_t_minus_3: {
    en: "Hi {first_name}, a friendly reminder: rent of KSh {amount} for {unit} is due on {due_date}. Paybill {paybill}, Acc {unit_code} or tap {link}",
    sw: "Habari {first_name}, ukumbusho wa kirafiki: kodi ya KSh {amount} ya {unit} inatakiwa tarehe {due_date}. Paybill {paybill}, Akaunti {unit_code} au bofya {link}",
  },
  reminder_t0: {
    en: "Hi {first_name}, rent of KSh {amount} for {unit} is due today. Pay in one tap: {link}. Thank you.",
    sw: "Habari {first_name}, kodi ya KSh {amount} ya {unit} inatakiwa leo. Lipa kwa mguso mmoja: {link}. Asante.",
  },
  reminder_t_plus_3: {
    en: "Hi {first_name}, we haven't yet received KSh {balance} for {unit}, due {due_date}. Please pay via {link}, or reply if you need a payment plan.",
    sw: "Habari {first_name}, bado hatujapokea KSh {balance} ya {unit}, iliyotakiwa {due_date}. Tafadhali lipa kupitia {link}, au jibu kama unahitaji mpango wa malipo.",
  },
  reminder_t_plus_7: {
    en: "Hi {first_name}, rent for {unit} (KSh {balance}) is 7 days overdue. Please pay today via {link} or call {manager_name} on {manager_phone} to agree a plan.",
    sw: "Habari {first_name}, kodi ya {unit} (KSh {balance}) imechelewa kwa siku 7. Tafadhali lipa leo kupitia {link} au piga simu kwa {manager_name} {manager_phone} tukubaliane mpango.",
  },
} as const;

export type TemplateKey = keyof typeof TEMPLATES;
export const render = (key: TemplateKey, lang: "en" | "sw", vars: Record<string, string>) =>
  TEMPLATES[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);

export const REMINDER_STEPS: { offset: number; key: TemplateKey; label: string }[] = [
  { offset: -3, key: "reminder_t_minus_3", label: "3 days before" },
  { offset: 0, key: "reminder_t0", label: "On the due date" },
  { offset: 3, key: "reminder_t_plus_3", label: "3 days late" },
  { offset: 7, key: "reminder_t_plus_7", label: "7 days late" },
];

/** Tone presets choose which reminders go out. Every message stays polite (masterplan §4.7). */
export const TONES = {
  gentle: { label: "Gentle", text: "A reminder before and on the due date only.", offsets: [-3, 0] },
  standard: { label: "Standard", text: "Before, on the day, and two follow-ups if rent is late.", offsets: [-3, 0, 3, 7] },
  firm: { label: "Firm but respectful", text: "On the day and promptly after, with your contact for a payment plan.", offsets: [0, 3, 7] },
} as const;
export type Tone = keyof typeof TONES;
