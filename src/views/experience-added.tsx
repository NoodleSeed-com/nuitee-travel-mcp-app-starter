import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import { useEffect, useState } from 'react';
import type { DemoExperienceSelection } from '../demo-schemas.js';
import { Feedback, Frame, useCallTool, useLayout, useSendFollowUpMessage, useToolInfo, useUpdateModelContext, useWidgetReady } from '../helpers.js';
import { ExperienceAddedView } from './experience-selection.js';
import { isExperienceTripSelection, record, text } from './experience-selection-data.js';
import './travel.css';
import { InlineTripReview } from './trip-review.js';

export default function ExperienceAdded() {
  const ready = useWidgetReady();
  const layout = useLayout();
  const info = useToolInfo('add_experience_to_trip');
  const review = useCallTool('review_trip');
  const sendFollowUp = useSendFollowUpMessage();
  const updateModelContext = useUpdateModelContext();
  const output = record(info.structuredContent);
  const candidate = !info.isError && ['selected', 'already_selected'].includes(String(output?.status)) &&
    typeof output?.requestedExperienceId === 'string' && /^exp_[a-f0-9]{32}$/.test(output.requestedExperienceId) &&
    typeof output.requestedSlotId === 'string' && /^slot_[a-f0-9]{32}$/.test(output.requestedSlotId) &&
    isExperienceTripSelection(output.selection) && (output.status === 'already_selected' || output.selection.experience.experienceId === output.requestedExperienceId && output.selection.slot.slotId === output.requestedSlotId)
    ? output.selection : undefined;
  const [selection, setSelection] = useState<DemoExperienceSelection>();
  const [failure, setFailure] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [showReview, setShowReview] = useState(false);
  useEffect(() => { setShowReview(false); }, [candidate?.selectionId]);
  useEffect(() => {
    if (!ready || !candidate) return;
    let current = true;
    setSelection(undefined); setFailure(undefined);
    void review.callToolAsync({}).then((response) => {
      if (!current) return;
      const result = record(response.structuredContent);
      const saved = !response.isError && Array.isArray(result?.experiences) ? result.experiences.find((item) => isExperienceTripSelection(item) && item.selectionId === candidate.selectionId) : undefined;
      if (isExperienceTripSelection(saved) && Date.parse(saved.expiresAt) > Date.now()) setSelection(saved);
      else setFailure('This experience choice is no longer current. Ask for fresh experience options before adding it again.');
    }).catch(() => { if (current) setFailure('The current selection could not be checked. Ask to review your trip in the conversation.'); });
    return () => { current = false; };
  }, [ready, candidate?.selectionId]);
  useEffect(() => {
    if (!selection) {
      if (!showReview && ready && failure && layout.supports?.modelContext) void updateModelContext({ content: [{ type: 'text', text: failure }], structuredContent: { selectedExperience: null, selectionStatus: 'unverified' } }).catch(() => {});
      return;
    }
    const remaining = Date.parse(selection.expiresAt) - Date.now();
    const timer = setTimeout(() => { setSelection(undefined); setFailure('This experience choice has expired. Ask for fresh experience options.'); }, Math.max(0, Math.min(remaining, 2_147_483_647)));
    if (!showReview && layout.supports?.modelContext) void updateModelContext({
      content: [{ type: 'text', text: `Selected fictional experience: ${selection.experience.title}, ${selection.slot.startLocal} (${selection.slot.timeZone}), ${selection.searchContext.adults} adults. A planning choice only; nothing reserved or paid.` }],
      structuredContent: { selectedExperience: { selectionId: selection.selectionId, title: selection.experience.title, startLocal: selection.slot.startLocal, timeZone: selection.slot.timeZone, totalPrice: selection.totalPrice, status: 'selected' } },
    }).catch(() => {});
    return () => clearTimeout(timer);
  }, [showReview, ready, selection?.selectionId, failure, layout.supports?.modelContext]);
  const pending = !ready || Object.keys(info).length === 0 || candidate && !selection && !failure;
  if (showReview) return <InlineTripReview onBack={() => setShowReview(false)} backLabel="Back to experience" />;
  if (pending) return <Frame className="cc-app" displayMode="auto"><Feedback status="loading">Checking your selected experience…</Feedback></Frame>;
  if (failure || !selection) return <Frame className="cc-app" displayMode="auto" title="Experience selection"><Feedback status="error">{failure ?? (text(output?.message, 2, 500) ? output.message : 'The experience selection could not be verified. Review your trip or ask for fresh options.')}</Feedback></Frame>;
  const followUp = ready && layout.supports?.followUpMessage ? (prompt: string) => { setActionError(undefined); void sendFollowUp({ prompt }).catch(() => setActionError('The follow-up could not be sent. Continue in the conversation.')); } : undefined;
  return <ExperienceAddedView selection={selection} locale={layout.locale ?? 'en-CA'} actionError={actionError}
    onReview={ready ? () => setShowReview(true) : undefined}
    onExplore={followUp ? () => followUp(`Show more fictional experiences for ${selection.searchContext.destination}, ${selection.searchContext.startDate} to ${selection.searchContext.endDate}, ${selection.searchContext.adults} adults, ${selection.searchContext.children} children, in ${selection.searchContext.currency}.`) : undefined} />;
}
