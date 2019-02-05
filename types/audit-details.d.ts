/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH.Audit.Details {
    export interface Filmstrip {
      type: 'filmstrip';
      scale: number;
      items: {
        timing: number;
        timestamp: number;
        data: string;
      }[];
    }

    export interface Screenshot {
      type: 'screenshot';
      timestamp: number;
      data: string;
    }

    export interface Opportunity {
      type: 'opportunity';
      overallSavingsMs: number;
      overallSavingsBytes?: number;
      headings: TableColumnHeading[];
      items: OpportunityItem[];
    }

    export interface CriticalRequestChain {
      type: 'criticalrequestchain';
      longestChain: {
        duration: number;
        length: number;
        transferSize: number;
      };
      chains: Audit.SimpleCriticalRequestNode;
    }

    // TODO(bckenny)
    // export interface MultiCheck {}
    // export interface Table {}
    // export interface SomeKindOfHiddenThing

    // Contents of details below here

    export interface TableColumnHeading {
      /** The name of the property within items being described. */
      key: string;
      /** Readable text label of the field. */
      label: string;
      // TODO(bckenny): should be just string and let lhr be more specific?
      valueType: string; // 'url' | 'timespanMs' | 'bytes' | 'thumbnail';
    }
    
    export interface OpportunityItem {
      url: string;
      wastedBytes?: number;
      totalBytes?: number;
      wastedMs?: number;
      [p: string]: number | boolean | string | undefined;
    }

  }
}

// empty export to keep file a module
export {}
