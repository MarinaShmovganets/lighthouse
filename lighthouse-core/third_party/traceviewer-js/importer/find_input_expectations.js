/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/range_utils.js");
require("../extras/chrome/cc/input_latency_async_slice.js");
require("./proto_expectation.js");

'use strict';

global.tr.exportTo('tr.importer', function() {
  var ProtoExpectation = tr.importer.ProtoExpectation;

  var INPUT_TYPE = tr.e.cc.INPUT_EVENT_TYPE_NAMES;

  var KEYBOARD_TYPE_NAMES = [
    INPUT_TYPE.CHAR,
    INPUT_TYPE.KEY_DOWN_RAW,
    INPUT_TYPE.KEY_DOWN,
    INPUT_TYPE.KEY_UP
  ];
  var MOUSE_RESPONSE_TYPE_NAMES = [
    INPUT_TYPE.CLICK,
    INPUT_TYPE.CONTEXT_MENU
  ];
  var MOUSE_WHEEL_TYPE_NAMES = [
    INPUT_TYPE.MOUSE_WHEEL
  ];
  var MOUSE_DRAG_TYPE_NAMES = [
    INPUT_TYPE.MOUSE_DOWN,
    INPUT_TYPE.MOUSE_MOVE,
    INPUT_TYPE.MOUSE_UP
  ];
  var TAP_TYPE_NAMES = [
    INPUT_TYPE.TAP,
    INPUT_TYPE.TAP_CANCEL,
    INPUT_TYPE.TAP_DOWN
  ];
  var PINCH_TYPE_NAMES = [
    INPUT_TYPE.PINCH_BEGIN,
    INPUT_TYPE.PINCH_END,
    INPUT_TYPE.PINCH_UPDATE
  ];
  var FLING_TYPE_NAMES = [
    INPUT_TYPE.FLING_CANCEL,
    INPUT_TYPE.FLING_START
  ];
  var TOUCH_TYPE_NAMES = [
    INPUT_TYPE.TOUCH_END,
    INPUT_TYPE.TOUCH_MOVE,
    INPUT_TYPE.TOUCH_START
  ];
  var SCROLL_TYPE_NAMES = [
    INPUT_TYPE.SCROLL_BEGIN,
    INPUT_TYPE.SCROLL_END,
    INPUT_TYPE.SCROLL_UPDATE
  ];
  var ALL_HANDLED_TYPE_NAMES = [].concat(
    KEYBOARD_TYPE_NAMES,
    MOUSE_RESPONSE_TYPE_NAMES,
    MOUSE_WHEEL_TYPE_NAMES,
    MOUSE_DRAG_TYPE_NAMES,
    PINCH_TYPE_NAMES,
    TAP_TYPE_NAMES,
    FLING_TYPE_NAMES,
    TOUCH_TYPE_NAMES,
    SCROLL_TYPE_NAMES
  );

  var RENDERER_FLING_TITLE = 'InputHandlerProxy::HandleGestureFling::started';
  var PLAYBACK_EVENT_TITLE = 'VideoPlayback';

  var CSS_ANIMATION_TITLE = 'Animation';

  /**
   * If there's less than this much time between the end of one event and the
   * start of the next, then they might be merged.
   * There was not enough thought given to this value, so if you have any slight
   * reason to change it, then please do so. It might also be good to split this
   * into multiple values.
   */
  var INPUT_MERGE_THRESHOLD_MS = 200;
  var ANIMATION_MERGE_THRESHOLD_MS = 32;   // 2x 60FPS frames

  /**
   * If two MouseWheel events begin this close together, then they're an
   * Animation, not two responses.
   */
  var MOUSE_WHEEL_THRESHOLD_MS = 40;

  /**
   * If two MouseMoves are more than this far apart, then they're two Responses,
   * not Animation.
   */
  var MOUSE_MOVE_THRESHOLD_MS = 40;

  // Strings used to name IRs.
  var KEYBOARD_IR_NAME = 'Keyboard';
  var MOUSE_IR_NAME = 'Mouse';
  var MOUSEWHEEL_IR_NAME = 'MouseWheel';
  var TAP_IR_NAME = 'Tap';
  var PINCH_IR_NAME = 'Pinch';
  var FLING_IR_NAME = 'Fling';
  var TOUCH_IR_NAME = 'Touch';
  var SCROLL_IR_NAME = 'Scroll';
  var CSS_IR_NAME = 'CSS';
  var WEBGL_IR_NAME = 'WebGL';
  var VIDEO_IR_NAME = 'Video';

  // TODO(benjhayden) Find a better home for this.
  function compareEvents(x, y) {
    if (x.start !== y.start)
      return x.start - y.start;
    if (x.end !== y.end)
      return x.end - y.end;
    if (x.guid && y.guid)
      return x.guid - y.guid;
    return 0;
  }

  function forEventTypesIn(events, typeNames, cb, opt_this) {
    events.forEach(function(event) {
      if (typeNames.indexOf(event.typeName) >= 0) {
        cb.call(opt_this, event);
      }
    });
  }

  function causedFrame(event) {
    return event.associatedEvents.some(
        x => x.title === tr.model.helpers.IMPL_RENDERING_STATS);
  }

  function getSortedFrameEventsByProcess(modelHelper) {
    var frameEventsByPid = {};
    tr.b.iterItems(modelHelper.rendererHelpers, function(pid, rendererHelper) {
      frameEventsByPid[pid] = rendererHelper.getFrameEventsInRange(
          tr.model.helpers.IMPL_FRAMETIME_TYPE, modelHelper.model.bounds);
    });
    return frameEventsByPid;
  }

  function getSortedInputEvents(modelHelper) {
    var inputEvents = [];

    var browserProcess = modelHelper.browserHelper.process;
    var mainThread = browserProcess.findAtMostOneThreadNamed(
        'CrBrowserMain');
    for (var slice of mainThread.asyncSliceGroup.getDescendantEvents()) {
      if (!slice.isTopLevel)
        continue;

      if (!(slice instanceof tr.e.cc.InputLatencyAsyncSlice))
        continue;

      // TODO(beaudoin): This should never happen but it does. Investigate
      // the trace linked at in #1567 and remove that when it's fixed.
      if (isNaN(slice.start) ||
          isNaN(slice.duration) ||
          isNaN(slice.end))
        continue;

      inputEvents.push(slice);
    }

    return inputEvents.sort(compareEvents);
  }

  function findProtoExpectations(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    // This order is not important. Handlers are independent.
    var handlers = [
      handleKeyboardEvents,
      handleMouseResponseEvents,
      handleMouseWheelEvents,
      handleMouseDragEvents,
      handleTapResponseEvents,
      handlePinchEvents,
      handleFlingEvents,
      handleTouchEvents,
      handleScrollEvents,
      handleCSSAnimations,
      handleWebGLAnimations,
      handleVideoAnimations
    ];
    handlers.forEach(function(handler) {
      protoExpectations.push.apply(protoExpectations, handler(
          modelHelper, sortedInputEvents));
    });
    protoExpectations.sort(compareEvents);
    return protoExpectations;
  }

  /**
   * Every keyboard event is a Response.
   */
  function handleKeyboardEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    forEventTypesIn(sortedInputEvents, KEYBOARD_TYPE_NAMES, function(event) {
      var pe = new ProtoExpectation(
          ProtoExpectation.RESPONSE_TYPE, KEYBOARD_IR_NAME);
      pe.pushEvent(event);
      protoExpectations.push(pe);
    });
    return protoExpectations;
  }

  /**
   * Some mouse events can be translated directly into Responses.
   */
  function handleMouseResponseEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    forEventTypesIn(
        sortedInputEvents, MOUSE_RESPONSE_TYPE_NAMES, function(event) {
      var pe = new ProtoExpectation(
          ProtoExpectation.RESPONSE_TYPE, MOUSE_IR_NAME);
      pe.pushEvent(event);
      protoExpectations.push(pe);
    });
    return protoExpectations;
  }
  /**
   * MouseWheel events are caused either by a physical wheel on a physical
   * mouse, or by a touch-drag gesture on a track-pad. The physical wheel
   * causes MouseWheel events that are much more spaced out, and have no
   * chance of hitting 60fps, so they are each turned into separate Response
   * IRs. The track-pad causes MouseWheel events that are much closer
   * together, and are expected to be 60fps, so the first event in a sequence
   * is turned into a Response, and the rest are merged into an Animation.
   * NB this threshold uses the two events' start times, unlike
   * ProtoExpectation.isNear, which compares the end time of the previous event
   * with the start time of the next.
   */
  function handleMouseWheelEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    var currentPE = undefined;
    var prevEvent_ = undefined;
    forEventTypesIn(
        sortedInputEvents, MOUSE_WHEEL_TYPE_NAMES, function(event) {
      // Switch prevEvent in one place so that we can early-return later.
      var prevEvent = prevEvent_;
      prevEvent_ = event;

      if (currentPE &&
          (prevEvent.start + MOUSE_WHEEL_THRESHOLD_MS) >= event.start) {
        if (currentPE.irType === ProtoExpectation.ANIMATION_TYPE) {
          currentPE.pushEvent(event);
        } else {
          currentPE = new ProtoExpectation(ProtoExpectation.ANIMATION_TYPE,
              MOUSEWHEEL_IR_NAME);
          currentPE.pushEvent(event);
          protoExpectations.push(currentPE);
        }
        return;
      }
      currentPE = new ProtoExpectation(
          ProtoExpectation.RESPONSE_TYPE, MOUSEWHEEL_IR_NAME);
      currentPE.pushEvent(event);
      protoExpectations.push(currentPE);
    });
    return protoExpectations;
  }

  /**
   * Down events followed closely by Up events are click Responses, but the
   * Response doesn't start until the Up event.
   *
   *     RRR
   * DDD UUU
   *
   * If there are any Move events in between a Down and an Up, then the Down
   * and the first Move are a Response, then the rest of the Moves are an
   * Animation:
   *
   * RRRRRRRAAAAAAAAAAAAAAAAAAAA
   * DDD MMM MMM MMM MMM MMM UUU
   */
  function handleMouseDragEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    var currentPE = undefined;
    var mouseDownEvent = undefined;
    forEventTypesIn(
        sortedInputEvents, MOUSE_DRAG_TYPE_NAMES, function(event) {
      switch (event.typeName) {
        case INPUT_TYPE.MOUSE_DOWN:
          if (causedFrame(event)) {
            var pe = new ProtoExpectation(
                ProtoExpectation.RESPONSE_TYPE, MOUSE_IR_NAME);
            pe.pushEvent(event);
            protoExpectations.push(pe);
          } else {
            // Responses typically don't start until the mouse up event.
            // Add this MouseDown to the Response that starts at the MouseUp.
            mouseDownEvent = event;
          }
          break;

          // There may be more than 100ms between the start of the mouse down
          // and the start of the mouse up. Chrome and the web don't start to
          // respond until the mouse up. ResponseIRs start deducting comfort
          // at 100ms duration. If more than that 100ms duration is burned
          // through while waiting for the user to release the
          // mouse button, then ResponseIR will unfairly start deducting
          // comfort before Chrome even has a mouse up to respond to.
          // It is technically possible for a site to afford one response on
          // mouse down and another on mouse up, but that is an edge case. The
          // vast majority of mouse downs are not responses.

        case INPUT_TYPE.MOUSE_MOVE:
          if (!causedFrame(event)) {
            // Ignore MouseMoves that do not affect the screen. They are not
            // part of an interaction record by definition.
            var pe = new ProtoExpectation(ProtoExpectation.IGNORED_TYPE);
            pe.pushEvent(event);
            protoExpectations.push(pe);
          } else if (!currentPE ||
                      !currentPE.isNear(event, MOUSE_MOVE_THRESHOLD_MS)) {
            // The first MouseMove after a MouseDown or after a while is a
            // Response.
            currentPE = new ProtoExpectation(
                ProtoExpectation.RESPONSE_TYPE, MOUSE_IR_NAME);
            currentPE.pushEvent(event);
            if (mouseDownEvent) {
              currentPE.associatedEvents.push(mouseDownEvent);
              mouseDownEvent = undefined;
            }
            protoExpectations.push(currentPE);
          } else {
            // Merge this event into an Animation.
            if (currentPE.irType === ProtoExpectation.ANIMATION_TYPE) {
              currentPE.pushEvent(event);
            } else {
              currentPE = new ProtoExpectation(
                  ProtoExpectation.ANIMATION_TYPE, MOUSE_IR_NAME);
              currentPE.pushEvent(event);
              protoExpectations.push(currentPE);
            }
          }
          break;

        case INPUT_TYPE.MOUSE_UP:
          if (!mouseDownEvent) {
            var pe = new ProtoExpectation(
                causedFrame(event) ? ProtoExpectation.RESPONSE_TYPE :
                ProtoExpectation.IGNORED_TYPE,
                MOUSE_IR_NAME);
            pe.pushEvent(event);
            protoExpectations.push(pe);
            break;
          }

          if (currentPE) {
            currentPE.pushEvent(event);
          } else {
            currentPE = new ProtoExpectation(
                ProtoExpectation.RESPONSE_TYPE, MOUSE_IR_NAME);
            if (mouseDownEvent)
              currentPE.associatedEvents.push(mouseDownEvent);
            currentPE.pushEvent(event);
            protoExpectations.push(currentPE);
          }
          mouseDownEvent = undefined;
          currentPE = undefined;
          break;
      }
    });
    if (mouseDownEvent) {
      currentPE = new ProtoExpectation(ProtoExpectation.IGNORED_TYPE);
      currentPE.pushEvent(mouseDownEvent);
      protoExpectations.push(currentPE);
    }
    return protoExpectations;
  }

  /**
   * Solitary Tap events are simple Responses:
   *
   * RRR
   * TTT
   *
   * TapDowns are part of Responses.
   *
   * RRRRRRR
   * DDD TTT
   *
   * TapCancels are part of Responses, which seems strange. They always go
   * with scrolls, so they'll probably be merged with scroll Responses.
   * TapCancels can take a significant amount of time and account for a
   * significant amount of work, which should be grouped with the scroll IRs
   * if possible.
   *
   * RRRRRRR
   * DDD CCC
   **/
  function handleTapResponseEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    var currentPE = undefined;
    forEventTypesIn(sortedInputEvents, TAP_TYPE_NAMES, function(event) {
      switch (event.typeName) {
        case INPUT_TYPE.TAP_DOWN:
          currentPE = new ProtoExpectation(
              ProtoExpectation.RESPONSE_TYPE, TAP_IR_NAME);
          currentPE.pushEvent(event);
          protoExpectations.push(currentPE);
          break;

        case INPUT_TYPE.TAP:
          if (currentPE) {
            currentPE.pushEvent(event);
          } else {
            // Sometimes we get Tap events with no TapDown, sometimes we get
            // TapDown events. Handle both.
            currentPE = new ProtoExpectation(
                ProtoExpectation.RESPONSE_TYPE, TAP_IR_NAME);
            currentPE.pushEvent(event);
            protoExpectations.push(currentPE);
          }
          currentPE = undefined;
          break;

        case INPUT_TYPE.TAP_CANCEL:
          if (!currentPE) {
            var pe = new ProtoExpectation(ProtoExpectation.IGNORED_TYPE);
            pe.pushEvent(event);
            protoExpectations.push(pe);
            break;
          }

          if (currentPE.isNear(event, INPUT_MERGE_THRESHOLD_MS)) {
            currentPE.pushEvent(event);
          } else {
            currentPE = new ProtoExpectation(
                ProtoExpectation.RESPONSE_TYPE, TAP_IR_NAME);
            currentPE.pushEvent(event);
            protoExpectations.push(currentPE);
          }
          currentPE = undefined;
          break;
      }
    });
    return protoExpectations;
  }

  /**
   * The PinchBegin and the first PinchUpdate comprise a Response, then the
   * rest of the PinchUpdates comprise an Animation.
   *
   * RRRRRRRAAAAAAAAAAAAAAAAAAAA
   * BBB UUU UUU UUU UUU UUU EEE
   */
  function handlePinchEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    var currentPE = undefined;
    var sawFirstUpdate = false;
    var modelBounds = modelHelper.model.bounds;
    forEventTypesIn(sortedInputEvents, PINCH_TYPE_NAMES, function(event) {
      switch (event.typeName) {
        case INPUT_TYPE.PINCH_BEGIN:
          if (currentPE &&
              currentPE.isNear(event, INPUT_MERGE_THRESHOLD_MS)) {
            currentPE.pushEvent(event);
            break;
          }
          currentPE = new ProtoExpectation(
              ProtoExpectation.RESPONSE_TYPE, PINCH_IR_NAME);
          currentPE.pushEvent(event);
          currentPE.isAnimationBegin = true;
          protoExpectations.push(currentPE);
          sawFirstUpdate = false;
          break;

        case INPUT_TYPE.PINCH_UPDATE:
          // Like ScrollUpdates, the Begin and the first Update constitute a
          // Response, then the rest of the Updates constitute an Animation
          // that begins when the Response ends. If the user pauses in the
          // middle of an extended pinch gesture, then multiple Animations
          // will be created.
          if (!currentPE ||
              ((currentPE.irType === ProtoExpectation.RESPONSE_TYPE) &&
                sawFirstUpdate) ||
              !currentPE.isNear(event, INPUT_MERGE_THRESHOLD_MS)) {
            currentPE = new ProtoExpectation(
                ProtoExpectation.ANIMATION_TYPE, PINCH_IR_NAME);
            currentPE.pushEvent(event);
            protoExpectations.push(currentPE);
          } else {
            currentPE.pushEvent(event);
            sawFirstUpdate = true;
          }
          break;

        case INPUT_TYPE.PINCH_END:
          if (currentPE) {
            currentPE.pushEvent(event);
          } else {
            var pe = new ProtoExpectation(ProtoExpectation.IGNORED_TYPE);
            pe.pushEvent(event);
            protoExpectations.push(pe);
          }
          currentPE = undefined;
          break;
      }
    });
    return protoExpectations;
  }

  /**
   * Flings are defined by 3 types of events: FlingStart, FlingCancel, and the
   * renderer fling event. Flings do not begin with a Response. Flings end
   * either at the beginning of a FlingCancel, or at the end of the renderer
   * fling event.
   *
   * AAAAAAAAAAAAAAAAAAAAAAAAAA
   * SSS
   *     RRRRRRRRRRRRRRRRRRRRRR
   *
   *
   * AAAAAAAAAAA
   * SSS        CCC
   */
  function handleFlingEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    var currentPE = undefined;

    function isRendererFling(event) {
      return event.title === RENDERER_FLING_TITLE;
    }
    var browserHelper = modelHelper.browserHelper;
    var flingEvents = browserHelper.getAllAsyncSlicesMatching(
        isRendererFling);

    forEventTypesIn(sortedInputEvents, FLING_TYPE_NAMES, function(event) {
      flingEvents.push(event);
    });
    flingEvents.sort(compareEvents);

    flingEvents.forEach(function(event) {
      if (event.title === RENDERER_FLING_TITLE) {
        if (currentPE) {
          currentPE.pushEvent(event);
        } else {
          currentPE = new ProtoExpectation(
              ProtoExpectation.ANIMATION_TYPE, FLING_IR_NAME);
          currentPE.pushEvent(event);
          protoExpectations.push(currentPE);
        }
        return;
      }

      switch (event.typeName) {
        case INPUT_TYPE.FLING_START:
          if (currentPE) {
            console.error('Another FlingStart? File a bug with this trace!');
            currentPE.pushEvent(event);
          } else {
            currentPE = new ProtoExpectation(
                ProtoExpectation.ANIMATION_TYPE, FLING_IR_NAME);
            currentPE.pushEvent(event);
            // Set end to an invalid value so that it can be noticed and fixed
            // later.
            currentPE.end = 0;
            protoExpectations.push(currentPE);
          }
          break;

        case INPUT_TYPE.FLING_CANCEL:
          if (currentPE) {
            currentPE.pushEvent(event);
            // FlingCancel events start when TouchStart events start, which is
            // typically when a Response starts. FlingCancel events end when
            // chrome acknowledges them, not when they update the screen. So
            // there might be one more frame during the FlingCancel, after
            // this Animation ends. That won't affect the scoring algorithms,
            // and it will make the IRs look more correct if they don't
            // overlap unnecessarily.
            currentPE.end = event.start;
            currentPE = undefined;
          } else {
            var pe = new ProtoExpectation(ProtoExpectation.IGNORED_TYPE);
            pe.pushEvent(event);
            protoExpectations.push(pe);
          }
          break;
      }
    });
    // If there was neither a FLING_CANCEL nor a renderer fling after the
    // FLING_START, then assume that it ends at the end of the model, so set
    // the end of currentPE to the end of the model.
    if (currentPE && !currentPE.end)
      currentPE.end = modelHelper.model.bounds.max;
    return protoExpectations;
  }

  /**
   * The TouchStart and the first TouchMove comprise a Response, then the
   * rest of the TouchMoves comprise an Animation.
   *
   * RRRRRRRAAAAAAAAAAAAAAAAAAAA
   * SSS MMM MMM MMM MMM MMM EEE
   *
   * If there are no TouchMove events in between a TouchStart and a TouchEnd,
   * then it's just a Response.
   *
   * RRRRRRR
   * SSS EEE
   */
  function handleTouchEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    var currentPE = undefined;
    var sawFirstMove = false;
    forEventTypesIn(sortedInputEvents, TOUCH_TYPE_NAMES, function(event) {
      switch (event.typeName) {
        case INPUT_TYPE.TOUCH_START:
          if (currentPE) {
            // NB: currentPE will probably be merged with something from
            // handlePinchEvents(). Multiple TouchStart events without an
            // intervening TouchEnd logically implies that multiple fingers
            // are on the screen, so this is probably a pinch gesture.
            currentPE.pushEvent(event);
          } else {
            currentPE = new ProtoExpectation(
                ProtoExpectation.RESPONSE_TYPE, TOUCH_IR_NAME);
            currentPE.pushEvent(event);
            currentPE.isAnimationBegin = true;
            protoExpectations.push(currentPE);
            sawFirstMove = false;
          }
          break;

        case INPUT_TYPE.TOUCH_MOVE:
          if (!currentPE) {
            currentPE = new ProtoExpectation(
                ProtoExpectation.ANIMATION_TYPE, TOUCH_IR_NAME);
            currentPE.pushEvent(event);
            protoExpectations.push(currentPE);
            break;
          }

          // Like Scrolls and Pinches, the Response is defined to be the
          // TouchStart plus the first TouchMove, then the rest of the
          // TouchMoves constitute an Animation.
          if ((sawFirstMove &&
              (currentPE.irType === ProtoExpectation.RESPONSE_TYPE)) ||
              !currentPE.isNear(event, INPUT_MERGE_THRESHOLD_MS)) {
            // If there's already a touchmove in the currentPE or it's not
            // near event, then finish it and start a new animation.
            var prevEnd = currentPE.end;
            currentPE = new ProtoExpectation(
                ProtoExpectation.ANIMATION_TYPE, TOUCH_IR_NAME);
            currentPE.pushEvent(event);
            // It's possible for there to be a gap between TouchMoves, but
            // that doesn't mean that there should be an Idle IR there.
            currentPE.start = prevEnd;
            protoExpectations.push(currentPE);
          } else {
            currentPE.pushEvent(event);
            sawFirstMove = true;
          }
          break;

        case INPUT_TYPE.TOUCH_END:
          if (!currentPE) {
            var pe = new ProtoExpectation(ProtoExpectation.IGNORED_TYPE);
            pe.pushEvent(event);
            protoExpectations.push(pe);
            break;
          }
          if (currentPE.isNear(event, INPUT_MERGE_THRESHOLD_MS)) {
            currentPE.pushEvent(event);
          } else {
            var pe = new ProtoExpectation(ProtoExpectation.IGNORED_TYPE);
            pe.pushEvent(event);
            protoExpectations.push(pe);
          }
          currentPE = undefined;
          break;
      }
    });
    return protoExpectations;
  }

  /**
   * The first ScrollBegin and the first ScrollUpdate comprise a Response,
   * then the rest comprise an Animation.
   *
   * RRRRRRRAAAAAAAAAAAAAAAAAAAA
   * BBB UUU UUU UUU UUU UUU EEE
   */
  function handleScrollEvents(modelHelper, sortedInputEvents) {
    var protoExpectations = [];
    var currentPE = undefined;
    var sawFirstUpdate = false;
    forEventTypesIn(sortedInputEvents, SCROLL_TYPE_NAMES, function(event) {
      switch (event.typeName) {
        case INPUT_TYPE.SCROLL_BEGIN:
          // Always begin a new PE even if there already is one, unlike
          // PinchBegin.
          currentPE = new ProtoExpectation(
              ProtoExpectation.RESPONSE_TYPE, SCROLL_IR_NAME);
          currentPE.pushEvent(event);
          currentPE.isAnimationBegin = true;
          protoExpectations.push(currentPE);
          sawFirstUpdate = false;
          break;

        case INPUT_TYPE.SCROLL_UPDATE:
          if (currentPE) {
            if (currentPE.isNear(event, INPUT_MERGE_THRESHOLD_MS) &&
                ((currentPE.irType === ProtoExpectation.ANIMATION_TYPE) ||
                !sawFirstUpdate)) {
              currentPE.pushEvent(event);
              sawFirstUpdate = true;
            } else {
              currentPE = new ProtoExpectation(ProtoExpectation.ANIMATION_TYPE,
                  SCROLL_IR_NAME);
              currentPE.pushEvent(event);
              protoExpectations.push(currentPE);
            }
          } else {
             // ScrollUpdate without ScrollBegin.
            currentPE = new ProtoExpectation(
                ProtoExpectation.ANIMATION_TYPE, SCROLL_IR_NAME);
            currentPE.pushEvent(event);
            protoExpectations.push(currentPE);
          }
          break;

        case INPUT_TYPE.SCROLL_END:
          if (!currentPE) {
            console.error('ScrollEnd without ScrollUpdate? ' +
                          'File a bug with this trace!');
            var pe = new ProtoExpectation(ProtoExpectation.IGNORED_TYPE);
            pe.pushEvent(event);
            protoExpectations.push(pe);
            break;
          }
          currentPE.pushEvent(event);
          break;
      }
    });
    return protoExpectations;
  }

  /**
   * Returns proto expectations for video animation events.
   *
   * Video animations represent video playback, and are based on
   * VideoPlayback async events (going from the VideoFrameCompositor::Start
   * to VideoFrameCompositor::Stop calls)
   */
  function handleVideoAnimations(modelHelper, sortedInputEvents) {
    var events = [];
    for (var pid in modelHelper.rendererHelpers) {
      for (var asyncSlice of
          modelHelper.rendererHelpers[pid].mainThread.asyncSliceGroup.slices) {
        if (asyncSlice.title === PLAYBACK_EVENT_TITLE)
          events.push(asyncSlice);
      }
    }

    events.sort(tr.importer.compareEvents);

    var protoExpectations = [];
    for (var event of events) {
      var currentPE = new ProtoExpectation(
          ProtoExpectation.ANIMATION_TYPE, VIDEO_IR_NAME);
      currentPE.start = event.start;
      currentPE.end = event.end;
      currentPE.pushEvent(event);
      protoExpectations.push(currentPE);
    }

    return protoExpectations;
  }

  /**
   * CSS Animations are merged into AnimationExpectations when they intersect.
   */
  function handleCSSAnimations(modelHelper, sortedInputEvents) {
    // First find all the top-level CSS Animation async events.
    var animationEvents = modelHelper.browserHelper.
        getAllAsyncSlicesMatching(function(event) {
          return ((event.title === CSS_ANIMATION_TITLE) &&
                  event.isTopLevel &&
                  (event.duration > 0));
    });


    // Time ranges where animations are actually running will be collected here.
    // Each element will contain {min, max, animation}.
    var animationRanges = [];

    // This helper function will be called when a time range is found
    // during which the animation is actually running.
    function pushAnimationRange(start, end, animation) {
      var range = tr.b.Range.fromExplicitRange(start, end);
      range.animation = animation;
      animationRanges.push(range);
    }

    animationEvents.forEach(function(animation) {
      if (animation.subSlices.length === 0) {
        pushAnimationRange(animation.start, animation.end, animation);
      } else {
        // Now run a state machine over the animation's subSlices, which
        // indicate the animations running/paused/finished states, in order to
        // find ranges where the animation was actually running.
        var start = undefined;
        animation.subSlices.forEach(function(sub) {
          if ((sub.args.data.state === 'running') &&
              (start === undefined)) {
            // It's possible for the state to alternate between running and
            // pending, but the animation is still running in that case,
            // so only set start if the state is changing from one of the halted
            // states.
            start = sub.start;
          } else if ((sub.args.data.state === 'paused') ||
                     (sub.args.data.state === 'idle') ||
                     (sub.args.data.state === 'finished')) {
            if (start === undefined) {
              // An animation was already running when the trace started.
              // (Actually, it's possible that the animation was in the 'idle'
              // state when tracing started, but that should be rare, and will
              // be fixed when async events are buffered.)
              // http: //crbug.com/565627
              start = modelHelper.model.bounds.min;
            }

            pushAnimationRange(start, sub.start, animation);
            start = undefined;
          }
        });

        // An animation was still running when the
        // top-level animation event ended.
        if (start !== undefined)
          pushAnimationRange(start, animation.end, animation);
      }
    });

    // Now we have a set of time ranges when css animations were actually
    // running.
    // Leave merging intersecting animations to mergeIntersectingAnimations(),
    // after findFrameEventsForAnimations removes frame-less animations.

    return animationRanges.map(function(range) {
      var protoExpectation = new ProtoExpectation(
          ProtoExpectation.ANIMATION_TYPE, CSS_IR_NAME);
      protoExpectation.start = range.min;
      protoExpectation.end = range.max;
      protoExpectation.associatedEvents.push(range.animation);
      return protoExpectation;
    });
  }

  /**
   * Get all the events (prepareMailbox and serviceScriptedAnimations)
   * relevant to WebGL. Note that modelHelper is the helper object containing
   * the model, and mailboxEvents and animationEvents are arrays where the
   * events are being pushed into (DrawingBuffer::prepareMailbox events go
   * into mailboxEvents; PageAnimator::serviceScriptedAnimations events go
   * into animationEvents). The function does not return anything but
   * modifies mailboxEvents and animationEvents.
   */
  function findWebGLEvents(modelHelper, mailboxEvents, animationEvents) {
    for (var event of modelHelper.model.getDescendantEvents()) {
      if (event.title === 'DrawingBuffer::prepareMailbox')
        mailboxEvents.push(event);
      else if (event.title === 'PageAnimator::serviceScriptedAnimations')
        animationEvents.push(event);
    }
  }

  /**
   * Returns a list of events in mailboxEvents that have an event in
   * animationEvents close by (within ANIMATION_MERGE_THRESHOLD_MS).
   */
  function findMailboxEventsNearAnimationEvents(
      mailboxEvents, animationEvents) {
    if (animationEvents.length === 0)
      return [];

    mailboxEvents.sort(compareEvents);
    animationEvents.sort(compareEvents);
    var animationIterator = animationEvents[Symbol.iterator]();
    var animationEvent = animationIterator.next().value;

    var filteredEvents = [];

    // We iterate through the mailboxEvents. With each event, we check if
    // there is a animationEvent near it, and if so, add it to the result.
    for (var event of mailboxEvents) {
      // If the current animationEvent is too far before the mailboxEvent,
      // we advance until we get to the next animationEvent that is not too
      // far before the animationEvent.
      while (animationEvent &&
          (animationEvent.start < (
           event.start - ANIMATION_MERGE_THRESHOLD_MS)))
        animationEvent = animationIterator.next().value;

      // If there aren't any more animationEvents, then that means all the
      // remaining mailboxEvents are too far after the animationEvents, so
      // we can quit now.
      if (!animationEvent)
        break;

      // If there's a animationEvent close to the mailboxEvent, then we push
      // the current mailboxEvent onto the stack.
      if (animationEvent.start < (event.start + ANIMATION_MERGE_THRESHOLD_MS))
        filteredEvents.push(event);
    }
    return filteredEvents;
  }

  /**
   * Merge consecutive mailbox events into a ProtoExpectation. Note: Only
   * the drawingBuffer::prepareMailbox events will end up in the
   * associatedEvents. The PageAnimator::serviceScriptedAnimations events
   * will not end up in the associatedEvents.
   */
  function createProtoExpectationsFromMailboxEvents(mailboxEvents) {
    var protoExpectations = [];
    var currentPE = undefined;
    for (var event of mailboxEvents) {
      if (currentPE === undefined || !currentPE.isNear(
          event, ANIMATION_MERGE_THRESHOLD_MS)) {
        currentPE = new ProtoExpectation(
            ProtoExpectation.ANIMATION_TYPE, WEBGL_IR_NAME);
        currentPE.pushEvent(event);
        protoExpectations.push(currentPE);
      }
      else {
        currentPE.pushEvent(event);
      }
    }
    return protoExpectations;
  }

  // WebGL animations are identified by the DrawingBuffer::prepareMailbox
  // and PageAnimator::serviceScriptedAnimations events (one of each per frame)
  // and consecutive frames are merged into the same animation.
  function handleWebGLAnimations(modelHelper, sortedInputEvents) {
    // Get the prepareMailbox and scriptedAnimation events.
    var prepareMailboxEvents = [];
    var scriptedAnimationEvents = [];

    findWebGLEvents(modelHelper, prepareMailboxEvents, scriptedAnimationEvents);
    var webGLMailboxEvents = findMailboxEventsNearAnimationEvents(
        prepareMailboxEvents, scriptedAnimationEvents);

    return createProtoExpectationsFromMailboxEvents(webGLMailboxEvents);
  }


  function postProcessProtoExpectations(modelHelper, protoExpectations) {
    // protoExpectations is input only. Returns a modified set of
    // ProtoExpectations.  The order is important.
    protoExpectations = findFrameEventsForAnimations(
        modelHelper, protoExpectations);
    protoExpectations = mergeIntersectingResponses(protoExpectations);
    protoExpectations = mergeIntersectingAnimations(protoExpectations);
    protoExpectations = fixResponseAnimationStarts(protoExpectations);
    protoExpectations = fixTapResponseTouchAnimations(protoExpectations);
    return protoExpectations;
  }

  /**
   * TouchStarts happen at the same time as ScrollBegins.
   * It's easier to let multiple handlers create multiple overlapping
   * Responses and then merge them, rather than make the handlers aware of the
   * other handlers' PEs.
   *
   * For example:
   * RR
   *  RRR  -> RRRRR
   *    RR
   *
   * protoExpectations is input only.
   * Returns a modified set of ProtoExpectations.
   */
  function mergeIntersectingResponses(protoExpectations) {
    var newPEs = [];
    while (protoExpectations.length) {
      var pe = protoExpectations.shift();
      newPEs.push(pe);

      // Only consider Responses for now.
      if (pe.irType !== ProtoExpectation.RESPONSE_TYPE)
        continue;

      for (var i = 0; i < protoExpectations.length; ++i) {
        var otherPE = protoExpectations[i];

        if (otherPE.irType !== pe.irType)
          continue;

        if (!otherPE.intersects(pe))
          continue;

        // Don't merge together Responses of the same type.
        // If handleTouchEvents wanted two of its Responses to be merged, then
        // it would have made them that way to begin with.
        var typeNames = pe.associatedEvents.map(function(event) {
          return event.typeName;
        });
        if (otherPE.containsTypeNames(typeNames))
          continue;

        pe.merge(otherPE);
        protoExpectations.splice(i, 1);

        // Don't skip the next otherPE!
        --i;
      }
    }
    return newPEs;
  }

  /**
   * An animation is simply an expectation of 60fps between start and end.
   * If two animations overlap, then merge them.
   *
   * For example:
   * AA
   *  AAA  -> AAAAA
   *    AA
   *
   * protoExpectations is input only.
   * Returns a modified set of ProtoExpectations.
   */
  function mergeIntersectingAnimations(protoExpectations) {
    var newPEs = [];
    while (protoExpectations.length) {
      var pe = protoExpectations.shift();
      newPEs.push(pe);

      // Only consider Animations for now.
      if (pe.irType !== ProtoExpectation.ANIMATION_TYPE)
        continue;

      var isCSS = pe.containsSliceTitle(CSS_ANIMATION_TITLE);
      var isFling = pe.containsTypeNames([INPUT_TYPE.FLING_START]);
      var isVideo = pe.containsTypeNames([VIDEO_IR_NAME]);

      for (var i = 0; i < protoExpectations.length; ++i) {
        var otherPE = protoExpectations[i];

        if (otherPE.irType !== pe.irType)
          continue;

        // Don't merge CSS Animations with any other types.
        if (isCSS != otherPE.containsSliceTitle(CSS_ANIMATION_TITLE))
          continue;

        if (isCSS) {
          if (!pe.isNear(otherPE, ANIMATION_MERGE_THRESHOLD_MS))
            continue;
        } else if (!otherPE.intersects(pe)) {
          continue;
        }

        // Don't merge Fling Animations with any other types.
        if (isFling !== otherPE.containsTypeNames([INPUT_TYPE.FLING_START]))
          continue;

        // Don't merge Video Animations with any other types.
        if (isVideo !== otherPE.containsTypeNames([VIDEO_IR_NAME]))
          continue;

        pe.merge(otherPE);
        protoExpectations.splice(i, 1);
        // Don't skip the next otherPE!
        --i;
      }
    }
    return newPEs;
  }

  /**
   * The ends of responses frequently overlap the starts of animations.
   * Fix the animations to reflect the fact that the user can only start to
   * expect 60fps after the response.
   *
   * For example:
   * RRR   -> RRRAA
   *  AAAA
   *
   * protoExpectations is input only.
   * Returns a modified set of ProtoExpectations.
   */
  function fixResponseAnimationStarts(protoExpectations) {
    protoExpectations.forEach(function(ape) {
      // Only consider animations for now.
      if (ape.irType !== ProtoExpectation.ANIMATION_TYPE)
        return;

      protoExpectations.forEach(function(rpe) {
        // Only consider responses for now.
        if (rpe.irType !== ProtoExpectation.RESPONSE_TYPE)
          return;

        // Only consider responses that end during the animation.
        if (!ape.containsTimestampInclusive(rpe.end))
          return;

        // Ignore Responses that are entirely contained by the animation.
        if (ape.containsTimestampInclusive(rpe.start))
          return;

        // Move the animation start to the response end.
        ape.start = rpe.end;
      });
    });
    return protoExpectations;
  }

  /**
   * Merge Tap Responses that overlap Touch-only Animations.
   * https: *github.com/catapult-project/catapult/issues/1431
   */
  function fixTapResponseTouchAnimations(protoExpectations) {
    function isTapResponse(pe) {
      return (pe.irType === ProtoExpectation.RESPONSE_TYPE) &&
              pe.containsTypeNames([INPUT_TYPE.TAP]);
    }
    function isTouchAnimation(pe) {
      return (pe.irType === ProtoExpectation.ANIMATION_TYPE) &&
              pe.containsTypeNames([INPUT_TYPE.TOUCH_MOVE]) &&
              !pe.containsTypeNames([
                  INPUT_TYPE.SCROLL_UPDATE, INPUT_TYPE.PINCH_UPDATE]);
    }
    var newPEs = [];
    while (protoExpectations.length) {
      var pe = protoExpectations.shift();
      newPEs.push(pe);

      // protoExpectations are sorted by start time, and we don't know whether
      // the Tap Response or the Touch Animation will be first
      var peIsTapResponse = isTapResponse(pe);
      var peIsTouchAnimation = isTouchAnimation(pe);
      if (!peIsTapResponse && !peIsTouchAnimation)
        continue;

      for (var i = 0; i < protoExpectations.length; ++i) {
        var otherPE = protoExpectations[i];

        if (!otherPE.intersects(pe))
          continue;

        if (peIsTapResponse && !isTouchAnimation(otherPE))
          continue;

        if (peIsTouchAnimation && !isTapResponse(otherPE))
          continue;

        // pe might be the Touch Animation, but the merged ProtoExpectation
        // should be a Response.
        pe.irType = ProtoExpectation.RESPONSE_TYPE;

        pe.merge(otherPE);
        protoExpectations.splice(i, 1);
        // Don't skip the next otherPE!
        --i;
      }
    }
    return newPEs;
  }

  function findFrameEventsForAnimations(modelHelper, protoExpectations) {
    var newPEs = [];
    var frameEventsByPid = getSortedFrameEventsByProcess(modelHelper);

    for (var pe of protoExpectations) {
      if (pe.irType !== ProtoExpectation.ANIMATION_TYPE) {
        newPEs.push(pe);
        continue;
      }

      var frameEvents = [];
      // TODO(benjhayden): Use frame blame contexts here.
      for (var pid of Object.keys(modelHelper.rendererHelpers)) {
        var range = tr.b.Range.fromExplicitRange(pe.start, pe.end);
        frameEvents.push.apply(frameEvents,
            range.filterArray(frameEventsByPid[pid], e => e.start));
      }

      // If a tree falls in a forest...
      // If there were not actually any frames while the animation was
      // running, then it wasn't really an animation, now, was it?
      // Philosophy aside, the system_health Animation metrics fail hard if
      // there are no frames in an AnimationExpectation.
      // Since WebGL animations don't generate this type of frame event,
      // don't remove them if it's a WebGL animation.
      // TODO(alexandermont): Identify what the correct frame event to
      // use here is.
      if (frameEvents.length === 0 && !pe.names.has(WEBGL_IR_NAME)) {
        pe.irType = ProtoExpectation.IGNORED_TYPE;
        newPEs.push(pe);
        continue;
      }

      pe.associatedEvents.addEventSet(frameEvents);
      newPEs.push(pe);
    }

    return newPEs;
  }

  /**
   * Check that none of the handlers accidentally ignored an input event.
   */
  function checkAllInputEventsHandled(sortedInputEvents, protoExpectations) {
    var handledEvents = [];
    protoExpectations.forEach(function(protoExpectation) {
      protoExpectation.associatedEvents.forEach(function(event) {
        // Ignore CSS Animations that might have multiple active ranges.
        if ((event.title === CSS_ANIMATION_TITLE) &&
            (event.subSlices.length > 0))
          return;

        if ((handledEvents.indexOf(event) >= 0) &&
            (event.title !== tr.model.helpers.IMPL_RENDERING_STATS)) {
          console.error('double-handled event', event.typeName,
              parseInt(event.start), parseInt(event.end), protoExpectation);
          return;
        }
        handledEvents.push(event);
      });
    });

    sortedInputEvents.forEach(function(event) {
      if (handledEvents.indexOf(event) < 0) {
        console.error('UNHANDLED INPUT EVENT!',
            event.typeName, parseInt(event.start), parseInt(event.end));
      }
    });
  }

  /**
   * Find ProtoExpectations, post-process them, convert them to real IRs.
   */
  function findInputExpectations(modelHelper) {
    var sortedInputEvents = getSortedInputEvents(modelHelper);
    var protoExpectations = findProtoExpectations(
        modelHelper, sortedInputEvents);
    protoExpectations = postProcessProtoExpectations(
        modelHelper, protoExpectations);
    checkAllInputEventsHandled(sortedInputEvents, protoExpectations);

    var irs = [];
    protoExpectations.forEach(function(protoExpectation) {
      var ir = protoExpectation.createInteractionRecord(modelHelper.model);
      if (ir)
        irs.push(ir);
    });
    return irs;
  }

  return {
    findInputExpectations: findInputExpectations,
    compareEvents: compareEvents,
    CSS_ANIMATION_TITLE: CSS_ANIMATION_TITLE
  };
});
