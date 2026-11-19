import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  MessageSquare,
  Minus,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  BRAND_IDENTITY,
  isAuthorizedAdminIdentity,
} from '../lib/domain';
import {
  CHATBOT_DEFAULT_ADMIN_WHATSAPP_DISPLAY,
  CHATBOT_DEFAULT_DESCRIPTION,
  CHATBOT_DEFAULT_NAME,
  CHATBOT_DEFAULT_SUGGESTED_QUESTIONS,
  CHATBOT_DEFAULT_TAGLINE,
  CHATBOT_DEFAULT_WELCOME_MESSAGE,
  type PublicChatbotSettingsView,
  buildChatbotWhatsappUrl,
} from '../lib/aiDomain';
import { WhatsAppBrandIcon } from './BrandIcons';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAtLabel: string;
  suggestWhatsapp?: boolean;
  whatsappUrl?: string;
  isError?: boolean;
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sess_${crypto.randomUUID()}`;
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatNowTime(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderInlineSegments(text: string): React.ReactNode[] {
  // Safely parse bold (**text**), markdown links ([label](url)), and raw http(s) URLs without HTML injection
  const tokenRegex =
    /(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/[^\s)]+|\/[a-zA-Z0-9/_-]*)\)|https?:\/\/[^\s)]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b_${keyCounter++}`} className="font-semibold text-[#141A23]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        if (href.startsWith('/')) {
          parts.push(
            <Link
              key={`l_${keyCounter++}`}
              to={href}
              className="font-semibold text-[#A61B38] underline underline-offset-2 hover:text-[#88132B]"
            >
              {label}
            </Link>
          );
        } else {
          parts.push(
            <a
              key={`a_${keyCounter++}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#0F6E66] underline underline-offset-2 hover:text-[#0B534D] break-all"
            >
              {label}
            </a>
          );
        }
      } else {
        parts.push(token);
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      const cleanedHref = token.replace(/[.,;!?]+$/, '');
      const trailing = token.slice(cleanedHref.length);
      parts.push(
        <a
          key={`u_${keyCounter++}`}
          href={cleanedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#0F6E66] underline underline-offset-2 hover:text-[#0B534D] break-all"
        >
          {cleanedHref}
        </a>
      );
      if (trailing) parts.push(trailing);
    } else {
      parts.push(token);
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function FormattedAssistantText({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: Array<{ ordered: boolean; text: string }> = [];
  let blockKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    const ListTag = isOrdered ? 'ol' : 'ul';
    blocks.push(
      <ListTag
        key={`list_${blockKey++}`}
        className={`space-y-1 pl-4 text-[13.5px] leading-relaxed ${
          isOrdered ? 'list-decimal' : 'list-disc'
        }`}
      >
        {listItems.map((item, idx) => (
          <li key={idx}>{renderInlineSegments(item.text)}</li>
        ))}
      </ListTag>
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (bulletMatch) {
      if (listItems.length > 0 && listItems[0].ordered) flushList();
      listItems.push({ ordered: false, text: bulletMatch[1] });
      continue;
    }
    if (orderedMatch) {
      if (listItems.length > 0 && !listItems[0].ordered) flushList();
      listItems.push({ ordered: true, text: orderedMatch[1] });
      continue;
    }

    flushList();

    if (!trimmed) {
      blocks.push(<div key={`sp_${blockKey++}`} className="h-1.5" />);
    } else {
      blocks.push(
        <p key={`p_${blockKey++}`} className="text-[13.5px] leading-relaxed">
          {renderInlineSegments(trimmed)}
        </p>
      );
    }
  }
  flushList();

  return <div className="space-y-1.5">{blocks}</div>;
}

const FALLBACK_PUBLIC_SETTINGS: PublicChatbotSettingsView = {
  enabled: true,
  botName: CHATBOT_DEFAULT_NAME,
  tagline: CHATBOT_DEFAULT_TAGLINE,
  description: CHATBOT_DEFAULT_DESCRIPTION,
  welcomeMessage: CHATBOT_DEFAULT_WELCOME_MESSAGE,
  suggestedQuestions: [...CHATBOT_DEFAULT_SUGGESTED_QUESTIONS],
  adminWhatsappDisplay: CHATBOT_DEFAULT_ADMIN_WHATSAPP_DISPLAY,
  adminWhatsappNumber: '6283121902760',
  adminWhatsappUrl: buildChatbotWhatsappUrl(
    CHATBOT_DEFAULT_ADMIN_WHATSAPP_DISPLAY,
    'Halo Admin TOMOYO EDUCATION, saya membutuhkan informasi lebih lanjut.'
  ),
  publicEnabled: true,
  adminEnabled: true,
  maxRequestsPerSession: 20,
  maxInputLength: 600,
};

export function TomoyoAssistantWidget() {
  const { user } = useAuth();
  const isVerifiedAdmin = Boolean(
    user &&
      isAuthorizedAdminIdentity({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
      })
  );

  const [settings, setSettings] = useState<PublicChatbotSettingsView>(FALLBACK_PUBLIC_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Widget visual state: 'closed' -> 'open' -> 'minimized' (closed & minimized both show circular button, keeping memory)
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/settings')
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as PublicChatbotSettingsView;
      })
      .then((json) => {
        if (!cancelled && json && typeof json.enabled === 'boolean') {
          setSettings(json);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (messages.length === 0 && !sending) {
      if (transcriptRef.current) {
        transcriptRef.current.scrollTop = 0;
      }
      return;
    }
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, sending]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Hide widget cleanly when disabled by admin (unless admin mode is enabled for admin)
  const visibleForVisitor = settings.enabled && (settings.publicEnabled || (isVerifiedAdmin && settings.adminEnabled));
  if (settingsLoaded && !visibleForVisitor) {
    return null;
  }

  const handleResetConversation = () => {
    setMessages([]);
    setLastFailedPrompt(null);
    setInputText('');
    setSessionId(generateSessionId());
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const handleSendMessage = async (overrideText?: string) => {
    const raw = typeof overrideText === 'string' ? overrideText : inputText;
    const trimmed = raw.trim();
    if (!trimmed || sending) return;

    if (trimmed.length > settings.maxInputLength) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Pesan melebihi batas ${settings.maxInputLength} karakter. Mohon persingkat pertanyaan Anda.`,
          createdAtLabel: formatNowTime(),
          isError: true,
        },
      ]);
      return;
    }

    const userMsg: ChatMessageItem = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: trimmed,
      createdAtLabel: formatNowTime(),
    };

    const historySnapshot = messages
      .filter((m) => !m.isError)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    if (typeof overrideText !== 'string') {
      setInputText('');
    }
    setLastFailedPrompt(null);
    setSending(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30_000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (isVerifiedAdmin && user) {
        try {
          const token = await user.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        } catch {
          // Proceed in public mode if token retrieval fails
        }
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          sessionId,
          message: trimmed,
          history: historySnapshot,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        suggestWhatsapp?: boolean;
        whatsappUrl?: string;
      };

      const replyText =
        (typeof data.reply === 'string' && data.reply.trim()) ||
        'Maaf, layanan asisten tidak dapat menjawab saat ini. Silakan hubungi Admin WhatsApp.';

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content: replyText,
          createdAtLabel: formatNowTime(),
          suggestWhatsapp: Boolean(data.suggestWhatsapp) || !res.ok,
          whatsappUrl: data.whatsappUrl || settings.adminWhatsappUrl,
          isError: !res.ok && !data.reply,
        },
      ]);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      setLastFailedPrompt(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: `a_err_${Date.now()}`,
          role: 'assistant',
          content: isAbort
            ? 'Waktu tunggu respons habis (timeout). Silakan coba kirim ulang atau hubungi admin langsung via WhatsApp.'
            : 'Koneksi ke TOMOYO ASISTEN gagal sementara. Silakan coba lagi atau hubungi Admin WhatsApp.',
          createdAtLabel: formatNowTime(),
          suggestWhatsapp: true,
          whatsappUrl: settings.adminWhatsappUrl,
          isError: true,
        },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setSending(false);
    }
  };

  return (
    <div className="no-print" data-testid="tomoyo-assistant-root">
      {/* STATE 1 & 3: Closed / Minimized Floating Circular Bubble */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 80);
          }}
          data-testid="tomoyo-assistant-launcher"
          aria-label={`Buka ${settings.botName}`}
          title={`${settings.botName} — ${settings.tagline}`}
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#A61B38] hover:bg-[#88132B] text-white border-2 border-white shadow-[0_8px_24px_rgba(20,26,35,0.22)] flex items-center justify-center transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141A23] cursor-pointer"
        >
          <MessageSquare className="w-6 h-6" aria-hidden="true" />
          {messages.length > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#0F6E66] border border-white text-[10px] font-mono font-bold text-white flex items-center justify-center tabular-nums"
              aria-label={`${messages.length} pesan pada sesi aktif`}
            >
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* STATE 2: Expanded Floating Chat Window */}
      {isOpen && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label={`${settings.botName} — ${settings.tagline}`}
          data-testid="tomoyo-assistant-dialog"
          className="fixed z-50 inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(410px,calc(100vw-2rem))] h-[min(560px,calc(100dvh-2rem))] sm:h-[min(600px,calc(100dvh-2.5rem))] max-h-[86dvh] bg-white border border-[#E5E2D9] rounded-2xl shadow-[0_18px_48px_rgba(20,26,35,0.18)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <header className="bg-[#141A23] text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={BRAND_IDENTITY.emblemLogoPath}
                alt="TOMOYO EDUCATION"
                className="w-9 h-9 rounded-lg bg-white p-0.5 object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-white truncate">
                    {settings.botName}
                  </h2>
                  {isVerifiedAdmin && (
                    <span className="px-1.5 py-0.5 rounded bg-[#0F6E66] text-[10px] font-mono font-semibold text-white shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  {settings.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetConversation}
                title="Percakapan Baru"
                aria-label="Percakapan Baru"
                data-testid="tomoyo-assistant-new-chat"
                className="inline-flex items-center gap-1 px-2.5 min-h-[38px] rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden xs:inline">Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize"
                aria-label="Minimize jendela percakapan"
                data-testid="tomoyo-assistant-minimize"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup"
                aria-label="Tutup jendela percakapan"
                data-testid="tomoyo-assistant-close"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* Body / Transcript */}
          <div ref={transcriptRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-[#FAF9F5]">
            {/* Opening Greeting */}
            <div className="bg-white border border-[#E5E2D9] rounded-xl rounded-tl-sm p-3.5 text-[#141A23] shadow-[0_1px_2px_rgba(20,26,35,0.03)]">
              <FormattedAssistantText content={settings.welcomeMessage} />
            </div>

            {/* Suggested Questions when session is fresh */}
            {messages.length === 0 && settings.suggestedQuestions.length > 0 && (
              <div className="space-y-2 pt-1" data-testid="tomoyo-assistant-suggestions">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#646F7E]">
                  Pertanyaan Populer
                </p>
                <div className="flex flex-col gap-1.5">
                  {settings.suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={sending}
                      onClick={() => void handleSendMessage(question)}
                      className="text-left px-3 py-2.5 min-h-[40px] rounded-xl bg-white border border-[#E5E2D9] hover:border-[#A61B38] hover:text-[#A61B38] text-xs font-medium text-[#141A23] transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Session Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-[#A61B38] text-white rounded-tr-sm'
                      : msg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-sm'
                      : 'bg-white border border-[#E5E2D9] text-[#141A23] rounded-tl-sm shadow-[0_1px_2px_rgba(20,26,35,0.03)]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {msg.isError && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Kendala Layanan</span>
                        </div>
                      )}
                      <FormattedAssistantText content={msg.content} />

                      {msg.suggestWhatsapp && (
                        <div className="pt-1 flex flex-wrap gap-2">
                          <a
                            href={msg.whatsappUrl || settings.adminWhatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="tomoyo-assistant-whatsapp-cta"
                            className="inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg bg-[#0F6E66] hover:bg-[#0B534D] text-white text-xs font-semibold transition-colors"
                          >
                            <WhatsAppBrandIcon className="w-4 h-4 shrink-0" />
                            <span>Hubungi Admin WhatsApp</span>
                          </a>
                          {msg.isError && lastFailedPrompt && (
                            <button
                              type="button"
                              onClick={() => void handleSendMessage(lastFailedPrompt)}
                              className="inline-flex items-center px-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#E5E2D9] hover:border-[#141A23] text-xs font-semibold text-[#141A23] cursor-pointer"
                            >
                              Coba Lagi
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] font-mono text-[#646F7E] tabular-nums">
                  {msg.createdAtLabel}
                </span>
              </div>
            ))}

            {/* Typing / Processing Indicator */}
            {sending && (
              <div className="flex items-start" aria-live="polite">
                <div className="bg-white border border-[#E5E2D9] rounded-xl rounded-tl-sm px-3.5 py-2.5 text-xs text-[#3E4856] flex items-center gap-2">
                  <span className="inline-flex items-center gap-1" aria-hidden="true">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A61B38] animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#A61B38] animate-bounce"
                      style={{ animationDelay: '120ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#A61B38] animate-bounce"
                      style={{ animationDelay: '240ms' }}
                    />
                  </span>
                  <span>Menyiapkan jawaban...</span>
                </div>
              </div>
            )}

            <div ref={listEndRef} />
          </div>

          {/* Input Bar & Honest Privacy Note */}
          <footer className="bg-white border-t border-[#E5E2D9] p-3 space-y-2 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  maxLength={settings.maxInputLength}
                  placeholder="Tulis pertanyaan Anda..."
                  aria-label="Tulis pertanyaan untuk TOMOYO ASISTEN"
                  data-testid="tomoyo-assistant-input"
                  className="w-full min-h-[44px] max-h-24 px-3.5 py-2.5 text-sm leading-snug text-[#141A23] placeholder:text-[#646F7E] bg-[#FAF9F5] border border-[#E5E2D9] focus:border-[#141A23] focus:bg-white rounded-xl resize-none outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                aria-label="Kirim pesan"
                data-testid="tomoyo-assistant-send"
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#A61B38] hover:bg-[#88132B] disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>

            <div className="flex items-center justify-between gap-2 text-[11px] text-[#646F7E]">
              <span className="truncate">
                Sesi sementara · Diproses via OpenAI API
              </span>
              <a
                href={settings.adminWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#0F6E66] hover:underline shrink-0"
              >
                <WhatsAppBrandIcon className="w-3 h-3" />
                <span>Admin WA</span>
              </a>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}
