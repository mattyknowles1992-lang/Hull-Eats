import Link from "next/link";
import type { PropsWithChildren } from "react";

import { AppSwitcher } from "../../app/app-switcher";

type LegalDocumentProps = PropsWithChildren<{
  title: string;
  summary?: string;
  updated: string;
}>;

export function LegalDocument({ title, summary, updated, children }: LegalDocumentProps) {
  return (
    <main className="shell legal-document-page">
      <header className="topbar legal-document-topbar">
        <AppSwitcher />
        <div className="topbar-actions">
          <Link href="/legal" className="glass-button">
            Legal overview
          </Link>
          <Link href="/" className="secondary-button">
            Home
          </Link>
        </div>
      </header>

      <article className="legal-document-shell">
        <header className="legal-document-header">
          <nav aria-label="Breadcrumb">
            <Link href="/legal" className="legal-document-crumb">
              Legal & policies
            </Link>
          </nav>
          <h1 className="legal-document-title">{title}</h1>
          <p className="legal-document-meta">Last updated {updated}</p>
          {summary ? <p className="legal-document-summary">{summary}</p> : null}
        </header>
        <div className="legal-document-body">{children}</div>
      </article>
    </main>
  );
}
