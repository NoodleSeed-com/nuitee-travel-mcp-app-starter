/** Adapt the state store's uninitialized object to the existing optional inputs. */
export function prepareSelectionStates(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const key of ['flightState', 'hotelState', 'experienceState']) {
    const value = input[key];
    if (value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) continue;
    output[key] = value;
  }
  if (input.flightReadOk !== undefined || input.hotelReadOk !== undefined || input.experienceReadOk !== undefined) {
    output.tripReadOk = input.flightReadOk === true && input.hotelReadOk === true && input.experienceReadOk === true;
  }
  return output;
}

/** A comparison is selectable only when its bounded server snapshot was saved. */
export function acknowledgeProtectionComparison(input: Record<string, unknown>) {
  const proposal = input.proposal as { canSelect?: boolean; message?: string } | undefined;
  return { canSelect: proposal?.canSelect === true && input.patchOk === true,
    message: proposal?.canSelect === true && input.patchOk !== true
      ? 'The comparison could not be saved. You can browse it, but compare again before adding a concept.'
      : proposal?.message ?? 'This comparison is available to browse only.' };
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
