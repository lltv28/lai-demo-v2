# Lucas AI Competitor Ad Research Demo — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the Kodara white-label app from "Leanne" wellness coach to "Lucas AI" competitor ad research demo, with a 15-20s thinking animation and ad results output (4-col image grid + copy table).

**Architecture:** Fork-and-replace: swap all Leanne branding to Lucas AI, replace simulated data in SuggestionCards.tsx, route all home input to simulated flow, add AdResultsDisplay component inside ChatPage.tsx that renders when content is `[AD_RESULTS]`, and widen the message container for ad results.

**Tech Stack:** React 19, TypeScript, Vite 7, Tailwind CSS 4, existing CSS animations

**Spec:** `docs/superpowers/specs/2026-03-14-lucas-ai-rebrand-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Page title rebrand |
| `src/services/openai.ts:8-12` | Modify | System prompt rebrand |
| `src/components/ChatInput.tsx:317,340` | Modify | "Leanne AI" → "Lucas AI" tag |
| `src/components/Sidebar.tsx` | No change needed | No "Leanne" text exists here |
| `src/components/MyChatsPage.tsx:8` | Modify | "Leanne AI" → "Lucas AI" in chat history |
| `src/components/ChatPage.tsx:1061` | Modify | "Leanne" → "Lucas AI" in assistant avatar label |
| `src/components/ChatPage.tsx:1379` | Modify | Thinking step timing: 1500+random*800 → 3500+random*1500 |
| `src/components/ChatPage.tsx:1495-1502` | Modify | Widen message container for ad results |
| `src/components/ChatPage.tsx:1076-1091` | Modify | Detect `[AD_RESULTS]` and render AdResultsDisplay |
| `src/components/ChatPage.tsx` (new) | Create | AdResultsDisplay component (image grid + table) |
| `src/components/Dashboard.tsx:4,238,244,248-250` | Modify | Remove SuggestionCards, rebrand greeting, route input to simulated flow |
| `src/components/SuggestionCards.tsx` | Rewrite | Delete old data, export ad-research simulated data only |
| `src/index.css` | Modify | Add ad-card entrance animation keyframes |

---

## Chunk 1: Rebranding

### Task 1: Rebrand all "Leanne" / "Marcos" references

**Files:**
- Modify: `index.html:10`
- Modify: `src/services/openai.ts:8-12`
- Modify: `src/components/ChatInput.tsx:317,340`
- Modify: `src/components/MyChatsPage.tsx:8`
- Modify: `src/components/ChatPage.tsx:1061`
- Modify: `src/components/Dashboard.tsx:238`

- [ ] **Step 1: Rebrand index.html page title**

Change line 10 in `index.html`:
```html
<!-- Before -->
<title>Whitelabel App</title>
<!-- After -->
<title>Lucas AI</title>
```

- [ ] **Step 2: Rebrand system prompt in openai.ts**

Change lines 8-12 in `src/services/openai.ts`:
```typescript
// Before
const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content:
    'You are Leanne, a warm and insightful AI wellness and life coach. You respond with empathy, clarity, and genuine curiosity about the person you\'re helping. Keep your responses conversational but thoughtful — typically 2-3 short paragraphs. Ask follow-up questions to understand the user better. Never use markdown formatting, bullet points, or numbered lists — write in natural flowing prose.',
};

// After
const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content:
    'You are Lucas AI, an expert competitor ad research assistant. You help users analyze competitor Facebook ads, identify creative patterns, and generate new ad concepts. Keep your responses clear and actionable.',
};
```

- [ ] **Step 3: Rebrand ChatInput.tsx "Leanne AI" tag**

Change line 317 comment and line 340 text in `src/components/ChatInput.tsx`:
```typescript
// Line 317: change comment
{/* Lucas AI tag */}

// Line 340: change text
Lucas AI
```

- [ ] **Step 4: Rebrand MyChatsPage.tsx first chat entry**

Change line 8 in `src/components/MyChatsPage.tsx`:
```typescript
// Before
agent: 'Leanne AI',
// After
agent: 'Lucas AI',
```

- [ ] **Step 5: Rebrand ChatPage.tsx assistant avatar label**

Change line 1061 in `src/components/ChatPage.tsx`:
```typescript
// Before
          Leanne
// After
          Lucas AI
```

- [ ] **Step 6: Rebrand Dashboard.tsx greeting**

Change line 238 in `src/components/Dashboard.tsx`:
```typescript
// Before
                  Hey Marcos, what&rsquo;s up?
// After
                  What can I research for you?
