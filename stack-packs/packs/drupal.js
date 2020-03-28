/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/* eslint-disable max-len */

'use strict';

const i18n = require('../../lighthouse-core/lib/i18n/i18n.js');

const drupalIcon = `data:image/svg+xml,%3Csvg viewBox="0 0 681.167 778.583" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath style="fill:%2300598E" d="M510.167 144.833c-39.75-24.75-77.25-34.5-114.75-59.25c-23.25-15.75-55.5-53.25-82.5-85.5c-5.25 51.75-21 72.75-39 87.75c-38.25 30-62.25 39-95.25 57c-27.75 14.25-178.5 104.25-178.5 297.75s162.75 336 343.5 336s337.5-131.25 337.5-330S534.167 159.833 510.167 144.833z" /%3E%3Cpath style="fill:%23FFF" d="M449.25 610.5c12 0 24.75 0.75 33.75 6.75s14.25 19.5 17.25 27s0 12-6 15c-5.25 3-6 1.5-11.25-8.25s-9.75-19.5-36-19.5s-34.5 9-47.25 19.5s-17.25 14.25-21.75 8.25s-3-12 5.25-19.5s21.75-19.5 34.5-24.75S437.25 610.5 449.25 610.5L449.25 610.5z" /%3E%3Cpath style="fill:%23FFF" d="M324.75 696c15 12 37.5 21.75 85.5 21.75S492 704.25 507 693c6.75-5.25 9.75-0.75 10.5 2.25s2.25 7.5-3 12.75c-3.75 3.75-38.25 27.75-78.75 31.5s-95.25 6-128.25-24c-5.25-5.25-3.75-12.75 0-15.75s6.75-5.25 11.25-5.25S322.5 694.5 324.75 696L324.75 696z" /%3E%3Cpath style="fill:%230073BA" d="M141 639c57-0.75 67.5-10.5 117.75-33c271.5-121.5 321.75-232.5 331.5-258s24-66.75 9-112.5c-2.896-8.832-5.006-15.924-6.53-21.63c-36.079-40.343-71.898-62.357-82.72-69.12c-39-24.75-77.25-34.5-114.75-59.25c-23.25-15-55.5-53.25-82.5-85.5c-5.25 51.75-20.25 73.5-39 87.75c-38.25 30-62.25 39-95.25 57C150.75 159.75 0 249 0 442.5c0 61.78 16.593 118.361 45.063 166.766L52.5 609C68.25 623.25 93 639.75 141 639z" /%3E%3Cpath style="fill:%23004975" d="M510 144.75c-39-24.75-77.25-34.5-114.75-59.25c-23.25-15-55.5-53.25-82.5-85.5c-5.25 51.75-20.25 73.5-39 87.75c-38.25 30-62.25 39-95.25 57C150.75 159.75 0 249 0 442.5c0 61.78 16.593 118.361 45.063 166.766C105.763 712.467 220.46 778.5 343.5 778.5c180.75 0 337.5-131.25 337.5-330c0-109.146-44.332-185.488-88.28-234.63C556.641 173.527 520.82 151.513 510 144.75z M601.164 232.547c49.242 61.564 74.211 134.221 74.211 215.953c0 47.428-9.033 92.23-26.849 133.165c-16.9 38.831-41.236 73.233-72.333 102.254c-61.47 57.364-144.107 88.956-232.693 88.956c-43.826 0-86.832-8.371-127.824-24.882c-40.263-16.217-76.547-39.438-107.843-69.02C41.923 616.678 5.625 532.696 5.625 442.5c0-80.336 26.076-151.72 77.503-212.167c39.289-46.18 81.655-71.774 98.047-80.634c7.958-4.341 15.423-8.172 22.643-11.877c22.63-11.615 44.005-22.586 73.404-45.645c15.677-11.914 32.377-30.785 39.489-78.702c24.774 29.466 53.522 62.579 75.49 76.752c19.5 12.87 39.501 21.888 58.844 30.61c18.298 8.25 37.219 16.781 55.942 28.663c0.031 0.021 0.702 0.438 0.702 0.438C562.421 184.11 591.581 220.566 601.164 232.547z" /%3E%3Cpath style="fill:%2393C5E4" d="M316.5 15c10.5 30.75 9 46.5 9 53.25S321.75 93 309.75 102c-5.25 3.75-6.75 6.75-6.75 7.5c0 3 6.75 5.25 6.75 12c0 8.25-3.75 24.75-43.5 64.5s-96.75 75-141 96.75S60 303 54 292.5s2.25-33.75 30-64.5s115.5-75 115.5-75L309 76.5l6-29.25" /%3E%3Cpath style="fill:%23FFF" d="M316.5 14.25c-6.75 49.5-21.75 64.5-42 80.25c-33.75 25.5-66.75 41.25-74.25 45c-19.5 9.75-90 48.75-126.75 105c-11.25 17.25 0 24 2.25 25.5s27.75 4.5 82.5-28.5S237 189 267.75 156.75c16.5-17.25 18.75-27 18.75-31.5c0-5.25-3.75-7.5-9.75-9c-3-0.75-3.75-2.25 0-4.5S296.25 102 300 99s21.75-15 22.5-34.5S321.75 31.5 316.5 14.25L316.5 14.25z" /%3E%3Cpath style="fill:%23FFF" d="M147.75 559.5c0.75-58.5 55.5-113.25 124.5-114c87.75-0.75 148.5 87 192.75 86.25c37.5-0.75 109.5-74.25 144.75-74.25c37.5 0 48 39 48 62.25s-7.5 65.25-25.5 91.5s-29.25 36-50.25 34.5c-27-2.25-81-86.25-115.5-87.75c-43.5-1.5-138 90.75-212.25 90.75c-45 0-58.5-6.75-73.5-16.5C158.25 616.5 147 592.5 147.75 559.5L147.75 559.5z" /%3E%3Cpath style="fill:none" d="M599.25 235.5c15 45.75 0.75 87-9 112.5s-60 136.5-331.5 258C208.5 628.5 198 638.25 141 639c-48 0.75-72.75-15.75-88.5-30l-7.437 0.266C105.763 712.467 220.46 778.5 343.5 778.5c180.75 0 337.5-131.25 337.5-330c0-109.146-44.332-185.488-88.28-234.63C594.244 219.576 596.354 226.668 599.25 235.5z" /%3E%3C/svg%3E`;

