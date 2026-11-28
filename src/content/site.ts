/**
 * Site-wide content and placeholder register (masterplan §19).
 * Any value not yet confirmed stays a {{PLACEHOLDER}} token. Never invent prices,
 * contacts, legal text, statistics or testimonials.
 */
export const placeholders = {
  DOMAIN: "rentife.co.ke",
  SUPPORT_PHONE: "{{SUPPORT_PHONE}}",
  SUPPORT_EMAIL: "{{SUPPORT_EMAIL}}",
  SUPPORT_WHATSAPP: "{{SUPPORT_WHATSAPP}}",
  ODPC_REG_NO: "{{ODPC_REG_NO}}",
  DEMO_VIDEO_URL: "{{DEMO_VIDEO_URL}}",
  BOOKING_URL: "{{BOOKING_URL}}",
  LEGAL_TEXT: "{{LEGAL_TEXT}}",
} as const;


export type NavLink = { label: string; href: string; description?: string };
export type NavGroup = { title: string; links: NavLink[] };
export type NavItem = { label: string; href: string };

export const nav: NavItem[] = [
  { label: "For landlords", href: "/for-landlords" },
  { label: "For agents", href: "/for-agents" },
  { label: "For diaspora owners", href: "/for-diaspora-owners" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

export const footerColumns: NavGroup[] = [
  {
    title: "Need help?",
    links: [
      { label: "Book a free setup", href: "/book-setup" },
      { label: "Frequently asked questions", href: "/for-landlords#faq" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    title: "Rentife for",
    links: [
      { label: "Landlords", href: "/for-landlords" },
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
