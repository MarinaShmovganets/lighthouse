import * as TraceEngine from '/Users/cjamcl/src/devtools/devtools-frontend/out/Default/gen/trace_engine/models/trace/trace.js';

import {polyfillDOMRect} from './polyfill-dom-rect.js';

polyfillDOMRect();

const TraceProcessor = TraceEngine.Processor.TraceProcessor;
const TraceHandlers = TraceEngine.Handlers.ModelHandlers;
const RootCauses = TraceEngine.RootCauses.RootCauses.RootCauses;

export {
  TraceProcessor,
  TraceHandlers,
  RootCauses,
};