```

- [ ] **Step 7: Verify the dev server runs**

Run: `cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research && npm run dev`
Expected: App loads, all visible "Leanne" references now say "Lucas AI", greeting says "What can I research for you?"

- [ ] **Step 8: Commit**

```bash
cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research
git add index.html src/services/openai.ts src/components/ChatInput.tsx src/components/MyChatsPage.tsx src/components/ChatPage.tsx src/components/Dashboard.tsx
git commit -m "rebrand: replace all Leanne/Marcos references with Lucas AI"
```

---

## Chunk 2: Simulated Data & Input Routing

### Task 2: Replace SuggestionCards.tsx with ad-research simulated data

**Files:**
- Rewrite: `src/components/SuggestionCards.tsx`

- [ ] **Step 1: Rewrite SuggestionCards.tsx as a data-only module**

Replace the entire file with:

```typescript
export interface ThinkingStep {
  label: string;
}

// Single simulated response — triggers AdResultsDisplay in ChatPage
export const AD_RESULTS_MARKER = '[AD_RESULTS]';

// 5-element array: index 0 = idle header, indices 1-4 = animated processing steps
export function getAdResearchThinkingSteps(userInput: string): ThinkingStep[] {
  return [
    { label: 'Researching competitor ads...' },
    { label: `Searching Facebook Ad Library for ${userInput}...` },
    { label: 'Found 50 recent ads — analyzing creative patterns...' },
    { label: 'Extracting top-performing ad copy and visual themes...' },
    { label: 'Generating new ad creatives tailored to your brand...' },
  ];
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research
git add src/components/SuggestionCards.tsx
git commit -m "feat: replace Leanne simulated data with ad-research data module"
```

### Task 3: Update Dashboard.tsx to remove SuggestionCards and route all input to simulated flow

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Update imports**

Replace lines 4-5 in `src/components/Dashboard.tsx` (keep line 3 `ChatInput` import intact):
```typescript
// Before (lines 4-5)
import SuggestionCards, { simulatedResponses, simulatedThinkingSteps, simulatedImages } from './SuggestionCards';
import type { ThinkingStep } from './SuggestionCards';

// After
import { AD_RESULTS_MARKER, getAdResearchThinkingSteps } from './SuggestionCards';
import type { ThinkingStep } from './SuggestionCards';
```

- [ ] **Step 2: Replace startSimulatedChat to use hardcoded ad-research response for any input**

Replace lines 34-44 in `src/components/Dashboard.tsx`:
```typescript
// Before
  const startSimulatedChat = useCallback((message: string) => {
    const response = simulatedResponses[message];
    const steps = simulatedThinkingSteps[message];
    const image = simulatedImages[message];
    setChatInitialMessage(message);
    setChatSimulatedResponse(response);
    setChatSimulatedSteps(steps);
    setChatSimulatedImage(image);
    setChatKey((k) => k + 1);
    setCurrentPage('chat');
  }, []);

// After
  const startSimulatedChat = useCallback((message: string) => {
    setChatInitialMessage(message);
    setChatSimulatedResponse(AD_RESULTS_MARKER);
    setChatSimulatedSteps(getAdResearchThinkingSteps(message));
    setChatSimulatedImage(undefined);
    setChatKey((k) => k + 1);
    setCurrentPage('chat');
  }, []);
```

- [ ] **Step 3: Route home ChatInput to simulated flow instead of API**

Change line 244 in `src/components/Dashboard.tsx`:
```typescript
// Before
                <ChatInput onSubmit={startChat} />
// After
                <ChatInput onSubmit={startSimulatedChat} placeholder="Enter a competitor's Facebook page URL..." />
```

- [ ] **Step 4: Remove SuggestionCards rendering**

Delete lines 247-250 in `src/components/Dashboard.tsx` (the suggestion cards block):
```typescript
// Delete this entire block:
              {/* Suggestion cards */}
              <div className="chat-card-enter w-full" style={{ animationDelay: '160ms' }}>
                <SuggestionCards onSelect={startSimulatedChat} />
              </div>
```

- [ ] **Step 5: Verify the app compiles and input triggers simulated flow**

Run: `cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research && npm run dev`
Expected: Home page shows input with "Enter a competitor's Facebook page URL..." placeholder. No suggestion cards. Typing anything and pressing Enter navigates to chat page with thinking steps animation (steps now show ad-research labels with user input interpolated). After steps complete, content will show "[AD_RESULTS]" as raw text (not yet rendered as grid — that's next chunk).

- [ ] **Step 6: Commit**

```bash
cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research
git add src/components/Dashboard.tsx
git commit -m "feat: route all home input to simulated ad-research flow, remove suggestion cards"
```

### Task 4: Update thinking step timing to 15-20 seconds

**Files:**
- Modify: `src/components/ChatPage.tsx:1379`

- [ ] **Step 1: Change per-step delay formula**

Change line 1379 in `src/components/ChatPage.tsx`:
```typescript
// Before
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 800));
// After
        await new Promise((r) => setTimeout(r, 3200 + Math.random() * 1300));
