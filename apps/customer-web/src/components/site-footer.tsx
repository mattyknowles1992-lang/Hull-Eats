import Link from "next/link";

const year = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img
            src="/brand/hull-eats-logo.jpeg"
            alt="Hull Eats"
            width={48}
            height={48}
            className="site-footer-logo-mark"
            decoding="async"
          />
          <div>
            <p className="site-footer-brand-title">Hull Eats</p>
            <p className="site-footer-brand-copy">
              Local ordering, marketplace listings, and Hull Services — built for Hull businesses and customers.
            </p>
          </div>
        </div>

        <div className="site-footer-grid">
          <div className="site-footer-column">
            <h2 className="site-footer-heading">Hull Eats ordering</h2>
            <ul className="site-footer-list">
              <li>
                <Link href="/about">About us</Link>
              </li>
              <li>
                <Link href="/contact">Contact us</Link>
              </li>
              <li>
                <Link href="/partner">Partner with us</Link>
              </li>
              <li>
                <Link href="/legal/terms-hull-eats">Terms — ordering & account</Link>
              </li>
            </ul>
          </div>

          <div className="site-footer-column">
            <h2 className="site-footer-heading">Hull Marketplace</h2>
            <ul className="site-footer-list">
              <li>
                <Link href="/marketplace">Browse marketplace</Link>
              </li>
              <li>
                <Link href="/legal/terms-marketplace">Marketplace terms</Link>
              </li>
              <li>
                <Link href="/legal/acceptable-use">Acceptable use</Link>
              </li>
            </ul>
          </div>

          <div className="site-footer-column">
            <h2 className="site-footer-heading">Hull Services</h2>
            <ul className="site-footer-list">
              <li>
                <Link href="/services">Explore services</Link>
              </li>
              <li>
                <Link href="/legal/terms-services">Services terms</Link>
              </li>
            </ul>
          </div>

          <div className="site-footer-column">
            <h2 className="site-footer-heading">Legal & data</h2>
            <ul className="site-footer-list">
              <li>
                <Link href="/legal">All policies</Link>
              </li>
              <li>
                <Link href="/legal/privacy">Privacy notice</Link>
              </li>
              <li>
                <Link href="/legal/cookies">Cookie notice</Link>
              </li>
              <li>
                <Link href="/legal/close-account">Close your account</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer-bottom">
          <p className="site-footer-copyright">© {year} Hull Eats</p>
          <div className="site-footer-bottom-links">
            <Link href="/legal/privacy">Privacy</Link>
            <span aria-hidden="true" className="site-footer-dot">
              ·
            </span>
            <Link href="/legal/terms-hull-eats">Terms</Link>
            <span aria-hidden="true" className="site-footer-dot">
              ·
            </span>
            <a href="mailto:hello@hulleats.co.uk">hello@hulleats.co.uk</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
