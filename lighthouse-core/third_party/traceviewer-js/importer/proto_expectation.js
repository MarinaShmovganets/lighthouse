"use strict";require("../base/base.js");require("../base/range_utils.js");require("../core/auditor.js");require("../model/event_info.js");require("../model/user_model/animation_expectation.js");require("../model/user_model/response_expectation.js");'use strict';global.tr.exportTo('tr.importer',function(){function ProtoExpectation(irType,name){this.irType=irType;this.names=new Set(name?[name]:undefined);this.start=Infinity;this.end=-Infinity;this.associatedEvents=new tr.model.EventSet();this.isAnimationBegin=false;}ProtoExpectation.RESPONSE_TYPE='r';ProtoExpectation.ANIMATION_TYPE='a';ProtoExpectation.IGNORED_TYPE='ignored';ProtoExpectation.prototype={get isValid(){return this.end>this.start;},containsTypeNames:function(typeNames){return this.associatedEvents.some(x=>typeNames.indexOf(x.typeName)>=0);},containsSliceTitle:function(title){return this.associatedEvents.some(x=>title===x.title);},createInteractionRecord:function(model){if(!this.isValid){console.assert(true,'Invalid ProtoExpectation: '+this.debug()+' File a bug with this trace!');return undefined;}var initiatorTitles=[];this.names.forEach(function(name){initiatorTitles.push(name);});initiatorTitles=initiatorTitles.sort().join(',');var duration=this.end-this.start;var ir=undefined;switch(this.irType){case ProtoExpectation.RESPONSE_TYPE:ir=new tr.model.um.ResponseExpectation(model,initiatorTitles,this.start,duration,this.isAnimationBegin);break;case ProtoExpectation.ANIMATION_TYPE:ir=new tr.model.um.AnimationExpectation(model,initiatorTitles,this.start,duration);break;}if(!ir)return undefined;ir.sourceEvents.addEventSet(this.associatedEvents);function pushAssociatedEvents(event){ir.associatedEvents.push(event);if(event.associatedEvents)ir.associatedEvents.addEventSet(event.associatedEvents);}this.associatedEvents.forEach(function(event){pushAssociatedEvents(event);if(event.subSlices)event.subSlices.forEach(pushAssociatedEvents);});return ir;},merge:function(other){other.names.forEach(function(name){this.names.add(name);}.bind(this));this.associatedEvents.addEventSet(other.associatedEvents);this.start=Math.min(this.start,other.start);this.end=Math.max(this.end,other.end);if(other.isAnimationBegin)this.isAnimationBegin=true;},pushEvent:function(event){this.start=Math.min(this.start,event.start);this.end=Math.max(this.end,event.end);this.associatedEvents.push(event);},containsTimestampInclusive:function(timestamp){return this.start<=timestamp&&timestamp<=this.end;},intersects:function(other){return other.start<this.end&&other.end>this.start;},isNear:function(event,threshold){return this.end+threshold>event.start;},debug:function(){var debugString=this.irType+'(';debugString+=parseInt(this.start)+' ';debugString+=parseInt(this.end);this.associatedEvents.forEach(function(event){debugString+=' '+event.typeName;});return debugString+')';}};return{ProtoExpectation:ProtoExpectation};});