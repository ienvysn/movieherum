import Link from 'next/link';
import { Film } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div className="app-wrapper">
      <header className="site-header">
        <div className="container flex items-center justify-between site-header-inner">
          <Link href="/" className="logo-link flex items-center gap-2">
            <Film size={24} className="logo-icon" />
            <span className="logo-text">Cinemax</span>
          </Link>
          <nav className="site-nav">
            <Link href="/" className="nav-link">Movies</Link>
          </nav>
        </div>
      </header>

      <main className="site-main">
        {children}
      </main>

      <footer className="site-footer">
        <div className="container flex items-center justify-center flex-col gap-4">
          <Link href="/" className="logo-link flex items-center gap-2">
            <Film size={20} className="logo-icon text-muted" />
            <span className="logo-text text-muted">Cinemax</span>
          </Link>
          <p className="text-small text-muted">&copy; {new Date().getFullYear()} Cinemax. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        .app-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background-color: rgba(10, 10, 11, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-neutral-400);
        }

        .site-header-inner {
          height: 64px;
        }

        .logo-link {
          color: var(--color-accent-400);
          font-weight: 600;
          font-size: 1.125rem;
          transition: opacity 0.2s ease;
        }

        .logo-link:hover {
          opacity: 0.8;
        }

        .logo-icon {
          color: var(--color-accent-400);
        }

        .logo-text.text-muted {
          color: var(--color-neutral-700);
        }

        .logo-icon.text-muted {
          color: var(--color-neutral-700);
        }

        .site-nav {
          display: flex;
          gap: var(--sp-6);
        }

        .nav-link {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-neutral-800);
        }

        .nav-link:hover {
          color: var(--color-neutral-900);
        }

        .site-main {
          flex: 1;
          padding: var(--sp-8) 0;
        }

        .site-footer {
          border-top: 1px solid var(--color-neutral-400);
          padding: var(--sp-10) 0;
          background-color: var(--color-neutral-0);
        }
      `}</style>
    </div>
  );
}
