/*
 * Copyright (C) 2012 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// ADAPTED FROM https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/common/ResourceType.js

/* eslint-disable */

/**
 * @param {string} url
 * @return {string}
 */
function extractFilename(url) {
  let index = url.lastIndexOf('/');
  const pathAndQuery = index !== -1 ? url.substr(index + 1) : url;
  index = pathAndQuery.indexOf('?');
  return index < 0 ? pathAndQuery : pathAndQuery.substr(0, index);
}

/**
 * @param {string} url
 * @return {string}
 */
function extractExtension(url) {
  const parts = extractFilename(url).split('.');
  return parts[parts.length - 1];
}

class ResourceType {
  /**
   * @param {string} name
   * @param {string} title
   * @param {string} category
   * @param {boolean} isTextType
   */
  constructor(name, title, category, isTextType) {
    this._name = name;
    this._title = title;
    this._category = {title: category};
    this._isTextType = isTextType;
  }

  /**
   * @param {?string} mimeType
   * @return {!ResourceType}
   */
  static fromMimeType(mimeType) {
    if (!mimeType)
      return ResourceType.TYPES.Other;

    if (mimeType.startsWith('text/html'))
      return ResourceType.TYPES.Document;
    if (mimeType.startsWith('text/css'))
      return ResourceType.TYPES.Stylesheet;
    if (mimeType.startsWith('image/'))
      return ResourceType.TYPES.Image;
    if (mimeType.startsWith('text/'))
      return ResourceType.TYPES.Script;

    if (mimeType.includes('font'))
      return ResourceType.TYPES.Font;
    if (mimeType.includes('script'))
      return ResourceType.TYPES.Script;
    if (mimeType.includes('octet'))
      return ResourceType.TYPES.Other;
    if (mimeType.includes('application'))
      return ResourceType.TYPES.Script;

    return ResourceType.TYPES.Other;
  }

  /**
   * @param {string} url
   * @return {?ResourceType}
   */
  static fromURL(url) {
    return ResourceType._resourceTypeByExtension.get(extractExtension(url)) || null;
  }

  /**
   * @param {string} url
   * @return {string|undefined}
   */
  static mimeFromURL(url) {
    const name = extractFilename(url);
    if (ResourceType._mimeTypeByName.has(name))
      return ResourceType._mimeTypeByName.get(name);

    const ext = extractExtension(url).toLowerCase();
    return ResourceType._mimeTypeByExtension.get(ext);
  }

  /**
   * @return {string}
   */
  name() {
    return this._name;
  }

  /**
   * @return {string}
   */
  title() {
    return this._title;
  }

  /**
   * @return {{title: string}}
   */
  category() {
    return this._category;
  }

  /**
   * @return {boolean}
   */
  isTextType() {
    return this._isTextType;
  }

  /**
   * @return {boolean}
   */
  isScript() {
    return this._name === 'script' || this._name === 'sm-script' || this._name === 'snippet';
  }

  /**
   * @return {boolean}
   */
  hasScripts() {
    return this.isScript() || this.isDocument();
  }

  /**
   * @return {boolean}
   */
  isStyleSheet() {
    return this._name === 'stylesheet' || this._name === 'sm-stylesheet';
  }

  /**
   * @return {boolean}
   */
  isDocument() {
    return this._name === 'document';
  }

  /**
   * @return {boolean}
   */
  isDocumentOrScriptOrStyleSheet() {
    return this.isDocument() || this.isScript() || this.isStyleSheet();
  }

  /**
   * @return {boolean}
   */
  isFromSourceMap() {
    return this._name.startsWith('sm-');
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    return this._name;
  }

  /**
   * @return {string}
   */
  canonicalMimeType() {
    if (this.isDocument())
      return 'text/html';
    if (this.isScript())
      return 'text/javascript';
    if (this.isStyleSheet())
      return 'text/css';
    return '';
  }
};

/**
 * Keep these in sync with WebCore::InspectorPageAgent::resourceTypeJson
 */
