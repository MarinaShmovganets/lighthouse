// @ts-nocheck
// generated by yarn build-cdt-lib
const Platform = require('../Platform.js');
"use strict";
/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextSourceMap = exports.SourceMapEntry = exports.Offset = exports.Section = exports.SourceMapV3 = void 0;






const UIStrings = {
    /**
    *@description Error message when failing to load a source map text via the network
    *@example {https://example.com/sourcemap.map} PH1
    *@example {A certificate error occurred} PH2
    */
    couldNotLoadContentForSS: 'Could not load content for {PH1}: {PH2}',
    /**
    *@description Error message when failing to load a script source text via the network
    *@example {https://example.com} PH1
    *@example {Unexpected token} PH2
    */
    couldNotParseContentForSS: 'Could not parse content for {PH1}: {PH2}',
};

const i18nString = function(template, vars) {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
          result = result.replace(new RegExp('{' + key + '}'), value);
        }
        return result;
      };
class SourceMapV3 {
    constructor() {
    }
}
exports.SourceMapV3 = SourceMapV3;
class Section {
    constructor() {
    }
}
exports.Section = Section;
class Offset {
    constructor() {
    }
}
exports.Offset = Offset;
class SourceMapEntry {
    constructor(lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber, name) {
        this.lineNumber = lineNumber;
        this.columnNumber = columnNumber;
        this.sourceURL = sourceURL;
        this.sourceLineNumber = sourceLineNumber;
        this.sourceColumnNumber = sourceColumnNumber;
        this.name = name;
    }
    static compare(entry1, entry2) {
        if (entry1.lineNumber !== entry2.lineNumber) {
            return entry1.lineNumber - entry2.lineNumber;
        }
        return entry1.columnNumber - entry2.columnNumber;
    }
}
exports.SourceMapEntry = SourceMapEntry;
const base64Digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64Map = new Map();
for (let i = 0; i < base64Digits.length; ++i) {
    base64Map.set(base64Digits.charAt(i), i);
}
const sourceMapToSourceList = new WeakMap();
class TextSourceMap {
    /**
     * Implements Source Map V3 model. See https://github.com/google/closure-compiler/wiki/Source-Maps
     * for format description.
     */
    constructor(compiledURL, sourceMappingURL, payload, initiator) {
        this.initiator = initiator;
        this.json = payload;
        this.compiledURLInternal = compiledURL;
        this.sourceMappingURL = sourceMappingURL;
        this.baseURL = sourceMappingURL.startsWith('data:') ? compiledURL : sourceMappingURL;
        this.mappingsInternal = null;
        this.sourceInfos = new Map();
        if (this.json.sections) {
            const sectionWithURL = Boolean(this.json.sections.find(section => Boolean(section.url)));
            if (sectionWithURL) {
                console.warn(`SourceMap "${sourceMappingURL}" contains unsupported "URL" field in one of its sections.`);
            }
        }
        this.eachSection(this.parseSources.bind(this));
    }
    compiledURL() {
        return this.compiledURLInternal;
    }
    url() {
        return this.sourceMappingURL;
    }
    sourceURLs() {
        return [...this.sourceInfos.keys()];
    }
    embeddedContentByURL(sourceURL) {
        const entry = this.sourceInfos.get(sourceURL);
        if (!entry) {
            return null;
        }
        return entry.content;
    }
    findEntry(lineNumber, columnNumber) {
        const mappings = this.mappings();
        const index = Platform.ArrayUtilities.upperBound(mappings, undefined, (unused, entry) => lineNumber - entry.lineNumber || columnNumber - entry.columnNumber);
        return index ? mappings[index - 1] : null;
    }
    sourceLineMapping(sourceURL, lineNumber, columnNumber) {
        const mappings = this.reversedMappings(sourceURL);
        const first = Platform.ArrayUtilities.lowerBound(mappings, lineNumber, lineComparator);
        const last = Platform.ArrayUtilities.upperBound(mappings, lineNumber, lineComparator);
        if (first >= mappings.length || mappings[first].sourceLineNumber !== lineNumber) {
            return null;
        }
        const columnMappings = mappings.slice(first, last);
        if (!columnMappings.length) {
            return null;
        }
        const index = Platform.ArrayUtilities.lowerBound(columnMappings, columnNumber, (columnNumber, mapping) => columnNumber - mapping.sourceColumnNumber);
        return index >= columnMappings.length ? columnMappings[columnMappings.length - 1] : columnMappings[index];
        function lineComparator(lineNumber, mapping) {
            return lineNumber - mapping.sourceLineNumber;
        }
    }
    findReverseEntries(sourceURL, lineNumber, columnNumber) {
        const mappings = this.reversedMappings(sourceURL);
        const endIndex = Platform.ArrayUtilities.upperBound(mappings, undefined, (unused, entry) => lineNumber - entry.sourceLineNumber || columnNumber - entry.sourceColumnNumber);
        let startIndex = endIndex;
        while (startIndex > 0 && mappings[startIndex - 1].sourceLineNumber === mappings[endIndex - 1].sourceLineNumber &&
            mappings[startIndex - 1].sourceColumnNumber === mappings[endIndex - 1].sourceColumnNumber) {
            --startIndex;
        }
        return mappings.slice(startIndex, endIndex);
    }
    mappings() {
        if (this.mappingsInternal === null) {
            this.mappingsInternal = [];
            this.eachSection(this.parseMap.bind(this));
            this.json = null;
        }
        return /** @type {!Array<!SourceMapEntry>} */ this.mappingsInternal;
    }
    reversedMappings(sourceURL) {
        const info = this.sourceInfos.get(sourceURL);
        if (!info) {
            return [];
        }
        const mappings = this.mappings();
        if (info.reverseMappings === null) {
            info.reverseMappings = mappings.filter(mapping => mapping.sourceURL === sourceURL).sort(sourceMappingComparator);
        }
        return info.reverseMappings;
        function sourceMappingComparator(a, b) {
            if (a.sourceLineNumber !== b.sourceLineNumber) {
                return a.sourceLineNumber - b.sourceLineNumber;
            }
            if (a.sourceColumnNumber !== b.sourceColumnNumber) {
                return a.sourceColumnNumber - b.sourceColumnNumber;
            }
            if (a.lineNumber !== b.lineNumber) {
                return a.lineNumber - b.lineNumber;
            }
            return a.columnNumber - b.columnNumber;
        }
    }
    eachSection(callback) {
        if (!this.json) {
            return;
        }
        if (!this.json.sections) {
            callback(this.json, 0, 0);
            return;
        }
        for (const section of this.json.sections) {
            callback(section.map, section.offset.line, section.offset.column);
        }
    }
    parseSources(sourceMap) {
        const sourcesList = [];
        let sourceRoot = sourceMap.sourceRoot || '';
        if (sourceRoot && !sourceRoot.endsWith('/')) {
            sourceRoot += '/';
        }
        for (let i = 0; i < sourceMap.sources.length; ++i) {
            const href = sourceRoot + sourceMap.sources[i];
            let url = '' || href;
            const source = sourceMap.sourcesContent && sourceMap.sourcesContent[i];
            if (url === this.compiledURLInternal && source) {
            }
            this.sourceInfos.set(url, new TextSourceMap.SourceInfo(source || null, null));
            sourcesList.push(url);
        }
        sourceMapToSourceList.set(sourceMap, sourcesList);
    }
    parseMap(map, lineNumber, columnNumber) {
        let sourceIndex = 0;
        let sourceLineNumber = 0;
        let sourceColumnNumber = 0;
        let nameIndex = 0;
        // TODO(crbug.com/1011811): refactor away map.
        // `sources` can be undefined if it wasn't previously
        // processed and added to the list. However, that
        // is not WAI and we should make sure that we can
        // only reach this point when we are certain
        // we have the list available.
        const sources = sourceMapToSourceList.get(map);
        const names = map.names || [];
        const stringCharIterator = new TextSourceMap.StringCharIterator(map.mappings);
        let sourceURL = sources && sources[sourceIndex];
        while (true) {
            if (stringCharIterator.peek() === ',') {
                stringCharIterator.next();
            }
            else {
                while (stringCharIterator.peek() === ';') {
                    lineNumber += 1;
                    columnNumber = 0;
                    stringCharIterator.next();
                }
                if (!stringCharIterator.hasNext()) {
                    break;
                }
            }
            columnNumber += this.decodeVLQ(stringCharIterator);
            if (!stringCharIterator.hasNext() || this.isSeparator(stringCharIterator.peek())) {
                this.mappings().push(new SourceMapEntry(lineNumber, columnNumber));
                continue;
            }
            const sourceIndexDelta = this.decodeVLQ(stringCharIterator);
            if (sourceIndexDelta) {
                sourceIndex += sourceIndexDelta;
                if (sources) {
                    sourceURL = sources[sourceIndex];
                }
            }
            sourceLineNumber += this.decodeVLQ(stringCharIterator);
            sourceColumnNumber += this.decodeVLQ(stringCharIterator);
            if (!stringCharIterator.hasNext() || this.isSeparator(stringCharIterator.peek())) {
                this.mappings().push(new SourceMapEntry(lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber));
                continue;
            }
            nameIndex += this.decodeVLQ(stringCharIterator);
            this.mappings().push(new SourceMapEntry(lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber, names[nameIndex]));
        }
        // As per spec, mappings are not necessarily sorted.
        this.mappings().sort(SourceMapEntry.compare);
    }
    isSeparator(char) {
        return char === ',' || char === ';';
    }
    decodeVLQ(stringCharIterator) {
        // Read unsigned value.
        let result = 0;
        let shift = 0;
        let digit = TextSourceMap._VLQ_CONTINUATION_MASK;
        while (digit & TextSourceMap._VLQ_CONTINUATION_MASK) {
            digit = base64Map.get(stringCharIterator.next()) || 0;
            result += (digit & TextSourceMap._VLQ_BASE_MASK) << shift;
            shift += TextSourceMap._VLQ_BASE_SHIFT;
        }
        // Fix the sign.
        const negative = result & 1;
        result >>= 1;
        return negative ? -result : result;
    }
    reverseMapTextRange(url, textRange) {
        function comparator(position, mapping) {
            if (position.lineNumber !== mapping.sourceLineNumber) {
                return position.lineNumber - mapping.sourceLineNumber;
            }
            return position.columnNumber - mapping.sourceColumnNumber;
        }
        const mappings = this.reversedMappings(url);
        if (!mappings.length) {
            return null;
        }
        const startIndex = Platform.ArrayUtilities.lowerBound(mappings, { lineNumber: textRange.startLine, columnNumber: textRange.startColumn }, comparator);
        const endIndex = Platform.ArrayUtilities.upperBound(mappings, { lineNumber: textRange.endLine, columnNumber: textRange.endColumn }, comparator);
        const startMapping = mappings[startIndex];
        const endMapping = mappings[endIndex];
        return new TextUtils.TextRange.TextRange(startMapping.lineNumber, startMapping.columnNumber, endMapping.lineNumber, endMapping.columnNumber);
    }
    mapsOrigin() {
        const mappings = this.mappings();
        if (mappings.length > 0) {
            const firstEntry = mappings[0];
            return (firstEntry === null || firstEntry === void 0 ? void 0 : firstEntry.lineNumber) === 0 || firstEntry.columnNumber === 0;
        }
        return false;
    }
}
exports.TextSourceMap = TextSourceMap;
(function (TextSourceMap) {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/naming-convention
    TextSourceMap._VLQ_BASE_SHIFT = 5;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/naming-convention
    TextSourceMap._VLQ_BASE_MASK = (1 << 5) - 1;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/naming-convention
    TextSourceMap._VLQ_CONTINUATION_MASK = 1 << 5;
    class StringCharIterator {
        constructor(string) {
            this.string = string;
            this.position = 0;
        }
        next() {
            return this.string.charAt(this.position++);
        }
        peek() {
            return this.string.charAt(this.position);
        }
        hasNext() {
            return this.position < this.string.length;
        }
    }
    TextSourceMap.StringCharIterator = StringCharIterator;
    class SourceInfo {
        constructor(content, reverseMappings) {
            this.content = content;
            this.reverseMappings = reverseMappings;
        }
    }
    TextSourceMap.SourceInfo = SourceInfo;
})(TextSourceMap = exports.TextSourceMap || (exports.TextSourceMap = {}));

module.exports = TextSourceMap;