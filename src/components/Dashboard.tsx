import { useState, useCallback } from 'react';
import Sidebar, { type SidebarPage } from './Sidebar';
import ChatInput from './ChatInput';
import { AD_RESULTS_MARKER, getAdResearchThinkingSteps } from './SuggestionCards';
import type { ThinkingStep } from './SuggestionCards';
import MyChatsPage from './MyChatsPage';
import ChatPage from './ChatPage';
import ConnectorsPage from './ConnectorsPage';
import SettingsModal from './SettingsModal';
import { PenSparkleIcon, AppleIcon } from './Icons';
import glowSvg from '../assets/ellipse-glow.svg';
import ringSvg from '../assets/ellipse-border.svg';
import crescentSvg from '../assets/figma-export/d251448fe157d8c297e9697d264bb33fa3827e0c.svg';

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState<SidebarPage>('home');
  const [chatInitialMessage, setChatInitialMessage] = useState('');
  const [chatSimulatedResponse, setChatSimulatedResponse] = useState<string | undefined>();
  const [chatSimulatedSteps, setChatSimulatedSteps] = useState<ThinkingStep[] | undefined>();
  const [chatSimulatedImage, setChatSimulatedImage] = useState<string | undefined>();
  const [chatKey, setChatKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const startSimulatedChat = useCallback((message: string) => {
    setChatInitialMessage(message);
    setChatSimulatedResponse(AD_RESULTS_MARKER);
    setChatSimulatedSteps(getAdResearchThinkingSteps(message));
    setChatSimulatedImage(undefined);
    setChatKey((k) => k + 1);
    setCurrentPage('chat');
  }, []);

  const handleNavigate = useCallback((page: SidebarPage) => {
    setCurrentPage(page);
  }, []);

  return (
    <div
      className="flex items-start w-full h-full rounded-3xl overflow-hidden relative"
      style={{ background: 'var(--color-white)' }}
    >
      {/* Background gradient behind main content */}
      <div
        className="static pointer-events-none"
        style={{
          right: '-200px',
          bottom: '-200px',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(0,190,220,0.06) 0%, rgba(0,190,220,0.02) 40%, transparent 70%)',
        }}
      />

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onSettingsClick={() => setShowSettings(true)}
      />

      {/* Main content */}
      {currentPage === 'chat' ? (
        <ChatPage
          key={chatKey}
          initialMessage={chatInitialMessage}
          simulatedResponse={chatSimulatedResponse}
          simulatedSteps={chatSimulatedSteps}
          simulatedImage={chatSimulatedImage}
          onNewTask={() => setCurrentPage('home')}
        />
      ) : currentPage === 'tasks' ? (
        <MyChatsPage key="tasks" />
      ) : currentPage === 'connectors' ? (
        <div key="connectors" className="flex flex-col flex-1 min-h-0 min-w-0 h-full overflow-hidden">
          <ConnectorsPage />
        </div>
      ) : (
        <div key="home" className="flex flex-col flex-1 min-h-0 min-w-0 relative h-full">
          {/* Top bar */}
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
            <div className="flex gap-1.5 items-center cursor-pointer hover:opacity-80 transition-opacity">
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
            <a
              href="#"
              className="flex gap-1 items-center justify-center cursor-pointer hover:opacity-80 transition-opacity rounded-lg"
              style={{
                background: 'var(--alpha-dark-300)',
                border: '1px solid var(--alpha-light-50)',
                paddingTop: '6px',
                paddingBottom: '6px',
                paddingRight: '12px',
                paddingLeft: '10px',
              }}
              onClick={(e) => e.preventDefault()}
            >
              <AppleIcon className="w-5 h-5 shrink-0" color="var(--alpha-light-600)" />
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
                Download Mac app
              </span>
            </a>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col items-center px-5 pb-8 min-h-0">
            {/* Top spacer */}
            <div className="flex-1 min-h-0" />
            <div className="flex flex-col gap-6 items-center w-full max-w-[704px] shrink-0">
              {/* Avatar and greeting */}
              <div className="chat-card-enter flex flex-col items-center justify-center" style={{ gap: '16px', animationDelay: '0ms' }}>
                {/* Avatar logo — 64×64 container */}
                <div className="relative" style={{ width: '64px', height: '64px' }}>
                  {/* Glow effect */}
                  <div
                    className="absolute pointer-events-none"
                    style={{ inset: '-46px -46.5px' }}
                  >
                    <img src={glowSvg} alt="" className="block w-full h-full" />
                  </div>

                  {/* Ellipse 29 — ring gradient fill */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(26,26,26,0.06) 0%, rgba(255,255,255,0) 100%)',
                    }}
                  />

                  {/* Ellipse 32 — ring border + fill at 5% opacity */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: 0,
                      opacity: 0.05,
                      background: 'linear-gradient(180deg, rgba(26,26,26,0.06) 0%, rgba(255,255,255,0) 100%)',
                      border: '0.5px solid #008BA7',
                    }}
                  />

                  {/* Ellipse 33 — cyan crescent highlight at top */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: '-0.39%',
                      right: '-0.39%',
                      bottom: '49.61%',
                      left: '23.42%',
                    }}
                  >
                    <img src={crescentSvg} alt="" className="block w-full h-full" style={{ overflow: 'visible' }} />
                  </div>

                  {/* Ball — circular avatar photo */}
                  <div
                    className="absolute overflow-hidden rounded-full"
                    style={{
                      top: '10px',
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      aspectRatio: '1 / 1',
                      border: '1px solid var(--alpha-light-50)',
                      boxShadow:
                        '0px 20px 6px 0px rgba(12,48,70,0), 0px 13px 5px 0px rgba(12,48,70,0.02), 0px 7px 4px 0px rgba(12,48,70,0.07), 0px 3px 3px 0px rgba(12,48,70,0.12), 0px 1px 2px 0px rgba(12,48,70,0.14)',
                    }}
                  >
                    {/* Ring gradient overlay */}
                    <div className="absolute" style={{ inset: '-1px' }}>
                      <img src={ringSvg} alt="" className="block w-full h-full" />
                    </div>
                    {/* Avatar photo */}
                    <img
                      src="/lucas-avatar.jpg"
                      alt="Lucas AI"
                      className="absolute w-full h-full"
                      style={{
                        inset: 0,
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                </div>

                {/* Greeting */}
                <h1
                  className="font-normal text-black text-center"
                  style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: 'var(--heading-h4-size)',
                    lineHeight: 'var(--heading-h4-line)',
                    letterSpacing: 'var(--heading-h1-spacing)',
                  }}
                >
                  What can I research for you?
                </h1>
              </div>

              {/* Chat input */}
              <div className="chat-card-enter w-full" style={{ animationDelay: '80ms' }}>
                <ChatInput onSubmit={startSimulatedChat} placeholder="Enter a competitor's Facebook page URL..." />
              </div>

            </div>
            {/* Bottom spacer */}
            <div className="flex-1 min-h-0 shrink-[3]" />
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
