import type { TripProtectionSelection } from '../demo-schemas.js';
import { isInsurancePlan, isInsuranceSearchContext } from './insurance-results.js';

export function isTripProtectionSelection(value: unknown): value is TripProtectionSelection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return typeof s.comparisonId === 'string' && /^inscmp_[a-f0-9]{32}$/.test(s.comparisonId)
    && isInsurancePlan(s.plan) && isInsuranceSearchContext(s.searchContext)
    && typeof s.tripKey === 'string' && s.tripKey.length > 0 && s.tripKey.length <= 3000
    && typeof s.addedAt === 'string' && Number.isFinite(Date.parse(s.addedAt))
    && typeof s.expiresAt === 'string' && Number.isFinite(Date.parse(s.expiresAt))
    && Date.parse(s.expiresAt) > Date.parse(s.addedAt)
    && Date.parse(s.expiresAt) - Date.parse(s.addedAt) <= 1_800_000;
}
