import { useState, useRef, useEffect, useCallback } from 'react';
import ChatInput from './ChatInput';
import { PenSparkleIcon, SuggestionArrowIcon, CopyIcon, ThumbsUpIcon, ThumbsDownIcon, VoiceIcon, FeedbackChatIcon, MicIcon, PauseIcon, PlayIcon, ArrowDownIcon } from './Icons';
import { streamChat, type ChatMessage as APIChatMessage } from '../services/openai';
import { AD_RESULTS_MARKER } from './SuggestionCards';
import type { ThinkingStep } from './SuggestionCards';

/* ── Types ── */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface ChatPageProps {
  initialMessage?: string;
  simulatedResponse?: string;
  simulatedSteps?: ThinkingStep[];
  simulatedImage?: string;
  onNewTask?: () => void;
}

/* ── Helpers ── */
function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

/**
 * Extract selectable options from AI response content.
 * Detects numbered lists (1. Option / 1) Option) and bullet lists (- Option / * Option).
 * Returns an empty array when no options are found.
 */
function extractOptions(content: string): string[] {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const options: string[] = [];

  for (const line of lines) {
    // Match numbered lists: "1. Foo", "2) Bar", etc.
    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    if (numbered) {
      options.push(numbered[1].replace(/\*\*/g, '').trim());
      continue;
    }
    // Match bullet lists: "- Foo", "* Bar"
    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (bullet) {
      options.push(bullet[1].replace(/\*\*/g, '').trim());
    }
  }

  // Only treat as selectable options if there are 2–8 items
  return options.length >= 2 && options.length <= 8 ? options : [];
}

/* ── Rich content renderer (supports markdown pipe tables + roadmap blocks) ── */

interface RoadmapStage {
  title: string;
  timeline: string;
  description: string;
  milestone: string;
}

type ContentBlock =
  | { type: 'text'; value: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'roadmap'; stages: RoadmapStage[]; closed: boolean };

function parseContentBlocks(text: string): ContentBlock[] {
  const lines = text.split('\n');
  const blocks: ContentBlock[] = [];
  let textBuffer: string[] = [];
  let i = 0;

  const flushText = () => {
    if (textBuffer.length > 0) {
      blocks.push({ type: 'text', value: textBuffer.join('\n') });
      textBuffer = [];
    }
  };

  const parsePipeRow = (line: string): string[] =>
    line.split('|').slice(1, -1).map((c) => c.trim());

  const isSeparator = (line: string): boolean =>
    /^\|[\s-:|]+\|$/.test(line.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '[ROADMAP]') {
      flushText();
      i++;
      const stages: RoadmapStage[] = [];
      while (i < lines.length && lines[i].trim() !== '[/ROADMAP]') {
        const parts = lines[i].split('|').map((s) => s.trim());
        if (parts.length >= 4) {
          stages.push({ title: parts[0], timeline: parts[1], description: parts[2], milestone: parts[3] });
        }
        i++;
      }
      const closed = i < lines.length && lines[i].trim() === '[/ROADMAP]';
      if (closed) i++;
      blocks.push({ type: 'roadmap', stages, closed });
    } else if (
      line.trim().startsWith('|') &&
      line.trim().endsWith('|') &&
      i + 1 < lines.length &&
      isSeparator(lines[i + 1])
    ) {
      flushText();
      const headers = parsePipeRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        rows.push(parsePipeRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
    } else {
      textBuffer.push(line);
      i++;
    }
  }
  flushText();
  return blocks;
}

const tableCellStyle: React.CSSProperties = {
  fontFamily: 'var(--font-primary)',
  fontSize: 'var(--body-3-size)',
  lineHeight: 'var(--body-3-line)',
  letterSpacing: 'var(--body-3-spacing)',
  color: 'var(--alpha-light-900)',
  padding: '12px 16px',
  borderBottom: '1px solid var(--alpha-light-100)',
};

const tableHeaderStyle: React.CSSProperties = {
  ...tableCellStyle,
  fontWeight: 600,
  color: 'var(--alpha-light-600)',
  fontSize: 'var(--body-4-size)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  background: 'var(--alpha-dark-300)',
};

const SKELETON_WIDTHS = [
  ['40%', '70%', '60%'],
  ['55%', '50%', '75%'],
  ['35%', '65%', '55%'],
  ['50%', '45%', '70%'],
  ['45%', '60%', '50%'],
  ['60%', '55%', '65%'],
  ['38%', '72%', '48%'],
];

