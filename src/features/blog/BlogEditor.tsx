'use client';

import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PostRow } from '@/types/database';
import { BLOG_CATS } from '@/content';
import { siteConfig } from '@/config/site';
import { fmtChatTime, slugify } from '@/lib/format';
import { estimateReadMins, mdToHtml, wordCount } from '@/lib/markdown';

interface BlogEditorProps {
  initialPost?: PostRow | null;
}

type EditorMode = 'publish' | 'update' | 'unpublish' | 'draft' | 'delete';

export function BlogEditor({ initialPost }: BlogEditorProps) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [origSlug, setOrigSlug] = useState<string | null>(initialPost?.slug ?? null);
  const [isPublished, setIsPublished] = useState<boolean>(initialPost?.status === 'published');
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(initialPost?.slug));

  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [slug, setSlug] = useState(initialPost?.slug ?? '');
  const [category, setCategory] = useState(initialPost?.category ?? '');
  const [authorName, setAuthorName] = useState(
    initialPost?.author_name || 'Collabify Growth team'
  );
  const [focusKeyword, setFocusKeyword] = useState(initialPost?.focus_keyword ?? '');
  const [bodyMd, setBodyMd] = useState(initialPost?.body_md ?? '');
  const [seoTitle, setSeoTitle] = useState(initialPost?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(initialPost?.seo_description ?? '');
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialPost?.updated_at ?? null);

  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{
    type: 'error' | 'ok';
    title: string;
    items?: string[];
  } | null>(null);

  const checks = useMemo(() => {
    const kw = focusKeyword.trim().toLowerCase();
    const st = (seoTitle || title).trim();
    const words = wordCount(bodyMd);
    const firstPara = (
      bodyMd.split(/\n\s*\n/).find((b) => b.trim() && !/^\s*#/.test(b)) || ''
    ).toLowerCase();
    const subheads = (bodyMd.match(/^#{2,3}\s+/gm) || []).length;
    const kwSlug = slugify(kw);
    return [
      [Boolean(kw), 'A focus keyword is set'],
      [Boolean(kw) && st.toLowerCase().includes(kw), 'Keyword appears in the SEO title'],
      [
        Boolean(kw) && seoDescription.toLowerCase().includes(kw),
        'Keyword appears in the meta description',
      ],
      [Boolean(kw) && firstPara.includes(kw), 'Keyword appears in the first paragraph'],
      [
        Boolean(kw) && Boolean(slug) && Boolean(kwSlug) && slug.includes(kwSlug),
        'Keyword appears in the web address',
      ],
      [st.length >= 30 && st.length <= 60, `SEO title is 30–60 characters (now ${st.length})`],
      [
        seoDescription.trim().length >= 120 && seoDescription.trim().length <= 155,
        `Meta description is 120–155 characters (now ${seoDescription.trim().length})`,
      ],
      [subheads >= 2, `At least two subheadings (now ${subheads})`],
      [words >= 800, `At least 800 words (now ${words})`],
      [
        /\]\((#\/|\/(services|capabilities|solutions|tools|health-check|start-a-project))/.test(
          bodyMd
        ),
        'Links to at least one page on this site',
      ],
    ] as Array<[boolean, string]>;
  }, [focusKeyword, seoTitle, title, bodyMd, seoDescription, slug]);

  const passedCount = checks.filter((c) => c[0]).length;

  function insertFmt(kind: 'h2' | 'h3' | 'b' | 'i' | 'link' | 'ul' | 'ol' | 'quote') {
    const ta = bodyRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const v = bodyMd;
    const sel = v.slice(s, e);
    const linePrefix: Record<string, string> = {
      h2: '## ',
      h3: '### ',
      ul: '- ',
      ol: '1. ',
      quote: '> ',
    };

    let next = v;
    let nextStart = s;
    let nextEnd = e;

    const pre = linePrefix[kind];
    if (pre) {
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      next = `${v.slice(0, ls)}${pre}${v.slice(ls)}`;
      nextStart = nextEnd = e + pre.length;
    } else {
      const ins =
        kind === 'b'
          ? `**${sel || 'bold text'}**`
          : kind === 'i'
            ? `*${sel || 'italic text'}*`
            : `[${sel || 'link text'}](https://)`;
      next = `${v.slice(0, s)}${ins}${v.slice(e)}`;
      nextStart = s;
      nextEnd = s + ins.length;
    }

    setBodyMd(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = nextStart;
      ta.selectionEnd = nextEnd;
    });
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/blog/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload failed.');
      }
      const ta = bodyRef.current;
      const altText = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      const mdImg = `\n![${altText}](${data.url})\n`;
      if (ta) {
        const s = ta.selectionStart;
        const next = `${bodyMd.slice(0, s)}${mdImg}${bodyMd.slice(ta.selectionEnd)}`;
        setBodyMd(next);
      } else {
        setBodyMd((prev) => `${prev}${mdImg}`);
      }
    } catch (err) {
      setMsg({
        type: 'error',
        title: err instanceof Error ? err.message : 'Image upload failed.',
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(mode: EditorMode) {
    setMsg(null);
    if (mode === 'delete') {
      if (!origSlug) return;
      if (!window.confirm('Delete this post permanently?')) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/blog/posts/${encodeURIComponent(origSlug)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error || 'Could not delete post.');
        }
        router.push('/blog');
        router.refresh();
      } catch (err) {
        setMsg({
          type: 'error',
          title: err instanceof Error ? err.message : 'Delete failed.',
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    const cleanSlug = isPublished && origSlug ? origSlug : slugify(slug);
    const errs: string[] = [];
    if (!title.trim()) errs.push('Add a title.');
    if (!cleanSlug) errs.push('Add a web address.');
    if (mode === 'publish' || mode === 'update') {
      if (wordCount(bodyMd) < 50) errs.push('Write at least 50 words before publishing.');
      if (!seoDescription.trim()) errs.push('Add a meta description before publishing.');
    }
    if (errs.length > 0) {
      setMsg({
        type: 'error',
        title: `Fix ${errs.length} ${errs.length === 1 ? 'thing' : 'things'} first.`,
        items: errs,
      });
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        slug: cleanSlug,
        category: category.trim() || null,
        author_name: authorName.trim() || 'Collabify Growth team',
        focus_keyword: focusKeyword.trim() || null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        body_md: bodyMd,
        read_mins: estimateReadMins(bodyMd),
        action: mode,
      };

      const res = origSlug
        ? await fetch(`/api/blog/posts/${encodeURIComponent(origSlug)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/blog/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = (await res.json()) as { post?: PostRow; error?: string };
      if (!res.ok || !data.post) {
        throw new Error(data.error || 'Could not save post.');
      }

      if (mode === 'publish' || mode === 'update') {
        router.push(`/blog/${data.post.slug}`);
        router.refresh();
        return;
      }

      if (mode === 'unpublish') {
        setIsPublished(false);
        setOrigSlug(data.post.slug);
        setUpdatedAt(data.post.updated_at);
        router.push(`/blog/write/${data.post.slug}`);
        router.refresh();
        return;
      }

      setOrigSlug(data.post.slug);
      setSlug(data.post.slug);
      setUpdatedAt(data.post.updated_at);
      setMsg({ type: 'ok', title: 'Draft saved.' });
      if (!origSlug) {
        window.history.replaceState(null, '', `/blog/write/${data.post.slug}`);
      }
    } catch (err) {
      setMsg({
        type: 'error',
        title: err instanceof Error ? err.message : 'That didn’t save. Check your connection.',
      });
    } finally {
      setBusy(false);
    }
  }

  const serpDomain = siteConfig.url.replace(/^https?:\/\//, '');
  const serpHeadline = seoTitle.trim() || title.trim() || 'Your post title';
  const serpTitleDisplay =
    serpHeadline.length > 62 ? `${serpHeadline.slice(0, 60)}…` : serpHeadline;
  const serpDesc = seoDescription.trim()
    ? seoDescription.trim().length > 158
      ? `${seoDescription.trim().slice(0, 155)}…`
      : seoDescription.trim()
    : 'Add a meta description to control this summary.';

  const stLen = (seoTitle || title).trim().length;
  const sdLen = seoDescription.trim().length;

  return (
    <div className="editor">
      <div className="ed-main">
        <form id="edForm" noValidate onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="ed_title">Title</label>
            <input
              type="text"
              id="ed_title"
              className="ed-title"
              maxLength={140}
              placeholder="A clear, specific headline"
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                if (!slugTouched && !isPublished) setSlug(slugify(v));
              }}
            />
          </div>

          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="ed_slug">Web address</label>
            <div className="slug-field">
              <span aria-hidden="true">/blog/</span>
              <input
                type="text"
                id="ed_slug"
                readOnly={isPublished}
                aria-describedby={isPublished ? 'ed_slug-hint' : undefined}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                onBlur={() => {
                  if (!isPublished) setSlug((s) => slugify(s));
                }}
              />
            </div>
            {isPublished && (
              <p className="hint" id="ed_slug-hint" style={{ marginTop: 4 }}>
                Locked after publishing, so existing links and search rankings aren’t lost.
              </p>
            )}
          </div>

          <div className="form-grid" style={{ marginTop: 18 }}>
            <div className="field">
              <label htmlFor="ed_cat">Category</label>
              <input
                type="text"
                id="ed_cat"
                list="catList"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id="catList">
                {BLOG_CATS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label htmlFor="ed_author">Author</label>
              <input
                type="text"
                id="ed_author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
            </div>

            <div className="field full">
              <label htmlFor="ed_kw">Focus keyword</label>
              <p className="hint" id="ed_kw-hint">
                The main search phrase this post should rank for, such as “podcast production for
                startups”.
              </p>
              <input
                type="text"
                id="ed_kw"
                aria-describedby="ed_kw-hint"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="tabs" role="tablist" aria-label="Editor view" style={{ marginTop: 28 }}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'write'}
              onClick={() => setTab('write')}
            >
              Write
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'preview'}
              onClick={() => setTab('preview')}
            >
              Preview
            </button>
          </div>

          <div id="edWrite" hidden={tab !== 'write'}>
            <div className="toolbar" role="toolbar" aria-label="Formatting">
              {(
                [
                  ['h2', 'Heading'],
                  ['h3', 'Subheading'],
                  ['b', 'Bold'],
                  ['i', 'Italic'],
                  ['link', 'Link'],
                  ['ul', 'Bullets'],
                  ['ol', 'Numbers'],
                  ['quote', 'Quote'],
                ] as const
              ).map(([kind, label]) => (
                <button key={kind} type="button" onClick={() => insertFmt(kind)}>
                  {label}
                </button>
              ))}
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'Uploading…' : 'Image'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={handleImageUpload}
              />
            </div>

            <label className="sr-only" htmlFor="ed_body">
              Post body
            </label>
            <textarea
              ref={bodyRef}
              id="ed_body"
              className="ed-body"
              spellCheck
              placeholder="Start writing. Use ## for section headings."
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
            />
            <p className="hint" style={{ marginTop: 8 }}>
              Formatting: ## heading, **bold**, *italic*, [link text](https://…), - list item.
              Link to your own pages with addresses like /services or /capabilities/technology.
            </p>
          </div>

          <div id="edPreview" className="prose ed-preview" hidden={tab !== 'preview'}>
            <h1 className="post-h1" style={{ marginTop: 0 }}>
              {title.trim() || 'Untitled'}
            </h1>
            <div dangerouslySetInnerHTML={{ __html: mdToHtml(bodyMd) }} />
          </div>

          <h2 className="ed-h2">Search appearance</h2>
          <div className="field">
            <label htmlFor="ed_seot">SEO title</label>
            <p className="hint" id="ed_seot-hint">
              The clickable headline in search results. Aim for 30–60 characters.
            </p>
            <input
              type="text"
              id="ed_seot"
              aria-describedby="ed_seot-hint ed_seot-c"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
            <p
              className={`counter ${stLen === 0 ? '' : stLen >= 30 && stLen <= 60 ? 'good' : 'warn'}`}
              id="ed_seot-c"
            >
              {seoTitle.length} characters
            </p>
          </div>

          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="ed_seod">Meta description</label>
            <p className="hint" id="ed_seod-hint">
              The summary under the headline in search results and on the blog page. Aim for
              120–155 characters.
            </p>
            <textarea
              id="ed_seod"
              style={{ minHeight: 96 }}
              aria-describedby="ed_seod-hint ed_seod-c"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
            <p
              className={`counter ${sdLen === 0 ? '' : sdLen >= 120 && sdLen <= 155 ? 'good' : 'warn'}`}
              id="ed_seod-c"
            >
              {seoDescription.length} characters
            </p>
          </div>
        </form>
      </div>

      <aside className="ed-side">
        <div className="callout">
          <p>
            <span className={`status${isPublished ? ' contacted' : ''}`}>
              {isPublished ? 'Published' : 'Draft'}
            </span>{' '}
            <span className="small muted" id="edSaved">
              {updatedAt ? `Last saved ${fmtChatTime(updatedAt)}` : 'Not saved yet'}
            </span>
          </p>

          <div className="btn-row" style={{ marginTop: 14 }}>
            {isPublished ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => handleSave('update')}
                >
                  Update post
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => handleSave('unpublish')}
                >
                  Unpublish
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => handleSave('publish')}
                >
                  Publish
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => handleSave('draft')}
                >
                  Save draft
                </button>
              </>
            )}
          </div>

          {origSlug && (
            <button
              type="button"
              className="btn-quiet"
              style={{ marginTop: 6, color: 'var(--danger)' }}
              disabled={busy}
              onClick={() => handleSave('delete')}
            >
              Delete post
            </button>
          )}

          <div id="edMsg" aria-live="polite" style={{ marginTop: 12 }}>
            {msg && (
              <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-ok'}`}>
                <strong>{msg.title}</strong>
                {msg.items && msg.items.length > 0 && (
                  <ul>
                    {msg.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="callout">
          <h3 style={{ fontSize: '1.05rem' }}>Search preview</h3>
          <div className="serp" id="serp" style={{ marginTop: 12 }}>
            <p className="u">
              {serpDomain} › blog › {slug || 'web-address'}
            </p>
            <p className="t">{serpTitleDisplay}</p>
            <p className="d">{serpDesc}</p>
          </div>
        </div>

        <div className="callout">
          <h3 style={{ fontSize: '1.05rem' }}>
            SEO checklist{' '}
            <span className="muted small" id="seoScore">
              {passedCount} of {checks.length}
            </span>
          </h3>
          <ul className="checklist" id="seoList" style={{ marginTop: 12 }}>
            {checks.map(([ok, label]) => (
              <li key={label} className={ok ? 'ok' : 'no'}>
                <span className="mk" aria-hidden="true">
                  {ok ? '✓' : '○'}
                </span>
                <span>
                  {label}
                  <span className="sr-only">{ok ? ', done' : ', not yet'}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ marginTop: 12 }}>
            These checks follow common on-page practice. They help, but no checklist guarantees a
            ranking.
          </p>
        </div>
      </aside>
    </div>
  );
}

