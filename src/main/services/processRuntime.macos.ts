import type { ProcessRuntime } from './processRuntime';
import { createRealProcessRuntime } from './processRuntime.real';
import { createStubProcessRuntime } from './processRuntime.stub';

export function createMacosProcessRuntime(useFixtures = false): ProcessRuntime {
  if (useFixtures) {
    return createStubProcessRuntime('macos', 'darwin');
  }

  return createRealProcessRuntime('darwin');
}
