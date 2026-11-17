'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ALL_SERVICES, CAPS, PROGRAMMES } from '@/content';
import { ChevIcon, LogoSvg, SearchIcon } from '@/components/common/Icons';

type MenuKey = 'caps' | 'sols' | 'part' | 'comp' | null;

export function SiteHeader() {
  const pathname = usePathname() || '/';
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mnavOpen, setMnavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedAtRef = useRef<number>(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  const clearTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearTimer();
    closeTimerRef.current = setTimeout(() => setOpenMenu(null), 160);
  }, [clearTimer]);

  const handleOpenMenu = useCallback(
    (name: MenuKey) => {
      clearTimer();
      setOpenMenu(name);
    },
    [clearTimer],
  );

  // Close menus on route change
  useEffect(() => {
    setOpenMenu(null);
    setMnavOpen(false);
    document.body.style.overflow = '';
  }, [pathname]);

  // Sticky header shadow class
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Outside click and Escape key handling
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (!target.closest('.navitem') && !target.closest('#megaCaps')) {
        setOpenMenu(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openMenu) {
        const trigger = document.querySelector<HTMLButtonElement>(`[data-menu="${openMenu}"]`);
        setOpenMenu(null);
        trigger?.focus();
      }
      if (mnavOpen) {
        setMnavOpen(false);
        document.body.style.overflow = '';
        menuBtnRef.current?.focus();
      }
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu, mnavOpen]);

  const onEnterItem = (name: Exclude<MenuKey, null>) => {
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (!fine) return;
    if (openMenu !== name) {
      hoverOpenedAtRef.current = Date.now();
    }
    handleOpenMenu(name);
  };

  const onLeaveItem = () => {
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (fine) scheduleClose();
  };

  const onToggleButton = (name: Exclude<MenuKey, null>) => {
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const isOpen = openMenu === name;
    if (isOpen && fine && Date.now() - hoverOpenedAtRef.current < 700) {
      return;
    }
    setOpenMenu(isOpen ? null : name);
  };

  const toggleMnav = (open: boolean) => {
    setMnavOpen(open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) menuBtnRef.current?.focus();
  };

  const isCapsActive = pathname.startsWith('/capabilities') || pathname.startsWith('/services/');
  const isSolsActive = pathname.startsWith('/solutions');
  const isPartActive = ['/affiliates', '/white-label', '/partners'].includes(pathname);

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`} id="siteHeader" ref={headerRef}>
        <div className="wrap header-inner">
          <Link className="logo" href="/" aria-label="Collabify Growth home">
            <span className="logo-art" aria-hidden="true">
              <LogoSvg />
            </span>
          </Link>

          <nav className="mainnav" id="mainnav" aria-label="Main">
            <div
              className="navitem"
              data-wrap="caps"
              onMouseEnter={() => onEnterItem('caps')}
              onMouseLeave={onLeaveItem}
            >
              <button
                type="button"
                className={`navlink${isCapsActive ? ' is-current' : ''}`}
                data-menu="caps"
                aria-expanded={openMenu === 'caps'}
                aria-controls="megaCaps"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleButton('caps');
                }}
              >
                Capabilities
                <ChevIcon />
              </button>
            </div>

            <div
              className="navitem"
              data-wrap="sols"
              onMouseEnter={() => onEnterItem('sols')}
              onMouseLeave={onLeaveItem}
            >
              <button
                type="button"
                className={`navlink${isSolsActive ? ' is-current' : ''}`}
                data-menu="sols"
                aria-expanded={openMenu === 'sols'}
                aria-controls="ddSols"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleButton('sols');
                }}
              >
                Solutions
                <ChevIcon />
              </button>
              <div className="dropdown" id="ddSols" hidden={openMenu !== 'sols'}>
                {PROGRAMMES.map((p) => (
                  <Link key={p.slug} href={`/solutions/${p.slug}`}>
                    {p.name}
                  </Link>
                ))}
                <hr />
                <Link href="/solutions/custom">Custom Solutions</Link>
                <Link href="/solutions">All solutions</Link>
              </div>
            </div>

            <Link
              className={`navlink${pathname.startsWith('/community') ? ' is-current' : ''}`}
              href="/community"
            >
              Community
            </Link>

            <Link
              className={`navlink${pathname.startsWith('/blog') ? ' is-current' : ''}`}
              href="/blog"
            >
              Blog
            </Link>

            <Link
              className={`navlink${pathname.startsWith('/tools') || pathname === '/health-check' ? ' is-current' : ''}`}
              href="/tools"
            >
              Free tools <span className="free-tag">Free</span>
            </Link>

            <div
              className="navitem"
              data-wrap="part"
              onMouseEnter={() => onEnterItem('part')}
              onMouseLeave={onLeaveItem}
            >
              <button
                type="button"
                className={`navlink${isPartActive ? ' is-current' : ''}`}
                data-menu="part"
                aria-expanded={openMenu === 'part'}
                aria-controls="ddPart"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleButton('part');
                }}
              >
                Partners
                <ChevIcon />
              </button>
              <div className="dropdown" id="ddPart" hidden={openMenu !== 'part'}>
                <Link href="/affiliates">Affiliate program: refer and earn</Link>
                <Link href="/white-label">White-label for agencies</Link>
                <hr />
                <Link href="/partners">Specialist and vendor network</Link>
              </div>
            </div>

            <div
              className="navitem"
              data-wrap="comp"
              onMouseEnter={() => onEnterItem('comp')}
              onMouseLeave={onLeaveItem}
            >
              <button
                type="button"
                className={`navlink${['/about', '/how-we-work', '/who-we-serve'].includes(pathname) ? ' is-current' : ''}`}
                data-menu="comp"
                aria-expanded={openMenu === 'comp'}
                aria-controls="ddComp"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleButton('comp');
                }}
              >
                Company
                <ChevIcon />
              </button>
              <div className="dropdown" id="ddComp" hidden={openMenu !== 'comp'}>
                <Link href="/about">About</Link>
                <Link href="/how-we-work">How We Work</Link>
                <Link href="/who-we-serve">Who We Serve</Link>
              </div>
            </div>
          </nav>

          <Link
            className="icon-btn header-search"
            href="/services?focus=1"
            aria-label={`Search all ${ALL_SERVICES.length} services`}
          >
            <SearchIcon />
          </Link>

          <Link className="btn btn-primary btn-sm header-cta" href="/start-a-project">
            Start a Project
          </Link>

          <button
            ref={menuBtnRef}
            className="menu-btn"
            type="button"
            aria-controls="mnav"
            aria-expanded={mnavOpen}
            onClick={() => toggleMnav(true)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.8" fill="none" />
            </svg>
            Menu
          </button>
        </div>

        <div
          className="mega"
          id="megaCaps"
          hidden={openMenu !== 'caps'}
          onMouseEnter={() => onEnterItem('caps')}
          onMouseLeave={onLeaveItem}
        >
          <div className="wrap mega-grid">
            {CAPS.map((c) => (
              <Link key={c.id} className="mega-item" href={`/capabilities/${c.slug}`}>
                <strong>{c.name}</strong>
                <span>{c.menu}</span>
              </Link>
            ))}
            <Link className="mega-item promo" href="/solutions">
              <strong>Need more than one?</strong>
              <span>See integrated solutions</span>
            </Link>
          </div>
          <div className="wrap mega-foot">
            <span className="muted">{ALL_SERVICES.length} services across seven capabilities</span>
            <Link className="tlink" href="/services">
              Browse and search all services
            </Link>
          </div>
        </div>
      </header>

      <div
        className={`mnav${mnavOpen ? ' open' : ''}`}
        id="mnav"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="wrap mnav-top">
          <Link className="logo" href="/" aria-label="Collabify Growth home" onClick={() => toggleMnav(false)}>
            <span className="logo-art" aria-hidden="true">
              <LogoSvg />
            </span>
          </Link>
          <button
            className="menu-btn"
            style={{ display: 'inline-flex', marginLeft: 0 }}
            type="button"
            onClick={() => toggleMnav(false)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Close
          </button>
        </div>
        <div className="wrap mnav-body" id="mnavBody">
          <details>
            <summary>
              Capabilities
              <ChevIcon />
            </summary>
            {CAPS.map((c) => (
              <Link key={c.id} href={`/capabilities/${c.slug}`} onClick={() => toggleMnav(false)}>
                {c.name}
                <span>{c.menu}</span>
              </Link>
            ))}
            <Link href="/capabilities" onClick={() => toggleMnav(false)}>
              All capabilities
            </Link>
          </details>
          <details>
            <summary>
              Solutions
              <ChevIcon />
            </summary>
            {PROGRAMMES.map((p) => (
              <Link key={p.slug} href={`/solutions/${p.slug}`} onClick={() => toggleMnav(false)}>
                {p.name}
              </Link>
            ))}
            <Link href="/solutions/custom" onClick={() => toggleMnav(false)}>
              Custom Solutions
            </Link>
          </details>
          <Link href="/services" onClick={() => toggleMnav(false)}>
            All {ALL_SERVICES.length} services
          </Link>
          <Link href="/community" onClick={() => toggleMnav(false)}>
            Community
          </Link>
          <Link href="/blog" onClick={() => toggleMnav(false)}>
            Blog
          </Link>
          <Link href="/tools" onClick={() => toggleMnav(false)}>
            Free tools
          </Link>
          <Link href="/affiliates" onClick={() => toggleMnav(false)}>
            Affiliate program
          </Link>
          <Link href="/white-label" onClick={() => toggleMnav(false)}>
            White-label for agencies
          </Link>
          <Link href="/who-we-serve" onClick={() => toggleMnav(false)}>
            Who We Serve
          </Link>
          <Link href="/how-we-work" onClick={() => toggleMnav(false)}>
            How We Work
          </Link>
          <Link href="/about" onClick={() => toggleMnav(false)}>
            About
          </Link>
          <Link href="/partners" onClick={() => toggleMnav(false)}>
            Specialist network
          </Link>
        </div>
        <div className="wrap mnav-foot">
          <Link className="btn btn-primary" href="/start-a-project" onClick={() => toggleMnav(false)}>
            Start a Project
          </Link>
        </div>
      </div>
    </>
  );
}

