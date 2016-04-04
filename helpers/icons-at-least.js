/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @param {number} sizePx
 * @param {!Manifest} manifestValue
 */
module.exports = function iconsAtLeast(sizePx, manifestValue) {
  const iconValues = manifestValue.icons;
  const nestedSizes = iconValues.value.map(icon => icon.value.sizes.value);
  const flattenedSizes = [].concat.apply([], nestedSizes);

  return flattenedSizes
      .filter(size => typeof size === 'string')
      .map(size => size.split(/x/i))
      .map(pairStr => [parseFloat(pairStr[0]), parseFloat(pairStr[1])])
      .filter(pair => pair[0] >= sizePx)
      .filter(pair => pair[1] >= sizePx);
};
