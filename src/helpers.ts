import type { ServerDefinition } from '@noodleseed/one';
import { generateHelpers } from '@noodleseed/one/react';

export {
  Action,
  ActionBar,
  Feedback,
  Field,
  Flow,
  Frame,
  Input,
  Region,
  SegmentedControl,
  Select,
  StatusBadge,
} from '@noodleseed/one/react';

export const {
  useAppFlow,
  useBranding,
  useCallTool,
  useLayout,
  useRequestDisplayMode,
  useSendFollowUpMessage,
  useToolInfo,
  useUpdateModelContext,
  useViewState,
} =
  generateHelpers<ServerDefinition>();
