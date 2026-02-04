/**
 * Daily Insight Response Parser
 * Parses and validates LLM output, enforcing "Nourished Calm" voice
 */

const EMOJI_REGEX = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u;
const BANNED_WORDS = [
  'failed',
  'cheated',
  'warning',
  'bad',
  'poor',
  'behind',
  'falling short',
];

export interface ParsedInsightResponse {
  icon: string;
  narrative: string;
  isValid: boolean;
  validationIssues: string[];
}

export function parseInsightResponse(rawResponse: string): ParsedInsightResponse {
  const trimmed = rawResponse.trim();
  const issues: string[] = [];

  // 1. Strip leading emoji (LLM may produce one); always use Ionicons name
  let icon = 'leaf-outline'; // default Ionicons name
  let narrative = trimmed;

  const emojiMatch = trimmed.match(EMOJI_REGEX);
  if (emojiMatch) {
    // Strip the emoji from the narrative text; icon stays as Ionicons name
    narrative = trimmed.slice(emojiMatch[0].length).trim();
  }

  // 2. Validate length (should be 2-3 sentences, not a wall of text)
  const sentenceCount = (narrative.match(/[.!?]+/g) || []).length;
  if (sentenceCount > 5) {
    const sentences = narrative.match(/[^.!?]+[.!?]+/g) || [narrative];
    narrative = sentences.slice(0, 3).join(' ').trim();
    issues.push(`Response truncated from ${sentenceCount} to 3 sentences`);
  }

  // 3. Check for banned words
  const lowerNarrative = narrative.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lowerNarrative.includes(word)) {
      issues.push(`Banned word detected: "${word}"`);
      narrative = narrative.replace(new RegExp(word, 'gi'), getSoftAlternative(word));
    }
  }

  // 4. Remove exclamation marks (Nourished Calm voice)
  if (narrative.includes('!')) {
    narrative = narrative.replace(/!/g, '.');
    issues.push('Exclamation marks replaced with periods');
  }

  return {
    icon,
    narrative,
    isValid: issues.length === 0,
    validationIssues: issues,
  };
}

function getSoftAlternative(word: string): string {
  const alternatives: Record<string, string> = {
    failed: 'fell short of',
    cheated: 'deviated from',
    warning: 'note',
    bad: 'less ideal',
    poor: 'limited',
    behind: 'below',
    'falling short': 'room to grow',
  };
  return alternatives[word.toLowerCase()] || word;
}