```

- [ ] **Step 2: Verify timing**

Run dev server, type a URL, observe thinking steps. Total animation should take ~15-20 seconds across 4 steps (~3.5-5s each).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research
git add src/components/ChatPage.tsx
git commit -m "feat: increase thinking step timing to 15-20s total"
```

---

## Chunk 3: AdResultsDisplay Component

### Task 5: Add ad-card entrance animation to index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add ad-card animation keyframes**

Append to the end of `src/index.css` (before any closing comments):
```css
/* ── Ad Results Grid ── */

.ad-card-enter {
  animation: ad-card-fade-slide-up 500ms ease-out both;
}

@keyframes ad-card-fade-slide-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research
git add src/index.css
git commit -m "feat: add ad-card entrance animation keyframes"
```

### Task 6: Build AdResultsDisplay component in ChatPage.tsx

**Files:**
- Modify: `src/components/ChatPage.tsx` (add new component before AssistantMessage)

- [ ] **Step 1: Add the AdResultsDisplay component**

Insert this component in `src/components/ChatPage.tsx` just before the `AssistantMessage` function (before line 1010, after the ThinkingStepsDisplay closing brace at line 1008):

```typescript
/* ── Ad Results Display — rendered when content === "[AD_RESULTS]" ── */

const AD_PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5576c 0%, #ff6a00 100%)',
  'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
  'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)',
  'linear-gradient(135deg, #feada6 0%, #f5efef 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
];

const AD_COPY_DATA = [
  { headline: 'Stop Guessing, Start Scaling', primaryText: 'Your competitors already know what works. Now you can too — AI-powered ad intelligence that turns their best strategies into your next campaign.', cta: 'Get Started Free' },
  { headline: 'Your Competitors\' Best Ads, Decoded', primaryText: 'We analyzed 50 of their top-performing creatives so you don\'t have to. See exactly what\'s working and why.', cta: 'See the Analysis' },
  { headline: 'Launch Winning Ads in Minutes', primaryText: 'Why start from scratch? Our AI studies the competition and generates scroll-stopping creatives tailored to your brand.', cta: 'Try It Now' },
  { headline: 'The Ad Strategy They Don\'t Want You to See', primaryText: 'Every brand leaves a trail. We follow it, decode their playbook, and hand you the blueprint to outperform them.', cta: 'Reveal Their Strategy' },
  { headline: 'Better Ads, Less Guesswork', primaryText: 'Tired of A/B testing blind? Let AI analyze what\'s already proven to convert and build your next campaign around it.', cta: 'Start Analyzing' },
  { headline: 'From Competitor Research to Ready-to-Run Ads', primaryText: 'One URL. That\'s all it takes. Paste their Facebook page and get a full creative strategy in under 60 seconds.', cta: 'Paste a URL' },
  { headline: 'Ad Creative on Autopilot', primaryText: 'Stop spending hours on ad design. Our AI generates high-converting creatives based on real competitor data — not templates.', cta: 'Generate Ads' },
  { headline: 'What If You Could See Their Entire Ad Playbook?', primaryText: 'From copy angles to visual themes, we break down exactly what your competitors are running — and help you do it better.', cta: 'Unlock Insights' },
  { headline: 'Outsmart, Don\'t Outspend', primaryText: 'You don\'t need a bigger budget. You need better intel. See what\'s converting for your competitors and adapt it to your brand.', cta: 'Get Intel Now' },
  { headline: 'AI-Generated Ads That Actually Convert', primaryText: 'Trained on real competitor performance data, not stock templates. Every creative is built to compete from day one.', cta: 'Create My Ads' },
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
          Based on competitor creative patterns — 20 new ad concepts
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
        {AD_PLACEHOLDER_GRADIENTS.map((gradient, i) => (
          <div
            key={i}
            className="ad-card-enter"
            style={{
              animationDelay: `${i * 80}ms`,
              aspectRatio: '4 / 5',
              borderRadius: '16px',
              background: gradient,
              border: '1px solid var(--alpha-light-100)',
              cursor: 'pointer',
              transition: 'transform 200ms ease, box-shadow 200ms ease',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '12px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--body-4-size)',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              Ad {i + 1}
            </span>
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
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research
git add src/components/ChatPage.tsx
git commit -m "feat: add AdResultsDisplay component with image grid and copy table"
```

