import type { ProcessRuntime } from './processRuntime';
import { createStubProcessRuntime } from './processRuntime.stub';

export function createWindowsProcessRuntime(): ProcessRuntime {
  return createStubProcessRuntime('windows');
}
