import type { ProcessRuntime } from './processRuntime';
import { createStubProcessRuntime } from './processRuntime.stub';

export function createMacosProcessRuntime(): ProcessRuntime {
  return createStubProcessRuntime('macos');
}
