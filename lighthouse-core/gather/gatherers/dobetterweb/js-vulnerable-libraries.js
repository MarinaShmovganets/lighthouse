/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Gathers a list of libraries and
 any known vulnerabilities they contain.
 */

/* global document ShadowRoot */

'use strict';

const Gatherer = require('../gatherer');
const request = require('request');

/**
 * Obtains a list of an object contain any detected JS libraries
 * and the versions they're using.
 * @return {!Object}
 */
/* istanbul ignore next */
function detectLibraries() {
  //from https://gist.github.com/tkadlec/83146d8505d7748e8944bc333c166ad3
  const npmMapper = {"GWT":{"url":"http://www.gwtproject.org/"},"Ink":{"url":"http://ink.sapo.pt/"},"Vaadin":{"url":"http://vaadin.com/home"},"Bootstrap":{"url":"http://getbootstrap.com/","npmPkgName":"bootstrap"},"Zurb":{"url":"http://foundation.zurb.com/","npmPkgName":"foundation-sites"},"Polymer":{"url":"http://www.polymer-project.org/","npmPkgName":"@polymer/polymer"},"Highcharts":{"url":"http://www.highcharts.com","npmPkgName":"highcharts"},"InfoVis":{"url":"http://philogb.github.com/jit/"},"FlotCharts":{"url":"http://www.flotcharts.org/","npmPkgName":"flot"},"Blackbird":{"url":"http://www.gscottolson.com/blackbirdjs/"},"CreateJS":{"url":"http://createjs.com/#!/CreateJS","npmPkgName":"createjs"},"Google Maps":{"url":"https://developers.google.com/maps/"},"jQuery":{"url":"http://jquery.com","npmPkgName":"jquery"},"jQuery UI":{"url":"http://jqueryui.com","npmPkgName":"jquery-ui"},"Dojo":{"url":"http://dojotoolkit.org","npmPkgName":"dojo"},"Prototype":{"url":"http://prototypejs.org"},"Scriptaculous":{"url":"http://script.aculo.us"},"MooTools":{"url":"http://mootools.net"},"Spry":{"url":"http://labs.adobe.com/technologies/spry"},"YUI 2":{"url":"http://developer.yahoo.com/yui/2/"},"YUI 3":{"url":"http://yuilibrary.com/","npmPkgName":"yui"},"Qooxdoo":{"url":"http://qooxdoo.org","npmPkgName":"qooxdoo"},"Ext JS":{"url":"http://www.sencha.com/products/extjs"},"base2":{"url":"http://code.google.com/p/base2"},"Closure Library":{"url":"https://developers.google.com/closure/library","npmPkgName":"google-closure-library"},"Rapha&euml;l":{"url":"http://dmitrybaranovskiy.github.io/raphael"},"React":{"url":"http://facebook.github.io/react/","npmPkgName":"react"},"Modernizr":{"url":"http://www.modernizr.com","npmPkgName":"modernizr"},"Processing.js":{"url":"http://processingjs.org","npmPkgName":"processing-js"},"Backbone":{"url":"http://backbonejs.org/","npmPkgName":"backbone"},"Leaflet":{"url":"http://leafletjs.com","npmPkgName":"leaflet"},"Mapbox":{"url":"http://mapbox.com","npmPkgName":"mapbox-gl"},"Lo-Dash":{"url":"http://lodash.com/","npmPkgName":"lodash"},"Underscore":{"url":"http://underscorejs.org/","npmPkgName":"underscore"},"Sammy":{"url":"http://sammyjs.org"},"Rico":{"url":"http://openrico.sourceforge.net/examples/index.html"},"MochiKit":{"url":"https://mochi.github.io/mochikit/"},"gRapha&euml;l":{"url":"http://g.raphaeljs.com"},"Glow":{"url":"http://www.bbc.co.uk/glow"},"Socket.IO":{"url":"http://socket.io","npmPkgName":"socket.io"},"Mustache":{"url":"http://mustache.github.com","npmPkgName":"mustache"},"Fabric.js":{"url":"http://fabricjs.com/","npmPkgName":"fabric"},"FuseJS":{"url":"http://kiro.me/projects/fuse.html","npmPkgName":"fuse.js"},"Tween.js":{"url":"https://github.com/sole/tween.js","npmPkgName":"tween.js"},"SproutCore":{"url":"http://www.sproutcore.com"},"Zepto.js":{"url":"http://zeptojs.com","npmPkgName":"zepto"},"three.js":{"url":"http://threejs.org/","npmPkgName":"three"},"PhiloGL":{"url":"http://www.senchalabs.org/philogl/","npmPkgName":"philogl"},"CamanJS":{"url":"http://camanjs.com/","npmPkgName":"caman"},"yepnope":{"url":"http://yepnopejs.com/"},"LABjs":{"url":"http://labjs.com/"},"Head JS":{"url":"http://headjs.com/","npmPkgName":"headjs"},"ControlJS":{"url":"http://stevesouders.com/controljs/"},"RequireJS":{"url":"http://requirejs.org/","npmPkgName":"requirejs"},"RightJS":{"url":"http://rightjs.org/"},"jQuery Tools":{"url":"http://jquerytools.github.io/"},"Pusher":{"url":"http://pusher.com/docs/pusher_js/","npmPkgName":"pusher-js"},"Paper.js":{"url":"http://paperjs.org/","npmPkgName":"paper"},"Swiffy":{"url":"http://www.google.com/doubleclick/studio/swiffy/"},"Move":{"url":"https://github.com/rsms/move","npmPkgName":"move"},"AmplifyJS":{"url":"http://amplifyjs.com/","npmPkgName":"amplifyjs"},"Popcorn.js":{"url":"http://popcornjs.org/"},"D3":{"url":"http://d3js.org","npmPkgName":"d3"},"Handlebars":{"url":"http://handlebarsjs.com/","npmPkgName":"handlebars"},"Knockout":{"url":"http://knockoutjs.com/","npmPkgName":"knockout"},"Spine":{"url":"http://spinejs.com/"},"jQuery Mobile":{"url":"http://jquerymobile.com/","npmPkgName":"jquery-mobile"},"WebFont Loader":{"url":"https://github.com/typekit/webfontloader","npmPkgName":"webfontloader"},"Angular":{"url":"https://angular.io/","npmPkgName":"@angular/core"},"AngularJS":{"url":"http://angularjs.org","npmPkgName":"angular"},"Ember.js":{"url":"http://emberjs.com/","npmPkgName":"ember-source"},"Hammer.js":{"url":"http://eightmedia.github.io/hammer.js/","npmPkgName":"hammerjs"},"Visibility.js":{"url":"https://github.com/ai/visibilityjs","npmPkgName":"visibilityjs"},"Velocity.js":{"url":"http://velocityjs.org/","npmPkgName":"velocity-animate"},"IfVisible.js":{"url":"http://serkanyersen.github.io/ifvisible.js/","npmPkgName":"ifvisible.js"},"Pixi.js":{"url":"https://github.com/GoodBoyDigital/pixi.js","npmPkgName":"pixi.js"},"DC.js":{"url":"http://dc-js.github.io/dc.js/","npmPkgName":"dc"},"Greensock JS":{"url":"https://github.com/greensock/GreenSock-JS","npmPkgName":"gsap"},"FastClick":{"url":"https://github.com/ftlabs/fastclick","npmPkgName":"fastclick"},"Isotope":{"url":"http://isotope.metafizzy.co/","npmPkgName":"isotope-layout"},"Marionette":{"url":"http://marionettejs.com/","npmPkgName":"backbone.marionette"},"Can":{"url":"http://canjs.com/","npmPkgName":"can"},"Vue":{"url":"http://vuejs.org/","npmPkgName":"vue"},"Two":{"url":"https://jonobr1.github.io/two.js","npmPkgName":"two.js"},"Brewser":{"url":"http://handcraftedldn.github.io/brewser/","npmPkgName":"brewser"},"Material Design Lite":{"url":"http://www.getmdl.io/","npmPkgName":"material-design-lite"},"Kendo UI":{"url":"https://github.com/telerik/kendo-ui-core","npmPkgName":"kendo-ui-core"},"Matter.js":{"url":"http://brm.io/matter-js/","npmPkgName":"matter-js"},"Riot":{"url":"http://riotjs.com/","npmPkgName":"riot"},"Sea.js":{"url":"http://seajs.org/","npmPkgName":"seajs"},"Moment.js":{"url":"http://momentjs.com/","npmPkgName":"moment"},"Moment Timezone":{"url":"http://momentjs.com/timezone/","npmPkgName":"moment-timezone"},"ScrollMagic":{"url":"http://scrollmagic.io/","npmPkgName":"scrollmagic"},"SWFObject":{"url":"https://github.com/swfobject/swfobject"},"FlexSlider":{"url":"https://woocommerce.com/flexslider/","npmPkgName":"flexslider"},"SPF":{"url":"https://youtube.github.io/spfjs/","npmPkgName":"spf"},"Numeral.js":{"url":"http://numeraljs.com/","npmPkgName":"numeraljs"},"boomerang.js":{"url":"https://soasta.github.io/boomerang/doc/","npmPkgName":"boomerangjs"}};
  // From https://raw.githubusercontent.com/johnmichel/Library-Detector-for-Chrome/master/library/libraries.js
  var UNKNOWN_VERSION=null;
  var lighthouseJSLibs={GWT:{icon:"gwt",url:"http://www.gwtproject.org/",test:function(win){var doc=win.document,hasHistFrame=doc.getElementById("__gwt_historyFrame"),hasGwtUid=doc.gwt_uid,hasBodyListener=doc.body.__listener,hasBodyEventBits=doc.body.__eventBits,hasModules=win.__gwt_activeModules,hasJsonP=win.__gwt_jsonp__,hasRootWinApp=win.__gwt_scriptsLoaded||win.__gwt_stylesLoaded||win.__gwt_activeModules;if(hasHistFrame||hasGwtUid||hasBodyListener||hasBodyEventBits||hasModules||hasJsonP||hasRootWinApp){var frames=doc.getElementsByTagName("iframe"),gwtVersion=UNKNOWN_VERSION;for(var n=0;n<frames.length;n++){try{var hasNegativeTabIndex=frames[n].tabIndex<0;if(hasNegativeTabIndex&&frames[n].contentWindow&&frames[n].contentWindow.$gwt_version){gwtVersion=frames[n].contentWindow.$gwt_version;break}}catch(e){}}if(gwtVersion=="0.0.999"){gwtVersion="Google Internal"}return{version:gwtVersion}}return false}},Ink:{icon:"ink",url:"http://ink.sapo.pt/",test:function(win){if(win.Ink&&win.Ink.createModule){return{version:UNKNOWN_VERSION}}return false}},Vaadin:{icon:"vaadin",url:"http://vaadin.com/home",test:function(win){if(win.vaadin&&win.vaadin.registerWidgetset){return{version:UNKNOWN_VERSION}}return false}},Bootstrap:{icon:"bootstrap",url:"http://getbootstrap.com/",test:function(win){var jQueryAvailable=win.$&&win.$.fn,RE_PREFIX_V2="\\$this\\.data\\((?:'|\")",RE_PREFIX_V3="\\$this\\.data\\((?:'|\")(?:bs\\.){1}",bootstrapComponents=["affix","alert","button","carousel","collapse","dropdown","modal","popover","scrollspy","tab","tooltip"];if(jQueryAvailable){var bootstrapVersion;bootstrapComponents.some(function(component){if(win.$.fn[component]){if(win.$.fn[component].Constructor&&win.$.fn[component].Constructor.VERSION){bootstrapVersion=win.$.fn[component].Constructor.VERSION;return true}else if(new RegExp(RE_PREFIX_V3+component).test(win.$.fn[component].toString())){bootstrapVersion=">= 3.0.0 & <= 3.1.1";return true}else if(new RegExp(RE_PREFIX_V2+component).test(win.$.fn[component].toString())){bootstrapVersion=">= 2.0.0 & <= 2.3.2";return true}}return false});if(bootstrapVersion){return{version:bootstrapVersion}}}return false}},Zurb:{icon:"zurb",url:"http://foundation.zurb.com/",test:function(win){if(win.Foundation){return{version:win.Foundation.version||UNKNOWN_VERSION}}return false}},Polymer:{icon:"polymer",url:"http://www.polymer-project.org/",test:function(win){if(win.Polymer){return{version:win.Polymer.version||UNKNOWN_VERSION}}return false}},Highcharts:{icon:"highcharts",url:"http://www.highcharts.com",test:function(win){if(win.Highcharts){return{version:win.Highcharts.version||UNKNOWN_VERSION}}return false}},InfoVis:{icon:"jit",url:"http://philogb.github.com/jit/",test:function(win){if(win.$jit){return{version:win.$jit.version||UNKNOWN_VERSION}}return false}},FlotCharts:{icon:"icon_48",url:"http://www.flotcharts.org/",test:function(win){if(win.$&&win.$.plot){return{version:win.$.plot.version||UNKNOWN_VERSION}}return false}},Blackbird:{icon:"blackbird",url:"http://www.gscottolson.com/blackbirdjs/",test:function(win){if(win.log&&win.log.warn){return{version:UNKNOWN_VERSION}}return false}},CreateJS:{icon:"createjs",url:"http://createjs.com/#!/CreateJS",test:function(win){if(win.Stage||win.Shape||win.Container){return{version:UNKNOWN_VERSION}}return false}},"Google Maps":{icon:"gmaps",url:"https://developers.google.com/maps/",test:function(win){if(win.google&&win.google.maps){return{version:win.google.maps.version||UNKNOWN_VERSION}}return false}},jQuery:{icon:"jquery",url:"http://jquery.com",test:function(win){var jq=win.jQuery||win.$||win.$jq||win.$j;if(jq&&jq.fn){return{version:jq.fn.jquery||UNKNOWN_VERSION}}return false}},"jQuery UI":{icon:"jquery_ui",url:"http://jqueryui.com",test:function(win){var jq=win.jQuery||win.$||win.$jq||win.$j;if(jq&&jq.fn&&jq.fn.jquery&&jq.ui){var plugins="accordion,datepicker,dialog,draggable,droppable,progressbar,resizable,selectable,slider,menu,grid,tabs".split(","),concat=[];for(var i=0;i<plugins.length;i++){if(jq.ui[plugins[i]])concat.push(plugins[i].substr(0,1).toUpperCase()+plugins[i].substr(1))}return{version:jq.ui.version||UNKNOWN_VERSION,details:concat.length?"Plugins used: "+concat.join(","):""}}return false}},Dojo:{icon:"dojo",url:"http://dojotoolkit.org",test:function(win){if(win.dojo){var version=win.dojo.version?win.dojo.version.toString():UNKNOWN_VERSION;return{version:version,details:"Details: "+(win.dijit?"Uses Dijit":"none")}}return false}},Prototype:{icon:"prototype",url:"http://prototypejs.org",test:function(win){if(win.Prototype){return{version:win.Prototype.Version||UNKNOWN_VERSION}}return false}},Scriptaculous:{icon:"scriptaculous",url:"http://script.aculo.us",test:function(win){if(win.Scriptaculous){return{version:win.Scriptaculous.Version||UNKNOWN_VERSION}}return false}},MooTools:{icon:"mootools",url:"http://mootools.net",test:function(win){if(win.MooTools){return{version:win.MooTools.version||UNKNOWN_VERSION}}return false}},Spry:{icon:"spry",url:"http://labs.adobe.com/technologies/spry",test:function(win){if(win.Spry&&win.Spry.Data){return{version:UNKNOWN_VERSION}}return false}},"YUI 2":{icon:"yui",url:"http://developer.yahoo.com/yui/2/",test:function(win){if(win.YAHOO){return{version:win.YAHOO.VERSION||UNKNOWN_VERSION}}return false}},"YUI 3":{icon:"yui3",url:"http://yuilibrary.com/",test:function(win){if(win.YUI&&win.YUI.Env){return{version:win.YUI.version||UNKNOWN_VERSION}}return false}},Qooxdoo:{icon:"qooxdoo",url:"http://qooxdoo.org",test:function(win){if(win.qx&&win.qx.Bootstrap){return{version:UNKNOWN_VERSION}}return false}},"Ext JS":{icon:"extjs",url:"http://www.sencha.com/products/extjs",test:function(win){if(win.Ext&&win.Ext.versions){return{version:win.Ext.versions.core.version}}else if(win.Ext){return{version:win.Ext.version||UNKNOWN_VERSION}}return false}},base2:{icon:"base2",url:"http://code.google.com/p/base2",test:function(win){if(win.base2){return{version:win.base2.version||UNKNOWN_VERSION}}return false}},"Closure Library":{icon:"closure",url:"https://developers.google.com/closure/library",test:function(win){if(win.goog&&win.goog.provide){return{version:UNKNOWN_VERSION}}return false}},"Rapha&euml;l":{icon:"raphael",url:"http://dmitrybaranovskiy.github.io/raphael",test:function(win){if(win.Raphael&&win.Raphael.circle){return{version:win.Raphael.version||UNKNOWN_VERSION}}return false}},React:{icon:"react",url:"http://facebook.github.io/react/",test:function(win){if(win.React&&win.React.createClass){return{version:win.React.version||UNKNOWN_VERSION}}if(win.__REACT_DEVTOOLS_GLOBAL_HOOK__){return{version:UNKNOWN_VERSION}}return false}},Modernizr:{icon:"modernizr",url:"http://www.modernizr.com",test:function(win){if(win.Modernizr&&win.Modernizr.addTest){return{version:win.Modernizr._version||UNKNOWN_VERSION}}return false}},"Processing.js":{icon:"processingjs",url:"http://processingjs.org",test:function(win){if(win.Processing&&win.Processing.box){return{version:Processing.version||UNKNOWN_VERSION}}return false}},Backbone:{icon:"backbone",url:"http://backbonejs.org/",test:function(win){if(win.Backbone&&win.Backbone.Model.extend){return{version:win.Backbone.VERSION||UNKNOWN_VERSION}}return false}},Leaflet:{icon:"leaflet",url:"http://leafletjs.com",test:function(win){if(win.L&&win.L.GeoJSON&&(win.L.marker||win.L.Marker)){return{version:win.L.version||win.L.VERSION||UNKNOWN_VERSION}}return false}},Mapbox:{icon:"mapbox",url:"http://mapbox.com",test:function(win){if(win.L&&win.L.mapbox&&win.L.mapbox.geocoder){return{version:win.L.mapbox.VERSION||UNKNOWN_VERSION}}return false}},"Lo-Dash":{icon:"lodash",url:"http://lodash.com/",test:function(win){var _=typeof(_=win._)=="function"&&_,chain=typeof(chain=_&&_.chain)=="function"&&chain,wrapper=(chain||_||function(){return{}})(1);if(_&&wrapper.__wrapped__){return{version:_.VERSION||UNKNOWN_VERSION}}return false}},Underscore:{icon:"underscore",url:"http://underscorejs.org/",test:function(win){if(win._&&typeof win._.tap==="function"&&!d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests["Lo-Dash"].test(win)){return{version:win._.VERSION||UNKNOWN_VERSION}}return false}},Sammy:{icon:"sammy",url:"http://sammyjs.org",test:function(win){if(win.Sammy&&win.Sammy.Application.curry){return{version:win.Sammy.VERSION||UNKNOWN_VERSION}}return false}},Rico:{icon:"rico",url:"http://openrico.sourceforge.net/examples/index.html",test:function(win){if(win.Rico){return{version:win.Rico.Version||UNKNOWN_VERSION}}return false}},MochiKit:{icon:"mochikit",url:"https://mochi.github.io/mochikit/",test:function(win){if(win.MochiKit&&win.MochiKit.Base.module){return{version:MochiKit.VERSION||UNKNOWN_VERSION}}return false}},"gRapha&euml;l":{icon:"graphael",url:"http://g.raphaeljs.com",test:function(win){if(win.Raphael&&win.Raphael.fn.g){return{version:UNKNOWN_VERSION}}return false}},Glow:{icon:"glow",url:"http://www.bbc.co.uk/glow",test:function(win){if(win.gloader){return{version:UNKNOWN_VERSION}}else if(win.glow&&win.glow.dom){return{version:win.glow.VERSION||UNKNOWN_VERSION}}else if(win.Glow){return{version:win.Glow.version||UNKNOWN_VERSION}}return false}},"Socket.IO":{icon:"socketio",url:"http://socket.io",test:function(win){if(win.io&&(win.io.sockets||win.io.Socket)){return{version:win.io.version||UNKNOWN_VERSION}}return false}},Mustache:{icon:"mustache",url:"http://mustache.github.com",test:function(win){if(win.Mustache&&win.Mustache.to_html){return{version:win.Mustache.version||UNKNOWN_VERSION}}return false}},"Fabric.js":{icon:"icon_48",url:"http://fabricjs.com/",test:function(win){if(win.fabric&&win.fabric.util){return{version:win.fabric.version||UNKNOWN_VERSION}}return false}},FuseJS:{icon:"fusejs",url:"http://kiro.me/projects/fuse.html",test:function(win){if(win.fuse){return{version:win.fuse.version||UNKNOWN_VERSION}}return false}},"Tween.js":{icon:"icon_48",url:"https://github.com/sole/tween.js",test:function(win){if(win.TWEEN&&win.TWEEN.Easing){return{version:UNKNOWN_VERSION}}return false}},SproutCore:{icon:"sproutcore",url:"http://www.sproutcore.com",test:function(win){if(win.SC&&win.SC.Application){return{version:UNKNOWN_VERSION}}return false}},"Zepto.js":{icon:"zepto",url:"http://zeptojs.com",test:function(win){if(win.Zepto&&win.Zepto.fn){return{version:UNKNOWN_VERSION}}return false}},"three.js":{icon:"icon_48",url:"http://threejs.org/",test:function(win){if(win.THREE&&win.THREE.REVISION){return{version:"r"+win.THREE.REVISION}}else if(win.THREE){return{version:UNKNOWN_VERSION}}return false}},PhiloGL:{icon:"philogl",url:"http://www.senchalabs.org/philogl/",test:function(win){if(win.PhiloGL&&win.PhiloGL.Camera){return{version:win.PhiloGL.version||UNKNOWN_VERSION}}return false}},CamanJS:{icon:"camanjs",url:"http://camanjs.com/",test:function(win){if(win.Caman&&win.Caman.version){return{version:win.Caman.version.release}}else if(win.Caman){return{version:UNKNOWN_VERSION}}return false}},yepnope:{icon:"yepnope",url:"http://yepnopejs.com/",test:function(win){if(win.yepnope){return{version:UNKNOWN_VERSION}}return false}},LABjs:{icon:"icon_48",url:"http://labjs.com/",test:function(win){if(win.$LAB){return{version:UNKNOWN_VERSION}}return false}},"Head JS":{icon:"headjs",url:"http://headjs.com/",test:function(win){if(win.head&&win.head.js){return{version:UNKNOWN_VERSION}}return false}},ControlJS:{icon:"icon_48",url:"http://stevesouders.com/controljs/",test:function(win){if(win.CJS&&win.CJS.start){return{version:UNKNOWN_VERSION}}return false}},RequireJS:{icon:"requirejs",url:"http://requirejs.org/",test:function(win){var req=win.require||win.requirejs;if(req&&(req.load||req.s&&req.s.contexts&&req.s.contexts._&&(req.s.contexts._.loaded||req.s.contexts._.load))){return{version:req.version||UNKNOWN_VERSION}}return false}},RightJS:{icon:"rightjs",url:"http://rightjs.org/",test:function(win){if(win.RightJS&&win.RightJS.isNode){return{version:win.RightJS.version||UNKNOWN_VERSION}}return false}},"jQuery Tools":{icon:"jquerytools",url:"http://jquerytools.github.io/",test:function(win){var jq=win.jQuery||win.$;if(jq&&jq.tools){return{version:jq.tools.version||UNKNOWN_VERSION}}return false}},Pusher:{icon:"pusher",url:"http://pusher.com/docs/pusher_js/",test:function(win){if(win.Pusher&&win.Pusher.Channel){return{version:win.Pusher.VERSION||UNKNOWN_VERSION}}return false}},"Paper.js":{icon:"paperjs",url:"http://paperjs.org/",test:function(win){if(win.paper&&win.paper.Point){return{version:win.paper.version||UNKNOWN_VERSION}}return false}},Swiffy:{icon:"icon_48",url:"http://www.google.com/doubleclick/studio/swiffy/",test:function(win){if(win.swiffy){return{version:UNKNOWN_VERSION}}return false}},Move:{icon:"move",url:"https://github.com/rsms/move",test:function(win){if(win.move&&win.move.compile){return{version:win.move.version()||UNKNOWN_VERSION}}return false}},AmplifyJS:{icon:"amplifyjs",url:"http://amplifyjs.com/",test:function(win){if(win.amplify&&win.amplify.publish){return{version:UNKNOWN_VERSION}}return false}},"Popcorn.js":{icon:"popcornjs",url:"http://popcornjs.org/",test:function(win){if(win.Popcorn&&win.Popcorn.Events){return{version:win.Popcorn.version||UNKNOWN_VERSION}}return false}},D3:{icon:"d3",url:"http://d3js.org",test:function(win){if(win.d3&&win.d3.select){return{version:win.d3.version||UNKNOWN_VERSION}}return false}},Handlebars:{icon:"handlebars",url:"http://handlebarsjs.com/",test:function(win){if(win.Handlebars&&win.Handlebars.compile){return{version:win.Handlebars.VERSION||UNKNOWN_VERSION}}return false}},Knockout:{icon:"knockout",url:"http://knockoutjs.com/",test:function(win){if(win.ko&&win.ko.applyBindings){return{version:win.ko.version||UNKNOWN_VERSION}}return false}},Spine:{icon:"icon_48",url:"http://spinejs.com/",test:function(win){if(win.Spine&&win.Spine.Controller){return{version:win.Spine.version||UNKNOWN_VERSION}}return false}},"jQuery Mobile":{icon:"jquery_mobile",url:"http://jquerymobile.com/",test:function(win){var jq=win.jQuery||win.$||win.$jq||win.$j;if(jq&&jq.fn&&jq.fn.jquery&&jq.mobile){return{version:jq.mobile.version||UNKNOWN_VERSION}}return false}},"WebFont Loader":{icon:"icon_48",url:"https://github.com/typekit/webfontloader",test:function(win){if(win.WebFont&&win.WebFont.load){return{version:UNKNOWN_VERSION}}return false}},Angular:{icon:"angular",url:"https://angular.io/",test:function(win){var ng=win.document.querySelector("[ng-version]");if(ng){return{version:ng.getAttribute("ng-version")||UNKNOWN_VERSION}}return false}},AngularJS:{icon:"angularjs",url:"http://angularjs.org",test:function(win){var ng=win.angular;if(ng&&ng.version&&ng.version.full){return{version:ng.version.full}}else if(ng){return{version:UNKNOWN_VERSION}}return false}},"Ember.js":{icon:"emberjs",url:"http://emberjs.com/",test:function(win){var ember=win.Ember||win.Em;if(ember&&ember.propertyDidChange){return{version:ember.VERSION||UNKNOWN_VERSION}}return false}},"Hammer.js":{icon:"hammerjs",url:"http://eightmedia.github.io/hammer.js/",test:function(win){var hammer=win.Hammer;if(hammer&&hammer.Pinch){return{version:hammer.VERSION||"&lt; 1.0.10"}}return false}},"Visibility.js":{icon:"icon_48",url:"https://github.com/ai/visibilityjs",test:function(win){var visibility=win.Visibility;if(visibility&&visibility.every){return{version:UNKNOWN_VERSION}}return false}},"Velocity.js":{icon:"icon_48",url:"http://velocityjs.org/",test:function(win){var jq=win.jQuery||win.$,velocity=jq?jq.Velocity:win.Velocity;if(velocity&&velocity.RegisterEffect&&velocity.version){return{version:velocity.version.major+"."+velocity.version.minor+"."+velocity.version.patch}}else if(velocity&&velocity.RegisterEffect){return{version:UNKNOWN_VERSION}}return false}},"IfVisible.js":{icon:"icon_48",url:"http://serkanyersen.github.io/ifvisible.js/",test:function(win){var iv=win.ifvisible;if(iv&&iv.__ceGUID==="ifvisible.object.event.identifier"){return{version:UNKNOWN_VERSION}}return false}},"Pixi.js":{icon:"pixi",url:"https://github.com/GoodBoyDigital/pixi.js",test:function(win){var px=win.PIXI;if(px&&px.WebGLRenderer&&px.VERSION){return{version:px.VERSION.replace("v","")||UNKNOWN_VERSION}}return false}},"DC.js":{icon:"icon_48",url:"http://dc-js.github.io/dc.js/",test:function(win){var dc=win.dc;if(dc&&dc.registerChart){return{version:dc.version||UNKNOWN_VERSION}}return false}},"Greensock JS":{icon:"greensock",url:"https://github.com/greensock/GreenSock-JS",test:function(win){var gs=win.TweenMax||win.TweenLite;if(gs){return{version:gs.version||UNKNOWN_VERSION}}return false}},FastClick:{icon:"fastclick",url:"https://github.com/ftlabs/fastclick",test:function(win){if(win.FastClick&&win.FastClick.notNeeded){return{version:UNKNOWN_VERSION}}return false}},Isotope:{icon:"isotope",url:"http://isotope.metafizzy.co/",test:function(win){var iso=win.Isotope||win.$!=null&&win.$.Isotope;if(iso){return{version:UNKNOWN_VERSION}}return false}},Marionette:{icon:"marionette",url:"http://marionettejs.com/",test:function(win){if(win.Marionette&&win.Marionette.Application){return{version:win.Marionette.VERSION||UNKNOWN_VERSION}}return false}},Can:{icon:"icon_48",url:"http://canjs.com/",test:function(win){if(win.can&&win.can.Construct){return{version:win.can.VERSION||UNKNOWN_VERSION}}return false}},Vue:{icon:"vue",url:"http://vuejs.org/",test:function(win){if(win.Vue&&win.Vue.nextTick){return{version:win.Vue.version||UNKNOWN_VERSION}}return false}},Two:{icon:"two",url:"https://jonobr1.github.io/two.js",test:function(win){if(win.Two&&win.Two.Utils){return{version:win.Two.Version||UNKNOWN_VERSION}}return false}},Brewser:{icon:"brewser",url:"http://handcraftedldn.github.io/brewser/",test:function(win){if(win.BREWSER&&win.BREWSER.ua){return{version:BREWSER.VERSION||UNKNOWN_VERSION}}return false}},"Material Design Lite":{icon:"mdl",url:"http://www.getmdl.io/",test:function(win){if(win.componentHandler&&win.componentHandler.upgradeElement){return{version:UNKNOWN_VERSION}}return false}},"Kendo UI":{icon:"kendoui",url:"https://github.com/telerik/kendo-ui-core",test:function(win){if(win.kendo&&win.kendo.View&&win.kendo.View.extend){return{version:win.kendo.version||UNKNOWN_VERSION}}return false}},"Matter.js":{icon:"matter-js",url:"http://brm.io/matter-js/",test:function(win){if(win.Matter&&win.Matter.Engine){return{version:UNKNOWN_VERSION}}return false}},Riot:{icon:"riot",url:"http://riotjs.com/",test:function(win){if(win.riot&&win.riot.mixin){return{version:win.riot.version||UNKNOWN_VERSION}}return false}},"Sea.js":{icon:"icon_48",url:"http://seajs.org/",test:function(win){if(win.seajs&&win.seajs.use){return{version:win.seajs.version||UNKNOWN_VERSION}}return false}},"Moment.js":{icon:"momentjs",url:"http://momentjs.com/",test:function(win){if(win.moment&&(win.moment.isMoment||win.moment.lang)){return{version:win.moment.version||UNKNOWN_VERSION}}return false}},"Moment Timezone":{icon:"momentjs",url:"http://momentjs.com/timezone/",test:function(win){if(win.moment&&win.moment.tz){return{version:win.moment.tz.version||UNKNOWN_VERSION}}return false}},ScrollMagic:{icon:"scrollmagic",url:"http://scrollmagic.io/",test:function(win){if(win.ScrollMagic&&win.ScrollMagic.Controller){return{version:ScrollMagic.version||UNKNOWN_VERSION}}return false}},SWFObject:{icon:"icon_48",url:"https://github.com/swfobject/swfobject",test:function(win){if(win.swfobject&&win.swfobject.embedSWF){return{version:win.swfobject.version||UNKNOWN_VERSION}}else if(win.deconcept&&win.deconcept.SWFObject){return{version:UNKNOWN_VERSION}}return false}},FlexSlider:{icon:"icon_48",url:"https://woocommerce.com/flexslider/",test:function(win){var jq=win.jQuery||win.$||win.$jq||win.$j;if(jq&&jq.fn&&jq.fn.jquery&&jq.flexslider){return{version:UNKNOWN_VERSION}}return false}},SPF:{icon:"icon_48",url:"https://youtube.github.io/spfjs/",test:function(win){if(win.spf&&win.spf.init){return{version:UNKNOWN_VERSION}}return false}},"Numeral.js":{icon:"icon_48",url:"http://numeraljs.com/",test:function(win){if(win.numeral&&win.isNumeral){return{version:win.numeral.version||UNKNOWN_VERSION}}return false}},"boomerang.js":{icon:"icon_48",url:"https://soasta.github.io/boomerang/doc/",test:function(win){if(win.BOOMR&&win.BOOMR.utils&&win.BOOMR.init){return{version:win.BOOMR.version||UNKNOWN_VERSION}}return false}}};


  let libraries = [];
  for (let i in lighthouseJSLibs) {
    try {
      const result = lighthouseJSLibs[i].test(window);
      if (result === false) continue;
      libraries.push({
          name: i,
          version: result.version,
          npmPkgName: npmMapper[i].npmPkgName
      });
    } catch(e) {
      console.log('Library Detector test for ' + i + ' failed:', e);
    }
  }
  return libraries;
}


