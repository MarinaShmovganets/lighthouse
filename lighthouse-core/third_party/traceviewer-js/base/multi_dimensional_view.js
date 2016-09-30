"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./base.js");

'use strict';

/**
 * @fileoverview Multi-dimensional view data structure.
 *
 * A multi-dimensional view provides a hierarchical representation of a
 * collection of multi-dimensional paths with associated scalar values. Unlike
 * separate single-dimensional views (e.g. one tree for each dimension),
 * multi-dimensional views facilitate aggregation over combinations of
 * substrings of the path dimensions (rather than just substrings of a single
 * path dimension).
 *
 * Every view consists of multi-dimensional nodes (see MultiDimensionalViewNode
 * for more details). This file also provides a builder class for constructing
 * top-down and bottom-up representations of arbitrary collections of
 * multi-dimensional paths (see MultiDimensionalViewBuilder for more details).
 *
 * Example: Given the following collection of two dimensional paths:
 *
 *   <===================== Path =====================>   <== Total values ===>
 *    <------- dimension 0 ------->  <- dimension 1 ->    <- v 0 ->  <- v 1 ->
 *   [['Run()', 'Exec()', 'Call()'], ['Obj', 'View']  ]: [1        , 3
 *   [['Run()', 'Exec()', 'Call()'], ['Obj', 'Widget']]: [2        , 5
 *   [['Run()', 'Exec()', 'Load()'], ['Obj']          ]: [4        , 11
 *   [['Run()', 'Exec()']          , ['int']          ]: [8        , 7
 *   [['Run()']                    , ['Obj', 'Window']]: [16       , 0
 *   [['Stop()']                   , ['Obj']          ]: [32       , 13
 *
 * a multi-dimensional view provides a recursive breakdown of the aggregated
 * values, e.g. (total values shown in square brackets):
 *
 *   (root): [63, 39]
 *     |
 *     | break down by 0th dimension
 *     v
 *   Run():  [31, 26]
 *     |
 *     | break down by 0th dimension
 *     v
 *   Exec(): [15, 26]
 *     |
 *     | break down by 1st dimension
 *     v
 *   Obj:    [7, 19]
 *     |
 *     | break down by 0th dimension again
 *     v
 *   Call(): [3, 8]
 *     |
 *     | break down by 1st dimension again
 *     v
 *   View:   [1, 3]
 *
 * Observe that the recursive breakdown above is over both dimensions.
 * Furthermore, the underlying single-dimension paths (Run() -> Exec() -> Call()
 * and Obj -> View) can be arbitrarily interleaved in the breakdown.
 */