const UIStrings = {
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by removing unused CSS, in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unused_css_rules: 'Consider removing unused CSS rules and only attach the needed Drupal libraries to the relevant page or component in a page. See the [Drupal documentation link](https://www.drupal.org/docs/8/creating-custom-modules/adding-stylesheets-css-and-javascript-js-to-a-drupal-8-module#library) for details. To identify attached libraries that are adding extraneous CSS, try running [code coverage](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) in Chrome DevTools. You can identify the theme/module responsible from the URL of the stylesheet when CSS aggregation is disabled in your Drupal site. Look out for themes/modules that have many stylesheets in the list which have a lot of red in code coverage. A theme/module should only enqueue a stylesheet if it is actually used on the page.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve image loading by using webp in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_webp_images: 'Consider using a module such as [WebP for Drupal](https://www.drupal.org/project/webp) that will automatically generate a WebP version of your uploaded images to optimize loading times.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by lazy loading images that are initially offscreen in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  offscreen_images: 'Install a Drupal module that can leverage JavaScript or [Intersection Observer API](https://developers.google.com/web/updates/2016/04/intersectionobserver) lazy loading of images such as [Blazy](https://www.drupal.org/project/blazy). Such modules provide the ability to defer any offscreen images to improve performance.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve site loading performance by reducing the total bytes delivered by their page in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  total_byte_weight: 'Consider using [Responsive Image Styles](https://www.drupal.org/docs/8/mobile-guide/responsive-images-in-drupal-8) to reduce the size of images loaded in your page. If you are using Views to show multiple content items in a page, consider implementing pagination to limit the number of content items shown on a given page.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by reducing the amount of render blocking resources present on their page, in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  render_blocking_resources: 'Consider using the [Advanced CSS/JS Aggregation](https://www.drupal.org/project/advagg) module to inline critical CSS or potentially load assets asynchronously via JavaScript. Beware that optimizations provided by this module may break your site, so you will likely need to make code changes.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by minifying their CSS files in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unminified_css: 'Ensure you have enabled "Aggregate CSS files" in the "Administration » Configuration » Development" page. You can also use the [Advanced CSS/JS Aggregation](https://www.drupal.org/project/advagg) module to speed up your site by concatenating, minifying, and compressing your styles.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by minifying their Javascript files in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unminified_javascript: 'Ensure you have enabled "Aggregate JavaScript files" in the "Administration » Configuration » Development" page. You can also use the [Advanced CSS/JS Aggregation](https://www.drupal.org/project/advagg) module to speed up your site by concatenating, minifying, and compressing your JavaScript assets.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by encoding animated images as video, in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  efficient_animated_content: 'Consider uploading your GIF to a service which will make it available to embed as an HTML5 video.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by removing unused Javascript files in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unused_javascript: 'Consider removing unused JavaScipt assets and only attach the needed Drupal libraries to the relevant page or component in a page. See the [Drupal documentation link](https://www.drupal.org/docs/8/creating-custom-modules/adding-stylesheets-css-and-javascript-js-to-a-drupal-8-module#library) for details. To identify attached libraries that are adding extraneous JavaScript, try running [code coverage](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) in Chrome DevTools. You can identify the theme/module responsible from the URL of the script when JavaScript aggregation is disabled in your Drupal site. Look out for themes/modules that have many scripts in the list which have a lot of red in code coverage. A theme/module should only enqueue a script if it is actually used on the page.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve their site by enabling long caching in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_long_cache_ttl: 'Set the "Browser and proxy cache maximum age" in the "Administration » Configuration » Development" page. Read about [Drupal cache and optimizing for perfromance](https://www.drupal.org/docs/7/managing-site-performance-and-scalability/caching-to-improve-performance/caching-overview#s-drupal-performance-resources).',
  /** Additional description of a Lighthouse audit that tells the user how they can improve site performance by optimizing images, in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_optimized_images: 'Consider using [Responsive Image Styles](https://www.drupal.org/docs/8/mobile-guide/responsive-images-in-drupal-8) and [ImageAPI Optimize](https://www.drupal.org/project/imageapi_optimize) to reduce the size of images while retaining quality.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance via enabling text compression in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_text_compression: 'You can enable text compression in your web server configuration.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by using responsive images in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_responsive_images: 'Ensure that you are using the native [Responsive Image Styles](https://www.drupal.org/docs/8/mobile-guide/responsive-images-in-drupal-8) provided from Drupal (available in Drupal 8 and above). Use the Responsive Image Styles when rendering image fields through view modes, views, or images uploaded through the WYSIWYG editor.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve the time to first byte speed metric, in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  time_to_first_byte: 'Themes, modules, and server specifications all contribute to server response time. Consider finding a more optimized theme, carefully selecting an optimization module, and/or upgrading your server. Your hosting servers should make use of PHP opcode caching, memory-caching to reduce database query times such as Redis or Memcached, as well as optimized application logic to prepare pages faster.',
  /** Additional description of a Lighthouse audit that tells the user how they can add preconnect or dns-prefetch resource hints, in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_rel_preconnect: 'Preconnect or dns-prefetch resource hints can be added by enabled through the [Advanced CSS/JS Aggregation](https://www.drupal.org/project/advagg) module. You can also consider [installing a module](https://www.drupal.org/search/site/preconnect?f%5B0%5D=ss_meta_type%3Amodule) that provides facilities for user agent resource hints.',
  /** Additional description of a Lighthouse audit that tells the user how they can specify font-display, in the context of the Drupal CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  font_display: 'Specify `@font-display` when defining custom fonts in your theme.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

module.exports = {
  id: 'drupal',
  iconDataURL: drupalIcon,
  title: 'Drupal',
  descriptions: {
    'unused-css-rules': str_(UIStrings.unused_css_rules),
    'uses-webp-images': str_(UIStrings.uses_webp_images),
    'offscreen-images': str_(UIStrings.offscreen_images),
    'total-byte-weight': str_(UIStrings.total_byte_weight),
    'render-blocking-resources': str_(UIStrings.render_blocking_resources),
    'unminified-css': str_(UIStrings.unminified_css),
    'unminified-javascript': str_(UIStrings.unminified_javascript),
    'efficient-animated-content': str_(UIStrings.efficient_animated_content),
    'unused-javascript': str_(UIStrings.unused_javascript),
    'uses-long-cache-ttl': str_(UIStrings.uses_long_cache_ttl),
    'uses-optimized-images': str_(UIStrings.uses_optimized_images),
    'uses-text-compression': str_(UIStrings.uses_text_compression),
    'uses-responsive-images': str_(UIStrings.uses_responsive_images),
    'time-to-first-byte': str_(UIStrings.time_to_first_byte),
    'uses-rel-preconnect':  str_(UIStrings.uses_rel_preconnect),
    'font-display':  str_(UIStrings.font_display),
  },
};
module.exports.UIStrings = UIStrings;