class JSVulnerableLibraries extends Gatherer {
  /**
   * @param {!Object} options
   * @return {!Promise<!Array<!Object>>}
   */
  afterPass(options) {
    const expression = `(function () {
      return (${detectLibraries.toString()}());
    })()`;

    return options.driver
      .evaluateAsync(expression)
      .then(libraries => {
        // filter out any without a known npm package for passing to Snyk
        const dependencies = Object.assign(...libraries.filter(obj => {
          return obj.npmPkgName;
        }).map(record => ({
          [record.npmPkgName]: {"version": record.version}
        })));

        return new Promise((resolve, reject) => {
          // need to mimic `npm ls --json` for now
          const jsonBody = {
            'name': 'lighthouse',
            'version': '1.0',
            'dependencies': dependencies
          };

          let vulnerabilities = [];
          request.post({
            headers: {
              'content-type': 'application/json',
              'Authorization': 'token 815130d4-940b-4252-b301-5ce28d734bf7'
            },
            url: 'https://snyk.io/api/vuln/npm',
            body: JSON.stringify(jsonBody)
          }, function(err, response, body) {
            vulnerabilities = JSON.parse(body).vulnerabilities;
            resolve({vulnerabilities, libraries});
          });
        });
      })
      .then(returnedValue => {
        return returnedValue;
      });
  }
}

module.exports = JSVulnerableLibraries;
