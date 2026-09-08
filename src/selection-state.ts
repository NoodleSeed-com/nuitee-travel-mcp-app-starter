/** Adapt the state store's uninitialized object to the existing optional inputs. */
export function prepareSelectionStates(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const key of ['flightState', 'hotelState', 'experienceState']) {
    const value = input[key];
    if (value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) continue;
    output[key] = value;
  }
  return output;
}

/** Never turn a proposed experience choice into success without a committed CAS. */
export function acknowledgeExperienceSelection(input: Record<string, unknown>): Record<string, unknown> {
  const proposal = input.proposal && typeof input.proposal === 'object' && !Array.isArray(input.proposal)
    ? input.proposal as Record<string, unknown> : {};
  if (proposal.status === 'already_selected' || ['expired', 'unavailable', 'limit_reached', 'conflict'].includes(String(proposal.status))) {
    return proposal;
  }
  if (proposal.status === 'selected' && input.patchOk === true) return proposal;
  return {
    status: 'conflict',
    message: 'Your trip changed before this experience could be added. Review your trip, then try again.',
  };
}

export function selectStoredFlight(input: Record<string, unknown>): Record<string, unknown> {
  const state = input.state && typeof input.state === 'object' && !Array.isArray(input.state)
    ? input.state as Record<string, unknown> : {};
  const records = Array.isArray(state.records) ? state.records : [];
  const selected = records.some(record => record && typeof record === 'object' &&
    (record as Record<string, unknown>).selectionId === input.selectionId);
  if (!selected) return {
    status: 'unavailable',
    message: 'That fare is no longer in the current comparison. Search flights again.',
  };
  return { status: 'selected', message: 'The selected fare is ready for verification.', selectionId: input.selectionId };
}
