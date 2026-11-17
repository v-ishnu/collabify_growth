'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ASK_SUGGESTIONS } from '@/content';
import { buildStartProjectUrl } from '@/lib/format';
import { mdToHtml } from '@/lib/markdown';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export function AskCollabify() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const panelRef = useRef<HTMLElement | null>(null);
  const launchRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const msgsRef = useRef<HTMLDivElement | null>(null);

  const toggleOpen = (next: boolean) => {
    setOpen(next);
    document.body.classList.toggle('ask-open', next);
    if (next) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setTimeout(() => launchRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [msgs, open, busy]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('ask-open');
    };
  }, []);

  const sendMessage = async (rawText: string) => {
    const q = rawText.trim();
    if (!q || busy) return;

    const history: ChatMsg[] = [...msgs, { role: 'user', content: q }];
    setMsgs([...history, { role: 'assistant', content: '' }]);
    setBusy(true);
    setInputValue('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      const replyText =
        res.ok && data.reply
          ? data.reply
          : data.error ||
            'Something interrupted that reply. Try again, or describe your goal on [Start a Project](/start-a-project).';
      setMsgs([...history, { role: 'assistant', content: replyText }]);
    } catch {
      setMsgs([
        ...history,
        {
          role: 'assistant',
          content:
            'We could not reach the assistant right now. Try browsing [all services](/services) or head to [Start a Project](/start-a-project).',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handlePanelClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest('a[href]');
    if (anchor) {
      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault();
        if (window.matchMedia('(max-width:640px)').matches) {
          toggleOpen(false);
        }
        router.push(href);
      }
    }
  };

  const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
  const startHref = buildStartProjectUrl({
    note: lastUser ? `From my chat with Ask Collabify: ${lastUser.content}` : '',
  });

  return (
    <>
      <button
        ref={launchRef}
        type="button"
        className="ask-launch"
        id="askLaunch"
        aria-expanded={open}
        aria-controls="askPanel"
        onClick={() => toggleOpen(!open)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M12 6.8l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="currentColor" />
        </svg>
        <span>Ask Collabify</span>
      </button>

      <section
        ref={panelRef}
        className="ask-panel"
        id="askPanel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="askTitle"
        hidden={!open}
        onClick={handlePanelClick}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            toggleOpen(false);
          }
        }}
      >
        <header className="ask-head">
          <div>
            <h2 id="askTitle">Ask Collabify</h2>
            <p>Questions about our services, in Hindi or English.</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close assistant"
            onClick={() => toggleOpen(false)}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </header>

        <div className="ask-msgs" id="askMsgs" ref={msgsRef} aria-live="polite" aria-busy={busy}>
          {msgs.length === 0 ? (
            <>
              <div className="ask-msg bot">
                <p>
                  Hi! Tell me what you’re working on and I’ll point you to the right services. You
                  can write in Hindi or English.
                </p>
              </div>
              <div className="ask-sugg">
                {ASK_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => void sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {msgs.map((m, idx) => (
                <div key={idx} className={`ask-msg ${m.role === 'user' ? 'me' : 'bot'}`}>
                  {m.role === 'user' ? (
                    <p>{m.content}</p>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: mdToHtml(m.content || '…') }} />
                  )}
                </div>
              ))}
              {!busy && msgs[msgs.length - 1]?.role === 'assistant' && (
                <div className="ask-sugg">
                  <Link
                    className="btn btn-secondary btn-sm"
                    href={startHref}
                    onClick={() => toggleOpen(false)}
                  >
                    Start a Project with this
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        <form
          className="ask-form"
          id="askForm"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(inputValue);
          }}
        >
          <label className="sr-only" htmlFor="askInput">
            Your question
          </label>
          <textarea
            ref={inputRef}
            id="askInput"
            rows={1}
            maxLength={600}
            placeholder="Ask anything about our services"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void sendMessage(inputValue);
              }
            }}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            Send
          </button>
        </form>
        <p className="ask-note">
          Answers can be wrong. For a confirmed scope and price,{' '}
          <Link className="tlink" href="/start-a-project" onClick={() => toggleOpen(false)}>
            start a project
          </Link>
          .
        </p>
      </section>
    </>
  );
}

