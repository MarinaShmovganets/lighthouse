"use strict";
/**
Copyright 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/base.js");

'use strict';

global.tr.exportTo('tr.model.source_info', function () {
  function SourceInfo(file, opt_line, opt_column) {
    this.file_ = file;
    this.line_ = opt_line || -1;
    this.column_ = opt_column || -1;
  }

  SourceInfo.prototype = {
    get file() {
      return this.file_;
    },

    get line() {
      return this.line_;
    },

    get column() {
      return this.column_;
    },

    get domain() {
      if (!this.file_) return undefined;
      var domain = this.file_.match(/(.*:\/\/[^:\/]*)/i);
      return domain ? domain[1] : undefined;
    },

    toString: function () {
      var str = '';

      if (this.file_) str += this.file_;
      if (this.line_ > 0) str += ':' + this.line_;
      if (this.column_ > 0) str += ':' + this.column_;
      return str;
    }
  };

  return {
    SourceInfo: SourceInfo
  };
});