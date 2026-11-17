'use client';

import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHANNELS } from '@/content';
import { fmtChatTime, initials, safeUrl } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { MembershipRow, MessageRow } from '@/types/database';

interface CommunityChatClientProps {
  currentUserId: string;
  canModerate: boolean;
  initialMembers: MembershipRow[];
  initialMessages: MessageRow[];
}

export function CommunityChatClient({
  currentUserId,
  canModerate,
  initialMembers,
  initialMessages,
}: CommunityChatClientProps) {
  const router = useRouter();
  const [channelId, setChannelId] = useState<string>(CHANNELS[0]?.[0] || 'introductions');
  const [view, setView] = useState<'chat' | 'members'>('chat');
  const [members] = useState<MembershipRow[]>(initialMembers);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, MessageRow[]>>({
    [CHANNELS[0]?.[0] || 'introductions']: initialMessages,
  });
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatErr, setChatErr] = useState('');
  const [dirQuery, setDirQuery] = useState('');
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  const msgsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const memberMap = useMemo(() => {
    const map: Record<string, MembershipRow> = {};
    for (const m of members) map[m.user_id] = m;
    return map;
  }, [members]);

  const activeChannel = CHANNELS.find((c) => c[0] === channelId) || CHANNELS[0]!;
  const currentMessages = messagesByChannel[channelId] || [];

  async function fetchChannelMessages(ch: string) {
    setLoadingMsgs(true);
    setChatErr('');
    try {
      const res = await fetch(`/api/community/messages?channel=${encodeURIComponent(ch)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('load-failed');
      const data = (await res.json()) as { messages?: MessageRow[] };
      setMessagesByChannel((prev) => ({
        ...prev,
        [ch]: data.messages || [],
      }));
    } catch {
      setChatErr('Messages stopped updating. Reload the page to reconnect.');
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    if (view !== 'chat') return;
    if (!messagesByChannel[channelId]) {
      void fetchChannelMessages(channelId);
    }
  }, [channelId, view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const sub = supabase
      .channel(`community-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as MessageRow;
            if (row.deleted_at) return;
            setMessagesByChannel((prev) => {
              const existing = prev[channelId] || [];
              if (existing.some((m) => m.id === row.id)) return prev;
              return { ...prev, [channelId]: [...existing, row] };
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as MessageRow;
            setMessagesByChannel((prev) => {
              const existing = prev[channelId] || [];
              if (row.deleted_at) {
                return { ...prev, [channelId]: existing.filter((m) => m.id !== row.id) };
              }
              return {
                ...prev,
                [channelId]: existing.map((m) => (m.id === row.id ? row : m)),
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [channelId]);

  useEffect(() => {
    if (view === 'chat') {
      msgsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentMessages.length, view, channelId]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = msgText.trim();
    setChatErr('');
    if (!trimmed) return;
    if (trimmed.length > 1000) {
      setChatErr('Messages can be up to 1,000 characters.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/community/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId, body: trimmed }),
      });
      const json = (await res.json()) as { message?: MessageRow; error?: string };
      if (!res.ok || !json.message) {
        throw new Error(json.error || 'Your message didn’t send.');
      }
      setMessagesByChannel((prev) => {
        const list = prev[channelId] || [];
        if (list.some((m) => m.id === json.message!.id)) return prev;
        return { ...prev, [channelId]: [...list, json.message!] };
      });
      setMsgText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      setChatErr(err instanceof Error ? err.message : 'Your message didn’t send.');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleDelete(messageId: string) {
    try {
      const res = await fetch(`/api/community/messages/${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessagesByChannel((prev) => ({
          ...prev,
          [channelId]: (prev[channelId] || []).filter((m) => m.id !== messageId),
        }));
      }
    } catch {
      // non-fatal
    }
  }

  async function handleReport(messageId: string) {
    const reason = window.prompt('Why are you reporting this message to moderators?');
    if (reason === null) return;
    try {
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, reason: reason.trim() || 'Reported by member' }),
      });
      if (res.ok) {
        setReportedIds((prev) => new Set(prev).add(messageId));
      }
    } catch {
      // ignore
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  const filteredMembers = useMemo(() => {
    const q = dirQuery.trim().toLowerCase();
    return members
      .filter(
        (m) =>
          !q ||
          [m.display_name, m.role, m.company, m.city, m.working_on, ...(m.interests || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
      )
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [members, dirQuery]);

  return (
    <div className="chat" id="chatShell">
      <aside className="chat-side">
        <h2>Channels</h2>
        <nav aria-label="Channels">
          {CHANNELS.map((c) => (
            <button
              key={c[0]}
              type="button"
              className="ch-btn"
              aria-current={view === 'chat' && channelId === c[0] ? 'true' : 'false'}
              onClick={() => {
                setView('chat');
                setChannelId(c[0]);
              }}
            >
              <span className="hash" aria-hidden="true">
                #
              </span>
              {c[1]}
            </button>
          ))}
        </nav>

        <h2 style={{ marginTop: 22 }}>People</h2>
        <button
          type="button"
          className="ch-btn"
          aria-current={view === 'members' ? 'true' : 'false'}
          onClick={() => setView('members')}
        >
          Member directory
          <span className="c" id="memCount">
            {members.length}
          </span>
        </button>
        <button
          type="button"
          className="tlink small"
          style={{ marginTop: 18, display: 'inline-block' }}
          onClick={async () => {
            await fetch('/api/auth/signout', { method: 'POST' });
            router.push('/');
            router.refresh();
          }}
        >
          Sign out
        </button>
      </aside>

      <div className="chat-main">
        <div className="chat-head">
          <div>
            <h2 id="chName">{view === 'members' ? 'Member directory' : `# ${activeChannel[1]}`}</h2>
            <p className="small muted" id="chDesc">
              {view === 'members'
                ? 'Active members of the Collabify Community.'
                : activeChannel[2]}
            </p>
          </div>
          <label className="sr-only" htmlFor="chSelect">
            Channel
          </label>
          <select
            id="chSelect"
            className="chat-select"
            value={view === 'members' ? '__members' : channelId}
            onChange={(e) => {
              if (e.target.value === '__members') {
                setView('members');
              } else {
                setView('chat');
                setChannelId(e.target.value);
              }
            }}
          >
            {CHANNELS.map((c) => (
              <option key={c[0]} value={c[0]}>
                # {c[1]}
              </option>
            ))}
            <option value="__members">Member directory</option>
          </select>
        </div>

        <div className="msgs" id="msgs" role="log" aria-live="polite" aria-label="Messages" hidden={view !== 'chat'}>
          {loadingMsgs && currentMessages.length === 0 ? (
            <p className="muted small">Loading messages…</p>
          ) : currentMessages.length === 0 ? (
            <div className="empty-chat">
              <p>
                <strong>No messages here yet.</strong>
              </p>
              <p className="muted small" style={{ marginTop: 6 }}>
                {channelId === 'introductions'
                  ? 'Start things off: who you are, what you’re building and what you need.'
                  : 'Start the conversation.'}
              </p>
            </div>
          ) : (
            <>
              {currentMessages.map((m, idx) => {
                const prev = idx > 0 ? currentMessages[idx - 1] : null;
                const t = Date.parse(m.created_at) || 0;
                const prevT = prev ? Date.parse(prev.created_at) || 0 : 0;
                const cont = Boolean(prev && prev.user_id === m.user_id && t - prevT < 5 * 60 * 1000);
                const mem = memberMap[m.user_id];
                const name = mem?.display_name || 'Member';
                const sub = mem ? [mem.role, mem.company].filter(Boolean).join(', ') : 'Collabify team';
                const canDel = m.user_id === currentUserId || canModerate;
                return (
                  <div className={`msg${cont ? ' cont' : ''}`} key={m.id}>
                    <div className="av" aria-hidden="true">
                      {initials(name)}
                    </div>
                    <div>
                      {!cont && (
                        <p className="mh">
                          <span className="who">{name}</span>
                          {sub && <span className="sub">{sub}</span>}
                          <time dateTime={m.created_at}>{fmtChatTime(m.created_at)}</time>
                        </p>
                      )}
                      <p className="txt">{m.body}</p>
                      {canDel ? (
                        <button type="button" className="del" onClick={() => handleDelete(m.id)}>
                          Delete<span className="sr-only"> message from {name}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="del"
                          disabled={reportedIds.has(m.id)}
                          onClick={() => handleReport(m.id)}
                        >
                          {reportedIds.has(m.id) ? 'Reported' : 'Report'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={msgsEndRef} />
            </>
          )}
        </div>

        <div className="dir" id="dir" hidden={view !== 'members'}>
          <label className="sr-only" htmlFor="dirSearch">
            Search members
          </label>
          <input
            type="search"
            id="dirSearch"
            placeholder="Search by name, company, city or interest"
            value={dirQuery}
            onChange={(e) => setDirQuery(e.target.value)}
          />
          <div id="dirGrid">
            {filteredMembers.length > 0 ? (
              <div className="dir-grid">
                {filteredMembers.map((m) => (
                  <article className="person" key={m.user_id}>
                    <div className="avatar" aria-hidden="true">
                      {initials(m.display_name)}
                    </div>
                    <p className="nm">{m.display_name || 'Member'}</p>
                    <p className="rl">{[m.role, m.company].filter(Boolean).join(', ')}</p>
                    {m.city && <p className="rl">{m.city}</p>}
                    {m.interests && m.interests.length > 0 && (
                      <p className="cp">{m.interests.join(', ')}</p>
                    )}
                    {m.working_on && <p className="bio">{m.working_on}</p>}
                    {safeUrl(m.linkedin) && (
                      <a className="tlink" href={m.linkedin!} target="_blank" rel="noopener">
                        LinkedIn profile
                      </a>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 16 }}>
                {dirQuery.trim()
                  ? 'No members match that search.'
                  : 'No active members yet. Approved members appear here.'}
              </p>
            )}
          </div>
        </div>

        <form className="composer-bar" id="composer" hidden={view !== 'chat'} onSubmit={handleSend}>
          <label className="sr-only" htmlFor="msgInput">
            Message
          </label>
          <textarea
            ref={textareaRef}
            id="msgInput"
            rows={1}
            maxLength={1000}
            placeholder={`Message # ${activeChannel[1]}`}
            value={msgText}
            onChange={(e) => {
              setMsgText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
            }}
            onKeyDown={handleKeyDown}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={sending}>
            Send
          </button>
        </form>
        {chatErr && (
          <p className="err" id="chatErr" style={{ padding: '0 16px 10px' }}>
            {chatErr}
          </p>
        )}
      </div>
    </div>
  );
}

