import { useState } from 'react';
import { MyTasksIcon } from './Icons';
import sparkleSvg from '../assets/figma-export/a486dd3e79d7a6b49bd924bbd6e8b3cc54e3b42f.svg';
import clockSvg from '../assets/figma-export/fe16e148d3d50318658eea3bc97912138945cae5.svg';

const CHATS = [
  {
    agent: 'Lucas AI',
    title:
      'I feel fulfilled when I impact high-level clients. Delivering unique insights that lead to breakthroughs i\u2026',
    body: 'I hear you, and I want you to know this is such a common, human experience. First, let me ask you something: if you fear your friends are judging you about your body, is it possible that you\u2019re the one ju\u2026',
    time: 'Just now',
  },
  {
    agent: 'Jordan AI',
    title:
      'I find joy in mentoring emerging talents. Watching them grow and succeed is incredibly fulfilling, and\u2026',
    body: 'It\u2019s so important to remember that everyone has their own battles, often hidden beneath the surface. Have you ever considered that the insecurities you feel may not be as apparent to others as they are to\u2026',
    time: '30 minutes ago',
  },
  {
    agent: 'Sam AI',
    title:
      'I thrive on collaborating with diverse teams. The exchange of ideas and perspectives leads to innovati\u2026',
    body: 'You\u2019re not alone in feeling this way. It\u2019s natural to worry about how others perceive you, but often, those worries stem from our own self-doubt. What steps can you take to cultivate self-compassion? What d\u2026',
    time: '2 weeks ago',
  },
  {
    agent: 'Mia AI',
    title:
      'I am passionate about creating meaningful connections. Building relationships that foster trust and u\u2026',
    body: 'We often give too much power to others\u2019 opinions about us. What if you reframed that narrative?',
    time: '1 month ago',
  },
  {
    agent: 'Alex AI',
    title:
      'I believe in the power of continuous learning. Every challenge is an opportunity to grow and expand\u2026',
    body: 'That\u2019s a really insightful observation. When we approach setbacks with curiosity rather than judgment, we open ourselves up to lessons we might otherwise miss. What\u2019s one recent challenge that taught y\u2026',
    time: '1 month ago',
  },
  {
    agent: 'Taylor AI',
    title:
      'I value authenticity above all else. Being true to who you are creates a foundation for genuine succ\u2026',
    body: 'It sounds like you\u2019re at a crossroads where external expectations are clashing with your inner values. That tension is completely normal. Have you taken time to identify what success looks like on your o\u2026',
    time: '2 months ago',
  },
  {
    agent: 'Riley AI',
    title:
      'I find purpose in helping others navigate uncertainty. Life\u2019s transitions can feel overwhelming, but\u2026',
    body: 'Change is one of the few constants in life, and yet it never gets easier to face. What I\u2019ve noticed is that the people who thrive through transitions are the ones who allow themselves to feel the discomfo\u2026',
    time: '2 months ago',
  },
  {
    agent: 'Casey AI',
    title:
      'I\u2019m driven by the desire to simplify complexity. Breaking down big problems into manageable steps i\u2026',
    body: 'Sometimes when everything feels overwhelming, the best thing you can do is zoom out and ask: what\u2019s the one small thing I can do right now? Progress doesn\u2019t have to be dramatic to be meaningful. What fee\u2026',
    time: '3 months ago',
  },
];