function SkeletonRow({ cols, index, isLast }: { cols: number; index: number; isLast: boolean }) {
  const pick = SKELETON_WIDTHS[index % SKELETON_WIDTHS.length];
  return (
    <tr style={{ opacity: 1 - index * 0.08 }}>
      {Array.from({ length: cols }, (_, ci) => (
        <td
          key={ci}
          style={{
            ...tableCellStyle,
            borderBottom: isLast ? 'none' : tableCellStyle.borderBottom,
          }}
        >
          <div
            className="skeleton-bar"
            style={{
              width: pick[ci % pick.length] || '50%',
              height: '14px',
              animationDelay: `${(index * cols + ci) * 80}ms`,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

function RoadmapSkeleton({ count, total }: { count: number; total: number }) {
  const remaining = Math.max(total - count, 0);
  if (remaining <= 0) return null;
  return (
    <>
      {Array.from({ length: remaining }, (_, si) => (
        <div key={`rskel-${si}`} className="flex" style={{ gap: '20px', opacity: 1 - si * 0.15 }}>
          <div className="flex flex-col items-center" style={{ width: '40px', flexShrink: 0 }}>
            <div className="skeleton-bar" style={{ width: '14px', height: '14px', borderRadius: '50%', animationDelay: `${si * 150}ms` }} />
            {si < remaining - 1 && (
              <div className="skeleton-bar" style={{ width: '2px', flex: 1, minHeight: '60px', borderRadius: '1px', animationDelay: `${si * 150 + 50}ms` }} />
            )}
          </div>
          <div className="flex flex-col" style={{ gap: '6px', paddingBottom: '28px', flex: 1 }}>
            <div className="skeleton-bar" style={{ width: '30%', height: '12px', animationDelay: `${si * 150 + 30}ms` }} />
            <div className="skeleton-bar" style={{ width: '55%', height: '16px', animationDelay: `${si * 150 + 60}ms` }} />
            <div className="skeleton-bar" style={{ width: '80%', height: '12px', animationDelay: `${si * 150 + 90}ms` }} />
          </div>
        </div>
      ))}
    </>
  );
}

function RoadmapChart({ stages, isStreaming, totalStages, closed }: { stages: RoadmapStage[]; isStreaming: boolean; totalStages: number; closed: boolean }) {
  return (
    <div
      style={{
        margin: '16px 0',
        borderRadius: '16px',
        border: '1px solid var(--alpha-light-100)',
        background: 'var(--alpha-dark-300)',
        padding: '24px 20px',
      }}
    >
      {stages.map((stage, si) => {
        const isLast = si === stages.length - 1 && closed;
        return (
          <div key={si} className="roadmap-stage-enter flex" style={{ gap: '20px', animationDelay: `${si * 60}ms` }}>
            {/* Timeline rail */}
            <div className="flex flex-col items-center" style={{ width: '40px', flexShrink: 0 }}>
              {/* Node */}
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'var(--color-pelorous-600)',
                  border: '3px solid var(--color-pelorous-50)',
                  boxShadow: '0 0 0 1px var(--color-pelorous-600)',
                  flexShrink: 0,
                  marginTop: '3px',
                }}
              />
              {/* Connector line */}
              {!isLast && (
                <div
                  className="roadmap-line-draw"
                  style={{
                    width: '2px',
                    flex: 1,
                    minHeight: '20px',
                    background: 'linear-gradient(180deg, var(--color-pelorous-600) 0%, var(--alpha-light-100) 100%)',
                    borderRadius: '1px',
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: isLast ? '0' : '28px', flex: 1 }}>
              <span
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  lineHeight: '16px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-pelorous-600)',
                }}
              >
                {stage.timeline}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: 'var(--body-3-size)',
                  lineHeight: 'var(--body-3-line)',
                  fontWeight: 600,
                  color: 'var(--alpha-light-900)',
                  margin: '4px 0 6px',
                }}
              >
                {stage.title}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: 'var(--body-3-size)',
                  lineHeight: '24px',
                  color: 'var(--alpha-light-600)',
                  margin: 0,
                }}
              >
                {stage.description}
              </p>
              {/* Milestone badge */}
              <div
                style={{
                  marginTop: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,139,167,0.06)',
                  border: '1px solid rgba(0,139,167,0.1)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11.667 3.5L5.25 9.917 2.333 7" stroke="var(--color-pelorous-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span
                  style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: 'var(--body-4-size)',
                    lineHeight: 'var(--body-4-line)',
                    fontWeight: 500,
                    color: 'var(--color-pelorous-600)',
                  }}
                >
                  {stage.milestone}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {isStreaming && !closed && (
        <RoadmapSkeleton count={stages.length} total={totalStages} />
      )}
    </div>
  );
}

function RichContent({ content, isStreaming, totalTableRows, totalRoadmapStages }: { content: string; isStreaming: boolean; totalTableRows?: number; totalRoadmapStages?: number }) {
  const blocks = parseContentBlocks(content);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'text') {
          return (
            <div key={i}>
              {i > 0 && <div className="chat-divider" />}
              <p
                className="whitespace-pre-wrap"
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: 'var(--body-3-size)',
                  lineHeight: '28px',
                  letterSpacing: 'var(--body-3-spacing)',
                  color: 'var(--alpha-light-900)',
                }}
              >
                {block.value}
                {isStreaming && i === blocks.length - 1 && <span className="typing-cursor" />}
              </p>
            </div>
          );
        }

        if (block.type === 'roadmap') {
          return (
            <div key={i}>
              {i > 0 && <div className="chat-divider" />}
              <RoadmapChart
                stages={block.stages}
                closed={block.closed}
                isStreaming={isStreaming}
                totalStages={totalRoadmapStages ?? block.stages.length}
              />
            </div>
          );
        }

        // table block
        const isLastBlock = i === blocks.length - 1;
        const expectedTotal = totalTableRows ?? 0;
        const loadedCount = block.rows.length;
        const skeletonCount = isStreaming && isLastBlock ? Math.max(expectedTotal - loadedCount, 0) : 0;
        const totalVisible = loadedCount + skeletonCount;

        return (
          <div key={i}>
            {i > 0 && <div className="chat-divider" />}
            <div
              style={{
                margin: '16px 0',
                borderRadius: '12px',
                border: '1px solid var(--alpha-light-100)',
                overflow: 'hidden',
              }}
            >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {block.headers.map((h, hi) => (
                    <th key={hi} style={{ ...tableHeaderStyle, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri} className="table-row-enter">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          ...tableCellStyle,
                          fontWeight: ci === 0 ? 600 : 400,
                          borderBottom: ri === totalVisible - 1 ? 'none' : tableCellStyle.borderBottom,
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {Array.from({ length: skeletonCount }, (_, si) => (
                  <SkeletonRow
                    key={`skel-${si}`}
                    cols={block.headers.length}
                    index={si}
                    isLast={si === skeletonCount - 1 && loadedCount + si === totalVisible - 1}
                  />
                ))}
              </tbody>
            </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── Sub-components ── */

/** User message — right-aligned bubble, max 480px (Figma 6:346) */
function UserBubble({ content, imageUrl }: { content: string; imageUrl?: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-end" style={{ gap: '16px' }}>
      {imageUrl && (
        <div
          className="chat-bubble-enter"
          style={{
            maxWidth: '320px',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'var(--alpha-light-25)',
          }}
        >
          {!imgError ? (
            <img
              src={imageUrl}
              alt="Meal photo"
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                display: 'block',
              }}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                background: 'linear-gradient(145deg, #e8f5e9 0%, #fff8e1 50%, #ffecb3 100%)',
              }}
            >
              <span style={{ fontSize: '48px' }}>🥗</span>
            </div>
          )}
        </div>
      )}
      <div
        className="chat-bubble-enter backdrop-blur-[4px]"
        style={{
          maxWidth: '480px',
          padding: '16px',
          borderRadius: '16px',
          background: 'var(--alpha-dark-300)',
          border: '1px solid var(--alpha-light-50)',
        }}
      >
        <p
          className="font-medium whitespace-pre-wrap"
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--body-3-size)',
            lineHeight: 'var(--body-3-line)',
            letterSpacing: 'var(--body-3-spacing)',
            color: 'var(--alpha-light-900)',
          }}
        >
          {content}
        </p>
      </div>
    </div>
  );
}