global.tr.exportTo('tr.b', function() {

  /**
   * Node of a multi-dimensional view.
   *
   * The structure of a view is encoded in the nodes using links to their
   * children wrt each dimension. The diagram below shows how the nodes
   * corresponding to the following four two-dimensional view paths:
   *
   *   1. [['A', 'B'], ['1', '2']]
   *   2. [['A', 'C'], ['1', '2']]
   *   3. [['A', 'B'], ['1', '3']]
   *   4. [['A', 'C'], ['1', '3']]
   *
   * can be reached from the root of a two-dimensional view using these links
   * ('*' stands for undefined):
   *
   *                       +---------------------+
   *                       | title: [*,*] (root) |
   *                       +---------------------+
   *                     children wrt    children wrt
   *                    0th dimension    1st dimension
   *                              |        :
   *              _______A________|        :........1.........
   *             |                                           :
   *             v                                           v
   *         +--------------+                     +--------------+
   *         | title: [A,*] |                     | title: [*,1] |
   *         +--------------+                     +--------------+
   *    children wrt   children wrt         children wrt   children wrt
   *   0th dimension   1st dimension       0th dimension   1st dimension
   *           | |       :.....1......    _____A_____|       : :
   *        _B_| |__C__              :   |             ...2..: :.3..
   *       |           |             :   |             :           :
   *       v           v             v   v             v           v
   *   +-------+   +-------+       +-------+       +-------+   +-------+
   *   | [B,*] |   | [C,*] |       | [A,1] |       | [*,2] |   | [*,3] |
   *   +-------+   +-------+       +-------+       +-------+   +-------+
   *       :        ___:_____B______| | : :......3.....|....       |
   *       :.1..   |   :.1..    __C___| :...2...    _A_|   :    _A_|
   *           :   |       :   |               :   |       :   |
   *           v   v       v   v               v   v       v   v
   *         +-------+   +-------+           +-------+   +-------+
   *         | [B,1] |   | [C,1] |           | [A,2] |   | [A,3] |
   *         +-------+   +-------+           +-------+   +-------+
   *           :   :       :   :.......3.......||..........   ||
   *           :   :..3....:................   BC         :   BC
   *           :     ______:_______________:___||         :   ||
   *           2    |      2        _______:____|   ______:___||
   *           :    |      :       |       :       |      :    |
   *           v    v      v       v       v       v      v    v
   *       +----------+   +----------+   +----------+   +----------+
   *       |  [B,2]   |   |  [C,2]   |   |  [B,3]   |   |  [C,3]   |
   *       | (node 1) |   | (node 2) |   | (node 3) |   | (node 4) |
   *       +----------+   +----------+   +----------+   +----------+
   *
   * The self/total values of a node represents the aggregated values of all
   * paths (in the collection from which the view was built) matching the node
   * excluding/including the node's descendants.
   *
   * Terminology examples:
   *
   *   - Children of [A,*] wrt 0th dimension: [B,*], [C,*]
   *   - Children of [A,*] (wrt all dimensions): [B,*], [C,*], [A,1]
   *   - Descendants of [A,*] wrt 1st dimension: [A,1], [A,2], [A,3]
   *   - Single-dimensional descendants of [A,*]: [A,1], [A,2], [A,3], [B,*],
   *     [C,*]
   *   - Descendants of [A,*] (wrt all dimensions): [A,1], [A,2], [A,3], [B,*],
   *     [C,*], [B,1], [C,1], [B,2], [C,2], [B,3], [C,3]
   *
   * @{constructor}
   */
  function MultiDimensionalViewNode(title, valueCount) {
    // List of titles of this node wrt each dimension.
    this.title = title;

    // Map from child name to child node for each dimension.
    var dimensions = title.length;
    this.children = new Array(dimensions);
    for (var i = 0; i < dimensions; i++)
      this.children[i] = new Map();

    // For each value index (from 0 to |valueCount| - 1), we store the self and
    // total values together with a Boolean flag whether the value is only a
    // lower bound (i.e. aggregated from children rather than provided
    // directly).
    this.values = new Array(valueCount);
    for (var v = 0; v < valueCount; v++)
      this.values[v] = { self: 0, total: 0, totalState: NOT_PROVIDED };
  }

  /**
   * States of total values stored in multi-dimensional view nodes.
   *
   * @enum
   */
  MultiDimensionalViewNode.TotalState = {
    // Neither total nor self value was provided for either the node or any of
    // its descendants.
    NOT_PROVIDED: 0,

    // The total value was NOT provided for the node, but the self value was
    // provided for the node or the total or self value was provided for at
    // least one of its descendants.
    LOWER_BOUND: 1,

    // The total value was provided for the node.
    EXACT: 2
  };
  // Cache the total value states to avoid repeated object field lookups.
  var NOT_PROVIDED = MultiDimensionalViewNode.TotalState.NOT_PROVIDED;
  var LOWER_BOUND = MultiDimensionalViewNode.TotalState.LOWER_BOUND;
  var EXACT = MultiDimensionalViewNode.TotalState.EXACT;

  MultiDimensionalViewNode.prototype = {
    /** Duck type <tr-ui-b-table> rows. */
    get subRows() {
      return tr.b.mapValues(this.children[0]);
    }
  };

  /**
   * Builder for multi-dimensional views.
   *
   * Given a collection of multi-dimensional paths, a builder can be used to
   * construct the following three representations of the paths:
   *
   *   1. Top-down tree view
   *      A multi-dimensional path in the view corresponds to all paths in the
   *      collection that have it as their prefix.
   *
   *   2. Top-down heavy view
   *      A multi-dimensional path in the view corresponds to all paths in the
   *      collection that have it as their substring
   *
   *   3. Bottom-up heavy view
   *      A multi-dimensional path in the view corresponds to all paths in the
   *      collection that have it as their substring reversed.
   *
   * For example, the following collection of 2-dimensional paths (with single
   * values):
   *
   *                  2-dimensional path                | self
   *    Time (0th dimension) | Activity (1st dimension) | value
   *   ========================+========================+=======
   *    Saturday             | Cooking                  |   1 h
   *    Saturday             | Sports -> Football       |   2 h
   *    Sunday               | Sports -> Basketball     |   3 h
   *
   * gives rise to the following top-down tree view, which aggregates the
   * scalar values over prefixes of the given paths:
   *
   *                              +---------+
   *                              |    *    |
   *                              |    *    |
   *                              | self=0  |
   *                              | total=6 |
   *                              +---------+
   *                                | : | :
   *         _________Cooking_______| : | :............Sunday............
   *        |                         : |                               :
   *        |            ...Saturday..: |_Sports_                       :
   *        |            :                       |                      :
   *        v            v                       v                      v
   *   +---------+  +---------+            +---------+             +---------+
   *   |    *    |  |   Sat   |            |    *    |             |   Sun   |
   *   | Cooking |  |    *    |            | Sports  |             |    *    |
   *   | self=0  |  | self=0  |            | self=0  |             | self=0  |
   *   | total=1 |  | total=3 |            | total=5 |             | total=3 |
   *   +---------+  +---------+            +---------+             +---------+
   *      :          |   |                   : | | :                     |
   *    Saturday     | Sports                : | | :                  Sports
   *      :          |   |  .....Saturday....: | | :.....Sunday.......   |
   *      :    _Cook_|   |  :            _Foot_| |_Bask_             :   |
   *      :   |          |  :           |               |            :   |
   *      v   v          v  v           v               v            v   v
   *   +---------+  +---------+  +------------+  +--------------+  +---------+
   *   |   Sat   |  |   Sat   |  |     *      |  |      *       |  |   Sun   |
   *   | Cooking |  | Sports  |  | S/Football |  | S/Basketball |  | Sports  |
   *   | self=1  |  | self=0  |  | self=0     |  | self=0       |  | self=0  |
   *   | total=1 |  | total=2 |  | total=2    |  | total=3      |  | total=3 |
   *   +---------+  +---------+  +------------+  +--------------+  +---------+
   *                    |              :                 :               |
   *                    |_Foot_  ..Sat.:                 :.Sun..   _Bask_|
   *                           | :                             :  |
   *                           v v                             v  v
   *                     +------------+                   +--------------+
   *                     |    Sat     |                   |     Sun      |
   *                     | S/Football |                   | S/Basketball |
   *                     | self=2     |                   | self=3       |
   *                     | total=2    |                   | total=3      |
   *                     +------------+                   +--------------+
   *
   * To build a multi-dimensional view of a collection of multi-dimensional
   * paths, you create a builder, add the paths to it and then use it to
   * construct the view. For example, the following code generates the
   * 2-dimensional top-down tree view shown above:
   *
   *   var builder = new MultiDimensionalViewBuilder(2);
   *   builder.addPath([['Saturday'], ['Cooking']], [1], SELF);
   *   builder.addPath([['Saturday'], ['Sports', 'Football']], [2], SELF);
   *   builder.addPath([['Sunday'], ['Sports', 'Basketball']], [3], SELF);
   *   var treeViewRoot = builder.buildTopDownTreeView();
   *
   * The heavy views can be constructed analogously (by calling
   * buildTopDownHeavyView() or buildBottomUpHeavyView() at the end instead).
   *
   * Note that the same builder can be used to construct both the tree and
   * heavy views (for the same collection of paths). However, no more paths can
   * be added once either view has been built.
   *
   * @{constructor}
   */
  function MultiDimensionalViewBuilder(dimensions, valueCount) {
    if (typeof(dimensions) !== 'number' || dimensions < 0)
      throw new Error('Dimensions must be a non-negative number');
    this.dimensions_ = dimensions;

    if (typeof(valueCount) !== 'number' || valueCount < 0)
      throw new Error('Number of values must be a non-negative number');
    this.valueCount_ = valueCount;

    this.buildRoot_ = this.createRootNode_();
    this.topDownTreeViewRoot_ = undefined;
    this.topDownHeavyViewRoot_ = undefined;
    this.bottomUpHeavyViewNode_ = undefined;

    this.maxDimensionDepths_ = new Array(dimensions);
    for (var d = 0; d < dimensions; d++)
      this.maxDimensionDepths_[d] = 0;
  }

  /** @{enum} */
  MultiDimensionalViewBuilder.ValueKind = {
    SELF: 0,
    TOTAL: 1
  };

  /**
   * Types of multi-dimensional views provided by MultiDimensionalViewBuilder.
   *
   * @enum
   */
  MultiDimensionalViewBuilder.ViewType = {
    TOP_DOWN_TREE_VIEW: 0,
    TOP_DOWN_HEAVY_VIEW: 1,
    BOTTOM_UP_HEAVY_VIEW: 2
  };

  MultiDimensionalViewBuilder.prototype = {
    /**
     * Add values associated with a multi-dimensional path to the tree.
     *
     * The path must have the same number of dimensions as the builder. Its
     * elements must be single-dimension paths (lists of strings) of arbitrary
     * length (empty for the root of the given dimension). Starting from the
     * root of the tree, each single-dimension path is traversed from left to
     * right to reach the node corresponding to the whole path.
     *
     * The length of the provided list of values must be equal to the builder's
     * value count. The builder supports adding both kinds of values
     * (self/total) wrt all value indices for an arbitrary multi-dimensional
     * path. The rationale for adding total values (in addition to/instead of
     * self values) is to cater for missing sub-paths. Example: Consider the
     * following collection of single-dimensional paths (with single values):
     *
     *   [['Loop::Run()', 'Execute()', 'FunctionBig']]:       self=99000
     *   [['Loop::Run()', 'Execute()', 'FunctionSmall1']]:    self=1
     *   [['Loop::Run()', 'Execute()', 'FunctionSmall2']]:    self=1
     *   ...
     *   [['Loop::Run()', 'Execute()', 'FunctionSmall1000']]: self=1
     *
     * If we required that only self values could be added to the builder, then
     * all of the 1001 paths would need to be provided (most likely in a trace)
     * to obtain the correct total of [['Loop::Run()', 'Execute()']]. However,
     * since we allow adding total values as well, only the following 2 paths
     * need to be provided to get the correct numbers explaining 99% of the
     * aggregated total value:
     *
     *   [['Loop::Run()', 'Execute()']]:                total=100000
     *   [['Loop::Run()', 'Execute()', 'FunctionBig']]: self=99000
     *
     * In other words, the long tail containing 1000 small paths need not be
     * dumped (greatly reducing the size of a trace where applicable).
     *
     * Important: No paths can be added to a builder once either view has been
     * built!
     */
    addPath: function(path, values, valueKind) {
      if (this.buildRoot_ === undefined) {
        throw new Error(
            'Paths cannot be added after either view has been built');
      }
      if (path.length !== this.dimensions_)
        throw new Error('Path must be ' + this.dimensions_ + '-dimensional');
      if (values.length !== this.valueCount_)
        throw new Error('Must provide ' + this.valueCount_ + ' values');

      var isTotal;
      switch (valueKind) {
        case MultiDimensionalViewBuilder.ValueKind.SELF:
          isTotal = false;
          break;
        case MultiDimensionalViewBuilder.ValueKind.TOTAL:
          isTotal = true;
          break;
        default:
          throw new Error('Invalid value kind: ' + valueKind);
      }

      var node = this.buildRoot_;
      for (var d = 0; d < path.length; d++) {
        var singleDimensionPath = path[d];
        var singleDimensionPathLength = singleDimensionPath.length;
        this.maxDimensionDepths_[d] =
            Math.max(this.maxDimensionDepths_[d], singleDimensionPathLength);
        for (var i = 0; i < singleDimensionPathLength; i++)
          node = this.getOrCreateChildNode_(node, d, singleDimensionPath[i]);
      }

      for (var v = 0; v < this.valueCount_; v++) {
        var addedValue = values[v];
        if (addedValue === undefined)
          continue;
        var nodeValue = node.values[v];
        if (isTotal) {
          nodeValue.total += addedValue;
          nodeValue.totalState = EXACT;
        } else {
          nodeValue.self += addedValue;
          nodeValue.totalState = Math.max(nodeValue.totalState, LOWER_BOUND);
        }
      }
    },

    buildView: function(viewType) {
      switch (viewType) {
        case MultiDimensionalViewBuilder.ViewType.TOP_DOWN_TREE_VIEW:
          return this.buildTopDownTreeView();
        case MultiDimensionalViewBuilder.ViewType.TOP_DOWN_HEAVY_VIEW:
          return this.buildTopDownHeavyView();
        case MultiDimensionalViewBuilder.ViewType.BOTTOM_UP_HEAVY_VIEW:
          return this.buildBottomUpHeavyView();
        default:
          throw new Error('Unknown multi-dimensional view type: ' + viewType);
      }
    },

    /**
     * Build the top-down tree view of the multi-dimensional view.
     *
     * Note that no more paths can be added to the builder once either view has
     * been built.
     */
    buildTopDownTreeView: function() {
      if (this.topDownTreeViewRoot_ === undefined) {
        var treeViewRoot = this.buildRoot_;
        this.buildRoot_ = undefined;

        this.setUpMissingChildRelationships_(treeViewRoot,
            0 /* firstDimensionToSetUp */);
        this.finalizeTotalValues_(treeViewRoot,
            0 /* firstDimensionToFinalize */,
            new WeakMap() /* dimensionalSelfSumsMap */);

        this.topDownTreeViewRoot_ = treeViewRoot;
      }

      return this.topDownTreeViewRoot_;
    },

    /**
     * Build the top-down heavy view of the multi-dimensional view.
     *
     * Note that no more paths can be added to the builder once either view has
     * been built.
     */
    buildTopDownHeavyView: function() {
      if (this.topDownHeavyViewRoot_ === undefined) {
        this.topDownHeavyViewRoot_ = this.buildGenericHeavyView_(
            this.addDimensionToTopDownHeavyViewNode_.bind(this));
      }
      return this.topDownHeavyViewRoot_;
    },

    /**
     * Build the bottom-up heavy view of the multi-dimensional view.
     *
     * Note that no more paths can be added to the builder once either view has
     * been built.
     */
    buildBottomUpHeavyView: function() {
      if (this.bottomUpHeavyViewNode_ === undefined) {
        this.bottomUpHeavyViewNode_ = this.buildGenericHeavyView_(
            this.addDimensionToBottomUpHeavyViewNode_.bind(this));
      }
      return this.bottomUpHeavyViewNode_;
    },

    createRootNode_: function() {
      return new MultiDimensionalViewNode(
          new Array(this.dimensions_) /* title */, this.valueCount_);
    },

    getOrCreateChildNode_: function(
        parentNode, dimension, childDimensionTitle) {
      if (dimension < 0 || dimension >= this.dimensions_)
        throw new Error('Invalid dimension');

      var dimensionChildren = parentNode.children[dimension];

      var childNode = dimensionChildren.get(childDimensionTitle);
      if (childNode !== undefined)
        return childNode;

      var childTitle = parentNode.title.slice();
      childTitle[dimension] = childDimensionTitle;
      childNode = new MultiDimensionalViewNode(childTitle, this.valueCount_);
      dimensionChildren.set(childDimensionTitle, childNode);

      return childNode;
    },

    /**
     * Set up missing child relationships.
     *
     * When an arbitrary multi-dimensional path [path1, path2, ..., pathN] is
     * added to the build tree (see addPath), only the nodes on the path1 ->
     * path2 -> ... -> pathN chain are created (i.e. no interleavings of the
     * single-dimensional paths are added to the tree). This method recursively
     * adds all the missing paths.
     *
     * Two-dimensional example:
     *
     *    Initial build tree   .       After path      .  After missing child
     *        (root only)      .    [[A, B], [1, 2]]   .   relationships were
     *                         .       was added       .        set up
     *                         .                       .
     *           +---+         .         +---+         .         +---+
     *           |*,*|         .         |*,*|         .         |*,*|
     *           +---+         .         +---+         .         +---+
     *                         .         A             .         A   1
     *                         .         |             .         |   :
     *                         .         v             .         v   V
     *                         .     +---+             .     +---+   +---+
     *                         .     |A,*|             .     |A,*|   |*,1|
     *                         .     +---+             .     +---+   +---+
     *                         .     B                 .     B   1   A   2
     *                         .     |                 .     |   :   |   :
     *                         .     v                 .     v   v   v   v
     *                         . +---+                 . +---+   +---+   +---+
     *                         . |B,*|                 . |B,*|   |A,1|   |*,2|
     *                         . +---+                 . +---+   +---+   +---+
     *                         .     1                 .     1   B   2   A
     *                         .     :                 .     :   |   :   |
     *                         .     v                 .     v   v   v   v
     *                         .     +---+             .     +---+   +---+
     *                         .     |B,1|             .     |B,1|   |A,2|
     *                         .     +---+             .     +---+   +---+
     *                         .         2             .         2   B
     *                         .         :             .         :   |
     *                         .         v             .         v   V
     *                         .         +---+         .         +---+
     *                         .         |B,2|         .         |B,2|
     *                         .         +---+         .         +---+
     */
    setUpMissingChildRelationships_: function(node, firstDimensionToSetUp) {
      // Missing child relationships of this node wrt dimensions 0, ...,
      // (firstDimensionToSetUp - 1) and all descendants of the associated
      // children have already been set up. Now we do the same for dimensions
      // firstDimensionToSetUp, ..., (this.dimensions_ - 1).
      for (var d = firstDimensionToSetUp; d < this.dimensions_; d++) {
        // Step 1. Gather the names of all children wrt the current dimension.
        var currentDimensionChildTitles = new Set(node.children[d].keys());
        for (var i = 0; i < d; i++) {
          for (var previousDimensionChildNode of node.children[i].values()) {
            for (var previousDimensionGrandChildTitle of
                 previousDimensionChildNode.children[d].keys()) {
              currentDimensionChildTitles.add(previousDimensionGrandChildTitle);
            }
          }
        }

        // Step 2. Add missing children wrt the current dimension and
        // recursively set up its missing child relationships.
        for (var currentDimensionChildTitle of currentDimensionChildTitles) {
          // Add a missing child (if it doesn't exist).
          var currentDimensionChildNode =
              this.getOrCreateChildNode_(node, d, currentDimensionChildTitle);

          // Set-up child relationships (of the child node) wrt dimensions 0,
          // ..., d - 1.
          for (var i = 0; i < d; i++) {
            for (var previousDimensionChildNode of node.children[i].values()) {
              var previousDimensionGrandChildNode =
                  previousDimensionChildNode.children[d].get(
                      currentDimensionChildTitle);
              if (previousDimensionGrandChildNode !== undefined) {
                currentDimensionChildNode.children[i].set(
                    previousDimensionChildNode.title[i],
                    previousDimensionGrandChildNode);
              }
            }
          }

          // Set-up child relationships (of the child node) wrt dimensions d,
          // ..., (this.dimensions_ - 1).
          this.setUpMissingChildRelationships_(currentDimensionChildNode, d);
        }
      }
    },

    /**
     * Finalize the total values of a multi-dimensional tree.
     *
     * The intermediate builder tree, a node of which we want to finalize
     * recursively, already has the right shape. The only thing that needs to
     * be done is to propagate self and total values from subsumed child nodes
     * in each dimension and update total value states appropriately.
     *
     * To derive the expression for the lower bound on the total value wrt
     * value index V (from 1 to |this.valueCount_| - 1), we rely on the
     * following assumptions:
     *
     *   1. Self/total values associated with different value indices are
     *      independent. From this point onwards, "self/total value" refers to
     *      self/total value wrt the fixed value index V.
     *
     *   2. Each node's self value does NOT overlap with the self or total value
     *      of any other node.
     *
     *   3. The total values of a node's children wrt a single dimension (e.g.
     *      [path1/A, path2] and [path1/B, path2]) do NOT overlap.
     *
     *   4. The total values of a node's children wrt different dimensions
     *      (e.g. [path1/A, path2] and [path1, path2/1]) MIGHT overlap.
     *
     * As a consequence of assumptions 1 and 3, the total value of a node can
     * be split into the part that cannot overlap (so-called "self-sum") and
     * the part that can overlap (so-called "residual"):
     *
     *   total(N, V) = selfSum(N, V) + residual(N, V)                   (A)
     *
     * where the self-sum is calculated as the sum of the node's self value
     * plus the sum of its descendants' self values (summed over all
     * dimensions):
     *
     *   selfSum(N, V) = self(N, V) + sum over all descendants C of N {
     *       self(C, V)                                                 (B)
     *   }
     *
     * Observe that the residual of a node does not include any self value (of
     * any node in the view). Furthermore, by assumption 2, we derive that the
     * residuals of a node's children wrt a single dimension don't overlap. On
     * the other hand, the residuals of a node's children wrt different
     * dimensions might overlap. This gives us the following lower bound on the
     * residual of a node:
     *
     *   residual(N, V) >= minResidual(N, V) = max over dimensions D {
     *       sum over children C of N at dimension D {
     *           residual(C, V)                                         (C)
     *       }
     *   })
     *
     * By combining equation (A) and inequality (C), we get a lower bound on
     * the total value of a node:
     *
     *   total(N, V) >= selfSum(N, V) + minResidual(N, V)
     *
     * For example, given a two-dimensional node [path1, path2] with self value
     * 10 and four children (2 wrt each dimension):
     *
     *    Child            | Self value | Total value
     *   ==================+============+=============
     *    [path1/A, path2] |         21 |          30
     *    [path1/B, path2] |         25 |          32
     *    [path1, path2/1] |         3  |          15
     *    [path1, path2/2] |         40 |          41
     *
     * and assuming that the children have no further descendants (i.e. their
     * residual values are equal to the differences between their total and
     * self values), the lower bound on the total value of [path1, path2] is:
     *
     *   total([path1, path2], 0)
     *       >= selfSum([path1, path2], 0) +
     *          minResidual([path1, path2], 0)
     *        = self([path1, path2], 0) +
     *          sum over all descendants C of [path1, path2] {
     *              self (C, 0)
     *          } +
     *          max over dimensions D {
     *              sum over children C of [path1, path2] at dimension D {
     *                  residual(C, 0)
     *              }
     *          }
     *        = self([path1, path2], 0) +
     *          ((self([path1/A, path2], 0) + self([path1/B, path2], 0)) +
     *           (self([path1, path2/1], 0) + self([path1, path2/2], 0))) +
     *          max(residual([path1/A, path2], 0) +
     *              residual([path1/B, path2], 0),
     *              residual([path1, path2/1], 0) +
     *              residual([path1, path2/2], 0))
     *        = 10 +
     *          ((21 + 25) + (3 + 40)) +
     *          max((30 - 21) + (32 - 25), (15 - 3) + (41 - 40))
     *        = 115
     *
     * To reduce the complexity of the calculation, we keep a temporary list of
     * dimensional self-sums for each node that we have already visited. For a
     * given node, the Kth element in the list is equal to the self size of the
     * node plus the sum of self sizes of all its descendants wrt dimensions 0
     * to K (inclusive). The list has two important properties:
     *
     *   1. The last element in the list is equal to the self-sum of the
     *      associated node (equation (B)).
     *
     *   2. The calculation of the list can be performed recursively using the
     *      lists of the associated node's children (avoids square complexity
     *      in the size of the graph):
     *
     *        dimensionalSelfSum(N, V)[D] =
     *            self(N, V) +
     *            sum I = 0 to D {
     *                sum over children C of N at dimension I {
     *                    dimensionalSelfSum(C, V)[I]
     *                }
     *            }
     *
     * This method also (recursively) ensures that, for each value index V, if
     * at least one of the descendants C of node N has at least a LOWER_BOUND
     * on total(C, V), then the N will also be marked as having a LOWER_BOUND
     * on total(N, V) (unless N contains the EXACT value of total(N, V), in
     * which case its relevant totalState won't be modified).
     */
    finalizeTotalValues_: function(
        node, firstDimensionToFinalize, dimensionalSelfSumsMap) {
      // Dimension D -> Value index V -> dimensionalSelfSum(|node|, V)[D].
      var dimensionalSelfSums = new Array(this.dimensions_);

      // Value index V -> minResidual(|node|, V).
      var minResidual = new Array(this.valueCount_);
      for (var v = 0; v < this.valueCount_; v++)
        minResidual[v] = 0;

      // Value index V -> |node| value V.
      var nodeValues = node.values;

      // Value index V -> dimensionalSelfSum(|node|, V)[|d|].
      var nodeSelfSums = new Array(this.valueCount_);
      for (var v = 0; v < this.valueCount_; v++)
        nodeSelfSums[v] = nodeValues[v].self;

      for (var d = 0; d < this.dimensions_; d++) {
        // Value index V -> sum over children C of |node| at dimension |d| {
        // residual(C, V) }.
        var childResidualSums = new Array(this.valueCount_);
        for (var v = 0; v < this.valueCount_; v++)
          childResidualSums[v] = 0;

        for (var childNode of node.children[d].values()) {
          if (d >= firstDimensionToFinalize)
            this.finalizeTotalValues_(childNode, d, dimensionalSelfSumsMap);
          // Dimension D -> Value index V ->
          // dimensionalSelfSum(|childNode|, V)[D].
          var childNodeSelfSums = dimensionalSelfSumsMap.get(childNode);
          var childNodeValues = childNode.values;
          for (var v = 0; v < this.valueCount_; v++) {
            nodeSelfSums[v] += childNodeSelfSums[d][v];
            var residual = childNodeValues[v].total -
                childNodeSelfSums[this.dimensions_ - 1][v];
            childResidualSums[v] += residual;
            if (childNodeValues[v].totalState > NOT_PROVIDED) {
              nodeValues[v].totalState = Math.max(
                  nodeValues[v].totalState, LOWER_BOUND);
            }
          }
        }

        dimensionalSelfSums[d] = nodeSelfSums.slice();
        for (var v = 0; v < this.valueCount_; v++)
          minResidual[v] = Math.max(minResidual[v], childResidualSums[v]);
      }

      for (var v = 0; v < this.valueCount_; v++) {
        nodeValues[v].total = Math.max(
            nodeValues[v].total, nodeSelfSums[v] + minResidual[v]);
      }

      if (dimensionalSelfSumsMap.has(node))
        throw new Error('Internal error: Node finalized more than once');
      dimensionalSelfSumsMap.set(node, dimensionalSelfSums);
    },

    /**
     * Build a generic heavy view of the multi-dimensional view.
     */
    buildGenericHeavyView_: function(treeViewNodeHandler) {
      // 1. Clone the root node of the top-down tree view node (except
      // children).
      var treeViewRoot = this.buildTopDownTreeView();
      var heavyViewRoot = this.createRootNode_();
      heavyViewRoot.values = treeViewRoot.values;

      // 2. Create recursion depth trackers (to avoid total value
      // double-counting).
      var recursionDepthTrackers = new Array(this.dimensions_);
      for (var d = 0; d < this.dimensions_; d++) {
        recursionDepthTrackers[d] =
            new RecursionDepthTracker(this.maxDimensionDepths_[d], d);
      }

      // 3. Add all paths associated with the single-dimensional descendants of
      // the top-down tree view root node to the heavy view root node
      // (depending on the type of the target heavy view).
      this.addDimensionsToGenericHeavyViewNode_(treeViewRoot, heavyViewRoot,
          0 /* startDimension */, recursionDepthTrackers,
          false /* previousDimensionsRecursive */, treeViewNodeHandler);

      // 4. Set up missing child relationships.
      this.setUpMissingChildRelationships_(heavyViewRoot,
          0 /* firstDimensionToSetUp */);

      return heavyViewRoot;
    },

    /**
     * Add all paths associated with the single-dimensional descendants of a
     * top-down tree-view node wrt multiple dimensions to a generic heavy-view
     * node (depending on the type of the target heavy view).
     */
    addDimensionsToGenericHeavyViewNode_: function(treeViewParentNode,
        heavyViewParentNode, startDimension, recursionDepthTrackers,
        previousDimensionsRecursive, treeViewNodeHandler) {
      for (var d = startDimension; d < this.dimensions_; d++) {
        this.addDimensionDescendantsToGenericHeavyViewNode_(treeViewParentNode,
            heavyViewParentNode, d, recursionDepthTrackers,
            previousDimensionsRecursive, treeViewNodeHandler);
      }
    },

    /**
     * Add all paths associated with the descendants of a top-down tree-view
     * node wrt a single dimension to a generic heavy-view node (depending on
     * the type of the target heavy view).
     */
    addDimensionDescendantsToGenericHeavyViewNode_: function(treeViewParentNode,
        heavyViewParentNode, currentDimension, recursionDepthTrackers,
        previousDimensionsRecursive, treeViewNodeHandler) {
      var treeViewChildren = treeViewParentNode.children[currentDimension];
      var recursionDepthTracker = recursionDepthTrackers[currentDimension];
      for (var treeViewChildNode of treeViewChildren.values()) {
        recursionDepthTracker.push(treeViewChildNode);

        // Add all paths associated with the child node to the heavy view-node
        // parent node.
        treeViewNodeHandler(
            treeViewChildNode, heavyViewParentNode, currentDimension,
            recursionDepthTrackers, previousDimensionsRecursive);

        // Recursively add all paths associated with the descendants of the
        // tree view child node wrt the current dimension to the heavy-view
        // parent node.
        this.addDimensionDescendantsToGenericHeavyViewNode_(treeViewChildNode,
            heavyViewParentNode, currentDimension, recursionDepthTrackers,
            previousDimensionsRecursive, treeViewNodeHandler);

        recursionDepthTracker.pop();
      }
    },

    /**
     * Add a top-down tree-view child node together with its single-dimensional
     * subtree to a top-down heavy-view parent node (tree-view node handler for
     * top-down heavy view).
     *
     * Sample resulting top-down heavy view:
     *
     *       +----------------+                    +-----------------+
     *       |     source     |                    |   destination   |
     *       | tree-view root |  ===============>  | heavy-view root |
     *       |     self=0     |                    |     self=0      |
     *       |    total=48    |                    |    total=48     |
     *       +----------------+                    +-----------------+
     *         |            |                  ______|      |      |______
     *         v            v                 v             v             v
     *    +----------+ +----------+      +----------+ +----------+ +----------+
     *    |    A*    | |    B     |      |    A***  | |    B     | |    C     |
     *    | self=10  | | self=12  |      | self=13  | | self=13  | | self=2   |
     *    | total=30 | | total=18 |      | total=30 | | total=34 | | total=7  |
     *    +----------+ +----------+      +----------+ +----------+ +----------+
     *         |                              :            :   :.........
     *         v                              v            v            v
     *    +----------+                   ............ ............ ............
     *    |    B     |                   :    B     : :    A     : :    C     :
     *    | self=1   |                   : self=1   : : self=3   : : self=2   :
     *    | total=16 |                   : total=16 : : total=8  : : total=7  :
     *    +----------+                   ............ ............ ............
     *         |   |________                  :   :.........
     *         v            v                 v            v
     *    +----------+ +----------+      ............ ............
     *    |    A**   | |    C     |      :    A     : :    C     :
     *    | self=3   | | self=2   |      : self=3   : : self=2   :
     *    | total=8  | | total=7  |      : total=8  : : total=7  :
     *    +----------+ +----------+      ............ ............
     *
     * Observe that care needs to be taken when dealing with recursion to avoid
     * double-counting, e.g. the total value of A** (8) was not added to the
     * total value of A*** (30) because it is already included in the total
     * value of A* (30) (which was also added to A***). That is why we need to
     * keep track of the path we traversed along the current dimension (to
     * determine whether total value should be added or not).
     */
    addDimensionToTopDownHeavyViewNode_: function(
        treeViewChildNode, heavyViewParentNode, currentDimension,
        recursionDepthTrackers, previousDimensionsRecursive) {
      this.addDimensionToTopDownHeavyViewNodeRecursively_(treeViewChildNode,
          heavyViewParentNode, currentDimension, recursionDepthTrackers,
          previousDimensionsRecursive, 1 /* subTreeDepth */);
    },

    addDimensionToTopDownHeavyViewNodeRecursively_: function(
        treeViewChildNode, heavyViewParentNode, currentDimension,
        recursionDepthTrackers, previousDimensionsRecursive, subTreeDepth) {
      var recursionDepthTracker = recursionDepthTrackers[currentDimension];
      var currentDimensionRecursive =
          subTreeDepth <= recursionDepthTracker.recursionDepth;
      var currentOrPreviousDimensionsRecursive =
          currentDimensionRecursive || previousDimensionsRecursive;

      var dimensionTitle = treeViewChildNode.title[currentDimension];
      var heavyViewChildNode = this.getOrCreateChildNode_(
          heavyViewParentNode, currentDimension, dimensionTitle);

      this.addNodeValues_(treeViewChildNode, heavyViewChildNode,
          !currentOrPreviousDimensionsRecursive /* addTotal */);

      // Add the descendants of the tree-view child node wrt the next
      // dimensions as children of the heavy-view child node.
      this.addDimensionsToGenericHeavyViewNode_(treeViewChildNode,
          heavyViewChildNode, currentDimension + 1, recursionDepthTrackers,
          currentOrPreviousDimensionsRecursive,
          this.addDimensionToTopDownHeavyViewNode_.bind(this));

      for (var treeViewGrandChildNode of
           treeViewChildNode.children[currentDimension].values()) {
        recursionDepthTracker.push(treeViewGrandChildNode);

        // Recursively add the tree-view grandchild node to the heavy-view
        // child node.
        this.addDimensionToTopDownHeavyViewNodeRecursively_(
            treeViewGrandChildNode, heavyViewChildNode, currentDimension,
            recursionDepthTrackers, previousDimensionsRecursive,
            subTreeDepth + 1);

        recursionDepthTracker.pop();
      }
    },

    /**
     * Add a top-down tree-view child node together with all its ancestors wrt
     * the given dimension as descendants of a bottom-up heavy-view parent node
     * in the reverse order (tree-view node handler for bottom-up heavy view).
     *
     * Sample resulting bottom-up heavy view:
     *
     *       +----------------+                    +-----------------+
     *       |     source     |                    |   destination   |
     *       | tree-view root |  ===============>  | heavy-view root |
     *       |     self=0     |                    |     self=0      |
     *       |    total=48    |                    |    total=48     |
     *       +----------------+                    +-----------------+
     *         |            |                  ______|      |      |______
     *         v            v                 v             v             v
     *    +----------+ +----------+      +----------+ +----------+ +----------+
     *    |    A*    | |    B     |      |    A***  | |    B     | |    C     |
     *    | self=10  | | self=12  |      | self=13  | | self=13  | | self=2   |
     *    | total=30 | | total=18 |      | total=30 | | total=34 | | total=7  |
     *    +----------+ +----------+      +----------+ +----------+ +----------+
     *         |                              :            :            :
     *         v                              v            v            v
     *    +----------+                   ............ ............ ............
     *    |    B#    |                   :    B     : :    A     : :    B##   :
     *    | self=1   |                   : self=3   : : self=1   : : self=2   :
     *    | total=16 |                   : total=8  : : total=16 : : total=7  :
     *    +----------+                   ............ ............ ............
     *         |   |________                  :                         :
     *         v            v                 v                         v
     *    +----------+ +----------+      ............              ............
     *    |    A**   | |    C     |      :    A     :              :    A     :
     *    | self=3   | | self=2   |      : self=3   :              : self=2   :
     *    | total=8  | | total=7  |      : total=8  :              : total=7  :
     *    +----------+ +----------+      ............              ............
     *
     * Similarly to the construction of the top-down heavy view, care needs to
     * be taken when dealing with recursion to avoid double-counting, e.g. the
     * total value of A** (8) was not added to the total value of A*** (30)
     * because it is already included in the total value of A* (30) (which was
     * also added to A***). That is why we need to keep track of the path we
     * traversed along the current dimension (to determine whether total value
     * should be added or not).
     *
     * Note that when we add an ancestor (B#) of a top-down tree-view node (C)
     * to the bottom-up heavy view, the values of the original tree-view node
     * (C) (rather than the ancestor's values) are added to the corresponding
     * heavy-view node (B##).
     */
    addDimensionToBottomUpHeavyViewNode_: function(
        treeViewChildNode, heavyViewParentNode, currentDimension,
        recursionDepthTrackers, previousDimensionsRecursive) {
      var recursionDepthTracker = recursionDepthTrackers[currentDimension];
      var bottomIndex = recursionDepthTracker.bottomIndex;
      var topIndex = recursionDepthTracker.topIndex;
      var firstNonRecursiveIndex =
          bottomIndex + recursionDepthTracker.recursionDepth;
      var viewNodePath = recursionDepthTracker.viewNodePath;

      var trackerAncestorNode = recursionDepthTracker.trackerAncestorNode;
      var heavyViewDescendantNode = heavyViewParentNode;
      for (var i = bottomIndex; i < topIndex; i++) {
        var treeViewAncestorNode = viewNodePath[i];
        var dimensionTitle = treeViewAncestorNode.title[currentDimension];
        heavyViewDescendantNode = this.getOrCreateChildNode_(
            heavyViewDescendantNode, currentDimension, dimensionTitle);

        var currentDimensionRecursive = i < firstNonRecursiveIndex;
        var currentOrPreviousDimensionsRecursive =
            currentDimensionRecursive || previousDimensionsRecursive;

        // The self and total values are taken from the original top-down tree
        // view child node (rather than the ancestor node).
        this.addNodeValues_(treeViewChildNode, heavyViewDescendantNode,
            !currentOrPreviousDimensionsRecursive);

        // Add the descendants of the tree-view child node wrt the next
        // dimensions as children of the heavy-view child node.
        this.addDimensionsToGenericHeavyViewNode_(treeViewChildNode,
            heavyViewDescendantNode, currentDimension + 1,
            recursionDepthTrackers, currentOrPreviousDimensionsRecursive,
            this.addDimensionToBottomUpHeavyViewNode_.bind(this));
      }
    },

    addNodeValues_: function(sourceNode, targetNode, addTotal) {
      var targetNodeValues = targetNode.values;
      var sourceNodeValues = sourceNode.values;
      for (var v = 0; v < this.valueCount_; v++) {
        var targetNodeValue = targetNodeValues[v];
        var sourceNodeValue = sourceNodeValues[v];
        targetNodeValue.self += sourceNodeValue.self;
        if (addTotal) {
          targetNodeValue.total += sourceNodeValue.total;
          if (sourceNodeValue.totalState > NOT_PROVIDED) {
            targetNodeValue.totalState = Math.max(
                targetNodeValue.totalState, LOWER_BOUND);
          }
        }
      }
    }
  };

  /**
   * Recursion depth tracker.
   *
   * This class tracks the recursion depth of the current stack (updated via
   * the push and pop methods). The recursion depth of a stack is the lengh of
   * its longest leaf suffix that is repeated within the stack itself.
   *
   * For example, the recursion depth of the stack A -> B -> C -> A -> B -> B
   * -> C (where C is the leaf node) is 2 because the suffix B -> C is repeated
   * within it.
   *
   * @{constructor}
   */
  function RecursionDepthTracker(maxDepth, dimension) {
    this.titlePath = new Array(maxDepth);
    this.viewNodePath = new Array(maxDepth);
    this.bottomIndex = this.topIndex = maxDepth;

    this.dimension_ = dimension;
    this.currentTrackerNode_ =
        this.createNode_(0 /* recursionDepth */, undefined /* parent */);
  }

  RecursionDepthTracker.prototype = {
    push: function(viewNode) {
      if (this.bottomIndex === 0)
        throw new Error('Cannot push to a full tracker');
      var title = viewNode.title[this.dimension_];
      this.bottomIndex--;
      this.titlePath[this.bottomIndex] = title;
      this.viewNodePath[this.bottomIndex] = viewNode;

      var childTrackerNode = this.currentTrackerNode_.children.get(title);
      if (childTrackerNode !== undefined) {
        // Child node already exists, so we don't need to calculate anything.
        this.currentTrackerNode_ = childTrackerNode;
        return;
      }

      // Child node doesn't exist yet, so we need to calculate its recursion
      // depth.
      var maxLengths = zFunction(this.titlePath, this.bottomIndex);
      var recursionDepth = 0;
      for (var i = 0; i < maxLengths.length; i++)
        recursionDepth = Math.max(recursionDepth, maxLengths[i]);

      childTrackerNode =
          this.createNode_(recursionDepth, this.currentTrackerNode_);
      this.currentTrackerNode_.children.set(title, childTrackerNode);
      this.currentTrackerNode_ = childTrackerNode;
    },

    pop: function() {
      if (this.bottomIndex === this.topIndex)
        throw new Error('Cannot pop from an empty tracker');

      this.titlePath[this.bottomIndex] = undefined;
      this.viewNodePath[this.bottomIndex] = undefined;
      this.bottomIndex++;

      this.currentTrackerNode_ = this.currentTrackerNode_.parent;
    },

    get recursionDepth() {
      return this.currentTrackerNode_.recursionDepth;
    },

    createNode_: function(recursionDepth, parent) {
      return {
        recursionDepth: recursionDepth,
        parent: parent,
        children: new Map()
      };
    }
  };

  /**
   * Calculate the Z-function of (a suffix of) a list.
   *
   * Z-function: Given a list (or a string) of length n, for each index i from
   * 1 to n - 1, find the length z[i] of the longest substring starting at
   * position i which is also a prefix of the list. This function returns the
   * list of maximum lengths z.
   *
   * Mathematically, for each i from 1 to n - 1, z[i] is the maximum value such
   * that [list[0], ..., list[i - 1]] = [list[i], ..., list[i + z[i] - 1]].
   * z[0] is defined to be zero for convenience.
   *
   * Example:
   *
   *   Input (list): ['A', 'B', 'A', 'C', 'A', 'B', 'A']
   *   Output (z):   [ 0 ,  0 ,  1 ,  0 ,  3 ,  0 ,  1 ]
   *
   * Unlike the brute-force approach (which is O(n^2) in the worst case), the
   * complexity of this implementation is linear in the size of the list, i.e.
   * O(n).
   *
   * Source: http://e-maxx-eng.github.io/string/z-function.html
   */
  function zFunction(list, startIndex) {
    var n = list.length - startIndex;
    if (n === 0)
      return [];

    var z = new Array(n);
    z[0] = 0;

    for (var i = 1, left = 0, right = 0; i < n; ++i) {
      var maxLength;
      if (i <= right)
        maxLength = Math.min(right - i + 1, z[i - left]);
      else
        maxLength = 0;

      while (i + maxLength < n && list[startIndex + maxLength] ===
             list[startIndex + i + maxLength]) {
        ++maxLength;
      }

      if (i + maxLength - 1 > right) {
        left = i;
        right = i + maxLength - 1;
      }

      z[i] = maxLength;
    }

    return z;
  }

  return {
    MultiDimensionalViewBuilder: MultiDimensionalViewBuilder,
    MultiDimensionalViewNode: MultiDimensionalViewNode,

    // Exports below are for testing only.
    RecursionDepthTracker: RecursionDepthTracker,
    zFunction: zFunction
  };
});