function SearchIcon({ color = 'rgba(26,26,26,0.6)' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.333 12.667A5.333 5.333 0 107.333 2a5.333 5.333 0 000 10.667zM14 14l-2.9-2.9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function matchesFilter(chat: (typeof CHATS)[number], query: string): boolean {
  if (!query.trim()) return true;
  const combined = `${chat.agent} ${chat.title} ${chat.body}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => combined.includes(word));
}

export default function MyChatsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 relative h-full">
      {/* Top bar */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{
          paddingTop: '28px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
          minHeight: '56px',
          background: 'var(--alpha-dark-800)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Chats label — pinned left */}
        <div
          className="absolute flex items-center"
          style={{ left: '24px', top: '50%', transform: 'translateY(-50%)', gap: '6px' }}
        >
          <MyTasksIcon className="w-5 h-5 shrink-0" color="var(--alpha-light-600)" />
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
            Chats
          </span>
        </div>

        {/* Search bar — centered, aligned with cards */}
        <div
          className="flex items-center"
          style={{
            maxWidth: '676px',
            width: '100%',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid var(--alpha-light-50)',
            background: 'var(--color-white)',
            paddingLeft: '12px',
            paddingRight: '12px',
            gap: '8px',
          }}
        >
          <SearchIcon color="var(--alpha-light-300)" />
          <input
            type="text"
            placeholder="Search your chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full outline-none bg-transparent"
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 'var(--body-3-size)',
              lineHeight: 'var(--body-3-line)',
              letterSpacing: 'var(--body-3-spacing)',
              color: 'var(--alpha-light-900)',
              border: 'none',
              padding: 0,
            }}
          />
        </div>
      </div>

      {/* Background glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-200px',
          left: '-100px',
          right: '-100px',
          height: '600px',
          background:
            'radial-gradient(ellipse at 50% 70%, rgba(183,241,255,0.1) 0%, transparent 60%), radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.8) 0%, transparent 50%)',
        }}
      />

      {/* Chat cards list */}
      <div
        className="flex-1 overflow-y-auto min-h-0 smooth-scroll"
        style={{ paddingTop: '12px', paddingBottom: '32px' }}
      >
        <div
          className="flex flex-col items-center"
          style={{ gap: '12px', paddingLeft: '24px', paddingRight: '24px' }}
        >
          {CHATS.map((chat, i) => {
            const isMatch = matchesFilter(chat, searchQuery);
            return (
            <div
              key={i}
              className="chat-card-enter w-full cursor-pointer"
              style={{
                maxWidth: '676px',
                animationDelay: `${i * 80}ms`,
                opacity: hasQuery && !isMatch ? 0.25 : 1,
                transform: hasQuery && !isMatch ? 'scale(0.98)' : 'scale(1)',
                transition: 'opacity 250ms ease, transform 250ms ease',
                pointerEvents: hasQuery && !isMatch ? 'none' : 'auto',
              }}
            >
              <div
                className="flex flex-col w-full overflow-hidden"
                style={{
                  borderRadius: '16px',
                  border: '1px solid var(--alpha-light-50)',
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(4px)',
                  padding: '16px',
                  gap: '40px',
                }}
              >
                {/* Agent badge */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center shrink-0"
                    style={{
                      gap: '4px',
                      paddingLeft: '8px',
                      paddingRight: '8px',
                      paddingTop: '4px',
                      paddingBottom: '4px',
                      borderRadius: '24px',
                      background: 'var(--alpha-pelorous-50)',
                    }}
                  >
                    <img
                      src={sparkleSvg}
                      alt=""
                      style={{ width: '12px', height: '12px' }}
                    />
                    <span
                      className="font-medium"
                      style={{
                        fontFamily: 'var(--font-primary)',
                        fontSize: 'var(--body-4-size)',
                        lineHeight: 'var(--body-4-line)',
                        letterSpacing: 'var(--body-3-spacing)',
                        color: 'var(--color-pelorous-600)',
                      }}
                    >
                      {chat.agent}
                    </span>
                  </div>
                </div>

                {/* Content + time */}
                <div className="flex flex-col" style={{ gap: '12px' }}>
                  {/* Text content */}
                  <div className="flex flex-col" style={{ gap: '4px' }}>
                    <p
                      className="font-medium overflow-hidden"
                      style={{
                        fontFamily: 'var(--font-primary)',
                        fontSize: 'var(--body-3-size)',
                        lineHeight: 'var(--body-3-line)',
                        letterSpacing: 'var(--body-3-spacing)',
                        color: 'var(--alpha-light-900)',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {chat.title}
                    </p>
                    <p
                      className="overflow-hidden"
                      style={{
                        fontFamily: 'var(--font-primary)',
                        fontSize: 'var(--body-3-size)',
                        lineHeight: 'var(--body-3-line)',
                        letterSpacing: 'var(--body-3-spacing)',
                        color: 'var(--alpha-light-900)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {chat.body}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="flex items-center" style={{ gap: '4px' }}>
                    <div
                      className="flex items-center justify-center overflow-hidden shrink-0"
                      style={{ width: '16px', height: '16px' }}
                    >
                      <img
                        src={clockSvg}
                        alt=""
                        style={{ width: '12.8px', height: '12.8px' }}
                      />
                    </div>
                    <span
                      className="font-medium"
                      style={{
                        fontFamily: 'var(--font-primary)',
                        fontSize: 'var(--body-4-size)',
                        lineHeight: 'var(--body-4-line)',
                        letterSpacing: 'var(--body-3-spacing)',
                        color: 'var(--alpha-light-600)',
                      }}
                    >
                      {chat.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}