### Task 7: Wire AdResultsDisplay into AssistantMessage and widen container

**Files:**
- Modify: `src/components/ChatPage.tsx:1076-1091` (AssistantMessage body)
- Modify: `src/components/ChatPage.tsx:1495-1502` (message container width)

- [ ] **Step 1: Import AD_RESULTS_MARKER**

Add to the imports at the top of `src/components/ChatPage.tsx` (modify the existing SuggestionCards import):
```typescript
// Before
import type { ThinkingStep } from './SuggestionCards';
// After
import { AD_RESULTS_MARKER } from './SuggestionCards';
import type { ThinkingStep } from './SuggestionCards';
```

- [ ] **Step 2: Detect [AD_RESULTS] in AssistantMessage body**

Replace lines 1083-1091 in `src/components/ChatPage.tsx` (the content rendering block inside AssistantMessage):
```typescript
// Before
        {content ? (
          <RichContent content={content} isStreaming={isStreaming} totalTableRows={totalTableRows} totalRoadmapStages={totalRoadmapStages} />
        ) : isStreaming && !(thinkingSteps && thinkingSteps.length > 0 && !thinkingSteps.every((s) => s.status === 'done')) ? (
          <div className="typing-indicator">
            <span />
            <span />
            <span />
          </div>
        ) : null}

// After
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
```

- [ ] **Step 3: Widen message container for ad results**

Replace lines 1495-1502 in `src/components/ChatPage.tsx`. The message container `div` needs to check whether the current messages include ad results and widen accordingly:

```typescript
// Before
        <div
          className="flex flex-col w-full"
          style={{
            maxWidth: '704px',
            paddingLeft: '8px',
            paddingRight: '8px',
            gap: '32px',
          }}
        >

// After
        <div
          className="flex flex-col w-full"
          style={{
            maxWidth: messages.some((m) => m.content === AD_RESULTS_MARKER) ? '1100px' : '704px',
            paddingLeft: '8px',
            paddingRight: '8px',
            gap: '32px',
            transition: 'max-width 400ms ease',
          }}
        >
```

Note: `AD_RESULTS_MARKER` is imported from SuggestionCards and `messages` is already in scope from the component state.

- [ ] **Step 4: Verify the full flow end-to-end**

Run: `cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research && npm run dev`
Expected:
1. Home page shows "What can I research for you?" greeting, input with Facebook URL placeholder, no suggestion cards
2. Type any text, press Enter
3. Chat page shows user bubble, then Lucas AI thinking steps with 15-20s animation
4. After thinking completes, 4-column grid of 20 gradient placeholder ad cards appears with staggered animation
5. Below grid: divider, then ad copy table with 10 rows
6. Message container is wider than default to accommodate the grid
7. Hovering ad cards shows subtle scale + shadow effect

- [ ] **Step 5: Commit**

```bash
cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research
git add src/components/ChatPage.tsx
git commit -m "feat: wire AdResultsDisplay into chat, widen container for ad results"
```

---

## Chunk 4: Final Polish

### Task 8: Clean up unused imports and verify build

**Files:**
- Modify: `src/components/Dashboard.tsx` (remove unused `startChat` if no longer referenced)

- [ ] **Step 1: Check if startChat is still used**

In `src/components/Dashboard.tsx`, `startChat` (lines 25-32) is no longer called from anywhere after the home input was routed to `startSimulatedChat`. However, `ChatPage` still has a `sendMessage` for follow-up messages in the chat — that's separate. Check if `startChat` is referenced anywhere else in Dashboard.tsx. If the only caller was `ChatInput onSubmit={startChat}` which was changed to `startSimulatedChat`, then `startChat` can be removed.

Remove the `startChat` function (lines 25-32) and the `startChat` import dependency if unused:
```typescript
// Delete these lines if unused:
  const startChat = useCallback((message: string) => {
    setChatInitialMessage(message);
    setChatSimulatedResponse(undefined);
    setChatSimulatedSteps(undefined);
    setChatSimulatedImage(undefined);
    setChatKey((k) => k + 1);
    setCurrentPage('chat');
  }, []);
```

Also remove the `chatSimulatedImage` state and its setter if no longer needed (ad research flow passes `undefined`):
- Check if `chatSimulatedImage` is passed to `ChatPage` — if so and ChatPage still accepts it, leave it.

- [ ] **Step 2: Run the production build**

Run: `cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research && npm run build`
Expected: Build completes with no TypeScript errors and no warnings about unused variables.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/lucas/OneDrive/Documents/claude-code/lucas-ai-competitor-research
git add -A
git commit -m "chore: clean up unused imports and verify build"
```
