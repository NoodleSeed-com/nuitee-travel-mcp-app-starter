import type { ServerDefinition } from '@noodleseed/one';
import { generateHelpers } from '@noodleseed/one/react';

export {
  Action,
  ActionBar,
  Feedback,
  Field,
  Flow,
  Form,
  Frame,
  Input,
  Region,
  Select,
  StatusBadge,
} from '@noodleseed/one/react';

export const {
  useAppFlow,
  useBranding,
  useCallTool,
  useLayout,
  useOpenExternal,
  useRequestDisplayMode,
  useSendFollowUpMessage,
  useToolInfo,
  useUpdateModelContext,
  useViewState,
  useWidgetReady,
} =
  generateHelpers<ServerDefinition>();
