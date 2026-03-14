# Lucas AI — Competitor Ad Research Demo

## Overview

Fork and rebrand the Kodara white-label app from "Leanne" (wellness coach) to "Lucas AI" (competitor ad research tool). The primary demo flow: user enters a competitor's Facebook page URL, watches a multi-step thinking animation (15-20 seconds), then sees AI-generated ad creatives (4-column image grid, 16+ ads) and ad copy (table format) as the response.

## Decisions

| Decision | Choice |
|---|---|
| Approach | Fork & replace — rebrand entire app |
| Branding | "Lucas AI", text-only, keep existing color palette (Pelorous cyan + green) |
| Thinking steps | 5-element array (1 idle header + 4 processing steps), 15-20 seconds total |
| Input flow | Empty input, user types any URL, triggers simulated demo |
| Output layout | Stacked — image grid on top, ad copy table below |
| Image grid | 4 columns, 16+ CSS gradient placeholder ads |
| Ad copy format | Table with columns: # / Headline / Primary Text / CTA |
| Sidebar | Cosmetic chrome, no functional changes to nav items |
| Ad images | CSS gradient placeholders for now, user will provide real image files later |

## Section 1: Rebranding

All string/text replacements across the codebase:

- "Leanne" → "Lucas AI" everywhere (sidebar, chat bubbles, avatar labels, settings)
- "Leanne AI" tag in `ChatInput.tsx` → "Lucas AI"
- System prompt in `openai.ts` — change persona from wellness coach to ad research assistant
- Dashboard greeting — "Good morning, Marcos" → generic greeting
- Page title / favicon if present

What stays the same: all colors, fonts, spacing tokens, animations, glass morphism, sidebar structure, settings modal shell.

## Section 2: Input & Trigger Flow

### Chat input
- Placeholder text → `"Enter a competitor's Facebook page URL..."`
- User types any text, hits Enter or clicks send
- Suggestion cards are no longer rendered — remove `<SuggestionCards>` from `Dashboard.tsx`. Keep `SuggestionCards.tsx` file only as a data module for its exported simulated data.

### Input routing
- Modify `Dashboard.tsx` so the home screen `ChatInput.onSubmit` calls `startSimulatedChat` instead of `startChat` (bypasses OpenAI API entirely)
- `startSimulatedChat` is modified to use a hardcoded ad-research response for any input text (no dictionary lookup — every input maps to the same simulated ad results)
- The user's input text is passed through to the thinking steps so step 1 can interpolate it

### Message flow (reusing existing `simulateTyping` pipeline)
1. User message appears as a right-aligned chat bubble
2. Lucas AI assistant bubble appears with thinking steps animation
3. After thinking completes (~15-20s), response content renders as the ad results component

### Thinking step data structure

The existing architecture uses a 5-element array where index 0 is an "idle" header row (shown as shimmer text, never transitions through active) and indices 1-4 are the animated processing steps. The loop in `simulateTyping` starts at index 1.

```
Step 0 (idle header): "Researching competitor ads..."
Step 1: "Searching Facebook Ad Library for [user's input]..." — ~4s
Step 2: "Found 50 recent ads — analyzing creative patterns..." — ~4s
Step 3: "Extracting top-performing ad copy and visual themes..." — ~4s
Step 4: "Generating new ad creatives tailored to your brand..." — ~5s
```

### Thinking step timing
- Modify the per-step delay formula in `simulateTyping` from `1500 + Math.random() * 800` (~1.5-2.3s) to `3500 + Math.random() * 1500` (~3.5-5s) to achieve 15-20 second total duration across 4 animated steps
- All steps show "done", collapse after 2s, then results appear

## Section 3: Ad Results Display

### Simulated response data structure
- The simulated response for any ad-research input is the string `"[AD_RESULTS]"`
- In `AssistantMessage` rendering in `ChatPage.tsx`, when `content === "[AD_RESULTS]"`, render `<AdResultsDisplay />` instead of the normal markdown content pipeline
- `AdResultsDisplay` is a self-contained component with hardcoded image grid + its own `<table>` element for ad copy

### New component: `AdResultsDisplay`

Lives in `ChatPage.tsx` alongside the other message rendering components.

### Image grid
- 4-column CSS grid, 16 placeholder images (4 rows)
- Each card: `border-radius: 16px`, glass morphism background matching existing design language
- Placeholder images: CSS gradient rectangles (no external dependencies, works offline) — will be replaced with real image files later
- ~4:5 portrait aspect ratio (like real Facebook ads)
- Staggered fade-slide-up entrance animation (reuse existing `chat-card-fade-slide-up` keyframe pattern)
- Light hover effect (subtle scale or border glow)

### Section divider
- Subtle horizontal line or spacing between grid and copy table

### Ad copy table
- `AdResultsDisplay` renders its own `<table>` element styled consistently with the existing markdown table styles in `ChatPage.tsx`
- Columns: **#** | **Headline** | **Primary Text** | **CTA**
- 8-10 rows of hardcoded simulated ad copy
- Generic digital marketing content (works regardless of input URL)

### Layout
- Grid and table both inside the same assistant message bubble
- Widen or remove the existing `maxWidth: '704px'` constraint on the message container in `ChatPage.tsx` for messages containing ad results (the current 704px is too narrow for a 4-column image grid)

## Section 4: Scope — What Stays Untouched

No functional changes to these (only "Leanne" → "Lucas AI" text swaps):

- Sidebar — same collapse/expand behavior, cosmetic nav items
- Settings modal — rebranded text only
- My Chats page — demo chat history entries get rebranded labels
- Connectors page — stays as-is
- PixelBlastBackground — stays as-is
- Account create page — stays as-is
- All CSS animations — thinking steps, modal transitions, dropdowns reused directly
- OpenAI service — stays wired up but not called during demo (simulated data takes priority)
- Chat action buttons (copy, like/dislike, voice) — stay as-is

## Files With Meaningful Edits

1. **`SuggestionCards.tsx`** — delete all old Leanne simulated data (`simulatedResponses`, `simulatedThinkingSteps`, `simulatedImages`, `suggestions` array). Replace with new exports: ad-research response (`"[AD_RESULTS]"`), ad-research thinking steps (5-element array), and no images. The `SuggestionCards` component itself is no longer rendered but the file is kept as a data module.
2. **`ChatPage.tsx`** — new `AdResultsDisplay` component (image grid + table), detection of `[AD_RESULTS]` marker in `AssistantMessage`, wider message container for ad result messages, thinking step input interpolation
3. **`Dashboard.tsx`** — updated greeting, remove `<SuggestionCards>` render, route all home input to `startSimulatedChat` with hardcoded ad-research data, pass user input to thinking steps for interpolation
4. **`ChatInput.tsx`** — new placeholder text, rebrand "Leanne AI" tag
5. **`Sidebar.tsx`** — text swaps
6. **`openai.ts`** — system prompt rebrand
7. **`Icons.tsx`** — text swaps if any Leanne-specific references exist
8. **`index.css`** — add grid card entrance animation keyframes for the ad image cards
