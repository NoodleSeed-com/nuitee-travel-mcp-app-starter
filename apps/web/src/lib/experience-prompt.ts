export const EXPERIENCE_PROMPT_KEY = 'wayfare:experience-prompt';
export const EXPERIENCE_CURRENCY_KEY = 'wayfare:experience-currency';

const SUPPORTED_EXPERIENCE_CURRENCIES = new Set(['USD', 'CAD', 'GBP', 'EUR']);

const MAX_EXPERIENCE_PROMPT_LENGTH = 1_000;
const UNSAFE_PROMPT_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu;

function boundedPrompt(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value
    .replace(UNSAFE_PROMPT_CHARACTERS, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, MAX_EXPERIENCE_PROMPT_LENGTH).join('');
}

export function saveExperiencePrompt(
  storage: Pick<Storage, 'setItem'>,
  prompt: string,
): boolean {
  const safePrompt = boundedPrompt(prompt);
  if (!safePrompt) return false;
  storage.setItem(EXPERIENCE_PROMPT_KEY, safePrompt);
  return true;
}

export function readExperiencePrompt(
  storage: Pick<Storage, 'getItem'>,
): string | null {
  return boundedPrompt(storage.getItem(EXPERIENCE_PROMPT_KEY));
}

export function clearExperiencePrompt(
  storage: Pick<Storage, 'removeItem'>,
): void {
  storage.removeItem(EXPERIENCE_PROMPT_KEY);
}

export function saveExperienceCurrency(
  storage: Pick<Storage, 'setItem'>,
  currency: string,
): boolean {
  if (!SUPPORTED_EXPERIENCE_CURRENCIES.has(currency)) return false;
  storage.setItem(EXPERIENCE_CURRENCY_KEY, currency);
  return true;
}

export function takeExperienceCurrency(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
): 'USD' | 'CAD' | 'GBP' | 'EUR' | null {
  const currency = storage.getItem(EXPERIENCE_CURRENCY_KEY);
  storage.removeItem(EXPERIENCE_CURRENCY_KEY);
  return SUPPORTED_EXPERIENCE_CURRENCIES.has(currency ?? '')
    ? currency as 'USD' | 'CAD' | 'GBP' | 'EUR'
    : null;
}
