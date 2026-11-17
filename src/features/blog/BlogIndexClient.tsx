'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { PostRow } from '@/types/database';
import { fmtDay } from '@/lib/format';

export function BlogIndexClient({ initialPosts }: { initialPosts: PostRow[] }) {
  const [posts, setPosts] = useState<PostRow[]>(initialPosts);
  const [drafts, setDrafts] = useState<PostRow[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { canViewAdmin?: boolean } | null) => {
        if (!active || !me?.canViewAdmin) return;
        setCanEdit(true);
        return fetch('/api/blog/posts?includeDrafts=1', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { posts?: PostRow[] } | null) => {
            if (!active || !data?.posts) return;
            const pub = data.posts.filter((p) => p.status === 'published');
            const dr = data.posts.filter((p) => p.status === 'draft');
            setPosts(pub);
            setDrafts(dr);
          });
      })
      .catch(() => {
        // non-fatal
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(posts.map((p) => p.category || '').filter(Boolean))),
    [posts]
  );

  const activeCat = cat !== 'all' && !categories.includes(cat) ? 'all' : cat;
  const filtered = useMemo(
    () => (activeCat === 'all' ? posts : posts.filter((p) => p.category === activeCat)),
    [posts, activeCat]
  );

  const featured = filtered[0];

  return (
    <>
      {canEdit && (
        <div id="blogAdmin">
          <div className="admin-bar">
            <div>
              <strong>Blog admin</strong>{' '}
              <span className="muted small">Only you and editors see this bar.</span>
            </div>
            <Link className="btn btn-primary btn-sm" href="/blog/write">
              Write a post
            </Link>
          </div>
          {drafts.length > 0 ? (
            <details className="drafts">
              <summary>Drafts ({drafts.length})</summary>
              <ul>
                {drafts.map((d) => (
                  <li key={d.slug}>
                    <Link className="tlink" href={`/blog/write/${d.slug}`}>
                      {d.title || 'Untitled'}
                    </Link>{' '}
                    <span className="muted small">updated {fmtDay(d.updated_at)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <div style={{ height: 12 }} />
          )}
        </div>
      )}

      {categories.length > 1 && (
        <div className="filters" id="blogFilters" role="group" aria-label="Filter by category">
          {['all', ...categories].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={activeCat === c}
              onClick={() => setCat(c)}
            >
              {c === 'all' ? 'All articles' : c}
            </button>
          ))}
        </div>
      )}

      <div id="blogList">
        {!featured ? (
          <div className="empty-state">
            <h2>The first articles are on their way.</h2>
            <p className="muted">
              {canEdit
                ? 'Write your first post to start building search traffic.'
                : 'In the meantime, browse our services or tell us what you’re working on.'}
            </p>
            <div className="btn-row" style={{ marginTop: 20 }}>
              {canEdit ? (
                <Link className="btn btn-primary" href="/blog/write">
                  Write your first post
                </Link>
              ) : (
                <>
                  <Link className="btn btn-secondary" href="/services">
                    Browse services
                  </Link>
                  <Link className="btn btn-primary" href="/start-a-project">
                    Start a Project
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <Link className="featured" href={`/blog/${featured.slug}`}>
              <div>
                <p className="post-meta">{featured.category || 'Article'}</p>
                <h2>{featured.title}</h2>
              </div>
              <div>
                <p className="lede">{featured.seo_description || ''}</p>
                <p className="post-meta" style={{ marginTop: 14 }}>
                  {fmtDay(featured.published_at || featured.updated_at)}, {featured.read_mins || 1}{' '}
                  min read
                </p>
              </div>
            </Link>

            {filtered.slice(1).map((p) => (
              <Link className="post-row" href={`/blog/${p.slug}`} key={p.slug}>
                <p className="post-meta">{fmtDay(p.published_at || p.updated_at)}</p>
                <div>
                  <h3>{p.title}</h3>
                  <p className="muted">{p.seo_description || ''}</p>
                </div>
                <p className="post-meta">
                  {p.category || 'Article'}, {p.read_mins || 1} min read
                </p>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  );
}

