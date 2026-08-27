import Link from "next/link";
import type { LandingSeoContent } from "@/lib/landing-seo";

export function LandingSeoContent({ content }: { content: LandingSeoContent }) {
  return (
    <section className="landing-seo-content" aria-labelledby={`${content.id}-title`} dir="rtl">
      <div className="landing-seo-intro">
        <p>{content.eyebrow}</p>
        <h2 id={`${content.id}-title`}>{content.heading}</h2>
        <div>{content.intro}</div>
        <nav className="landing-seo-links" aria-label={`${content.eyebrow}؛ پیوندهای کاربردی`}>
          {content.links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
      </div>
      <div className="landing-seo-faq" aria-label="پرسش‌های متداول">
        {content.faqs.map((faq, index) => (
          <details key={faq.question} open={index === 0}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
