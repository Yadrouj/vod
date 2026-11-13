import type { EntityFaq } from '@/lib/entity-seo';
import { StructuredData } from './structured-data';
import styles from './entity-faq.module.css';

/** One visible FAQ source supplies both HTML answers and machine-readable data. */
export function EntityFaqSection({ items, id = 'entity-faq' }: { items: EntityFaq[]; id?: string }) {
  if (!items.length) return null;
  return <section className={styles.faq} aria-labelledby={`${id}-heading`} dir="rtl">
    <h2 id={`${id}-heading`}>پرسش‌های متداول</h2>
    {items.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
    <StructuredData data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(item => ({
      '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })) }} />
  </section>;
}
