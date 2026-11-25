/**
 * Site-wide content and placeholder register (masterplan §19).
 * Any value not yet confirmed stays a {{PLACEHOLDER}} token. Never invent prices,
 * contacts, legal text, statistics or testimonials.
 */
export const placeholders = {
  DOMAIN: "{{DOMAIN}}",
  SUPPORT_PHONE: "{{SUPPORT_PHONE}}",
  SUPPORT_EMAIL: "{{SUPPORT_EMAIL}}",
  SUPPORT_WHATSAPP: "{{SUPPORT_WHATSAPP}}",
  ODPC_REG_NO: "{{ODPC_REG_NO}}",
  PRICE_PER_UNIT: "{{PRICE_PER_UNIT}}",
  MIN_MONTHLY_FEE: "{{MIN_MONTHLY_FEE}}",
  PLAN_STARTER: "{{PLAN_STARTER}}",
  PLAN_GROWTH: "{{PLAN_GROWTH}}",
  PLAN_AGENCY: "{{PLAN_AGENCY}}",
  DEMO_VIDEO_URL: "{{DEMO_VIDEO_URL}}",
  BOOKING_URL: "{{BOOKING_URL}}",
  LEGAL_TEXT: "{{LEGAL_TEXT}}",
} as const;

/** Numeric price per occupied unit per month in KES. null until pricing is decided. */
export const PRICE_PER_UNIT_KES: number | null = null;

export type NavLink = { label: string; href: string; description?: string };
export type NavGroup = { title: string; links: NavLink[] };
export type NavItem =
  | { label: string; href: string }
  | { label: string; intro: { title: string; text: string; href: string; cta: string }; groups: NavGroup[] };

export const nav: NavItem[] = [
  {
    label: "For landlords",
    intro: {
      title: "Rent that collects itself",
      text: "Automatic M-Pesa matching, instant receipts and polite reminders. Your money goes straight to your own Paybill.",
      href: "/how-it-works",
      cta: "See how it works",
    },
    groups: [
      {
        title: "Collect rent",
        links: [
          { label: "How it works", href: "/how-it-works" },
          { label: "Polite reminders", href: "/how-it-works#reminders" },
          { label: "Smart matching", href: "/how-it-works#matching" },
          { label: "Instant receipts", href: "/how-it-works#receipts" },
        ],
      },
      {
        title: "Run your buildings",
        links: [
          { label: "Water and power billing", href: "/how-it-works#utilities" },
          { label: "Deposits and inspections", href: "/how-it-works#deposits" },
          { label: "Your monthly tax figure", href: "/how-it-works#tax" },
          { label: "Caretakers and tenants", href: "/how-it-works#people" },
        ],
      },
    ],
  },
  {
    label: "For agents",
    intro: {
      title: "Many owners, one calm desk",
      text: "Owner portfolios, automatic commission, polished monthly statements and an audit trail your owners can trust.",
      href: "/for-agents",
      cta: "Rentife for agents",
    },
    groups: [
      {
        title: "Manage for owners",
        links: [
          { label: "Owner portfolios", href: "/for-agents#portfolios" },
          { label: "Commission and remittances", href: "/for-agents#commission" },
          { label: "Monthly owner statements", href: "/for-agents#statements" },
        ],
      },
      {
        title: "Run your team",
        links: [
          { label: "Staff roles", href: "/for-agents#roles" },
          { label: "Maintenance with proof", href: "/for-agents#maintenance" },
        ],
      },
    ],
  },
  {
    label: "For diaspora owners",
    intro: {
      title: "See every shilling from anywhere",
      text: "Payment data comes straight from M-Pesa confirmations, not typed by an agent. Check in from wherever you live.",
      href: "/for-diaspora-owners",
      cta: "Rentife for diaspora owners",
    },
    groups: [
      {
        title: "Stay in the picture",
        links: [
          { label: "Your owner dashboard", href: "/for-diaspora-owners#dashboard" },
          { label: "Monthly statements", href: "/for-diaspora-owners#statements" },
          { label: "Non-resident tax information", href: "/for-diaspora-owners#tax" },
        ],
      },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

export const footerColumns: NavGroup[] = [
  {
    title: "Need help?",
    links: [
      { label: "Book a free setup", href: "/book-setup" },
      { label: "Frequently asked questions", href: "/#faq" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    title: "Rentife for",
    links: [
      { label: "Landlords", href: "/how-it-works" },
      { label: "Agents and property managers", href: "/for-agents" },
      { label: "Diaspora owners", href: "/for-diaspora-owners" },
      { label: "Caretakers and tenants", href: "/how-it-works#people" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Legal & privacy",
    links: [
      { label: "Terms of service", href: "/legal/terms" },
      { label: "Privacy notice", href: "/legal/privacy" },
      { label: "Data processing agreement", href: "/legal/dpa" },
    ],
  },
];