ResourceType.TYPES = {
  XHR: new ResourceType('xhr', 'XHR', 'XHR', true),
  Fetch: new ResourceType('fetch', 'Fetch', 'XHR', true),
  EventSource: new ResourceType('eventsource', 'EventSource', 'XHR', true),
  Script: new ResourceType('script', 'Script', 'Script', true),
  Snippet: new ResourceType('snippet', 'Snippet', 'Script', true),
  Stylesheet: new ResourceType('stylesheet', 'Stylesheet', 'Stylesheet', true),
  Image: new ResourceType('image', 'Image', 'Image', false),
  Media: new ResourceType('media', 'Media', 'Media', false),
  Font: new ResourceType('font', 'Font', 'Font', false),
  Document: new ResourceType('document', 'Document', 'Document', true),
  TextTrack: new ResourceType('texttrack', 'TextTrack', 'Other', true),
  WebSocket: new ResourceType('websocket', 'WebSocket', 'WebSocket', false),
  Other: new ResourceType('other', 'Other', 'Other', false),
  SourceMapScript: new ResourceType('sm-script', 'Script', 'Script', true),
  SourceMapStyleSheet:
      new ResourceType('sm-stylesheet', 'Stylesheet', 'Stylesheet', true),
  Manifest: new ResourceType('manifest', 'Manifest', 'Manifest', true),
  SignedExchange: new ResourceType('signed-exchange', 'SignedExchange', 'Other', false),
};


ResourceType._mimeTypeByName = new Map([
  // CoffeeScript
  ['Cakefile', 'text/x-coffeescript']
]);

ResourceType._resourceTypeByExtension = new Map([
  ['js', ResourceType.TYPES.Script],

  ['css', ResourceType.TYPES.Stylesheet], ['xsl', ResourceType.TYPES.Stylesheet],

  ['jpeg', ResourceType.TYPES.Image], ['jpg', ResourceType.TYPES.Image], ['svg', ResourceType.TYPES.Image],
  ['gif', ResourceType.TYPES.Image], ['png', ResourceType.TYPES.Image], ['ico', ResourceType.TYPES.Image],
  ['tiff', ResourceType.TYPES.Image], ['tif', ResourceType.TYPES.Image], ['bmp', ResourceType.TYPES.Image],

  ['webp', ResourceType.TYPES.Media],

  ['ttf', ResourceType.TYPES.Font], ['otf', ResourceType.TYPES.Font], ['ttc', ResourceType.TYPES.Font],
  ['woff', ResourceType.TYPES.Font]
]);

ResourceType._mimeTypeByExtension = new Map([
  // Web extensions
  ['js', 'text/javascript'], ['css', 'text/css'], ['html', 'text/html'], ['htm', 'text/html'],
  ['mjs', 'text/javascript'], ['xml', 'application/xml'], ['xsl', 'application/xml'],

  // HTML Embedded Scripts, ASP], JSP
  ['asp', 'application/x-aspx'], ['aspx', 'application/x-aspx'], ['jsp', 'application/x-jsp'],

  // C/C++
  ['c', 'text/x-c++src'], ['cc', 'text/x-c++src'], ['cpp', 'text/x-c++src'], ['h', 'text/x-c++src'],
  ['m', 'text/x-c++src'], ['mm', 'text/x-c++src'],

  // CoffeeScript
  ['coffee', 'text/x-coffeescript'],

  // Dart
  ['dart', 'text/javascript'],

  // TypeScript
  ['ts', 'text/typescript'], ['tsx', 'text/typescript-jsx'],

  // JSON
  ['json', 'application/json'], ['gyp', 'application/json'], ['gypi', 'application/json'],

  // C#
  ['cs', 'text/x-csharp'],

  // Java
  ['java', 'text/x-java'],

  // Less
  ['less', 'text/x-less'],

  // PHP
  ['php', 'text/x-php'], ['phtml', 'application/x-httpd-php'],

  // Python
  ['py', 'text/x-python'],

  // Shell
  ['sh', 'text/x-sh'],

  // SCSS
  ['scss', 'text/x-scss'],

  // Video Text Tracks.
  ['vtt', 'text/vtt'],

  // LiveScript
  ['ls', 'text/x-livescript'],

  // Markdown
  ['md', 'text/markdown'],

  // ClojureScript
  ['cljs', 'text/x-clojure'], ['cljc', 'text/x-clojure'], ['cljx', 'text/x-clojure'],

  // Stylus
  ['styl', 'text/x-styl'],

  // JSX
  ['jsx', 'text/jsx'],

  // Image
  ['jpeg', 'image/jpeg'], ['jpg', 'image/jpeg'], ['svg', 'image/svg+xml'], ['gif', 'image/gif'], ['webp', 'image/webp'],
  ['png', 'image/png'], ['ico', 'image/ico'], ['tiff', 'image/tiff'], ['tif', 'image/tif'], ['bmp', 'image/bmp'],

  // Font
  ['ttf', 'font/opentype'], ['otf', 'font/opentype'], ['ttc', 'font/opentype'], ['woff', 'application/font-woff']
]);

module.exports = ResourceType;
