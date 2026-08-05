import type { ServerDefinition } from '@noodleseed/one';
import { generateHelpers } from '@noodleseed/one/react';

export {
  Action,
  ActionBar,
  Feedback,
  Flow,
  Frame,
  Region,
} from '@noodleseed/one/react';

export const { useCallTool, useLayout, useToolInfo, useViewState } =
  generateHelpers<ServerDefinition>();
