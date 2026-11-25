import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { ArrowDisc, Eyebrow } from "./primitives";
import { Scene, type SceneKind, type SceneTone } from "./Vignettes";

export type Tile = { eyebrow: string; title: string; href: string; scene: SceneKind; tone: SceneTone; text?: string };

/** Zig-zag of oval and round tiles joined by fine pink arcs. */
export function OvalTiles({ tiles }: { tiles: Tile[] }) {
  const left = tiles.filter((_, i) => i % 2 === 1);
  const right = tiles.filter((_, i) => i % 2 === 0);
  const shape = (i: number) => (i % 3 === 1 ? "aspect-square" : "aspect-[5/7]");
  const col = (items: Tile[], offset: number) =>
    items.map((t, i) => {
      const n = i * 2 + offset;
      return (
        <Link key={t.title} href={t.href} className={`group block ${n % 2 ? "" : "ml-auto"} w-[88%] sm:w-[76%] md:w-[82%] ${n % 2 ? "md:ml-[6%]" : ""}`}>
          <div className="relative">
            <Scene kind={t.scene} tone={t.tone} className={`${shape(n)} rounded-full`} />
            <ArrowDisc className="absolute bottom-[8%] right-[6%]" />
          </div>
          <div className="mt-6 px-[6%]">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h3 className="display-3 mt-2 group-hover:text-pink-700">{t.title}</h3>
            {t.text && <p className="mt-2 max-w-sm text-ink-600">{t.text}</p>}
          </div>
        </Link>
      );
    });
  return (
    <div className="relative">
      <svg aria-hidden className="pointer-events-none absolute inset-0 -z-0 hidden h-full w-full md:block" viewBox="0 0 1000 1600" preserveAspectRatio="none">
        <path d="M-40 520 C 300 420, 600 700, 1040 300" fill="none" stroke="#e94098" strokeOpacity=".55" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <path d="M-40 1100 C 260 900, 640 1200, 1040 860" fill="none" stroke="#e94098" strokeOpacity=".45" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <path d="M200 1640 C 260 1400, 520 1380, 700 1250" fill="none" stroke="#e94098" strokeOpacity=".35" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative grid gap-16 md:grid-cols-2 md:gap-x-10 md:gap-y-0">
        <div className="space-y-16 md:space-y-28 md:pt-48">{col(left, 1)}</div>
        <div className="space-y-16 md:space-y-28">{col(right, 0)}</div>
      </div>
    </div>
  );
}

/** Outlined stadium card: visual on one side, copy and a pill button on the other. */
export function StadiumCard({
  title,
  text,
  href,
  cta,
  scene,
  tone,
  flip = false,
  id,
}: {
  title: string;
  text: ReactNode;
  href: string;
  cta: string;
  scene: SceneKind;
  tone: SceneTone;
  flip?: boolean;
  id?: string;
}) {
  return (
    <div id={id} className="scroll-mt-32 rounded-[3rem] border border-pink-500/60 p-3 sm:rounded-[999px] sm:p-5">
      <div className={`flex flex-col items-center gap-6 sm:gap-10 md:flex-row ${flip ? "md:flex-row-reverse" : ""}`}>
        <Scene kind={scene} tone={tone} className="aspect-[16/10] w-full rounded-[2.5rem] sm:rounded-[999px] md:w-1/2" />
        <div className="w-full px-4 pb-6 md:w-1/2 md:px-8 md:pb-0">
          <h3 className="display-3">{title}</h3>
          <div className="mt-3 max-w-md text-ink-600">{text}</div>
          <Link href={href} className="btn btn-outline mt-6">
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-900/20 transition-transform group-open:rotate-45">
              <Plus size={18} />
            </span>
          </summary>
          <div className="max-w-3xl pb-6 leading-relaxed text-ink-600">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

export function FinalCta({ title = "Let your rent collect itself.", text }: { title?: string; text?: string }) {
  return (
    <section className="container-x py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-[3rem] bg-plum-800 px-6 py-16 text-white sm:px-16 sm:py-24">
        <svg aria-hidden className="absolute -right-24 -top-24 h-[480px] w-[480px] opacity-40" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="198" fill="none" stroke="#e94098" />
          <circle cx="200" cy="200" r="140" fill="none" stroke="#e94098" strokeOpacity=".6" />
        </svg>
        <Eyebrow tone="light">Free until your first payment is matched</Eyebrow>
        <h2 className="display-2 mt-4 max-w-3xl">{title}</h2>
        {text && <p className="mt-4 max-w-xl text-lg text-white/80">{text}</p>}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/book-setup" className="btn btn-light">
            Book a free setup <ArrowRight size={16} weight="bold" />
          </Link>
          <Link href="/how-it-works" className="btn btn-ghost-light">
            See how it works
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Sub-page hero: rounded panel with a scene, then a split heading underneath. */
export function PageHero({
  eyebrow,
  title,
  text,
  scene,
  tone = "plum",
  children,
}: {
  eyebrow: string;
  title: string;
  text: ReactNode;
  scene: SceneKind;
  tone?: SceneTone;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="px-2 pt-2 sm:px-4 sm:pt-4">
        <Scene kind={scene} tone={tone} className="h-[64vh] max-h-[560px] min-h-[420px] rounded-b-[3rem] rounded-t-[2rem] pt-20 sm:rounded-b-[6rem]" />
      </div>
      <section className="container-x pb-8 pt-14 sm:pt-20">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="display-1 mt-4 text-balance">{title}</h1>
          </div>
          <div className="text-lg leading-relaxed text-ink-600 lg:pb-3">
            {text}
            {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
          </div>
        </div>
      </section>
    </>
  );
}

/** Numbered feature list for sub-pages, each block linkable by id. */
export function FeatureRows({ rows }: { rows: { id: string; title: string; text: ReactNode; scene: SceneKind; tone: SceneTone; points?: string[] }[] }) {
  return (
    <div className="space-y-20 sm:space-y-28">
      {rows.map((r, i) => (
        <section key={r.id} id={r.id} className="scroll-mt-32 grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <Scene kind={r.scene} tone={r.tone} className={`aspect-square rounded-full ${i % 2 ? "md:order-2" : ""}`} />
          <div>
            <p className="num text-sm font-bold text-pink-700">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="display-2 mt-2 text-balance">{r.title}</h2>
            <div className="mt-4 text-lg leading-relaxed text-ink-600">{r.text}</div>
            {r.points && (
              <ul className="mt-6 space-y-3">
                {r.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pink-500" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