/** Action icons shown below each completed assistant message (Figma 1129:12190) */
function MessageActionBar({ content, onVoice, isSpeaking }: { content: string; onVoice: () => void; isSpeaking: boolean }) {
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleLike = () => setLiked((prev) => (prev === 'up' ? null : 'up'));
  const handleDislike = () => setLiked((prev) => (prev === 'down' ? null : 'down'));

  const handleFeedback = () => {
    console.log('Send feedback for:', content.slice(0, 60));
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    border: 'none',
    background: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '20px',
    height: '20px',
    transition: 'opacity 150ms ease-out',
  };

  return (
    <div className="flex items-center" style={{ gap: '3px', marginTop: '12px' }}>
      {/* Copy */}
      <button
        style={{ ...btnStyle, opacity: copied ? 1 : undefined }}
        className="hover:opacity-70"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy'}
      >
        <CopyIcon className="w-5 h-5" color={copied ? 'var(--color-pelorous-600)' : 'var(--alpha-light-600)'} />
      </button>

      {/* Like */}
      <button
        style={btnStyle}
        className="hover:opacity-70"
        onClick={handleLike}
        title="Like"
      >
        <ThumbsUpIcon className="w-5 h-5" color={liked === 'up' ? 'var(--color-pelorous-600)' : 'var(--alpha-light-600)'} />
      </button>

      {/* Dislike */}
      <button
        style={btnStyle}
        className="hover:opacity-70"
        onClick={handleDislike}
        title="Dislike"
      >
        <ThumbsDownIcon className="w-5 h-5" color={liked === 'down' ? 'var(--color-pelorous-600)' : 'var(--alpha-light-600)'} />
      </button>

      {/* Voice */}
      <button
        style={btnStyle}
        className="hover:opacity-70"
        onClick={onVoice}
        title={isSpeaking ? 'Stop' : 'Read aloud'}
      >
        <VoiceIcon className="w-5 h-5" color={isSpeaking ? 'var(--color-pelorous-600)' : 'var(--alpha-light-600)'} />
      </button>

      {/* Send feedback */}
      <button
        style={btnStyle}
        className="hover:opacity-70"
        onClick={handleFeedback}
        title="Send feedback"
      >
        <FeedbackChatIcon className="w-5 h-5" color="var(--alpha-light-600)" />
      </button>
    </div>
  );
}

/** Audio waveform visualisation bars (Figma 1226:5601) — animates when playing */
function WaveformBars({ progress, isPlaying }: { progress: number; isPlaying: boolean }) {
  const barCount = 31;
  return (
    <div className="flex items-center" style={{ gap: '2px', height: '16px' }}>
      {Array.from({ length: barCount }, (_, i) => {
        const pct = i / (barCount - 1);
        const isPlayed = pct <= progress;
        return (
          <div
            key={i}
            className={isPlaying ? 'waveform-bar' : ''}
            style={{
              width: '2px',
              borderRadius: '1px',
              background: isPlayed ? 'var(--alpha-light-600)' : 'var(--alpha-light-200)',
              transition: 'background 100ms ease-out',
              height: isPlaying ? undefined : `${3 + Math.random() * 2}px`,
              animationDelay: isPlaying ? `${i * 40}ms` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2] as const;

/** Dropdown speed picker for the audio player */
function SpeedPicker({ rate, onRateChange }: { rate: number; onRateChange: (r: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        className="shrink-0 hover:opacity-70 transition-opacity"
        onClick={() => setOpen((v) => !v)}
        title="Playback speed"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px 6px',
          border: '1px solid var(--alpha-light-100)',
          borderRadius: '6px',
          background: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-primary)',
          fontSize: '11px',
          fontWeight: 600,
          lineHeight: '16px',
          color: 'var(--alpha-light-600)',
          whiteSpace: 'nowrap',
        }}
      >
        {rate}x
      </button>

      {open && (
        <div
          className="plus-dropdown absolute z-[9999] flex flex-col"
          style={{
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '56px',
            padding: '4px',
            borderRadius: '10px',
            background: 'var(--alpha-dark-600)',
            backdropFilter: 'blur(4px)',
            border: '1px solid var(--alpha-light-100)',
            boxShadow: '0px 4px 12px 0px rgba(0,0,0,0.08)',
            transformOrigin: 'bottom center',
          }}
        >
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { onRateChange(opt); setOpen(false); }}
              className="plus-dropdown-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '28px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-primary)',
                fontSize: '12px',
                fontWeight: opt === rate ? 700 : 500,
                lineHeight: '16px',
                color: opt === rate ? 'var(--color-pelorous-600)' : 'var(--alpha-light-600)',
                padding: 0,
              }}
            >
              {opt}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Floating audio player above the input (Figma 1226:5592) */
function AudioPlayer({
  isPlaying,
  onPause,
  elapsed,
  duration,
  volume,
  onVolumeChange,
  rate,
  onRateChange,
}: {
  isPlaying: boolean;
  onPause: () => void;
  elapsed: number;
  duration: number;
  volume: number;
  onVolumeChange: (v: number) => void;
  rate: number;
  onRateChange: (r: number) => void;
}) {
  const progress = duration > 0 ? elapsed / duration : 0;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="audio-player-enter flex items-center"
      style={{
        height: '36px',
        paddingLeft: '12px',
        paddingRight: '12px',
        borderRadius: '24px',
        background: 'var(--color-white)',
        border: '1px solid var(--alpha-light-100)',
        boxShadow:
          '0px 4px 12px 0px rgba(0,0,0,0.06), 0px 1px 3px 0px rgba(0,0,0,0.04)',
        gap: '12px',
      }}
    >
      {/* Mic icon */}
      <MicIcon className="w-5 h-5 shrink-0" color="var(--alpha-light-600)" />

      {/* Waveform + time */}
      <div className="flex items-center" style={{ gap: '12px' }}>
        <WaveformBars progress={progress} isPlaying={isPlaying} />
        <span
          className="font-medium shrink-0"
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--body-3-size)',
            lineHeight: 'var(--body-3-line)',
            color: 'var(--alpha-light-900)',
            minWidth: '32px',
          }}
        >
          {fmt(elapsed)}
        </span>

        {/* Speed toggle with dropdown */}
        <SpeedPicker rate={rate} onRateChange={onRateChange} />
      </div>

      {/* Volume icon + slider */}
      <div className="flex items-center shrink-0" style={{ gap: '4px' }}>
        <VoiceIcon className="w-5 h-5 shrink-0" color="var(--alpha-light-600)" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="audio-volume-slider"
        />
      </div>

      {/* Pause / Stop button */}
      <button
        className="shrink-0 hover:opacity-70 transition-opacity"
        onClick={onPause}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
        }}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <PauseIcon className="w-5 h-5" color="var(--alpha-light-600)" />
        ) : (
          <PlayIcon className="w-5 h-5" color="var(--alpha-light-600)" />
        )}
      </button>
    </div>
  );
}

