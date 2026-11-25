import Link from "next/link";
import { Eyebrow } from "@/components/primitives";

export default function NotFound() {
  return (
    <section className="container-x pb-24 pt-40 sm:pt-48">
      <Eyebrow>Page not found</Eyebrow>
      <h1 className="display-1 mt-4 max-w-3xl">This unit is vacant</h1>
      <p className="mt-6 max-w-md text-lg text-ink-600">The page you were looking for doesn’t exist or has moved.</p>
      <Link href="/" className="btn btn-primary mt-8">Back to the home page</Link>
    </section>
  );
}
