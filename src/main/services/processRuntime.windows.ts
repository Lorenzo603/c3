import type { ProcessRuntime } from './processRuntime';
import { createRealProcessRuntime } from './processRuntime.real';
import { createStubProcessRuntime } from './processRuntime.stub';

export function createWindowsProcessRuntime(useFixtures = false): ProcessRuntime {
  if (useFixtures) {
    return createStubProcessRuntime('windows', 'win32');
  }

  return createRealProcessRuntime('win32');
}