/* ── Thinking Steps — agentic processing indicator ── */

type StepStatus = 'idle' | 'pending' | 'active' | 'done';

interface ThinkingStepDisplay {
  label: string;
  status: StepStatus;
}

function ThinkingStepIcon({ status }: { status: StepStatus }) {
  return (
    <div style={{ width: '16px', height: '16px', flexShrink: 0, position: 'relative' }}>
      <svg
        width="16" height="16" viewBox="0 0 16 16" fill="none"
        style={{ position: 'absolute', inset: 0, opacity: status === 'done' ? 1 : 0, transition: 'opacity 500ms ease' }}
      >
        <circle cx="8" cy="8" r="7.25" stroke="var(--alpha-light-200)" strokeWidth="1.5" />
        <path d="M5 8.25L7 10.25L11 6" stroke="var(--alpha-light-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div
        className="thinking-gradient-ring"
        style={{ position: 'absolute', inset: 0, opacity: status === 'active' ? 1 : 0, transition: 'opacity 500ms ease' }}
      />
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: status === 'pending' ? 1 : 0, transition: 'opacity 500ms ease',
        }}
      >
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--alpha-light-100)' }} />
      </div>
    </div>
  );
}

function ThinkingStepsDisplay({ steps }: { steps: ThinkingStepDisplay[] }) {
  const collapsed = false;
  const allDone = steps.every((s) => s.status === 'done');
  const prevAllDoneRef = useRef(false);

  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      prevAllDoneRef.current = true;
      // Keep thinking steps expanded — don't auto-collapse
    }
  }, [allDone]);

  if (steps.length === 0) return null;

  const idleStep = steps[0];
  const processingSteps = steps.slice(1);
  const processingDone = processingSteps.length > 0 && processingSteps.every((s) => s.status === 'done');

  const hasVisibleSteps = processingSteps.some((s) => s.status !== 'pending') || allDone;

  return (
    <div style={{ marginBottom: '14px' }}>
      {/* Idle header — always visible, same appearance */}
      {idleStep && (
        <div className="thinking-step-enter">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              paddingBottom: hasVisibleSteps ? '16px' : '0',
              transition: 'padding 400ms ease',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--body-3-size)',
                lineHeight: 'var(--body-3-line)',
                color: 'var(--alpha-light-600)',
                fontWeight: 500,
              }}
            >
              {idleStep.label}
            </span>
          </div>
        </div>
      )}

      {/* Collapsible steps body */}
      <div className={`thinking-steps-body${collapsed ? ' thinking-steps-collapsed' : ''}`}>
        <div style={{ paddingLeft: '1px' }}>
          {processingSteps.map((step, si) => {
            if (step.status === 'pending') return null;
            return (
              <div key={si} className="thinking-step-enter" style={{ animationDelay: `${si * 250}ms` }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0 }}>
                    <div style={{ height: '20px', display: 'flex', alignItems: 'center' }}>
                      <ThinkingStepIcon status={step.status} />
                    </div>
                    <div
                      style={{
                        width: '1.5px',
                        height: '13px',
                        background: step.status === 'done' ? 'var(--alpha-light-200)' : 'var(--alpha-light-100)',
                        transition: 'background 500ms ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, height: '20px' }}>
                    <span
                      className={step.status === 'active' ? 'thinking-shimmer-text' : undefined}
                      style={{
                        fontFamily: 'var(--font-primary)',
                        fontSize: 'var(--body-3-size)',
                        lineHeight: 'var(--body-3-line)',
                        color: step.status === 'done'
                          ? 'var(--alpha-light-600)'
                          : step.status === 'active'
                            ? 'var(--alpha-light-600)'
                            : 'var(--alpha-light-200)',
                        WebkitTextFillColor: step.status === 'active' ? 'transparent' : undefined,
                        fontWeight: step.status === 'done' ? 400 : 500,
                        transition: 'color 500ms ease, -webkit-text-fill-color 500ms ease',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Done row */}
          {processingDone && (
            <div className="thinking-step-enter" style={{ display: 'flex', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0 }}>
                <div style={{ height: '20px', display: 'flex', alignItems: 'center' }}>
                  <ThinkingStepIcon status="done" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: 'var(--body-3-size)',
                    lineHeight: 'var(--body-3-line)',
                    color: 'var(--alpha-light-600)',
                    fontWeight: 400,
                  }}
                >
                  Done
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Ad Results Display — rendered when content === "[AD_RESULTS]" ── */

const AD_IMAGES = Array.from({ length: 20 }, (_, i) => `/ads/ad-${String(i + 1).padStart(2, '0')}.png`);

const AD_COPY_DATA = [
  { headline: 'Stop Guessing, Start Scaling', primaryText: 'Your competitors already know what works. Now you can too — AI-powered ad intelligence that turns their best strategies into your next campaign.', cta: 'Learn More' },
  { headline: 'Your Competitors\' Best Ads, Decoded', primaryText: 'We analyzed 50 of their top-performing creatives so you don\'t have to. See exactly what\'s working and why.', cta: 'Learn More' },
  { headline: 'Launch Winning Ads in Minutes', primaryText: 'Why start from scratch? Our AI studies the competition and generates scroll-stopping creatives tailored to your brand.', cta: 'Learn More' },
  { headline: 'The Ad Strategy They Don\'t Want You to See', primaryText: 'Every brand leaves a trail. We follow it, decode their playbook, and hand you the blueprint to outperform them.', cta: 'Learn More' },
  { headline: 'Better Ads, Less Guesswork', primaryText: 'Tired of A/B testing blind? Let AI analyze what\'s already proven to convert and build your next campaign around it.', cta: 'Learn More' },
  { headline: 'From Competitor Research to Ready-to-Run Ads', primaryText: 'One URL. That\'s all it takes. Paste their Facebook page and get a full creative strategy in under 60 seconds.', cta: 'Learn More' },
  { headline: 'Ad Creative on Autopilot', primaryText: 'Stop spending hours on ad design. Our AI generates high-converting creatives based on real competitor data — not templates.', cta: 'Learn More' },
  { headline: 'What If You Could See Their Entire Ad Playbook?', primaryText: 'From copy angles to visual themes, we break down exactly what your competitors are running — and help you do it better.', cta: 'Learn More' },
  { headline: 'Outsmart, Don\'t Outspend', primaryText: 'You don\'t need a bigger budget. You need better intel. See what\'s converting for your competitors and adapt it to your brand.', cta: 'Learn More' },
  { headline: 'AI-Generated Ads That Actually Convert', primaryText: 'Trained on real competitor performance data, not stock templates. Every creative is built to compete from day one.', cta: 'Learn More' },
];

const EMAIL_COPY_DATA = [
  { subject: 'You\'re leaving money on the table', preview: 'Your competitors are running ads you haven\'t seen yet', body: 'Hi there,\n\nWhile you\'re brainstorming your next campaign, your competitors already launched 12 new ads this week. We tracked every one of them — the copy, the visuals, the targeting.\n\nWant to see their playbook? We\'ll hand it to you in 60 seconds.\n\nClick below to run your first competitor analysis free.' },
  { subject: 'Their best ad took 4 minutes to find', preview: 'We found it. Here\'s what makes it work.', body: 'Hey,\n\nWe just ran an analysis on your top competitor\'s Facebook ads. Their highest-performing creative? A simple image ad with one bold headline.\n\nNo fancy video. No complex funnel. Just a clear message that hits the right pain point at the right time.\n\nWe broke down exactly why it works — and generated 5 variations tailored to your brand. Ready to see them?' },
  { subject: 'Stop guessing. Start winning.', preview: 'AI-powered ad intelligence is here', body: 'Hi,\n\nEvery dollar you spend on ads that don\'t convert is a dollar your competitor pockets. But what if you could see exactly what\'s working for them before you spend a cent?\n\nOur AI analyzes your competitor\'s entire ad library and generates ready-to-run creatives based on their proven patterns.\n\nNo more A/B testing in the dark. No more wasted budget. Just data-driven ads that compete from day one.' },
  { subject: 'We analyzed 50 of their ads so you don\'t have to', preview: 'Your competitor research report is ready', body: 'Hey there,\n\nYou asked us to look into your competitor\'s ad strategy. Here\'s what we found:\n\n• They\'re running 50 active ads across 3 campaigns\n• Their top creative has been live for 47 days (that means it\'s profitable)\n• They\'re using 4 distinct copy angles, but one outperforms the rest by 3x\n\nWe\'ve already generated new ad concepts based on these insights. Your personalized report is waiting inside.' },
  { subject: 'The ads your competitors don\'t want you to see', preview: 'Full breakdown inside — copy, visuals, and strategy', body: 'Hi,\n\nEvery brand leaves a digital trail. Their Facebook ads tell a story — what\'s working, what they\'ve abandoned, and where they\'re doubling down.\n\nWe followed your competitor\'s trail and decoded their entire ad playbook:\n\n→ Which creatives they\'re scaling\n→ What copy angles drive engagement\n→ How their strategy shifted in the last 30 days\n\nMore importantly, we used all of this to generate ads specifically designed to outperform theirs. Check out your custom report.' },
];

function AdResultsDisplay() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Section heading */}
      <div>
        <h3
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: '18px',
            fontWeight: 600,
            lineHeight: '24px',
            color: 'var(--alpha-light-900)',
            marginBottom: '4px',
          }}
        >
          Generated Ad Creatives
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--body-3-size)',
            lineHeight: 'var(--body-3-line)',
            color: 'var(--alpha-light-400)',
          }}
        >
          Based on competitor creative patterns — 20 new ad creatives
        </p>
      </div>

      {/* 4-column image grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
        }}
      >
        {AD_IMAGES.map((src, i) => (
          <div
            key={i}
            className="ad-card-enter ad-card-hover"
            style={{
              animationDelay: `${i * 80}ms`,
              borderRadius: '16px',
              border: '1px solid var(--alpha-light-100)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src={src}
              alt={`Ad ${i + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {/* Hover overlay with View + Download */}
            <div className="ad-card-overlay">
              <button className="ad-card-btn">View</button>
              <button className="ad-card-btn">Download</button>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--alpha-light-100)' }} />

      {/* Ad Copy section heading */}
      <div>
        <h3
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: '18px',
            fontWeight: 600,
            lineHeight: '24px',
            color: 'var(--alpha-light-900)',
            marginBottom: '4px',
          }}
        >
          Generated Ad Copy
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--body-3-size)',
            lineHeight: 'var(--body-3-line)',
            color: 'var(--alpha-light-400)',
          }}
        >
          10 high-converting copy variations
        </p>
      </div>

      {/* Ad copy table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--body-3-size)',
            lineHeight: 'var(--body-3-line)',
          }}
        >
          <thead>
            <tr>
              {['#', 'Headline', 'Primary Text', 'CTA'].map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    fontWeight: 600,
                    color: 'var(--alpha-light-600)',
                    borderBottom: '2px solid var(--alpha-light-100)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AD_COPY_DATA.map((row, i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--alpha-light-400)',
                    borderBottom: '1px solid var(--alpha-light-50)',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'top',
                  }}
                >
                  {i + 1}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--alpha-light-900)',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--alpha-light-50)',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'top',
                  }}
                >
                  {row.headline}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--alpha-light-600)',
                    borderBottom: '1px solid var(--alpha-light-50)',
                    verticalAlign: 'top',
                    minWidth: '280px',
                  }}
                >
                  {row.primaryText}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--color-pelorous-600)',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--alpha-light-50)',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'top',
                  }}
                >
                  {row.cta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--alpha-light-100)' }} />

      {/* Email Copy section heading */}
      <div>
        <h3
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: '18px',
            fontWeight: 600,
            lineHeight: '24px',
            color: 'var(--alpha-light-900)',
            marginBottom: '4px',
          }}
        >
          Generated Email Copy
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--body-3-size)',
            lineHeight: 'var(--body-3-line)',
            color: 'var(--alpha-light-400)',
          }}
        >
          5 email sequences inspired by competitor messaging
        </p>
      </div>

      {/* Email copy cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {EMAIL_COPY_DATA.map((email, i) => (
          <div
            key={i}
            className="ad-card-enter"
            style={{
              animationDelay: `${i * 100}ms`,
              borderRadius: '12px',
              border: '1px solid var(--alpha-light-100)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: 'var(--body-4-size)',
                  fontWeight: 500,
                  color: 'var(--alpha-light-400)',
                }}
              >
                Email {i + 1}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--body-3-size)',
                lineHeight: 'var(--body-3-line)',
                fontWeight: 600,
                color: 'var(--alpha-light-900)',
              }}
            >
              Subject: {email.subject}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--body-4-size)',
                lineHeight: 'var(--body-4-line)',
                color: 'var(--color-pelorous-600)',
                fontStyle: 'italic',
              }}
            >
              Preview: {email.preview}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--body-3-size)',
                lineHeight: '22px',
                color: 'var(--alpha-light-600)',
                whiteSpace: 'pre-line',
                marginTop: '4px',
              }}
            >
              {email.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** AI response — avatar row + indented body text + suggestion chips (Figma 18:622) */
function AssistantMessage({
  content,
  timestamp,
  isStreaming,
  totalTableRows,
  totalRoadmapStages,
  thinkingSteps,
  onChipClick,
  onVoice,
  isSpeaking,
}: {
  content: string;
  timestamp: Date;
  isStreaming: boolean;
  totalTableRows?: number;
  totalRoadmapStages?: number;
  thinkingSteps?: ThinkingStepDisplay[];
  onChipClick?: (label: string) => void;
  onVoice: () => void;
  isSpeaking: boolean;
}) {
  return (
    <div className="chat-bubble-enter flex flex-col" style={{ gap: '14px' }}>
      {/* Avatar + name + time */}
      <div className="flex items-center" style={{ gap: '8px' }}>
        <div
          className="shrink-0 flex items-center justify-center"
          style={{ width: '18px' }}
        >
          <div
            className="shrink-0 overflow-hidden"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-pelorous-50)',
              border: '1px solid var(--alpha-light-50)',
            }}
          />
        </div>
        <span
          className="font-medium"
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--body-3-size)',
            lineHeight: 'var(--body-3-line)',
            letterSpacing: 'var(--body-3-spacing)',
            color: 'var(--alpha-light-900)',
          }}
        >
          Lucas AI
        </span>
        <span
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'var(--body-4-size)',
            lineHeight: 'var(--body-4-line)',
            color: 'var(--alpha-light-400)',
          }}
        >
          · {formatTime(timestamp)}
        </span>
      </div>

      {/* Body text */}
      <div>
        {thinkingSteps && thinkingSteps.length > 0 && (
          <ThinkingStepsDisplay steps={thinkingSteps} />
        )}
        {thinkingSteps && thinkingSteps.length > 0 && content && (
          <div className="chat-divider" />
        )}
        {content ? (
          content === AD_RESULTS_MARKER ? (
            <AdResultsDisplay />
          ) : (
            <RichContent content={content} isStreaming={isStreaming} totalTableRows={totalTableRows} totalRoadmapStages={totalRoadmapStages} />
          )
        ) : isStreaming && !(thinkingSteps && thinkingSteps.length > 0 && !thinkingSteps.every((s) => s.status === 'done')) ? (
          <div className="typing-indicator">
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {/* Suggestion chips — shown only when the AI response contains selectable options */}
        {content && !isStreaming && onChipClick && extractOptions(content).length > 0 && (
          <div className="flex flex-col" style={{ gap: '6px', marginTop: '16px' }}>
            {extractOptions(content).map(
              (label) => (
                <button
                  key={label}
                  className="flex items-center cursor-pointer hover:opacity-80 transition-opacity self-start backdrop-blur-[4px]"
                  onClick={() => onChipClick(label)}
                  style={{
                    gap: '6px',
                    paddingLeft: '12px',
                    paddingRight: '16px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    borderRadius: '12px',
                    background: 'var(--alpha-light-50)',
                    border: '1px solid var(--alpha-light-50)',
                    cursor: 'pointer',
                    maxWidth: '480px',
                  }}
                >
                  <div
                    className="shrink-0"
                    style={{ width: '20px', height: '20px' }}
                  >
                    <SuggestionArrowIcon
                      className="w-5 h-5"
                      color="var(--alpha-light-900)"
                    />
                  </div>
                  <span
                    className="font-medium whitespace-nowrap"
                    style={{
                      fontFamily: 'var(--font-primary)',
                      fontSize: 'var(--body-3-size)',
                      lineHeight: 'var(--body-3-line)',
                      letterSpacing: 'var(--body-3-spacing)',
                      color: 'var(--alpha-light-900)',
                    }}
                  >
                    {label}
                  </span>
                </button>
              ),
            )}
          </div>
        )}

        {/* Action icons — shown after streaming completes */}
        {content && !isStreaming && <MessageActionBar content={content} onVoice={onVoice} isSpeaking={isSpeaking} />}
      </div>
    </div>
  );
}

