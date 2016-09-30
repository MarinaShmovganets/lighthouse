/**
Copyright 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./event.js");
require("./event_target.js");
require("./iteration_helpers.js");
require("./time_display_modes.js");
require("./unit_scale.js");

'use strict';

global.tr.exportTo('tr.b', function() {
  var TimeDisplayModes = tr.b.TimeDisplayModes;

  var PLUS_MINUS_SIGN = String.fromCharCode(177);

  function max(a, b) {
    if (a === undefined)
      return b;
    if (b === undefined)
      return a;
    return a.scale > b.scale ? a : b;
  }

  /** @enum */
  var ImprovementDirection = {
    DONT_CARE: 0,
    BIGGER_IS_BETTER: 1,
    SMALLER_IS_BETTER: 2
  };

  /** @constructor */
  function Unit(unitName, jsonName, basePrefix, isDelta, improvementDirection,
      formatSpec) {
    this.unitName = unitName;
    this.jsonName = jsonName;
    this.basePrefix = basePrefix;
    this.isDelta = isDelta;
    this.improvementDirection = improvementDirection;
    this.formatSpec_ = formatSpec;

    // Example: powerInWattsDelta_biggerIsBetter -> powerInWatts.
    this.baseUnit = undefined;

    // Example: energyInJoules_smallerIsBetter ->
    // energyInJoulesDelta_smallerIsBetter.
    this.correspondingDeltaUnit = undefined;
  }

  Unit.prototype = {
    asJSON: function() {
      return this.jsonName;
    },

    get unitString() {
      // TODO(benjhayden): Refactor with format() and test.
      var formatSpec = this.formatSpec_;
      if (typeof formatSpec === 'function')
        formatSpec = formatSpec();
      if (!formatSpec.unit) {
        return '';
      }

      var unitString = '';
      var unitPrefix = formatSpec.unitPrefix;
      if (unitPrefix !== undefined) {
        var selectedPrefix;
        if (unitPrefix instanceof Array) {
          selectedPrefix = unitPrefix[0];
        } else {
          selectedPrefix = unitPrefix;
        }
        unitString += selectedPrefix.symbol || '';
      }
      unitString += formatSpec.unit;

      return unitString;
    },

    format: function(value, opt_context) {
      var context = opt_context || {};
      var formatSpec = this.formatSpec_;
      if (typeof formatSpec === 'function')
        formatSpec = formatSpec();

      function resolveProperty(propertyName) {
        if (propertyName in context)
          return context[propertyName];
        else if (propertyName in formatSpec)
          return formatSpec[propertyName];
        else
          return undefined;
      }

      var signString = '';
      if (value < 0) {
        signString = '-';
        value = -value;  // Treat positive and negative values symmetrically.
      } else if (this.isDelta) {
        signString = value === 0 ? PLUS_MINUS_SIGN : '+';
      }

      var unitString = '';
      if (formatSpec.unit) {
        if (formatSpec.unitHasPrecedingSpace !== false)
          unitString += ' ';
        var unitPrefix = resolveProperty('unitPrefix');
        if (unitPrefix !== undefined) {
          var selectedPrefix;
          if (unitPrefix instanceof Array) {
            var i = 0;
            while (i < unitPrefix.length - 1 &&
                   value / unitPrefix[i + 1].value >= 1) {
              i++;
            }
            selectedPrefix = unitPrefix[i];
          } else {
            selectedPrefix = unitPrefix;
          }
          unitString += selectedPrefix.symbol || '';
          value = tr.b.convertUnit(value, this.basePrefix, selectedPrefix);
        } else {
          value = tr.b.convertUnit(value, this.basePrefix,
              tr.b.UnitScale.Metric.NONE);
        }
        unitString += formatSpec.unit;
      }

      var minimumFractionDigits = resolveProperty('minimumFractionDigits');
      var maximumFractionDigits = resolveProperty('maximumFractionDigits');

      // If the context overrides only one of the two |*FractionDigits|
      // properties and the other one is provided by the unit, we might need to
      // shift the other property so that
      // |minimumFractionDigits| <= |maximumFractionDigits|.
      if (minimumFractionDigits > maximumFractionDigits) {
        if ('minimumFractionDigits' in context &&
            !('maximumFractionDigits' in context)) {
          // Only minimumFractionDigits was overriden by context.
          maximumFractionDigits = minimumFractionDigits;
        } else if ('maximumFractionDigits' in context &&
            !('minimumFractionDigits' in context)) {
          // Only maximumFractionDigits was overriden by context.
          minimumFractionDigits = maximumFractionDigits;
        }
      }

      var numberString = value.toLocaleString(undefined, {
        minimumFractionDigits: minimumFractionDigits,
        maximumFractionDigits: maximumFractionDigits
      });

      return signString + numberString + unitString;
    }
  };

  Unit.reset = function() {
    Unit.currentTimeDisplayMode = TimeDisplayModes.ms;
  };

  Unit.timestampFromUs = function(us) {
    return tr.b.convertUnit(us, tr.b.UnitScale.Metric.MICRO,
        tr.b.UnitScale.Metric.MILLI);
  };

  Object.defineProperty(Unit, 'currentTimeDisplayMode', {
    get: function() {
      return Unit.currentTimeDisplayMode_;
    },
    // Use tr-v-ui-preferred-display-unit element instead of directly setting.
    set: function(value) {
      if (Unit.currentTimeDisplayMode_ === value)
        return;

      Unit.currentTimeDisplayMode_ = value;
      Unit.dispatchEvent(new tr.b.Event('display-mode-changed'));
    }
  });

  Unit.didPreferredTimeDisplayUnitChange = function() {
    var largest = undefined;
    var els = tr.b.findDeepElementsMatching(document.body,
        'tr-v-ui-preferred-display-unit');
    els.forEach(function(el) {
      largest = max(largest, el.preferredTimeDisplayMode);
    });

    Unit.currentDisplayUnit = largest === undefined ?
        TimeDisplayModes.ms : largest;
  };

  Unit.byName = {};
  Unit.byJSONName = {};

  Unit.fromJSON = function(object) {
    var u = Unit.byJSONName[object];
    if (u) {
      return u;
    }
    throw new Error('Unrecognized unit');
  };

  /**
   * Define all combinations of a unit with isDelta and improvementDirection
   * flags. For example, the following code:
   *
   *   Unit.define({
   *     baseUnitName: 'powerInWatts'
   *     baseJsonName: 'W'
   *     formatSpec: {
   *       // Specification of how the unit should be formatted (unit symbol,
   *       // unit prefix, fraction digits, etc), or a function returning such
   *       // a specification.
   *     }
   *   });
   *
   * generates the following six units (JSON names shown in parentheses):
   *
   *   Unit.byName.powerInWatts (W)
   *   Unit.byName.powerInWatts_smallerIsBetter (W_smallerIsBetter)
   *   Unit.byName.powerInWatts_biggerIsBetter (W_biggerIsBetter)
   *   Unit.byName.powerInWattsDelta (WDelta)
   *   Unit.byName.powerInWattsDelta_smallerIsBetter (WDelta_smallerIsBetter)
   *   Unit.byName.powerInWattsDelta_biggerIsBetter (WDelta_biggerIsBetter)
   *
   * with the appropriate flags and formatting code (including +/- prefixes
   * for deltas).
   */
  Unit.define = function(params) {
    var definedUnits = [];

    tr.b.iterItems(ImprovementDirection, function(_, improvementDirection) {
      var regularUnit =
          Unit.defineUnitVariant_(params, false, improvementDirection);
      var deltaUnit =
          Unit.defineUnitVariant_(params, true, improvementDirection);

      regularUnit.correspondingDeltaUnit = deltaUnit;
      deltaUnit.correspondingDeltaUnit = deltaUnit;
      definedUnits.push(regularUnit, deltaUnit);
    });

    var baseUnit = Unit.byName[params.baseUnitName];
    definedUnits.forEach(u => u.baseUnit = baseUnit);
  };

  Unit.nameSuffixForImprovementDirection = function(improvementDirection) {
    switch (improvementDirection) {
      case ImprovementDirection.DONT_CARE:
        return '';
      case ImprovementDirection.BIGGER_IS_BETTER:
        return '_biggerIsBetter';
      case ImprovementDirection.SMALLER_IS_BETTER:
        return '_smallerIsBetter';
      default:
        throw new Error(
            'Unknown improvement direction: ' + improvementDirection);
    }
  };

  Unit.defineUnitVariant_ = function(params, isDelta, improvementDirection) {
    var nameSuffix = isDelta ? 'Delta' : '';
    nameSuffix += Unit.nameSuffixForImprovementDirection(improvementDirection);

    var unitName = params.baseUnitName + nameSuffix;
    var jsonName = params.baseJsonName + nameSuffix;
    if (Unit.byName[unitName] !== undefined)
      throw new Error('Unit \'' + unitName + '\' already exists');
    if (Unit.byJSONName[jsonName] !== undefined)
      throw new Error('JSON unit \'' + jsonName + '\' alread exists');

    var basePrefix = params.basePrefix ?
        params.basePrefix : tr.b.UnitScale.Metric.NONE;
    var unit = new Unit(unitName, jsonName, basePrefix,
        isDelta, improvementDirection, params.formatSpec);
    Unit.byName[unitName] = unit;
    Unit.byJSONName[jsonName] = unit;

    return unit;
  };

  tr.b.EventTarget.decorate(Unit);
  Unit.reset();

  // Known display units follow.
  //////////////////////////////////////////////////////////////////////////////

  Unit.define({
    baseUnitName: 'timeDurationInMs',
    baseJsonName: 'ms',
    basePrefix: tr.b.UnitScale.Metric.MILLI,
    formatSpec: function() {
      return Unit.currentTimeDisplayMode_.formatSpec;
    }
  });

  Unit.define({
    baseUnitName: 'timeStampInMs',
    baseJsonName: 'tsMs',
    basePrefix: tr.b.UnitScale.Metric.MILLI,
    formatSpec: function() {
      return Unit.currentTimeDisplayMode_.formatSpec;
    }
  });

  Unit.define({
    baseUnitName: 'normalizedPercentage',
    baseJsonName: 'n%',
    formatSpec: {
      unit: '%',
      unitPrefix: { value: 0.01 },
      unitHasPrecedingSpace: false,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }
  });

  Unit.define({
    baseUnitName: 'sizeInBytes',
    baseJsonName: 'sizeInBytes',
    formatSpec: {
      unit: 'B',
      unitPrefix: tr.b.UnitScale.Binary.AUTO,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }
  });

  Unit.define({
    baseUnitName: 'energyInJoules',
    baseJsonName: 'J',
    formatSpec: {
      unit: 'J',
      minimumFractionDigits: 3
    }
  });

  Unit.define({
    baseUnitName: 'powerInWatts',
    baseJsonName: 'W',
    formatSpec: {
      unit: 'W',
      minimumFractionDigits: 3
    }
  });

  Unit.define({
    baseUnitName: 'unitlessNumber',
    baseJsonName: 'unitless',
    formatSpec: {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }
  });

  Unit.define({
    baseUnitName: 'count',
    baseJsonName: 'count',
    formatSpec: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }
  });

  Unit.define({
    baseUnitName: 'sigma',
    baseJsonName: 'sigma',
    formatSpec: {
      unit: String.fromCharCode(963),
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }
  });

  return {
    ImprovementDirection: ImprovementDirection,
    Unit: Unit
  };
});
