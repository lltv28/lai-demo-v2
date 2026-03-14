export interface ThinkingStep {
  label: string;
}

// Single simulated response — triggers AdResultsDisplay in ChatPage
export const AD_RESULTS_MARKER = '[AD_RESULTS]';

// 6-element array: index 0 = idle header, indices 1-5 = animated processing steps
export function getAdResearchThinkingSteps(_userInput?: string): ThinkingStep[] {
  return [
    { label: 'Researching competitor ads...' },
    { label: 'Searching Facebook Ad Library for ClickFunnels...' },
    { label: 'Found 50 recent ads — analyzing creative patterns...' },
    { label: 'Extracting top-performing ad copy and visual themes...' },
    { label: 'Comparing with top ad creatives in ad account from last 30 days...' },
    { label: 'Generating new ad creatives tailored to your brand...' },
  ];
}