/* ── Main Component ── */

function countStructuredElements(text: string): { tableRows: number; roadmapStages: number } {
  const blocks = parseContentBlocks(text);
  let tableRows = 0;
  let roadmapStages = 0;
  for (const b of blocks) {
    if (b.type === 'table' && !tableRows) tableRows = b.rows.length;
    if (b.type === 'roadmap' && !roadmapStages) roadmapStages = b.stages.length;
  }
  return { tableRows, roadmapStages };
}

export default function ChatPage({ initialMessage, simulatedResponse, simulatedSteps, simulatedImage, onNewTask }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [totalTableRows, setTotalTableRows] = useState(0);
  const [totalRoadmapStages, setTotalRoadmapStages] = useState(0);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStepDisplay[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Voice / audio player state
  const [voiceContent, setVoiceContent] = useState<string | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [voiceRate, setVoiceRate] = useState(1);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceIdRef = useRef(0); // incremented on each new speak to ignore stale callbacks

  const clearTimer = useCallback(() => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }, []);

  const stopVoice = useCallback(() => {
    voiceIdRef.current += 1; // invalidate any pending callbacks
    window.speechSynthesis.cancel();
    clearTimer();
    setVoicePlaying(false);
    setVoiceContent(null);
    setVoiceElapsed(0);
    setVoiceDuration(0);
  }, [clearTimer]);

  const speakText = useCallback((text: string, vol: number, spd: number, resumeElapsed = 0) => {
    window.speechSynthesis.cancel();
    clearTimer();

    const id = ++voiceIdRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = vol;
    utterance.rate = spd;

    const wordCount = text.split(/\s+/).length;
    const estDuration = Math.max(wordCount / 2.5 / spd, 2);
    setVoiceDuration(estDuration);
    setVoiceElapsed(resumeElapsed);
    setVoiceContent(text);
    setVoicePlaying(true);

    const startTime = Date.now() - resumeElapsed * 1000;
    voiceTimerRef.current = setInterval(() => {
      setVoiceElapsed(Math.min((Date.now() - startTime) / 1000, estDuration));
    }, 250);

    utterance.onend = () => {
      if (voiceIdRef.current !== id) return; // stale — ignore
      clearTimer();
      setVoicePlaying(false);
      setVoiceContent(null);
    };
    utterance.onerror = () => {
      if (voiceIdRef.current !== id) return; // stale — ignore
      clearTimer();
      setVoicePlaying(false);
      setVoiceContent(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [clearTimer]);

  const startVoice = useCallback((text: string) => {
    // Toggle off if same text is already playing
    if (voiceContent === text) {
      stopVoice();
      return;
    }
    speakText(text, voiceVolume, voiceRate);
  }, [voiceContent, voiceVolume, voiceRate, stopVoice, speakText]);

  // Volume slider: just store the value. Restart speech at new volume.
  const handleVolumeChange = useCallback((v: number) => {
    setVoiceVolume(v);
    if (!voiceContent) return;
    speakText(voiceContent, v, voiceRate, voiceElapsed);
  }, [voiceContent, voiceRate, voiceElapsed, speakText]);

  const handleRateChange = useCallback((r: number) => {
    setVoiceRate(r);
    if (!voiceContent) return;
    speakText(voiceContent, voiceVolume, r, voiceElapsed);
  }, [voiceContent, voiceVolume, voiceElapsed, speakText]);

  const handleVoicePause = useCallback(() => {
    if (voicePlaying) {
      window.speechSynthesis.pause();
      setVoicePlaying(false);
      clearTimer();
    } else {
      window.speechSynthesis.resume();
      setVoicePlaying(true);
      const startTime = Date.now() - voiceElapsed * 1000;
      const estDuration = voiceDuration;
      voiceTimerRef.current = setInterval(() => {
        setVoiceElapsed(Math.min((Date.now() - startTime) / 1000, estDuration));
      }, 250);
    }
  }, [voicePlaying, voiceElapsed, voiceDuration, clearTimer]);

  // Keep ref in sync for closures
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Don't auto-scroll when ad results are displayed — keep viewport on thinking steps
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.content === AD_RESULTS_MARKER) return;
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(distanceFromBottom > 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const allPrevMessages = messagesRef.current;
    const apiMessages: APIChatMessage[] = [
      ...allPrevMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ];

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    try {
      let fullContent = '';
      for await (const chunk of streamChat(apiMessages)) {
        fullContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullContent,
          };
          return updated;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errMessage =
        error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.';
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: errMessage,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const simulateTyping = useCallback(async (question: string, answer: string, steps?: ThinkingStep[], imageUrl?: string) => {
    const userMsg: Message = { role: 'user', content: question, timestamp: new Date(), imageUrl };
    const assistantMsg: Message = { role: 'assistant', content: '', timestamp: new Date() };
    setMessages([userMsg, assistantMsg]);
    const counts = countStructuredElements(answer);
    setTotalTableRows(counts.tableRows);
    setTotalRoadmapStages(counts.roadmapStages);
    setIsStreaming(true);

    if (steps && steps.length > 0) {
      // Show idle header alone first
      setThinkingSteps([{ label: steps[0].label, status: 'idle' as StepStatus }]);

      await new Promise((r) => setTimeout(r, 1200));

      // Now add all processing steps (pending) so they can animate in one by one
      const allSteps: ThinkingStepDisplay[] = steps.map((s, i) => ({
        label: s.label,
        status: (i === 0 ? 'idle' : 'pending') as StepStatus,
      }));
      setThinkingSteps(allSteps);

      for (let si = 1; si < steps.length; si++) {
        setThinkingSteps((prev) =>
          prev.map((s, idx) => {
            if (idx === 0) return { ...s, status: 'idle' as StepStatus };
            return {
              ...s,
              status: idx < si ? 'done' : idx === si ? 'active' : 'pending',
            };
          }),
        );
        const stepDelay = si === 2 ? 5000 : si === 4 ? 12000 : 3200 + Math.random() * 1300;
        await new Promise((r) => setTimeout(r, stepDelay));
      }
      setThinkingSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as StepStatus })));
      await new Promise((r) => setTimeout(r, 2000));
    }

    const lines = answer.split('\n');
    let accumulated = '';
    let inRoadmap = false;

    const flush = (text: string) => {
      accumulated = text;
      const snap = accumulated;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: snap };
        return updated;
      });
    };

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const trimmed = line.trim();
      const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|');
      const isTableSep = /^\|[\s-:|]+\|$/.test(trimmed);

      if (trimmed === '[ROADMAP]') {
        inRoadmap = true;
        flush(accumulated + (li > 0 ? '\n' : '') + line);
        await new Promise((r) => setTimeout(r, 100));
      } else if (trimmed === '[/ROADMAP]') {
        inRoadmap = false;
        flush(accumulated + (li > 0 ? '\n' : '') + line);
        await new Promise((r) => setTimeout(r, 60));
      } else if (inRoadmap) {
        flush(accumulated + '\n' + line);
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 200));
      } else if (isTableLine || isTableSep) {
        flush(accumulated + (li > 0 ? '\n' : '') + line);
        await new Promise((r) => setTimeout(r, isTableSep ? 60 : 350 + Math.random() * 150));
      } else {
        const prefix = li > 0 ? '\n' : '';
        const words = line.split(/(\s+)/);
        for (let wi = 0; wi < words.length; wi++) {
          const leading = wi === 0 ? prefix : '';
          flush(accumulated + leading + words[wi]);
          await new Promise((r) => setTimeout(r, 18 + Math.random() * 22));
        }
      }
    }
    setTotalTableRows(0);
    setTotalRoadmapStages(0);
    setIsStreaming(false);
  }, []);

  // Send initial message on mount
  useEffect(() => {
    if (initialMessage && !hasInitialized.current) {
      hasInitialized.current = true;
      if (simulatedResponse) {
        simulateTyping(initialMessage, simulatedResponse, simulatedSteps, simulatedImage);
      } else {
        sendMessage(initialMessage);
      }
    }
  }, [initialMessage, simulatedResponse, simulatedSteps, simulatedImage, sendMessage, simulateTyping]);

  // Is this the first AI response (show chips only on last assistant message)?
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 relative h-full overflow-hidden">
      {/* ── Top bar — matches home view top bar ── */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          paddingTop: '20px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
          minHeight: '56px',
          background: 'var(--alpha-dark-800)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div
          className="flex gap-1.5 items-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onNewTask}
        >
          <PenSparkleIcon className="w-5 h-5 shrink-0" color="var(--alpha-light-600)" />
          <span
            className="font-medium whitespace-nowrap"
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 'var(--body-3-size)',
              lineHeight: 'var(--body-3-line)',
              letterSpacing: 'var(--body-3-spacing)',
              color: 'var(--alpha-light-600)',
            }}
          >
            New task
          </span>
        </div>
      </div>

      {/* ── Messages scroll area — extends behind the input ── */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto min-h-0 smooth-scroll flex flex-col items-center"
        style={{ paddingTop: '24px', paddingBottom: '124px' }}
      >
        <div
          className="flex flex-col w-full"
          style={{
            maxWidth: messages.some((m) => m.content === AD_RESULTS_MARKER) ? '880px' : '704px',
            paddingLeft: '8px',
            paddingRight: '8px',
            gap: '32px',
            transition: 'max-width 400ms ease',
          }}
        >
          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <UserBubble key={i} content={msg.content} imageUrl={msg.imageUrl} />
            ) : (
              <AssistantMessage
                key={i}
                content={msg.content}
                timestamp={msg.timestamp}
                isStreaming={isStreaming && i === messages.length - 1}
                totalTableRows={isStreaming && i === messages.length - 1 ? totalTableRows : undefined}
                totalRoadmapStages={isStreaming && i === messages.length - 1 ? totalRoadmapStages : undefined}
                thinkingSteps={i === messages.length - 1 ? thinkingSteps : undefined}
                onChipClick={
                  i === lastAssistantIdx && !isStreaming
                    ? (label) => sendMessage(label)
                    : undefined
                }
                onVoice={() => startVoice(msg.content)}
                isSpeaking={voiceContent === msg.content && voicePlaying}
              />
            ),
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Bottom overlay: audio player + input (floats over scroll area) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col items-end pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* ── Fade gradient ── */}
        <div
          className="w-full pointer-events-none"
          style={{
            height: '80px',
            background: 'linear-gradient(to bottom, transparent, white)',
          }}
        />
        {/* ── Audio player — floats above input when voice is active ── */}
        {voiceContent && (
          <div className="flex justify-center pointer-events-auto" style={{ paddingLeft: '24px', paddingRight: '24px', paddingBottom: '8px' }}>
            <AudioPlayer
              isPlaying={voicePlaying}
              onPause={handleVoicePause}
              elapsed={voiceElapsed}
              duration={voiceDuration}
              volume={voiceVolume}
              onVolumeChange={handleVolumeChange}
              rate={voiceRate}
              onRateChange={handleRateChange}
            />
          </div>
        )}

        <div
          className="flex flex-col items-center w-full relative pointer-events-auto"
          style={{
            paddingLeft: '24px',
            paddingRight: '24px',
            paddingBottom: '19px',
            paddingTop: '8px',
            background: 'white',
          }}
        >
          {/* ── Scroll-to-bottom button (absolute, above input) ── */}
          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="scroll-to-bottom-btn"
              aria-label="Scroll to bottom"
            >
              <ArrowDownIcon className="w-5 h-5" color="var(--alpha-light-400)" />
            </button>
          )}
          <div className="w-full" style={{ maxWidth: '704px' }}>
            <ChatInput
              onSubmit={sendMessage}
              disabled={isStreaming}
              placeholder="How can I help you today?"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
