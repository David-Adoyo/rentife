"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "@phosphor-icons/react";
import { Scene, type SceneKind, type SceneTone } from "./Vignettes";

export type Story = { tag: string; title: string; href: string; scene: SceneKind; tone: SceneTone; photo?: string; position?: string; place?: string };

export function StoryCarousel({ stories }: { stories: Story[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const n = stories.length;
  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), 6000);
    return () => clearInterval(t);
  }, [playing, n]);

  return (
    <section aria-roledescription="carousel" aria-label="What Rentife does" className="relative">
      <div className="container-x flex justify-end gap-2 pb-4">
        <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-900/70 hover:bg-ink-900 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-900/70 hover:bg-ink-900 hover:text-white">
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="relative overflow-hidden">
        <div
          className="flex gap-5 transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] sm:gap-8"
          style={{
            // Centre the active slide; neighbours peek in from both sides.
            transform: `translateX(calc(50vw - (var(--slide) / 2) - ${index} * (var(--slide) + var(--gap))))`,
            ["--slide" as string]: "min(86vw, 940px)",
            ["--gap" as string]: "clamp(1.25rem, 2vw, 2rem)",
          }}
        >
          {stories.map((s, i) => (
            <Link
              key={s.title}
              href={s.href}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}: ${s.title}`}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
              className={`group relative block w-[min(86vw,940px)] shrink-0 transition-[opacity,transform] duration-700 ${
                i === index ? "opacity-100" : "scale-[0.92] opacity-60"
              }`}
            >
              <Scene
                kind={s.scene}
                tone={s.tone}
                label={false}
                photo={s.photo ? { src: s.photo, position: s.position, priority: i === 0 } : undefined}
                sizes="(min-width: 1024px) 940px, 86vw"
                className="h-[clamp(400px,72vw,440px)] rounded-[min(30vw,220px)] pb-20 pt-14 shadow-float"
              />
              <span className="absolute left-[10%] top-[16%] rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-900 shadow-soft">
                {s.tag}
              </span>
              {s.place && (
                <span className="absolute right-[10%] top-[16%] hidden items-center gap-1.5 rounded-full bg-plum-900/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:flex">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                  {s.place}
                </span>
              )}
              <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-6 py-3 text-lg font-medium text-ink-900 shadow-float sm:text-2xl">
                {s.title}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
          {stories.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.title}
              onClick={() => go(i)}
              className="flex h-11 items-center"
            >
              <span className={`block h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-pink-500" : "w-1.5 bg-ink-900"}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-900/70"
        >
          {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </button>
      </div>
    </section>
  );
}
