import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import * as React from 'react';
import React__default, { createContext, useContext, useRef, useMemo, useLayoutEffect, useEffect, useCallback, useState, memo, useReducer, forwardRef, createElement as createElement$1 } from 'react';
import { Editor as Editor$1, Element as Element$1, Text, Transforms, Point, Path, Node as Node$1, Range, createEditor, Operation } from 'slate';
import { ReactEditor, withReact, useSelected, Slate, Editable, DefaultElement } from 'slate-react';
import * as ReactDOM from 'react-dom';
import { unstable_batchedUpdates, createPortal } from 'react-dom';

class YooptaPlugin {
    constructor(plugin) {
        this.plugin = plugin;
    }
    get getPlugin() {
        return this.plugin;
    }
    // [TODO] - add validation
    // validatePlugin(): boolean {
    //   return true
    // }
    extend(extendPlugin) {
        const { renders, options, elementProps, events } = extendPlugin;
        const extendedOptions = Object.assign(Object.assign({}, this.plugin.options), options);
        const elements = Object.assign({}, this.plugin.elements);
        if (renders) {
            Object.keys(renders).forEach((elementType) => {
                const element = elements[elementType];
                if (element && element.render) {
                    const customRenderFn = renders[elementType];
                    let elementRender = element.render;
                    element.render = (props) => {
                        return elementRender(Object.assign(Object.assign({}, props), { extendRender: customRenderFn }));
                    };
                }
            });
        }
        if (elementProps) {
            Object.keys(elementProps).forEach((elementType) => {
                const element = elements[elementType];
                if (element) {
                    const defaultPropsFn = elementProps[elementType];
                    const updatedElementProps = element.props;
                    if (defaultPropsFn && updatedElementProps) {
                        element.props = defaultPropsFn(updatedElementProps);
                    }
                }
            });
        }
        if (events) {
            Object.keys(events).forEach((event) => {
                const eventHandler = events[event];
                if (eventHandler) {
                    if (!this.plugin.events)
                        this.plugin.events = {};
                    this.plugin.events[event] = eventHandler;
                }
            });
        }
        return new YooptaPlugin(Object.assign(Object.assign({}, this.plugin), { elements: elements, options: extendedOptions }));
    }
}

function getFallbackUUID() {
    let S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4();
}
const generateId = () => {
    var _a, _b;
    if (typeof window === 'undefined')
        return getFallbackUUID();
    if (typeof ((_a = window.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID) !== 'function')
        return getFallbackUUID();
    return (_b = window.crypto) === null || _b === void 0 ? void 0 : _b.randomUUID();
};

const buildBlockElement$1 = (element) => {
    return {
        id: generateId(),
        type: (element === null || element === void 0 ? void 0 : element.type) || 'paragraph',
        children: (element === null || element === void 0 ? void 0 : element.children) || [{ text: '' }],
        props: Object.assign({ nodeType: 'block' }, element === null || element === void 0 ? void 0 : element.props),
    };
};
const buildBlockData$1 = (block) => ({
    id: (block === null || block === void 0 ? void 0 : block.id) || generateId(),
    value: (block === null || block === void 0 ? void 0 : block.value) || [buildBlockElement$1()],
    type: (block === null || block === void 0 ? void 0 : block.type) || 'Paragraph',
    meta: Object.assign({ order: 0, depth: 0 }, block === null || block === void 0 ? void 0 : block.meta),
});

function getRootBlockElementType(elems) {
    if (!elems)
        return;
    const elements = Object.keys(elems);
    const rootElementType = elements.length === 1 ? elements[0] : elements.find((key) => elems[key].asRoot);
    return rootElementType;
}
function getRootBlockElement(elems) {
    if (!elems)
        return;
    const rootElementType = getRootBlockElementType(elems);
    const rootElement = rootElementType ? elems[rootElementType] : undefined;
    return rootElement;
}
function buildSlateNodeElement(type, props = { nodeType: 'block' }) {
    return { id: generateId(), type, children: [{ text: '' }], props };
}
function recursivelyCollectElementChildren(blockElement, blockElements, elementsMapWithTextContent) {
    var _a;
    return (((_a = blockElement.children) === null || _a === void 0 ? void 0 : _a.map((elementType) => {
        const childElement = blockElements[elementType];
        if (!childElement) {
            throw new Error(`Element definition for ${elementType} not found`);
        }
        const childNode = buildBlockElement$1({
            id: generateId(),
            type: elementType,
            props: childElement.props,
            children: childElement.children && childElement.children.length > 0
                ? recursivelyCollectElementChildren(childElement, blockElements, elementsMapWithTextContent)
                : [{ text: (elementsMapWithTextContent === null || elementsMapWithTextContent === void 0 ? void 0 : elementsMapWithTextContent[elementType]) || '' }],
        });
        return childNode;
    })) || []);
}
function buildBlockElementsStructure(editor, blockType, elementsMapWithTextContent) {
    const block = editor.blocks[blockType];
    const blockElements = block.elements;
    const rootBlockElementType = getRootBlockElementType(blockElements);
    if (!rootBlockElementType) {
        throw new Error(`Root element type not found for block type ${blockType}`);
    }
    const rootBlockElement = blockElements[rootBlockElementType];
    const rootElementNode = {
        id: generateId(),
        type: rootBlockElementType,
        props: rootBlockElement.props,
        children: rootBlockElement.children && rootBlockElement.children.length > 0
            ? recursivelyCollectElementChildren(rootBlockElement, blockElements, elementsMapWithTextContent)
            : [{ text: '' }],
    };
    return rootElementNode;
}
function getPluginByInlineElement(plugins, elementType) {
    const plugin = Object.values(plugins).find((plugin) => {
        var _a, _b;
        return plugin.type === ((_b = (_a = plugin.elements) === null || _a === void 0 ? void 0 : _a[elementType]) === null || _b === void 0 ? void 0 : _b.rootPlugin);
    });
    return plugin;
}

// [TEST]
// [TEST] - TEST EVENTS
function insertBlock(editor, type, options = {}) {
    var _a, _b;
    const { at = editor.path.current, focus = false, blockData } = options;
    const plugin = editor.plugins[type];
    const { onBeforeCreate, onCreate } = plugin.events || {};
    let slateStructure;
    if (blockData && Array.isArray(blockData === null || blockData === void 0 ? void 0 : blockData.value))
        slateStructure = blockData.value[0];
    else
        slateStructure = (onBeforeCreate === null || onBeforeCreate === void 0 ? void 0 : onBeforeCreate(editor)) || buildBlockElementsStructure(editor, type);
    const newBlock = {
        id: (blockData === null || blockData === void 0 ? void 0 : blockData.id) || generateId(),
        type: type,
        value: [slateStructure],
        meta: {
            align: ((_a = blockData === null || blockData === void 0 ? void 0 : blockData.meta) === null || _a === void 0 ? void 0 : _a.align) || 'left',
            depth: ((_b = blockData === null || blockData === void 0 ? void 0 : blockData.meta) === null || _b === void 0 ? void 0 : _b.depth) || 0,
            order: typeof at === 'number' ? at : Object.keys(editor.children).length,
        },
    };
    const operations = [];
    operations.push({
        type: 'insert_block',
        path: { current: newBlock.meta.order },
        block: newBlock,
    });
    editor.applyTransforms(operations);
    onCreate === null || onCreate === void 0 ? void 0 : onCreate(editor, newBlock.id);
    if (focus) {
        editor.focusBlock(newBlock.id);
    }
    return newBlock.id;
}

function getPreviousPath(editor) {
    const path = editor.path.current;
    if (typeof path === 'number' && path !== 0)
        return path - 1;
    return null;
}

function getNextPath(editor) {
    const path = editor.path.current;
    if (typeof path === 'number')
        return path + 1;
    return null;
}

function isBlockSelected(editor, block) {
    const selected = editor.path.selected;
    if (Array.isArray(selected)) {
        return selected.includes(block.meta.order);
    }
    return false;
}

function getPath(editor) {
    return editor.path.current;
}

function getSelectedPaths(editor) {
    return editor.path.selected;
}

function isPathEmpty(editor) {
    return editor.path.current === null;
}

function setPath(editor, path) {
    editor.applyTransforms([{ type: 'set_block_path', path }], { validatePaths: false });
}

function getLastNode(slate) {
    const lastNodeEntry = Editor$1.last(slate, []);
    return { node: lastNodeEntry[0], path: lastNodeEntry[1] };
}
function getLastNodePoint(slate) {
    try {
        let point;
        const [lastElement, lastPath] = Editor$1.last(slate, []);
        if (Element$1.isElement(lastElement) && !Editor$1.isEditor(lastElement)) {
            const [lastTextNode, lastTextPath] = Editor$1.last(slate, lastPath);
            if (Text.isText(lastTextNode)) {
                point = { path: lastTextPath, offset: lastTextNode.text.length };
            }
        }
        else if (Text.isText(lastElement)) {
            point = { path: lastPath, offset: lastElement.text.length };
        }
        return point;
    }
    catch (error) {
        return {
            path: [0, 0],
            offset: 0,
        };
    }
}

const Paths = {
    getPath,
    getNextPath,
    getPreviousPath,
    isBlockSelected,
    getSelectedPaths,
    isPathEmpty,
    setPath,
    getLastNodePoint,
};

function getBlockSlate(editor, options) {
    if (!(options === null || options === void 0 ? void 0 : options.id) && typeof (options === null || options === void 0 ? void 0 : options.at) !== 'number') {
        throw new Error('getBlockSlate requires either an id or at');
    }
    const blockId = (options === null || options === void 0 ? void 0 : options.id) ||
        Object.keys(editor.children).find((childrenId) => {
            const plugin = editor.children[childrenId];
            return plugin.meta.order === (options === null || options === void 0 ? void 0 : options.at);
        });
    const slate = editor.blockEditorsMap[blockId || ''];
    const blockData = editor.children[blockId || ''];
    const blockEntity = editor.blocks[(blockData === null || blockData === void 0 ? void 0 : blockData.type) || ''];
    if (!(blockEntity === null || blockEntity === void 0 ? void 0 : blockEntity.hasCustomEditor) && !slate) {
        throw new Error(`Slate not found with params: ${JSON.stringify(options)}`);
    }
    return slate;
}

function deleteBlock(editor, options) {
    const { focus, blockId, at } = options;
    if (!blockId && typeof at !== 'number') {
        throw new Error('blockId or path should be provided');
    }
    const block = editor.getBlock({ id: blockId, at });
    if (!block) {
        throw new Error(`Block not found`);
    }
    // const isLastBlock = Object.values(editor.children).length === 1;
    // if (isLastBlock) return;
    const prevBlockPath = Paths.getPreviousPath(editor);
    const prevBlock = prevBlockPath !== null ? editor.getBlock({ at: prevBlockPath }) : undefined;
    const prevSlate = prevBlock ? getBlockSlate(editor, { id: prevBlock === null || prevBlock === void 0 ? void 0 : prevBlock.id }) : undefined;
    const blockToDelete = editor.children[block.id];
    const operations = [];
    const plugin = editor.plugins[blockToDelete.type];
    const { onDestroy } = plugin.events || {};
    onDestroy === null || onDestroy === void 0 ? void 0 : onDestroy(editor, blockToDelete.id);
    operations.push({
        type: 'delete_block',
        block: blockToDelete,
        path: editor.path,
    });
    editor.applyTransforms(operations, { validatePaths: false });
    if (focus) {
        if (prevSlate && prevBlock) {
            const lastNodePoint = Paths.getLastNodePoint(prevSlate);
            editor.focusBlock(prevBlock.id, { focusAt: lastNodePoint });
        }
    }
}

function moveBlock(editor, draggedBlockId, newPath) {
    const updatedPosition = newPath;
    const draggedBlock = editor.children[draggedBlockId];
    const blockInNewPosition = Object.values(editor.children).find((item) => item.meta.order === updatedPosition);
    if (!draggedBlock || !blockInNewPosition) {
        console.warn('Invalid block ids for move operation');
        return;
    }
    const operations = [];
    const moveOperation = {
        type: 'move_block',
        prevProperties: {
            id: draggedBlockId,
            order: draggedBlock.meta.order,
        },
        properties: {
            id: draggedBlockId,
            order: updatedPosition,
        },
    };
    operations.push(moveOperation);
    editor.applyTransforms(operations);
    editor.setPath({ current: updatedPosition });
}

const IS_FOCUSED_EDITOR = new WeakMap();

function getSelectionPath(slate, focusAt) {
    if (Point.isPoint(focusAt)) {
        return focusAt;
    }
    if (Path.isPath(focusAt)) {
        return { path: focusAt, offset: 0 };
    }
    const [, firstNodePath] = Editor$1.first(slate, [0]);
    const firstLeafPath = firstNodePath ? firstNodePath : [0, 0];
    return { path: firstLeafPath, offset: 0 };
}
// [TODO] - update editor.path after focus
function focusBlock(editor, blockId, options = {}) {
    const { focusAt, waitExecution = true, waitExecutionMs = 0, shouldUpdateBlockPath = true } = options;
    const focusBlockEditor = () => {
        const slate = options.slate || editor.blockEditorsMap[blockId];
        const block = editor.children[blockId];
        if (!slate || !block)
            return;
        const currentBlock = editor.blocks[block.type];
        if (!currentBlock.hasCustomEditor) {
            try {
                const selectionPath = getSelectionPath(slate, focusAt);
                Transforms.select(slate, selectionPath);
                // // [CHECK]
                ReactEditor.focus(slate);
            }
            catch (error) { }
        }
        if (shouldUpdateBlockPath) {
            setTimeout(() => {
                editor.setPath({ current: block.meta.order });
            }, 0);
        }
    };
    if (waitExecution) {
        setTimeout(() => focusBlockEditor(), waitExecutionMs);
    }
    else {
        focusBlockEditor();
    }
    IS_FOCUSED_EDITOR.set(editor, true);
}

function findPluginBlockByPath(editor, options) {
    const childrenKeys = Object.keys(editor.children);
    const { at = editor.path.current } = options || {};
    const blockId = childrenKeys.find((childrenId) => {
        const plugin = editor.children[childrenId];
        return plugin.meta.order === at;
    });
    if (!blockId)
        return null;
    return editor.children[blockId];
}

function findSlateBySelectionPath(editor, options) {
    const childrenKeys = Object.keys(editor.children);
    const { at = editor.path.current } = options || {};
    const blockId = childrenKeys.find((childrenId) => {
        const plugin = editor.children[childrenId];
        return plugin.meta.order === at;
    });
    if (!blockId)
        return undefined;
    return editor.blockEditorsMap[blockId];
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var lodash_clonedeepExports = {};
var lodash_clonedeep = {
  get exports(){ return lodash_clonedeepExports; },
  set exports(v){ lodash_clonedeepExports = v; },
};

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

(function (module, exports) {
	/** Used as the size to enable large array optimizations. */
	var LARGE_ARRAY_SIZE = 200;

	/** Used to stand-in for `undefined` hash values. */
	var HASH_UNDEFINED = '__lodash_hash_undefined__';

	/** Used as references for various `Number` constants. */
	var MAX_SAFE_INTEGER = 9007199254740991;

	/** `Object#toString` result references. */
	var argsTag = '[object Arguments]',
	    arrayTag = '[object Array]',
	    boolTag = '[object Boolean]',
	    dateTag = '[object Date]',
	    errorTag = '[object Error]',
	    funcTag = '[object Function]',
	    genTag = '[object GeneratorFunction]',
	    mapTag = '[object Map]',
	    numberTag = '[object Number]',
	    objectTag = '[object Object]',
	    promiseTag = '[object Promise]',
	    regexpTag = '[object RegExp]',
	    setTag = '[object Set]',
	    stringTag = '[object String]',
	    symbolTag = '[object Symbol]',
	    weakMapTag = '[object WeakMap]';

	var arrayBufferTag = '[object ArrayBuffer]',
	    dataViewTag = '[object DataView]',
	    float32Tag = '[object Float32Array]',
	    float64Tag = '[object Float64Array]',
	    int8Tag = '[object Int8Array]',
	    int16Tag = '[object Int16Array]',
	    int32Tag = '[object Int32Array]',
	    uint8Tag = '[object Uint8Array]',
	    uint8ClampedTag = '[object Uint8ClampedArray]',
	    uint16Tag = '[object Uint16Array]',
	    uint32Tag = '[object Uint32Array]';

	/**
	 * Used to match `RegExp`
	 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
	 */
	var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

	/** Used to match `RegExp` flags from their coerced string values. */
	var reFlags = /\w*$/;

	/** Used to detect host constructors (Safari). */
	var reIsHostCtor = /^\[object .+?Constructor\]$/;

	/** Used to detect unsigned integer values. */
	var reIsUint = /^(?:0|[1-9]\d*)$/;

	/** Used to identify `toStringTag` values supported by `_.clone`. */
	var cloneableTags = {};
	cloneableTags[argsTag] = cloneableTags[arrayTag] =
	cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
	cloneableTags[boolTag] = cloneableTags[dateTag] =
	cloneableTags[float32Tag] = cloneableTags[float64Tag] =
	cloneableTags[int8Tag] = cloneableTags[int16Tag] =
	cloneableTags[int32Tag] = cloneableTags[mapTag] =
	cloneableTags[numberTag] = cloneableTags[objectTag] =
	cloneableTags[regexpTag] = cloneableTags[setTag] =
	cloneableTags[stringTag] = cloneableTags[symbolTag] =
	cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
	cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
	cloneableTags[errorTag] = cloneableTags[funcTag] =
	cloneableTags[weakMapTag] = false;

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function('return this')();

	/** Detect free variable `exports`. */
	var freeExports = exports && !exports.nodeType && exports;

	/** Detect free variable `module`. */
	var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

	/** Detect the popular CommonJS extension `module.exports`. */
	var moduleExports = freeModule && freeModule.exports === freeExports;

	/**
	 * Adds the key-value `pair` to `map`.
	 *
	 * @private
	 * @param {Object} map The map to modify.
	 * @param {Array} pair The key-value pair to add.
	 * @returns {Object} Returns `map`.
	 */
	function addMapEntry(map, pair) {
	  // Don't return `map.set` because it's not chainable in IE 11.
	  map.set(pair[0], pair[1]);
	  return map;
	}

	/**
	 * Adds `value` to `set`.
	 *
	 * @private
	 * @param {Object} set The set to modify.
	 * @param {*} value The value to add.
	 * @returns {Object} Returns `set`.
	 */
	function addSetEntry(set, value) {
	  // Don't return `set.add` because it's not chainable in IE 11.
	  set.add(value);
	  return set;
	}

	/**
	 * A specialized version of `_.forEach` for arrays without support for
	 * iteratee shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Array} Returns `array`.
	 */
	function arrayEach(array, iteratee) {
	  var index = -1,
	      length = array ? array.length : 0;

	  while (++index < length) {
	    if (iteratee(array[index], index, array) === false) {
	      break;
	    }
	  }
	  return array;
	}

	/**
	 * Appends the elements of `values` to `array`.
	 *
	 * @private
	 * @param {Array} array The array to modify.
	 * @param {Array} values The values to append.
	 * @returns {Array} Returns `array`.
	 */
	function arrayPush(array, values) {
	  var index = -1,
	      length = values.length,
	      offset = array.length;

	  while (++index < length) {
	    array[offset + index] = values[index];
	  }
	  return array;
	}

	/**
	 * A specialized version of `_.reduce` for arrays without support for
	 * iteratee shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @param {*} [accumulator] The initial value.
	 * @param {boolean} [initAccum] Specify using the first element of `array` as
	 *  the initial value.
	 * @returns {*} Returns the accumulated value.
	 */
	function arrayReduce(array, iteratee, accumulator, initAccum) {
	  var index = -1,
	      length = array ? array.length : 0;

	  if (initAccum && length) {
	    accumulator = array[++index];
	  }
	  while (++index < length) {
	    accumulator = iteratee(accumulator, array[index], index, array);
	  }
	  return accumulator;
	}

	/**
	 * The base implementation of `_.times` without support for iteratee shorthands
	 * or max array length checks.
	 *
	 * @private
	 * @param {number} n The number of times to invoke `iteratee`.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Array} Returns the array of results.
	 */
	function baseTimes(n, iteratee) {
	  var index = -1,
	      result = Array(n);

	  while (++index < n) {
	    result[index] = iteratee(index);
	  }
	  return result;
	}

	/**
	 * Gets the value at `key` of `object`.
	 *
	 * @private
	 * @param {Object} [object] The object to query.
	 * @param {string} key The key of the property to get.
	 * @returns {*} Returns the property value.
	 */
	function getValue(object, key) {
	  return object == null ? undefined : object[key];
	}

	/**
	 * Checks if `value` is a host object in IE < 9.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
	 */
	function isHostObject(value) {
	  // Many host objects are `Object` objects that can coerce to strings
	  // despite having improperly defined `toString` methods.
	  var result = false;
	  if (value != null && typeof value.toString != 'function') {
	    try {
	      result = !!(value + '');
	    } catch (e) {}
	  }
	  return result;
	}

	/**
	 * Converts `map` to its key-value pairs.
	 *
	 * @private
	 * @param {Object} map The map to convert.
	 * @returns {Array} Returns the key-value pairs.
	 */
	function mapToArray(map) {
	  var index = -1,
	      result = Array(map.size);

	  map.forEach(function(value, key) {
	    result[++index] = [key, value];
	  });
	  return result;
	}

	/**
	 * Creates a unary function that invokes `func` with its argument transformed.
	 *
	 * @private
	 * @param {Function} func The function to wrap.
	 * @param {Function} transform The argument transform.
	 * @returns {Function} Returns the new function.
	 */
	function overArg(func, transform) {
	  return function(arg) {
	    return func(transform(arg));
	  };
	}

	/**
	 * Converts `set` to an array of its values.
	 *
	 * @private
	 * @param {Object} set The set to convert.
	 * @returns {Array} Returns the values.
	 */
	function setToArray(set) {
	  var index = -1,
	      result = Array(set.size);

	  set.forEach(function(value) {
	    result[++index] = value;
	  });
	  return result;
	}

	/** Used for built-in method references. */
	var arrayProto = Array.prototype,
	    funcProto = Function.prototype,
	    objectProto = Object.prototype;

	/** Used to detect overreaching core-js shims. */
	var coreJsData = root['__core-js_shared__'];

	/** Used to detect methods masquerading as native. */
	var maskSrcKey = (function() {
	  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
	  return uid ? ('Symbol(src)_1.' + uid) : '';
	}());

	/** Used to resolve the decompiled source of functions. */
	var funcToString = funcProto.toString;

	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var objectToString = objectProto.toString;

	/** Used to detect if a method is native. */
	var reIsNative = RegExp('^' +
	  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
	  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
	);

	/** Built-in value references. */
	var Buffer = moduleExports ? root.Buffer : undefined,
	    Symbol = root.Symbol,
	    Uint8Array = root.Uint8Array,
	    getPrototype = overArg(Object.getPrototypeOf, Object),
	    objectCreate = Object.create,
	    propertyIsEnumerable = objectProto.propertyIsEnumerable,
	    splice = arrayProto.splice;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeGetSymbols = Object.getOwnPropertySymbols,
	    nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined,
	    nativeKeys = overArg(Object.keys, Object);

	/* Built-in method references that are verified to be native. */
	var DataView = getNative(root, 'DataView'),
	    Map = getNative(root, 'Map'),
	    Promise = getNative(root, 'Promise'),
	    Set = getNative(root, 'Set'),
	    WeakMap = getNative(root, 'WeakMap'),
	    nativeCreate = getNative(Object, 'create');

	/** Used to detect maps, sets, and weakmaps. */
	var dataViewCtorString = toSource(DataView),
	    mapCtorString = toSource(Map),
	    promiseCtorString = toSource(Promise),
	    setCtorString = toSource(Set),
	    weakMapCtorString = toSource(WeakMap);

	/** Used to convert symbols to primitives and strings. */
	var symbolProto = Symbol ? Symbol.prototype : undefined,
	    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

	/**
	 * Creates a hash object.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function Hash(entries) {
	  var index = -1,
	      length = entries ? entries.length : 0;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	/**
	 * Removes all key-value entries from the hash.
	 *
	 * @private
	 * @name clear
	 * @memberOf Hash
	 */
	function hashClear() {
	  this.__data__ = nativeCreate ? nativeCreate(null) : {};
	}

	/**
	 * Removes `key` and its value from the hash.
	 *
	 * @private
	 * @name delete
	 * @memberOf Hash
	 * @param {Object} hash The hash to modify.
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function hashDelete(key) {
	  return this.has(key) && delete this.__data__[key];
	}

	/**
	 * Gets the hash value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf Hash
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function hashGet(key) {
	  var data = this.__data__;
	  if (nativeCreate) {
	    var result = data[key];
	    return result === HASH_UNDEFINED ? undefined : result;
	  }
	  return hasOwnProperty.call(data, key) ? data[key] : undefined;
	}

	/**
	 * Checks if a hash value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf Hash
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function hashHas(key) {
	  var data = this.__data__;
	  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
	}

	/**
	 * Sets the hash `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf Hash
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the hash instance.
	 */
	function hashSet(key, value) {
	  var data = this.__data__;
	  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
	  return this;
	}

	// Add methods to `Hash`.
	Hash.prototype.clear = hashClear;
	Hash.prototype['delete'] = hashDelete;
	Hash.prototype.get = hashGet;
	Hash.prototype.has = hashHas;
	Hash.prototype.set = hashSet;

	/**
	 * Creates an list cache object.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function ListCache(entries) {
	  var index = -1,
	      length = entries ? entries.length : 0;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	/**
	 * Removes all key-value entries from the list cache.
	 *
	 * @private
	 * @name clear
	 * @memberOf ListCache
	 */
	function listCacheClear() {
	  this.__data__ = [];
	}

	/**
	 * Removes `key` and its value from the list cache.
	 *
	 * @private
	 * @name delete
	 * @memberOf ListCache
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function listCacheDelete(key) {
	  var data = this.__data__,
	      index = assocIndexOf(data, key);

	  if (index < 0) {
	    return false;
	  }
	  var lastIndex = data.length - 1;
	  if (index == lastIndex) {
	    data.pop();
	  } else {
	    splice.call(data, index, 1);
	  }
	  return true;
	}

	/**
	 * Gets the list cache value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf ListCache
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function listCacheGet(key) {
	  var data = this.__data__,
	      index = assocIndexOf(data, key);

	  return index < 0 ? undefined : data[index][1];
	}

	/**
	 * Checks if a list cache value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf ListCache
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function listCacheHas(key) {
	  return assocIndexOf(this.__data__, key) > -1;
	}

	/**
	 * Sets the list cache `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf ListCache
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the list cache instance.
	 */
	function listCacheSet(key, value) {
	  var data = this.__data__,
	      index = assocIndexOf(data, key);

	  if (index < 0) {
	    data.push([key, value]);
	  } else {
	    data[index][1] = value;
	  }
	  return this;
	}

	// Add methods to `ListCache`.
	ListCache.prototype.clear = listCacheClear;
	ListCache.prototype['delete'] = listCacheDelete;
	ListCache.prototype.get = listCacheGet;
	ListCache.prototype.has = listCacheHas;
	ListCache.prototype.set = listCacheSet;

	/**
	 * Creates a map cache object to store key-value pairs.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function MapCache(entries) {
	  var index = -1,
	      length = entries ? entries.length : 0;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	/**
	 * Removes all key-value entries from the map.
	 *
	 * @private
	 * @name clear
	 * @memberOf MapCache
	 */
	function mapCacheClear() {
	  this.__data__ = {
	    'hash': new Hash,
	    'map': new (Map || ListCache),
	    'string': new Hash
	  };
	}

	/**
	 * Removes `key` and its value from the map.
	 *
	 * @private
	 * @name delete
	 * @memberOf MapCache
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function mapCacheDelete(key) {
	  return getMapData(this, key)['delete'](key);
	}

	/**
	 * Gets the map value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf MapCache
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function mapCacheGet(key) {
	  return getMapData(this, key).get(key);
	}

	/**
	 * Checks if a map value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf MapCache
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function mapCacheHas(key) {
	  return getMapData(this, key).has(key);
	}

	/**
	 * Sets the map `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf MapCache
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the map cache instance.
	 */
	function mapCacheSet(key, value) {
	  getMapData(this, key).set(key, value);
	  return this;
	}

	// Add methods to `MapCache`.
	MapCache.prototype.clear = mapCacheClear;
	MapCache.prototype['delete'] = mapCacheDelete;
	MapCache.prototype.get = mapCacheGet;
	MapCache.prototype.has = mapCacheHas;
	MapCache.prototype.set = mapCacheSet;

	/**
	 * Creates a stack cache object to store key-value pairs.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function Stack(entries) {
	  this.__data__ = new ListCache(entries);
	}

	/**
	 * Removes all key-value entries from the stack.
	 *
	 * @private
	 * @name clear
	 * @memberOf Stack
	 */
	function stackClear() {
	  this.__data__ = new ListCache;
	}

	/**
	 * Removes `key` and its value from the stack.
	 *
	 * @private
	 * @name delete
	 * @memberOf Stack
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function stackDelete(key) {
	  return this.__data__['delete'](key);
	}

	/**
	 * Gets the stack value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf Stack
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function stackGet(key) {
	  return this.__data__.get(key);
	}

	/**
	 * Checks if a stack value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf Stack
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function stackHas(key) {
	  return this.__data__.has(key);
	}

	/**
	 * Sets the stack `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf Stack
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the stack cache instance.
	 */
	function stackSet(key, value) {
	  var cache = this.__data__;
	  if (cache instanceof ListCache) {
	    var pairs = cache.__data__;
	    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
	      pairs.push([key, value]);
	      return this;
	    }
	    cache = this.__data__ = new MapCache(pairs);
	  }
	  cache.set(key, value);
	  return this;
	}

	// Add methods to `Stack`.
	Stack.prototype.clear = stackClear;
	Stack.prototype['delete'] = stackDelete;
	Stack.prototype.get = stackGet;
	Stack.prototype.has = stackHas;
	Stack.prototype.set = stackSet;

	/**
	 * Creates an array of the enumerable property names of the array-like `value`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @param {boolean} inherited Specify returning inherited property names.
	 * @returns {Array} Returns the array of property names.
	 */
	function arrayLikeKeys(value, inherited) {
	  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
	  // Safari 9 makes `arguments.length` enumerable in strict mode.
	  var result = (isArray(value) || isArguments(value))
	    ? baseTimes(value.length, String)
	    : [];

	  var length = result.length,
	      skipIndexes = !!length;

	  for (var key in value) {
	    if ((inherited || hasOwnProperty.call(value, key)) &&
	        !(skipIndexes && (key == 'length' || isIndex(key, length)))) {
	      result.push(key);
	    }
	  }
	  return result;
	}

	/**
	 * Assigns `value` to `key` of `object` if the existing value is not equivalent
	 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	 * for equality comparisons.
	 *
	 * @private
	 * @param {Object} object The object to modify.
	 * @param {string} key The key of the property to assign.
	 * @param {*} value The value to assign.
	 */
	function assignValue(object, key, value) {
	  var objValue = object[key];
	  if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
	      (value === undefined && !(key in object))) {
	    object[key] = value;
	  }
	}

	/**
	 * Gets the index at which the `key` is found in `array` of key-value pairs.
	 *
	 * @private
	 * @param {Array} array The array to inspect.
	 * @param {*} key The key to search for.
	 * @returns {number} Returns the index of the matched value, else `-1`.
	 */
	function assocIndexOf(array, key) {
	  var length = array.length;
	  while (length--) {
	    if (eq(array[length][0], key)) {
	      return length;
	    }
	  }
	  return -1;
	}

	/**
	 * The base implementation of `_.assign` without support for multiple sources
	 * or `customizer` functions.
	 *
	 * @private
	 * @param {Object} object The destination object.
	 * @param {Object} source The source object.
	 * @returns {Object} Returns `object`.
	 */
	function baseAssign(object, source) {
	  return object && copyObject(source, keys(source), object);
	}

	/**
	 * The base implementation of `_.clone` and `_.cloneDeep` which tracks
	 * traversed objects.
	 *
	 * @private
	 * @param {*} value The value to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @param {boolean} [isFull] Specify a clone including symbols.
	 * @param {Function} [customizer] The function to customize cloning.
	 * @param {string} [key] The key of `value`.
	 * @param {Object} [object] The parent object of `value`.
	 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
	 * @returns {*} Returns the cloned value.
	 */
	function baseClone(value, isDeep, isFull, customizer, key, object, stack) {
	  var result;
	  if (customizer) {
	    result = object ? customizer(value, key, object, stack) : customizer(value);
	  }
	  if (result !== undefined) {
	    return result;
	  }
	  if (!isObject(value)) {
	    return value;
	  }
	  var isArr = isArray(value);
	  if (isArr) {
	    result = initCloneArray(value);
	    if (!isDeep) {
	      return copyArray(value, result);
	    }
	  } else {
	    var tag = getTag(value),
	        isFunc = tag == funcTag || tag == genTag;

	    if (isBuffer(value)) {
	      return cloneBuffer(value, isDeep);
	    }
	    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
	      if (isHostObject(value)) {
	        return object ? value : {};
	      }
	      result = initCloneObject(isFunc ? {} : value);
	      if (!isDeep) {
	        return copySymbols(value, baseAssign(result, value));
	      }
	    } else {
	      if (!cloneableTags[tag]) {
	        return object ? value : {};
	      }
	      result = initCloneByTag(value, tag, baseClone, isDeep);
	    }
	  }
	  // Check for circular references and return its corresponding clone.
	  stack || (stack = new Stack);
	  var stacked = stack.get(value);
	  if (stacked) {
	    return stacked;
	  }
	  stack.set(value, result);

	  if (!isArr) {
	    var props = isFull ? getAllKeys(value) : keys(value);
	  }
	  arrayEach(props || value, function(subValue, key) {
	    if (props) {
	      key = subValue;
	      subValue = value[key];
	    }
	    // Recursively populate clone (susceptible to call stack limits).
	    assignValue(result, key, baseClone(subValue, isDeep, isFull, customizer, key, value, stack));
	  });
	  return result;
	}

	/**
	 * The base implementation of `_.create` without support for assigning
	 * properties to the created object.
	 *
	 * @private
	 * @param {Object} prototype The object to inherit from.
	 * @returns {Object} Returns the new object.
	 */
	function baseCreate(proto) {
	  return isObject(proto) ? objectCreate(proto) : {};
	}

	/**
	 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
	 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
	 * symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @param {Function} keysFunc The function to get the keys of `object`.
	 * @param {Function} symbolsFunc The function to get the symbols of `object`.
	 * @returns {Array} Returns the array of property names and symbols.
	 */
	function baseGetAllKeys(object, keysFunc, symbolsFunc) {
	  var result = keysFunc(object);
	  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
	}

	/**
	 * The base implementation of `getTag`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {string} Returns the `toStringTag`.
	 */
	function baseGetTag(value) {
	  return objectToString.call(value);
	}

	/**
	 * The base implementation of `_.isNative` without bad shim checks.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a native function,
	 *  else `false`.
	 */
	function baseIsNative(value) {
	  if (!isObject(value) || isMasked(value)) {
	    return false;
	  }
	  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
	  return pattern.test(toSource(value));
	}

	/**
	 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 */
	function baseKeys(object) {
	  if (!isPrototype(object)) {
	    return nativeKeys(object);
	  }
	  var result = [];
	  for (var key in Object(object)) {
	    if (hasOwnProperty.call(object, key) && key != 'constructor') {
	      result.push(key);
	    }
	  }
	  return result;
	}

	/**
	 * Creates a clone of  `buffer`.
	 *
	 * @private
	 * @param {Buffer} buffer The buffer to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Buffer} Returns the cloned buffer.
	 */
	function cloneBuffer(buffer, isDeep) {
	  if (isDeep) {
	    return buffer.slice();
	  }
	  var result = new buffer.constructor(buffer.length);
	  buffer.copy(result);
	  return result;
	}

	/**
	 * Creates a clone of `arrayBuffer`.
	 *
	 * @private
	 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
	 * @returns {ArrayBuffer} Returns the cloned array buffer.
	 */
	function cloneArrayBuffer(arrayBuffer) {
	  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
	  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
	  return result;
	}

	/**
	 * Creates a clone of `dataView`.
	 *
	 * @private
	 * @param {Object} dataView The data view to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned data view.
	 */
	function cloneDataView(dataView, isDeep) {
	  var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
	  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
	}

	/**
	 * Creates a clone of `map`.
	 *
	 * @private
	 * @param {Object} map The map to clone.
	 * @param {Function} cloneFunc The function to clone values.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned map.
	 */
	function cloneMap(map, isDeep, cloneFunc) {
	  var array = isDeep ? cloneFunc(mapToArray(map), true) : mapToArray(map);
	  return arrayReduce(array, addMapEntry, new map.constructor);
	}

	/**
	 * Creates a clone of `regexp`.
	 *
	 * @private
	 * @param {Object} regexp The regexp to clone.
	 * @returns {Object} Returns the cloned regexp.
	 */
	function cloneRegExp(regexp) {
	  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
	  result.lastIndex = regexp.lastIndex;
	  return result;
	}

	/**
	 * Creates a clone of `set`.
	 *
	 * @private
	 * @param {Object} set The set to clone.
	 * @param {Function} cloneFunc The function to clone values.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned set.
	 */
	function cloneSet(set, isDeep, cloneFunc) {
	  var array = isDeep ? cloneFunc(setToArray(set), true) : setToArray(set);
	  return arrayReduce(array, addSetEntry, new set.constructor);
	}

	/**
	 * Creates a clone of the `symbol` object.
	 *
	 * @private
	 * @param {Object} symbol The symbol object to clone.
	 * @returns {Object} Returns the cloned symbol object.
	 */
	function cloneSymbol(symbol) {
	  return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
	}

	/**
	 * Creates a clone of `typedArray`.
	 *
	 * @private
	 * @param {Object} typedArray The typed array to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned typed array.
	 */
	function cloneTypedArray(typedArray, isDeep) {
	  var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
	  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
	}

	/**
	 * Copies the values of `source` to `array`.
	 *
	 * @private
	 * @param {Array} source The array to copy values from.
	 * @param {Array} [array=[]] The array to copy values to.
	 * @returns {Array} Returns `array`.
	 */
	function copyArray(source, array) {
	  var index = -1,
	      length = source.length;

	  array || (array = Array(length));
	  while (++index < length) {
	    array[index] = source[index];
	  }
	  return array;
	}

	/**
	 * Copies properties of `source` to `object`.
	 *
	 * @private
	 * @param {Object} source The object to copy properties from.
	 * @param {Array} props The property identifiers to copy.
	 * @param {Object} [object={}] The object to copy properties to.
	 * @param {Function} [customizer] The function to customize copied values.
	 * @returns {Object} Returns `object`.
	 */
	function copyObject(source, props, object, customizer) {
	  object || (object = {});

	  var index = -1,
	      length = props.length;

	  while (++index < length) {
	    var key = props[index];

	    var newValue = customizer
	      ? customizer(object[key], source[key], key, object, source)
	      : undefined;

	    assignValue(object, key, newValue === undefined ? source[key] : newValue);
	  }
	  return object;
	}

	/**
	 * Copies own symbol properties of `source` to `object`.
	 *
	 * @private
	 * @param {Object} source The object to copy symbols from.
	 * @param {Object} [object={}] The object to copy symbols to.
	 * @returns {Object} Returns `object`.
	 */
	function copySymbols(source, object) {
	  return copyObject(source, getSymbols(source), object);
	}

	/**
	 * Creates an array of own enumerable property names and symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names and symbols.
	 */
	function getAllKeys(object) {
	  return baseGetAllKeys(object, keys, getSymbols);
	}

	/**
	 * Gets the data for `map`.
	 *
	 * @private
	 * @param {Object} map The map to query.
	 * @param {string} key The reference key.
	 * @returns {*} Returns the map data.
	 */
	function getMapData(map, key) {
	  var data = map.__data__;
	  return isKeyable(key)
	    ? data[typeof key == 'string' ? 'string' : 'hash']
	    : data.map;
	}

	/**
	 * Gets the native function at `key` of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @param {string} key The key of the method to get.
	 * @returns {*} Returns the function if it's native, else `undefined`.
	 */
	function getNative(object, key) {
	  var value = getValue(object, key);
	  return baseIsNative(value) ? value : undefined;
	}

	/**
	 * Creates an array of the own enumerable symbol properties of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of symbols.
	 */
	var getSymbols = nativeGetSymbols ? overArg(nativeGetSymbols, Object) : stubArray;

	/**
	 * Gets the `toStringTag` of `value`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {string} Returns the `toStringTag`.
	 */
	var getTag = baseGetTag;

	// Fallback for data views, maps, sets, and weak maps in IE 11,
	// for data views in Edge < 14, and promises in Node.js.
	if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
	    (Map && getTag(new Map) != mapTag) ||
	    (Promise && getTag(Promise.resolve()) != promiseTag) ||
	    (Set && getTag(new Set) != setTag) ||
	    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
	  getTag = function(value) {
	    var result = objectToString.call(value),
	        Ctor = result == objectTag ? value.constructor : undefined,
	        ctorString = Ctor ? toSource(Ctor) : undefined;

	    if (ctorString) {
	      switch (ctorString) {
	        case dataViewCtorString: return dataViewTag;
	        case mapCtorString: return mapTag;
	        case promiseCtorString: return promiseTag;
	        case setCtorString: return setTag;
	        case weakMapCtorString: return weakMapTag;
	      }
	    }
	    return result;
	  };
	}

	/**
	 * Initializes an array clone.
	 *
	 * @private
	 * @param {Array} array The array to clone.
	 * @returns {Array} Returns the initialized clone.
	 */
	function initCloneArray(array) {
	  var length = array.length,
	      result = array.constructor(length);

	  // Add properties assigned by `RegExp#exec`.
	  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
	    result.index = array.index;
	    result.input = array.input;
	  }
	  return result;
	}

	/**
	 * Initializes an object clone.
	 *
	 * @private
	 * @param {Object} object The object to clone.
	 * @returns {Object} Returns the initialized clone.
	 */
	function initCloneObject(object) {
	  return (typeof object.constructor == 'function' && !isPrototype(object))
	    ? baseCreate(getPrototype(object))
	    : {};
	}

	/**
	 * Initializes an object clone based on its `toStringTag`.
	 *
	 * **Note:** This function only supports cloning values with tags of
	 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
	 *
	 * @private
	 * @param {Object} object The object to clone.
	 * @param {string} tag The `toStringTag` of the object to clone.
	 * @param {Function} cloneFunc The function to clone values.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the initialized clone.
	 */
	function initCloneByTag(object, tag, cloneFunc, isDeep) {
	  var Ctor = object.constructor;
	  switch (tag) {
	    case arrayBufferTag:
	      return cloneArrayBuffer(object);

	    case boolTag:
	    case dateTag:
	      return new Ctor(+object);

	    case dataViewTag:
	      return cloneDataView(object, isDeep);

	    case float32Tag: case float64Tag:
	    case int8Tag: case int16Tag: case int32Tag:
	    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
	      return cloneTypedArray(object, isDeep);

	    case mapTag:
	      return cloneMap(object, isDeep, cloneFunc);

	    case numberTag:
	    case stringTag:
	      return new Ctor(object);

	    case regexpTag:
	      return cloneRegExp(object);

	    case setTag:
	      return cloneSet(object, isDeep, cloneFunc);

	    case symbolTag:
	      return cloneSymbol(object);
	  }
	}

	/**
	 * Checks if `value` is a valid array-like index.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
	 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
	 */
	function isIndex(value, length) {
	  length = length == null ? MAX_SAFE_INTEGER : length;
	  return !!length &&
	    (typeof value == 'number' || reIsUint.test(value)) &&
	    (value > -1 && value % 1 == 0 && value < length);
	}

	/**
	 * Checks if `value` is suitable for use as unique object key.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
	 */
	function isKeyable(value) {
	  var type = typeof value;
	  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
	    ? (value !== '__proto__')
	    : (value === null);
	}

	/**
	 * Checks if `func` has its source masked.
	 *
	 * @private
	 * @param {Function} func The function to check.
	 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
	 */
	function isMasked(func) {
	  return !!maskSrcKey && (maskSrcKey in func);
	}

	/**
	 * Checks if `value` is likely a prototype object.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
	 */
	function isPrototype(value) {
	  var Ctor = value && value.constructor,
	      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

	  return value === proto;
	}

	/**
	 * Converts `func` to its source code.
	 *
	 * @private
	 * @param {Function} func The function to process.
	 * @returns {string} Returns the source code.
	 */
	function toSource(func) {
	  if (func != null) {
	    try {
	      return funcToString.call(func);
	    } catch (e) {}
	    try {
	      return (func + '');
	    } catch (e) {}
	  }
	  return '';
	}

	/**
	 * This method is like `_.clone` except that it recursively clones `value`.
	 *
	 * @static
	 * @memberOf _
	 * @since 1.0.0
	 * @category Lang
	 * @param {*} value The value to recursively clone.
	 * @returns {*} Returns the deep cloned value.
	 * @see _.clone
	 * @example
	 *
	 * var objects = [{ 'a': 1 }, { 'b': 2 }];
	 *
	 * var deep = _.cloneDeep(objects);
	 * console.log(deep[0] === objects[0]);
	 * // => false
	 */
	function cloneDeep(value) {
	  return baseClone(value, true, true);
	}

	/**
	 * Performs a
	 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	 * comparison between two values to determine if they are equivalent.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to compare.
	 * @param {*} other The other value to compare.
	 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
	 * @example
	 *
	 * var object = { 'a': 1 };
	 * var other = { 'a': 1 };
	 *
	 * _.eq(object, object);
	 * // => true
	 *
	 * _.eq(object, other);
	 * // => false
	 *
	 * _.eq('a', 'a');
	 * // => true
	 *
	 * _.eq('a', Object('a'));
	 * // => false
	 *
	 * _.eq(NaN, NaN);
	 * // => true
	 */
	function eq(value, other) {
	  return value === other || (value !== value && other !== other);
	}

	/**
	 * Checks if `value` is likely an `arguments` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
	 *  else `false`.
	 * @example
	 *
	 * _.isArguments(function() { return arguments; }());
	 * // => true
	 *
	 * _.isArguments([1, 2, 3]);
	 * // => false
	 */
	function isArguments(value) {
	  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
	  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
	    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
	}

	/**
	 * Checks if `value` is classified as an `Array` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
	 * @example
	 *
	 * _.isArray([1, 2, 3]);
	 * // => true
	 *
	 * _.isArray(document.body.children);
	 * // => false
	 *
	 * _.isArray('abc');
	 * // => false
	 *
	 * _.isArray(_.noop);
	 * // => false
	 */
	var isArray = Array.isArray;

	/**
	 * Checks if `value` is array-like. A value is considered array-like if it's
	 * not a function and has a `value.length` that's an integer greater than or
	 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
	 * @example
	 *
	 * _.isArrayLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isArrayLike(document.body.children);
	 * // => true
	 *
	 * _.isArrayLike('abc');
	 * // => true
	 *
	 * _.isArrayLike(_.noop);
	 * // => false
	 */
	function isArrayLike(value) {
	  return value != null && isLength(value.length) && !isFunction(value);
	}

	/**
	 * This method is like `_.isArrayLike` except that it also checks if `value`
	 * is an object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an array-like object,
	 *  else `false`.
	 * @example
	 *
	 * _.isArrayLikeObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isArrayLikeObject(document.body.children);
	 * // => true
	 *
	 * _.isArrayLikeObject('abc');
	 * // => false
	 *
	 * _.isArrayLikeObject(_.noop);
	 * // => false
	 */
	function isArrayLikeObject(value) {
	  return isObjectLike(value) && isArrayLike(value);
	}

	/**
	 * Checks if `value` is a buffer.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.3.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
	 * @example
	 *
	 * _.isBuffer(new Buffer(2));
	 * // => true
	 *
	 * _.isBuffer(new Uint8Array(2));
	 * // => false
	 */
	var isBuffer = nativeIsBuffer || stubFalse;

	/**
	 * Checks if `value` is classified as a `Function` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
	 * @example
	 *
	 * _.isFunction(_);
	 * // => true
	 *
	 * _.isFunction(/abc/);
	 * // => false
	 */
	function isFunction(value) {
	  // The use of `Object#toString` avoids issues with the `typeof` operator
	  // in Safari 8-9 which returns 'object' for typed array and other constructors.
	  var tag = isObject(value) ? objectToString.call(value) : '';
	  return tag == funcTag || tag == genTag;
	}

	/**
	 * Checks if `value` is a valid array-like length.
	 *
	 * **Note:** This method is loosely based on
	 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
	 * @example
	 *
	 * _.isLength(3);
	 * // => true
	 *
	 * _.isLength(Number.MIN_VALUE);
	 * // => false
	 *
	 * _.isLength(Infinity);
	 * // => false
	 *
	 * _.isLength('3');
	 * // => false
	 */
	function isLength(value) {
	  return typeof value == 'number' &&
	    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
	}

	/**
	 * Checks if `value` is the
	 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
	 * @example
	 *
	 * _.isObject({});
	 * // => true
	 *
	 * _.isObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isObject(_.noop);
	 * // => true
	 *
	 * _.isObject(null);
	 * // => false
	 */
	function isObject(value) {
	  var type = typeof value;
	  return !!value && (type == 'object' || type == 'function');
	}

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */
	function isObjectLike(value) {
	  return !!value && typeof value == 'object';
	}

	/**
	 * Creates an array of the own enumerable property names of `object`.
	 *
	 * **Note:** Non-object values are coerced to objects. See the
	 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
	 * for more details.
	 *
	 * @static
	 * @since 0.1.0
	 * @memberOf _
	 * @category Object
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 * @example
	 *
	 * function Foo() {
	 *   this.a = 1;
	 *   this.b = 2;
	 * }
	 *
	 * Foo.prototype.c = 3;
	 *
	 * _.keys(new Foo);
	 * // => ['a', 'b'] (iteration order is not guaranteed)
	 *
	 * _.keys('hi');
	 * // => ['0', '1']
	 */
	function keys(object) {
	  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
	}

	/**
	 * This method returns a new empty array.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.13.0
	 * @category Util
	 * @returns {Array} Returns the new empty array.
	 * @example
	 *
	 * var arrays = _.times(2, _.stubArray);
	 *
	 * console.log(arrays);
	 * // => [[], []]
	 *
	 * console.log(arrays[0] === arrays[1]);
	 * // => false
	 */
	function stubArray() {
	  return [];
	}

	/**
	 * This method returns `false`.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.13.0
	 * @category Util
	 * @returns {boolean} Returns `false`.
	 * @example
	 *
	 * _.times(2, _.stubFalse);
	 * // => [false, false]
	 */
	function stubFalse() {
	  return false;
	}

	module.exports = cloneDeep;
} (lodash_clonedeep, lodash_clonedeepExports));

var cloneDeep = lodash_clonedeepExports;

function deepClone(object) {
    // if (typeof window !== 'undefined' && typeof window.structuredClone === 'function') {
    //   return window.structuredClone(object);
    // }
    return cloneDeep(object);
}

function splitBlock(editor, options = {}) {
    const { focus = true } = options;
    const blockToSplit = findPluginBlockByPath(editor);
    const slate = options.slate || findSlateBySelectionPath(editor);
    if (!slate || !blockToSplit)
        return;
    Editor$1.withoutNormalizing(slate, () => {
        if (!slate.selection)
            return;
        const originalSlateChildren = deepClone(slate.children);
        const operations = [];
        const [splitValue, nextSlateValue] = splitSlate(slate.children, slate.selection);
        const nextBlock = {
            id: generateId(),
            type: blockToSplit.type,
            meta: {
                order: blockToSplit.meta.order + 1,
                depth: blockToSplit.meta.depth,
                align: blockToSplit.meta.align,
            },
            value: [],
        };
        operations.push({
            type: 'split_block',
            prevProperties: {
                originalBlock: blockToSplit,
                originalValue: originalSlateChildren,
            },
            properties: {
                nextBlock: nextBlock,
                nextSlateValue: !nextSlateValue ? [buildSlateNodeElement('paragraph')] : nextSlateValue,
                splitSlateValue: splitValue,
            },
            path: editor.path,
        });
        editor.applyTransforms(operations);
        if (focus) {
            editor.focusBlock(nextBlock.id);
        }
    });
}
function splitSlate(slateChildren, slateSelection) {
    const { path, offset } = slateSelection.focus;
    const [, ...childPath] = path;
    const firstPart = JSON.parse(JSON.stringify(slateChildren[0]));
    function splitNode(node, remainingPath, currentOffset) {
        if (remainingPath.length === 0) {
            if (Node$1.string(node).length <= currentOffset) {
                return [node, null];
            }
            if ('text' in node) {
                return [
                    Object.assign(Object.assign({}, node), { text: node.text.slice(0, currentOffset) }),
                    Object.assign(Object.assign({}, node), { text: node.text.slice(currentOffset) }),
                ];
            }
            else if (node.type === 'link') {
                const [leftChild, rightChild] = splitNode(node.children[0], [], currentOffset);
                return [
                    Object.assign(Object.assign({}, node), { children: [leftChild] }),
                    Object.assign(Object.assign({}, node), { children: [rightChild] }),
                ];
            }
        }
        else {
            const [childIndex, ...nextPath] = remainingPath;
            const [left, right] = splitNode(node.children[childIndex], nextPath, currentOffset);
            const leftChildren = node.children.slice(0, childIndex).concat(left ? [left] : []);
            const rightChildren = (right ? [right] : []).concat(node.children.slice(childIndex + 1));
            return [
                Object.assign(Object.assign({}, node), { children: leftChildren }),
                Object.assign(Object.assign({}, node), { children: rightChildren }),
            ];
        }
    }
    const [leftContent, rightContent] = splitNode(firstPart, childPath, offset);
    function cleanNode(node) {
        if ('children' in node) {
            node.children = node.children.filter((child) => (child.text !== '' && child.text !== undefined) || (child.children && child.children.length > 0));
            node.children.forEach(cleanNode);
        }
        return node;
    }
    return [cleanNode(leftContent), cleanNode(rightContent)]
        .map((part) => [part])
        .filter((part) => part[0].children.length > 0);
}

function increaseBlockDepth(editor, options = {}) {
    const { at = editor.path.current, blockId } = options;
    const block = blockId ? editor.children[blockId] : findPluginBlockByPath(editor, { at });
    if (!block)
        return;
    const newDepth = block.meta.depth + 1;
    const operation = {
        type: 'set_block_meta',
        id: block.id,
        properties: { depth: newDepth },
        prevProperties: { depth: block.meta.depth },
    };
    editor.applyTransforms([operation]);
}

function decreaseBlockDepth(editor, options = {}) {
    const { at = editor.path.current, blockId } = options;
    const block = blockId ? editor.children[blockId] : findPluginBlockByPath(editor, { at });
    if (!block)
        return;
    const newDepth = Math.max(0, block.meta.depth - 1);
    const operation = {
        type: 'set_block_meta',
        id: block.id,
        properties: { depth: newDepth },
        prevProperties: { depth: block.meta.depth },
    };
    editor.applyTransforms([operation]);
}

function getEditorValue(editor) {
    return editor.children;
}

function validateYooptaValue(value) {
    if (!value)
        return false;
    if (typeof value !== 'object')
        return false;
    if (Array.isArray(value))
        return false;
    return true;
}

function duplicateBlock(editor, options) {
    const { original, focus, at } = options;
    if (!original) {
        throw new Error('`original` should be provided');
    }
    if (!original.blockId && typeof original.path !== 'number') {
        throw new Error('blockId or path should be provided');
    }
    const { blockId, path } = original;
    let originalBlock = blockId
        ? editor.children[blockId]
        : findPluginBlockByPath(editor, { at: path });
    if (!originalBlock) {
        throw new Error('Block not found');
    }
    const operations = [];
    const duplicatedBlock = deepClone(originalBlock);
    duplicatedBlock.id = generateId();
    // [TEST]
    duplicatedBlock.meta.order = Array.isArray(at) && typeof at === 'number' ? at : originalBlock.meta.order + 1;
    operations.push({
        type: 'insert_block',
        path: { current: duplicatedBlock.meta.order },
        block: duplicatedBlock,
    });
    editor.applyTransforms(operations);
    if (focus) {
        editor.focusBlock(duplicatedBlock.id, { waitExecution: true });
    }
    return duplicatedBlock.id;
}

// Maybe add source pararmeter to this function?
function updateBlock(editor, blockId, newData) {
    const block = editor.children[blockId];
    if (!block) {
        console.warn(`Block with id ${blockId} does not exist.`);
        return;
    }
    const updateBlockMetaOperation = {
        type: 'set_block_meta',
        id: blockId,
        properties: {},
        prevProperties: {},
    };
    const updateBlockValueOperation = {
        type: 'set_block_value',
        id: blockId,
        value: [],
    };
    if (newData.meta) {
        updateBlockMetaOperation.prevProperties = block.meta;
        updateBlockMetaOperation.properties = Object.assign(Object.assign({}, block.meta), newData.meta);
    }
    if (newData.value) {
        updateBlockValueOperation.value = newData.value;
    }
    const operations = [];
    if (Object.keys(updateBlockMetaOperation.properties).length) {
        operations.push(updateBlockMetaOperation);
    }
    if (updateBlockValueOperation.value.length) {
        operations.push(updateBlockValueOperation);
    }
    if (operations.length > 0) {
        editor.applyTransforms(operations, { validatePaths: false });
    }
}

const withShortcuts = (editor, slate) => {
    const { insertText } = slate;
    slate.insertText = (text) => {
        var _a;
        const { selection } = slate;
        if (text === ' ' && selection && Range.isCollapsed(selection)) {
            const { anchor } = selection;
            const blockEntry = Editor$1.above(slate, {
                match: (n) => Element$1.isElement(n) && Editor$1.isBlock(slate, n),
                mode: 'lowest',
            });
            if (!blockEntry)
                return;
            const [, currentNodePath] = blockEntry;
            const parentEntry = Editor$1.parent(slate, currentNodePath);
            const [parentNodeElement] = parentEntry;
            if (Element$1.isElement(parentNodeElement) && !Text.isText(parentNodeElement.children[0])) {
                return insertText(text);
            }
            const path = blockEntry ? currentNodePath : [];
            const start = Editor$1.start(slate, path);
            const range = { anchor, focus: start };
            const beforeText = Editor$1.string(slate, range);
            const matchedBlock = (_a = editor.shortcuts) === null || _a === void 0 ? void 0 : _a[beforeText];
            const hasMatchedBlock = !!matchedBlock;
            if (hasMatchedBlock && !matchedBlock.isActive()) {
                Transforms.select(slate, range);
                Transforms.delete(slate);
                // [TEST]
                editor.toggleBlock(matchedBlock.type, { deleteText: true, focus: true });
                return;
            }
        }
        insertText(text);
    };
    return slate;
};

// [TODO] - add slate structure from block to add elements into slate.children
function buildSlateEditor(editor) {
    const slate = withShortcuts(editor, withReact(createEditor()));
    return slate;
}

const DEFAULT_BLOCK_TYPE = 'Paragraph';
function extractTextNodes(slate, node, blockData, editor) {
    const blockEntity = editor.plugins[blockData.type];
    if (blockEntity === null || blockEntity === void 0 ? void 0 : blockEntity.customEditor) {
        return blockData.value[0].children;
    }
    if (Editor$1.isEditor(node))
        return node.children.flatMap((child) => extractTextNodes(slate, child, blockData, editor));
    if (!Element$1.isElement(node))
        return [node];
    if (Editor$1.isInline(slate, node))
        return [node];
    return node.children.flatMap((child) => extractTextNodes(slate, child, blockData, editor));
}
function findFirstLeaf(node) {
    if (!Element$1.isElement(node)) {
        return null;
    }
    if (node.children.length === 0 || Text.isText(node.children[0])) {
        return node;
    }
    return findFirstLeaf(node.children[0]);
}
function toggleBlock(editor, toBlockTypeArg, options = {}) {
    const fromBlock = findPluginBlockByPath(editor, { at: options.at || editor.path.current });
    if (!fromBlock)
        throw new Error('Block not found at current selection');
    let toBlockType = fromBlock.type === toBlockTypeArg ? DEFAULT_BLOCK_TYPE : toBlockTypeArg;
    const plugin = editor.plugins[toBlockType];
    const { onBeforeCreate } = plugin.events || {};
    const slate = findSlateBySelectionPath(editor, { at: fromBlock.meta.order });
    if (!slate)
        throw new Error(`Slate not found for block in position ${fromBlock.meta.order}`);
    const toBlockSlateStructure = (onBeforeCreate === null || onBeforeCreate === void 0 ? void 0 : onBeforeCreate(editor)) || buildBlockElementsStructure(editor, toBlockType);
    const textNodes = extractTextNodes(slate, slate.children[0], fromBlock, editor);
    const firstLeaf = findFirstLeaf(toBlockSlateStructure);
    if (firstLeaf) {
        firstLeaf.children = textNodes;
    }
    const newBlock = {
        id: generateId(),
        type: toBlockType,
        meta: Object.assign(Object.assign({}, fromBlock.meta), { align: undefined }),
        value: [toBlockSlateStructure],
    };
    const newSlate = buildSlateEditor(editor);
    newSlate.children = [toBlockSlateStructure];
    const operations = [
        { type: 'delete_block', block: fromBlock, path: { current: fromBlock.meta.order } },
        { type: 'insert_block', path: { current: fromBlock.meta.order }, block: newBlock },
    ];
    editor.applyTransforms(operations);
    // [TEST]
    if (options.deleteText) {
        Transforms.delete(newSlate, { at: [0, 0] });
    }
    if (options.focus) {
        editor.focusBlock(newBlock.id);
    }
    return newBlock.id;
}

function getBlock(editor, options) {
    if (!(options === null || options === void 0 ? void 0 : options.id) && typeof (options === null || options === void 0 ? void 0 : options.at) !== 'number') {
        throw new Error('getBlock requires either an id or at');
    }
    if (options === null || options === void 0 ? void 0 : options.id) {
        return editor.children[options === null || options === void 0 ? void 0 : options.id];
    }
    const childrenKeys = Object.keys(editor.children);
    const blockId = childrenKeys.find((childrenId) => {
        const plugin = editor.children[childrenId];
        return plugin.meta.order === (options === null || options === void 0 ? void 0 : options.at);
    });
    if (!blockId)
        return null;
    return editor.children[blockId];
}

function getElementEntry(editor, blockId, options) {
    const block = editor.children[blockId];
    if (!block) {
        throw new Error(`Block with id ${blockId} not found`);
    }
    const slate = findSlateBySelectionPath(editor, { at: block.meta.order });
    if (!slate) {
        console.warn('No slate found');
        return;
    }
    let match = (n) => Element$1.isElement(n);
    if (options === null || options === void 0 ? void 0 : options.type) {
        match = (n) => Element$1.isElement(n) && n.type === (options === null || options === void 0 ? void 0 : options.type);
    }
    try {
        // to Editor.above
        const [elementEntry] = Editor$1.nodes(slate, {
            at: (options === null || options === void 0 ? void 0 : options.path) || slate.selection || [0],
            match,
            mode: 'lowest',
        });
        return elementEntry;
    }
    catch (error) { }
}

function createElement(editor, blockId, element, options) {
    const blockData = editor.children[blockId];
    if (!blockData) {
        throw new Error(`Block with id ${blockId} not found`);
    }
    const slate = findSlateBySelectionPath(editor, { at: blockData.meta.order });
    if (!slate) {
        console.warn('No slate found');
        return;
    }
    Editor$1.withoutNormalizing(slate, () => {
        const block = editor.blocks[blockData.type];
        const blockElement = block.elements[element.type];
        const nodeElement = buildBlockElement$1({ type: element.type, props: Object.assign(Object.assign({}, blockElement.props), element.props) });
        const elementTypes = Object.keys(block.elements);
        let childrenElements = [];
        elementTypes.forEach((blockElementType) => {
            const blockElement = block.elements[blockElementType];
            if (blockElementType === element.type) {
                if (Array.isArray(blockElement.children) && blockElement.children.length > 0) {
                    blockElement.children.forEach((childElementType) => {
                        const childElement = block.elements[childElementType];
                        childrenElements.push(buildBlockElement$1({ type: childElementType, props: childElement.props }));
                    });
                }
            }
        });
        if (childrenElements.length > 0)
            nodeElement.children = childrenElements;
        const { path, focus = true } = options || {};
        let atPath;
        const elementEntry = getElementEntry(editor, blockId, { type: element.type });
        if (elementEntry) {
            const [, elementPath] = elementEntry;
            if (Path.isPath(path)) {
                atPath = path;
            }
            else if (path === 'prev') {
                atPath = Path.previous(elementPath);
            }
            else if (path === 'next') {
                atPath = Path.next(elementPath);
            }
        }
        Transforms.insertNodes(slate, nodeElement, { at: atPath, select: focus });
        if (focus) {
            if (childrenElements.length > 0) {
                const firstChild = childrenElements[0];
                const firstElementEntry = getElementEntry(editor, blockId, {
                    path: atPath,
                    type: firstChild.type,
                });
                if (firstElementEntry) {
                    const [, firstElementPath] = firstElementEntry;
                    Transforms.select(slate, firstElementPath);
                }
            }
        }
        // editor.emit('change', { value: editor.children, operations: [] });
    });
}

function deleteElement(editor, blockId, element) {
    const block = editor.children[blockId];
    if (!block) {
        throw new Error(`Block with id ${blockId} not found`);
    }
    const slate = findSlateBySelectionPath(editor, { at: block.meta.order });
    if (!slate) {
        console.warn('No slate found');
        return;
    }
    Editor$1.withoutNormalizing(slate, () => {
        Transforms.removeNodes(slate, {
            at: element.path,
            match: (n) => Element$1.isElement(n) && n.type === element.type,
        });
        // editor.emit('change', { value: editor.children, operations: [] });
    });
}

function updateElement(editor, blockId, element, options) {
    const block = editor.children[blockId];
    if (!block) {
        throw new Error(`Block with id ${blockId} not found`);
    }
    const slate = findSlateBySelectionPath(editor, { at: block.meta.order });
    if (!slate) {
        console.warn('No slate found');
        return;
    }
    Editor$1.withoutNormalizing(slate, () => {
        const [elementEntry] = Editor$1.nodes(slate, {
            at: (options === null || options === void 0 ? void 0 : options.path) || [0],
            match: (n) => Element$1.isElement(n) && n.type === element.type,
        });
        const elementToUpdate = elementEntry === null || elementEntry === void 0 ? void 0 : elementEntry[0];
        const elementToUpdatePath = elementEntry === null || elementEntry === void 0 ? void 0 : elementEntry[1];
        const props = (elementToUpdate === null || elementToUpdate === void 0 ? void 0 : elementToUpdate.props) || {};
        const updatedElement = { props: Object.assign(Object.assign({}, props), element.props) };
        Transforms.setNodes(slate, updatedElement, {
            at: (options === null || options === void 0 ? void 0 : options.path) || elementToUpdatePath || [0],
            match: (n) => Element$1.isElement(n) && n.type === element.type,
            mode: 'lowest',
        });
        // editor.emit('change', { value: editor.children, operations: [] });
    });
}

function insertElementText(editor, text, options) {
    const { blockId, focus } = options || {};
    const blockData = blockId ? editor.children[blockId] : findPluginBlockByPath(editor);
    if (!blockData) {
        console.warn(`To set text programmatically, you must provide a valid blockId. Got: ${blockId}`);
        return;
    }
    const slate = findSlateBySelectionPath(editor, { at: blockData.meta.order });
    if (!slate) {
        console.warn('No slate found');
        return;
    }
    const block = editor.blocks[blockData.type];
    const latestBlockElementPath = Array.from({ length: Object.keys(block.elements).length }, (_) => 0);
    let path = slate.selection || latestBlockElementPath;
    if (!path) {
        console.warn('No valid path or selection found for text insertion');
        return;
    }
    Editor$1.withoutNormalizing(slate, () => {
        if (Range.isRange(path) && !Range.isCollapsed(path)) {
            Transforms.collapse(slate, { edge: 'end' });
        }
        Transforms.insertText(slate, text, { at: path });
        // editor.emit('change', { value: editor.children, operations: [] });
        if (focus) {
            editor.focusBlock(blockData.id, { waitExecution: true, shouldUpdateBlockPath: true });
        }
    });
}

function getElement(editor, blockId, options) {
    const elementEntry = getElementEntry(editor, blockId, options);
    if (elementEntry) {
        return elementEntry[0];
    }
    return undefined;
}

function getElementChildren(editor, blockId, options) {
    const element = getElement(editor, blockId, options);
    if (element)
        return element.children;
    return undefined;
}

function getElementPath(editor, blockId, element) {
    const block = editor.children[blockId];
    if (!block) {
        throw new Error(`Block with id ${blockId} not found`);
    }
    const slate = findSlateBySelectionPath(editor, { at: block.meta.order });
    if (!slate) {
        console.warn('No slate found');
        return;
    }
    try {
        const path = ReactEditor.findPath(slate, element);
        return path;
    }
    catch (error) { }
}

function getParentElementPath(editor, blockId, element) {
    const block = editor.children[blockId];
    if (!block) {
        throw new Error(`Block with id ${blockId} not found`);
    }
    const slate = findSlateBySelectionPath(editor, { at: block.meta.order });
    if (!slate) {
        console.warn('No slate found');
        return [];
    }
    try {
        const path = ReactEditor.findPath(slate, element);
        return Path.parent(path);
    }
    catch (error) { }
}

function isElementEmpty(editor, blockId, element) {
    const block = editor.children[blockId];
    if (!block) {
        throw new Error(`Block with id ${blockId} not found`);
    }
    const slate = findSlateBySelectionPath(editor, { at: block.meta.order });
    if (!slate) {
        console.warn('No slate found');
        return;
    }
    const [elementEntry] = Editor$1.nodes(slate, {
        at: element.path || slate.selection,
        match: (n) => Element$1.isElement(n) && n.type === element.type,
    });
    if (elementEntry) {
        const [node, nodePath] = elementEntry;
        const string = Editor$1.string(slate, nodePath);
        return string.trim().length === 0;
    }
    return false;
}

const Elements = {
    createElement,
    deleteElement,
    updateElement,
    insertElementText,
    getElement,
    getElementChildren,
    getElementEntry,
    isElementEmpty,
    getElementPath,
    getParentElementPath,
};

function mergeBlock(editor) {
    var _a;
    const sourceBlock = findPluginBlockByPath(editor);
    const sourceSlate = findSlateBySelectionPath(editor, { at: editor.path.current });
    const prevBlockPath = Paths.getPreviousPath(editor);
    const targetSlate = findSlateBySelectionPath(editor, { at: prevBlockPath });
    const targetBlock = findPluginBlockByPath(editor, { at: prevBlockPath });
    const targetBlockEntity = editor.blocks[(targetBlock === null || targetBlock === void 0 ? void 0 : targetBlock.type) || ''];
    if (!sourceSlate || !sourceBlock || !targetSlate || !targetBlock)
        return;
    const prevBlockElementRoot = Elements.getElement(editor, targetBlock.id);
    if (!targetBlockEntity)
        return;
    if (targetBlockEntity.hasCustomEditor)
        return;
    if (((_a = prevBlockElementRoot === null || prevBlockElementRoot === void 0 ? void 0 : prevBlockElementRoot.props) === null || _a === void 0 ? void 0 : _a.nodeType) === 'void')
        return;
    try {
        const point = getLastNodePoint(targetSlate);
        Transforms.select(targetSlate, point);
    }
    catch (error) {
        Transforms.select(targetSlate, Editor$1.start(targetSlate, []));
    }
    Editor$1.withoutNormalizing(targetSlate, () => {
        const operations = [];
        const mergedChildren = mergeSlateChildren(targetSlate.children[0], sourceSlate.children[0]);
        const mergedSlateValue = [
            Object.assign(Object.assign({}, targetSlate.children[0]), { children: mergedChildren }),
        ];
        const mergedBlock = Object.assign(Object.assign({}, targetBlock), { value: mergedSlateValue });
        operations.push({
            type: 'merge_block',
            prevProperties: {
                sourceBlock: sourceBlock,
                sourceSlateValue: sourceSlate.children,
                targetBlock,
                targetSlateValue: targetSlate.children,
            },
            properties: {
                mergedBlock,
                mergedSlateValue: mergedSlateValue,
            },
            path: editor.path,
        });
        editor.applyTransforms(operations);
        editor.setPath({ current: targetBlock.meta.order });
        try {
            setTimeout(() => {
                ReactEditor.focus(targetSlate);
            }, 0);
        }
        catch (error) {
            console.error('Error setting focus:', error);
        }
    });
}
function mergeSlateChildren(target, source) {
    const targetChildren = JSON.parse(JSON.stringify(target.children));
    const sourceChildren = JSON.parse(JSON.stringify(source.children));
    const lastTargetChild = targetChildren[targetChildren.length - 1];
    const firstSourceChild = sourceChildren[0];
    if (Text.isText(lastTargetChild) && Text.isText(firstSourceChild)) {
        lastTargetChild.text += firstSourceChild.text;
        return [...targetChildren.slice(0, -1), lastTargetChild, ...sourceChildren.slice(1)];
    }
    else {
        return [...targetChildren, ...sourceChildren];
    }
}

const buildBlockElement = (element) => {
    return {
        id: generateId(),
        type: (element === null || element === void 0 ? void 0 : element.type) || 'paragraph',
        children: (element === null || element === void 0 ? void 0 : element.children) || [{ text: '' }],
        props: Object.assign({ nodeType: 'block' }, element === null || element === void 0 ? void 0 : element.props),
    };
};
function buildBlockData(block) {
    var _a, _b;
    return {
        id: (block === null || block === void 0 ? void 0 : block.id) || generateId(),
        value: (block === null || block === void 0 ? void 0 : block.value) || [buildBlockElement()],
        type: (block === null || block === void 0 ? void 0 : block.type) || 'Paragraph',
        meta: Object.assign({ order: ((_a = block === null || block === void 0 ? void 0 : block.meta) === null || _a === void 0 ? void 0 : _a.order) || 0, depth: ((_b = block === null || block === void 0 ? void 0 : block.meta) === null || _b === void 0 ? void 0 : _b.depth) || 0 }, block === null || block === void 0 ? void 0 : block.meta),
    };
}

const Blocks = {
    insertBlock,
    deleteBlock,
    moveBlock,
    focusBlock,
    splitBlock,
    increaseBlockDepth,
    decreaseBlockDepth,
    duplicateBlock,
    updateBlock,
    toggleBlock,
    getBlock,
    getBlockSlate,
    buildBlockData,
    mergeBlock,
};

function setEditorValue(editor, value) {
    let editorValue;
    if (value === null || !validateYooptaValue(value)) {
        const defaultBlock = Blocks.buildBlockData();
        editorValue = { [defaultBlock.id]: defaultBlock };
    }
    else {
        editorValue = value;
    }
    const operation = {
        type: 'set_editor_value',
        properties: {
            value: editorValue,
        },
        prevProperties: {
            value: editor.children,
        },
    };
    editor.applyTransforms([operation], { validatePaths: true });
}

function blurFn(editor, slate) {
    try {
        ReactEditor.blur(slate);
        ReactEditor.deselect(slate);
        Transforms.deselect(slate);
    }
    catch (error) { }
    editor.setPath({ current: null });
}
function blur(editor, options = {}) {
    var _a;
    const slate = (_a = options.slate) !== null && _a !== void 0 ? _a : findSlateBySelectionPath(editor);
    if (!slate)
        return;
    const { waitExecution, waitExecutionMs } = options;
    if (waitExecution) {
        setTimeout(() => blurFn(editor, slate), waitExecutionMs);
        return;
    }
    IS_FOCUSED_EDITOR.set(editor, false);
    blurFn(editor, slate);
    editor.emit('blur', false);
}

function focus(editor) {
    if (editor.readOnly)
        return;
    const firstBlock = findPluginBlockByPath(editor, { at: 0 });
    if (firstBlock) {
        IS_FOCUSED_EDITOR.set(editor, true);
        editor.focusBlock(firstBlock.id, { waitExecution: true });
        editor.emit('focus', true);
    }
}

function isFocused(editor) {
    return !!IS_FOCUSED_EDITOR.get(editor);
}

const MARKS_NODE_NAME_MATCHERS_MAP$1 = {
    underline: { type: 'underline', tag: 'u' },
    strike: { type: 'strike', tag: 's' },
    code: { type: 'code', tag: 'code' },
    italic: { type: 'italic', tag: 'i' },
    bold: { type: 'bold', tag: 'strong' },
    strong: { type: 'bold', tag: 'strong' },
};
function serializeChildren(children, plugins, editor) {
    return children
        .map((child) => {
        var _a, _b;
        let innerHtml = '';
        if (child.text) {
            innerHtml = Object.keys(MARKS_NODE_NAME_MATCHERS_MAP$1).reduce((acc, mark) => {
                if (child[mark]) {
                    return `<${MARKS_NODE_NAME_MATCHERS_MAP$1[mark].tag}>${acc}</${MARKS_NODE_NAME_MATCHERS_MAP$1[mark].tag}>`;
                }
                return acc;
            }, child.text);
            return innerHtml;
        }
        else if (child.type) {
            const childPlugin = getPluginByInlineElement(plugins, child.type);
            if (childPlugin && ((_b = (_a = childPlugin.parsers) === null || _a === void 0 ? void 0 : _a.html) === null || _b === void 0 ? void 0 : _b.serialize)) {
                // We don't pass block meta data to this because it's inline element inside block
                innerHtml = childPlugin.parsers.html.serialize(child, serializeChildren(child.children, plugins));
                return innerHtml;
            }
        }
        return innerHtml;
    })
        .join('');
}
function getHTML(editor, content) {
    const blocks = Object.values(content)
        .filter((block) => {
        const selectedPaths = Paths.getSelectedPaths(editor);
        if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
            return selectedPaths === null || selectedPaths === void 0 ? void 0 : selectedPaths.includes(block.meta.order);
        }
        return true;
    })
        .sort((a, b) => a.meta.order - b.meta.order);
    const html = blocks.map((blockData) => {
        var _a, _b;
        const plugin = editor.plugins[blockData.type];
        if (plugin && ((_b = (_a = plugin.parsers) === null || _a === void 0 ? void 0 : _a.html) === null || _b === void 0 ? void 0 : _b.serialize)) {
            const content = serializeChildren(blockData.value[0].children, editor.plugins);
            return plugin.parsers.html.serialize(blockData.value[0], content, blockData.meta);
        }
        return '';
    });
    return `<body id="yoopta-clipboard" data-editor-id="${editor.id}">${html.join('')}</body>`;
}

function serialize(editor, blocksData) {
    const blocks = blocksData.sort((a, b) => (a.meta.order > b.meta.order ? 1 : -1));
    const markdown = blocks.map((blockData) => {
        var _a, _b;
        const plugin = editor.plugins[blockData.type];
        if (plugin) {
            const element = blockData.value[0];
            if ((_b = (_a = plugin.parsers) === null || _a === void 0 ? void 0 : _a.markdown) === null || _b === void 0 ? void 0 : _b.serialize) {
                const serialized = plugin.parsers.markdown.serialize(element, 
                // @ts-ignore - fixme
                element.children.map((child) => child.text).join(''), blockData.meta);
                if (serialized)
                    return serialized;
            }
        }
        return '';
    });
    return markdown.join('\n');
}
function getMarkdown(editor, content) {
    const selectedBlocks = Object.values(content);
    return serialize(editor, selectedBlocks);
}

function getPlainText(editor, content) {
    const htmlString = getHTML(editor, content);
    const div = document.createElement('div');
    div.innerHTML = htmlString;
    return div.innerText;
}

function isEmpty(editor) {
    const content = Object.values(editor.children);
    if (content.length > 1)
        return false;
    const blockData = content[0];
    if (!blockData)
        return true;
    if (blockData.type !== 'Paragraph')
        return false;
    const slate = findSlateBySelectionPath(editor, { at: blockData.meta.order });
    if (!slate)
        return true;
    try {
        const string = Editor$1.string(slate, [0]);
        if (string.length > 0)
            return false;
        return true;
    }
    catch (error) {
        return true;
    }
}

// src/utils/env.ts
var NOTHING = Symbol.for("immer-nothing");
var DRAFTABLE = Symbol.for("immer-draftable");
var DRAFT_STATE = Symbol.for("immer-state");

// src/utils/errors.ts
var errors = [
  // All error codes, starting by 0:
  function(plugin) {
    return `The plugin for '${plugin}' has not been loaded into Immer. To enable the plugin, import and call \`enable${plugin}()\` when initializing your application.`;
  },
  function(thing) {
    return `produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '${thing}'`;
  },
  "This object has been frozen and should not be mutated",
  function(data) {
    return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + data;
  },
  "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
  "Immer forbids circular references",
  "The first or second argument to `produce` must be a function",
  "The third argument to `produce` must be a function or undefined",
  "First argument to `createDraft` must be a plain object, an array, or an immerable object",
  "First argument to `finishDraft` must be a draft returned by `createDraft`",
  function(thing) {
    return `'current' expects a draft, got: ${thing}`;
  },
  "Object.defineProperty() cannot be used on an Immer draft",
  "Object.setPrototypeOf() cannot be used on an Immer draft",
  "Immer only supports deleting array indices",
  "Immer only supports setting array indices and the 'length' property",
  function(thing) {
    return `'original' expects a draft, got: ${thing}`;
  }
  // Note: if more errors are added, the errorOffset in Patches.ts should be increased
  // See Patches.ts for additional errors
] ;
function die(error, ...args) {
  {
    const e = errors[error];
    const msg = typeof e === "function" ? e.apply(null, args) : e;
    throw new Error(`[Immer] ${msg}`);
  }
}

// src/utils/common.ts
var getPrototypeOf = Object.getPrototypeOf;
function isDraft(value) {
  return !!value && !!value[DRAFT_STATE];
}
function isDraftable(value) {
  if (!value)
    return false;
  return isPlainObject(value) || Array.isArray(value) || !!value[DRAFTABLE] || !!value.constructor?.[DRAFTABLE] || isMap(value) || isSet(value);
}
var objectCtorString = Object.prototype.constructor.toString();
function isPlainObject(value) {
  if (!value || typeof value !== "object")
    return false;
  const proto = getPrototypeOf(value);
  if (proto === null) {
    return true;
  }
  const Ctor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  if (Ctor === Object)
    return true;
  return typeof Ctor == "function" && Function.toString.call(Ctor) === objectCtorString;
}
function each(obj, iter) {
  if (getArchtype(obj) === 0 /* Object */) {
    Reflect.ownKeys(obj).forEach((key) => {
      iter(key, obj[key], obj);
    });
  } else {
    obj.forEach((entry, index) => iter(index, entry, obj));
  }
}
function getArchtype(thing) {
  const state = thing[DRAFT_STATE];
  return state ? state.type_ : Array.isArray(thing) ? 1 /* Array */ : isMap(thing) ? 2 /* Map */ : isSet(thing) ? 3 /* Set */ : 0 /* Object */;
}
function has(thing, prop) {
  return getArchtype(thing) === 2 /* Map */ ? thing.has(prop) : Object.prototype.hasOwnProperty.call(thing, prop);
}
function set(thing, propOrOldValue, value) {
  const t = getArchtype(thing);
  if (t === 2 /* Map */)
    thing.set(propOrOldValue, value);
  else if (t === 3 /* Set */) {
    thing.add(value);
  } else
    thing[propOrOldValue] = value;
}
function is(x, y) {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
function isMap(target) {
  return target instanceof Map;
}
function isSet(target) {
  return target instanceof Set;
}
function latest(state) {
  return state.copy_ || state.base_;
}
function shallowCopy(base, strict) {
  if (isMap(base)) {
    return new Map(base);
  }
  if (isSet(base)) {
    return new Set(base);
  }
  if (Array.isArray(base))
    return Array.prototype.slice.call(base);
  if (!strict && isPlainObject(base)) {
    if (!getPrototypeOf(base)) {
      const obj = /* @__PURE__ */ Object.create(null);
      return Object.assign(obj, base);
    }
    return { ...base };
  }
  const descriptors = Object.getOwnPropertyDescriptors(base);
  delete descriptors[DRAFT_STATE];
  let keys = Reflect.ownKeys(descriptors);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const desc = descriptors[key];
    if (desc.writable === false) {
      desc.writable = true;
      desc.configurable = true;
    }
    if (desc.get || desc.set)
      descriptors[key] = {
        configurable: true,
        writable: true,
        // could live with !!desc.set as well here...
        enumerable: desc.enumerable,
        value: base[key]
      };
  }
  return Object.create(getPrototypeOf(base), descriptors);
}
function freeze(obj, deep = false) {
  if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj))
    return obj;
  if (getArchtype(obj) > 1) {
    obj.set = obj.add = obj.clear = obj.delete = dontMutateFrozenCollections;
  }
  Object.freeze(obj);
  if (deep)
    Object.entries(obj).forEach(([key, value]) => freeze(value, true));
  return obj;
}
function dontMutateFrozenCollections() {
  die(2);
}
function isFrozen(obj) {
  return Object.isFrozen(obj);
}

// src/utils/plugins.ts
var plugins = {};
function getPlugin(pluginKey) {
  const plugin = plugins[pluginKey];
  if (!plugin) {
    die(0, pluginKey);
  }
  return plugin;
}

// src/core/scope.ts
var currentScope;
function getCurrentScope() {
  return currentScope;
}
function createScope(parent_, immer_) {
  return {
    drafts_: [],
    parent_,
    immer_,
    // Whenever the modified draft contains a draft from another scope, we
    // need to prevent auto-freezing so the unowned draft can be finalized.
    canAutoFreeze_: true,
    unfinalizedDrafts_: 0
  };
}
function usePatchesInScope(scope, patchListener) {
  if (patchListener) {
    getPlugin("Patches");
    scope.patches_ = [];
    scope.inversePatches_ = [];
    scope.patchListener_ = patchListener;
  }
}
function revokeScope(scope) {
  leaveScope(scope);
  scope.drafts_.forEach(revokeDraft);
  scope.drafts_ = null;
}
function leaveScope(scope) {
  if (scope === currentScope) {
    currentScope = scope.parent_;
  }
}
function enterScope(immer2) {
  return currentScope = createScope(currentScope, immer2);
}
function revokeDraft(draft) {
  const state = draft[DRAFT_STATE];
  if (state.type_ === 0 /* Object */ || state.type_ === 1 /* Array */)
    state.revoke_();
  else
    state.revoked_ = true;
}

// src/core/finalize.ts
function processResult(result, scope) {
  scope.unfinalizedDrafts_ = scope.drafts_.length;
  const baseDraft = scope.drafts_[0];
  const isReplaced = result !== void 0 && result !== baseDraft;
  if (isReplaced) {
    if (baseDraft[DRAFT_STATE].modified_) {
      revokeScope(scope);
      die(4);
    }
    if (isDraftable(result)) {
      result = finalize(scope, result);
      if (!scope.parent_)
        maybeFreeze(scope, result);
    }
    if (scope.patches_) {
      getPlugin("Patches").generateReplacementPatches_(
        baseDraft[DRAFT_STATE].base_,
        result,
        scope.patches_,
        scope.inversePatches_
      );
    }
  } else {
    result = finalize(scope, baseDraft, []);
  }
  revokeScope(scope);
  if (scope.patches_) {
    scope.patchListener_(scope.patches_, scope.inversePatches_);
  }
  return result !== NOTHING ? result : void 0;
}
function finalize(rootScope, value, path) {
  if (isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  if (!state) {
    each(
      value,
      (key, childValue) => finalizeProperty(rootScope, state, value, key, childValue, path)
    );
    return value;
  }
  if (state.scope_ !== rootScope)
    return value;
  if (!state.modified_) {
    maybeFreeze(rootScope, state.base_, true);
    return state.base_;
  }
  if (!state.finalized_) {
    state.finalized_ = true;
    state.scope_.unfinalizedDrafts_--;
    const result = state.copy_;
    let resultEach = result;
    let isSet2 = false;
    if (state.type_ === 3 /* Set */) {
      resultEach = new Set(result);
      result.clear();
      isSet2 = true;
    }
    each(
      resultEach,
      (key, childValue) => finalizeProperty(rootScope, state, result, key, childValue, path, isSet2)
    );
    maybeFreeze(rootScope, result, false);
    if (path && rootScope.patches_) {
      getPlugin("Patches").generatePatches_(
        state,
        path,
        rootScope.patches_,
        rootScope.inversePatches_
      );
    }
  }
  return state.copy_;
}
function finalizeProperty(rootScope, parentState, targetObject, prop, childValue, rootPath, targetIsSet) {
  if (childValue === targetObject)
    die(5);
  if (isDraft(childValue)) {
    const path = rootPath && parentState && parentState.type_ !== 3 /* Set */ && // Set objects are atomic since they have no keys.
    !has(parentState.assigned_, prop) ? rootPath.concat(prop) : void 0;
    const res = finalize(rootScope, childValue, path);
    set(targetObject, prop, res);
    if (isDraft(res)) {
      rootScope.canAutoFreeze_ = false;
    } else
      return;
  } else if (targetIsSet) {
    targetObject.add(childValue);
  }
  if (isDraftable(childValue) && !isFrozen(childValue)) {
    if (!rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1) {
      return;
    }
    finalize(rootScope, childValue);
    if ((!parentState || !parentState.scope_.parent_) && typeof prop !== "symbol" && Object.prototype.propertyIsEnumerable.call(targetObject, prop))
      maybeFreeze(rootScope, childValue);
  }
}
function maybeFreeze(scope, value, deep = false) {
  if (!scope.parent_ && scope.immer_.autoFreeze_ && scope.canAutoFreeze_) {
    freeze(value, deep);
  }
}

// src/core/proxy.ts
function createProxyProxy(base, parent) {
  const isArray = Array.isArray(base);
  const state = {
    type_: isArray ? 1 /* Array */ : 0 /* Object */,
    // Track which produce call this is associated with.
    scope_: parent ? parent.scope_ : getCurrentScope(),
    // True for both shallow and deep changes.
    modified_: false,
    // Used during finalization.
    finalized_: false,
    // Track which properties have been assigned (true) or deleted (false).
    assigned_: {},
    // The parent draft state.
    parent_: parent,
    // The base state.
    base_: base,
    // The base proxy.
    draft_: null,
    // set below
    // The base copy with any updated values.
    copy_: null,
    // Called by the `produce` function.
    revoke_: null,
    isManual_: false
  };
  let target = state;
  let traps = objectTraps;
  if (isArray) {
    target = [state];
    traps = arrayTraps;
  }
  const { revoke, proxy } = Proxy.revocable(target, traps);
  state.draft_ = proxy;
  state.revoke_ = revoke;
  return proxy;
}
var objectTraps = {
  get(state, prop) {
    if (prop === DRAFT_STATE)
      return state;
    const source = latest(state);
    if (!has(source, prop)) {
      return readPropFromProto(state, source, prop);
    }
    const value = source[prop];
    if (state.finalized_ || !isDraftable(value)) {
      return value;
    }
    if (value === peek(state.base_, prop)) {
      prepareCopy(state);
      return state.copy_[prop] = createProxy(value, state);
    }
    return value;
  },
  has(state, prop) {
    return prop in latest(state);
  },
  ownKeys(state) {
    return Reflect.ownKeys(latest(state));
  },
  set(state, prop, value) {
    const desc = getDescriptorFromProto(latest(state), prop);
    if (desc?.set) {
      desc.set.call(state.draft_, value);
      return true;
    }
    if (!state.modified_) {
      const current2 = peek(latest(state), prop);
      const currentState = current2?.[DRAFT_STATE];
      if (currentState && currentState.base_ === value) {
        state.copy_[prop] = value;
        state.assigned_[prop] = false;
        return true;
      }
      if (is(value, current2) && (value !== void 0 || has(state.base_, prop)))
        return true;
      prepareCopy(state);
      markChanged(state);
    }
    if (state.copy_[prop] === value && // special case: handle new props with value 'undefined'
    (value !== void 0 || prop in state.copy_) || // special case: NaN
    Number.isNaN(value) && Number.isNaN(state.copy_[prop]))
      return true;
    state.copy_[prop] = value;
    state.assigned_[prop] = true;
    return true;
  },
  deleteProperty(state, prop) {
    if (peek(state.base_, prop) !== void 0 || prop in state.base_) {
      state.assigned_[prop] = false;
      prepareCopy(state);
      markChanged(state);
    } else {
      delete state.assigned_[prop];
    }
    if (state.copy_) {
      delete state.copy_[prop];
    }
    return true;
  },
  // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.
  getOwnPropertyDescriptor(state, prop) {
    const owner = latest(state);
    const desc = Reflect.getOwnPropertyDescriptor(owner, prop);
    if (!desc)
      return desc;
    return {
      writable: true,
      configurable: state.type_ !== 1 /* Array */ || prop !== "length",
      enumerable: desc.enumerable,
      value: owner[prop]
    };
  },
  defineProperty() {
    die(11);
  },
  getPrototypeOf(state) {
    return getPrototypeOf(state.base_);
  },
  setPrototypeOf() {
    die(12);
  }
};
var arrayTraps = {};
each(objectTraps, (key, fn) => {
  arrayTraps[key] = function() {
    arguments[0] = arguments[0][0];
    return fn.apply(this, arguments);
  };
});
arrayTraps.deleteProperty = function(state, prop) {
  if (isNaN(parseInt(prop)))
    die(13);
  return arrayTraps.set.call(this, state, prop, void 0);
};
arrayTraps.set = function(state, prop, value) {
  if (prop !== "length" && isNaN(parseInt(prop)))
    die(14);
  return objectTraps.set.call(this, state[0], prop, value, state[0]);
};
function peek(draft, prop) {
  const state = draft[DRAFT_STATE];
  const source = state ? latest(state) : draft;
  return source[prop];
}
function readPropFromProto(state, source, prop) {
  const desc = getDescriptorFromProto(source, prop);
  return desc ? `value` in desc ? desc.value : (
    // This is a very special case, if the prop is a getter defined by the
    // prototype, we should invoke it with the draft as context!
    desc.get?.call(state.draft_)
  ) : void 0;
}
function getDescriptorFromProto(source, prop) {
  if (!(prop in source))
    return void 0;
  let proto = getPrototypeOf(source);
  while (proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (desc)
      return desc;
    proto = getPrototypeOf(proto);
  }
  return void 0;
}
function markChanged(state) {
  if (!state.modified_) {
    state.modified_ = true;
    if (state.parent_) {
      markChanged(state.parent_);
    }
  }
}
function prepareCopy(state) {
  if (!state.copy_) {
    state.copy_ = shallowCopy(
      state.base_,
      state.scope_.immer_.useStrictShallowCopy_
    );
  }
}

// src/core/immerClass.ts
var Immer2 = class {
  constructor(config) {
    this.autoFreeze_ = true;
    this.useStrictShallowCopy_ = false;
    /**
     * The `produce` function takes a value and a "recipe function" (whose
     * return value often depends on the base state). The recipe function is
     * free to mutate its first argument however it wants. All mutations are
     * only ever applied to a __copy__ of the base state.
     *
     * Pass only a function to create a "curried producer" which relieves you
     * from passing the recipe function every time.
     *
     * Only plain objects and arrays are made mutable. All other objects are
     * considered uncopyable.
     *
     * Note: This function is __bound__ to its `Immer` instance.
     *
     * @param {any} base - the initial state
     * @param {Function} recipe - function that receives a proxy of the base state as first argument and which can be freely modified
     * @param {Function} patchListener - optional function that will be called with all the patches produced here
     * @returns {any} a new state, or the initial state if nothing was modified
     */
    this.produce = (base, recipe, patchListener) => {
      if (typeof base === "function" && typeof recipe !== "function") {
        const defaultBase = recipe;
        recipe = base;
        const self = this;
        return function curriedProduce(base2 = defaultBase, ...args) {
          return self.produce(base2, (draft) => recipe.call(this, draft, ...args));
        };
      }
      if (typeof recipe !== "function")
        die(6);
      if (patchListener !== void 0 && typeof patchListener !== "function")
        die(7);
      let result;
      if (isDraftable(base)) {
        const scope = enterScope(this);
        const proxy = createProxy(base, void 0);
        let hasError = true;
        try {
          result = recipe(proxy);
          hasError = false;
        } finally {
          if (hasError)
            revokeScope(scope);
          else
            leaveScope(scope);
        }
        usePatchesInScope(scope, patchListener);
        return processResult(result, scope);
      } else if (!base || typeof base !== "object") {
        result = recipe(base);
        if (result === void 0)
          result = base;
        if (result === NOTHING)
          result = void 0;
        if (this.autoFreeze_)
          freeze(result, true);
        if (patchListener) {
          const p = [];
          const ip = [];
          getPlugin("Patches").generateReplacementPatches_(base, result, p, ip);
          patchListener(p, ip);
        }
        return result;
      } else
        die(1, base);
    };
    this.produceWithPatches = (base, recipe) => {
      if (typeof base === "function") {
        return (state, ...args) => this.produceWithPatches(state, (draft) => base(draft, ...args));
      }
      let patches, inversePatches;
      const result = this.produce(base, recipe, (p, ip) => {
        patches = p;
        inversePatches = ip;
      });
      return [result, patches, inversePatches];
    };
    if (typeof config?.autoFreeze === "boolean")
      this.setAutoFreeze(config.autoFreeze);
    if (typeof config?.useStrictShallowCopy === "boolean")
      this.setUseStrictShallowCopy(config.useStrictShallowCopy);
  }
  createDraft(base) {
    if (!isDraftable(base))
      die(8);
    if (isDraft(base))
      base = current(base);
    const scope = enterScope(this);
    const proxy = createProxy(base, void 0);
    proxy[DRAFT_STATE].isManual_ = true;
    leaveScope(scope);
    return proxy;
  }
  finishDraft(draft, patchListener) {
    const state = draft && draft[DRAFT_STATE];
    if (!state || !state.isManual_)
      die(9);
    const { scope_: scope } = state;
    usePatchesInScope(scope, patchListener);
    return processResult(void 0, scope);
  }
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is enabled.
   */
  setAutoFreeze(value) {
    this.autoFreeze_ = value;
  }
  /**
   * Pass true to enable strict shallow copy.
   *
   * By default, immer does not copy the object descriptors such as getter, setter and non-enumrable properties.
   */
  setUseStrictShallowCopy(value) {
    this.useStrictShallowCopy_ = value;
  }
  applyPatches(base, patches) {
    let i;
    for (i = patches.length - 1; i >= 0; i--) {
      const patch = patches[i];
      if (patch.path.length === 0 && patch.op === "replace") {
        base = patch.value;
        break;
      }
    }
    if (i > -1) {
      patches = patches.slice(i + 1);
    }
    const applyPatchesImpl = getPlugin("Patches").applyPatches_;
    if (isDraft(base)) {
      return applyPatchesImpl(base, patches);
    }
    return this.produce(
      base,
      (draft) => applyPatchesImpl(draft, patches)
    );
  }
};
function createProxy(value, parent) {
  const draft = isMap(value) ? getPlugin("MapSet").proxyMap_(value, parent) : isSet(value) ? getPlugin("MapSet").proxySet_(value, parent) : createProxyProxy(value, parent);
  const scope = parent ? parent.scope_ : getCurrentScope();
  scope.drafts_.push(draft);
  return draft;
}

// src/core/current.ts
function current(value) {
  if (!isDraft(value))
    die(10, value);
  return currentImpl(value);
}
function currentImpl(value) {
  if (!isDraftable(value) || isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  let copy;
  if (state) {
    if (!state.modified_)
      return state.base_;
    state.finalized_ = true;
    copy = shallowCopy(value, state.scope_.immer_.useStrictShallowCopy_);
  } else {
    copy = shallowCopy(value, true);
  }
  each(copy, (key, childValue) => {
    set(copy, key, currentImpl(childValue));
  });
  if (state) {
    state.finalized_ = false;
  }
  return copy;
}

// src/immer.ts
var immer = new Immer2();
var produce = immer.produce;
immer.produceWithPatches.bind(
  immer
);
immer.setAutoFreeze.bind(immer);
immer.setUseStrictShallowCopy.bind(immer);
immer.applyPatches.bind(immer);
var createDraft = immer.createDraft.bind(immer);
var finishDraft = immer.finishDraft.bind(immer);

function applyOperation(editor, op) {
    switch (op.type) {
        case 'set_slate': {
            const { properties, blockId } = op;
            const slate = editor.blockEditorsMap[blockId];
            if (slate) {
                const { slateOps, selectionBefore } = properties;
                Editor$1.withoutNormalizing(slate, () => {
                    for (const slateOp of slateOps) {
                        slate.apply(slateOp);
                    }
                    if (selectionBefore) {
                        try {
                            Transforms.select(slate, selectionBefore);
                            ReactEditor.focus(slate);
                        }
                        catch (error) { }
                    }
                });
            }
            break;
        }
        case 'insert_block': {
            editor.blockEditorsMap[op.block.id] = buildSlateEditor(editor);
            editor.children[op.block.id] = op.block;
            editor.blockEditorsMap[op.block.id].children = op.block.value;
            Object.keys(editor.children).forEach((blockId) => {
                const existingBlock = editor.children[blockId];
                if (existingBlock.meta.order >= op.block.meta.order && existingBlock.id !== op.block.id) {
                    if (isDraft(editor.children[existingBlock.id])) {
                        existingBlock.meta.order = existingBlock.meta.order + 1;
                    }
                }
            });
            break;
        }
        case 'delete_block': {
            delete editor.blockEditorsMap[op.block.id];
            delete editor.children[op.block.id];
            // if (Object.keys(editor.children).length === 0) {
            //   const id = generateId();
            //   const defaultBlock = buildBlockData({ id });
            //   editor.children[id] = defaultBlock;
            //   editor.blockEditorsMap[id] = buildSlateEditor(editor);
            // }
            const blocks = Object.values(editor.children);
            blocks.forEach((existingBlock) => {
                if (existingBlock.meta.order > op.block.meta.order) {
                    if (isDraft(existingBlock)) {
                        existingBlock.meta.order--;
                    }
                    else {
                        produce(existingBlock, (draft) => {
                            draft.meta.order--;
                        });
                    }
                }
            });
            blocks.sort((a, b) => a.meta.order - b.meta.order);
            blocks.forEach((block, index) => {
                if (!isDraft(block.meta)) {
                    produce(block, (draft) => {
                        draft.meta = Object.assign(Object.assign({}, draft.meta), { order: index });
                    });
                }
                else {
                    block.meta.order = index;
                }
            });
            break;
        }
        case 'set_block_value': {
            const { id, value, forceSlate } = op;
            const slate = editor.blockEditorsMap[id];
            if (forceSlate && slate) {
                slate.children = value;
            }
            if (Array.isArray(value)) {
                if (isDraft(editor.children[id])) {
                    editor.children[id].value = value;
                }
                else {
                    produce(editor.children[id], (draft) => {
                        draft.value = value;
                    });
                }
            }
            break;
        }
        case 'set_block_meta': {
            const { id, properties } = op;
            const block = editor.children[id];
            if (!block)
                break;
            if (isDraft(block)) {
                Object.keys(properties).forEach((key) => {
                    block.meta[key] = properties[key];
                });
            }
            else {
                produce(block, (draft) => {
                    draft.meta = Object.assign(Object.assign({}, draft.meta), properties);
                });
            }
            break;
        }
        case 'split_block': {
            const { properties } = op;
            const nextSlate = buildSlateEditor(editor);
            nextSlate.children = properties.nextSlateValue;
            editor.children[properties.nextBlock.id] = Object.assign(Object.assign({}, properties.nextBlock), { value: nextSlate.children });
            editor.blockEditorsMap[properties.nextBlock.id] = nextSlate;
            const splitSlate = editor.blockEditorsMap[op.prevProperties.originalBlock.id];
            splitSlate.children = properties.splitSlateValue;
            editor.children[op.prevProperties.originalBlock.id].value = splitSlate.children;
            Object.values(editor.children).forEach((block) => {
                if (block.meta.order >= properties.nextBlock.meta.order && block.id !== properties.nextBlock.id) {
                    if (isDraft(block)) {
                        block.meta.order++;
                    }
                    else {
                        produce(block, (draft) => {
                            draft.meta.order++;
                        });
                    }
                }
            });
            break;
        }
        case 'merge_block': {
            const { prevProperties, properties } = op;
            delete editor.blockEditorsMap[prevProperties.sourceBlock.id];
            delete editor.children[prevProperties.sourceBlock.id];
            editor.children[properties.mergedBlock.id] = properties.mergedBlock;
            editor.blockEditorsMap[properties.mergedBlock.id].children = properties.mergedSlateValue;
            Object.values(editor.children).forEach((block) => {
                if (block.meta.order > properties.mergedBlock.meta.order) {
                    if (isDraft(block)) {
                        block.meta.order--;
                    }
                    else {
                        produce(block, (draft) => {
                            draft.meta.order--;
                        });
                    }
                }
            });
            break;
        }
        case 'move_block': {
            const { prevProperties, properties } = op;
            const block = editor.children[prevProperties.id];
            if (block) {
                block.meta.order = properties.order;
                Object.values(editor.children).forEach((otherBlock) => {
                    if (otherBlock.id !== prevProperties.id) {
                        if (prevProperties.order < properties.order) {
                            if (otherBlock.meta.order > prevProperties.order && otherBlock.meta.order <= properties.order) {
                                otherBlock.meta.order--;
                            }
                        }
                        else {
                            if (otherBlock.meta.order < prevProperties.order && otherBlock.meta.order >= properties.order) {
                                otherBlock.meta.order++;
                            }
                        }
                    }
                });
            }
            break;
        }
        case 'set_block_path': {
            editor.path = op.path;
            break;
        }
        case 'set_editor_value': {
            editor.children = op.properties.value;
            const blockEditorsMap = {};
            Object.keys(editor.children).forEach((id) => {
                const block = editor.children[id];
                const slate = buildSlateEditor(editor);
                slate.children = block.value;
                blockEditorsMap[id] = slate;
            });
            editor.blockEditorsMap = blockEditorsMap;
            break;
        }
        case 'validate_block_paths': {
            const blocks = Object.values(editor.children);
            blocks.sort((a, b) => a.meta.order - b.meta.order);
            blocks.forEach((block, index) => {
                if (!isDraft(block.meta)) {
                    produce(block, (draft) => {
                        draft.meta = Object.assign(Object.assign({}, draft.meta), { order: index });
                    });
                }
                else {
                    block.meta.order = index;
                }
            });
            break;
        }
    }
}
const MAX_HISTORY_LENGTH = 100;
function applyTransforms(editor, ops, options) {
    editor.children = createDraft(editor.children);
    editor.path = createDraft(editor.path);
    const { validatePaths = true, source } = options || {};
    const operations = [...ops];
    if (validatePaths) {
        operations.push({ type: 'validate_block_paths' });
    }
    if (operations.length > 1) {
        // if type is insert_block, we need to sort these operations by order
        operations.sort((a, b) => {
            if (a.type === 'insert_block' && b.type === 'insert_block') {
                return a.block.meta.order - b.block.meta.order;
            }
            return 0;
        });
    }
    for (const operation of operations) {
        // run `set_slate` operation only if source is history
        if (operation.type === 'set_slate' && source === 'api') {
            continue;
        }
        applyOperation(editor, operation);
    }
    if (!isDraft(editor.children))
        editor.children = createDraft(editor.children);
    editor.children = finishDraft(editor.children);
    if (isDraft(editor.path)) {
        editor.path = finishDraft(editor.path);
    }
    const saveHistory = editor.isSavingHistory() !== false;
    if (saveHistory) {
        const historyBatch = {
            operations: operations.filter((op) => op.type !== 'set_block_path' && op.type !== 'set_block_value' && op.type !== 'validate_block_paths'),
            path: editor.path,
        };
        if (historyBatch.operations.length > 0 && source !== 'history') {
            editor.historyStack.undos.push(historyBatch);
            editor.historyStack.redos = [];
        }
        if (editor.historyStack.undos.length > MAX_HISTORY_LENGTH) {
            editor.historyStack.undos.shift();
        }
    }
    const changeOptions = { value: editor.children, operations };
    editor.emit('change', changeOptions);
    editor.emit('path-change', editor.path);
    {
        assertValidPaths(editor);
    }
}
function assertValidPaths(editor) {
    const blocks = Object.values(editor.children);
    blocks.sort((a, b) => a.meta.order - b.meta.order);
    blocks.forEach((block, index) => {
        if (block.meta.order !== index) {
            console.warn(`Block path inconsistency detected: Block ${block.id} has order ${block.meta.order}, expected ${index}`);
        }
    });
}

function batchOperations(editor, callback) {
    const operations = [];
    let options = {};
    const originalApplyTransforms = editor.applyTransforms;
    editor.applyTransforms = (ops, applyOptions) => {
        if (applyOptions)
            options = applyOptions;
        operations.push(...ops);
    };
    callback();
    editor.applyTransforms = originalApplyTransforms;
    if (operations.length > 0) {
        editor.applyTransforms(operations, options);
    }
}

function inverseEditorOperation(editor, op) {
    switch (op.type) {
        case 'insert_block':
            return {
                type: 'delete_block',
                path: op.path,
                block: op.block,
            };
        case 'delete_block':
            return {
                type: 'insert_block',
                path: op.path,
                block: op.block,
            };
        case 'set_block_meta': {
            return {
                type: 'set_block_meta',
                id: op.id,
                properties: op.prevProperties,
                prevProperties: op.properties,
            };
        }
        case 'split_block': {
            return [
                {
                    type: 'delete_block',
                    block: op.properties.nextBlock,
                    path: op.path,
                },
                {
                    type: 'set_block_value',
                    id: op.prevProperties.originalBlock.id,
                    value: op.prevProperties.originalValue,
                    forceSlate: true,
                },
            ];
        }
        case 'merge_block': {
            return [
                {
                    type: 'split_block',
                    properties: {
                        nextBlock: op.prevProperties.sourceBlock,
                        nextSlateValue: op.prevProperties.sourceSlateValue,
                        splitSlateValue: op.prevProperties.targetSlateValue,
                    },
                    prevProperties: {
                        originalBlock: op.properties.mergedBlock,
                        originalValue: op.properties.mergedSlateValue,
                    },
                    path: op.path,
                },
            ];
        }
        case 'move_block': {
            return {
                type: 'move_block',
                properties: op.prevProperties,
                prevProperties: op.properties,
            };
        }
        case 'set_slate': {
            const inverseOps = op.properties.slateOps.map(Operation.inverse).reverse();
            return {
                type: 'set_slate',
                properties: {
                    slateOps: inverseOps,
                    selectionBefore: op.properties.selectionBefore,
                },
                slate: op.slate,
                blockId: op.blockId,
            };
        }
        case 'set_editor_value': {
            return {
                type: 'set_editor_value',
                properties: op.prevProperties,
                prevProperties: op.properties,
            };
        }
        default:
            return op;
    }
}
const SAVING = new WeakMap();
const MERGING = new WeakMap();
const YooptaHistory = {
    isMergingHistory(editor) {
        return MERGING.get(editor);
    },
    isSavingHistory(editor) {
        return SAVING.get(editor);
    },
    withMergingHistory(editor, fn) {
        const prev = YooptaHistory.isMergingHistory(editor);
        MERGING.set(editor, true);
        fn();
        MERGING.set(editor, prev);
    },
    withSavingHistory(editor, fn) {
        const prev = YooptaHistory.isSavingHistory(editor);
        SAVING.set(editor, true);
        fn();
        SAVING.set(editor, prev);
    },
    withoutMergingHistory(editor, fn) {
        const prev = YooptaHistory.isMergingHistory(editor);
        MERGING.set(editor, false);
        fn();
        MERGING.set(editor, prev);
    },
    withoutSavingHistory(editor, fn) {
        const prev = YooptaHistory.isSavingHistory(editor);
        SAVING.set(editor, false);
        fn();
        SAVING.set(editor, prev);
    },
    redo: (editor, options) => {
        const { redos } = editor.historyStack;
        if (redos.length > 0) {
            const batch = redos[redos.length - 1];
            YooptaHistory.withoutSavingHistory(editor, () => {
                editor.applyTransforms(batch.operations, { source: 'history' });
                editor.setPath(batch.path);
                const { scroll = true } = options || {};
                if (scroll && typeof batch.path.current === 'number') {
                    const block = Blocks.getBlock(editor, { at: batch.path.current });
                    // [TODO] - not good place to scroll. View tasks should be separated from model tasks
                    const blockElement = document.querySelector(`[data-yoopta-block-id="${block === null || block === void 0 ? void 0 : block.id}"]`);
                    if (blockElement && !isInViewport(blockElement)) {
                        blockElement.scrollIntoView({ block: 'center', behavior: 'auto' });
                    }
                }
            });
            editor.historyStack.redos.pop();
            editor.historyStack.undos.push(batch);
        }
    },
    undo: (editor, options) => {
        const { undos } = editor.historyStack;
        if (undos.length > 0) {
            const batch = editor.historyStack.undos[editor.historyStack.undos.length - 1];
            YooptaHistory.withoutSavingHistory(editor, () => {
                // [TODO] - ask Christopher Nolan to help with this
                const inverseOps = batch.operations.flatMap((op) => inverseEditorOperation(editor, op)).reverse();
                editor.applyTransforms(inverseOps, { source: 'history' });
                editor.setPath(batch.path);
                const { scroll = true } = options || {};
                if (scroll && typeof batch.path.current === 'number') {
                    const block = Blocks.getBlock(editor, { at: batch.path.current });
                    // [TODO] - not good place to scroll. View tasks should be separated from model tasks
                    const blockElement = document.querySelector(`[data-yoopta-block-id="${block === null || block === void 0 ? void 0 : block.id}"]`);
                    if (blockElement && !isInViewport(blockElement)) {
                        blockElement.scrollIntoView({ block: 'center', behavior: 'auto' });
                    }
                }
            });
            editor.historyStack.redos.push(batch);
            editor.historyStack.undos.pop();
        }
    },
};
function isInViewport(element) {
    var rect = element.getBoundingClientRect();
    var html = document.documentElement;
    return (rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || html.clientHeight) &&
        rect.right <= (window.innerWidth || html.clientWidth));
}

var eventemitter3Exports = {};
var eventemitter3 = {
  get exports(){ return eventemitter3Exports; },
  set exports(v){ eventemitter3Exports = v; },
};

(function (module) {

	var has = Object.prototype.hasOwnProperty
	  , prefix = '~';

	/**
	 * Constructor to create a storage for our `EE` objects.
	 * An `Events` instance is a plain object whose properties are event names.
	 *
	 * @constructor
	 * @private
	 */
	function Events() {}

	//
	// We try to not inherit from `Object.prototype`. In some engines creating an
	// instance in this way is faster than calling `Object.create(null)` directly.
	// If `Object.create(null)` is not supported we prefix the event names with a
	// character to make sure that the built-in object properties are not
	// overridden or used as an attack vector.
	//
	if (Object.create) {
	  Events.prototype = Object.create(null);

	  //
	  // This hack is needed because the `__proto__` property is still inherited in
	  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
	  //
	  if (!new Events().__proto__) prefix = false;
	}

	/**
	 * Representation of a single event listener.
	 *
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	 * @constructor
	 * @private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}

	/**
	 * Add a listener for a given event.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} once Specify if the listener is a one-time listener.
	 * @returns {EventEmitter}
	 * @private
	 */
	function addListener(emitter, event, fn, context, once) {
	  if (typeof fn !== 'function') {
	    throw new TypeError('The listener must be a function');
	  }

	  var listener = new EE(fn, context || emitter, once)
	    , evt = prefix ? prefix + event : event;

	  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
	  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
	  else emitter._events[evt] = [emitter._events[evt], listener];

	  return emitter;
	}

	/**
	 * Clear event by name.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} evt The Event name.
	 * @private
	 */
	function clearEvent(emitter, evt) {
	  if (--emitter._eventsCount === 0) emitter._events = new Events();
	  else delete emitter._events[evt];
	}

	/**
	 * Minimal `EventEmitter` interface that is molded against the Node.js
	 * `EventEmitter` interface.
	 *
	 * @constructor
	 * @public
	 */
	function EventEmitter() {
	  this._events = new Events();
	  this._eventsCount = 0;
	}

	/**
	 * Return an array listing the events for which the emitter has registered
	 * listeners.
	 *
	 * @returns {Array}
	 * @public
	 */
	EventEmitter.prototype.eventNames = function eventNames() {
	  var names = []
	    , events
	    , name;

	  if (this._eventsCount === 0) return names;

	  for (name in (events = this._events)) {
	    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	  }

	  if (Object.getOwnPropertySymbols) {
	    return names.concat(Object.getOwnPropertySymbols(events));
	  }

	  return names;
	};

	/**
	 * Return the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Array} The registered listeners.
	 * @public
	 */
	EventEmitter.prototype.listeners = function listeners(event) {
	  var evt = prefix ? prefix + event : event
	    , handlers = this._events[evt];

	  if (!handlers) return [];
	  if (handlers.fn) return [handlers.fn];

	  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
	    ee[i] = handlers[i].fn;
	  }

	  return ee;
	};

	/**
	 * Return the number of listeners listening to a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Number} The number of listeners.
	 * @public
	 */
	EventEmitter.prototype.listenerCount = function listenerCount(event) {
	  var evt = prefix ? prefix + event : event
	    , listeners = this._events[evt];

	  if (!listeners) return 0;
	  if (listeners.fn) return 1;
	  return listeners.length;
	};

	/**
	 * Calls each of the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Boolean} `true` if the event had listeners, else `false`.
	 * @public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return false;

	  var listeners = this._events[evt]
	    , len = arguments.length
	    , args
	    , i;

	  if (listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }

	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }

	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;

	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }

	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }

	  return true;
	};

	/**
	 * Add a listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  return addListener(this, event, fn, context, false);
	};

	/**
	 * Add a one-time listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  return addListener(this, event, fn, context, true);
	};

	/**
	 * Remove the listeners of a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn Only remove the listeners that match this function.
	 * @param {*} context Only remove the listeners that have this context.
	 * @param {Boolean} once Only remove one-time listeners.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return this;
	  if (!fn) {
	    clearEvent(this, evt);
	    return this;
	  }

	  var listeners = this._events[evt];

	  if (listeners.fn) {
	    if (
	      listeners.fn === fn &&
	      (!once || listeners.once) &&
	      (!context || listeners.context === context)
	    ) {
	      clearEvent(this, evt);
	    }
	  } else {
	    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
	      if (
	        listeners[i].fn !== fn ||
	        (once && !listeners[i].once) ||
	        (context && listeners[i].context !== context)
	      ) {
	        events.push(listeners[i]);
	      }
	    }

	    //
	    // Reset the array, or remove it completely if we have no more listeners.
	    //
	    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
	    else clearEvent(this, evt);
	  }

	  return this;
	};

	/**
	 * Remove all listeners, or those of the specified event.
	 *
	 * @param {(String|Symbol)} [event] The event name.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  var evt;

	  if (event) {
	    evt = prefix ? prefix + event : event;
	    if (this._events[evt]) clearEvent(this, evt);
	  } else {
	    this._events = new Events();
	    this._eventsCount = 0;
	  }

	  return this;
	};

	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;

	//
	// Expose the prefix.
	//
	EventEmitter.prefixed = prefix;

	//
	// Allow `EventEmitter` to be imported as module namespace.
	//
	EventEmitter.EventEmitter = EventEmitter;

	//
	// Expose the module.
	//
	{
	  module.exports = EventEmitter;
	}
} (eventemitter3));

var EventEmitter = eventemitter3Exports;

// [TODO] - Move to @yoopta/utils or @yoopta/editor/utils
// helpers for serializing text nodes when you use custom parsers in your plugins
function serializeTextNodes(nodes) {
    return nodes
        .map((node) => {
        var _a, _b;
        if ('text' in node) {
            let text = node.text;
            if (node.bold) {
                text = `<strong style="font-weight: bolder;">${text}</strong>`;
            }
            if (node.italic) {
                text = `<i>${text}</i>`;
            }
            if (node.strike) {
                text = `<s>${text}</s>`;
            }
            if (node.underline) {
                text = `<u>${text}</u>`;
            }
            if (node.code) {
                text = `<code style="background-color: rgb(242 242 242); border-radius: .25rem; font-size: 75%; padding: 3px 6px;">${text}</code>`;
            }
            if (node.highlight) {
                text = `<mark style="color: ${(_a = node.highlight) === null || _a === void 0 ? void 0 : _a.color}; background-color: ${((_b = node.highlight) === null || _b === void 0 ? void 0 : _b.backgroundColor) || 'transparent'};">${text}</mark>`;
            }
            return text;
        }
        if (node.type === 'link') {
            const { url, target, rel } = node.props;
            const children = serializeTextNodes(node.children);
            return `<a href="${url}" target="${target}" rel="${rel}" style="color: rgb(0 122 255);
                cursor: pointer;
                position: relative;
                text-decoration-line: underline;
                text-underline-offset: 4px;">${children}</a>`;
        }
        return '';
    })
        .join('');
}
// [TODO] - Move to @yoopta/utils or @yoopta/editor/utils
// helpers for serializing text nodes into markdown style when you use custom parsers in your plugins
function serializeTextNodesIntoMarkdown(nodes) {
    return nodes
        .map((node) => {
        if ('text' in node) {
            let text = node.text;
            if (node.bold) {
                text = `**${text}**`;
            }
            if (node.italic) {
                text = `*${text}*`;
            }
            if (node.strike) {
                text = `~~${text}~~`;
            }
            if (node.underline) {
                text = `<u>${text}</u>`;
            }
            if (node.code) {
                text = `\`${text}\``;
            }
            return text;
        }
        if (node.type === 'link') {
            const { url, target, rel } = node.props;
            const children = serializeTextNodesIntoMarkdown(node.children);
            return `[${children}](${url})`;
        }
        return '';
    })
        .join('');
}

const DEFAULT_OPTIONS = {
    head: {
        meta: [
            { content: 'width=device-width', name: 'viewport' },
            { charset: 'UTF-8' },
            { content: 'IE=edge', 'http-equiv': 'X-UA-Compatible' },
        ],
    },
    body: {
        attrs: {
            style: {
                margin: '0 auto',
                padding: 0,
                width: '900px',
            },
        },
    },
    container: {
        attrs: {
            style: {
                margin: '0 auto',
                width: '600px',
            },
        },
    },
};
function getEmail(editor, content, opts) {
    var _a, _b, _c, _d, _e;
    const options = deepMerge(DEFAULT_OPTIONS, opts || {});
    const blocks = Object.values(content)
        .filter((item) => {
        const selectedBlocks = Paths.getSelectedPaths(editor);
        if (Array.isArray(selectedBlocks) && selectedBlocks.length > 0) {
            return selectedBlocks === null || selectedBlocks === void 0 ? void 0 : selectedBlocks.includes(item.meta.order);
        }
        return true;
    })
        .sort((a, b) => a.meta.order - b.meta.order);
    const email = blocks.map((blockData) => {
        var _a, _b;
        const plugin = editor.plugins[blockData.type];
        if (plugin && ((_b = (_a = plugin.parsers) === null || _a === void 0 ? void 0 : _a.email) === null || _b === void 0 ? void 0 : _b.serialize)) {
            // @ts-ignore - fixme
            const innerContent = serializeTextNodes(blockData.value[0].children);
            return plugin.parsers.email.serialize(blockData.value[0], innerContent, blockData.meta);
        }
        return '';
    });
    const emailContent = email.join('');
    if (options.customTemplate) {
        return options.customTemplate(emailContent);
    }
    const bodyAttrs = attributesToString((_a = options.body) === null || _a === void 0 ? void 0 : _a.attrs);
    const containerAttrs = attributesToString((_b = options.container) === null || _b === void 0 ? void 0 : _b.attrs);
    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html lang="en">
      <head>
        <title>${((_c = options === null || options === void 0 ? void 0 : options.head) === null || _c === void 0 ? void 0 : _c.title) || 'Email-Builder'}</title>
        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
        ${generateMetaTags((_d = options.head) === null || _d === void 0 ? void 0 : _d.meta)}
        ${generateStyles((_e = options.head) === null || _e === void 0 ? void 0 : _e.styles)}
      </head>
      <body id="yoopta-email" ${bodyAttrs}>
        <table ${containerAttrs}>
          <tbody>
            <tr>
              <td>
                ${emailContent}
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}
// Email helpers
function generateMetaTags(meta = []) {
    return meta
        .map((tag) => {
        const attrs = Object.entries(tag)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => {
            if (value === '')
                return key;
            return `${key}="${value}"`;
        })
            .join(' ');
        return `<meta ${attrs}>`;
    })
        .join('\n');
}
function generateStyles(styles = []) {
    return styles
        .map((style) => {
        const idAttr = style.id ? ` id="${style.id}"` : '';
        return `<style${idAttr}>${style.content}</style>`;
    })
        .join('\n');
}
function styleObjectToString(style) {
    if (!style)
        return '';
    return Object.entries(style)
        .map(([key, value]) => {
        const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        return `${cssKey}: ${value}${typeof value === 'number' ? 'px' : ''};`;
    })
        .join(' ');
}
function attributesToString(attrs) {
    if (!attrs)
        return '';
    return Object.entries(attrs)
        .map(([key, value]) => {
        if (key === 'style') {
            const styleString = styleObjectToString(value);
            return `style="${styleString}"`;
        }
        return `${key}="${value}"`;
    })
        .join(' ');
}
function deepMerge(target, source) {
    if (Array.isArray(target) && Array.isArray(source)) {
        return target.concat(source);
    }
    if (typeof target === 'object' && typeof source === 'object') {
        return Object.keys(Object.assign(Object.assign({}, target), source)).reduce((acc, key) => {
            acc[key] = deepMerge(target[key], source[key]);
            return acc;
        }, {});
    }
    return source;
}

const eventEmitter = new EventEmitter();
const Events = {
    on: (event, fn) => eventEmitter.on(event, fn),
    once: (event, fn) => eventEmitter.once(event, fn),
    off: (event, fn) => eventEmitter.off(event, fn),
    emit: (event, payload) => eventEmitter.emit(event, payload),
};
function createYooptaEditor() {
    const editor = {
        id: '',
        children: {},
        blockEditorsMap: {},
        path: { current: null },
        readOnly: false,
        isEmpty: () => isEmpty(editor),
        getEditorValue: () => getEditorValue(editor),
        setEditorValue: (...args) => setEditorValue(editor, ...args),
        insertBlock: (...args) => insertBlock(editor, ...args),
        deleteBlock: (...args) => deleteBlock(editor, ...args),
        duplicateBlock: (...args) => duplicateBlock(editor, ...args),
        toggleBlock: (...args) => toggleBlock(editor, ...args),
        increaseBlockDepth: (...args) => increaseBlockDepth(editor, ...args),
        decreaseBlockDepth: (...args) => decreaseBlockDepth(editor, ...args),
        moveBlock: (...args) => moveBlock(editor, ...args),
        focusBlock: (...args) => focusBlock(editor, ...args),
        getBlock: (...args) => getBlock(editor, ...args),
        updateBlock: (...args) => updateBlock(editor, ...args),
        splitBlock: (...args) => splitBlock(editor, ...args),
        mergeBlock: (...args) => mergeBlock(editor, ...args),
        setPath: (...args) => setPath(editor, ...args),
        blocks: {},
        formats: {},
        shortcuts: {},
        plugins: {},
        commands: {},
        applyTransforms: (operations, ...args) => applyTransforms(editor, operations, ...args),
        batchOperations: (callback) => batchOperations(editor, callback),
        on: (event, callback) => Events.on(event, callback),
        off: (event, callback) => Events.off(event, callback),
        emit: (event, ...args) => Events.emit(event, ...args),
        once: (event, callback) => Events.once(event, callback),
        isFocused: () => isFocused(editor),
        focus: () => focus(editor),
        blur: (...args) => blur(editor, ...args),
        getHTML: (content) => getHTML(editor, content),
        getMarkdown: (content) => getMarkdown(editor, content),
        getPlainText: (content) => getPlainText(editor, content),
        getEmail: (content, options) => getEmail(editor, content, options),
        refElement: null,
        historyStack: {
            undos: [],
            redos: [],
        },
        redo: (options) => YooptaHistory.redo(editor, options),
        undo: (options) => YooptaHistory.undo(editor, options),
        isSavingHistory: () => YooptaHistory.isSavingHistory(editor),
        isMergingHistory: () => YooptaHistory.isMergingHistory(editor),
        withoutSavingHistory: (fn) => YooptaHistory.withoutSavingHistory(editor, fn),
        withSavingHistory: (fn) => YooptaHistory.withSavingHistory(editor, fn),
        withoutMergingHistory: (fn) => YooptaHistory.withoutMergingHistory(editor, fn),
        withMergingHistory: (fn) => YooptaHistory.withMergingHistory(editor, fn),
    };
    return editor;
}

const DEFAULT_HANDLERS = {
    editor: createYooptaEditor(),
};
const YooptaContext = createContext(DEFAULT_HANDLERS);
/**
 *
 */
const YooptaContextProvider = ({ children, editorState }) => {
    const contextValueRef = useRef(DEFAULT_HANDLERS);
    contextValueRef.current = {
        editor: editorState.editor,
    };
    return jsx(YooptaContext.Provider, Object.assign({ value: contextValueRef.current }, { children: children }));
};
const useYooptaEditor = () => {
    const context = useContext(YooptaContext);
    if (!context) {
        throw new Error('useYooptaEditor must be used within a YooptaEditorContext');
    }
    return context.editor;
};
const useBlockData = (blockId) => useYooptaEditor().children[blockId];
const useYooptaFocused = () => useYooptaEditor().isFocused();
const useYooptaReadOnly = () => useYooptaEditor().readOnly;
const useYooptaPluginOptions = (pluginType) => { var _a; return (_a = useYooptaEditor().plugins[pluginType]) === null || _a === void 0 ? void 0 : _a.options; };
const useBlockSelected = ({ blockId, at }) => {
    const editor = useYooptaEditor();
    if (!blockId && typeof at !== 'number') {
        throw new Error('useBlockSelected must receive either blockId or at');
    }
    let block;
    if (blockId) {
        block = editor.children[blockId];
    }
    if (at) {
        block = Blocks.getBlock(editor, { at: at });
    }
    return editor.path.current === (block === null || block === void 0 ? void 0 : block.meta.order);
};

function useCombinedRefs() {
  for (var _len = arguments.length, refs = new Array(_len), _key = 0; _key < _len; _key++) {
    refs[_key] = arguments[_key];
  }

  return useMemo(() => node => {
    refs.forEach(ref => ref(node));
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  refs);
}

// https://github.com/facebook/react/blob/master/packages/shared/ExecutionEnvironment.js
const canUseDOM = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined';

function isWindow(element) {
  const elementString = Object.prototype.toString.call(element);
  return elementString === '[object Window]' || // In Electron context the Window object serializes to [object global]
  elementString === '[object global]';
}

function isNode$1(node) {
  return 'nodeType' in node;
}

function getWindow$1(target) {
  var _target$ownerDocument, _target$ownerDocument2;

  if (!target) {
    return window;
  }

  if (isWindow(target)) {
    return target;
  }

  if (!isNode$1(target)) {
    return window;
  }

  return (_target$ownerDocument = (_target$ownerDocument2 = target.ownerDocument) == null ? void 0 : _target$ownerDocument2.defaultView) != null ? _target$ownerDocument : window;
}

function isDocument(node) {
  const {
    Document
  } = getWindow$1(node);
  return node instanceof Document;
}

function isHTMLElement$1(node) {
  if (isWindow(node)) {
    return false;
  }

  return node instanceof getWindow$1(node).HTMLElement;
}

function isSVGElement(node) {
  return node instanceof getWindow$1(node).SVGElement;
}

function getOwnerDocument(target) {
  if (!target) {
    return document;
  }

  if (isWindow(target)) {
    return target.document;
  }

  if (!isNode$1(target)) {
    return document;
  }

  if (isDocument(target)) {
    return target;
  }

  if (isHTMLElement$1(target) || isSVGElement(target)) {
    return target.ownerDocument;
  }

  return document;
}

/**
 * A hook that resolves to useEffect on the server and useLayoutEffect on the client
 * @param callback {function} Callback function that is invoked when the dependencies of the hook change
 */

const useIsomorphicLayoutEffect = canUseDOM ? useLayoutEffect : useEffect;

function useEvent(handler) {
  const handlerRef = useRef(handler);
  useIsomorphicLayoutEffect(() => {
    handlerRef.current = handler;
  });
  return useCallback(function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return handlerRef.current == null ? void 0 : handlerRef.current(...args);
  }, []);
}

function useInterval() {
  const intervalRef = useRef(null);
  const set = useCallback((listener, duration) => {
    intervalRef.current = setInterval(listener, duration);
  }, []);
  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  return [set, clear];
}

function useLatestValue(value, dependencies) {
  if (dependencies === void 0) {
    dependencies = [value];
  }

  const valueRef = useRef(value);
  useIsomorphicLayoutEffect(() => {
    if (valueRef.current !== value) {
      valueRef.current = value;
    }
  }, dependencies);
  return valueRef;
}

function useLazyMemo(callback, dependencies) {
  const valueRef = useRef();
  return useMemo(() => {
    const newValue = callback(valueRef.current);
    valueRef.current = newValue;
    return newValue;
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [...dependencies]);
}

function useNodeRef(onChange) {
  const onChangeHandler = useEvent(onChange);
  const node = useRef(null);
  const setNodeRef = useCallback(element => {
    if (element !== node.current) {
      onChangeHandler == null ? void 0 : onChangeHandler(element, node.current);
    }

    node.current = element;
  }, //eslint-disable-next-line
  []);
  return [node, setNodeRef];
}

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

let ids = {};
function useUniqueId(prefix, value) {
  return useMemo(() => {
    if (value) {
      return value;
    }

    const id = ids[prefix] == null ? 0 : ids[prefix] + 1;
    ids[prefix] = id;
    return prefix + "-" + id;
  }, [prefix, value]);
}

function createAdjustmentFn(modifier) {
  return function (object) {
    for (var _len = arguments.length, adjustments = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      adjustments[_key - 1] = arguments[_key];
    }

    return adjustments.reduce((accumulator, adjustment) => {
      const entries = Object.entries(adjustment);

      for (const [key, valueAdjustment] of entries) {
        const value = accumulator[key];

        if (value != null) {
          accumulator[key] = value + modifier * valueAdjustment;
        }
      }

      return accumulator;
    }, { ...object
    });
  };
}

const add = /*#__PURE__*/createAdjustmentFn(1);
const subtract = /*#__PURE__*/createAdjustmentFn(-1);

function hasViewportRelativeCoordinates(event) {
  return 'clientX' in event && 'clientY' in event;
}

function isKeyboardEvent(event) {
  if (!event) {
    return false;
  }

  const {
    KeyboardEvent
  } = getWindow$1(event.target);
  return KeyboardEvent && event instanceof KeyboardEvent;
}

function isTouchEvent(event) {
  if (!event) {
    return false;
  }

  const {
    TouchEvent
  } = getWindow$1(event.target);
  return TouchEvent && event instanceof TouchEvent;
}

/**
 * Returns the normalized x and y coordinates for mouse and touch events.
 */

function getEventCoordinates(event) {
  if (isTouchEvent(event)) {
    if (event.touches && event.touches.length) {
      const {
        clientX: x,
        clientY: y
      } = event.touches[0];
      return {
        x,
        y
      };
    } else if (event.changedTouches && event.changedTouches.length) {
      const {
        clientX: x,
        clientY: y
      } = event.changedTouches[0];
      return {
        x,
        y
      };
    }
  }

  if (hasViewportRelativeCoordinates(event)) {
    return {
      x: event.clientX,
      y: event.clientY
    };
  }

  return null;
}

const CSS$1 = /*#__PURE__*/Object.freeze({
  Translate: {
    toString(transform) {
      if (!transform) {
        return;
      }

      const {
        x,
        y
      } = transform;
      return "translate3d(" + (x ? Math.round(x) : 0) + "px, " + (y ? Math.round(y) : 0) + "px, 0)";
    }

  },
  Scale: {
    toString(transform) {
      if (!transform) {
        return;
      }

      const {
        scaleX,
        scaleY
      } = transform;
      return "scaleX(" + scaleX + ") scaleY(" + scaleY + ")";
    }

  },
  Transform: {
    toString(transform) {
      if (!transform) {
        return;
      }

      return [CSS$1.Translate.toString(transform), CSS$1.Scale.toString(transform)].join(' ');
    }

  },
  Transition: {
    toString(_ref) {
      let {
        property,
        duration,
        easing
      } = _ref;
      return property + " " + duration + "ms " + easing;
    }

  }
});

const SELECTOR = 'a,frame,iframe,input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled),*[tabindex]';
function findFirstFocusableNode(element) {
  if (element.matches(SELECTOR)) {
    return element;
  }

  return element.querySelector(SELECTOR);
}

const hiddenStyles = {
  display: 'none'
};
function HiddenText(_ref) {
  let {
    id,
    value
  } = _ref;
  return React__default.createElement("div", {
    id: id,
    style: hiddenStyles
  }, value);
}

function LiveRegion(_ref) {
  let {
    id,
    announcement,
    ariaLiveType = "assertive"
  } = _ref;
  // Hide element visually but keep it readable by screen readers
  const visuallyHidden = {
    position: 'fixed',
    width: 1,
    height: 1,
    margin: -1,
    border: 0,
    padding: 0,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(100%)',
    whiteSpace: 'nowrap'
  };
  return React__default.createElement("div", {
    id: id,
    style: visuallyHidden,
    role: "status",
    "aria-live": ariaLiveType,
    "aria-atomic": true
  }, announcement);
}

function useAnnouncement() {
  const [announcement, setAnnouncement] = useState('');
  const announce = useCallback(value => {
    if (value != null) {
      setAnnouncement(value);
    }
  }, []);
  return {
    announce,
    announcement
  };
}

const DndMonitorContext = /*#__PURE__*/createContext(null);

function useDndMonitor(listener) {
  const registerListener = useContext(DndMonitorContext);
  useEffect(() => {
    if (!registerListener) {
      throw new Error('useDndMonitor must be used within a children of <DndContext>');
    }

    const unsubscribe = registerListener(listener);
    return unsubscribe;
  }, [listener, registerListener]);
}

function useDndMonitorProvider() {
  const [listeners] = useState(() => new Set());
  const registerListener = useCallback(listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, [listeners]);
  const dispatch = useCallback(_ref => {
    let {
      type,
      event
    } = _ref;
    listeners.forEach(listener => {
      var _listener$type;

      return (_listener$type = listener[type]) == null ? void 0 : _listener$type.call(listener, event);
    });
  }, [listeners]);
  return [dispatch, registerListener];
}

const defaultScreenReaderInstructions = {
  draggable: "\n    To pick up a draggable item, press the space bar.\n    While dragging, use the arrow keys to move the item.\n    Press space again to drop the item in its new position, or press escape to cancel.\n  "
};
const defaultAnnouncements = {
  onDragStart(_ref) {
    let {
      active
    } = _ref;
    return "Picked up draggable item " + active.id + ".";
  },

  onDragOver(_ref2) {
    let {
      active,
      over
    } = _ref2;

    if (over) {
      return "Draggable item " + active.id + " was moved over droppable area " + over.id + ".";
    }

    return "Draggable item " + active.id + " is no longer over a droppable area.";
  },

  onDragEnd(_ref3) {
    let {
      active,
      over
    } = _ref3;

    if (over) {
      return "Draggable item " + active.id + " was dropped over droppable area " + over.id;
    }

    return "Draggable item " + active.id + " was dropped.";
  },

  onDragCancel(_ref4) {
    let {
      active
    } = _ref4;
    return "Dragging was cancelled. Draggable item " + active.id + " was dropped.";
  }

};

function Accessibility(_ref) {
  let {
    announcements = defaultAnnouncements,
    container,
    hiddenTextDescribedById,
    screenReaderInstructions = defaultScreenReaderInstructions
  } = _ref;
  const {
    announce,
    announcement
  } = useAnnouncement();
  const liveRegionId = useUniqueId("DndLiveRegion");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useDndMonitor(useMemo(() => ({
    onDragStart(_ref2) {
      let {
        active
      } = _ref2;
      announce(announcements.onDragStart({
        active
      }));
    },

    onDragMove(_ref3) {
      let {
        active,
        over
      } = _ref3;

      if (announcements.onDragMove) {
        announce(announcements.onDragMove({
          active,
          over
        }));
      }
    },

    onDragOver(_ref4) {
      let {
        active,
        over
      } = _ref4;
      announce(announcements.onDragOver({
        active,
        over
      }));
    },

    onDragEnd(_ref5) {
      let {
        active,
        over
      } = _ref5;
      announce(announcements.onDragEnd({
        active,
        over
      }));
    },

    onDragCancel(_ref6) {
      let {
        active,
        over
      } = _ref6;
      announce(announcements.onDragCancel({
        active,
        over
      }));
    }

  }), [announce, announcements]));

  if (!mounted) {
    return null;
  }

  const markup = React__default.createElement(React__default.Fragment, null, React__default.createElement(HiddenText, {
    id: hiddenTextDescribedById,
    value: screenReaderInstructions.draggable
  }), React__default.createElement(LiveRegion, {
    id: liveRegionId,
    announcement: announcement
  }));
  return container ? createPortal(markup, container) : markup;
}

var Action;

(function (Action) {
  Action["DragStart"] = "dragStart";
  Action["DragMove"] = "dragMove";
  Action["DragEnd"] = "dragEnd";
  Action["DragCancel"] = "dragCancel";
  Action["DragOver"] = "dragOver";
  Action["RegisterDroppable"] = "registerDroppable";
  Action["SetDroppableDisabled"] = "setDroppableDisabled";
  Action["UnregisterDroppable"] = "unregisterDroppable";
})(Action || (Action = {}));

function noop() {}

function useSensor(sensor, options) {
  return useMemo(() => ({
    sensor,
    options: options != null ? options : {}
  }), // eslint-disable-next-line react-hooks/exhaustive-deps
  [sensor, options]);
}

function useSensors() {
  for (var _len = arguments.length, sensors = new Array(_len), _key = 0; _key < _len; _key++) {
    sensors[_key] = arguments[_key];
  }

  return useMemo(() => [...sensors].filter(sensor => sensor != null), // eslint-disable-next-line react-hooks/exhaustive-deps
  [...sensors]);
}

const defaultCoordinates = /*#__PURE__*/Object.freeze({
  x: 0,
  y: 0
});

/**
 * Returns the distance between two points
 */
function distanceBetween(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Sort collisions from smallest to greatest value
 */
function sortCollisionsAsc(_ref, _ref2) {
  let {
    data: {
      value: a
    }
  } = _ref;
  let {
    data: {
      value: b
    }
  } = _ref2;
  return a - b;
}
/**
 * Sort collisions from greatest to smallest value
 */

function sortCollisionsDesc(_ref3, _ref4) {
  let {
    data: {
      value: a
    }
  } = _ref3;
  let {
    data: {
      value: b
    }
  } = _ref4;
  return b - a;
}
/**
 * Returns the coordinates of the corners of a given rectangle:
 * [TopLeft {x, y}, TopRight {x, y}, BottomLeft {x, y}, BottomRight {x, y}]
 */

function cornersOfRectangle(_ref5) {
  let {
    left,
    top,
    height,
    width
  } = _ref5;
  return [{
    x: left,
    y: top
  }, {
    x: left + width,
    y: top
  }, {
    x: left,
    y: top + height
  }, {
    x: left + width,
    y: top + height
  }];
}
function getFirstCollision(collisions, property) {
  if (!collisions || collisions.length === 0) {
    return null;
  }

  const [firstCollision] = collisions;
  return property ? firstCollision[property] : firstCollision;
}

/**
 * Returns the coordinates of the center of a given ClientRect
 */

function centerOfRectangle(rect, left, top) {
  if (left === void 0) {
    left = rect.left;
  }

  if (top === void 0) {
    top = rect.top;
  }

  return {
    x: left + rect.width * 0.5,
    y: top + rect.height * 0.5
  };
}
/**
 * Returns the closest rectangles from an array of rectangles to the center of a given
 * rectangle.
 */


const closestCenter = _ref => {
  let {
    collisionRect,
    droppableRects,
    droppableContainers
  } = _ref;
  const centerRect = centerOfRectangle(collisionRect, collisionRect.left, collisionRect.top);
  const collisions = [];

  for (const droppableContainer of droppableContainers) {
    const {
      id
    } = droppableContainer;
    const rect = droppableRects.get(id);

    if (rect) {
      const distBetween = distanceBetween(centerOfRectangle(rect), centerRect);
      collisions.push({
        id,
        data: {
          droppableContainer,
          value: distBetween
        }
      });
    }
  }

  return collisions.sort(sortCollisionsAsc);
};

/**
 * Returns the closest rectangles from an array of rectangles to the corners of
 * another rectangle.
 */

const closestCorners = _ref => {
  let {
    collisionRect,
    droppableRects,
    droppableContainers
  } = _ref;
  const corners = cornersOfRectangle(collisionRect);
  const collisions = [];

  for (const droppableContainer of droppableContainers) {
    const {
      id
    } = droppableContainer;
    const rect = droppableRects.get(id);

    if (rect) {
      const rectCorners = cornersOfRectangle(rect);
      const distances = corners.reduce((accumulator, corner, index) => {
        return accumulator + distanceBetween(rectCorners[index], corner);
      }, 0);
      const effectiveDistance = Number((distances / 4).toFixed(4));
      collisions.push({
        id,
        data: {
          droppableContainer,
          value: effectiveDistance
        }
      });
    }
  }

  return collisions.sort(sortCollisionsAsc);
};

/**
 * Returns the intersecting rectangle area between two rectangles
 */

function getIntersectionRatio(entry, target) {
  const top = Math.max(target.top, entry.top);
  const left = Math.max(target.left, entry.left);
  const right = Math.min(target.left + target.width, entry.left + entry.width);
  const bottom = Math.min(target.top + target.height, entry.top + entry.height);
  const width = right - left;
  const height = bottom - top;

  if (left < right && top < bottom) {
    const targetArea = target.width * target.height;
    const entryArea = entry.width * entry.height;
    const intersectionArea = width * height;
    const intersectionRatio = intersectionArea / (targetArea + entryArea - intersectionArea);
    return Number(intersectionRatio.toFixed(4));
  } // Rectangles do not overlap, or overlap has an area of zero (edge/corner overlap)


  return 0;
}
/**
 * Returns the rectangles that has the greatest intersection area with a given
 * rectangle in an array of rectangles.
 */

const rectIntersection = _ref => {
  let {
    collisionRect,
    droppableRects,
    droppableContainers
  } = _ref;
  const collisions = [];

  for (const droppableContainer of droppableContainers) {
    const {
      id
    } = droppableContainer;
    const rect = droppableRects.get(id);

    if (rect) {
      const intersectionRatio = getIntersectionRatio(rect, collisionRect);

      if (intersectionRatio > 0) {
        collisions.push({
          id,
          data: {
            droppableContainer,
            value: intersectionRatio
          }
        });
      }
    }
  }

  return collisions.sort(sortCollisionsDesc);
};

function adjustScale(transform, rect1, rect2) {
  return { ...transform,
    scaleX: rect1 && rect2 ? rect1.width / rect2.width : 1,
    scaleY: rect1 && rect2 ? rect1.height / rect2.height : 1
  };
}

function getRectDelta(rect1, rect2) {
  return rect1 && rect2 ? {
    x: rect1.left - rect2.left,
    y: rect1.top - rect2.top
  } : defaultCoordinates;
}

function createRectAdjustmentFn(modifier) {
  return function adjustClientRect(rect) {
    for (var _len = arguments.length, adjustments = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      adjustments[_key - 1] = arguments[_key];
    }

    return adjustments.reduce((acc, adjustment) => ({ ...acc,
      top: acc.top + modifier * adjustment.y,
      bottom: acc.bottom + modifier * adjustment.y,
      left: acc.left + modifier * adjustment.x,
      right: acc.right + modifier * adjustment.x
    }), { ...rect
    });
  };
}
const getAdjustedRect = /*#__PURE__*/createRectAdjustmentFn(1);

function parseTransform(transform) {
  if (transform.startsWith('matrix3d(')) {
    const transformArray = transform.slice(9, -1).split(/, /);
    return {
      x: +transformArray[12],
      y: +transformArray[13],
      scaleX: +transformArray[0],
      scaleY: +transformArray[5]
    };
  } else if (transform.startsWith('matrix(')) {
    const transformArray = transform.slice(7, -1).split(/, /);
    return {
      x: +transformArray[4],
      y: +transformArray[5],
      scaleX: +transformArray[0],
      scaleY: +transformArray[3]
    };
  }

  return null;
}

function inverseTransform(rect, transform, transformOrigin) {
  const parsedTransform = parseTransform(transform);

  if (!parsedTransform) {
    return rect;
  }

  const {
    scaleX,
    scaleY,
    x: translateX,
    y: translateY
  } = parsedTransform;
  const x = rect.left - translateX - (1 - scaleX) * parseFloat(transformOrigin);
  const y = rect.top - translateY - (1 - scaleY) * parseFloat(transformOrigin.slice(transformOrigin.indexOf(' ') + 1));
  const w = scaleX ? rect.width / scaleX : rect.width;
  const h = scaleY ? rect.height / scaleY : rect.height;
  return {
    width: w,
    height: h,
    top: y,
    right: x + w,
    bottom: y + h,
    left: x
  };
}

const defaultOptions = {
  ignoreTransform: false
};
/**
 * Returns the bounding client rect of an element relative to the viewport.
 */

function getClientRect(element, options) {
  if (options === void 0) {
    options = defaultOptions;
  }

  let rect = element.getBoundingClientRect();

  if (options.ignoreTransform) {
    const {
      transform,
      transformOrigin
    } = getWindow$1(element).getComputedStyle(element);

    if (transform) {
      rect = inverseTransform(rect, transform, transformOrigin);
    }
  }

  const {
    top,
    left,
    width,
    height,
    bottom,
    right
  } = rect;
  return {
    top,
    left,
    width,
    height,
    bottom,
    right
  };
}
/**
 * Returns the bounding client rect of an element relative to the viewport.
 *
 * @remarks
 * The ClientRect returned by this method does not take into account transforms
 * applied to the element it measures.
 *
 */

function getTransformAgnosticClientRect(element) {
  return getClientRect(element, {
    ignoreTransform: true
  });
}

function getWindowClientRect(element) {
  const width = element.innerWidth;
  const height = element.innerHeight;
  return {
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height
  };
}

function isFixed(node, computedStyle) {
  if (computedStyle === void 0) {
    computedStyle = getWindow$1(node).getComputedStyle(node);
  }

  return computedStyle.position === 'fixed';
}

function isScrollable(element, computedStyle) {
  if (computedStyle === void 0) {
    computedStyle = getWindow$1(element).getComputedStyle(element);
  }

  const overflowRegex = /(auto|scroll|overlay)/;
  const properties = ['overflow', 'overflowX', 'overflowY'];
  return properties.some(property => {
    const value = computedStyle[property];
    return typeof value === 'string' ? overflowRegex.test(value) : false;
  });
}

function getScrollableAncestors(element, limit) {
  const scrollParents = [];

  function findScrollableAncestors(node) {
    if (limit != null && scrollParents.length >= limit) {
      return scrollParents;
    }

    if (!node) {
      return scrollParents;
    }

    if (isDocument(node) && node.scrollingElement != null && !scrollParents.includes(node.scrollingElement)) {
      scrollParents.push(node.scrollingElement);
      return scrollParents;
    }

    if (!isHTMLElement$1(node) || isSVGElement(node)) {
      return scrollParents;
    }

    if (scrollParents.includes(node)) {
      return scrollParents;
    }

    const computedStyle = getWindow$1(element).getComputedStyle(node);

    if (node !== element) {
      if (isScrollable(node, computedStyle)) {
        scrollParents.push(node);
      }
    }

    if (isFixed(node, computedStyle)) {
      return scrollParents;
    }

    return findScrollableAncestors(node.parentNode);
  }

  if (!element) {
    return scrollParents;
  }

  return findScrollableAncestors(element);
}
function getFirstScrollableAncestor(node) {
  const [firstScrollableAncestor] = getScrollableAncestors(node, 1);
  return firstScrollableAncestor != null ? firstScrollableAncestor : null;
}

function getScrollableElement(element) {
  if (!canUseDOM || !element) {
    return null;
  }

  if (isWindow(element)) {
    return element;
  }

  if (!isNode$1(element)) {
    return null;
  }

  if (isDocument(element) || element === getOwnerDocument(element).scrollingElement) {
    return window;
  }

  if (isHTMLElement$1(element)) {
    return element;
  }

  return null;
}

function getScrollXCoordinate(element) {
  if (isWindow(element)) {
    return element.scrollX;
  }

  return element.scrollLeft;
}
function getScrollYCoordinate(element) {
  if (isWindow(element)) {
    return element.scrollY;
  }

  return element.scrollTop;
}
function getScrollCoordinates(element) {
  return {
    x: getScrollXCoordinate(element),
    y: getScrollYCoordinate(element)
  };
}

var Direction;

(function (Direction) {
  Direction[Direction["Forward"] = 1] = "Forward";
  Direction[Direction["Backward"] = -1] = "Backward";
})(Direction || (Direction = {}));

function isDocumentScrollingElement(element) {
  if (!canUseDOM || !element) {
    return false;
  }

  return element === document.scrollingElement;
}

function getScrollPosition(scrollingContainer) {
  const minScroll = {
    x: 0,
    y: 0
  };
  const dimensions = isDocumentScrollingElement(scrollingContainer) ? {
    height: window.innerHeight,
    width: window.innerWidth
  } : {
    height: scrollingContainer.clientHeight,
    width: scrollingContainer.clientWidth
  };
  const maxScroll = {
    x: scrollingContainer.scrollWidth - dimensions.width,
    y: scrollingContainer.scrollHeight - dimensions.height
  };
  const isTop = scrollingContainer.scrollTop <= minScroll.y;
  const isLeft = scrollingContainer.scrollLeft <= minScroll.x;
  const isBottom = scrollingContainer.scrollTop >= maxScroll.y;
  const isRight = scrollingContainer.scrollLeft >= maxScroll.x;
  return {
    isTop,
    isLeft,
    isBottom,
    isRight,
    maxScroll,
    minScroll
  };
}

const defaultThreshold = {
  x: 0.2,
  y: 0.2
};
function getScrollDirectionAndSpeed(scrollContainer, scrollContainerRect, _ref, acceleration, thresholdPercentage) {
  let {
    top,
    left,
    right,
    bottom
  } = _ref;

  if (acceleration === void 0) {
    acceleration = 10;
  }

  if (thresholdPercentage === void 0) {
    thresholdPercentage = defaultThreshold;
  }

  const {
    isTop,
    isBottom,
    isLeft,
    isRight
  } = getScrollPosition(scrollContainer);
  const direction = {
    x: 0,
    y: 0
  };
  const speed = {
    x: 0,
    y: 0
  };
  const threshold = {
    height: scrollContainerRect.height * thresholdPercentage.y,
    width: scrollContainerRect.width * thresholdPercentage.x
  };

  if (!isTop && top <= scrollContainerRect.top + threshold.height) {
    // Scroll Up
    direction.y = Direction.Backward;
    speed.y = acceleration * Math.abs((scrollContainerRect.top + threshold.height - top) / threshold.height);
  } else if (!isBottom && bottom >= scrollContainerRect.bottom - threshold.height) {
    // Scroll Down
    direction.y = Direction.Forward;
    speed.y = acceleration * Math.abs((scrollContainerRect.bottom - threshold.height - bottom) / threshold.height);
  }

  if (!isRight && right >= scrollContainerRect.right - threshold.width) {
    // Scroll Right
    direction.x = Direction.Forward;
    speed.x = acceleration * Math.abs((scrollContainerRect.right - threshold.width - right) / threshold.width);
  } else if (!isLeft && left <= scrollContainerRect.left + threshold.width) {
    // Scroll Left
    direction.x = Direction.Backward;
    speed.x = acceleration * Math.abs((scrollContainerRect.left + threshold.width - left) / threshold.width);
  }

  return {
    direction,
    speed
  };
}

function getScrollElementRect(element) {
  if (element === document.scrollingElement) {
    const {
      innerWidth,
      innerHeight
    } = window;
    return {
      top: 0,
      left: 0,
      right: innerWidth,
      bottom: innerHeight,
      width: innerWidth,
      height: innerHeight
    };
  }

  const {
    top,
    left,
    right,
    bottom
  } = element.getBoundingClientRect();
  return {
    top,
    left,
    right,
    bottom,
    width: element.clientWidth,
    height: element.clientHeight
  };
}

function getScrollOffsets(scrollableAncestors) {
  return scrollableAncestors.reduce((acc, node) => {
    return add(acc, getScrollCoordinates(node));
  }, defaultCoordinates);
}
function getScrollXOffset(scrollableAncestors) {
  return scrollableAncestors.reduce((acc, node) => {
    return acc + getScrollXCoordinate(node);
  }, 0);
}
function getScrollYOffset(scrollableAncestors) {
  return scrollableAncestors.reduce((acc, node) => {
    return acc + getScrollYCoordinate(node);
  }, 0);
}

function scrollIntoViewIfNeeded(element, measure) {
  if (measure === void 0) {
    measure = getClientRect;
  }

  if (!element) {
    return;
  }

  const {
    top,
    left,
    bottom,
    right
  } = measure(element);
  const firstScrollableAncestor = getFirstScrollableAncestor(element);

  if (!firstScrollableAncestor) {
    return;
  }

  if (bottom <= 0 || right <= 0 || top >= window.innerHeight || left >= window.innerWidth) {
    element.scrollIntoView({
      block: 'center',
      inline: 'center'
    });
  }
}

const properties = [['x', ['left', 'right'], getScrollXOffset], ['y', ['top', 'bottom'], getScrollYOffset]];
class Rect {
  constructor(rect, element) {
    this.rect = void 0;
    this.width = void 0;
    this.height = void 0;
    this.top = void 0;
    this.bottom = void 0;
    this.right = void 0;
    this.left = void 0;
    const scrollableAncestors = getScrollableAncestors(element);
    const scrollOffsets = getScrollOffsets(scrollableAncestors);
    this.rect = { ...rect
    };
    this.width = rect.width;
    this.height = rect.height;

    for (const [axis, keys, getScrollOffset] of properties) {
      for (const key of keys) {
        Object.defineProperty(this, key, {
          get: () => {
            const currentOffsets = getScrollOffset(scrollableAncestors);
            const scrollOffsetsDeltla = scrollOffsets[axis] - currentOffsets;
            return this.rect[key] + scrollOffsetsDeltla;
          },
          enumerable: true
        });
      }
    }

    Object.defineProperty(this, 'rect', {
      enumerable: false
    });
  }

}

class Listeners {
  constructor(target) {
    this.target = void 0;
    this.listeners = [];

    this.removeAll = () => {
      this.listeners.forEach(listener => {
        var _this$target;

        return (_this$target = this.target) == null ? void 0 : _this$target.removeEventListener(...listener);
      });
    };

    this.target = target;
  }

  add(eventName, handler, options) {
    var _this$target2;

    (_this$target2 = this.target) == null ? void 0 : _this$target2.addEventListener(eventName, handler, options);
    this.listeners.push([eventName, handler, options]);
  }

}

function getEventListenerTarget(target) {
  // If the `event.target` element is removed from the document events will still be targeted
  // at it, and hence won't always bubble up to the window or document anymore.
  // If there is any risk of an element being removed while it is being dragged,
  // the best practice is to attach the event listeners directly to the target.
  // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
  const {
    EventTarget
  } = getWindow$1(target);
  return target instanceof EventTarget ? target : getOwnerDocument(target);
}

function hasExceededDistance(delta, measurement) {
  const dx = Math.abs(delta.x);
  const dy = Math.abs(delta.y);

  if (typeof measurement === 'number') {
    return Math.sqrt(dx ** 2 + dy ** 2) > measurement;
  }

  if ('x' in measurement && 'y' in measurement) {
    return dx > measurement.x && dy > measurement.y;
  }

  if ('x' in measurement) {
    return dx > measurement.x;
  }

  if ('y' in measurement) {
    return dy > measurement.y;
  }

  return false;
}

var EventName;

(function (EventName) {
  EventName["Click"] = "click";
  EventName["DragStart"] = "dragstart";
  EventName["Keydown"] = "keydown";
  EventName["ContextMenu"] = "contextmenu";
  EventName["Resize"] = "resize";
  EventName["SelectionChange"] = "selectionchange";
  EventName["VisibilityChange"] = "visibilitychange";
})(EventName || (EventName = {}));

function preventDefault(event) {
  event.preventDefault();
}
function stopPropagation(event) {
  event.stopPropagation();
}

var KeyboardCode;

(function (KeyboardCode) {
  KeyboardCode["Space"] = "Space";
  KeyboardCode["Down"] = "ArrowDown";
  KeyboardCode["Right"] = "ArrowRight";
  KeyboardCode["Left"] = "ArrowLeft";
  KeyboardCode["Up"] = "ArrowUp";
  KeyboardCode["Esc"] = "Escape";
  KeyboardCode["Enter"] = "Enter";
})(KeyboardCode || (KeyboardCode = {}));

const defaultKeyboardCodes = {
  start: [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc],
  end: [KeyboardCode.Space, KeyboardCode.Enter]
};
const defaultKeyboardCoordinateGetter = (event, _ref) => {
  let {
    currentCoordinates
  } = _ref;

  switch (event.code) {
    case KeyboardCode.Right:
      return { ...currentCoordinates,
        x: currentCoordinates.x + 25
      };

    case KeyboardCode.Left:
      return { ...currentCoordinates,
        x: currentCoordinates.x - 25
      };

    case KeyboardCode.Down:
      return { ...currentCoordinates,
        y: currentCoordinates.y + 25
      };

    case KeyboardCode.Up:
      return { ...currentCoordinates,
        y: currentCoordinates.y - 25
      };
  }

  return undefined;
};

class KeyboardSensor {
  constructor(props) {
    this.props = void 0;
    this.autoScrollEnabled = false;
    this.referenceCoordinates = void 0;
    this.listeners = void 0;
    this.windowListeners = void 0;
    this.props = props;
    const {
      event: {
        target
      }
    } = props;
    this.props = props;
    this.listeners = new Listeners(getOwnerDocument(target));
    this.windowListeners = new Listeners(getWindow$1(target));
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.attach();
  }

  attach() {
    this.handleStart();
    this.windowListeners.add(EventName.Resize, this.handleCancel);
    this.windowListeners.add(EventName.VisibilityChange, this.handleCancel);
    setTimeout(() => this.listeners.add(EventName.Keydown, this.handleKeyDown));
  }

  handleStart() {
    const {
      activeNode,
      onStart
    } = this.props;
    const node = activeNode.node.current;

    if (node) {
      scrollIntoViewIfNeeded(node);
    }

    onStart(defaultCoordinates);
  }

  handleKeyDown(event) {
    if (isKeyboardEvent(event)) {
      const {
        active,
        context,
        options
      } = this.props;
      const {
        keyboardCodes = defaultKeyboardCodes,
        coordinateGetter = defaultKeyboardCoordinateGetter,
        scrollBehavior = 'smooth'
      } = options;
      const {
        code
      } = event;

      if (keyboardCodes.end.includes(code)) {
        this.handleEnd(event);
        return;
      }

      if (keyboardCodes.cancel.includes(code)) {
        this.handleCancel(event);
        return;
      }

      const {
        collisionRect
      } = context.current;
      const currentCoordinates = collisionRect ? {
        x: collisionRect.left,
        y: collisionRect.top
      } : defaultCoordinates;

      if (!this.referenceCoordinates) {
        this.referenceCoordinates = currentCoordinates;
      }

      const newCoordinates = coordinateGetter(event, {
        active,
        context: context.current,
        currentCoordinates
      });

      if (newCoordinates) {
        const coordinatesDelta = subtract(newCoordinates, currentCoordinates);
        const scrollDelta = {
          x: 0,
          y: 0
        };
        const {
          scrollableAncestors
        } = context.current;

        for (const scrollContainer of scrollableAncestors) {
          const direction = event.code;
          const {
            isTop,
            isRight,
            isLeft,
            isBottom,
            maxScroll,
            minScroll
          } = getScrollPosition(scrollContainer);
          const scrollElementRect = getScrollElementRect(scrollContainer);
          const clampedCoordinates = {
            x: Math.min(direction === KeyboardCode.Right ? scrollElementRect.right - scrollElementRect.width / 2 : scrollElementRect.right, Math.max(direction === KeyboardCode.Right ? scrollElementRect.left : scrollElementRect.left + scrollElementRect.width / 2, newCoordinates.x)),
            y: Math.min(direction === KeyboardCode.Down ? scrollElementRect.bottom - scrollElementRect.height / 2 : scrollElementRect.bottom, Math.max(direction === KeyboardCode.Down ? scrollElementRect.top : scrollElementRect.top + scrollElementRect.height / 2, newCoordinates.y))
          };
          const canScrollX = direction === KeyboardCode.Right && !isRight || direction === KeyboardCode.Left && !isLeft;
          const canScrollY = direction === KeyboardCode.Down && !isBottom || direction === KeyboardCode.Up && !isTop;

          if (canScrollX && clampedCoordinates.x !== newCoordinates.x) {
            const newScrollCoordinates = scrollContainer.scrollLeft + coordinatesDelta.x;
            const canScrollToNewCoordinates = direction === KeyboardCode.Right && newScrollCoordinates <= maxScroll.x || direction === KeyboardCode.Left && newScrollCoordinates >= minScroll.x;

            if (canScrollToNewCoordinates && !coordinatesDelta.y) {
              // We don't need to update coordinates, the scroll adjustment alone will trigger
              // logic to auto-detect the new container we are over
              scrollContainer.scrollTo({
                left: newScrollCoordinates,
                behavior: scrollBehavior
              });
              return;
            }

            if (canScrollToNewCoordinates) {
              scrollDelta.x = scrollContainer.scrollLeft - newScrollCoordinates;
            } else {
              scrollDelta.x = direction === KeyboardCode.Right ? scrollContainer.scrollLeft - maxScroll.x : scrollContainer.scrollLeft - minScroll.x;
            }

            if (scrollDelta.x) {
              scrollContainer.scrollBy({
                left: -scrollDelta.x,
                behavior: scrollBehavior
              });
            }

            break;
          } else if (canScrollY && clampedCoordinates.y !== newCoordinates.y) {
            const newScrollCoordinates = scrollContainer.scrollTop + coordinatesDelta.y;
            const canScrollToNewCoordinates = direction === KeyboardCode.Down && newScrollCoordinates <= maxScroll.y || direction === KeyboardCode.Up && newScrollCoordinates >= minScroll.y;

            if (canScrollToNewCoordinates && !coordinatesDelta.x) {
              // We don't need to update coordinates, the scroll adjustment alone will trigger
              // logic to auto-detect the new container we are over
              scrollContainer.scrollTo({
                top: newScrollCoordinates,
                behavior: scrollBehavior
              });
              return;
            }

            if (canScrollToNewCoordinates) {
              scrollDelta.y = scrollContainer.scrollTop - newScrollCoordinates;
            } else {
              scrollDelta.y = direction === KeyboardCode.Down ? scrollContainer.scrollTop - maxScroll.y : scrollContainer.scrollTop - minScroll.y;
            }

            if (scrollDelta.y) {
              scrollContainer.scrollBy({
                top: -scrollDelta.y,
                behavior: scrollBehavior
              });
            }

            break;
          }
        }

        this.handleMove(event, add(subtract(newCoordinates, this.referenceCoordinates), scrollDelta));
      }
    }
  }

  handleMove(event, coordinates) {
    const {
      onMove
    } = this.props;
    event.preventDefault();
    onMove(coordinates);
  }

  handleEnd(event) {
    const {
      onEnd
    } = this.props;
    event.preventDefault();
    this.detach();
    onEnd();
  }

  handleCancel(event) {
    const {
      onCancel
    } = this.props;
    event.preventDefault();
    this.detach();
    onCancel();
  }

  detach() {
    this.listeners.removeAll();
    this.windowListeners.removeAll();
  }

}
KeyboardSensor.activators = [{
  eventName: 'onKeyDown',
  handler: (event, _ref, _ref2) => {
    let {
      keyboardCodes = defaultKeyboardCodes,
      onActivation
    } = _ref;
    let {
      active
    } = _ref2;
    const {
      code
    } = event.nativeEvent;

    if (keyboardCodes.start.includes(code)) {
      const activator = active.activatorNode.current;

      if (activator && event.target !== activator) {
        return false;
      }

      event.preventDefault();
      onActivation == null ? void 0 : onActivation({
        event: event.nativeEvent
      });
      return true;
    }

    return false;
  }
}];

function isDistanceConstraint(constraint) {
  return Boolean(constraint && 'distance' in constraint);
}

function isDelayConstraint(constraint) {
  return Boolean(constraint && 'delay' in constraint);
}

class AbstractPointerSensor {
  constructor(props, events, listenerTarget) {
    var _getEventCoordinates;

    if (listenerTarget === void 0) {
      listenerTarget = getEventListenerTarget(props.event.target);
    }

    this.props = void 0;
    this.events = void 0;
    this.autoScrollEnabled = true;
    this.document = void 0;
    this.activated = false;
    this.initialCoordinates = void 0;
    this.timeoutId = null;
    this.listeners = void 0;
    this.documentListeners = void 0;
    this.windowListeners = void 0;
    this.props = props;
    this.events = events;
    const {
      event
    } = props;
    const {
      target
    } = event;
    this.props = props;
    this.events = events;
    this.document = getOwnerDocument(target);
    this.documentListeners = new Listeners(this.document);
    this.listeners = new Listeners(listenerTarget);
    this.windowListeners = new Listeners(getWindow$1(target));
    this.initialCoordinates = (_getEventCoordinates = getEventCoordinates(event)) != null ? _getEventCoordinates : defaultCoordinates;
    this.handleStart = this.handleStart.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.removeTextSelection = this.removeTextSelection.bind(this);
    this.attach();
  }

  attach() {
    const {
      events,
      props: {
        options: {
          activationConstraint,
          bypassActivationConstraint
        }
      }
    } = this;
    this.listeners.add(events.move.name, this.handleMove, {
      passive: false
    });
    this.listeners.add(events.end.name, this.handleEnd);
    this.windowListeners.add(EventName.Resize, this.handleCancel);
    this.windowListeners.add(EventName.DragStart, preventDefault);
    this.windowListeners.add(EventName.VisibilityChange, this.handleCancel);
    this.windowListeners.add(EventName.ContextMenu, preventDefault);
    this.documentListeners.add(EventName.Keydown, this.handleKeydown);

    if (activationConstraint) {
      if (bypassActivationConstraint != null && bypassActivationConstraint({
        event: this.props.event,
        activeNode: this.props.activeNode,
        options: this.props.options
      })) {
        return this.handleStart();
      }

      if (isDelayConstraint(activationConstraint)) {
        this.timeoutId = setTimeout(this.handleStart, activationConstraint.delay);
        return;
      }

      if (isDistanceConstraint(activationConstraint)) {
        return;
      }
    }

    this.handleStart();
  }

  detach() {
    this.listeners.removeAll();
    this.windowListeners.removeAll(); // Wait until the next event loop before removing document listeners
    // This is necessary because we listen for `click` and `selection` events on the document

    setTimeout(this.documentListeners.removeAll, 50);

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  handleStart() {
    const {
      initialCoordinates
    } = this;
    const {
      onStart
    } = this.props;

    if (initialCoordinates) {
      this.activated = true; // Stop propagation of click events once activation constraints are met

      this.documentListeners.add(EventName.Click, stopPropagation, {
        capture: true
      }); // Remove any text selection from the document

      this.removeTextSelection(); // Prevent further text selection while dragging

      this.documentListeners.add(EventName.SelectionChange, this.removeTextSelection);
      onStart(initialCoordinates);
    }
  }

  handleMove(event) {
    var _getEventCoordinates2;

    const {
      activated,
      initialCoordinates,
      props
    } = this;
    const {
      onMove,
      options: {
        activationConstraint
      }
    } = props;

    if (!initialCoordinates) {
      return;
    }

    const coordinates = (_getEventCoordinates2 = getEventCoordinates(event)) != null ? _getEventCoordinates2 : defaultCoordinates;
    const delta = subtract(initialCoordinates, coordinates); // Constraint validation

    if (!activated && activationConstraint) {
      if (isDistanceConstraint(activationConstraint)) {
        if (activationConstraint.tolerance != null && hasExceededDistance(delta, activationConstraint.tolerance)) {
          return this.handleCancel();
        }

        if (hasExceededDistance(delta, activationConstraint.distance)) {
          return this.handleStart();
        }
      }

      if (isDelayConstraint(activationConstraint)) {
        if (hasExceededDistance(delta, activationConstraint.tolerance)) {
          return this.handleCancel();
        }
      }

      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    onMove(coordinates);
  }

  handleEnd() {
    const {
      onEnd
    } = this.props;
    this.detach();
    onEnd();
  }

  handleCancel() {
    const {
      onCancel
    } = this.props;
    this.detach();
    onCancel();
  }

  handleKeydown(event) {
    if (event.code === KeyboardCode.Esc) {
      this.handleCancel();
    }
  }

  removeTextSelection() {
    var _this$document$getSel;

    (_this$document$getSel = this.document.getSelection()) == null ? void 0 : _this$document$getSel.removeAllRanges();
  }

}

const events = {
  move: {
    name: 'pointermove'
  },
  end: {
    name: 'pointerup'
  }
};
class PointerSensor extends AbstractPointerSensor {
  constructor(props) {
    const {
      event
    } = props; // Pointer events stop firing if the target is unmounted while dragging
    // Therefore we attach listeners to the owner document instead

    const listenerTarget = getOwnerDocument(event.target);
    super(props, events, listenerTarget);
  }

}
PointerSensor.activators = [{
  eventName: 'onPointerDown',
  handler: (_ref, _ref2) => {
    let {
      nativeEvent: event
    } = _ref;
    let {
      onActivation
    } = _ref2;

    if (!event.isPrimary || event.button !== 0) {
      return false;
    }

    onActivation == null ? void 0 : onActivation({
      event
    });
    return true;
  }
}];

const events$1 = {
  move: {
    name: 'mousemove'
  },
  end: {
    name: 'mouseup'
  }
};
var MouseButton;

(function (MouseButton) {
  MouseButton[MouseButton["RightClick"] = 2] = "RightClick";
})(MouseButton || (MouseButton = {}));

class MouseSensor extends AbstractPointerSensor {
  constructor(props) {
    super(props, events$1, getOwnerDocument(props.event.target));
  }

}
MouseSensor.activators = [{
  eventName: 'onMouseDown',
  handler: (_ref, _ref2) => {
    let {
      nativeEvent: event
    } = _ref;
    let {
      onActivation
    } = _ref2;

    if (event.button === MouseButton.RightClick) {
      return false;
    }

    onActivation == null ? void 0 : onActivation({
      event
    });
    return true;
  }
}];

const events$2 = {
  move: {
    name: 'touchmove'
  },
  end: {
    name: 'touchend'
  }
};
class TouchSensor extends AbstractPointerSensor {
  constructor(props) {
    super(props, events$2);
  }

  static setup() {
    // Adding a non-capture and non-passive `touchmove` listener in order
    // to force `event.preventDefault()` calls to work in dynamically added
    // touchmove event handlers. This is required for iOS Safari.
    window.addEventListener(events$2.move.name, noop, {
      capture: false,
      passive: false
    });
    return function teardown() {
      window.removeEventListener(events$2.move.name, noop);
    }; // We create a new handler because the teardown function of another sensor
    // could remove our event listener if we use a referentially equal listener.

    function noop() {}
  }

}
TouchSensor.activators = [{
  eventName: 'onTouchStart',
  handler: (_ref, _ref2) => {
    let {
      nativeEvent: event
    } = _ref;
    let {
      onActivation
    } = _ref2;
    const {
      touches
    } = event;

    if (touches.length > 1) {
      return false;
    }

    onActivation == null ? void 0 : onActivation({
      event
    });
    return true;
  }
}];

var AutoScrollActivator;

(function (AutoScrollActivator) {
  AutoScrollActivator[AutoScrollActivator["Pointer"] = 0] = "Pointer";
  AutoScrollActivator[AutoScrollActivator["DraggableRect"] = 1] = "DraggableRect";
})(AutoScrollActivator || (AutoScrollActivator = {}));

var TraversalOrder;

(function (TraversalOrder) {
  TraversalOrder[TraversalOrder["TreeOrder"] = 0] = "TreeOrder";
  TraversalOrder[TraversalOrder["ReversedTreeOrder"] = 1] = "ReversedTreeOrder";
})(TraversalOrder || (TraversalOrder = {}));

function useAutoScroller(_ref) {
  let {
    acceleration,
    activator = AutoScrollActivator.Pointer,
    canScroll,
    draggingRect,
    enabled,
    interval = 5,
    order = TraversalOrder.TreeOrder,
    pointerCoordinates,
    scrollableAncestors,
    scrollableAncestorRects,
    delta,
    threshold
  } = _ref;
  const scrollIntent = useScrollIntent({
    delta,
    disabled: !enabled
  });
  const [setAutoScrollInterval, clearAutoScrollInterval] = useInterval();
  const scrollSpeed = useRef({
    x: 0,
    y: 0
  });
  const scrollDirection = useRef({
    x: 0,
    y: 0
  });
  const rect = useMemo(() => {
    switch (activator) {
      case AutoScrollActivator.Pointer:
        return pointerCoordinates ? {
          top: pointerCoordinates.y,
          bottom: pointerCoordinates.y,
          left: pointerCoordinates.x,
          right: pointerCoordinates.x
        } : null;

      case AutoScrollActivator.DraggableRect:
        return draggingRect;
    }
  }, [activator, draggingRect, pointerCoordinates]);
  const scrollContainerRef = useRef(null);
  const autoScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const scrollLeft = scrollSpeed.current.x * scrollDirection.current.x;
    const scrollTop = scrollSpeed.current.y * scrollDirection.current.y;
    scrollContainer.scrollBy(scrollLeft, scrollTop);
  }, []);
  const sortedScrollableAncestors = useMemo(() => order === TraversalOrder.TreeOrder ? [...scrollableAncestors].reverse() : scrollableAncestors, [order, scrollableAncestors]);
  useEffect(() => {
    if (!enabled || !scrollableAncestors.length || !rect) {
      clearAutoScrollInterval();
      return;
    }

    for (const scrollContainer of sortedScrollableAncestors) {
      if ((canScroll == null ? void 0 : canScroll(scrollContainer)) === false) {
        continue;
      }

      const index = scrollableAncestors.indexOf(scrollContainer);
      const scrollContainerRect = scrollableAncestorRects[index];

      if (!scrollContainerRect) {
        continue;
      }

      const {
        direction,
        speed
      } = getScrollDirectionAndSpeed(scrollContainer, scrollContainerRect, rect, acceleration, threshold);

      for (const axis of ['x', 'y']) {
        if (!scrollIntent[axis][direction[axis]]) {
          speed[axis] = 0;
          direction[axis] = 0;
        }
      }

      if (speed.x > 0 || speed.y > 0) {
        clearAutoScrollInterval();
        scrollContainerRef.current = scrollContainer;
        setAutoScrollInterval(autoScroll, interval);
        scrollSpeed.current = speed;
        scrollDirection.current = direction;
        return;
      }
    }

    scrollSpeed.current = {
      x: 0,
      y: 0
    };
    scrollDirection.current = {
      x: 0,
      y: 0
    };
    clearAutoScrollInterval();
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [acceleration, autoScroll, canScroll, clearAutoScrollInterval, enabled, interval, // eslint-disable-next-line react-hooks/exhaustive-deps
  JSON.stringify(rect), // eslint-disable-next-line react-hooks/exhaustive-deps
  JSON.stringify(scrollIntent), setAutoScrollInterval, scrollableAncestors, sortedScrollableAncestors, scrollableAncestorRects, // eslint-disable-next-line react-hooks/exhaustive-deps
  JSON.stringify(threshold)]);
}
const defaultScrollIntent = {
  x: {
    [Direction.Backward]: false,
    [Direction.Forward]: false
  },
  y: {
    [Direction.Backward]: false,
    [Direction.Forward]: false
  }
};

function useScrollIntent(_ref2) {
  let {
    delta,
    disabled
  } = _ref2;
  const previousDelta = usePrevious(delta);
  return useLazyMemo(previousIntent => {
    if (disabled || !previousDelta || !previousIntent) {
      // Reset scroll intent tracking when auto-scrolling is disabled
      return defaultScrollIntent;
    }

    const direction = {
      x: Math.sign(delta.x - previousDelta.x),
      y: Math.sign(delta.y - previousDelta.y)
    }; // Keep track of the user intent to scroll in each direction for both axis

    return {
      x: {
        [Direction.Backward]: previousIntent.x[Direction.Backward] || direction.x === -1,
        [Direction.Forward]: previousIntent.x[Direction.Forward] || direction.x === 1
      },
      y: {
        [Direction.Backward]: previousIntent.y[Direction.Backward] || direction.y === -1,
        [Direction.Forward]: previousIntent.y[Direction.Forward] || direction.y === 1
      }
    };
  }, [disabled, delta, previousDelta]);
}

function useCachedNode(draggableNodes, id) {
  const draggableNode = id !== null ? draggableNodes.get(id) : undefined;
  const node = draggableNode ? draggableNode.node.current : null;
  return useLazyMemo(cachedNode => {
    var _ref;

    if (id === null) {
      return null;
    } // In some cases, the draggable node can unmount while dragging
    // This is the case for virtualized lists. In those situations,
    // we fall back to the last known value for that node.


    return (_ref = node != null ? node : cachedNode) != null ? _ref : null;
  }, [node, id]);
}

function useCombineActivators(sensors, getSyntheticHandler) {
  return useMemo(() => sensors.reduce((accumulator, sensor) => {
    const {
      sensor: Sensor
    } = sensor;
    const sensorActivators = Sensor.activators.map(activator => ({
      eventName: activator.eventName,
      handler: getSyntheticHandler(activator.handler, sensor)
    }));
    return [...accumulator, ...sensorActivators];
  }, []), [sensors, getSyntheticHandler]);
}

var MeasuringStrategy;

(function (MeasuringStrategy) {
  MeasuringStrategy[MeasuringStrategy["Always"] = 0] = "Always";
  MeasuringStrategy[MeasuringStrategy["BeforeDragging"] = 1] = "BeforeDragging";
  MeasuringStrategy[MeasuringStrategy["WhileDragging"] = 2] = "WhileDragging";
})(MeasuringStrategy || (MeasuringStrategy = {}));

var MeasuringFrequency;

(function (MeasuringFrequency) {
  MeasuringFrequency["Optimized"] = "optimized";
})(MeasuringFrequency || (MeasuringFrequency = {}));

const defaultValue = /*#__PURE__*/new Map();
function useDroppableMeasuring(containers, _ref) {
  let {
    dragging,
    dependencies,
    config
  } = _ref;
  const [queue, setQueue] = useState(null);
  const {
    frequency,
    measure,
    strategy
  } = config;
  const containersRef = useRef(containers);
  const disabled = isDisabled();
  const disabledRef = useLatestValue(disabled);
  const measureDroppableContainers = useCallback(function (ids) {
    if (ids === void 0) {
      ids = [];
    }

    if (disabledRef.current) {
      return;
    }

    setQueue(value => {
      if (value === null) {
        return ids;
      }

      return value.concat(ids.filter(id => !value.includes(id)));
    });
  }, [disabledRef]);
  const timeoutId = useRef(null);
  const droppableRects = useLazyMemo(previousValue => {
    if (disabled && !dragging) {
      return defaultValue;
    }

    if (!previousValue || previousValue === defaultValue || containersRef.current !== containers || queue != null) {
      const map = new Map();

      for (let container of containers) {
        if (!container) {
          continue;
        }

        if (queue && queue.length > 0 && !queue.includes(container.id) && container.rect.current) {
          // This container does not need to be re-measured
          map.set(container.id, container.rect.current);
          continue;
        }

        const node = container.node.current;
        const rect = node ? new Rect(measure(node), node) : null;
        container.rect.current = rect;

        if (rect) {
          map.set(container.id, rect);
        }
      }

      return map;
    }

    return previousValue;
  }, [containers, queue, dragging, disabled, measure]);
  useEffect(() => {
    containersRef.current = containers;
  }, [containers]);
  useEffect(() => {
    if (disabled) {
      return;
    }

    measureDroppableContainers();
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [dragging, disabled]);
  useEffect(() => {
    if (queue && queue.length > 0) {
      setQueue(null);
    }
  }, //eslint-disable-next-line react-hooks/exhaustive-deps
  [JSON.stringify(queue)]);
  useEffect(() => {
    if (disabled || typeof frequency !== 'number' || timeoutId.current !== null) {
      return;
    }

    timeoutId.current = setTimeout(() => {
      measureDroppableContainers();
      timeoutId.current = null;
    }, frequency);
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [frequency, disabled, measureDroppableContainers, ...dependencies]);
  return {
    droppableRects,
    measureDroppableContainers,
    measuringScheduled: queue != null
  };

  function isDisabled() {
    switch (strategy) {
      case MeasuringStrategy.Always:
        return false;

      case MeasuringStrategy.BeforeDragging:
        return dragging;

      default:
        return !dragging;
    }
  }
}

function useInitialValue(value, computeFn) {
  return useLazyMemo(previousValue => {
    if (!value) {
      return null;
    }

    if (previousValue) {
      return previousValue;
    }

    return typeof computeFn === 'function' ? computeFn(value) : value;
  }, [computeFn, value]);
}

function useInitialRect(node, measure) {
  return useInitialValue(node, measure);
}

/**
 * Returns a new MutationObserver instance.
 * If `MutationObserver` is undefined in the execution environment, returns `undefined`.
 */

function useMutationObserver(_ref) {
  let {
    callback,
    disabled
  } = _ref;
  const handleMutations = useEvent(callback);
  const mutationObserver = useMemo(() => {
    if (disabled || typeof window === 'undefined' || typeof window.MutationObserver === 'undefined') {
      return undefined;
    }

    const {
      MutationObserver
    } = window;
    return new MutationObserver(handleMutations);
  }, [handleMutations, disabled]);
  useEffect(() => {
    return () => mutationObserver == null ? void 0 : mutationObserver.disconnect();
  }, [mutationObserver]);
  return mutationObserver;
}

/**
 * Returns a new ResizeObserver instance bound to the `onResize` callback.
 * If `ResizeObserver` is undefined in the execution environment, returns `undefined`.
 */

function useResizeObserver(_ref) {
  let {
    callback,
    disabled
  } = _ref;
  const handleResize = useEvent(callback);
  const resizeObserver = useMemo(() => {
    if (disabled || typeof window === 'undefined' || typeof window.ResizeObserver === 'undefined') {
      return undefined;
    }

    const {
      ResizeObserver
    } = window;
    return new ResizeObserver(handleResize);
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [disabled]);
  useEffect(() => {
    return () => resizeObserver == null ? void 0 : resizeObserver.disconnect();
  }, [resizeObserver]);
  return resizeObserver;
}

function defaultMeasure(element) {
  return new Rect(getClientRect(element), element);
}

function useRect(element, measure, fallbackRect) {
  if (measure === void 0) {
    measure = defaultMeasure;
  }

  const [rect, measureRect] = useReducer(reducer, null);
  const mutationObserver = useMutationObserver({
    callback(records) {
      if (!element) {
        return;
      }

      for (const record of records) {
        const {
          type,
          target
        } = record;

        if (type === 'childList' && target instanceof HTMLElement && target.contains(element)) {
          measureRect();
          break;
        }
      }
    }

  });
  const resizeObserver = useResizeObserver({
    callback: measureRect
  });
  useIsomorphicLayoutEffect(() => {
    measureRect();

    if (element) {
      resizeObserver == null ? void 0 : resizeObserver.observe(element);
      mutationObserver == null ? void 0 : mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      resizeObserver == null ? void 0 : resizeObserver.disconnect();
      mutationObserver == null ? void 0 : mutationObserver.disconnect();
    }
  }, [element]);
  return rect;

  function reducer(currentRect) {
    if (!element) {
      return null;
    }

    if (element.isConnected === false) {
      var _ref;

      // Fall back to last rect we measured if the element is
      // no longer connected to the DOM.
      return (_ref = currentRect != null ? currentRect : fallbackRect) != null ? _ref : null;
    }

    const newRect = measure(element);

    if (JSON.stringify(currentRect) === JSON.stringify(newRect)) {
      return currentRect;
    }

    return newRect;
  }
}

function useRectDelta(rect) {
  const initialRect = useInitialValue(rect);
  return getRectDelta(rect, initialRect);
}

const defaultValue$1 = [];
function useScrollableAncestors(node) {
  const previousNode = useRef(node);
  const ancestors = useLazyMemo(previousValue => {
    if (!node) {
      return defaultValue$1;
    }

    if (previousValue && previousValue !== defaultValue$1 && node && previousNode.current && node.parentNode === previousNode.current.parentNode) {
      return previousValue;
    }

    return getScrollableAncestors(node);
  }, [node]);
  useEffect(() => {
    previousNode.current = node;
  }, [node]);
  return ancestors;
}

function useScrollOffsets(elements) {
  const [scrollCoordinates, setScrollCoordinates] = useState(null);
  const prevElements = useRef(elements); // To-do: Throttle the handleScroll callback

  const handleScroll = useCallback(event => {
    const scrollingElement = getScrollableElement(event.target);

    if (!scrollingElement) {
      return;
    }

    setScrollCoordinates(scrollCoordinates => {
      if (!scrollCoordinates) {
        return null;
      }

      scrollCoordinates.set(scrollingElement, getScrollCoordinates(scrollingElement));
      return new Map(scrollCoordinates);
    });
  }, []);
  useEffect(() => {
    const previousElements = prevElements.current;

    if (elements !== previousElements) {
      cleanup(previousElements);
      const entries = elements.map(element => {
        const scrollableElement = getScrollableElement(element);

        if (scrollableElement) {
          scrollableElement.addEventListener('scroll', handleScroll, {
            passive: true
          });
          return [scrollableElement, getScrollCoordinates(scrollableElement)];
        }

        return null;
      }).filter(entry => entry != null);
      setScrollCoordinates(entries.length ? new Map(entries) : null);
      prevElements.current = elements;
    }

    return () => {
      cleanup(elements);
      cleanup(previousElements);
    };

    function cleanup(elements) {
      elements.forEach(element => {
        const scrollableElement = getScrollableElement(element);
        scrollableElement == null ? void 0 : scrollableElement.removeEventListener('scroll', handleScroll);
      });
    }
  }, [handleScroll, elements]);
  return useMemo(() => {
    if (elements.length) {
      return scrollCoordinates ? Array.from(scrollCoordinates.values()).reduce((acc, coordinates) => add(acc, coordinates), defaultCoordinates) : getScrollOffsets(elements);
    }

    return defaultCoordinates;
  }, [elements, scrollCoordinates]);
}

function useScrollOffsetsDelta(scrollOffsets, dependencies) {
  if (dependencies === void 0) {
    dependencies = [];
  }

  const initialScrollOffsets = useRef(null);
  useEffect(() => {
    initialScrollOffsets.current = null;
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  dependencies);
  useEffect(() => {
    const hasScrollOffsets = scrollOffsets !== defaultCoordinates;

    if (hasScrollOffsets && !initialScrollOffsets.current) {
      initialScrollOffsets.current = scrollOffsets;
    }

    if (!hasScrollOffsets && initialScrollOffsets.current) {
      initialScrollOffsets.current = null;
    }
  }, [scrollOffsets]);
  return initialScrollOffsets.current ? subtract(scrollOffsets, initialScrollOffsets.current) : defaultCoordinates;
}

function useSensorSetup(sensors) {
  useEffect(() => {
    if (!canUseDOM) {
      return;
    }

    const teardownFns = sensors.map(_ref => {
      let {
        sensor
      } = _ref;
      return sensor.setup == null ? void 0 : sensor.setup();
    });
    return () => {
      for (const teardown of teardownFns) {
        teardown == null ? void 0 : teardown();
      }
    };
  }, // TO-DO: Sensors length could theoretically change which would not be a valid dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  sensors.map(_ref2 => {
    let {
      sensor
    } = _ref2;
    return sensor;
  }));
}

function useSyntheticListeners(listeners, id) {
  return useMemo(() => {
    return listeners.reduce((acc, _ref) => {
      let {
        eventName,
        handler
      } = _ref;

      acc[eventName] = event => {
        handler(event, id);
      };

      return acc;
    }, {});
  }, [listeners, id]);
}

function useWindowRect(element) {
  return useMemo(() => element ? getWindowClientRect(element) : null, [element]);
}

const defaultValue$2 = [];
function useRects(elements, measure) {
  if (measure === void 0) {
    measure = getClientRect;
  }

  const [firstElement] = elements;
  const windowRect = useWindowRect(firstElement ? getWindow$1(firstElement) : null);
  const [rects, measureRects] = useReducer(reducer, defaultValue$2);
  const resizeObserver = useResizeObserver({
    callback: measureRects
  });

  if (elements.length > 0 && rects === defaultValue$2) {
    measureRects();
  }

  useIsomorphicLayoutEffect(() => {
    if (elements.length) {
      elements.forEach(element => resizeObserver == null ? void 0 : resizeObserver.observe(element));
    } else {
      resizeObserver == null ? void 0 : resizeObserver.disconnect();
      measureRects();
    }
  }, [elements]);
  return rects;

  function reducer() {
    if (!elements.length) {
      return defaultValue$2;
    }

    return elements.map(element => isDocumentScrollingElement(element) ? windowRect : new Rect(measure(element), element));
  }
}

function getMeasurableNode(node) {
  if (!node) {
    return null;
  }

  if (node.children.length > 1) {
    return node;
  }

  const firstChild = node.children[0];
  return isHTMLElement$1(firstChild) ? firstChild : node;
}

function useDragOverlayMeasuring(_ref) {
  let {
    measure
  } = _ref;
  const [rect, setRect] = useState(null);
  const handleResize = useCallback(entries => {
    for (const {
      target
    } of entries) {
      if (isHTMLElement$1(target)) {
        setRect(rect => {
          const newRect = measure(target);
          return rect ? { ...rect,
            width: newRect.width,
            height: newRect.height
          } : newRect;
        });
        break;
      }
    }
  }, [measure]);
  const resizeObserver = useResizeObserver({
    callback: handleResize
  });
  const handleNodeChange = useCallback(element => {
    const node = getMeasurableNode(element);
    resizeObserver == null ? void 0 : resizeObserver.disconnect();

    if (node) {
      resizeObserver == null ? void 0 : resizeObserver.observe(node);
    }

    setRect(node ? measure(node) : null);
  }, [measure, resizeObserver]);
  const [nodeRef, setRef] = useNodeRef(handleNodeChange);
  return useMemo(() => ({
    nodeRef,
    rect,
    setRef
  }), [rect, nodeRef, setRef]);
}

const defaultSensors = [{
  sensor: PointerSensor,
  options: {}
}, {
  sensor: KeyboardSensor,
  options: {}
}];
const defaultData = {
  current: {}
};
const defaultMeasuringConfiguration = {
  draggable: {
    measure: getTransformAgnosticClientRect
  },
  droppable: {
    measure: getTransformAgnosticClientRect,
    strategy: MeasuringStrategy.WhileDragging,
    frequency: MeasuringFrequency.Optimized
  },
  dragOverlay: {
    measure: getClientRect
  }
};

class DroppableContainersMap extends Map {
  get(id) {
    var _super$get;

    return id != null ? (_super$get = super.get(id)) != null ? _super$get : undefined : undefined;
  }

  toArray() {
    return Array.from(this.values());
  }

  getEnabled() {
    return this.toArray().filter(_ref => {
      let {
        disabled
      } = _ref;
      return !disabled;
    });
  }

  getNodeFor(id) {
    var _this$get$node$curren, _this$get;

    return (_this$get$node$curren = (_this$get = this.get(id)) == null ? void 0 : _this$get.node.current) != null ? _this$get$node$curren : undefined;
  }

}

const defaultPublicContext = {
  activatorEvent: null,
  active: null,
  activeNode: null,
  activeNodeRect: null,
  collisions: null,
  containerNodeRect: null,
  draggableNodes: /*#__PURE__*/new Map(),
  droppableRects: /*#__PURE__*/new Map(),
  droppableContainers: /*#__PURE__*/new DroppableContainersMap(),
  over: null,
  dragOverlay: {
    nodeRef: {
      current: null
    },
    rect: null,
    setRef: noop
  },
  scrollableAncestors: [],
  scrollableAncestorRects: [],
  measuringConfiguration: defaultMeasuringConfiguration,
  measureDroppableContainers: noop,
  windowRect: null,
  measuringScheduled: false
};
const defaultInternalContext = {
  activatorEvent: null,
  activators: [],
  active: null,
  activeNodeRect: null,
  ariaDescribedById: {
    draggable: ''
  },
  dispatch: noop,
  draggableNodes: /*#__PURE__*/new Map(),
  over: null,
  measureDroppableContainers: noop
};
const InternalContext = /*#__PURE__*/createContext(defaultInternalContext);
const PublicContext = /*#__PURE__*/createContext(defaultPublicContext);

function getInitialState() {
  return {
    draggable: {
      active: null,
      initialCoordinates: {
        x: 0,
        y: 0
      },
      nodes: new Map(),
      translate: {
        x: 0,
        y: 0
      }
    },
    droppable: {
      containers: new DroppableContainersMap()
    }
  };
}
function reducer(state, action) {
  switch (action.type) {
    case Action.DragStart:
      return { ...state,
        draggable: { ...state.draggable,
          initialCoordinates: action.initialCoordinates,
          active: action.active
        }
      };

    case Action.DragMove:
      if (!state.draggable.active) {
        return state;
      }

      return { ...state,
        draggable: { ...state.draggable,
          translate: {
            x: action.coordinates.x - state.draggable.initialCoordinates.x,
            y: action.coordinates.y - state.draggable.initialCoordinates.y
          }
        }
      };

    case Action.DragEnd:
    case Action.DragCancel:
      return { ...state,
        draggable: { ...state.draggable,
          active: null,
          initialCoordinates: {
            x: 0,
            y: 0
          },
          translate: {
            x: 0,
            y: 0
          }
        }
      };

    case Action.RegisterDroppable:
      {
        const {
          element
        } = action;
        const {
          id
        } = element;
        const containers = new DroppableContainersMap(state.droppable.containers);
        containers.set(id, element);
        return { ...state,
          droppable: { ...state.droppable,
            containers
          }
        };
      }

    case Action.SetDroppableDisabled:
      {
        const {
          id,
          key,
          disabled
        } = action;
        const element = state.droppable.containers.get(id);

        if (!element || key !== element.key) {
          return state;
        }

        const containers = new DroppableContainersMap(state.droppable.containers);
        containers.set(id, { ...element,
          disabled
        });
        return { ...state,
          droppable: { ...state.droppable,
            containers
          }
        };
      }

    case Action.UnregisterDroppable:
      {
        const {
          id,
          key
        } = action;
        const element = state.droppable.containers.get(id);

        if (!element || key !== element.key) {
          return state;
        }

        const containers = new DroppableContainersMap(state.droppable.containers);
        containers.delete(id);
        return { ...state,
          droppable: { ...state.droppable,
            containers
          }
        };
      }

    default:
      {
        return state;
      }
  }
}

function RestoreFocus(_ref) {
  let {
    disabled
  } = _ref;
  const {
    active,
    activatorEvent,
    draggableNodes
  } = useContext(InternalContext);
  const previousActivatorEvent = usePrevious(activatorEvent);
  const previousActiveId = usePrevious(active == null ? void 0 : active.id); // Restore keyboard focus on the activator node

  useEffect(() => {
    if (disabled) {
      return;
    }

    if (!activatorEvent && previousActivatorEvent && previousActiveId != null) {
      if (!isKeyboardEvent(previousActivatorEvent)) {
        return;
      }

      if (document.activeElement === previousActivatorEvent.target) {
        // No need to restore focus
        return;
      }

      const draggableNode = draggableNodes.get(previousActiveId);

      if (!draggableNode) {
        return;
      }

      const {
        activatorNode,
        node
      } = draggableNode;

      if (!activatorNode.current && !node.current) {
        return;
      }

      requestAnimationFrame(() => {
        for (const element of [activatorNode.current, node.current]) {
          if (!element) {
            continue;
          }

          const focusableNode = findFirstFocusableNode(element);

          if (focusableNode) {
            focusableNode.focus();
            break;
          }
        }
      });
    }
  }, [activatorEvent, disabled, draggableNodes, previousActiveId, previousActivatorEvent]);
  return null;
}

function applyModifiers(modifiers, _ref) {
  let {
    transform,
    ...args
  } = _ref;
  return modifiers != null && modifiers.length ? modifiers.reduce((accumulator, modifier) => {
    return modifier({
      transform: accumulator,
      ...args
    });
  }, transform) : transform;
}

function useMeasuringConfiguration(config) {
  return useMemo(() => ({
    draggable: { ...defaultMeasuringConfiguration.draggable,
      ...(config == null ? void 0 : config.draggable)
    },
    droppable: { ...defaultMeasuringConfiguration.droppable,
      ...(config == null ? void 0 : config.droppable)
    },
    dragOverlay: { ...defaultMeasuringConfiguration.dragOverlay,
      ...(config == null ? void 0 : config.dragOverlay)
    }
  }), // eslint-disable-next-line react-hooks/exhaustive-deps
  [config == null ? void 0 : config.draggable, config == null ? void 0 : config.droppable, config == null ? void 0 : config.dragOverlay]);
}

function useLayoutShiftScrollCompensation(_ref) {
  let {
    activeNode,
    measure,
    initialRect,
    config = true
  } = _ref;
  const initialized = useRef(false);
  const {
    x,
    y
  } = typeof config === 'boolean' ? {
    x: config,
    y: config
  } : config;
  useIsomorphicLayoutEffect(() => {
    const disabled = !x && !y;

    if (disabled || !activeNode) {
      initialized.current = false;
      return;
    }

    if (initialized.current || !initialRect) {
      // Return early if layout shift scroll compensation was already attempted
      // or if there is no initialRect to compare to.
      return;
    } // Get the most up to date node ref for the active draggable


    const node = activeNode == null ? void 0 : activeNode.node.current;

    if (!node || node.isConnected === false) {
      // Return early if there is no attached node ref or if the node is
      // disconnected from the document.
      return;
    }

    const rect = measure(node);
    const rectDelta = getRectDelta(rect, initialRect);

    if (!x) {
      rectDelta.x = 0;
    }

    if (!y) {
      rectDelta.y = 0;
    } // Only perform layout shift scroll compensation once


    initialized.current = true;

    if (Math.abs(rectDelta.x) > 0 || Math.abs(rectDelta.y) > 0) {
      const firstScrollableAncestor = getFirstScrollableAncestor(node);

      if (firstScrollableAncestor) {
        firstScrollableAncestor.scrollBy({
          top: rectDelta.y,
          left: rectDelta.x
        });
      }
    }
  }, [activeNode, x, y, initialRect, measure]);
}

const ActiveDraggableContext = /*#__PURE__*/createContext({ ...defaultCoordinates,
  scaleX: 1,
  scaleY: 1
});
var Status;

(function (Status) {
  Status[Status["Uninitialized"] = 0] = "Uninitialized";
  Status[Status["Initializing"] = 1] = "Initializing";
  Status[Status["Initialized"] = 2] = "Initialized";
})(Status || (Status = {}));

const DndContext = /*#__PURE__*/memo(function DndContext(_ref) {
  var _sensorContext$curren, _dragOverlay$nodeRef$, _dragOverlay$rect, _over$rect;

  let {
    id,
    accessibility,
    autoScroll = true,
    children,
    sensors = defaultSensors,
    collisionDetection = rectIntersection,
    measuring,
    modifiers,
    ...props
  } = _ref;
  const store = useReducer(reducer, undefined, getInitialState);
  const [state, dispatch] = store;
  const [dispatchMonitorEvent, registerMonitorListener] = useDndMonitorProvider();
  const [status, setStatus] = useState(Status.Uninitialized);
  const isInitialized = status === Status.Initialized;
  const {
    draggable: {
      active: activeId,
      nodes: draggableNodes,
      translate
    },
    droppable: {
      containers: droppableContainers
    }
  } = state;
  const node = activeId ? draggableNodes.get(activeId) : null;
  const activeRects = useRef({
    initial: null,
    translated: null
  });
  const active = useMemo(() => {
    var _node$data;

    return activeId != null ? {
      id: activeId,
      // It's possible for the active node to unmount while dragging
      data: (_node$data = node == null ? void 0 : node.data) != null ? _node$data : defaultData,
      rect: activeRects
    } : null;
  }, [activeId, node]);
  const activeRef = useRef(null);
  const [activeSensor, setActiveSensor] = useState(null);
  const [activatorEvent, setActivatorEvent] = useState(null);
  const latestProps = useLatestValue(props, Object.values(props));
  const draggableDescribedById = useUniqueId("DndDescribedBy", id);
  const enabledDroppableContainers = useMemo(() => droppableContainers.getEnabled(), [droppableContainers]);
  const measuringConfiguration = useMeasuringConfiguration(measuring);
  const {
    droppableRects,
    measureDroppableContainers,
    measuringScheduled
  } = useDroppableMeasuring(enabledDroppableContainers, {
    dragging: isInitialized,
    dependencies: [translate.x, translate.y],
    config: measuringConfiguration.droppable
  });
  const activeNode = useCachedNode(draggableNodes, activeId);
  const activationCoordinates = useMemo(() => activatorEvent ? getEventCoordinates(activatorEvent) : null, [activatorEvent]);
  const autoScrollOptions = getAutoScrollerOptions();
  const initialActiveNodeRect = useInitialRect(activeNode, measuringConfiguration.draggable.measure);
  useLayoutShiftScrollCompensation({
    activeNode: activeId ? draggableNodes.get(activeId) : null,
    config: autoScrollOptions.layoutShiftCompensation,
    initialRect: initialActiveNodeRect,
    measure: measuringConfiguration.draggable.measure
  });
  const activeNodeRect = useRect(activeNode, measuringConfiguration.draggable.measure, initialActiveNodeRect);
  const containerNodeRect = useRect(activeNode ? activeNode.parentElement : null);
  const sensorContext = useRef({
    activatorEvent: null,
    active: null,
    activeNode,
    collisionRect: null,
    collisions: null,
    droppableRects,
    draggableNodes,
    draggingNode: null,
    draggingNodeRect: null,
    droppableContainers,
    over: null,
    scrollableAncestors: [],
    scrollAdjustedTranslate: null
  });
  const overNode = droppableContainers.getNodeFor((_sensorContext$curren = sensorContext.current.over) == null ? void 0 : _sensorContext$curren.id);
  const dragOverlay = useDragOverlayMeasuring({
    measure: measuringConfiguration.dragOverlay.measure
  }); // Use the rect of the drag overlay if it is mounted

  const draggingNode = (_dragOverlay$nodeRef$ = dragOverlay.nodeRef.current) != null ? _dragOverlay$nodeRef$ : activeNode;
  const draggingNodeRect = isInitialized ? (_dragOverlay$rect = dragOverlay.rect) != null ? _dragOverlay$rect : activeNodeRect : null;
  const usesDragOverlay = Boolean(dragOverlay.nodeRef.current && dragOverlay.rect); // The delta between the previous and new position of the draggable node
  // is only relevant when there is no drag overlay

  const nodeRectDelta = useRectDelta(usesDragOverlay ? null : activeNodeRect); // Get the window rect of the dragging node

  const windowRect = useWindowRect(draggingNode ? getWindow$1(draggingNode) : null); // Get scrollable ancestors of the dragging node

  const scrollableAncestors = useScrollableAncestors(isInitialized ? overNode != null ? overNode : activeNode : null);
  const scrollableAncestorRects = useRects(scrollableAncestors); // Apply modifiers

  const modifiedTranslate = applyModifiers(modifiers, {
    transform: {
      x: translate.x - nodeRectDelta.x,
      y: translate.y - nodeRectDelta.y,
      scaleX: 1,
      scaleY: 1
    },
    activatorEvent,
    active,
    activeNodeRect,
    containerNodeRect,
    draggingNodeRect,
    over: sensorContext.current.over,
    overlayNodeRect: dragOverlay.rect,
    scrollableAncestors,
    scrollableAncestorRects,
    windowRect
  });
  const pointerCoordinates = activationCoordinates ? add(activationCoordinates, translate) : null;
  const scrollOffsets = useScrollOffsets(scrollableAncestors); // Represents the scroll delta since dragging was initiated

  const scrollAdjustment = useScrollOffsetsDelta(scrollOffsets); // Represents the scroll delta since the last time the active node rect was measured

  const activeNodeScrollDelta = useScrollOffsetsDelta(scrollOffsets, [activeNodeRect]);
  const scrollAdjustedTranslate = add(modifiedTranslate, scrollAdjustment);
  const collisionRect = draggingNodeRect ? getAdjustedRect(draggingNodeRect, modifiedTranslate) : null;
  const collisions = active && collisionRect ? collisionDetection({
    active,
    collisionRect,
    droppableRects,
    droppableContainers: enabledDroppableContainers,
    pointerCoordinates
  }) : null;
  const overId = getFirstCollision(collisions, 'id');
  const [over, setOver] = useState(null); // When there is no drag overlay used, we need to account for the
  // window scroll delta

  const appliedTranslate = usesDragOverlay ? modifiedTranslate : add(modifiedTranslate, activeNodeScrollDelta);
  const transform = adjustScale(appliedTranslate, (_over$rect = over == null ? void 0 : over.rect) != null ? _over$rect : null, activeNodeRect);
  const instantiateSensor = useCallback((event, _ref2) => {
    let {
      sensor: Sensor,
      options
    } = _ref2;

    if (activeRef.current == null) {
      return;
    }

    const activeNode = draggableNodes.get(activeRef.current);

    if (!activeNode) {
      return;
    }

    const activatorEvent = event.nativeEvent;
    const sensorInstance = new Sensor({
      active: activeRef.current,
      activeNode,
      event: activatorEvent,
      options,
      // Sensors need to be instantiated with refs for arguments that change over time
      // otherwise they are frozen in time with the stale arguments
      context: sensorContext,

      onStart(initialCoordinates) {
        const id = activeRef.current;

        if (id == null) {
          return;
        }

        const draggableNode = draggableNodes.get(id);

        if (!draggableNode) {
          return;
        }

        const {
          onDragStart
        } = latestProps.current;
        const event = {
          active: {
            id,
            data: draggableNode.data,
            rect: activeRects
          }
        };
        unstable_batchedUpdates(() => {
          onDragStart == null ? void 0 : onDragStart(event);
          setStatus(Status.Initializing);
          dispatch({
            type: Action.DragStart,
            initialCoordinates,
            active: id
          });
          dispatchMonitorEvent({
            type: 'onDragStart',
            event
          });
        });
      },

      onMove(coordinates) {
        dispatch({
          type: Action.DragMove,
          coordinates
        });
      },

      onEnd: createHandler(Action.DragEnd),
      onCancel: createHandler(Action.DragCancel)
    });
    unstable_batchedUpdates(() => {
      setActiveSensor(sensorInstance);
      setActivatorEvent(event.nativeEvent);
    });

    function createHandler(type) {
      return async function handler() {
        const {
          active,
          collisions,
          over,
          scrollAdjustedTranslate
        } = sensorContext.current;
        let event = null;

        if (active && scrollAdjustedTranslate) {
          const {
            cancelDrop
          } = latestProps.current;
          event = {
            activatorEvent,
            active: active,
            collisions,
            delta: scrollAdjustedTranslate,
            over
          };

          if (type === Action.DragEnd && typeof cancelDrop === 'function') {
            const shouldCancel = await Promise.resolve(cancelDrop(event));

            if (shouldCancel) {
              type = Action.DragCancel;
            }
          }
        }

        activeRef.current = null;
        unstable_batchedUpdates(() => {
          dispatch({
            type
          });
          setStatus(Status.Uninitialized);
          setOver(null);
          setActiveSensor(null);
          setActivatorEvent(null);
          const eventName = type === Action.DragEnd ? 'onDragEnd' : 'onDragCancel';

          if (event) {
            const handler = latestProps.current[eventName];
            handler == null ? void 0 : handler(event);
            dispatchMonitorEvent({
              type: eventName,
              event
            });
          }
        });
      };
    }
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [draggableNodes]);
  const bindActivatorToSensorInstantiator = useCallback((handler, sensor) => {
    return (event, active) => {
      const nativeEvent = event.nativeEvent;
      const activeDraggableNode = draggableNodes.get(active);

      if ( // Another sensor is already instantiating
      activeRef.current !== null || // No active draggable
      !activeDraggableNode || // Event has already been captured
      nativeEvent.dndKit || nativeEvent.defaultPrevented) {
        return;
      }

      const activationContext = {
        active: activeDraggableNode
      };
      const shouldActivate = handler(event, sensor.options, activationContext);

      if (shouldActivate === true) {
        nativeEvent.dndKit = {
          capturedBy: sensor.sensor
        };
        activeRef.current = active;
        instantiateSensor(event, sensor);
      }
    };
  }, [draggableNodes, instantiateSensor]);
  const activators = useCombineActivators(sensors, bindActivatorToSensorInstantiator);
  useSensorSetup(sensors);
  useIsomorphicLayoutEffect(() => {
    if (activeNodeRect && status === Status.Initializing) {
      setStatus(Status.Initialized);
    }
  }, [activeNodeRect, status]);
  useEffect(() => {
    const {
      onDragMove
    } = latestProps.current;
    const {
      active,
      activatorEvent,
      collisions,
      over
    } = sensorContext.current;

    if (!active || !activatorEvent) {
      return;
    }

    const event = {
      active,
      activatorEvent,
      collisions,
      delta: {
        x: scrollAdjustedTranslate.x,
        y: scrollAdjustedTranslate.y
      },
      over
    };
    unstable_batchedUpdates(() => {
      onDragMove == null ? void 0 : onDragMove(event);
      dispatchMonitorEvent({
        type: 'onDragMove',
        event
      });
    });
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [scrollAdjustedTranslate.x, scrollAdjustedTranslate.y]);
  useEffect(() => {
    const {
      active,
      activatorEvent,
      collisions,
      droppableContainers,
      scrollAdjustedTranslate
    } = sensorContext.current;

    if (!active || activeRef.current == null || !activatorEvent || !scrollAdjustedTranslate) {
      return;
    }

    const {
      onDragOver
    } = latestProps.current;
    const overContainer = droppableContainers.get(overId);
    const over = overContainer && overContainer.rect.current ? {
      id: overContainer.id,
      rect: overContainer.rect.current,
      data: overContainer.data,
      disabled: overContainer.disabled
    } : null;
    const event = {
      active,
      activatorEvent,
      collisions,
      delta: {
        x: scrollAdjustedTranslate.x,
        y: scrollAdjustedTranslate.y
      },
      over
    };
    unstable_batchedUpdates(() => {
      setOver(over);
      onDragOver == null ? void 0 : onDragOver(event);
      dispatchMonitorEvent({
        type: 'onDragOver',
        event
      });
    });
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [overId]);
  useIsomorphicLayoutEffect(() => {
    sensorContext.current = {
      activatorEvent,
      active,
      activeNode,
      collisionRect,
      collisions,
      droppableRects,
      draggableNodes,
      draggingNode,
      draggingNodeRect,
      droppableContainers,
      over,
      scrollableAncestors,
      scrollAdjustedTranslate
    };
    activeRects.current = {
      initial: draggingNodeRect,
      translated: collisionRect
    };
  }, [active, activeNode, collisions, collisionRect, draggableNodes, draggingNode, draggingNodeRect, droppableRects, droppableContainers, over, scrollableAncestors, scrollAdjustedTranslate]);
  useAutoScroller({ ...autoScrollOptions,
    delta: translate,
    draggingRect: collisionRect,
    pointerCoordinates,
    scrollableAncestors,
    scrollableAncestorRects
  });
  const publicContext = useMemo(() => {
    const context = {
      active,
      activeNode,
      activeNodeRect,
      activatorEvent,
      collisions,
      containerNodeRect,
      dragOverlay,
      draggableNodes,
      droppableContainers,
      droppableRects,
      over,
      measureDroppableContainers,
      scrollableAncestors,
      scrollableAncestorRects,
      measuringConfiguration,
      measuringScheduled,
      windowRect
    };
    return context;
  }, [active, activeNode, activeNodeRect, activatorEvent, collisions, containerNodeRect, dragOverlay, draggableNodes, droppableContainers, droppableRects, over, measureDroppableContainers, scrollableAncestors, scrollableAncestorRects, measuringConfiguration, measuringScheduled, windowRect]);
  const internalContext = useMemo(() => {
    const context = {
      activatorEvent,
      activators,
      active,
      activeNodeRect,
      ariaDescribedById: {
        draggable: draggableDescribedById
      },
      dispatch,
      draggableNodes,
      over,
      measureDroppableContainers
    };
    return context;
  }, [activatorEvent, activators, active, activeNodeRect, dispatch, draggableDescribedById, draggableNodes, over, measureDroppableContainers]);
  return React__default.createElement(DndMonitorContext.Provider, {
    value: registerMonitorListener
  }, React__default.createElement(InternalContext.Provider, {
    value: internalContext
  }, React__default.createElement(PublicContext.Provider, {
    value: publicContext
  }, React__default.createElement(ActiveDraggableContext.Provider, {
    value: transform
  }, children)), React__default.createElement(RestoreFocus, {
    disabled: (accessibility == null ? void 0 : accessibility.restoreFocus) === false
  })), React__default.createElement(Accessibility, { ...accessibility,
    hiddenTextDescribedById: draggableDescribedById
  }));

  function getAutoScrollerOptions() {
    const activeSensorDisablesAutoscroll = (activeSensor == null ? void 0 : activeSensor.autoScrollEnabled) === false;
    const autoScrollGloballyDisabled = typeof autoScroll === 'object' ? autoScroll.enabled === false : autoScroll === false;
    const enabled = isInitialized && !activeSensorDisablesAutoscroll && !autoScrollGloballyDisabled;

    if (typeof autoScroll === 'object') {
      return { ...autoScroll,
        enabled
      };
    }

    return {
      enabled
    };
  }
});

const NullContext = /*#__PURE__*/createContext(null);
const defaultRole = 'button';
const ID_PREFIX$1 = 'Droppable';
function useDraggable(_ref) {
  let {
    id,
    data,
    disabled = false,
    attributes
  } = _ref;
  const key = useUniqueId(ID_PREFIX$1);
  const {
    activators,
    activatorEvent,
    active,
    activeNodeRect,
    ariaDescribedById,
    draggableNodes,
    over
  } = useContext(InternalContext);
  const {
    role = defaultRole,
    roleDescription = 'draggable',
    tabIndex = 0
  } = attributes != null ? attributes : {};
  const isDragging = (active == null ? void 0 : active.id) === id;
  const transform = useContext(isDragging ? ActiveDraggableContext : NullContext);
  const [node, setNodeRef] = useNodeRef();
  const [activatorNode, setActivatorNodeRef] = useNodeRef();
  const listeners = useSyntheticListeners(activators, id);
  const dataRef = useLatestValue(data);
  useIsomorphicLayoutEffect(() => {
    draggableNodes.set(id, {
      id,
      key,
      node,
      activatorNode,
      data: dataRef
    });
    return () => {
      const node = draggableNodes.get(id);

      if (node && node.key === key) {
        draggableNodes.delete(id);
      }
    };
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [draggableNodes, id]);
  const memoizedAttributes = useMemo(() => ({
    role,
    tabIndex,
    'aria-disabled': disabled,
    'aria-pressed': isDragging && role === defaultRole ? true : undefined,
    'aria-roledescription': roleDescription,
    'aria-describedby': ariaDescribedById.draggable
  }), [disabled, role, tabIndex, isDragging, roleDescription, ariaDescribedById.draggable]);
  return {
    active,
    activatorEvent,
    activeNodeRect,
    attributes: memoizedAttributes,
    isDragging,
    listeners: disabled ? undefined : listeners,
    node,
    over,
    setNodeRef,
    setActivatorNodeRef,
    transform
  };
}

function useDndContext() {
  return useContext(PublicContext);
}

const ID_PREFIX$1$1 = 'Droppable';
const defaultResizeObserverConfig = {
  timeout: 25
};
function useDroppable(_ref) {
  let {
    data,
    disabled = false,
    id,
    resizeObserverConfig
  } = _ref;
  const key = useUniqueId(ID_PREFIX$1$1);
  const {
    active,
    dispatch,
    over,
    measureDroppableContainers
  } = useContext(InternalContext);
  const previous = useRef({
    disabled
  });
  const resizeObserverConnected = useRef(false);
  const rect = useRef(null);
  const callbackId = useRef(null);
  const {
    disabled: resizeObserverDisabled,
    updateMeasurementsFor,
    timeout: resizeObserverTimeout
  } = { ...defaultResizeObserverConfig,
    ...resizeObserverConfig
  };
  const ids = useLatestValue(updateMeasurementsFor != null ? updateMeasurementsFor : id);
  const handleResize = useCallback(() => {
    if (!resizeObserverConnected.current) {
      // ResizeObserver invokes the `handleResize` callback as soon as `observe` is called,
      // assuming the element is rendered and displayed.
      resizeObserverConnected.current = true;
      return;
    }

    if (callbackId.current != null) {
      clearTimeout(callbackId.current);
    }

    callbackId.current = setTimeout(() => {
      measureDroppableContainers(Array.isArray(ids.current) ? ids.current : [ids.current]);
      callbackId.current = null;
    }, resizeObserverTimeout);
  }, //eslint-disable-next-line react-hooks/exhaustive-deps
  [resizeObserverTimeout]);
  const resizeObserver = useResizeObserver({
    callback: handleResize,
    disabled: resizeObserverDisabled || !active
  });
  const handleNodeChange = useCallback((newElement, previousElement) => {
    if (!resizeObserver) {
      return;
    }

    if (previousElement) {
      resizeObserver.unobserve(previousElement);
      resizeObserverConnected.current = false;
    }

    if (newElement) {
      resizeObserver.observe(newElement);
    }
  }, [resizeObserver]);
  const [nodeRef, setNodeRef] = useNodeRef(handleNodeChange);
  const dataRef = useLatestValue(data);
  useEffect(() => {
    if (!resizeObserver || !nodeRef.current) {
      return;
    }

    resizeObserver.disconnect();
    resizeObserverConnected.current = false;
    resizeObserver.observe(nodeRef.current);
  }, [nodeRef, resizeObserver]);
  useIsomorphicLayoutEffect(() => {
    dispatch({
      type: Action.RegisterDroppable,
      element: {
        id,
        key,
        disabled,
        node: nodeRef,
        rect,
        data: dataRef
      }
    });
    return () => dispatch({
      type: Action.UnregisterDroppable,
      key,
      id
    });
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [id]);
  useEffect(() => {
    if (disabled !== previous.current.disabled) {
      dispatch({
        type: Action.SetDroppableDisabled,
        id,
        key,
        disabled
      });
      previous.current.disabled = disabled;
    }
  }, [id, key, disabled, dispatch]);
  return {
    active,
    rect,
    isOver: (over == null ? void 0 : over.id) === id,
    node: nodeRef,
    over,
    setNodeRef
  };
}

/**
 * Move an array item to a different position. Returns a new array with the item moved to the new position.
 */
function arrayMove(array, from, to) {
  const newArray = array.slice();
  newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
  return newArray;
}

function getSortedRects(items, rects) {
  return items.reduce((accumulator, id, index) => {
    const rect = rects.get(id);

    if (rect) {
      accumulator[index] = rect;
    }

    return accumulator;
  }, Array(items.length));
}

function isValidIndex(index) {
  return index !== null && index >= 0;
}

function itemsEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

function normalizeDisabled(disabled) {
  if (typeof disabled === 'boolean') {
    return {
      draggable: disabled,
      droppable: disabled
    };
  }

  return disabled;
}

const rectSortingStrategy = _ref => {
  let {
    rects,
    activeIndex,
    overIndex,
    index
  } = _ref;
  const newRects = arrayMove(rects, overIndex, activeIndex);
  const oldRect = rects[index];
  const newRect = newRects[index];

  if (!newRect || !oldRect) {
    return null;
  }

  return {
    x: newRect.left - oldRect.left,
    y: newRect.top - oldRect.top,
    scaleX: newRect.width / oldRect.width,
    scaleY: newRect.height / oldRect.height
  };
};

// To-do: We should be calculating scale transformation
const defaultScale$1 = {
  scaleX: 1,
  scaleY: 1
};
const verticalListSortingStrategy = _ref => {
  var _rects$activeIndex;

  let {
    activeIndex,
    activeNodeRect: fallbackActiveRect,
    index,
    rects,
    overIndex
  } = _ref;
  const activeNodeRect = (_rects$activeIndex = rects[activeIndex]) != null ? _rects$activeIndex : fallbackActiveRect;

  if (!activeNodeRect) {
    return null;
  }

  if (index === activeIndex) {
    const overIndexRect = rects[overIndex];

    if (!overIndexRect) {
      return null;
    }

    return {
      x: 0,
      y: activeIndex < overIndex ? overIndexRect.top + overIndexRect.height - (activeNodeRect.top + activeNodeRect.height) : overIndexRect.top - activeNodeRect.top,
      ...defaultScale$1
    };
  }

  const itemGap = getItemGap$1(rects, index, activeIndex);

  if (index > activeIndex && index <= overIndex) {
    return {
      x: 0,
      y: -activeNodeRect.height - itemGap,
      ...defaultScale$1
    };
  }

  if (index < activeIndex && index >= overIndex) {
    return {
      x: 0,
      y: activeNodeRect.height + itemGap,
      ...defaultScale$1
    };
  }

  return {
    x: 0,
    y: 0,
    ...defaultScale$1
  };
};

function getItemGap$1(clientRects, index, activeIndex) {
  const currentRect = clientRects[index];
  const previousRect = clientRects[index - 1];
  const nextRect = clientRects[index + 1];

  if (!currentRect) {
    return 0;
  }

  if (activeIndex < index) {
    return previousRect ? currentRect.top - (previousRect.top + previousRect.height) : nextRect ? nextRect.top - (currentRect.top + currentRect.height) : 0;
  }

  return nextRect ? nextRect.top - (currentRect.top + currentRect.height) : previousRect ? currentRect.top - (previousRect.top + previousRect.height) : 0;
}

const ID_PREFIX = 'Sortable';
const Context = /*#__PURE__*/React__default.createContext({
  activeIndex: -1,
  containerId: ID_PREFIX,
  disableTransforms: false,
  items: [],
  overIndex: -1,
  useDragOverlay: false,
  sortedRects: [],
  strategy: rectSortingStrategy,
  disabled: {
    draggable: false,
    droppable: false
  }
});
function SortableContext(_ref) {
  let {
    children,
    id,
    items: userDefinedItems,
    strategy = rectSortingStrategy,
    disabled: disabledProp = false
  } = _ref;
  const {
    active,
    dragOverlay,
    droppableRects,
    over,
    measureDroppableContainers
  } = useDndContext();
  const containerId = useUniqueId(ID_PREFIX, id);
  const useDragOverlay = Boolean(dragOverlay.rect !== null);
  const items = useMemo(() => userDefinedItems.map(item => typeof item === 'object' && 'id' in item ? item.id : item), [userDefinedItems]);
  const isDragging = active != null;
  const activeIndex = active ? items.indexOf(active.id) : -1;
  const overIndex = over ? items.indexOf(over.id) : -1;
  const previousItemsRef = useRef(items);
  const itemsHaveChanged = !itemsEqual(items, previousItemsRef.current);
  const disableTransforms = overIndex !== -1 && activeIndex === -1 || itemsHaveChanged;
  const disabled = normalizeDisabled(disabledProp);
  useIsomorphicLayoutEffect(() => {
    if (itemsHaveChanged && isDragging) {
      measureDroppableContainers(items);
    }
  }, [itemsHaveChanged, items, isDragging, measureDroppableContainers]);
  useEffect(() => {
    previousItemsRef.current = items;
  }, [items]);
  const contextValue = useMemo(() => ({
    activeIndex,
    containerId,
    disabled,
    disableTransforms,
    items,
    overIndex,
    useDragOverlay,
    sortedRects: getSortedRects(items, droppableRects),
    strategy
  }), // eslint-disable-next-line react-hooks/exhaustive-deps
  [activeIndex, containerId, disabled.draggable, disabled.droppable, disableTransforms, items, overIndex, droppableRects, useDragOverlay, strategy]);
  return React__default.createElement(Context.Provider, {
    value: contextValue
  }, children);
}

const defaultNewIndexGetter = _ref => {
  let {
    id,
    items,
    activeIndex,
    overIndex
  } = _ref;
  return arrayMove(items, activeIndex, overIndex).indexOf(id);
};
const defaultAnimateLayoutChanges = _ref2 => {
  let {
    containerId,
    isSorting,
    wasDragging,
    index,
    items,
    newIndex,
    previousItems,
    previousContainerId,
    transition
  } = _ref2;

  if (!transition || !wasDragging) {
    return false;
  }

  if (previousItems !== items && index === newIndex) {
    return false;
  }

  if (isSorting) {
    return true;
  }

  return newIndex !== index && containerId === previousContainerId;
};
const defaultTransition = {
  duration: 200,
  easing: 'ease'
};
const transitionProperty = 'transform';
const disabledTransition = /*#__PURE__*/CSS$1.Transition.toString({
  property: transitionProperty,
  duration: 0,
  easing: 'linear'
});
const defaultAttributes = {
  roleDescription: 'sortable'
};

/*
 * When the index of an item changes while sorting,
 * we need to temporarily disable the transforms
 */

function useDerivedTransform(_ref) {
  let {
    disabled,
    index,
    node,
    rect
  } = _ref;
  const [derivedTransform, setDerivedtransform] = useState(null);
  const previousIndex = useRef(index);
  useIsomorphicLayoutEffect(() => {
    if (!disabled && index !== previousIndex.current && node.current) {
      const initial = rect.current;

      if (initial) {
        const current = getClientRect(node.current, {
          ignoreTransform: true
        });
        const delta = {
          x: initial.left - current.left,
          y: initial.top - current.top,
          scaleX: initial.width / current.width,
          scaleY: initial.height / current.height
        };

        if (delta.x || delta.y) {
          setDerivedtransform(delta);
        }
      }
    }

    if (index !== previousIndex.current) {
      previousIndex.current = index;
    }
  }, [disabled, index, node, rect]);
  useEffect(() => {
    if (derivedTransform) {
      setDerivedtransform(null);
    }
  }, [derivedTransform]);
  return derivedTransform;
}

function useSortable(_ref) {
  let {
    animateLayoutChanges = defaultAnimateLayoutChanges,
    attributes: userDefinedAttributes,
    disabled: localDisabled,
    data: customData,
    getNewIndex = defaultNewIndexGetter,
    id,
    strategy: localStrategy,
    resizeObserverConfig,
    transition = defaultTransition
  } = _ref;
  const {
    items,
    containerId,
    activeIndex,
    disabled: globalDisabled,
    disableTransforms,
    sortedRects,
    overIndex,
    useDragOverlay,
    strategy: globalStrategy
  } = useContext(Context);
  const disabled = normalizeLocalDisabled(localDisabled, globalDisabled);
  const index = items.indexOf(id);
  const data = useMemo(() => ({
    sortable: {
      containerId,
      index,
      items
    },
    ...customData
  }), [containerId, customData, index, items]);
  const itemsAfterCurrentSortable = useMemo(() => items.slice(items.indexOf(id)), [items, id]);
  const {
    rect,
    node,
    isOver,
    setNodeRef: setDroppableNodeRef
  } = useDroppable({
    id,
    data,
    disabled: disabled.droppable,
    resizeObserverConfig: {
      updateMeasurementsFor: itemsAfterCurrentSortable,
      ...resizeObserverConfig
    }
  });
  const {
    active,
    activatorEvent,
    activeNodeRect,
    attributes,
    setNodeRef: setDraggableNodeRef,
    listeners,
    isDragging,
    over,
    setActivatorNodeRef,
    transform
  } = useDraggable({
    id,
    data,
    attributes: { ...defaultAttributes,
      ...userDefinedAttributes
    },
    disabled: disabled.draggable
  });
  const setNodeRef = useCombinedRefs(setDroppableNodeRef, setDraggableNodeRef);
  const isSorting = Boolean(active);
  const displaceItem = isSorting && !disableTransforms && isValidIndex(activeIndex) && isValidIndex(overIndex);
  const shouldDisplaceDragSource = !useDragOverlay && isDragging;
  const dragSourceDisplacement = shouldDisplaceDragSource && displaceItem ? transform : null;
  const strategy = localStrategy != null ? localStrategy : globalStrategy;
  const finalTransform = displaceItem ? dragSourceDisplacement != null ? dragSourceDisplacement : strategy({
    rects: sortedRects,
    activeNodeRect,
    activeIndex,
    overIndex,
    index
  }) : null;
  const newIndex = isValidIndex(activeIndex) && isValidIndex(overIndex) ? getNewIndex({
    id,
    items,
    activeIndex,
    overIndex
  }) : index;
  const activeId = active == null ? void 0 : active.id;
  const previous = useRef({
    activeId,
    items,
    newIndex,
    containerId
  });
  const itemsHaveChanged = items !== previous.current.items;
  const shouldAnimateLayoutChanges = animateLayoutChanges({
    active,
    containerId,
    isDragging,
    isSorting,
    id,
    index,
    items,
    newIndex: previous.current.newIndex,
    previousItems: previous.current.items,
    previousContainerId: previous.current.containerId,
    transition,
    wasDragging: previous.current.activeId != null
  });
  const derivedTransform = useDerivedTransform({
    disabled: !shouldAnimateLayoutChanges,
    index,
    node,
    rect
  });
  useEffect(() => {
    if (isSorting && previous.current.newIndex !== newIndex) {
      previous.current.newIndex = newIndex;
    }

    if (containerId !== previous.current.containerId) {
      previous.current.containerId = containerId;
    }

    if (items !== previous.current.items) {
      previous.current.items = items;
    }
  }, [isSorting, newIndex, containerId, items]);
  useEffect(() => {
    if (activeId === previous.current.activeId) {
      return;
    }

    if (activeId && !previous.current.activeId) {
      previous.current.activeId = activeId;
      return;
    }

    const timeoutId = setTimeout(() => {
      previous.current.activeId = activeId;
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [activeId]);
  return {
    active,
    activeIndex,
    attributes,
    data,
    rect,
    index,
    newIndex,
    items,
    isOver,
    isSorting,
    isDragging,
    listeners,
    node,
    overIndex,
    over,
    setNodeRef,
    setActivatorNodeRef,
    setDroppableNodeRef,
    setDraggableNodeRef,
    transform: derivedTransform != null ? derivedTransform : finalTransform,
    transition: getTransition()
  };

  function getTransition() {
    if ( // Temporarily disable transitions for a single frame to set up derived transforms
    derivedTransform || // Or to prevent items jumping to back to their "new" position when items change
    itemsHaveChanged && previous.current.newIndex === index) {
      return disabledTransition;
    }

    if (shouldDisplaceDragSource && !isKeyboardEvent(activatorEvent) || !transition) {
      return undefined;
    }

    if (isSorting || shouldAnimateLayoutChanges) {
      return CSS$1.Transition.toString({ ...transition,
        property: transitionProperty
      });
    }

    return undefined;
  }
}

function normalizeLocalDisabled(localDisabled, globalDisabled) {
  var _localDisabled$dragga, _localDisabled$droppa;

  if (typeof localDisabled === 'boolean') {
    return {
      draggable: localDisabled,
      // Backwards compatibility
      droppable: false
    };
  }

  return {
    draggable: (_localDisabled$dragga = localDisabled == null ? void 0 : localDisabled.draggable) != null ? _localDisabled$dragga : globalDisabled.draggable,
    droppable: (_localDisabled$droppa = localDisabled == null ? void 0 : localDisabled.droppable) != null ? _localDisabled$droppa : globalDisabled.droppable
  };
}

function hasSortableData(entry) {
  if (!entry) {
    return false;
  }

  const data = entry.data.current;

  if (data && 'sortable' in data && typeof data.sortable === 'object' && 'containerId' in data.sortable && 'items' in data.sortable && 'index' in data.sortable) {
    return true;
  }

  return false;
}

const directions = [KeyboardCode.Down, KeyboardCode.Right, KeyboardCode.Up, KeyboardCode.Left];
const sortableKeyboardCoordinates = (event, _ref) => {
  let {
    context: {
      active,
      collisionRect,
      droppableRects,
      droppableContainers,
      over,
      scrollableAncestors
    }
  } = _ref;

  if (directions.includes(event.code)) {
    event.preventDefault();

    if (!active || !collisionRect) {
      return;
    }

    const filteredContainers = [];
    droppableContainers.getEnabled().forEach(entry => {
      if (!entry || entry != null && entry.disabled) {
        return;
      }

      const rect = droppableRects.get(entry.id);

      if (!rect) {
        return;
      }

      switch (event.code) {
        case KeyboardCode.Down:
          if (collisionRect.top < rect.top) {
            filteredContainers.push(entry);
          }

          break;

        case KeyboardCode.Up:
          if (collisionRect.top > rect.top) {
            filteredContainers.push(entry);
          }

          break;

        case KeyboardCode.Left:
          if (collisionRect.left > rect.left) {
            filteredContainers.push(entry);
          }

          break;

        case KeyboardCode.Right:
          if (collisionRect.left < rect.left) {
            filteredContainers.push(entry);
          }

          break;
      }
    });
    const collisions = closestCorners({
      active,
      collisionRect: collisionRect,
      droppableRects,
      droppableContainers: filteredContainers,
      pointerCoordinates: null
    });
    let closestId = getFirstCollision(collisions, 'id');

    if (closestId === (over == null ? void 0 : over.id) && collisions.length > 1) {
      closestId = collisions[1].id;
    }

    if (closestId != null) {
      const activeDroppable = droppableContainers.get(active.id);
      const newDroppable = droppableContainers.get(closestId);
      const newRect = newDroppable ? droppableRects.get(newDroppable.id) : null;
      const newNode = newDroppable == null ? void 0 : newDroppable.node.current;

      if (newNode && newRect && activeDroppable && newDroppable) {
        const newScrollAncestors = getScrollableAncestors(newNode);
        const hasDifferentScrollAncestors = newScrollAncestors.some((element, index) => scrollableAncestors[index] !== element);
        const hasSameContainer = isSameContainer(activeDroppable, newDroppable);
        const isAfterActive = isAfter(activeDroppable, newDroppable);
        const offset = hasDifferentScrollAncestors || !hasSameContainer ? {
          x: 0,
          y: 0
        } : {
          x: isAfterActive ? collisionRect.width - newRect.width : 0,
          y: isAfterActive ? collisionRect.height - newRect.height : 0
        };
        const rectCoordinates = {
          x: newRect.left,
          y: newRect.top
        };
        const newCoordinates = offset.x && offset.y ? rectCoordinates : subtract(rectCoordinates, offset);
        return newCoordinates;
      }
    }
  }

  return undefined;
};

function isSameContainer(a, b) {
  if (!hasSortableData(a) || !hasSortableData(b)) {
    return false;
  }

  return a.data.current.sortable.containerId === b.data.current.sortable.containerId;
}

function isAfter(a, b) {
  if (!hasSortableData(a) || !hasSortableData(b)) {
    return false;
  }

  if (!isSameContainer(a, b)) {
    return false;
  }

  return a.data.current.sortable.index < b.data.current.sortable.index;
}

const ToolsContext = createContext(undefined);
const ToolsProvider = ({ children, tools }) => {
    const isReadOnly = useYooptaReadOnly();
    const contextValue = useMemo(() => {
        if (!tools)
            return {};
        return Object.keys(tools).reduce((acc, toolname) => {
            var _a;
            return Object.assign(Object.assign({}, acc), { [toolname]: (_a = tools[toolname]) === null || _a === void 0 ? void 0 : _a.render });
        }, {});
    }, [tools]);
    const toolsRender = useMemo(() => {
        if (!tools || isReadOnly)
            return null;
        return Object.keys(tools).map((toolname) => {
            var _a, _b, _c;
            const Tool = (_a = tools === null || tools === void 0 ? void 0 : tools[toolname]) === null || _a === void 0 ? void 0 : _a.tool;
            const render = (_b = tools === null || tools === void 0 ? void 0 : tools[toolname]) === null || _b === void 0 ? void 0 : _b.render;
            const props = (_c = tools === null || tools === void 0 ? void 0 : tools[toolname]) === null || _c === void 0 ? void 0 : _c.props;
            if (!Tool)
                return null;
            // @ts-ignore - fixme
            return jsx(Tool, Object.assign({ render: render }, props), toolname);
        });
    }, [tools]);
    return (jsx(ToolsContext.Provider, Object.assign({ value: contextValue }, { children: jsxs(Fragment, { children: [toolsRender, children] }) })));
};
const useYooptaTools = () => {
    const context = useContext(ToolsContext);
    if (context === undefined) {
        throw new Error('useYooptaTools must be used within a ToolsProvider');
    }
    return context;
};

function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || '').toLowerCase();
  }
  // Mocked nodes in testing environments may not be instances of Node. By
  // returning `#document` an infinite loop won't occur.
  // https://github.com/floating-ui/floating-ui/issues/2317
  return '#document';
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement(value) {
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  // Browsers without `ShadowRoot` support.
  if (typeof ShadowRoot === 'undefined') {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
function isOverflowElement(element) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle$1(element);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && !['inline', 'contents'].includes(display);
}
function isTableElement(element) {
  return ['table', 'td', 'th'].includes(getNodeName(element));
}
function isContainingBlock(element) {
  const webkit = isWebKit();
  const css = getComputedStyle$1(element);

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
  return css.transform !== 'none' || css.perspective !== 'none' || (css.containerType ? css.containerType !== 'normal' : false) || !webkit && (css.backdropFilter ? css.backdropFilter !== 'none' : false) || !webkit && (css.filter ? css.filter !== 'none' : false) || ['transform', 'perspective', 'filter'].some(value => (css.willChange || '').includes(value)) || ['paint', 'layout', 'strict', 'content'].some(value => (css.contain || '').includes(value));
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else {
      currentNode = getParentNode(currentNode);
    }
  }
  return null;
}
function isWebKit() {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return CSS.supports('-webkit-backdrop-filter', 'none');
}
function isLastTraversableNode(node) {
  return ['html', 'body', '#document'].includes(getNodeName(node));
}
function getComputedStyle$1(element) {
  return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }
  return {
    scrollLeft: element.pageXOffset,
    scrollTop: element.pageYOffset
  };
}
function getParentNode(node) {
  if (getNodeName(node) === 'html') {
    return node;
  }
  const result =
  // Step into the shadow DOM of the parent of a slotted node.
  node.assignedSlot ||
  // DOM Element detected.
  node.parentNode ||
  // ShadowRoot detected.
  isShadowRoot(node) && node.host ||
  // Fallback.
  getDocumentElement(node);
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return node.ownerDocument ? node.ownerDocument.body : node.body;
  }
  if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  if (traverseIframes === void 0) {
    traverseIframes = true;
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], win.frameElement && traverseIframes ? getOverflowAncestors(win.frameElement) : []);
  }
  return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
}

function activeElement(doc) {
  let activeElement = doc.activeElement;
  while (((_activeElement = activeElement) == null || (_activeElement = _activeElement.shadowRoot) == null ? void 0 : _activeElement.activeElement) != null) {
    var _activeElement;
    activeElement = activeElement.shadowRoot.activeElement;
  }
  return activeElement;
}
function contains(parent, child) {
  if (!parent || !child) {
    return false;
  }
  const rootNode = child.getRootNode == null ? void 0 : child.getRootNode();

  // First, attempt with faster native method
  if (parent.contains(child)) {
    return true;
  }

  // then fallback to custom implementation with Shadow DOM support
  if (rootNode && isShadowRoot(rootNode)) {
    let next = child;
    while (next) {
      if (parent === next) {
        return true;
      }
      // @ts-ignore
      next = next.parentNode || next.host;
    }
  }

  // Give up, the result is false
  return false;
}
// Avoid Chrome DevTools blue warning.
function getPlatform() {
  const uaData = navigator.userAgentData;
  if (uaData != null && uaData.platform) {
    return uaData.platform;
  }
  return navigator.platform;
}
function isSafari() {
  // Chrome DevTools does not complain about navigator.vendor
  return /apple/i.test(navigator.vendor);
}
function getDocument(node) {
  return (node == null ? void 0 : node.ownerDocument) || document;
}

/**
 * Custom positioning reference element.
 * @see https://floating-ui.com/docs/virtual-elements
 */

const min = Math.min;
const max = Math.max;
const round = Math.round;
const floor = Math.floor;
const createCoords = v => ({
  x: v,
  y: v
});
const oppositeSideMap = {
  left: 'right',
  right: 'left',
  bottom: 'top',
  top: 'bottom'
};
const oppositeAlignmentMap = {
  start: 'end',
  end: 'start'
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === 'function' ? value(param) : value;
}
function getSide(placement) {
  return placement.split('-')[0];
}
function getAlignment(placement) {
  return placement.split('-')[1];
}
function getOppositeAxis(axis) {
  return axis === 'x' ? 'y' : 'x';
}
function getAxisLength(axis) {
  return axis === 'y' ? 'height' : 'width';
}
function getSideAxis(placement) {
  return ['top', 'bottom'].includes(getSide(placement)) ? 'y' : 'x';
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === 'x' ? alignment === (rtl ? 'end' : 'start') ? 'right' : 'left' : alignment === 'start' ? 'bottom' : 'top';
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.replace(/start|end/g, alignment => oppositeAlignmentMap[alignment]);
}
function getSideList(side, isStart, rtl) {
  const lr = ['left', 'right'];
  const rl = ['right', 'left'];
  const tb = ['top', 'bottom'];
  const bt = ['bottom', 'top'];
  switch (side) {
    case 'top':
    case 'bottom':
      if (rtl) return isStart ? rl : lr;
      return isStart ? lr : rl;
    case 'left':
    case 'right':
      return isStart ? tb : bt;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === 'start', rtl);
  if (alignment) {
    list = list.map(side => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, side => oppositeSideMap[side]);
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding
  };
}
function getPaddingObject(padding) {
  return typeof padding !== 'number' ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  return {
    ...rect,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  };
}

function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === 'y';
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case 'top':
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case 'bottom':
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case 'right':
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case 'left':
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  switch (getAlignment(placement)) {
    case 'start':
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case 'end':
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}

/**
 * Computes the `x` and `y` coordinates that will place the floating element
 * next to a given reference element.
 *
 * This export does not have any `platform` interface logic. You will need to
 * write one for the platform you are using Floating UI with.
 */
const computePosition$1 = async (reference, floating, config) => {
  const {
    placement = 'bottom',
    strategy = 'absolute',
    middleware = [],
    platform
  } = config;
  const validMiddleware = middleware.filter(Boolean);
  const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(floating));
  let rects = await platform.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x,
    y
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let middlewareData = {};
  let resetCount = 0;
  for (let i = 0; i < validMiddleware.length; i++) {
    const {
      name,
      fn
    } = validMiddleware[i];
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x,
      y,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform,
      elements: {
        reference,
        floating
      }
    });
    x = nextX != null ? nextX : x;
    y = nextY != null ? nextY : y;
    middlewareData = {
      ...middlewareData,
      [name]: {
        ...middlewareData[name],
        ...data
      }
    };
    if (reset && resetCount <= 50) {
      resetCount++;
      if (typeof reset === 'object') {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x,
          y
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i = -1;
    }
  }
  return {
    x,
    y,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};

/**
 * Resolves with an object of overflow side offsets that determine how much the
 * element is overflowing a given clipping boundary on each side.
 * - positive = overflowing the boundary by that number of pixels
 * - negative = how many pixels left before it will overflow
 * - 0 = lies flush with the boundary
 * @see https://floating-ui.com/docs/detectOverflow
 */
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x,
    y,
    platform,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = 'clippingAncestors',
    rootBoundary = 'viewport',
    elementContext = 'floating',
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === 'floating' ? 'reference' : 'floating';
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform.getClippingRect({
    element: ((_await$platform$isEle = await (platform.isElement == null ? void 0 : platform.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || (await (platform.getDocumentElement == null ? void 0 : platform.getDocumentElement(elements.floating))),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === 'floating' ? {
    ...rects.floating,
    x,
    y
  } : rects.reference;
  const offsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(elements.floating));
  const offsetScale = (await (platform.isElement == null ? void 0 : platform.isElement(offsetParent))) ? (await (platform.getScale == null ? void 0 : platform.getScale(offsetParent))) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements,
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}

/**
 * Optimizes the visibility of the floating element by flipping the `placement`
 * in order to keep it in view when the preferred placement(s) will overflow the
 * clipping boundary. Alternative to `autoPlacement`.
 * @see https://floating-ui.com/docs/flip
 */
const flip$1 = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'flip',
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = 'bestFit',
        fallbackAxisSideDirection = 'none',
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);

      // If a reset by the arrow was caused due to an alignment offset being
      // added, we should skip any logic now since `flip()` has already done its
      // work.
      // https://github.com/floating-ui/floating-ui/issues/2549#issuecomment-1719601643
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      if (!specifiedFallbackPlacements && fallbackAxisSideDirection !== 'none') {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements = [initialPlacement, ...fallbackPlacements];
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides[0]], overflow[sides[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];

      // One or more sides is overflowing.
      if (!overflows.every(side => side <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements[nextIndex];
        if (nextPlacement) {
          // Try next placement and re-run the lifecycle.
          return {
            data: {
              index: nextIndex,
              overflows: overflowsData
            },
            reset: {
              placement: nextPlacement
            }
          };
        }

        // First, find the candidates that fit on the mainAxis side of overflow,
        // then find the placement that fits the best on the main crossAxis side.
        let resetPlacement = (_overflowsData$filter = overflowsData.filter(d => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;

        // Otherwise fallback.
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case 'bestFit':
              {
                var _overflowsData$map$so;
                const placement = (_overflowsData$map$so = overflowsData.map(d => [d.placement, d.overflows.filter(overflow => overflow > 0).reduce((acc, overflow) => acc + overflow, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$map$so[0];
                if (placement) {
                  resetPlacement = placement;
                }
                break;
              }
            case 'initialPlacement':
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};

function getBoundingRect(rects) {
  const minX = min(...rects.map(rect => rect.left));
  const minY = min(...rects.map(rect => rect.top));
  const maxX = max(...rects.map(rect => rect.right));
  const maxY = max(...rects.map(rect => rect.bottom));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
function getRectsByLine(rects) {
  const sortedRects = rects.slice().sort((a, b) => a.y - b.y);
  const groups = [];
  let prevRect = null;
  for (let i = 0; i < sortedRects.length; i++) {
    const rect = sortedRects[i];
    if (!prevRect || rect.y - prevRect.y > prevRect.height / 2) {
      groups.push([rect]);
    } else {
      groups[groups.length - 1].push(rect);
    }
    prevRect = rect;
  }
  return groups.map(rect => rectToClientRect(getBoundingRect(rect)));
}
/**
 * Provides improved positioning for inline reference elements that can span
 * over multiple lines, such as hyperlinks or range selections.
 * @see https://floating-ui.com/docs/inline
 */
const inline$1 = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'inline',
    options,
    async fn(state) {
      const {
        placement,
        elements,
        rects,
        platform,
        strategy
      } = state;
      // A MouseEvent's client{X,Y} coords can be up to 2 pixels off a
      // ClientRect's bounds, despite the event listener being triggered. A
      // padding of 2 seems to handle this issue.
      const {
        padding = 2,
        x,
        y
      } = evaluate(options, state);
      const nativeClientRects = Array.from((await (platform.getClientRects == null ? void 0 : platform.getClientRects(elements.reference))) || []);
      const clientRects = getRectsByLine(nativeClientRects);
      const fallback = rectToClientRect(getBoundingRect(nativeClientRects));
      const paddingObject = getPaddingObject(padding);
      function getBoundingClientRect() {
        // There are two rects and they are disjoined.
        if (clientRects.length === 2 && clientRects[0].left > clientRects[1].right && x != null && y != null) {
          // Find the first rect in which the point is fully inside.
          return clientRects.find(rect => x > rect.left - paddingObject.left && x < rect.right + paddingObject.right && y > rect.top - paddingObject.top && y < rect.bottom + paddingObject.bottom) || fallback;
        }

        // There are 2 or more connected rects.
        if (clientRects.length >= 2) {
          if (getSideAxis(placement) === 'y') {
            const firstRect = clientRects[0];
            const lastRect = clientRects[clientRects.length - 1];
            const isTop = getSide(placement) === 'top';
            const top = firstRect.top;
            const bottom = lastRect.bottom;
            const left = isTop ? firstRect.left : lastRect.left;
            const right = isTop ? firstRect.right : lastRect.right;
            const width = right - left;
            const height = bottom - top;
            return {
              top,
              bottom,
              left,
              right,
              width,
              height,
              x: left,
              y: top
            };
          }
          const isLeftSide = getSide(placement) === 'left';
          const maxRight = max(...clientRects.map(rect => rect.right));
          const minLeft = min(...clientRects.map(rect => rect.left));
          const measureRects = clientRects.filter(rect => isLeftSide ? rect.left === minLeft : rect.right === maxRight);
          const top = measureRects[0].top;
          const bottom = measureRects[measureRects.length - 1].bottom;
          const left = minLeft;
          const right = maxRight;
          const width = right - left;
          const height = bottom - top;
          return {
            top,
            bottom,
            left,
            right,
            width,
            height,
            x: left,
            y: top
          };
        }
        return fallback;
      }
      const resetRects = await platform.getElementRects({
        reference: {
          getBoundingClientRect
        },
        floating: elements.floating,
        strategy
      });
      if (rects.reference.x !== resetRects.reference.x || rects.reference.y !== resetRects.reference.y || rects.reference.width !== resetRects.reference.width || rects.reference.height !== resetRects.reference.height) {
        return {
          reset: {
            rects: resetRects
          }
        };
      }
      return {};
    }
  };
};

// For type backwards-compatibility, the `OffsetOptions` type was also
// Derivable.

async function convertValueToCoords(state, options) {
  const {
    placement,
    platform,
    elements
  } = state;
  const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === 'y';
  const mainAxisMulti = ['left', 'top'].includes(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === 'number' ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: 0,
    crossAxis: 0,
    alignmentAxis: null,
    ...rawValue
  };
  if (alignment && typeof alignmentAxis === 'number') {
    crossAxis = alignment === 'end' ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}

/**
 * Modifies the placement by translating the floating element along the
 * specified axes.
 * A number (shorthand for `mainAxis` or distance), or an axes configuration
 * object may be passed.
 * @see https://floating-ui.com/docs/offset
 */
const offset = function (options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: 'offset',
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x,
        y,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);

      // If the placement is the same and the arrow caused an alignment offset
      // then we don't need to change the positioning coordinates.
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x + diffCoords.x,
        y: y + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};

/**
 * Optimizes the visibility of the floating element by shifting it in order to
 * keep it in view when it will overflow the clipping boundary.
 * @see https://floating-ui.com/docs/shift
 */
const shift$1 = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'shift',
    options,
    async fn(state) {
      const {
        x,
        y,
        placement
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: _ref => {
            let {
              x,
              y
            } = _ref;
            return {
              x,
              y
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(getSide(placement));
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      if (checkMainAxis) {
        const minSide = mainAxis === 'y' ? 'top' : 'left';
        const maxSide = mainAxis === 'y' ? 'bottom' : 'right';
        const min = mainAxisCoord + overflow[minSide];
        const max = mainAxisCoord - overflow[maxSide];
        mainAxisCoord = clamp(min, mainAxisCoord, max);
      }
      if (checkCrossAxis) {
        const minSide = crossAxis === 'y' ? 'top' : 'left';
        const maxSide = crossAxis === 'y' ? 'bottom' : 'right';
        const min = crossAxisCoord + overflow[minSide];
        const max = crossAxisCoord - overflow[maxSide];
        crossAxisCoord = clamp(min, crossAxisCoord, max);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x,
          y: limitedCoords.y - y
        }
      };
    }
  };
};

function getCssDimensions(element) {
  const css = getComputedStyle$1(element);
  // In testing environments, the `width` and `height` properties are empty
  // strings for SVG elements, returning NaN. Fallback to `0` in this case.
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}

function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}

function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $
  } = getCssDimensions(domElement);
  let x = ($ ? round(rect.width) : rect.width) / width;
  let y = ($ ? round(rect.height) : rect.height) / height;

  // 0, NaN, or Infinity should always fallback to 1.

  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y
  };
}

const noOffsets = /*#__PURE__*/createCoords(0);
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element)) {
    return false;
  }
  return isFixed;
}

function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x = (clientRect.left + visualOffsets.x) / scale.x;
  let y = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement) {
    const win = getWindow(domElement);
    const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentWin = win;
    let currentIFrame = currentWin.frameElement;
    while (currentIFrame && offsetParent && offsetWin !== currentWin) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle$1(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentWin = getWindow(currentIFrame);
      currentIFrame = currentWin.frameElement;
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y
  });
}

const topLayerSelectors = [':popover-open', ':modal'];
function isTopLayer(floating) {
  return topLayerSelectors.some(selector => {
    try {
      return floating.matches(selector);
    } catch (e) {
      return false;
    }
  });
}

function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    elements,
    rect,
    offsetParent,
    strategy
  } = _ref;
  const isFixed = strategy === 'fixed';
  const documentElement = getDocumentElement(offsetParent);
  const topLayer = elements ? isTopLayer(elements.floating) : false;
  if (offsetParent === documentElement || topLayer && isFixed) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== 'body' || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isHTMLElement(offsetParent)) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y
  };
}

function getClientRects(element) {
  return Array.from(element.getClientRects());
}

function getWindowScrollBarX(element) {
  // If <html> has a CSS width greater than the viewport, then this will be
  // incorrect for RTL.
  return getBoundingClientRect(getDocumentElement(element)).left + getNodeScroll(element).scrollLeft;
}

// Gets the entire size of the scrollable document area, even extending outside
// of the `<html>` and `<body>` rect bounds if horizontally scrollable.
function getDocumentRect(element) {
  const html = getDocumentElement(element);
  const scroll = getNodeScroll(element);
  const body = element.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x = -scroll.scrollLeft + getWindowScrollBarX(element);
  const y = -scroll.scrollTop;
  if (getComputedStyle$1(body).direction === 'rtl') {
    x += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}

function getViewportRect(element, strategy) {
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    const visualViewportBased = isWebKit();
    if (!visualViewportBased || visualViewportBased && strategy === 'fixed') {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }
  return {
    width,
    height,
    x,
    y
  };
}

// Returns the inner client rect, subtracting scrollbars if present.
function getInnerBoundingClientRect(element, strategy) {
  const clientRect = getBoundingClientRect(element, true, strategy === 'fixed');
  const top = clientRect.top + element.clientTop;
  const left = clientRect.left + element.clientLeft;
  const scale = isHTMLElement(element) ? getScale(element) : createCoords(1);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y
  };
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
  let rect;
  if (clippingAncestor === 'viewport') {
    rect = getViewportRect(element, strategy);
  } else if (clippingAncestor === 'document') {
    rect = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect = {
      ...clippingAncestor,
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y
    };
  }
  return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element, stopNode) {
  const parentNode = getParentNode(element);
  if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) {
    return false;
  }
  return getComputedStyle$1(parentNode).position === 'fixed' || hasFixedPositionAncestor(parentNode, stopNode);
}

// A "clipping ancestor" is an `overflow` element with the characteristic of
// clipping (or hiding) child elements. This returns all clipping ancestors
// of the given element up the tree.
function getClippingElementAncestors(element, cache) {
  const cachedResult = cache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element, [], false).filter(el => isElement(el) && getNodeName(el) !== 'body');
  let currentContainingBlockComputedStyle = null;
  const elementIsFixed = getComputedStyle$1(element).position === 'fixed';
  let currentNode = elementIsFixed ? getParentNode(element) : element;

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle$1(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    if (!currentNodeIsContaining && computedStyle.position === 'fixed') {
      currentContainingBlockComputedStyle = null;
    }
    const shouldDropCurrentNode = elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === 'static' && !!currentContainingBlockComputedStyle && ['absolute', 'fixed'].includes(currentContainingBlockComputedStyle.position) || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element, currentNode);
    if (shouldDropCurrentNode) {
      // Drop non-containing blocks.
      result = result.filter(ancestor => ancestor !== currentNode);
    } else {
      // Record last containing block for next iteration.
      currentContainingBlockComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}

// Gets the maximum area that the element is visible in due to any number of
// clipping ancestors.
function getClippingRect(_ref) {
  let {
    element,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === 'clippingAncestors' ? getClippingElementAncestors(element, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstClippingAncestor = clippingAncestors[0];
  const clippingRect = clippingAncestors.reduce((accRect, clippingAncestor) => {
    const rect = getClientRectFromClippingAncestor(element, clippingAncestor, strategy);
    accRect.top = max(rect.top, accRect.top);
    accRect.right = min(rect.right, accRect.right);
    accRect.bottom = min(rect.bottom, accRect.bottom);
    accRect.left = max(rect.left, accRect.left);
    return accRect;
  }, getClientRectFromClippingAncestor(element, firstClippingAncestor, strategy));
  return {
    width: clippingRect.right - clippingRect.left,
    height: clippingRect.bottom - clippingRect.top,
    x: clippingRect.left,
    y: clippingRect.top
  };
}

function getDimensions(element) {
  const {
    width,
    height
  } = getCssDimensions(element);
  return {
    width,
    height
  };
}

function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === 'fixed';
  const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== 'body' || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    } else if (documentElement) {
      offsets.x = getWindowScrollBarX(documentElement);
    }
  }
  const x = rect.left + scroll.scrollLeft - offsets.x;
  const y = rect.top + scroll.scrollTop - offsets.y;
  return {
    x,
    y,
    width: rect.width,
    height: rect.height
  };
}

function getTrueOffsetParent(element, polyfill) {
  if (!isHTMLElement(element) || getComputedStyle$1(element).position === 'fixed') {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  return element.offsetParent;
}

// Gets the closest ancestor positioned element. Handles some edge cases,
// such as table ancestors and cross browser bugs.
function getOffsetParent(element, polyfill) {
  const window = getWindow(element);
  if (!isHTMLElement(element) || isTopLayer(element)) {
    return window;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (offsetParent && isTableElement(offsetParent) && getComputedStyle$1(offsetParent).position === 'static') {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle$1(offsetParent).position === 'static' && !isContainingBlock(offsetParent))) {
    return window;
  }
  return offsetParent || getContainingBlock(element) || window;
}

const getElementRects = async function (data) {
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  return {
    reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
    floating: {
      x: 0,
      y: 0,
      ...(await getDimensionsFn(data.floating))
    }
  };
};

function isRTL(element) {
  return getComputedStyle$1(element).direction === 'rtl';
}

const platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};

// https://samthor.au/2021/observing-dom/
function observeMove(element, onMove) {
  let io = null;
  let timeoutId;
  const root = getDocumentElement(element);
  function cleanup() {
    var _io;
    clearTimeout(timeoutId);
    (_io = io) == null || _io.disconnect();
    io = null;
  }
  function refresh(skip, threshold) {
    if (skip === void 0) {
      skip = false;
    }
    if (threshold === void 0) {
      threshold = 1;
    }
    cleanup();
    const {
      left,
      top,
      width,
      height
    } = element.getBoundingClientRect();
    if (!skip) {
      onMove();
    }
    if (!width || !height) {
      return;
    }
    const insetTop = floor(top);
    const insetRight = floor(root.clientWidth - (left + width));
    const insetBottom = floor(root.clientHeight - (top + height));
    const insetLeft = floor(left);
    const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
    const options = {
      rootMargin,
      threshold: max(0, min(1, threshold)) || 1
    };
    let isFirstUpdate = true;
    function handleObserve(entries) {
      const ratio = entries[0].intersectionRatio;
      if (ratio !== threshold) {
        if (!isFirstUpdate) {
          return refresh();
        }
        if (!ratio) {
          timeoutId = setTimeout(() => {
            refresh(false, 1e-7);
          }, 100);
        } else {
          refresh(false, ratio);
        }
      }
      isFirstUpdate = false;
    }

    // Older browsers don't support a `document` as the root and will throw an
    // error.
    try {
      io = new IntersectionObserver(handleObserve, {
        ...options,
        // Handle <iframe>s
        root: root.ownerDocument
      });
    } catch (e) {
      io = new IntersectionObserver(handleObserve, options);
    }
    io.observe(element);
  }
  refresh(true);
  return cleanup;
}

/**
 * Automatically updates the position of the floating element when necessary.
 * Should only be called when the floating element is mounted on the DOM or
 * visible on the screen.
 * @returns cleanup function that should be invoked when the floating element is
 * removed from the DOM or hidden from the screen.
 * @see https://floating-ui.com/docs/autoUpdate
 */
function autoUpdate(reference, floating, update, options) {
  if (options === void 0) {
    options = {};
  }
  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = typeof ResizeObserver === 'function',
    layoutShift = typeof IntersectionObserver === 'function',
    animationFrame = false
  } = options;
  const referenceEl = unwrapElement(reference);
  const ancestors = ancestorScroll || ancestorResize ? [...(referenceEl ? getOverflowAncestors(referenceEl) : []), ...getOverflowAncestors(floating)] : [];
  ancestors.forEach(ancestor => {
    ancestorScroll && ancestor.addEventListener('scroll', update, {
      passive: true
    });
    ancestorResize && ancestor.addEventListener('resize', update);
  });
  const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update) : null;
  let reobserveFrame = -1;
  let resizeObserver = null;
  if (elementResize) {
    resizeObserver = new ResizeObserver(_ref => {
      let [firstEntry] = _ref;
      if (firstEntry && firstEntry.target === referenceEl && resizeObserver) {
        // Prevent update loops when using the `size` middleware.
        // https://github.com/floating-ui/floating-ui/issues/1740
        resizeObserver.unobserve(floating);
        cancelAnimationFrame(reobserveFrame);
        reobserveFrame = requestAnimationFrame(() => {
          var _resizeObserver;
          (_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
        });
      }
      update();
    });
    if (referenceEl && !animationFrame) {
      resizeObserver.observe(referenceEl);
    }
    resizeObserver.observe(floating);
  }
  let frameId;
  let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
  if (animationFrame) {
    frameLoop();
  }
  function frameLoop() {
    const nextRefRect = getBoundingClientRect(reference);
    if (prevRefRect && (nextRefRect.x !== prevRefRect.x || nextRefRect.y !== prevRefRect.y || nextRefRect.width !== prevRefRect.width || nextRefRect.height !== prevRefRect.height)) {
      update();
    }
    prevRefRect = nextRefRect;
    frameId = requestAnimationFrame(frameLoop);
  }
  update();
  return () => {
    var _resizeObserver2;
    ancestors.forEach(ancestor => {
      ancestorScroll && ancestor.removeEventListener('scroll', update);
      ancestorResize && ancestor.removeEventListener('resize', update);
    });
    cleanupIo == null || cleanupIo();
    (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
    resizeObserver = null;
    if (animationFrame) {
      cancelAnimationFrame(frameId);
    }
  };
}

/**
 * Optimizes the visibility of the floating element by shifting it in order to
 * keep it in view when it will overflow the clipping boundary.
 * @see https://floating-ui.com/docs/shift
 */
const shift = shift$1;

/**
 * Optimizes the visibility of the floating element by flipping the `placement`
 * in order to keep it in view when the preferred placement(s) will overflow the
 * clipping boundary. Alternative to `autoPlacement`.
 * @see https://floating-ui.com/docs/flip
 */
const flip = flip$1;

/**
 * Provides improved positioning for inline reference elements that can span
 * over multiple lines, such as hyperlinks or range selections.
 * @see https://floating-ui.com/docs/inline
 */
const inline = inline$1;

/**
 * Computes the `x` and `y` coordinates that will place the floating element
 * next to a given reference element.
 */
const computePosition = (reference, floating, options) => {
  // This caches the expensive `getClippingElementAncestors` function so that
  // multiple lifecycle resets re-use the same result. It only lives for a
  // single call. If other functions become expensive, we can add them as well.
  const cache = new Map();
  const mergedOptions = {
    platform,
    ...options
  };
  const platformWithCache = {
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition$1(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};

var index$1 = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

// Fork of `fast-deep-equal` that only does the comparisons we need and compares
// functions
function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a === 'function' && a.toString() === b.toString()) {
    return true;
  }
  let length;
  let i;
  let keys;
  if (a && b && typeof a === 'object') {
    if (Array.isArray(a)) {
      length = a.length;
      if (length !== b.length) return false;
      for (i = length; i-- !== 0;) {
        if (!deepEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) {
      return false;
    }
    for (i = length; i-- !== 0;) {
      if (!{}.hasOwnProperty.call(b, keys[i])) {
        return false;
      }
    }
    for (i = length; i-- !== 0;) {
      const key = keys[i];
      if (key === '_owner' && a.$$typeof) {
        continue;
      }
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }

  // biome-ignore lint/suspicious/noSelfCompare: in source
  return a !== a && b !== b;
}

function getDPR(element) {
  if (typeof window === 'undefined') {
    return 1;
  }
  const win = element.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}

function roundByDPR(element, value) {
  const dpr = getDPR(element);
  return Math.round(value * dpr) / dpr;
}

function useLatestRef$1(value) {
  const ref = React.useRef(value);
  index$1(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Provides data to position a floating element.
 * @see https://floating-ui.com/docs/useFloating
 */
function useFloating$1(options) {
  if (options === void 0) {
    options = {};
  }
  const {
    placement = 'bottom',
    strategy = 'absolute',
    middleware = [],
    platform,
    elements: {
      reference: externalReference,
      floating: externalFloating
    } = {},
    transform = true,
    whileElementsMounted,
    open
  } = options;
  const [data, setData] = React.useState({
    x: 0,
    y: 0,
    strategy,
    placement,
    middlewareData: {},
    isPositioned: false
  });
  const [latestMiddleware, setLatestMiddleware] = React.useState(middleware);
  if (!deepEqual(latestMiddleware, middleware)) {
    setLatestMiddleware(middleware);
  }
  const [_reference, _setReference] = React.useState(null);
  const [_floating, _setFloating] = React.useState(null);
  const setReference = React.useCallback(node => {
    if (node !== referenceRef.current) {
      referenceRef.current = node;
      _setReference(node);
    }
  }, []);
  const setFloating = React.useCallback(node => {
    if (node !== floatingRef.current) {
      floatingRef.current = node;
      _setFloating(node);
    }
  }, []);
  const referenceEl = externalReference || _reference;
  const floatingEl = externalFloating || _floating;
  const referenceRef = React.useRef(null);
  const floatingRef = React.useRef(null);
  const dataRef = React.useRef(data);
  const hasWhileElementsMounted = whileElementsMounted != null;
  const whileElementsMountedRef = useLatestRef$1(whileElementsMounted);
  const platformRef = useLatestRef$1(platform);
  const update = React.useCallback(() => {
    if (!referenceRef.current || !floatingRef.current) {
      return;
    }
    const config = {
      placement,
      strategy,
      middleware: latestMiddleware
    };
    if (platformRef.current) {
      config.platform = platformRef.current;
    }
    computePosition(referenceRef.current, floatingRef.current, config).then(data => {
      const fullData = {
        ...data,
        isPositioned: true
      };
      if (isMountedRef.current && !deepEqual(dataRef.current, fullData)) {
        dataRef.current = fullData;
        ReactDOM.flushSync(() => {
          setData(fullData);
        });
      }
    });
  }, [latestMiddleware, placement, strategy, platformRef]);
  index$1(() => {
    if (open === false && dataRef.current.isPositioned) {
      dataRef.current.isPositioned = false;
      setData(data => ({
        ...data,
        isPositioned: false
      }));
    }
  }, [open]);
  const isMountedRef = React.useRef(false);
  index$1(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `hasWhileElementsMounted` is intentionally included.
  index$1(() => {
    if (referenceEl) referenceRef.current = referenceEl;
    if (floatingEl) floatingRef.current = floatingEl;
    if (referenceEl && floatingEl) {
      if (whileElementsMountedRef.current) {
        return whileElementsMountedRef.current(referenceEl, floatingEl, update);
      }
      update();
    }
  }, [referenceEl, floatingEl, update, whileElementsMountedRef, hasWhileElementsMounted]);
  const refs = React.useMemo(() => ({
    reference: referenceRef,
    floating: floatingRef,
    setReference,
    setFloating
  }), [setReference, setFloating]);
  const elements = React.useMemo(() => ({
    reference: referenceEl,
    floating: floatingEl
  }), [referenceEl, floatingEl]);
  const floatingStyles = React.useMemo(() => {
    const initialStyles = {
      position: strategy,
      left: 0,
      top: 0
    };
    if (!elements.floating) {
      return initialStyles;
    }
    const x = roundByDPR(elements.floating, data.x);
    const y = roundByDPR(elements.floating, data.y);
    if (transform) {
      return {
        ...initialStyles,
        transform: "translate(" + x + "px, " + y + "px)",
        ...(getDPR(elements.floating) >= 1.5 && {
          willChange: 'transform'
        })
      };
    }
    return {
      position: strategy,
      left: x,
      top: y
    };
  }, [strategy, transform, elements.floating, data.x, data.y]);
  return React.useMemo(() => ({
    ...data,
    update,
    refs,
    elements,
    floatingStyles
  }), [data, update, refs, elements, floatingStyles]);
}

/*!
* tabbable 6.2.0
* @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
*/
// NOTE: separate `:not()` selectors has broader browser support than the newer
//  `:not([inert], [inert] *)` (Feb 2023)
// CAREFUL: JSDom does not support `:not([inert] *)` as a selector; using it causes
//  the entire query to fail, resulting in no nodes found, which will break a lot
//  of things... so we have to rely on JS to identify nodes inside an inert container
var candidateSelectors = ['input:not([inert])', 'select:not([inert])', 'textarea:not([inert])', 'a[href]:not([inert])', 'button:not([inert])', '[tabindex]:not(slot):not([inert])', 'audio[controls]:not([inert])', 'video[controls]:not([inert])', '[contenteditable]:not([contenteditable="false"]):not([inert])', 'details>summary:first-of-type:not([inert])', 'details:not([inert])'];
var candidateSelector = /* #__PURE__ */candidateSelectors.join(',');
var NoElement = typeof Element === 'undefined';
var matches = NoElement ? function () {} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
var getRootNode = !NoElement && Element.prototype.getRootNode ? function (element) {
  var _element$getRootNode;
  return element === null || element === void 0 ? void 0 : (_element$getRootNode = element.getRootNode) === null || _element$getRootNode === void 0 ? void 0 : _element$getRootNode.call(element);
} : function (element) {
  return element === null || element === void 0 ? void 0 : element.ownerDocument;
};

/**
 * Determines if a node is inert or in an inert ancestor.
 * @param {Element} [node]
 * @param {boolean} [lookUp] If true and `node` is not inert, looks up at ancestors to
 *  see if any of them are inert. If false, only `node` itself is considered.
 * @returns {boolean} True if inert itself or by way of being in an inert ancestor.
 *  False if `node` is falsy.
 */
var isInert = function isInert(node, lookUp) {
  var _node$getAttribute;
  if (lookUp === void 0) {
    lookUp = true;
  }
  // CAREFUL: JSDom does not support inert at all, so we can't use the `HTMLElement.inert`
  //  JS API property; we have to check the attribute, which can either be empty or 'true';
  //  if it's `null` (not specified) or 'false', it's an active element
  var inertAtt = node === null || node === void 0 ? void 0 : (_node$getAttribute = node.getAttribute) === null || _node$getAttribute === void 0 ? void 0 : _node$getAttribute.call(node, 'inert');
  var inert = inertAtt === '' || inertAtt === 'true';

  // NOTE: this could also be handled with `node.matches('[inert], :is([inert] *)')`
  //  if it weren't for `matches()` not being a function on shadow roots; the following
  //  code works for any kind of node
  // CAREFUL: JSDom does not appear to support certain selectors like `:not([inert] *)`
  //  so it likely would not support `:is([inert] *)` either...
  var result = inert || lookUp && node && isInert(node.parentNode); // recursive

  return result;
};

/**
 * Determines if a node's content is editable.
 * @param {Element} [node]
 * @returns True if it's content-editable; false if it's not or `node` is falsy.
 */
var isContentEditable = function isContentEditable(node) {
  var _node$getAttribute2;
  // CAREFUL: JSDom does not support the `HTMLElement.isContentEditable` API so we have
  //  to use the attribute directly to check for this, which can either be empty or 'true';
  //  if it's `null` (not specified) or 'false', it's a non-editable element
  var attValue = node === null || node === void 0 ? void 0 : (_node$getAttribute2 = node.getAttribute) === null || _node$getAttribute2 === void 0 ? void 0 : _node$getAttribute2.call(node, 'contenteditable');
  return attValue === '' || attValue === 'true';
};

/**
 * @param {Element} el container to check in
 * @param {boolean} includeContainer add container to check
 * @param {(node: Element) => boolean} filter filter candidates
 * @returns {Element[]}
 */
var getCandidates = function getCandidates(el, includeContainer, filter) {
  // even if `includeContainer=false`, we still have to check it for inertness because
  //  if it's inert, all its children are inert
  if (isInert(el)) {
    return [];
  }
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector));
  if (includeContainer && matches.call(el, candidateSelector)) {
    candidates.unshift(el);
  }
  candidates = candidates.filter(filter);
  return candidates;
};

/**
 * @callback GetShadowRoot
 * @param {Element} element to check for shadow root
 * @returns {ShadowRoot|boolean} ShadowRoot if available or boolean indicating if a shadowRoot is attached but not available.
 */

/**
 * @callback ShadowRootFilter
 * @param {Element} shadowHostNode the element which contains shadow content
 * @returns {boolean} true if a shadow root could potentially contain valid candidates.
 */

/**
 * @typedef {Object} CandidateScope
 * @property {Element} scopeParent contains inner candidates
 * @property {Element[]} candidates list of candidates found in the scope parent
 */

/**
 * @typedef {Object} IterativeOptions
 * @property {GetShadowRoot|boolean} getShadowRoot true if shadow support is enabled; falsy if not;
 *  if a function, implies shadow support is enabled and either returns the shadow root of an element
 *  or a boolean stating if it has an undisclosed shadow root
 * @property {(node: Element) => boolean} filter filter candidates
 * @property {boolean} flatten if true then result will flatten any CandidateScope into the returned list
 * @property {ShadowRootFilter} shadowRootFilter filter shadow roots;
 */

/**
 * @param {Element[]} elements list of element containers to match candidates from
 * @param {boolean} includeContainer add container list to check
 * @param {IterativeOptions} options
 * @returns {Array.<Element|CandidateScope>}
 */
var getCandidatesIteratively = function getCandidatesIteratively(elements, includeContainer, options) {
  var candidates = [];
  var elementsToCheck = Array.from(elements);
  while (elementsToCheck.length) {
    var element = elementsToCheck.shift();
    if (isInert(element, false)) {
      // no need to look up since we're drilling down
      // anything inside this container will also be inert
      continue;
    }
    if (element.tagName === 'SLOT') {
      // add shadow dom slot scope (slot itself cannot be focusable)
      var assigned = element.assignedElements();
      var content = assigned.length ? assigned : element.children;
      var nestedCandidates = getCandidatesIteratively(content, true, options);
      if (options.flatten) {
        candidates.push.apply(candidates, nestedCandidates);
      } else {
        candidates.push({
          scopeParent: element,
          candidates: nestedCandidates
        });
      }
    } else {
      // check candidate element
      var validCandidate = matches.call(element, candidateSelector);
      if (validCandidate && options.filter(element) && (includeContainer || !elements.includes(element))) {
        candidates.push(element);
      }

      // iterate over shadow content if possible
      var shadowRoot = element.shadowRoot ||
      // check for an undisclosed shadow
      typeof options.getShadowRoot === 'function' && options.getShadowRoot(element);

      // no inert look up because we're already drilling down and checking for inertness
      //  on the way down, so all containers to this root node should have already been
      //  vetted as non-inert
      var validShadowRoot = !isInert(shadowRoot, false) && (!options.shadowRootFilter || options.shadowRootFilter(element));
      if (shadowRoot && validShadowRoot) {
        // add shadow dom scope IIF a shadow root node was given; otherwise, an undisclosed
        //  shadow exists, so look at light dom children as fallback BUT create a scope for any
        //  child candidates found because they're likely slotted elements (elements that are
        //  children of the web component element (which has the shadow), in the light dom, but
        //  slotted somewhere _inside_ the undisclosed shadow) -- the scope is created below,
        //  _after_ we return from this recursive call
        var _nestedCandidates = getCandidatesIteratively(shadowRoot === true ? element.children : shadowRoot.children, true, options);
        if (options.flatten) {
          candidates.push.apply(candidates, _nestedCandidates);
        } else {
          candidates.push({
            scopeParent: element,
            candidates: _nestedCandidates
          });
        }
      } else {
        // there's not shadow so just dig into the element's (light dom) children
        //  __without__ giving the element special scope treatment
        elementsToCheck.unshift.apply(elementsToCheck, element.children);
      }
    }
  }
  return candidates;
};

/**
 * @private
 * Determines if the node has an explicitly specified `tabindex` attribute.
 * @param {HTMLElement} node
 * @returns {boolean} True if so; false if not.
 */
var hasTabIndex = function hasTabIndex(node) {
  return !isNaN(parseInt(node.getAttribute('tabindex'), 10));
};

/**
 * Determine the tab index of a given node.
 * @param {HTMLElement} node
 * @returns {number} Tab order (negative, 0, or positive number).
 * @throws {Error} If `node` is falsy.
 */
var getTabIndex = function getTabIndex(node) {
  if (!node) {
    throw new Error('No node provided');
  }
  if (node.tabIndex < 0) {
    // in Chrome, <details/>, <audio controls/> and <video controls/> elements get a default
    // `tabIndex` of -1 when the 'tabindex' attribute isn't specified in the DOM,
    // yet they are still part of the regular tab order; in FF, they get a default
    // `tabIndex` of 0; since Chrome still puts those elements in the regular tab
    // order, consider their tab index to be 0.
    // Also browsers do not return `tabIndex` correctly for contentEditable nodes;
    // so if they don't have a tabindex attribute specifically set, assume it's 0.
    if ((/^(AUDIO|VIDEO|DETAILS)$/.test(node.tagName) || isContentEditable(node)) && !hasTabIndex(node)) {
      return 0;
    }
  }
  return node.tabIndex;
};

/**
 * Determine the tab index of a given node __for sort order purposes__.
 * @param {HTMLElement} node
 * @param {boolean} [isScope] True for a custom element with shadow root or slot that, by default,
 *  has tabIndex -1, but needs to be sorted by document order in order for its content to be
 *  inserted into the correct sort position.
 * @returns {number} Tab order (negative, 0, or positive number).
 */
var getSortOrderTabIndex = function getSortOrderTabIndex(node, isScope) {
  var tabIndex = getTabIndex(node);
  if (tabIndex < 0 && isScope && !hasTabIndex(node)) {
    return 0;
  }
  return tabIndex;
};
var sortOrderedTabbables = function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};
var isInput = function isInput(node) {
  return node.tagName === 'INPUT';
};
var isHiddenInput = function isHiddenInput(node) {
  return isInput(node) && node.type === 'hidden';
};
var isDetailsWithSummary = function isDetailsWithSummary(node) {
  var r = node.tagName === 'DETAILS' && Array.prototype.slice.apply(node.children).some(function (child) {
    return child.tagName === 'SUMMARY';
  });
  return r;
};
var getCheckedRadio = function getCheckedRadio(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};
var isTabbableRadio = function isTabbableRadio(node) {
  if (!node.name) {
    return true;
  }
  var radioScope = node.form || getRootNode(node);
  var queryRadios = function queryRadios(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };
  var radioSet;
  if (typeof window !== 'undefined' && typeof window.CSS !== 'undefined' && typeof window.CSS.escape === 'function') {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s', err.message);
      return false;
    }
  }
  var checked = getCheckedRadio(radioSet, node.form);
  return !checked || checked === node;
};
var isRadio = function isRadio(node) {
  return isInput(node) && node.type === 'radio';
};
var isNonTabbableRadio = function isNonTabbableRadio(node) {
  return isRadio(node) && !isTabbableRadio(node);
};

// determines if a node is ultimately attached to the window's document
var isNodeAttached = function isNodeAttached(node) {
  var _nodeRoot;
  // The root node is the shadow root if the node is in a shadow DOM; some document otherwise
  //  (but NOT _the_ document; see second 'If' comment below for more).
  // If rootNode is shadow root, it'll have a host, which is the element to which the shadow
  //  is attached, and the one we need to check if it's in the document or not (because the
  //  shadow, and all nodes it contains, is never considered in the document since shadows
  //  behave like self-contained DOMs; but if the shadow's HOST, which is part of the document,
  //  is hidden, or is not in the document itself but is detached, it will affect the shadow's
  //  visibility, including all the nodes it contains). The host could be any normal node,
  //  or a custom element (i.e. web component). Either way, that's the one that is considered
  //  part of the document, not the shadow root, nor any of its children (i.e. the node being
  //  tested).
  // To further complicate things, we have to look all the way up until we find a shadow HOST
  //  that is attached (or find none) because the node might be in nested shadows...
  // If rootNode is not a shadow root, it won't have a host, and so rootNode should be the
  //  document (per the docs) and while it's a Document-type object, that document does not
  //  appear to be the same as the node's `ownerDocument` for some reason, so it's safer
  //  to ignore the rootNode at this point, and use `node.ownerDocument`. Otherwise,
  //  using `rootNode.contains(node)` will _always_ be true we'll get false-positives when
  //  node is actually detached.
  // NOTE: If `nodeRootHost` or `node` happens to be the `document` itself (which is possible
  //  if a tabbable/focusable node was quickly added to the DOM, focused, and then removed
  //  from the DOM as in https://github.com/focus-trap/focus-trap-react/issues/905), then
  //  `ownerDocument` will be `null`, hence the optional chaining on it.
  var nodeRoot = node && getRootNode(node);
  var nodeRootHost = (_nodeRoot = nodeRoot) === null || _nodeRoot === void 0 ? void 0 : _nodeRoot.host;

  // in some cases, a detached node will return itself as the root instead of a document or
  //  shadow root object, in which case, we shouldn't try to look further up the host chain
  var attached = false;
  if (nodeRoot && nodeRoot !== node) {
    var _nodeRootHost, _nodeRootHost$ownerDo, _node$ownerDocument;
    attached = !!((_nodeRootHost = nodeRootHost) !== null && _nodeRootHost !== void 0 && (_nodeRootHost$ownerDo = _nodeRootHost.ownerDocument) !== null && _nodeRootHost$ownerDo !== void 0 && _nodeRootHost$ownerDo.contains(nodeRootHost) || node !== null && node !== void 0 && (_node$ownerDocument = node.ownerDocument) !== null && _node$ownerDocument !== void 0 && _node$ownerDocument.contains(node));
    while (!attached && nodeRootHost) {
      var _nodeRoot2, _nodeRootHost2, _nodeRootHost2$ownerD;
      // since it's not attached and we have a root host, the node MUST be in a nested shadow DOM,
      //  which means we need to get the host's host and check if that parent host is contained
      //  in (i.e. attached to) the document
      nodeRoot = getRootNode(nodeRootHost);
      nodeRootHost = (_nodeRoot2 = nodeRoot) === null || _nodeRoot2 === void 0 ? void 0 : _nodeRoot2.host;
      attached = !!((_nodeRootHost2 = nodeRootHost) !== null && _nodeRootHost2 !== void 0 && (_nodeRootHost2$ownerD = _nodeRootHost2.ownerDocument) !== null && _nodeRootHost2$ownerD !== void 0 && _nodeRootHost2$ownerD.contains(nodeRootHost));
    }
  }
  return attached;
};
var isZeroArea = function isZeroArea(node) {
  var _node$getBoundingClie = node.getBoundingClientRect(),
    width = _node$getBoundingClie.width,
    height = _node$getBoundingClie.height;
  return width === 0 && height === 0;
};
var isHidden = function isHidden(node, _ref) {
  var displayCheck = _ref.displayCheck,
    getShadowRoot = _ref.getShadowRoot;
  // NOTE: visibility will be `undefined` if node is detached from the document
  //  (see notes about this further down), which means we will consider it visible
  //  (this is legacy behavior from a very long way back)
  // NOTE: we check this regardless of `displayCheck="none"` because this is a
  //  _visibility_ check, not a _display_ check
  if (getComputedStyle(node).visibility === 'hidden') {
    return true;
  }
  var isDirectSummary = matches.call(node, 'details>summary:first-of-type');
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;
  if (matches.call(nodeUnderDetails, 'details:not([open]) *')) {
    return true;
  }
  if (!displayCheck || displayCheck === 'full' || displayCheck === 'legacy-full') {
    if (typeof getShadowRoot === 'function') {
      // figure out if we should consider the node to be in an undisclosed shadow and use the
      //  'non-zero-area' fallback
      var originalNode = node;
      while (node) {
        var parentElement = node.parentElement;
        var rootNode = getRootNode(node);
        if (parentElement && !parentElement.shadowRoot && getShadowRoot(parentElement) === true // check if there's an undisclosed shadow
        ) {
          // node has an undisclosed shadow which means we can only treat it as a black box, so we
          //  fall back to a non-zero-area test
          return isZeroArea(node);
        } else if (node.assignedSlot) {
          // iterate up slot
          node = node.assignedSlot;
        } else if (!parentElement && rootNode !== node.ownerDocument) {
          // cross shadow boundary
          node = rootNode.host;
        } else {
          // iterate up normal dom
          node = parentElement;
        }
      }
      node = originalNode;
    }
    // else, `getShadowRoot` might be true, but all that does is enable shadow DOM support
    //  (i.e. it does not also presume that all nodes might have undisclosed shadows); or
    //  it might be a falsy value, which means shadow DOM support is disabled

    // Since we didn't find it sitting in an undisclosed shadow (or shadows are disabled)
    //  now we can just test to see if it would normally be visible or not, provided it's
    //  attached to the main document.
    // NOTE: We must consider case where node is inside a shadow DOM and given directly to
    //  `isTabbable()` or `isFocusable()` -- regardless of `getShadowRoot` option setting.

    if (isNodeAttached(node)) {
      // this works wherever the node is: if there's at least one client rect, it's
      //  somehow displayed; it also covers the CSS 'display: contents' case where the
      //  node itself is hidden in place of its contents; and there's no need to search
      //  up the hierarchy either
      return !node.getClientRects().length;
    }

    // Else, the node isn't attached to the document, which means the `getClientRects()`
    //  API will __always__ return zero rects (this can happen, for example, if React
    //  is used to render nodes onto a detached tree, as confirmed in this thread:
    //  https://github.com/facebook/react/issues/9117#issuecomment-284228870)
    //
    // It also means that even window.getComputedStyle(node).display will return `undefined`
    //  because styles are only computed for nodes that are in the document.
    //
    // NOTE: THIS HAS BEEN THE CASE FOR YEARS. It is not new, nor is it caused by tabbable
    //  somehow. Though it was never stated officially, anyone who has ever used tabbable
    //  APIs on nodes in detached containers has actually implicitly used tabbable in what
    //  was later (as of v5.2.0 on Apr 9, 2021) called `displayCheck="none"` mode -- essentially
    //  considering __everything__ to be visible because of the innability to determine styles.
    //
    // v6.0.0: As of this major release, the default 'full' option __no longer treats detached
    //  nodes as visible with the 'none' fallback.__
    if (displayCheck !== 'legacy-full') {
      return true; // hidden
    }
    // else, fallback to 'none' mode and consider the node visible
  } else if (displayCheck === 'non-zero-area') {
    // NOTE: Even though this tests that the node's client rect is non-zero to determine
    //  whether it's displayed, and that a detached node will __always__ have a zero-area
    //  client rect, we don't special-case for whether the node is attached or not. In
    //  this mode, we do want to consider nodes that have a zero area to be hidden at all
    //  times, and that includes attached or not.
    return isZeroArea(node);
  }

  // visible, as far as we can tell, or per current `displayCheck=none` mode, we assume
  //  it's visible
  return false;
};

// form fields (nested) inside a disabled fieldset are not focusable/tabbable
//  unless they are in the _first_ <legend> element of the top-most disabled
//  fieldset
var isDisabledFromFieldset = function isDisabledFromFieldset(node) {
  if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(node.tagName)) {
    var parentNode = node.parentElement;
    // check if `node` is contained in a disabled <fieldset>
    while (parentNode) {
      if (parentNode.tagName === 'FIELDSET' && parentNode.disabled) {
        // look for the first <legend> among the children of the disabled <fieldset>
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i);
          // when the first <legend> (in document order) is found
          if (child.tagName === 'LEGEND') {
            // if its parent <fieldset> is not nested in another disabled <fieldset>,
            // return whether `node` is a descendant of its first <legend>
            return matches.call(parentNode, 'fieldset[disabled] *') ? true : !child.contains(node);
          }
        }
        // the disabled <fieldset> containing `node` has no <legend>
        return true;
      }
      parentNode = parentNode.parentElement;
    }
  }

  // else, node's tabbable/focusable state should not be affected by a fieldset's
  //  enabled/disabled state
  return false;
};
var isNodeMatchingSelectorFocusable = function isNodeMatchingSelectorFocusable(options, node) {
  if (node.disabled ||
  // we must do an inert look up to filter out any elements inside an inert ancestor
  //  because we're limited in the type of selectors we can use in JSDom (see related
  //  note related to `candidateSelectors`)
  isInert(node) || isHiddenInput(node) || isHidden(node, options) ||
  // For a details element with a summary, the summary element gets the focus
  isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }
  return true;
};
var isNodeMatchingSelectorTabbable = function isNodeMatchingSelectorTabbable(options, node) {
  if (isNonTabbableRadio(node) || getTabIndex(node) < 0 || !isNodeMatchingSelectorFocusable(options, node)) {
    return false;
  }
  return true;
};
var isValidShadowRootTabbable = function isValidShadowRootTabbable(shadowHostNode) {
  var tabIndex = parseInt(shadowHostNode.getAttribute('tabindex'), 10);
  if (isNaN(tabIndex) || tabIndex >= 0) {
    return true;
  }
  // If a custom element has an explicit negative tabindex,
  // browsers will not allow tab targeting said element's children.
  return false;
};

/**
 * @param {Array.<Element|CandidateScope>} candidates
 * @returns Element[]
 */
var sortByOrder = function sortByOrder(candidates) {
  var regularTabbables = [];
  var orderedTabbables = [];
  candidates.forEach(function (item, i) {
    var isScope = !!item.scopeParent;
    var element = isScope ? item.scopeParent : item;
    var candidateTabindex = getSortOrderTabIndex(element, isScope);
    var elements = isScope ? sortByOrder(item.candidates) : element;
    if (candidateTabindex === 0) {
      isScope ? regularTabbables.push.apply(regularTabbables, elements) : regularTabbables.push(element);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        item: item,
        isScope: isScope,
        content: elements
      });
    }
  });
  return orderedTabbables.sort(sortOrderedTabbables).reduce(function (acc, sortable) {
    sortable.isScope ? acc.push.apply(acc, sortable.content) : acc.push(sortable.content);
    return acc;
  }, []).concat(regularTabbables);
};
var tabbable = function tabbable(container, options) {
  options = options || {};
  var candidates;
  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([container], options.includeContainer, {
      filter: isNodeMatchingSelectorTabbable.bind(null, options),
      flatten: false,
      getShadowRoot: options.getShadowRoot,
      shadowRootFilter: isValidShadowRootTabbable
    });
  } else {
    candidates = getCandidates(container, options.includeContainer, isNodeMatchingSelectorTabbable.bind(null, options));
  }
  return sortByOrder(candidates);
};

// `toString()` prevents bundlers from trying to `import { useInsertionEffect } from 'react'`
const useInsertionEffect = React[/*#__PURE__*/'useInsertionEffect'.toString()];
const useSafeInsertionEffect = useInsertionEffect || (fn => fn());
function useEffectEvent(callback) {
  const ref = React.useRef(() => {
    {
      throw new Error('Cannot call an event handler while rendering.');
    }
  });
  useSafeInsertionEffect(() => {
    ref.current = callback;
  });
  return React.useCallback(function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return ref.current == null ? void 0 : ref.current(...args);
  }, []);
}

var index = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

function _extends$3() {
  _extends$3 = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$3.apply(this, arguments);
}

let serverHandoffComplete = false;
let count = 0;
const genId = () => "floating-ui-" + count++;
function useFloatingId() {
  const [id, setId] = React.useState(() => serverHandoffComplete ? genId() : undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  index(() => {
    if (id == null) {
      setId(genId());
    }
  }, []);
  React.useEffect(() => {
    if (!serverHandoffComplete) {
      serverHandoffComplete = true;
    }
  }, []);
  return id;
}

// `toString()` prevents bundlers from trying to `import { useId } from 'react'`
const useReactId = React[/*#__PURE__*/'useId'.toString()];

/**
 * Uses React 18's built-in `useId()` when available, or falls back to a
 * slightly less performant (requiring a double render) implementation for
 * earlier React versions.
 * @see https://floating-ui.com/docs/react-utils#useid
 */
const useId = useReactId || useFloatingId;

function createPubSub() {
  const map = new Map();
  return {
    emit(event, data) {
      var _map$get;
      (_map$get = map.get(event)) == null || _map$get.forEach(handler => handler(data));
    },
    on(event, listener) {
      map.set(event, [...(map.get(event) || []), listener]);
    },
    off(event, listener) {
      var _map$get2;
      map.set(event, ((_map$get2 = map.get(event)) == null ? void 0 : _map$get2.filter(l => l !== listener)) || []);
    }
  };
}

const FloatingNodeContext = /*#__PURE__*/React.createContext(null);
const FloatingTreeContext = /*#__PURE__*/React.createContext(null);

/**
 * Returns the parent node id for nested floating elements, if available.
 * Returns `null` for top-level floating elements.
 */
const useFloatingParentNodeId = () => {
  var _React$useContext;
  return ((_React$useContext = React.useContext(FloatingNodeContext)) == null ? void 0 : _React$useContext.id) || null;
};

/**
 * Returns the nearest floating tree context, if available.
 */
const useFloatingTree = () => React.useContext(FloatingTreeContext);

function createAttribute(name) {
  return "data-floating-ui-" + name;
}

function useLatestRef(value) {
  const ref = useRef(value);
  index(() => {
    ref.current = value;
  });
  return ref;
}

const getTabbableOptions = () => ({
  getShadowRoot: true,
  displayCheck:
  // JSDOM does not support the `tabbable` library. To solve this we can
  // check if `ResizeObserver` is a real function (not polyfilled), which
  // determines if the current environment is JSDOM-like.
  typeof ResizeObserver === 'function' && ResizeObserver.toString().includes('[native code]') ? 'full' : 'none'
});
function getTabbableIn(container, direction) {
  const allTabbable = tabbable(container, getTabbableOptions());
  if (direction === 'prev') {
    allTabbable.reverse();
  }
  const activeIndex = allTabbable.indexOf(activeElement(getDocument(container)));
  const nextTabbableElements = allTabbable.slice(activeIndex + 1);
  return nextTabbableElements[0];
}
function getNextTabbable() {
  return getTabbableIn(document.body, 'next');
}
function getPreviousTabbable() {
  return getTabbableIn(document.body, 'prev');
}
function isOutsideEvent(event, container) {
  const containerElement = container || event.currentTarget;
  const relatedTarget = event.relatedTarget;
  return !relatedTarget || !contains(containerElement, relatedTarget);
}
function disableFocusInside(container) {
  const tabbableElements = tabbable(container, getTabbableOptions());
  tabbableElements.forEach(element => {
    element.dataset.tabindex = element.getAttribute('tabindex') || '';
    element.setAttribute('tabindex', '-1');
  });
}
function enableFocusInside(container) {
  const elements = container.querySelectorAll('[data-tabindex]');
  elements.forEach(element => {
    const tabindex = element.dataset.tabindex;
    // biome-ignore lint/performance/noDelete: purity
    delete element.dataset.tabindex;
    if (tabindex) {
      element.setAttribute('tabindex', tabindex);
    } else {
      element.removeAttribute('tabindex');
    }
  });
}

// See Diego Haz's Sandbox for making this logic work well on Safari/iOS:
// https://codesandbox.io/s/tabbable-portal-f4tng?file=/src/FocusTrap.tsx

const HIDDEN_STYLES = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'fixed',
  whiteSpace: 'nowrap',
  width: '1px',
  top: 0,
  left: 0
};
let timeoutId;
function setActiveElementOnTab(event) {
  if (event.key === 'Tab') {
    event.target;
    clearTimeout(timeoutId);
  }
}
const FocusGuard = /*#__PURE__*/React.forwardRef(function FocusGuard(props, ref) {
  const [role, setRole] = React.useState();
  index(() => {
    if (isSafari()) {
      // Unlike other screen readers such as NVDA and JAWS, the virtual cursor
      // on VoiceOver does trigger the onFocus event, so we can use the focus
      // trap element. On Safari, only buttons trigger the onFocus event.
      // NB: "group" role in the Sandbox no longer appears to work, must be a
      // button role.
      setRole('button');
    }
    document.addEventListener('keydown', setActiveElementOnTab);
    return () => {
      document.removeEventListener('keydown', setActiveElementOnTab);
    };
  }, []);
  const restProps = {
    ref,
    tabIndex: 0,
    // Role is only for VoiceOver
    role,
    'aria-hidden': role ? undefined : true,
    [createAttribute('focus-guard')]: '',
    style: HIDDEN_STYLES
  };
  return /*#__PURE__*/React.createElement("span", _extends$3({}, props, restProps));
});

const PortalContext = /*#__PURE__*/React.createContext(null);
const attr = /*#__PURE__*/createAttribute('portal');

/**
 * @see https://floating-ui.com/docs/FloatingPortal#usefloatingportalnode
 */
function useFloatingPortalNode(_temp) {
  let {
    id,
    root
  } = _temp === void 0 ? {} : _temp;
  const [portalNode, setPortalNode] = React.useState(null);
  const uniqueId = useId();
  const portalContext = usePortalContext();
  const portalNodeRef = React.useRef(null);
  index(() => {
    return () => {
      portalNode == null || portalNode.remove();
      // Allow the subsequent layout effects to create a new node on updates.
      // The portal node will still be cleaned up on unmount.
      // https://github.com/floating-ui/floating-ui/issues/2454
      queueMicrotask(() => {
        portalNodeRef.current = null;
      });
    };
  }, [portalNode]);
  index(() => {
    if (portalNodeRef.current) return;
    const existingIdRoot = id ? document.getElementById(id) : null;
    if (!existingIdRoot) return;
    const subRoot = document.createElement('div');
    subRoot.id = uniqueId;
    subRoot.setAttribute(attr, '');
    existingIdRoot.appendChild(subRoot);
    portalNodeRef.current = subRoot;
    setPortalNode(subRoot);
  }, [id, uniqueId]);
  index(() => {
    if (portalNodeRef.current) return;
    let container = root || (portalContext == null ? void 0 : portalContext.portalNode);
    if (container && !isElement(container)) container = container.current;
    container = container || document.body;
    let idWrapper = null;
    if (id) {
      idWrapper = document.createElement('div');
      idWrapper.id = id;
      container.appendChild(idWrapper);
    }
    const subRoot = document.createElement('div');
    subRoot.id = uniqueId;
    subRoot.setAttribute(attr, '');
    container = idWrapper || container;
    container.appendChild(subRoot);
    portalNodeRef.current = subRoot;
    setPortalNode(subRoot);
  }, [id, root, uniqueId, portalContext]);
  return portalNode;
}
/**
 * Portals the floating element into a given container element — by default,
 * outside of the app root and into the body.
 * This is necessary to ensure the floating element can appear outside any
 * potential parent containers that cause clipping (such as `overflow: hidden`),
 * while retaining its location in the React tree.
 * @see https://floating-ui.com/docs/FloatingPortal
 */
function FloatingPortal(_ref) {
  let {
    children,
    id,
    root = null,
    preserveTabOrder = true
  } = _ref;
  const portalNode = useFloatingPortalNode({
    id,
    root
  });
  const [focusManagerState, setFocusManagerState] = React.useState(null);
  const beforeOutsideRef = React.useRef(null);
  const afterOutsideRef = React.useRef(null);
  const beforeInsideRef = React.useRef(null);
  const afterInsideRef = React.useRef(null);
  const shouldRenderGuards =
  // The FocusManager and therefore floating element are currently open/
  // rendered.
  !!focusManagerState &&
  // Guards are only for non-modal focus management.
  !focusManagerState.modal &&
  // Don't render if unmount is transitioning.
  focusManagerState.open && preserveTabOrder && !!(root || portalNode);

  // https://codesandbox.io/s/tabbable-portal-f4tng?file=/src/TabbablePortal.tsx
  React.useEffect(() => {
    if (!portalNode || !preserveTabOrder || focusManagerState != null && focusManagerState.modal) {
      return;
    }

    // Make sure elements inside the portal element are tabbable only when the
    // portal has already been focused, either by tabbing into a focus trap
    // element outside or using the mouse.
    function onFocus(event) {
      if (portalNode && isOutsideEvent(event)) {
        const focusing = event.type === 'focusin';
        const manageFocus = focusing ? enableFocusInside : disableFocusInside;
        manageFocus(portalNode);
      }
    }
    // Listen to the event on the capture phase so they run before the focus
    // trap elements onFocus prop is called.
    portalNode.addEventListener('focusin', onFocus, true);
    portalNode.addEventListener('focusout', onFocus, true);
    return () => {
      portalNode.removeEventListener('focusin', onFocus, true);
      portalNode.removeEventListener('focusout', onFocus, true);
    };
  }, [portalNode, preserveTabOrder, focusManagerState == null ? void 0 : focusManagerState.modal]);
  return /*#__PURE__*/React.createElement(PortalContext.Provider, {
    value: React.useMemo(() => ({
      preserveTabOrder,
      beforeOutsideRef,
      afterOutsideRef,
      beforeInsideRef,
      afterInsideRef,
      portalNode,
      setFocusManagerState
    }), [preserveTabOrder, portalNode])
  }, shouldRenderGuards && portalNode && /*#__PURE__*/React.createElement(FocusGuard, {
    "data-type": "outside",
    ref: beforeOutsideRef,
    onFocus: event => {
      if (isOutsideEvent(event, portalNode)) {
        var _beforeInsideRef$curr;
        (_beforeInsideRef$curr = beforeInsideRef.current) == null || _beforeInsideRef$curr.focus();
      } else {
        const prevTabbable = getPreviousTabbable() || (focusManagerState == null ? void 0 : focusManagerState.refs.domReference.current);
        prevTabbable == null || prevTabbable.focus();
      }
    }
  }), shouldRenderGuards && portalNode && /*#__PURE__*/React.createElement("span", {
    "aria-owns": portalNode.id,
    style: HIDDEN_STYLES
  }), portalNode && /*#__PURE__*/createPortal(children, portalNode), shouldRenderGuards && portalNode && /*#__PURE__*/React.createElement(FocusGuard, {
    "data-type": "outside",
    ref: afterOutsideRef,
    onFocus: event => {
      if (isOutsideEvent(event, portalNode)) {
        var _afterInsideRef$curre;
        (_afterInsideRef$curre = afterInsideRef.current) == null || _afterInsideRef$curre.focus();
      } else {
        const nextTabbable = getNextTabbable() || (focusManagerState == null ? void 0 : focusManagerState.refs.domReference.current);
        nextTabbable == null || nextTabbable.focus();
        (focusManagerState == null ? void 0 : focusManagerState.closeOnFocusOut) && (focusManagerState == null ? void 0 : focusManagerState.onOpenChange(false, event.nativeEvent));
      }
    }
  }));
}
const usePortalContext = () => React.useContext(PortalContext);

const activeLocks = /*#__PURE__*/new Set();
/**
 * Provides base styling for a fixed overlay element to dim content or block
 * pointer events behind a floating element.
 * It's a regular `<div>`, so it can be styled via any CSS solution you prefer.
 * @see https://floating-ui.com/docs/FloatingOverlay
 */
const FloatingOverlay = /*#__PURE__*/React.forwardRef(function FloatingOverlay(_ref, ref) {
  let {
    lockScroll = false,
    ...rest
  } = _ref;
  const lockId = useId();
  index(() => {
    if (!lockScroll) return;
    activeLocks.add(lockId);
    const isIOS = /iP(hone|ad|od)|iOS/.test(getPlatform());
    const bodyStyle = document.body.style;
    // RTL <body> scrollbar
    const scrollbarX = Math.round(document.documentElement.getBoundingClientRect().left) + document.documentElement.scrollLeft;
    const paddingProp = scrollbarX ? 'paddingLeft' : 'paddingRight';
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const scrollX = bodyStyle.left ? parseFloat(bodyStyle.left) : window.pageXOffset;
    const scrollY = bodyStyle.top ? parseFloat(bodyStyle.top) : window.pageYOffset;
    bodyStyle.overflow = 'hidden';
    if (scrollbarWidth) {
      bodyStyle[paddingProp] = scrollbarWidth + "px";
    }

    // Only iOS doesn't respect `overflow: hidden` on document.body, and this
    // technique has fewer side effects.
    if (isIOS) {
      var _window$visualViewpor, _window$visualViewpor2;
      // iOS 12 does not support `visualViewport`.
      const offsetLeft = ((_window$visualViewpor = window.visualViewport) == null ? void 0 : _window$visualViewpor.offsetLeft) || 0;
      const offsetTop = ((_window$visualViewpor2 = window.visualViewport) == null ? void 0 : _window$visualViewpor2.offsetTop) || 0;
      Object.assign(bodyStyle, {
        position: 'fixed',
        top: -(scrollY - Math.floor(offsetTop)) + "px",
        left: -(scrollX - Math.floor(offsetLeft)) + "px",
        right: '0'
      });
    }
    return () => {
      activeLocks.delete(lockId);
      if (activeLocks.size === 0) {
        Object.assign(bodyStyle, {
          overflow: '',
          [paddingProp]: ''
        });
        if (isIOS) {
          Object.assign(bodyStyle, {
            position: '',
            top: '',
            left: '',
            right: ''
          });
          window.scrollTo(scrollX, scrollY);
        }
      }
    };
  }, [lockId, lockScroll]);
  return /*#__PURE__*/React.createElement("div", _extends$3({
    ref: ref
  }, rest, {
    style: {
      position: 'fixed',
      overflow: 'auto',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      ...rest.style
    }
  }));
});

let devMessageSet;
{
  devMessageSet = /*#__PURE__*/new Set();
}

/**
 * Provides data to position a floating element and context to add interactions.
 * @see https://floating-ui.com/docs/useFloating
 */
function useFloating(options) {
  var _options$elements2;
  if (options === void 0) {
    options = {};
  }
  const {
    open = false,
    onOpenChange: unstable_onOpenChange,
    nodeId
  } = options;
  {
    var _options$elements;
    const err = 'Floating UI: Cannot pass a virtual element to the ' + '`elements.reference` option, as it must be a real DOM element. ' + 'Use `refs.setPositionReference` instead.';
    if ((_options$elements = options.elements) != null && _options$elements.reference && !isElement(options.elements.reference)) {
      var _devMessageSet;
      if (!((_devMessageSet = devMessageSet) != null && _devMessageSet.has(err))) {
        var _devMessageSet2;
        (_devMessageSet2 = devMessageSet) == null || _devMessageSet2.add(err);
        console.error(err);
      }
    }
  }
  const [_domReference, setDomReference] = React.useState(null);
  const domReference = ((_options$elements2 = options.elements) == null ? void 0 : _options$elements2.reference) || _domReference;
  const position = useFloating$1(options);
  const tree = useFloatingTree();
  const nested = useFloatingParentNodeId() != null;
  const onOpenChange = useEffectEvent((open, event, reason) => {
    if (open) {
      dataRef.current.openEvent = event;
    }
    events.emit('openchange', {
      open,
      event,
      reason,
      nested
    });
    unstable_onOpenChange == null || unstable_onOpenChange(open, event, reason);
  });
  const domReferenceRef = React.useRef(null);
  const dataRef = React.useRef({});
  const events = React.useState(() => createPubSub())[0];
  const floatingId = useId();
  const setPositionReference = React.useCallback(node => {
    const positionReference = isElement(node) ? {
      getBoundingClientRect: () => node.getBoundingClientRect(),
      contextElement: node
    } : node;
    position.refs.setReference(positionReference);
  }, [position.refs]);
  const setReference = React.useCallback(node => {
    if (isElement(node) || node === null) {
      domReferenceRef.current = node;
      setDomReference(node);
    }

    // Backwards-compatibility for passing a virtual element to `reference`
    // after it has set the DOM reference.
    if (isElement(position.refs.reference.current) || position.refs.reference.current === null ||
    // Don't allow setting virtual elements using the old technique back to
    // `null` to support `positionReference` + an unstable `reference`
    // callback ref.
    node !== null && !isElement(node)) {
      position.refs.setReference(node);
    }
  }, [position.refs]);
  const refs = React.useMemo(() => ({
    ...position.refs,
    setReference,
    setPositionReference,
    domReference: domReferenceRef
  }), [position.refs, setReference, setPositionReference]);
  const elements = React.useMemo(() => ({
    ...position.elements,
    domReference: domReference
  }), [position.elements, domReference]);
  const context = React.useMemo(() => ({
    ...position,
    refs,
    elements,
    dataRef,
    nodeId,
    floatingId,
    events,
    open,
    onOpenChange
  }), [position, nodeId, floatingId, events, open, onOpenChange, refs, elements]);
  index(() => {
    const node = tree == null ? void 0 : tree.nodesRef.current.find(node => node.id === nodeId);
    if (node) {
      node.context = context;
    }
  });
  return React.useMemo(() => ({
    ...position,
    context,
    refs,
    elements
  }), [position, refs, elements, context]);
}

// Converts a JS style key like `backgroundColor` to a CSS transition-property
// like `background-color`.
const camelCaseToKebabCase = str => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
function execWithArgsOrReturn(valueOrFn, args) {
  return typeof valueOrFn === 'function' ? valueOrFn(args) : valueOrFn;
}
function useDelayUnmount(open, durationMs) {
  const [isMounted, setIsMounted] = React.useState(open);
  if (open && !isMounted) {
    setIsMounted(true);
  }
  React.useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => setIsMounted(false), durationMs);
      return () => clearTimeout(timeout);
    }
  }, [open, durationMs]);
  return isMounted;
}
/**
 * Provides a status string to apply CSS transitions to a floating element,
 * correctly handling placement-aware transitions.
 * @see https://floating-ui.com/docs/useTransition#usetransitionstatus
 */
function useTransitionStatus(context, props) {
  if (props === void 0) {
    props = {};
  }
  const {
    open,
    elements: {
      floating
    }
  } = context;
  const {
    duration = 250
  } = props;
  const isNumberDuration = typeof duration === 'number';
  const closeDuration = (isNumberDuration ? duration : duration.close) || 0;
  const [initiated, setInitiated] = React.useState(false);
  const [status, setStatus] = React.useState('unmounted');
  const isMounted = useDelayUnmount(open, closeDuration);

  // `initiated` check prevents this `setState` call from breaking
  // <FloatingPortal />. This call is necessary to ensure subsequent opens
  // after the initial one allows the correct side animation to play when the
  // placement has changed.
  index(() => {
    if (initiated && !isMounted) {
      setStatus('unmounted');
    }
  }, [initiated, isMounted]);
  index(() => {
    if (!floating) return;
    if (open) {
      setStatus('initial');
      const frame = requestAnimationFrame(() => {
        setStatus('open');
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
    setInitiated(true);
    setStatus('close');
  }, [open, floating]);
  return {
    isMounted,
    status
  };
}
/**
 * Provides styles to apply CSS transitions to a floating element, correctly
 * handling placement-aware transitions. Wrapper around `useTransitionStatus`.
 * @see https://floating-ui.com/docs/useTransition#usetransitionstyles
 */
function useTransitionStyles(context, props) {
  if (props === void 0) {
    props = {};
  }
  const {
    initial: unstable_initial = {
      opacity: 0
    },
    open: unstable_open,
    close: unstable_close,
    common: unstable_common,
    duration = 250
  } = props;
  const placement = context.placement;
  const side = placement.split('-')[0];
  const fnArgs = React.useMemo(() => ({
    side,
    placement
  }), [side, placement]);
  const isNumberDuration = typeof duration === 'number';
  const openDuration = (isNumberDuration ? duration : duration.open) || 0;
  const closeDuration = (isNumberDuration ? duration : duration.close) || 0;
  const [styles, setStyles] = React.useState(() => ({
    ...execWithArgsOrReturn(unstable_common, fnArgs),
    ...execWithArgsOrReturn(unstable_initial, fnArgs)
  }));
  const {
    isMounted,
    status
  } = useTransitionStatus(context, {
    duration
  });
  const initialRef = useLatestRef(unstable_initial);
  const openRef = useLatestRef(unstable_open);
  const closeRef = useLatestRef(unstable_close);
  const commonRef = useLatestRef(unstable_common);
  index(() => {
    const initialStyles = execWithArgsOrReturn(initialRef.current, fnArgs);
    const closeStyles = execWithArgsOrReturn(closeRef.current, fnArgs);
    const commonStyles = execWithArgsOrReturn(commonRef.current, fnArgs);
    const openStyles = execWithArgsOrReturn(openRef.current, fnArgs) || Object.keys(initialStyles).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {});
    if (status === 'initial') {
      setStyles(styles => ({
        transitionProperty: styles.transitionProperty,
        ...commonStyles,
        ...initialStyles
      }));
    }
    if (status === 'open') {
      setStyles({
        transitionProperty: Object.keys(openStyles).map(camelCaseToKebabCase).join(','),
        transitionDuration: openDuration + "ms",
        ...commonStyles,
        ...openStyles
      });
    }
    if (status === 'close') {
      const styles = closeStyles || initialStyles;
      setStyles({
        transitionProperty: Object.keys(styles).map(camelCaseToKebabCase).join(','),
        transitionDuration: closeDuration + "ms",
        ...commonStyles,
        ...styles
      });
    }
  }, [closeDuration, closeRef, initialRef, openRef, commonRef, openDuration, status, fnArgs]);
  return {
    isMounted,
    styles
  };
}

function buildActionMenuRenderProps({ editor, view, onClose, mode = 'toggle' }) {
    function filterToggleActions(editor, type) {
        var _a;
        const block = editor.blocks[type];
        if (!block)
            return false;
        const rootBlock = getRootBlockElement(block.elements);
        if (((_a = rootBlock === null || rootBlock === void 0 ? void 0 : rootBlock.props) === null || _a === void 0 ? void 0 : _a.nodeType) === 'void')
            return false;
        return true;
    }
    const getActions = () => {
        let items = Object.keys(editor.blocks);
        if (mode === 'toggle') {
            items = items.filter((type) => filterToggleActions(editor, type));
        }
        return items.map((action) => {
            var _a, _b, _c, _d, _e, _f;
            const title = ((_b = (_a = editor.blocks[action].options) === null || _a === void 0 ? void 0 : _a.display) === null || _b === void 0 ? void 0 : _b.title) || action;
            const description = (_d = (_c = editor.blocks[action].options) === null || _c === void 0 ? void 0 : _c.display) === null || _d === void 0 ? void 0 : _d.description;
            const icon = (_f = (_e = editor.blocks[action].options) === null || _e === void 0 ? void 0 : _e.display) === null || _f === void 0 ? void 0 : _f.icon;
            return { type: action, title, description, icon };
        });
    };
    const getRootProps = () => ({
        'data-action-menu-list': true,
    });
    const getItemProps = (type) => ({
        onMouseEnter: () => undefined,
        'data-action-menu-item': true,
        'data-action-menu-item-type': type,
        'aria-selected': false,
        onClick: () => {
            // [TEST]
            editor.toggleBlock(type, { deleteText: mode === 'toggle', focus: true });
            onClose();
        },
    });
    return {
        actions: getActions(),
        onClose,
        empty: false,
        getItemProps,
        getRootProps,
        editor,
        view,
    };
}

const useActionMenuToolRefs = ({ editor }) => {
    const tools = useYooptaTools();
    const ActionMenu = tools.ActionMenu;
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const { refs: actionMenuRefs, floatingStyles: actionMenuFloatingStyles, context: actionMenuContext, } = useFloating({
        placement: 'bottom-start',
        open: isActionMenuOpen,
        onOpenChange: setIsActionMenuOpen,
        middleware: [inline(), flip(), shift(), offset(10)],
        whileElementsMounted: autoUpdate,
    });
    const { isMounted: isMountedActionMenu, styles: actionMenuTransitionStyles } = useTransitionStyles(actionMenuContext, { duration: 100 });
    const actionMenuStyles = Object.assign(Object.assign({}, actionMenuFloatingStyles), actionMenuTransitionStyles);
    const onChangeActionMenuOpen = (state) => setIsActionMenuOpen(state);
    const onCloseActionMenu = () => onChangeActionMenuOpen(false);
    const actionMenuRenderProps = buildActionMenuRenderProps({
        editor,
        view: 'default',
        mode: 'create',
        onClose: onCloseActionMenu,
    });
    return {
        isActionMenuOpen: isMountedActionMenu,
        actionMenuStyles,
        actionMenuRefs,
        hasActionMenu: !!ActionMenu,
        onChangeActionMenuOpen,
        actionMenuRenderProps,
        onCloseActionMenu,
        ActionMenu,
    };
};
const useBlockStyles = (block, transform, transition, isDragging, isOver) => {
    return useMemo(() => ({
        container: {
            marginLeft: `${block.meta.depth * 20}px`,
            transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : 'none',
            transition,
            opacity: isDragging ? 0.7 : 1,
        },
        content: isOver && !isDragging ? { borderBottom: '2px solid #007aff' } : undefined,
    }), [block.meta.depth, transform, transition, isDragging, isOver]);
};
const useBlockOptionsRefs = () => {
    const [isBlockOptionsOpen, setIsBlockOptionsOpen] = useState(false);
    const { refs: blockOptionsRefs, floatingStyles: blockOptionsStyles, context: blockOptionsContext, } = useFloating({
        placement: 'right-start',
        open: isBlockOptionsOpen,
        onOpenChange: setIsBlockOptionsOpen,
        middleware: [inline(), flip(), shift(), offset()],
    });
    const { isMounted: isBlockOptionsMounted, styles: blockOptionsTransitionStyles } = useTransitionStyles(blockOptionsContext, {
        duration: 100,
    });
    const blockOptionsFloatingStyle = Object.assign(Object.assign({}, blockOptionsStyles), blockOptionsTransitionStyles);
    return {
        blockOptionsRefs,
        blockOptionsFloatingStyle,
        isBlockOptionsOpen,
        setIsBlockOptionsOpen,
        isBlockOptionsMounted,
    };
};

const Block = memo(({ children, block, blockId, onActiveDragHandleChange }) => {
    const editor = useYooptaEditor();
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isOver, isDragging } = useSortable({ id: blockId, disabled: editor.readOnly });
    const styles = useBlockStyles(block, transform, transition, isDragging, isOver);
    const align = block.meta.align || 'left';
    const className = `yoopta-block yoopta-align-${align}`;
    const isSelected = Paths.isBlockSelected(editor, block);
    const handleMouseEnter = () => {
        if (!editor.readOnly && onActiveDragHandleChange) {
            onActiveDragHandleChange({
                attributes,
                listeners,
                setActivatorNodeRef,
            });
        }
    };
    return (jsxs("div", Object.assign({ ref: setNodeRef, className: className, style: styles.container, "data-yoopta-block": true, "data-yoopta-block-id": blockId, onMouseEnter: handleMouseEnter }, { children: [jsx("div", Object.assign({ style: styles.content }, { children: children })), !editor.readOnly && jsx("div", { "data-block-selected": isSelected, className: "yoopta-selection-block" })] })));
});
Block.displayName = 'Block';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var lib = {};

Object.defineProperty(lib, "__esModule", {
  value: true
});

/**
 * Constants.
 */

var IS_MAC = typeof window != 'undefined' && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

var MODIFIERS = {
  alt: 'altKey',
  control: 'ctrlKey',
  meta: 'metaKey',
  shift: 'shiftKey'
};

var ALIASES = {
  add: '+',
  break: 'pause',
  cmd: 'meta',
  command: 'meta',
  ctl: 'control',
  ctrl: 'control',
  del: 'delete',
  down: 'arrowdown',
  esc: 'escape',
  ins: 'insert',
  left: 'arrowleft',
  mod: IS_MAC ? 'meta' : 'control',
  opt: 'alt',
  option: 'alt',
  return: 'enter',
  right: 'arrowright',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  win: 'meta',
  windows: 'meta'
};

var CODES = {
  backspace: 8,
  tab: 9,
  enter: 13,
  shift: 16,
  control: 17,
  alt: 18,
  pause: 19,
  capslock: 20,
  escape: 27,
  ' ': 32,
  pageup: 33,
  pagedown: 34,
  end: 35,
  home: 36,
  arrowleft: 37,
  arrowup: 38,
  arrowright: 39,
  arrowdown: 40,
  insert: 45,
  delete: 46,
  meta: 91,
  numlock: 144,
  scrolllock: 145,
  ';': 186,
  '=': 187,
  ',': 188,
  '-': 189,
  '.': 190,
  '/': 191,
  '`': 192,
  '[': 219,
  '\\': 220,
  ']': 221,
  '\'': 222
};

for (var f = 1; f < 20; f++) {
  CODES['f' + f] = 111 + f;
}

/**
 * Is hotkey?
 */

function isHotkey(hotkey, options, event) {
  if (options && !('byKey' in options)) {
    event = options;
    options = null;
  }

  if (!Array.isArray(hotkey)) {
    hotkey = [hotkey];
  }

  var array = hotkey.map(function (string) {
    return parseHotkey(string, options);
  });
  var check = function check(e) {
    return array.some(function (object) {
      return compareHotkey(object, e);
    });
  };
  var ret = event == null ? check : check(event);
  return ret;
}

function isCodeHotkey(hotkey, event) {
  return isHotkey(hotkey, event);
}

function isKeyHotkey(hotkey, event) {
  return isHotkey(hotkey, { byKey: true }, event);
}

/**
 * Parse.
 */

function parseHotkey(hotkey, options) {
  var byKey = options && options.byKey;
  var ret = {};

  // Special case to handle the `+` key since we use it as a separator.
  hotkey = hotkey.replace('++', '+add');
  var values = hotkey.split('+');
  var length = values.length;

  // Ensure that all the modifiers are set to false unless the hotkey has them.

  for (var k in MODIFIERS) {
    ret[MODIFIERS[k]] = false;
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = values[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var value = _step.value;

      var optional = value.endsWith('?') && value.length > 1;

      if (optional) {
        value = value.slice(0, -1);
      }

      var name = toKeyName(value);
      var modifier = MODIFIERS[name];

      if (value.length > 1 && !modifier && !ALIASES[value] && !CODES[name]) {
        throw new TypeError('Unknown modifier: "' + value + '"');
      }

      if (length === 1 || !modifier) {
        if (byKey) {
          ret.key = name;
        } else {
          ret.which = toKeyCode(value);
        }
      }

      if (modifier) {
        ret[modifier] = optional ? null : true;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return ret;
}

/**
 * Compare.
 */

function compareHotkey(object, event) {
  for (var key in object) {
    var expected = object[key];
    var actual = void 0;

    if (expected == null) {
      continue;
    }

    if (key === 'key' && event.key != null) {
      actual = event.key.toLowerCase();
    } else if (key === 'which') {
      actual = expected === 91 && event.which === 93 ? 91 : event.which;
    } else {
      actual = event[key];
    }

    if (actual == null && expected === false) {
      continue;
    }

    if (actual !== expected) {
      return false;
    }
  }

  return true;
}

/**
 * Utils.
 */

function toKeyCode(name) {
  name = toKeyName(name);
  var code = CODES[name] || name.toUpperCase().charCodeAt(0);
  return code;
}

function toKeyName(name) {
  name = name.toLowerCase();
  name = ALIASES[name] || name;
  return name;
}

/**
 * Export.
 */

lib.default = isHotkey;
lib.isHotkey = isHotkey;
lib.isCodeHotkey = isCodeHotkey;
var isKeyHotkey_1 = lib.isKeyHotkey = isKeyHotkey;
lib.parseHotkey = parseHotkey;
lib.compareHotkey = compareHotkey;
lib.toKeyCode = toKeyCode;
lib.toKeyName = toKeyName;

const HOTKEYS_MAP = {
    bold: 'mod+b',
    italic: 'mod+i',
    compose: ['down', 'left', 'right', 'up', 'backspace', 'enter'],
    arrowLeft: 'left',
    arrowUp: 'up',
    arrowDown: 'down',
    arrowRight: 'right',
    ctrlLeft: 'ctrl+left',
    escape: 'esc',
    ctrlRight: 'ctrl+right',
    deleteBackward: 'shift?+backspace',
    backspace: 'backspace',
    deleteForward: 'shift?+delete',
    extendBackward: 'shift+left',
    shiftDelete: 'shift+delete',
    extendForward: 'shift+right',
    shiftEnter: 'shift+enter',
    enter: 'enter',
    space: 'space',
    undo: 'mod+z',
    select: 'mod+a',
    shiftTab: 'shift+tab',
    shiftArrowUp: 'shift+up',
    shiftArrowDown: 'shift+down',
    tab: 'tab',
    cmd: 'mod',
    cmdEnter: 'mod+enter',
    cmdShiftEnter: 'mod+shift+enter',
    slashCommand: '/',
    copy: 'mod+c',
    cut: 'mod+x',
    cmdShiftRight: 'mod+shift+right',
    cmdShiftLeft: 'mod+shift+left',
    cmdShiftDelete: 'mod+shift+backspace',
    cmdShiftD: 'mod+shift+d',
    cmdAltDelete: 'mod+alt+backspace',
};
const APPLE_HOTKEYS = {
    moveLineBackward: 'opt+up',
    moveLineForward: 'opt+down',
    ctrlLeft: 'opt+left',
    ctrlRight: 'opt+right',
    deleteBackward: ['ctrl+backspace', 'ctrl+h'],
    deleteForward: ['ctrl+delete', 'ctrl+d'],
    deleteLineBackward: 'cmd+shift?+backspace',
    deleteLineForward: ['cmd+shift?+delete', 'ctrl+k'],
    deleteWordBackward: 'opt+shift?+backspace',
    deleteWordForward: 'opt+shift?+delete',
    extendLineBackward: 'opt+shift+up',
    extendLineForward: 'opt+shift+down',
    redo: 'cmd+shift+z',
    transposeCharacter: 'ctrl+t',
};
const WINDOWS_HOTKEYS = {
    deleteWordBackward: 'ctrl+shift?+backspace',
    deleteWordForward: 'ctrl+shift?+delete',
    redo: ['ctrl+y', 'ctrl+shift+z'],
};
const create = (key) => {
    const generic = HOTKEYS_MAP[key];
    const apple = APPLE_HOTKEYS[key];
    const windows = WINDOWS_HOTKEYS[key];
    const isGeneric = generic && isKeyHotkey_1(generic);
    const isApple = apple && isKeyHotkey_1(apple);
    const isWindows = windows && isKeyHotkey_1(windows);
    return (event) => {
        if (isGeneric && isGeneric(event))
            return true;
        if (isApple && isApple(event))
            return true;
        if (isWindows && isWindows(event))
            return true;
        return false;
    };
};
const HOTKEYS = {
    isBold: create('bold'),
    isCompose: create('compose'),
    isArrowLeft: create('arrowLeft'),
    isArrowRight: create('arrowRight'),
    isArrowUp: create('arrowUp'),
    isArrowDown: create('arrowDown'),
    isDeleteBackward: create('deleteBackward'),
    isDeleteForward: create('deleteForward'),
    isDeleteLineBackward: create('deleteLineBackward'),
    isDeleteLineForward: create('deleteLineForward'),
    isDeleteWordBackward: create('deleteWordBackward'),
    isDeleteWordForward: create('deleteWordForward'),
    isExtendBackward: create('extendBackward'),
    isExtendForward: create('extendForward'),
    isExtendLineBackward: create('extendLineBackward'),
    isExtendLineForward: create('extendLineForward'),
    isItalic: create('italic'),
    isMoveLineBackward: create('moveLineBackward'),
    isMoveLineForward: create('moveLineForward'),
    isCtrlLeft: create('ctrlLeft'),
    isCtrlRight: create('ctrlRight'),
    isRedo: create('redo'),
    isShiftEnter: create('shiftEnter'),
    isEnter: create('enter'),
    isTransposeCharacter: create('transposeCharacter'),
    isUndo: create('undo'),
    isSpace: create('space'),
    isSelect: create('select'),
    isTab: create('tab'),
    isShiftTab: create('shiftTab'),
    isBackspace: create('backspace'),
    isCmdEnter: create('cmdEnter'),
    isCmd: create('cmd'),
    isEscape: create('escape'),
    isSlashCommand: create('slashCommand'),
    isShiftArrowUp: create('shiftArrowUp'),
    isShiftArrowDown: create('shiftArrowDown'),
    isCopy: create('copy'),
    isCut: create('cut'),
    isShiftDelete: create('shiftDelete'),
    isCmdShiftEnter: create('cmdShiftEnter'),
    isCmdShiftRight: create('cmdShiftRight'),
    isCmdShiftLeft: create('cmdShiftLeft'),
    isCmdShiftDelete: create('cmdShiftDelete'),
    isCmdAltDelete: create('cmdAltDelete'),
    isCmdShiftD: create('cmdShiftD'),
};

function getNextNodePoint(slate, path) {
    try {
        const [, firstNodePath] = Editor$1.first(slate, path);
        return {
            path: firstNodePath,
            offset: 0,
        };
    }
    catch (error) {
        return {
            path: [0, 0],
            offset: 0,
        };
    }
}
/** */
function onKeyDown(editor) {
    return (event) => {
        const slate = findSlateBySelectionPath(editor, { at: editor.path.current });
        if (HOTKEYS.isShiftEnter(event)) {
            if (event.isDefaultPrevented())
                return;
            if (!slate || !slate.selection)
                return;
            event.preventDefault();
            slate.insertText('\n');
            return;
        }
        if (HOTKEYS.isUndo(event)) {
            event.preventDefault();
            return;
        }
        if (HOTKEYS.isRedo(event)) {
            event.preventDefault();
            return;
        }
        if (HOTKEYS.isEnter(event)) {
            if (event.isDefaultPrevented())
                return;
            if (!slate || !slate.selection)
                return;
            event.preventDefault();
            const first = Editor$1.first(slate, []);
            const last = Editor$1.last(slate, []);
            const isStart = Editor$1.isStart(slate, slate.selection.anchor, first[1]);
            const isEnd = Editor$1.isEnd(slate, slate.selection.anchor, last[1]);
            if (Range.isExpanded(slate.selection)) {
                Transforms.delete(slate, { at: slate.selection });
            }
            // when the cursor is in the middle of the block
            if (!isStart && !isEnd) {
                // [TEST]
                editor.splitBlock({ slate, focus: true });
                return;
            }
            const currentBlock = Blocks.getBlock(editor, { at: editor.path.current });
            const defaultBlock = Blocks.buildBlockData({ id: generateId() });
            const string = Editor$1.string(slate, []);
            const insertBefore = isStart && string.length > 0;
            const nextPath = Paths.getNextPath(editor);
            // [TEST]
            editor.batchOperations(() => {
                // [TEST]
                editor.insertBlock(defaultBlock.type, {
                    at: insertBefore ? editor.path.current : nextPath,
                    focus: !insertBefore,
                });
                // [TEST]
                if (insertBefore && currentBlock) {
                    editor.focusBlock(currentBlock.id);
                }
            });
            return;
        }
        if (HOTKEYS.isBackspace(event)) {
            if (event.isDefaultPrevented())
                return;
            if (!slate || !slate.selection)
                return;
            const parentPath = Path.parent(slate.selection.anchor.path);
            const isStart = Editor$1.isStart(slate, slate.selection.anchor, parentPath);
            // When the cursor is at the start of the block, delete the block
            if (isStart) {
                event.preventDefault();
                const text = Editor$1.string(slate, parentPath);
                // If current block is empty just delete block
                if (text.trim().length === 0) {
                    // [TEST]
                    editor.deleteBlock({ at: editor.path.current, focus: true });
                    return;
                }
                // If current block is not empty merge text nodes with previous block
                else {
                    if (Range.isExpanded(slate.selection)) {
                        return Transforms.delete(slate, { at: slate.selection });
                    }
                    const prevBlock = Blocks.getBlock(editor, { at: Paths.getPreviousPath(editor) });
                    const prevSlate = Blocks.getBlockSlate(editor, { id: prevBlock === null || prevBlock === void 0 ? void 0 : prevBlock.id });
                    if (prevBlock && prevSlate) {
                        const { node: lastSlateNode } = getLastNode(prevSlate);
                        const prevSlateText = Node$1.string(lastSlateNode);
                        if (prevSlateText.trim().length === 0) {
                            // [TEST]
                            editor.deleteBlock({ blockId: prevBlock.id, focus: false });
                            editor.setPath({ current: prevBlock.meta.order });
                            return;
                        }
                    }
                    // [TEST]
                    editor.mergeBlock();
                }
            }
            return;
        }
        if (HOTKEYS.isSelect(event)) {
            if (event.isDefaultPrevented())
                return;
            if (!slate || !slate.selection)
                return;
            const [, firstElementPath] = Editor$1.first(slate, [0]);
            const [, lastElementPath] = Editor$1.last(slate, [slate.children.length - 1]);
            const fullRange = Editor$1.range(slate, firstElementPath, lastElementPath);
            const isAllBlockElementsSelected = Range.equals(slate.selection, fullRange);
            const string = Editor$1.string(slate, fullRange);
            const isElementEmpty = string.trim().length === 0;
            // [TODO] - handle cases for void node elements
            if ((Range.isExpanded(slate.selection) && isAllBlockElementsSelected) || isElementEmpty) {
                event.preventDefault();
                ReactEditor.blur(slate);
                ReactEditor.deselect(slate);
                Transforms.deselect(slate);
                const allBlockPaths = Array.from({ length: Object.keys(editor.children).length }, (_, i) => i);
                editor.setPath({ current: null, selected: allBlockPaths });
                return;
            }
        }
        if (HOTKEYS.isShiftTab(event)) {
            if (event.isDefaultPrevented())
                return;
            event.preventDefault();
            const selectedPaths = editor.path.selected;
            if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
                editor.batchOperations(() => {
                    selectedPaths.forEach((index) => {
                        const block = Blocks.getBlock(editor, { at: index });
                        if (block && block.meta.depth > 0) {
                            editor.decreaseBlockDepth({ at: index });
                        }
                    });
                });
                return;
            }
            editor.decreaseBlockDepth();
            return;
        }
        if (HOTKEYS.isTab(event)) {
            if (event.isDefaultPrevented())
                return;
            event.preventDefault();
            const selectedPaths = editor.path.selected;
            if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
                editor.batchOperations(() => {
                    selectedPaths.forEach((index) => {
                        editor.increaseBlockDepth({ at: index });
                    });
                });
                return;
            }
            editor.increaseBlockDepth();
            return;
        }
        // [TODO] - default behavior for complex plugins
        if (HOTKEYS.isArrowUp(event)) {
            if (event.isDefaultPrevented())
                return;
            if (!slate || !slate.selection)
                return;
            // If element with any paths has all paths at 0
            const isAllPathsInStart = new Set(slate.selection.anchor.path).size === 1;
            if (isAllPathsInStart) {
                const prevPath = Paths.getPreviousPath(editor);
                const prevSlate = findSlateBySelectionPath(editor, { at: prevPath });
                const prevBlock = findPluginBlockByPath(editor, { at: prevPath });
                const prevBlockEntity = editor.blocks[(prevBlock === null || prevBlock === void 0 ? void 0 : prevBlock.type) || ''];
                if (prevSlate && prevBlock && !(prevBlockEntity === null || prevBlockEntity === void 0 ? void 0 : prevBlockEntity.hasCustomEditor)) {
                    const [, prevLastPath] = Editor$1.last(prevSlate, [0]);
                    const prevLastNodeTextLength = Editor$1.string(prevSlate, prevLastPath).length;
                    const selection = {
                        path: prevLastPath,
                        offset: prevLastNodeTextLength,
                    };
                    event.preventDefault();
                    editor.focusBlock(prevBlock.id, {
                        focusAt: selection,
                        waitExecution: false,
                        shouldUpdateBlockPath: true,
                    });
                    return;
                }
            }
        }
        // [TODO] - default behavior for complex plugins
        if (HOTKEYS.isArrowDown(event)) {
            if (event.isDefaultPrevented())
                return;
            if (!slate || !slate.selection)
                return;
            const parentPath = Path.parent(slate.selection.anchor.path);
            const isEnd = Editor$1.isEnd(slate, slate.selection.anchor, parentPath);
            if (isEnd) {
                const nextPath = Paths.getNextPath(editor);
                const nextSlate = findSlateBySelectionPath(editor, { at: nextPath });
                const nextBlock = findPluginBlockByPath(editor, { at: nextPath });
                const nextBlockEntity = editor.blocks[(nextBlock === null || nextBlock === void 0 ? void 0 : nextBlock.type) || ''];
                if (nextSlate && nextBlock && !(nextBlockEntity === null || nextBlockEntity === void 0 ? void 0 : nextBlockEntity.hasCustomEditor)) {
                    // [TODO] - should parent path, but for next slate
                    const selection = getNextNodePoint(nextSlate, parentPath);
                    event.preventDefault();
                    editor.focusBlock(nextBlock.id, { focusAt: selection, waitExecution: false });
                    return;
                }
            }
        }
        if (slate && slate.selection) {
            if (Range.isExpanded(slate.selection)) {
                const marks = Object.values(editor.formats);
                if (marks.length > 0) {
                    for (const mark of Object.values(editor.formats)) {
                        if (mark.hotkey && isKeyHotkey_1(mark.hotkey)(event)) {
                            event.preventDefault();
                            editor.formats[mark.type].toggle();
                            break;
                        }
                    }
                }
            }
        }
    };
}

const EVENT_HANDLERS = {
    onKeyDown,
};

const TextLeaf = ({ children, attributes, placeholder }) => {
    const selected = useSelected();
    const attrs = Object.assign({}, attributes);
    if (selected && placeholder) {
        attrs['data-placeholder'] = placeholder;
        attrs.className = `yoopta-placeholder`;
    }
    return jsx("span", Object.assign({}, attrs, { children: children }));
};

function isYooptaBlock(block) {
    return !!block && !!block.id && !!block.type && !!block.value && !!block.meta;
}

const MARKS_NODE_NAME_MATCHERS_MAP = {
    B: { type: 'bold' },
    STRONG: { type: 'bold' },
    I: { type: 'italic' },
    U: { type: 'underline' },
    S: { type: 'strike' },
    CODE: { type: 'code' },
    EM: { type: 'italic' },
    MARK: { type: 'highlight', parse: (el) => ({ color: el.style.color }) },
};
const VALID_TEXT_ALIGNS = ['left', 'center', 'right', undefined];
function getMappedPluginByNodeNames(editor) {
    const PLUGINS_NODE_NAME_MATCHERS_MAP = {};
    Object.keys(editor.plugins).forEach((pluginType) => {
        const plugin = editor.plugins[pluginType];
        const { parsers } = plugin;
        if (parsers) {
            const { html } = parsers;
            if (html) {
                const { deserialize } = html;
                if (deserialize) {
                    const { nodeNames } = deserialize;
                    if (nodeNames) {
                        nodeNames.forEach((nodeName) => {
                            const nodeNameMap = PLUGINS_NODE_NAME_MATCHERS_MAP[nodeName];
                            if (nodeNameMap) {
                                const nodeNameItem = Array.isArray(nodeNameMap) ? nodeNameMap : [nodeNameMap];
                                PLUGINS_NODE_NAME_MATCHERS_MAP[nodeName] = [
                                    ...nodeNameItem,
                                    { type: pluginType, parse: deserialize.parse },
                                ];
                            }
                            else {
                                PLUGINS_NODE_NAME_MATCHERS_MAP[nodeName] = {
                                    type: pluginType,
                                    parse: deserialize.parse,
                                };
                            }
                        });
                    }
                }
            }
        }
    });
    return PLUGINS_NODE_NAME_MATCHERS_MAP;
}
function buildBlock(editor, plugin, el, children) {
    var _a, _b;
    let nodeElementOrBlocks;
    if (plugin.parse) {
        nodeElementOrBlocks = plugin.parse(el, editor);
        const isInline = Element$1.isElement(nodeElementOrBlocks) && ((_a = nodeElementOrBlocks.props) === null || _a === void 0 ? void 0 : _a.nodeType) === 'inline';
        if (isInline)
            return nodeElementOrBlocks;
    }
    const block = editor.blocks[plugin.type];
    const rootElementType = getRootBlockElementType(block.elements) || '';
    const rootElement = block.elements[rootElementType];
    const isVoid = ((_b = rootElement.props) === null || _b === void 0 ? void 0 : _b.nodeType) === 'void';
    let rootNode = {
        id: generateId(),
        type: rootElementType,
        children: isVoid && !block.hasCustomEditor ? [{ text: '' }] : children.map(mapNodeChildren).flat(),
        props: Object.assign({ nodeType: 'block' }, rootElement.props),
    };
    if (nodeElementOrBlocks) {
        if (Element$1.isElement(nodeElementOrBlocks)) {
            rootNode = nodeElementOrBlocks;
        }
        else if (Array.isArray(nodeElementOrBlocks)) {
            const blocks = nodeElementOrBlocks;
            return blocks;
        }
    }
    if (rootNode.children.length === 0) {
        rootNode.children = [{ text: '' }];
    }
    if (!nodeElementOrBlocks && plugin.parse)
        return;
    const align = el.getAttribute('data-meta-align');
    const depth = parseInt(el.getAttribute('data-meta-depth') || '0', 10);
    const blockData = Blocks.buildBlockData({
        id: generateId(),
        type: plugin.type,
        value: [rootNode],
        meta: {
            order: 0,
            depth: depth,
            align: VALID_TEXT_ALIGNS.includes(align) ? align : undefined,
        },
    });
    return blockData;
}
function deserialize(editor, pluginsMap, el) {
    var _a;
    if (el.nodeType === 3) {
        const text = (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.replace(/[\t\n\r\f\v]+/g, ' ');
        return { text };
    }
    else if (el.nodeType !== 1) {
        return null;
    }
    else if (el.nodeName === 'BR') {
        return { text: '\n' };
    }
    const parent = el;
    let children = Array.from(parent.childNodes)
        .map((node) => deserialize(editor, pluginsMap, node))
        .flat()
        .filter(Boolean);
    if (MARKS_NODE_NAME_MATCHERS_MAP[parent.nodeName]) {
        const mark = MARKS_NODE_NAME_MATCHERS_MAP[parent.nodeName];
        const markType = mark.type;
        return children.map((child) => {
            if (typeof child === 'string') {
                return { [markType]: mark.parse ? mark.parse(parent) : true, text: child };
            }
            else if (child.text) {
                return Object.assign(Object.assign({}, child), { [markType]: mark.parse ? mark.parse(parent) : true });
            }
            return child;
        });
    }
    const plugin = pluginsMap[parent.nodeName];
    if (plugin) {
        if (Array.isArray(plugin)) {
            const blocks = plugin.map((p) => buildBlock(editor, p, parent, children)).filter(Boolean);
            return blocks;
        }
        return buildBlock(editor, plugin, parent, children);
    }
    return children;
}
function mapNodeChildren(child) {
    if (typeof child === 'string') {
        return { text: child };
    }
    if (Element$1.isElement(child)) {
        return child;
    }
    if (Array.isArray(child)) {
        return child.map(mapNodeChildren).flat();
    }
    if (child === null || child === void 0 ? void 0 : child.text) {
        return child;
    }
    if (isYooptaBlock(child)) {
        const block = child;
        return block.value[0].children.map(mapNodeChildren).flat();
    }
    return { text: '' };
}
function deserializeHTML(editor, html) {
    console.log('pasted html', html);
    const PLUGINS_NODE_NAME_MATCHERS_MAP = getMappedPluginByNodeNames(editor);
    const blocks = deserialize(editor, PLUGINS_NODE_NAME_MATCHERS_MAP, html)
        .flat()
        .filter(isYooptaBlock);
    return blocks;
}

var isURLExports = {};
var isURL$1 = {
  get exports(){ return isURLExports; },
  set exports(v){ isURLExports = v; },
};

var assertStringExports = {};
var assertString = {
  get exports(){ return assertStringExports; },
  set exports(v){ assertStringExports = v; },
};

(function (module, exports) {

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = assertString;
	function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
	function assertString(input) {
	  var isString = typeof input === 'string' || input instanceof String;
	  if (!isString) {
	    var invalidType = _typeof(input);
	    if (input === null) invalidType = 'null';else if (invalidType === 'object') invalidType = input.constructor.name;
	    throw new TypeError("Expected a string but received a ".concat(invalidType));
	  }
	}
	module.exports = exports.default;
	module.exports.default = exports.default;
} (assertString, assertStringExports));

var isFQDNExports = {};
var isFQDN = {
  get exports(){ return isFQDNExports; },
  set exports(v){ isFQDNExports = v; },
};

var mergeExports = {};
var merge = {
  get exports(){ return mergeExports; },
  set exports(v){ mergeExports = v; },
};

(function (module, exports) {

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = merge;
	function merge() {
	  var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	  var defaults = arguments.length > 1 ? arguments[1] : undefined;
	  for (var key in defaults) {
	    if (typeof obj[key] === 'undefined') {
	      obj[key] = defaults[key];
	    }
	  }
	  return obj;
	}
	module.exports = exports.default;
	module.exports.default = exports.default;
} (merge, mergeExports));

(function (module, exports) {

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = isFQDN;
	var _assertString = _interopRequireDefault(assertStringExports);
	var _merge = _interopRequireDefault(mergeExports);
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	var default_fqdn_options = {
	  require_tld: true,
	  allow_underscores: false,
	  allow_trailing_dot: false,
	  allow_numeric_tld: false,
	  allow_wildcard: false,
	  ignore_max_length: false
	};
	function isFQDN(str, options) {
	  (0, _assertString.default)(str);
	  options = (0, _merge.default)(options, default_fqdn_options);

	  /* Remove the optional trailing dot before checking validity */
	  if (options.allow_trailing_dot && str[str.length - 1] === '.') {
	    str = str.substring(0, str.length - 1);
	  }

	  /* Remove the optional wildcard before checking validity */
	  if (options.allow_wildcard === true && str.indexOf('*.') === 0) {
	    str = str.substring(2);
	  }
	  var parts = str.split('.');
	  var tld = parts[parts.length - 1];
	  if (options.require_tld) {
	    // disallow fqdns without tld
	    if (parts.length < 2) {
	      return false;
	    }
	    if (!options.allow_numeric_tld && !/^([a-z\u00A1-\u00A8\u00AA-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}|xn[a-z0-9-]{2,})$/i.test(tld)) {
	      return false;
	    }

	    // disallow spaces
	    if (/\s/.test(tld)) {
	      return false;
	    }
	  }

	  // reject numeric TLDs
	  if (!options.allow_numeric_tld && /^\d+$/.test(tld)) {
	    return false;
	  }
	  return parts.every(function (part) {
	    if (part.length > 63 && !options.ignore_max_length) {
	      return false;
	    }
	    if (!/^[a-z_\u00a1-\uffff0-9-]+$/i.test(part)) {
	      return false;
	    }

	    // disallow full-width chars
	    if (/[\uff01-\uff5e]/.test(part)) {
	      return false;
	    }

	    // disallow parts starting or ending with hyphen
	    if (/^-|-$/.test(part)) {
	      return false;
	    }
	    if (!options.allow_underscores && /_/.test(part)) {
	      return false;
	    }
	    return true;
	  });
	}
	module.exports = exports.default;
	module.exports.default = exports.default;
} (isFQDN, isFQDNExports));

var isIPExports = {};
var isIP = {
  get exports(){ return isIPExports; },
  set exports(v){ isIPExports = v; },
};

(function (module, exports) {

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = isIP;
	var _assertString = _interopRequireDefault(assertStringExports);
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	/**
	11.3.  Examples

	   The following addresses

	             fe80::1234 (on the 1st link of the node)
	             ff02::5678 (on the 5th link of the node)
	             ff08::9abc (on the 10th organization of the node)

	   would be represented as follows:

	             fe80::1234%1
	             ff02::5678%5
	             ff08::9abc%10

	   (Here we assume a natural translation from a zone index to the
	   <zone_id> part, where the Nth zone of any scope is translated into
	   "N".)

	   If we use interface names as <zone_id>, those addresses could also be
	   represented as follows:

	            fe80::1234%ne0
	            ff02::5678%pvc1.3
	            ff08::9abc%interface10

	   where the interface "ne0" belongs to the 1st link, "pvc1.3" belongs
	   to the 5th link, and "interface10" belongs to the 10th organization.
	 * * */
	var IPv4SegmentFormat = '(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])';
	var IPv4AddressFormat = "(".concat(IPv4SegmentFormat, "[.]){3}").concat(IPv4SegmentFormat);
	var IPv4AddressRegExp = new RegExp("^".concat(IPv4AddressFormat, "$"));
	var IPv6SegmentFormat = '(?:[0-9a-fA-F]{1,4})';
	var IPv6AddressRegExp = new RegExp('^(' + "(?:".concat(IPv6SegmentFormat, ":){7}(?:").concat(IPv6SegmentFormat, "|:)|") + "(?:".concat(IPv6SegmentFormat, ":){6}(?:").concat(IPv4AddressFormat, "|:").concat(IPv6SegmentFormat, "|:)|") + "(?:".concat(IPv6SegmentFormat, ":){5}(?::").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,2}|:)|") + "(?:".concat(IPv6SegmentFormat, ":){4}(?:(:").concat(IPv6SegmentFormat, "){0,1}:").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,3}|:)|") + "(?:".concat(IPv6SegmentFormat, ":){3}(?:(:").concat(IPv6SegmentFormat, "){0,2}:").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,4}|:)|") + "(?:".concat(IPv6SegmentFormat, ":){2}(?:(:").concat(IPv6SegmentFormat, "){0,3}:").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,5}|:)|") + "(?:".concat(IPv6SegmentFormat, ":){1}(?:(:").concat(IPv6SegmentFormat, "){0,4}:").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,6}|:)|") + "(?::((?::".concat(IPv6SegmentFormat, "){0,5}:").concat(IPv4AddressFormat, "|(?::").concat(IPv6SegmentFormat, "){1,7}|:))") + ')(%[0-9a-zA-Z-.:]{1,})?$');
	function isIP(str) {
	  var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
	  (0, _assertString.default)(str);
	  version = String(version);
	  if (!version) {
	    return isIP(str, 4) || isIP(str, 6);
	  }
	  if (version === '4') {
	    return IPv4AddressRegExp.test(str);
	  }
	  if (version === '6') {
	    return IPv6AddressRegExp.test(str);
	  }
	  return false;
	}
	module.exports = exports.default;
	module.exports.default = exports.default;
} (isIP, isIPExports));

(function (module, exports) {

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = isURL;
	var _assertString = _interopRequireDefault(assertStringExports);
	var _isFQDN = _interopRequireDefault(isFQDNExports);
	var _isIP = _interopRequireDefault(isIPExports);
	var _merge = _interopRequireDefault(mergeExports);
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
	function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
	function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
	function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
	function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
	/*
	options for isURL method

	require_protocol - if set as true isURL will return false if protocol is not present in the URL
	require_valid_protocol - isURL will check if the URL's protocol is present in the protocols option
	protocols - valid protocols can be modified with this option
	require_host - if set as false isURL will not check if host is present in the URL
	require_port - if set as true isURL will check if port is present in the URL
	allow_protocol_relative_urls - if set as true protocol relative URLs will be allowed
	validate_length - if set as false isURL will skip string length validation (IE maximum is 2083)

	*/

	var default_url_options = {
	  protocols: ['http', 'https', 'ftp'],
	  require_tld: true,
	  require_protocol: false,
	  require_host: true,
	  require_port: false,
	  require_valid_protocol: true,
	  allow_underscores: false,
	  allow_trailing_dot: false,
	  allow_protocol_relative_urls: false,
	  allow_fragments: true,
	  allow_query_components: true,
	  validate_length: true
	};
	var wrapped_ipv6 = /^\[([^\]]+)\](?::([0-9]+))?$/;
	function isRegExp(obj) {
	  return Object.prototype.toString.call(obj) === '[object RegExp]';
	}
	function checkHost(host, matches) {
	  for (var i = 0; i < matches.length; i++) {
	    var match = matches[i];
	    if (host === match || isRegExp(match) && match.test(host)) {
	      return true;
	    }
	  }
	  return false;
	}
	function isURL(url, options) {
	  (0, _assertString.default)(url);
	  if (!url || /[\s<>]/.test(url)) {
	    return false;
	  }
	  if (url.indexOf('mailto:') === 0) {
	    return false;
	  }
	  options = (0, _merge.default)(options, default_url_options);
	  if (options.validate_length && url.length >= 2083) {
	    return false;
	  }
	  if (!options.allow_fragments && url.includes('#')) {
	    return false;
	  }
	  if (!options.allow_query_components && (url.includes('?') || url.includes('&'))) {
	    return false;
	  }
	  var protocol, auth, host, hostname, port, port_str, split, ipv6;
	  split = url.split('#');
	  url = split.shift();
	  split = url.split('?');
	  url = split.shift();
	  split = url.split('://');
	  if (split.length > 1) {
	    protocol = split.shift().toLowerCase();
	    if (options.require_valid_protocol && options.protocols.indexOf(protocol) === -1) {
	      return false;
	    }
	  } else if (options.require_protocol) {
	    return false;
	  } else if (url.slice(0, 2) === '//') {
	    if (!options.allow_protocol_relative_urls) {
	      return false;
	    }
	    split[0] = url.slice(2);
	  }
	  url = split.join('://');
	  if (url === '') {
	    return false;
	  }
	  split = url.split('/');
	  url = split.shift();
	  if (url === '' && !options.require_host) {
	    return true;
	  }
	  split = url.split('@');
	  if (split.length > 1) {
	    if (options.disallow_auth) {
	      return false;
	    }
	    if (split[0] === '') {
	      return false;
	    }
	    auth = split.shift();
	    if (auth.indexOf(':') >= 0 && auth.split(':').length > 2) {
	      return false;
	    }
	    var _auth$split = auth.split(':'),
	      _auth$split2 = _slicedToArray(_auth$split, 2),
	      user = _auth$split2[0],
	      password = _auth$split2[1];
	    if (user === '' && password === '') {
	      return false;
	    }
	  }
	  hostname = split.join('@');
	  port_str = null;
	  ipv6 = null;
	  var ipv6_match = hostname.match(wrapped_ipv6);
	  if (ipv6_match) {
	    host = '';
	    ipv6 = ipv6_match[1];
	    port_str = ipv6_match[2] || null;
	  } else {
	    split = hostname.split(':');
	    host = split.shift();
	    if (split.length) {
	      port_str = split.join(':');
	    }
	  }
	  if (port_str !== null && port_str.length > 0) {
	    port = parseInt(port_str, 10);
	    if (!/^[0-9]+$/.test(port_str) || port <= 0 || port > 65535) {
	      return false;
	    }
	  } else if (options.require_port) {
	    return false;
	  }
	  if (options.host_whitelist) {
	    return checkHost(host, options.host_whitelist);
	  }
	  if (host === '' && !options.require_host) {
	    return true;
	  }
	  if (!(0, _isIP.default)(host) && !(0, _isFQDN.default)(host, options) && (!ipv6 || !(0, _isIP.default)(ipv6, 6))) {
	    return false;
	  }
	  host = host || ipv6;
	  if (options.host_blacklist && checkHost(host, options.host_blacklist)) {
	    return false;
	  }
	  return true;
	}
	module.exports = exports.default;
	module.exports.default = exports.default;
} (isURL$1, isURLExports));

var isURL = /*@__PURE__*/getDefaultExportFromCjs(isURLExports);

function isUrl(string) {
    if (!string || string.length > 2048)
        return false;
    return isURL(string, {
        protocols: ['http', 'https'],
        require_protocol: true,
        require_valid_protocol: true,
        require_host: true,
        require_port: false,
        allow_protocol_relative_urls: false,
        allow_fragments: true,
        allow_query_components: true,
        allow_underscores: true,
        disallow_auth: false,
    });
}
const isLinkActive = (slate) => {
    const [link] = Editor$1.nodes(slate, {
        match: (n) => !Editor$1.isEditor(n) && Element$1.isElement(n) && n.type === 'link',
    });
    return !!link;
};
const removeLink = (slate) => {
    Transforms.unwrapNodes(slate, {
        match: (n) => !Editor$1.isEditor(n) && Element$1.isElement(n) && n.type === 'link',
    });
};
const addLink = (editor, slate, url) => {
    var _a, _b, _c, _d;
    if (isLinkActive(slate)) {
        removeLink(slate);
    }
    const { selection } = slate;
    const isCollapsed = selection && Range.isCollapsed(selection);
    // Should be moved to the Link plugin
    const defaultLinkProps = (_d = (_c = (_b = (_a = editor.plugins) === null || _a === void 0 ? void 0 : _a.LinkPlugin) === null || _b === void 0 ? void 0 : _b.elements) === null || _c === void 0 ? void 0 : _c.link) === null || _d === void 0 ? void 0 : _d.props;
    const link = {
        type: 'link',
        children: isCollapsed ? [{ text: url }] : [],
        props: {
            url,
            target: (defaultLinkProps === null || defaultLinkProps === void 0 ? void 0 : defaultLinkProps.target) || '_self',
            rel: (defaultLinkProps === null || defaultLinkProps === void 0 ? void 0 : defaultLinkProps.rel) || 'noopener noreferrer',
        },
    };
    if (isCollapsed) {
        Transforms.insertNodes(slate, link);
    }
    else {
        Transforms.wrapNodes(slate, link, { split: true });
        Transforms.collapse(slate, { edge: 'end' });
    }
};
const withInlines = (editor, slate) => {
    const { insertData, insertText } = slate;
    slate.insertText = (text) => {
        if (text && isUrl(text)) {
            addLink(editor, slate, text);
        }
        else {
            insertText(text);
        }
    };
    slate.insertData = (data) => {
        const text = data.getData('text/plain');
        if (text && isUrl(text)) {
            addLink(editor, slate, text);
        }
        else {
            insertData(data);
        }
    };
    return slate;
};

const useSlateEditor = (id, editor, block, elements, withExtensions) => {
    return useMemo(() => {
        let slate = editor.blockEditorsMap[id];
        const { normalizeNode, insertText, apply } = slate;
        const elementTypes = Object.keys(elements);
        elementTypes.forEach((elementType) => {
            var _a;
            const nodeType = (_a = elements[elementType].props) === null || _a === void 0 ? void 0 : _a.nodeType;
            const isInline = nodeType === 'inline';
            const isVoid = nodeType === 'void';
            const isInlineVoid = nodeType === 'inlineVoid';
            if (isInlineVoid) {
                slate.markableVoid = (element) => element.type === elementType;
            }
            if (isVoid || isInlineVoid) {
                slate.isVoid = (element) => element.type === elementType;
            }
            if (isInline || isInlineVoid) {
                slate.isInline = (element) => element.type === elementType;
                // [TODO] - Move it to Link plugin extension
                slate = withInlines(editor, slate);
            }
        });
        slate.insertText = (text) => {
            const selectedPaths = Paths.getSelectedPaths(editor);
            const path = Paths.getPath(editor);
            if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
                editor.setPath({ current: path });
            }
            insertText(text);
        };
        // This normalization is needed to validate the elements structure
        slate.normalizeNode = (entry) => {
            const [node, path] = entry;
            const blockElements = editor.blocks[block.type].elements;
            // Normalize only `simple` block elements.
            // Simple elements are elements that have only one defined block element type.
            // [TODO] - handle validation for complex block elements
            if (Object.keys(blockElements).length > 1) {
                return normalizeNode(entry);
            }
            if (Element$1.isElement(node)) {
                const { type } = node;
                const rootElementType = getRootBlockElementType(blockElements);
                if (!elementTypes.includes(type)) {
                    Transforms.setNodes(slate, { type: rootElementType, props: Object.assign({}, node.props) }, { at: path });
                    return;
                }
                if (node.type === rootElementType) {
                    for (const [child, childPath] of Node$1.children(slate, path)) {
                        if (Element$1.isElement(child) && !slate.isInline(child)) {
                            Transforms.unwrapNodes(slate, { at: childPath });
                            return;
                        }
                    }
                }
            }
            normalizeNode(entry);
        };
        slate.apply = (op) => {
            var _a, _b, _c;
            if (Operation.isSelectionOperation(op)) {
                const selectedPaths = Paths.getSelectedPaths(editor);
                const path = Paths.getPath(editor);
                if (Array.isArray(selectedPaths) && slate.selection && Range.isExpanded(slate.selection)) {
                    editor.setPath({ current: path });
                }
            }
            let save = editor.isSavingHistory();
            if (typeof save === 'undefined') {
                save = shouldSave(op);
            }
            if (save) {
                const lastEditorBatch = editor.historyStack.undos[editor.historyStack.undos.length - 1];
                if (!lastEditorBatch || ((_a = lastEditorBatch === null || lastEditorBatch === void 0 ? void 0 : lastEditorBatch.operations[0]) === null || _a === void 0 ? void 0 : _a.type) !== 'set_slate') {
                    const setSlateOperation = {
                        type: 'set_slate',
                        properties: {
                            slateOps: [op],
                            selectionBefore: slate.selection,
                        },
                        blockId: id,
                        slate: slate,
                    };
                    editor.applyTransforms([setSlateOperation], { source: 'api', validatePaths: false });
                    apply(op);
                    return;
                }
                const lastSlateOps = (_c = (_b = lastEditorBatch === null || lastEditorBatch === void 0 ? void 0 : lastEditorBatch.operations[0]) === null || _b === void 0 ? void 0 : _b.properties) === null || _c === void 0 ? void 0 : _c.slateOps;
                const lastOp = lastSlateOps && lastSlateOps[lastSlateOps.length - 1];
                let merge = shouldMerge(op, lastOp);
                if (slate.operations.length !== 0) {
                    merge = true;
                }
                if (merge) {
                    if (lastOp !== op) {
                        lastSlateOps.push(op);
                    }
                }
                else {
                    const batch = {
                        operations: [op],
                        selectionBefore: slate.selection,
                    };
                    const setSlateOperation = {
                        type: 'set_slate',
                        properties: {
                            slateOps: batch.operations,
                            selectionBefore: batch.selectionBefore,
                        },
                        blockId: id,
                        slate: slate,
                    };
                    editor.applyTransforms([setSlateOperation], { source: 'api', validatePaths: false });
                }
            }
            apply(op);
        };
        if (withExtensions) {
            slate = withExtensions(slate, editor, id);
        }
        return slate;
    }, []);
};
const useEventHandlers = (events, editor, block, slate) => {
    return useMemo(() => {
        if (!events || editor.readOnly)
            return {};
        const _a = events || {}, eventHandlers = __rest(_a, ["onBeforeCreate", "onDestroy", "onCreate"]);
        const eventHandlersOptions = {
            hotkeys: HOTKEYS,
            currentBlock: block,
            defaultBlock: Blocks.buildBlockData({ id: generateId() }),
        };
        const eventHandlersMap = {};
        Object.keys(eventHandlers).forEach((eventType) => {
            eventHandlersMap[eventType] = function handler(event) {
                if (eventHandlers[eventType]) {
                    const handler = eventHandlers[eventType](editor, slate, eventHandlersOptions);
                    handler(event);
                }
            };
        });
        return eventHandlersMap;
    }, [events, editor, block]);
};
const shouldSave = (op) => {
    if (op.type === 'set_selection') {
        return false;
    }
    return true;
};
const shouldMerge = (op, prev) => {
    if (prev === op)
        return true;
    if (prev &&
        op.type === 'insert_text' &&
        prev.type === 'insert_text' &&
        op.offset === prev.offset + prev.text.length &&
        Path.equals(op.path, prev.path)) {
        return true;
    }
    if (prev &&
        op.type === 'remove_text' &&
        prev.type === 'remove_text' &&
        op.offset + op.text.length === prev.offset &&
        Path.equals(op.path, prev.path)) {
        return true;
    }
    return false;
};

const getMappedElements = (elements) => {
    const mappedElements = {};
    Object.keys(elements).forEach((type) => (mappedElements[type] = elements[type].render));
    return mappedElements;
};
const getMappedMarks = (marks) => {
    const mappedMarks = {};
    if (!marks)
        return mappedMarks;
    marks.forEach((mark) => (mappedMarks[mark.type] = mark));
    return mappedMarks;
};
const SlateEditorComponent = ({ id, customEditor, elements, marks, events, options, extensions: withExtensions, placeholder = `Type '/' for commands`, }) => {
    const editor = useYooptaEditor();
    const block = useBlockData(id);
    let initialValue = useRef(block.value).current;
    const ELEMENTS_MAP = useMemo(() => getMappedElements(elements), [elements]);
    const MARKS_MAP = useMemo(() => getMappedMarks(marks), [marks]);
    const slate = useSlateEditor(id, editor, block, elements, withExtensions);
    const eventHandlers = useEventHandlers(events, editor, block, slate);
    const onChange = useCallback((value) => {
        if (editor.readOnly)
            return;
        // @ts-ignore - fixme
        if (window.scheduler) {
            // @ts-ignore - fixme
            window.scheduler.postTask(() => editor.updateBlock(id, { value }), { priority: 'background' });
        }
        else {
            editor.updateBlock(id, { value });
        }
    }, [id]);
    const onSelectionChange = useCallback((selection) => {
        if (editor.readOnly)
            return;
        editor.setPath({ current: editor.path.current, selected: editor.path.selected, selection: selection });
    }, [editor.readOnly]);
    const renderElement = useCallback((elementProps) => {
        const ElementComponent = ELEMENTS_MAP[elementProps.element.type];
        const { attributes } = elementProps, props = __rest(elementProps, ["attributes"]);
        attributes['data-element-type'] = props.element.type;
        if (!ElementComponent)
            return jsx(DefaultElement, Object.assign({}, props, { attributes: attributes }));
        return (jsx(ElementComponent, Object.assign({}, props, { attributes: attributes, blockId: id, HTMLAttributes: options === null || options === void 0 ? void 0 : options.HTMLAttributes })));
    }, [elements]);
    const renderLeaf = useCallback((props) => {
        var _a, _b, _c, _d;
        let { children, leaf, attributes } = props;
        const formats = __rest(leaf, ["text"]);
        const isCurrentPath = editor.path.current === block.meta.order;
        if (formats) {
            Object.keys(formats).forEach((format) => {
                const mark = MARKS_MAP[format];
                if (mark)
                    children = mark.render({ children, leaf });
            });
        }
        const isParentElementVoid = ((_d = (_c = (_b = (_a = props.children) === null || _a === void 0 ? void 0 : _a.props) === null || _b === void 0 ? void 0 : _b.parent) === null || _c === void 0 ? void 0 : _c.props) === null || _d === void 0 ? void 0 : _d.nodeType) === 'void';
        const showPlaceholder = !isParentElementVoid && isCurrentPath && leaf.withPlaceholder;
        return (jsx(TextLeaf, Object.assign({ attributes: attributes, placeholder: showPlaceholder ? placeholder : undefined }, { children: children })));
    }, [marks]);
    const onKeyDown = useCallback((event) => {
        var _a;
        if (editor.readOnly)
            return;
        (_a = eventHandlers.onKeyDown) === null || _a === void 0 ? void 0 : _a.call(eventHandlers, event);
        EVENT_HANDLERS.onKeyDown(editor)(event);
    }, [eventHandlers.onKeyDown, editor.readOnly, editor.path.current, block.meta.order]);
    const onKeyUp = useCallback((event) => {
        var _a;
        if (editor.readOnly)
            return;
        (_a = eventHandlers === null || eventHandlers === void 0 ? void 0 : eventHandlers.onKeyUp) === null || _a === void 0 ? void 0 : _a.call(eventHandlers, event);
    }, [eventHandlers.onKeyUp, editor.readOnly]);
    const onBlur = useCallback((event) => {
        var _a;
        if (editor.readOnly)
            return;
        event.preventDefault();
        (_a = eventHandlers === null || eventHandlers === void 0 ? void 0 : eventHandlers.onBlur) === null || _a === void 0 ? void 0 : _a.call(eventHandlers, event);
    }, [eventHandlers.onBlur, editor.readOnly]);
    const onFocus = useCallback((event) => {
        var _a;
        if (editor.readOnly)
            return;
        if (!editor.isFocused()) {
            IS_FOCUSED_EDITOR.set(editor, true);
            // [TODO] - as test
            editor.emit('focus', true);
        }
        (_a = eventHandlers === null || eventHandlers === void 0 ? void 0 : eventHandlers.onFocus) === null || _a === void 0 ? void 0 : _a.call(eventHandlers, event);
    }, [eventHandlers.onFocus, editor.readOnly]);
    const onPaste = useCallback((event) => {
        var _a;
        if (editor.readOnly)
            return;
        (_a = eventHandlers === null || eventHandlers === void 0 ? void 0 : eventHandlers.onPaste) === null || _a === void 0 ? void 0 : _a.call(eventHandlers, event);
        const data = event.clipboardData;
        const html = data.getData('text/html');
        const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
        if (parsedHTML.body.childNodes.length > 0) {
            const blocks = deserializeHTML(editor, parsedHTML.body);
            // If no blocks from HTML, then paste as plain text using default behavior from Slate
            if (blocks.length > 0 && editor.path.current !== null) {
                event.preventDefault();
                let shouldInsertAfterSelection = false;
                let shouldDeleteCurrentBlock = false;
                if (slate && slate.selection) {
                    const parentPath = Path.parent(slate.selection.anchor.path);
                    const text = Editor$1.string(slate, parentPath).trim();
                    const isStart = Editor$1.isStart(slate, slate.selection.anchor, parentPath);
                    shouldDeleteCurrentBlock = text === '' && isStart;
                    shouldInsertAfterSelection = !isStart || text.length > 0;
                    ReactEditor.blur(slate);
                }
                const insertPathIndex = editor.path.current;
                if (insertPathIndex === null)
                    return;
                // [TEST]
                editor.batchOperations(() => {
                    const newPaths = [];
                    if (shouldDeleteCurrentBlock) {
                        editor.deleteBlock({ at: insertPathIndex });
                    }
                    blocks.forEach((block, idx) => {
                        let insertBlockPath = shouldInsertAfterSelection ? insertPathIndex + idx + 1 : insertPathIndex + idx;
                        newPaths.push(insertBlockPath);
                        const blockData = __rest(block, ["type"]);
                        editor.insertBlock(block.type, { at: insertBlockPath, focus: false, blockData });
                    });
                    // [TEST]
                    editor.setPath({ current: null, selected: newPaths });
                });
                return;
            }
        }
    }, [eventHandlers.onPaste, editor.readOnly]);
    const decorate = useCallback((nodeEntry) => {
        const ranges = [];
        if (editor.readOnly)
            return ranges;
        const [node, path] = nodeEntry;
        const isCurrent = editor.path.current === block.meta.order;
        if (slate.selection && isCurrent) {
            if (!Editor$1.isEditor(node) &&
                Editor$1.string(slate, [path[0]]) === '' &&
                Range.includes(slate.selection, path) &&
                Range.isCollapsed(slate.selection)) {
                ranges.push(Object.assign(Object.assign({}, slate.selection), { withPlaceholder: true }));
            }
        }
        return ranges;
    }, [editor.readOnly, editor.path.current, block.meta.order]);
    return (jsx(SlateEditorInstance, { id: id, slate: slate, initialValue: initialValue, onChange: onChange, onSelectionChange: onSelectionChange, decorate: decorate, renderLeaf: renderLeaf, renderElement: renderElement, eventHandlers: eventHandlers, onKeyDown: onKeyDown, onKeyUp: onKeyUp, onFocus: onFocus, onBlur: onBlur, customEditor: customEditor, readOnly: editor.readOnly, onPaste: onPaste }));
};
// [TODO] - no need memo
const SlateEditorInstance = memo(({ id, slate, initialValue, onChange, renderLeaf, renderElement, eventHandlers, onKeyDown, onKeyUp, onFocus, onSelectionChange, onPaste, customEditor, decorate, readOnly, }) => {
    if (typeof customEditor === 'function') {
        return customEditor({ blockId: id });
    }
    return (jsx(Slate, Object.assign({ editor: slate, initialValue: initialValue, onValueChange: onChange, onSelectionChange: onSelectionChange }, { children: jsx(Editable, Object.assign({ renderElement: renderElement, renderLeaf: renderLeaf, className: "yoopta-slate", spellCheck: true }, eventHandlers, { onKeyDown: onKeyDown, onKeyUp: onKeyUp, onFocus: onFocus, decorate: decorate, 
            // [TODO] - carefully check onBlur, e.x. transforms using functions, e.x. highlight update
            // onBlur={onBlur}
            readOnly: readOnly, onPaste: onPaste }), `editable-${id}`) }), `slate-${id}`));
});
SlateEditorInstance.displayName = 'SlateEditorInstance';

const useYooptaDragDrop = ({ editor }) => {
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 20,
        },
    }), useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    }));
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const newPluginPosition = editor.children[over.id].meta.order;
            // [TEST]
            editor.moveBlock(active.id, newPluginPosition);
        }
    }, []);
    const handleDragStart = useCallback((event) => {
        editor.setPath({ current: null });
    }, []);
    return { sensors, handleDragEnd, handleDragStart };
};

var _path$2;
function _extends$2() { _extends$2 = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$2.apply(this, arguments); }
var SvgDrag = function SvgDrag(props) {
  return /*#__PURE__*/React.createElement("svg", _extends$2({
    viewBox: "0 0 10 10",
    fill: "currentColor",
    style: {
      width: 14,
      height: 14,
      display: "block",
      flexShrink: 0,
      backfaceVisibility: "hidden"
    }
  }, props), _path$2 || (_path$2 = /*#__PURE__*/React.createElement("path", {
    d: "M3 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
  })));
};

var _path$1;
function _extends$1() { _extends$1 = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$1.apply(this, arguments); }
var SvgPlus = function SvgPlus(props) {
  return /*#__PURE__*/React.createElement("svg", _extends$1({
    viewBox: "0 0 16 16",
    fill: "currentColor",
    style: {
      width: 16,
      height: 16,
      display: "block",
      flexShrink: 0,
      backfaceVisibility: "hidden"
    }
  }, props), _path$1 || (_path$1 = /*#__PURE__*/React.createElement("path", {
    d: "M7.977 14.963c.407 0 .747-.324.747-.723V8.72h5.362c.399 0 .74-.34.74-.747a.746.746 0 0 0-.74-.738H8.724V1.706c0-.398-.34-.722-.747-.722a.732.732 0 0 0-.739.722v5.529h-5.37a.746.746 0 0 0-.74.738c0 .407.341.747.74.747h5.37v5.52c0 .399.332.723.739.723z"
  })));
};

var _path;
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
var SvgTurn = function SvgTurn(props) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 16 16",
    className: "turn_svg__loop",
    style: {
      width: 16,
      height: 16,
      display: "block",
      fill: "currentcolor",
      flexShrink: 0,
      backfaceVisibility: "hidden"
    }
  }, props), _path || (_path = /*#__PURE__*/React.createElement("path", {
    d: "M5.804 3.123c.006.38.254.622.673.622h4.887c.59 0 .914.305.914.92v6.628l-.901-.978-.514-.514c-.267-.254-.629-.273-.895-.013-.254.26-.248.635.012.895l2.165 2.158c.476.47 1.022.47 1.498 0l2.165-2.158c.26-.26.266-.635.012-.895-.266-.26-.628-.241-.895.013l-.514.514-.895.971V4.564c0-1.358-.71-2.063-2.082-2.063H6.477c-.42 0-.68.241-.673.622ZM.186 7.06c.26.266.622.247.889-.013l.52-.508.889-.971v6.722c0 1.359.71 2.063 2.082 2.063h4.957c.42 0 .68-.241.673-.622-.006-.387-.254-.622-.673-.622h-4.88c-.591 0-.915-.311-.915-.927V5.554l.895.984.52.508c.26.26.629.28.89.013.26-.26.253-.629-.013-.89L3.855 4.013c-.476-.476-1.016-.476-1.492 0L.2 6.17c-.267.26-.273.628-.013.889Z"
  })));
};

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

var _excluded$1h = ["color"];
var CopyIcon = /*#__PURE__*/forwardRef(function (_ref, forwardedRef) {
  var _ref$color = _ref.color,
      color = _ref$color === void 0 ? 'currentColor' : _ref$color,
      props = _objectWithoutPropertiesLoose(_ref, _excluded$1h);

  return createElement$1("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), createElement$1("path", {
    d: "M1 9.50006C1 10.3285 1.67157 11.0001 2.5 11.0001H4L4 10.0001H2.5C2.22386 10.0001 2 9.7762 2 9.50006L2 2.50006C2 2.22392 2.22386 2.00006 2.5 2.00006L9.5 2.00006C9.77614 2.00006 10 2.22392 10 2.50006V4.00002H5.5C4.67158 4.00002 4 4.67159 4 5.50002V12.5C4 13.3284 4.67158 14 5.5 14H12.5C13.3284 14 14 13.3284 14 12.5V5.50002C14 4.67159 13.3284 4.00002 12.5 4.00002H11V2.50006C11 1.67163 10.3284 1.00006 9.5 1.00006H2.5C1.67157 1.00006 1 1.67163 1 2.50006V9.50006ZM5 5.50002C5 5.22388 5.22386 5.00002 5.5 5.00002H12.5C12.7761 5.00002 13 5.22388 13 5.50002V12.5C13 12.7762 12.7761 13 12.5 13H5.5C5.22386 13 5 12.7762 5 12.5V5.50002Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});

var _excluded$1J = ["color"];
var DotsHorizontalIcon = /*#__PURE__*/forwardRef(function (_ref, forwardedRef) {
  var _ref$color = _ref.color,
      color = _ref$color === void 0 ? 'currentColor' : _ref$color,
      props = _objectWithoutPropertiesLoose(_ref, _excluded$1J);

  return createElement$1("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), createElement$1("path", {
    d: "M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});

var _excluded$2T = ["color"];
var Link2Icon = /*#__PURE__*/forwardRef(function (_ref, forwardedRef) {
  var _ref$color = _ref.color,
      color = _ref$color === void 0 ? 'currentColor' : _ref$color,
      props = _objectWithoutPropertiesLoose(_ref, _excluded$2T);

  return createElement$1("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), createElement$1("path", {
    d: "M8.51194 3.00541C9.18829 2.54594 10.0435 2.53694 10.6788 2.95419C10.8231 3.04893 10.9771 3.1993 11.389 3.61119C11.8009 4.02307 11.9513 4.17714 12.046 4.32141C12.4633 4.95675 12.4543 5.81192 11.9948 6.48827C11.8899 6.64264 11.7276 6.80811 11.3006 7.23511L10.6819 7.85383C10.4867 8.04909 10.4867 8.36567 10.6819 8.56093C10.8772 8.7562 11.1938 8.7562 11.389 8.56093L12.0077 7.94221L12.0507 7.89929C12.4203 7.52976 12.6568 7.2933 12.822 7.0502C13.4972 6.05623 13.5321 4.76252 12.8819 3.77248C12.7233 3.53102 12.4922 3.30001 12.1408 2.94871L12.0961 2.90408L12.0515 2.85942C11.7002 2.508 11.4692 2.27689 11.2277 2.11832C10.2377 1.46813 8.94398 1.50299 7.95001 2.17822C7.70691 2.34336 7.47044 2.57991 7.1009 2.94955L7.058 2.99247L6.43928 3.61119C6.24401 3.80645 6.24401 4.12303 6.43928 4.31829C6.63454 4.51355 6.95112 4.51355 7.14638 4.31829L7.7651 3.69957C8.1921 3.27257 8.35757 3.11027 8.51194 3.00541ZM4.31796 7.14672C4.51322 6.95146 4.51322 6.63487 4.31796 6.43961C4.12269 6.24435 3.80611 6.24435 3.61085 6.43961L2.99213 7.05833L2.94922 7.10124C2.57957 7.47077 2.34303 7.70724 2.17788 7.95035C1.50265 8.94432 1.4678 10.238 2.11799 11.2281C2.27656 11.4695 2.50766 11.7005 2.8591 12.0518L2.90374 12.0965L2.94837 12.1411C3.29967 12.4925 3.53068 12.7237 3.77214 12.8822C4.76219 13.5324 6.05589 13.4976 7.04986 12.8223C7.29296 12.6572 7.52943 12.4206 7.89896 12.051L7.89897 12.051L7.94188 12.0081L8.5606 11.3894C8.75586 11.1941 8.75586 10.8775 8.5606 10.6823C8.36533 10.487 8.04875 10.487 7.85349 10.6823L7.23477 11.301C6.80777 11.728 6.6423 11.8903 6.48794 11.9951C5.81158 12.4546 4.95642 12.4636 4.32107 12.0464C4.17681 11.9516 4.02274 11.8012 3.61085 11.3894C3.19896 10.9775 3.0486 10.8234 2.95385 10.6791C2.53661 10.0438 2.54561 9.18863 3.00507 8.51227C3.10993 8.35791 3.27224 8.19244 3.69924 7.76544L4.31796 7.14672ZM9.62172 6.08558C9.81698 5.89032 9.81698 5.57373 9.62172 5.37847C9.42646 5.18321 9.10988 5.18321 8.91461 5.37847L5.37908 8.91401C5.18382 9.10927 5.18382 9.42585 5.37908 9.62111C5.57434 9.81637 5.89092 9.81637 6.08619 9.62111L9.62172 6.08558Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});

var _excluded$4G = ["color"];
var TrashIcon = /*#__PURE__*/forwardRef(function (_ref, forwardedRef) {
  var _ref$color = _ref.color,
      color = _ref$color === void 0 ? 'currentColor' : _ref$color,
      props = _objectWithoutPropertiesLoose(_ref, _excluded$4G);

  return createElement$1("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), createElement$1("path", {
    d: "M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H5H10H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H11V12C11 12.5523 10.5523 13 10 13H5C4.44772 13 4 12.5523 4 12V4L3.5 4C3.22386 4 3 3.77614 3 3.5ZM5 4H10V12H5V4Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});

var toggleSelection = function () {
  var selection = document.getSelection();
  if (!selection.rangeCount) {
    return function () {};
  }
  var active = document.activeElement;

  var ranges = [];
  for (var i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i));
  }

  switch (active.tagName.toUpperCase()) { // .toUpperCase handles XHTML
    case 'INPUT':
    case 'TEXTAREA':
      active.blur();
      break;

    default:
      active = null;
      break;
  }

  selection.removeAllRanges();
  return function () {
    selection.type === 'Caret' &&
    selection.removeAllRanges();

    if (!selection.rangeCount) {
      ranges.forEach(function(range) {
        selection.addRange(range);
      });
    }

    active &&
    active.focus();
  };
};

var deselectCurrent = toggleSelection;

var clipboardToIE11Formatting = {
  "text/plain": "Text",
  "text/html": "Url",
  "default": "Text"
};

var defaultMessage = "Copy to clipboard: #{key}, Enter";

function format(message) {
  var copyKey = (/mac os x/i.test(navigator.userAgent) ? "⌘" : "Ctrl") + "+C";
  return message.replace(/#{\s*key\s*}/g, copyKey);
}

function copy(text, options) {
  var debug,
    message,
    reselectPrevious,
    range,
    selection,
    mark,
    success = false;
  if (!options) {
    options = {};
  }
  debug = options.debug || false;
  try {
    reselectPrevious = deselectCurrent();

    range = document.createRange();
    selection = document.getSelection();

    mark = document.createElement("span");
    mark.textContent = text;
    // avoid screen readers from reading out loud the text
    mark.ariaHidden = "true";
    // reset user styles for span element
    mark.style.all = "unset";
    // prevents scrolling to the end of the page
    mark.style.position = "fixed";
    mark.style.top = 0;
    mark.style.clip = "rect(0, 0, 0, 0)";
    // used to preserve spaces and line breaks
    mark.style.whiteSpace = "pre";
    // do not inherit user-select (it may be `none`)
    mark.style.webkitUserSelect = "text";
    mark.style.MozUserSelect = "text";
    mark.style.msUserSelect = "text";
    mark.style.userSelect = "text";
    mark.addEventListener("copy", function(e) {
      e.stopPropagation();
      if (options.format) {
        e.preventDefault();
        if (typeof e.clipboardData === "undefined") { // IE 11
          debug && console.warn("unable to use e.clipboardData");
          debug && console.warn("trying IE specific stuff");
          window.clipboardData.clearData();
          var format = clipboardToIE11Formatting[options.format] || clipboardToIE11Formatting["default"];
          window.clipboardData.setData(format, text);
        } else { // all other browsers
          e.clipboardData.clearData();
          e.clipboardData.setData(options.format, text);
        }
      }
      if (options.onCopy) {
        e.preventDefault();
        options.onCopy(e.clipboardData);
      }
    });

    document.body.appendChild(mark);

    range.selectNodeContents(mark);
    selection.addRange(range);

    var successful = document.execCommand("copy");
    if (!successful) {
      throw new Error("copy command was unsuccessful");
    }
    success = true;
  } catch (err) {
    debug && console.error("unable to copy using execCommand: ", err);
    debug && console.warn("trying IE specific stuff");
    try {
      window.clipboardData.setData(options.format || "text", text);
      options.onCopy && options.onCopy(window.clipboardData);
      success = true;
    } catch (err) {
      debug && console.error("unable to copy using clipboardData: ", err);
      debug && console.error("falling back to prompt");
      message = format("message" in options ? options.message : defaultMessage);
      window.prompt(message, text);
    }
  } finally {
    if (selection) {
      if (typeof selection.removeRange == "function") {
        selection.removeRange(range);
      } else {
        selection.removeAllRanges();
      }
    }

    if (mark) {
      document.body.removeChild(mark);
    }
    reselectPrevious();
  }

  return success;
}

var copyToClipboard = copy;

const Overlay = (_a) => {
    var { className, children, lockScroll = true } = _a, props = __rest(_a, ["className", "children", "lockScroll"]);
    const onMouseDown = (e) => {
        var _a;
        e.stopPropagation();
        (_a = props.onMouseDown) === null || _a === void 0 ? void 0 : _a.call(props, e);
    };
    const onClick = (e) => {
        var _a;
        e.stopPropagation();
        (_a = props.onClick) === null || _a === void 0 ? void 0 : _a.call(props, e);
    };
    return (jsx(FloatingOverlay, Object.assign({ lockScroll: lockScroll, className: className }, props, { onClick: onClick, onMouseDown: onMouseDown }, { children: children })));
};

const Portal = (props) => {
    const [isMounted, setIsMounted] = useState(false);
    const rootEl = useRef(null);
    const editor = useYooptaEditor();
    useEffect(() => {
        setIsMounted(true);
        const editorEl = editor.refElement;
        if (!editorEl)
            return;
        const overlays = editorEl.querySelector('.yoopta-overlays');
        if (!overlays) {
            rootEl.current = document.createElement('div');
            rootEl.current.className = 'yoopta-overlays';
            editorEl.appendChild(rootEl.current);
        }
        return () => {
            if (rootEl.current) {
                rootEl.current.remove();
            }
        };
    }, []);
    if (!isMounted)
        return null;
    return (jsx(FloatingPortal, Object.assign({ id: `${props.id}-${editor.id}`, root: rootEl.current || editor.refElement }, { children: props.children })));
};

const BlockOptionsMenuGroup = ({ children }) => jsx("div", Object.assign({ className: "yoopta-block-options-group" }, { children: children }));
const BlockOptionsMenuContent = ({ children }) => (jsx("div", Object.assign({ onClick: (e) => e.stopPropagation(), className: "yoopta-block-options-menu-content data-[state=open]:yoo-editor-animate-in data-[state=closed]:yoo-editor-animate-out data-[state=closed]:yoo-editor-fade-out-0 data-[state=open]:yoo-editor-fade-in-0 data-[state=closed]:yoo-editor-zoom-out-95 data-[state=open]:yoo-editor-zoom-in-95 data-[side=bottom]:yoo-editor-slide-in-from-top-2 data-[side=left]:yoo-editor-slide-in-from-right-2 data-[side=right]:yoo-editor-slide-in-from-left-2 data-[side=top]:yoo-editor-slide-in-from-bottom-2" }, { children: children })));
const BlockOptionsMenuItem = ({ children }) => jsx("div", Object.assign({ className: "yoopta-block-options-item" }, { children: children }));
const BlockOptionsSeparator = ({ className = '' }) => (jsx("div", { className: `yoopta-block-options-separator ${className}` }));
const DEFAULT_ACTIONS = ['delete', 'duplicate', 'turnInto', 'copy'];
const BlockOptions = ({ isOpen, onClose, refs, style, actions = DEFAULT_ACTIONS, children }) => {
    var _a, _b, _c;
    const editor = useYooptaEditor();
    const tools = useYooptaTools();
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const { refs: actionMenuRefs, floatingStyles: actionMenuFloatingStyles, context, } = useFloating({
        placement: 'right',
        open: isActionMenuOpen,
        onOpenChange: setIsActionMenuOpen,
        middleware: [inline(), flip(), shift(), offset(10)],
        whileElementsMounted: autoUpdate,
    });
    const { isMounted: isActionMenuMounted, styles: actionMenuTransitionStyles } = useTransitionStyles(context, {
        duration: 100,
    });
    if (!isOpen)
        return null;
    const currentBlock = findPluginBlockByPath(editor, { at: editor.path.current });
    const rootElement = getRootBlockElement((_a = editor.blocks[(currentBlock === null || currentBlock === void 0 ? void 0 : currentBlock.type) || '']) === null || _a === void 0 ? void 0 : _a.elements);
    const isVoidElement = ((_b = rootElement === null || rootElement === void 0 ? void 0 : rootElement.props) === null || _b === void 0 ? void 0 : _b.nodeType) === 'void';
    const onDelete = () => {
        editor.deleteBlock({ at: editor.path.current });
        editor.setPath({ current: null });
        onClose();
    };
    const onDuplicate = () => {
        // [TEST]
        if (typeof editor.path.current !== 'number')
            return;
        editor.duplicateBlock({ original: { path: editor.path.current }, focus: true });
        onClose();
    };
    const onCopy = () => {
        const block = findPluginBlockByPath(editor);
        if (block) {
            copyToClipboard(`${window.location.origin}${window.location.pathname}#${block.id}`);
            editor.emit('block:copy', block);
        }
        onClose();
    };
    const ActionMenu = tools.ActionMenu;
    const actionMenuStyles = Object.assign(Object.assign({}, actionMenuFloatingStyles), actionMenuTransitionStyles);
    const onCloseActionMenu = () => {
        setIsActionMenuOpen(false);
        onClose();
    };
    const actionMenuRenderProps = buildActionMenuRenderProps({ editor, view: 'small', onClose: onCloseActionMenu });
    return (
    // [TODO] - take care about SSR
    jsx(Portal, Object.assign({ id: "yoo-block-options-portal" }, { children: jsx(Overlay, Object.assign({ lockScroll: true, className: "yoo-editor-z-[100]", onClick: onClose }, { children: jsx("div", Object.assign({ style: style, ref: refs.setFloating, contentEditable: false }, { children: jsxs(BlockOptionsMenuContent, { children: [actions !== null && (jsxs(BlockOptionsMenuGroup, { children: [jsx(BlockOptionsMenuItem, { children: jsxs("button", Object.assign({ type: "button", className: "yoopta-block-options-button", onClick: onDelete }, { children: [jsx(TrashIcon, { className: "yoo-editor-w-4 yoo-editor-h-4 yoo-editor-mr-2" }), "Delete"] })) }), jsx(BlockOptionsMenuItem, { children: jsxs("button", Object.assign({ type: "button", className: "yoopta-block-options-button", onClick: onDuplicate }, { children: [jsx(CopyIcon, { className: "yoo-editor-w-4 yoo-editor-h-4 yoo-editor-mr-2" }), "Duplicate"] })) }), !!ActionMenu && !isVoidElement && !((_c = editor.blocks[(currentBlock === null || currentBlock === void 0 ? void 0 : currentBlock.type) || '']) === null || _c === void 0 ? void 0 : _c.hasCustomEditor) && (jsxs(BlockOptionsMenuItem, { children: [isActionMenuMounted && (jsx(Portal, Object.assign({ id: "yoo-block-options-portal" }, { children: jsx(Overlay, Object.assign({ lockScroll: true, className: "yoo-editor-z-[100]", onClick: () => setIsActionMenuOpen(false) }, { children: jsx("div", Object.assign({ style: actionMenuStyles, ref: actionMenuRefs.setFloating }, { children: jsx(ActionMenu, Object.assign({}, actionMenuRenderProps)) })) })) }))), jsxs("button", Object.assign({ type: "button", className: "yoopta-block-options-button", ref: actionMenuRefs.setReference, onClick: () => setIsActionMenuOpen((open) => !open) }, { children: [jsx(SvgTurn, { className: "yoo-editor-w-4 yoo-editor-h-4 yoo-editor-mr-2" }), "Turn into"] }))] })), jsx(BlockOptionsMenuItem, { children: jsxs("button", Object.assign({ type: "button", className: "yoopta-block-options-button", onClick: onCopy }, { children: [jsx(Link2Icon, { className: "yoo-editor-w-4 yoo-editor-h-4 yoo-editor-mr-2" }), "Copy link to block"] })) })] })), children] }) })) })) })));
};

var BlockOptionsUI = /*#__PURE__*/Object.freeze({
  __proto__: null,
  BlockOptions: BlockOptions,
  BlockOptionsMenuContent: BlockOptionsMenuContent,
  BlockOptionsMenuGroup: BlockOptionsMenuGroup,
  BlockOptionsMenuItem: BlockOptionsMenuItem,
  BlockOptionsSeparator: BlockOptionsSeparator
});

function throttle(func, wait, { leading = true, trailing = true } = {}) {
    let lastCallTime = 0;
    let timeout = null;
    let lastArgs = null;
    const invokeFunc = (time) => {
        func(...lastArgs);
        lastCallTime = time;
        lastArgs = null;
    };
    const throttled = (...args) => {
        const now = Date.now();
        if (!lastCallTime && !leading) {
            lastCallTime = now;
        }
        const remainingTime = wait - (now - lastCallTime);
        lastArgs = args;
        if (remainingTime <= 0 || remainingTime > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            invokeFunc(now);
        }
        else if (!timeout && trailing) {
            timeout = setTimeout(() => {
                timeout = null;
                if (trailing && lastArgs) {
                    invokeFunc(Date.now());
                }
            }, remainingTime);
        }
    };
    throttled.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        lastArgs = null;
        lastCallTime = 0;
    };
    return throttled;
}

const INITIAL_STYLES = {
    position: 'fixed',
    top: 0,
    left: 0,
    opacity: 0,
    transform: 'scale(0.95) translateX(-46px)',
    transition: 'opacity 150ms ease-out',
};
const FloatingBlockActions = memo(({ editor, dragHandleProps }) => {
    const [hoveredBlock, setHoveredBlock] = useState(null);
    const blockActionsRef = useRef(null);
    const [actionStyles, setActionStyles] = useState(INITIAL_STYLES);
    const { attributes, listeners, setActivatorNodeRef } = dragHandleProps || {};
    const { isBlockOptionsMounted, setIsBlockOptionsOpen, blockOptionsFloatingStyle, blockOptionsRefs } = useBlockOptionsRefs();
    const { isActionMenuOpen, actionMenuRefs, hasActionMenu, actionMenuStyles, onChangeActionMenuOpen, onCloseActionMenu, actionMenuRenderProps, ActionMenu, } = useActionMenuToolRefs({ editor });
    const updateBlockPosition = (blockElement, blockData) => {
        var _a;
        setHoveredBlock(blockData);
        const blockElementRect = blockElement.getBoundingClientRect();
        const blockActionsWidth = ((_a = blockActionsRef.current) === null || _a === void 0 ? void 0 : _a.offsetWidth) || 46;
        setActionStyles((prev) => (Object.assign(Object.assign({}, prev), { top: blockElementRect.top + 2, left: blockElementRect.left, opacity: 1, transform: `scale(1) translateX(-${blockActionsWidth}px)` })));
    };
    const hideBlockActions = () => {
        setActionStyles((prev) => (Object.assign(Object.assign({}, prev), { opacity: 0, transform: INITIAL_STYLES.transform })));
        setTimeout(() => {
            setHoveredBlock(null);
        }, 150);
    };
    const handleMouseMove = (event) => {
        var _a;
        const isInsideEditor = (_a = editor.refElement) === null || _a === void 0 ? void 0 : _a.contains(event.target);
        if (!isInsideEditor)
            return hideBlockActions();
        if (editor.readOnly)
            return;
        const target = event.target;
        const blockElement = target.closest('[data-yoopta-block]');
        if (blockElement) {
            const blockId = blockElement.getAttribute('data-yoopta-block-id');
            if (blockId === (hoveredBlock === null || hoveredBlock === void 0 ? void 0 : hoveredBlock.id))
                return;
            const blockData = editor.children[blockId || ''];
            if (blockData)
                updateBlockPosition(blockElement, blockData);
        }
    };
    const throttledMouseMove = throttle(handleMouseMove, 100, { leading: true, trailing: true });
    useEffect(() => {
        document.addEventListener('scroll', hideBlockActions);
        document.addEventListener('mousemove', throttledMouseMove);
        return () => {
            document.removeEventListener('scroll', hideBlockActions);
            document.removeEventListener('mousemove', throttledMouseMove);
            throttledMouseMove.cancel();
        };
    }, []);
    const onPlusClick = () => {
        var _a;
        const block = hoveredBlock;
        if (!block)
            return;
        const slate = Blocks.getBlockSlate(editor, { id: block.id });
        const blockEntity = editor.blocks[block.type];
        if (!slate)
            return;
        const blockEl = document.querySelector(`[data-yoopta-block-id="${block.id}"]`);
        const rootElement = getRootBlockElement(blockEntity.elements);
        let string;
        if (!blockEntity.hasCustomEditor) {
            string = Editor$1.string(slate, [0]);
        }
        const isEmptyString = typeof string === 'string' && string.trim().length === 0;
        if (hasActionMenu && isEmptyString && ((_a = rootElement === null || rootElement === void 0 ? void 0 : rootElement.props) === null || _a === void 0 ? void 0 : _a.nodeType) !== 'void') {
            editor.setPath({ current: block.meta.order });
            editor.focusBlock(block.id);
            actionMenuRefs.setReference(blockEl);
            onChangeActionMenuOpen(true);
        }
        else {
            const defaultBlock = Blocks.buildBlockData({ id: generateId() });
            const nextPath = block.meta.order + 1;
            editor.setPath({ current: block.meta.order });
            editor.insertBlock(defaultBlock.type, { at: nextPath, focus: true });
            if (hasActionMenu) {
                setTimeout(() => {
                    if (blockEl)
                        actionMenuRefs.setReference(blockEl.nextSibling);
                    onChangeActionMenuOpen(true);
                }, 0);
            }
        }
    };
    const onSelectBlock = (event) => {
        event.stopPropagation();
        const block = hoveredBlock;
        if (!block)
            return;
        const slate = findSlateBySelectionPath(editor, { at: block.meta.order });
        editor.focusBlock(block.id);
        if (!slate)
            return;
        setTimeout(() => {
            const currentBlock = editor.blocks[block.type];
            if (!currentBlock.hasCustomEditor) {
                ReactEditor.blur(slate);
                ReactEditor.deselect(slate);
                Transforms.deselect(slate);
            }
            editor.setPath({ current: block.meta.order, selected: [block.meta.order] });
            setIsBlockOptionsOpen(true);
        }, 10);
    };
    const onDragButtonRef = (node) => {
        setActivatorNodeRef === null || setActivatorNodeRef === void 0 ? void 0 : setActivatorNodeRef(node);
        blockOptionsRefs.setReference(node);
    };
    return (jsx(Portal, Object.assign({ id: "block-actions" }, { children: jsx("div", Object.assign({ contentEditable: false, style: actionStyles, className: "yoopta-block-actions", ref: blockActionsRef }, { children: jsxs("div", Object.assign({ className: "yoopta-block-action-buttons" }, { children: [isActionMenuOpen && hasActionMenu && (jsx(Portal, Object.assign({ id: "yoo-block-options-portal" }, { children: jsx(Overlay, Object.assign({ lockScroll: true, className: "yoo-editor-z-[100]", onClick: onCloseActionMenu }, { children: jsx("div", Object.assign({ style: actionMenuStyles, ref: actionMenuRefs.setFloating }, { children: jsx(ActionMenu, Object.assign({}, actionMenuRenderProps)) })) })) }))), jsx("button", Object.assign({ type: "button", onClick: onPlusClick, className: "yoopta-block-actions-plus" }, { children: jsx(SvgPlus, {}) })), jsx("button", Object.assign({ ref: onDragButtonRef, type: "button", className: "yoopta-block-actions-drag", onClick: onSelectBlock }, attributes, listeners, { children: jsx(SvgDrag, {}) })), jsx(BlockOptions, { isOpen: isBlockOptionsMounted, refs: blockOptionsRefs, style: blockOptionsFloatingStyle, onClose: () => setIsBlockOptionsOpen(false) })] })) })) })));
});
FloatingBlockActions.displayName = 'FloatingBlockActions';

const DEFAULT_EDITOR_KEYS = [];
const RenderBlocks = ({ editor, marks, placeholder }) => {
    const isReadOnly = useYooptaReadOnly();
    const { sensors, handleDragEnd, handleDragStart } = useYooptaDragDrop({ editor });
    const [dragHandleProps, setActiveDragHandleProps] = useState(null);
    const childrenUnorderedKeys = Object.keys(editor.children);
    const childrenKeys = useMemo(() => {
        if (childrenUnorderedKeys.length === 0)
            return DEFAULT_EDITOR_KEYS;
        return childrenUnorderedKeys.sort((a, b) => {
            const aOrder = editor.children[a].meta.order;
            const bOrder = editor.children[b].meta.order;
            return aOrder - bOrder;
        });
        //[TODO] - unnecesary
    }, [childrenUnorderedKeys]);
    const blocks = [];
    for (let i = 0; i < childrenKeys.length; i++) {
        const blockId = childrenKeys[i];
        const block = editor.children[blockId];
        const plugin = editor.plugins[block.type];
        if (!block || !plugin) {
            console.error(`Plugin ${block.type} not found`);
            continue;
        }
        blocks.push(jsx(Block, Object.assign({ block: block, blockId: blockId, onActiveDragHandleChange: setActiveDragHandleProps }, { children: jsx(SlateEditorComponent, { type: block.type, id: blockId, marks: marks, customEditor: plugin.customEditor, events: plugin.events, elements: plugin.elements, options: plugin.options, extensions: plugin.extensions, placeholder: placeholder }, blockId) }), blockId));
    }
    if (isReadOnly)
        return jsx(Fragment, { children: blocks });
    return (jsx(DndContext, Object.assign({ id: "yoopta-dnd-context", sensors: sensors, collisionDetection: closestCenter, onDragStart: handleDragStart, onDragEnd: handleDragEnd }, { children: jsxs(SortableContext, Object.assign({ disabled: isReadOnly, items: childrenKeys, strategy: verticalListSortingStrategy }, { children: [blocks, jsx(FloatingBlockActions, { editor: editor, dragHandleProps: dragHandleProps })] })) })));
};

const findBlocksUnderSelection = (editor, origin, coords) => {
    var _a;
    const blocksUnderSelection = [];
    const blocks = (_a = editor.refElement) === null || _a === void 0 ? void 0 : _a.querySelectorAll(`[data-yoopta-block]`);
    if (!blocks)
        return blocksUnderSelection;
    blocks.forEach((blockEl, i) => {
        if (!blockEl)
            return;
        const blockRect = blockEl.getBoundingClientRect();
        const selectionRect = {
            top: Math.min(origin[1], coords[1]),
            left: Math.min(origin[0], coords[0]),
            bottom: Math.max(origin[1], coords[1]),
            right: Math.max(origin[0], coords[0]),
        };
        if (selectionRect.top < blockRect.bottom &&
            selectionRect.bottom > blockRect.top &&
            selectionRect.left < blockRect.right &&
            selectionRect.right > blockRect.left) {
            blocksUnderSelection.push(i);
        }
    });
    return blocksUnderSelection;
};
// [TODO] - Fix selection when multiple editors
// Maybe move to a separate npm package?
const useRectangeSelectionBox = ({ editor, root }) => {
    const [state, setState] = useState({
        origin: [0, 0],
        coords: [0, 0],
        selection: false,
    });
    const onMouseDown = (event) => {
        var _a;
        if (editor.readOnly || root === false)
            return;
        const isInsideEditor = (_a = editor.refElement) === null || _a === void 0 ? void 0 : _a.contains(event.target);
        const selectedBlocks = Paths.getSelectedPaths(editor);
        if (!isInsideEditor && !state.selection && Array.isArray(selectedBlocks) && selectedBlocks.length > 0) {
            editor.setPath({ current: null });
            return onClose();
        }
        if (isInsideEditor)
            return;
        setState({
            origin: [event.pageX, event.pageY - window.pageYOffset],
            coords: [event.pageX, event.pageY - window.pageYOffset],
            selection: true,
        });
    };
    const onMouseMove = (event) => {
        if (!state.selection || editor.readOnly || root === false)
            return;
        setState((prevState) => (Object.assign(Object.assign({}, prevState), { coords: [event.pageX, event.pageY - window.pageYOffset] })));
        const blocksUnderSelection = findBlocksUnderSelection(editor, state.origin, [
            event.pageX,
            event.pageY - window.pageYOffset,
        ]);
        editor.setPath({ current: null, selected: blocksUnderSelection });
    };
    const onMouseUp = () => {
        if (editor.readOnly)
            return;
        onClose();
    };
    const getRootBlockElement = () => {
        if (root && 'current' in root)
            return root.current;
        if (root)
            return root;
        return document;
    };
    useEffect(() => {
        var _a;
        if (editor.readOnly || root === false)
            return;
        const elementMouseEl = getRootBlockElement();
        if (!elementMouseEl) {
            throw new Error('Root element not found. Please check the `selectionBoxRoot` prop');
        }
        if (!('nodeType' in elementMouseEl)) {
            throw new Error('Root element should be a DOM element or a ref object. Please check the `selectionBoxRoot` prop');
        }
        if ((_a = editor.refElement) === null || _a === void 0 ? void 0 : _a.contains(elementMouseEl)) {
            throw new Error('Root element should not be a child of the editor. Please check the `selectionBoxRoot` prop');
        }
        elementMouseEl.addEventListener('mousedown', onMouseDown);
        elementMouseEl.addEventListener('mousemove', onMouseMove);
        elementMouseEl.addEventListener('mouseup', onMouseUp);
        return () => {
            elementMouseEl.removeEventListener('mousedown', onMouseDown);
            elementMouseEl.removeEventListener('mousemove', onMouseMove);
            elementMouseEl.removeEventListener('mouseup', onMouseUp);
        };
    }, [editor.path, state, root, editor.readOnly]);
    const onClose = () => {
        setState({
            origin: [0, 0],
            coords: [0, 0],
            selection: false,
        });
    };
    return Object.assign(Object.assign({}, state), { onClose });
};

const SelectionBox = ({ origin, coords, isOpen }) => {
    if (!isOpen)
        return null;
    const getTransform = () => {
        if (origin[1] > coords[1] && origin[0] > coords[0])
            return 'scaleY(-1) scaleX(-1)';
        if (origin[1] > coords[1])
            return 'scaleY(-1)';
        if (origin[0] > coords[0])
            return 'scaleX(-1)';
        return undefined;
    };
    const selectionBoxStyle = {
        zIndex: 10,
        left: origin[0],
        top: origin[1],
        height: Math.abs(coords[1] - origin[1] - 1),
        width: Math.abs(coords[0] - origin[0] - 1),
        userSelect: 'none',
        transformOrigin: 'top left',
        transform: getTransform(),
        position: 'fixed',
        backgroundColor: 'rgba(35, 131, 226, 0.14)',
    };
    return jsx("div", { style: selectionBoxStyle });
};

const DEFAULT_SELECTION_STATE = {
    selectionStarted: false,
    indexToSelect: null,
    startedIndexToSelect: null,
};
function useMultiSelection({ editor }) {
    const isMultiSelectingStarted = useRef(false);
    const isMultiSelectingInProgress = useRef(false);
    const startBlockPathRef = useRef(null);
    const currentBlockPathRef = useRef(null);
    let selectionState = useRef(DEFAULT_SELECTION_STATE).current;
    const blurSlateSelection = () => {
        const path = editor.path.current;
        if (typeof path === 'number') {
            const slate = Blocks.getBlockSlate(editor, { at: path });
            const block = Blocks.getBlock(editor, { at: path });
            const blockEntity = editor.blocks[(block === null || block === void 0 ? void 0 : block.type) || ''];
            if (!slate || (blockEntity === null || blockEntity === void 0 ? void 0 : blockEntity.hasCustomEditor))
                return;
            try {
                Editor$1.withoutNormalizing(slate, () => {
                    // [TEST]
                    Transforms.select(slate, [0]);
                    if (slate.selection && Range.isExpanded(slate.selection)) {
                        ReactEditor.blur(slate);
                        ReactEditor.deselect(slate);
                    }
                });
            }
            catch (error) { }
        }
    };
    const onShiftKeyDown = (blockOrder) => {
        blurSlateSelection();
        const currentSelectionIndex = Paths.getPath(editor);
        if (typeof currentSelectionIndex !== 'number')
            return;
        const indexesBetween = Array.from({ length: Math.abs(blockOrder - currentSelectionIndex) }).map((_, index) => blockOrder > currentSelectionIndex ? currentSelectionIndex + index + 1 : currentSelectionIndex - index - 1);
        editor.setPath({ current: blockOrder, selected: [...indexesBetween, currentSelectionIndex] });
    };
    const onMouseDown = (e) => {
        if (editor.readOnly)
            return;
        if (!editor.isFocused())
            editor.focus();
        editor.batchOperations(() => {
            var _a, _b, _c;
            const selectedBlocks = Paths.getSelectedPaths(editor);
            // [TEST]
            if (Array.isArray(selectedBlocks) && selectedBlocks.length > 0 && !e.shiftKey && !e.altKey) {
                editor.setPath({ current: null });
            }
            const target = e.target;
            const blockElement = target.closest('[data-yoopta-block]');
            if (blockElement && e.button === 0) {
                const blockId = blockElement.getAttribute('data-yoopta-block-id') || '';
                const blockOrder = (_a = editor.children[blockId]) === null || _a === void 0 ? void 0 : _a.meta.order;
                if (typeof blockOrder === 'number') {
                    isMultiSelectingStarted.current = true;
                    startBlockPathRef.current = blockOrder;
                    currentBlockPathRef.current = blockOrder;
                    if (e.shiftKey && !Paths.isPathEmpty(editor) && blockOrder !== editor.path.current) {
                        onShiftKeyDown(blockOrder);
                        return;
                    }
                    if (blockOrder !== editor.path.current) {
                        editor.setPath({ current: blockOrder });
                    }
                    (_b = editor.refElement) === null || _b === void 0 ? void 0 : _b.addEventListener('mousemove', onMouseMove);
                    (_c = editor.refElement) === null || _c === void 0 ? void 0 : _c.addEventListener('mouseup', onMouseUp);
                    document === null || document === void 0 ? void 0 : document.addEventListener('mouseup', onMouseUp);
                }
            }
        });
    };
    const onMouseMove = (e) => {
        if (!isMultiSelectingStarted.current || editor.readOnly)
            return;
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const blockElement = target === null || target === void 0 ? void 0 : target.closest('[data-yoopta-block]');
        if (blockElement) {
            editor.batchOperations(() => {
                var _a;
                const blockId = blockElement.getAttribute('data-yoopta-block-id') || '';
                const blockOrder = (_a = editor.children[blockId]) === null || _a === void 0 ? void 0 : _a.meta.order;
                // When multi-selecting is started and the mouse is moving over the start block
                if (isMultiSelectingInProgress.current &&
                    typeof blockOrder === 'number' &&
                    blockOrder === startBlockPathRef.current) {
                    currentBlockPathRef.current = blockOrder;
                    editor.setPath({ current: blockOrder, selected: [blockOrder] });
                    return;
                }
                // Multi-selecting started between blocks
                if (typeof blockOrder === 'number' && blockOrder !== currentBlockPathRef.current) {
                    currentBlockPathRef.current = blockOrder;
                    isMultiSelectingInProgress.current = true;
                    const start = Math.min(startBlockPathRef.current, blockOrder);
                    const end = Math.max(startBlockPathRef.current, blockOrder);
                    blurSlateSelection();
                    const selectedBlocks = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                    editor.setPath({ current: blockOrder, selected: selectedBlocks });
                }
            });
        }
    };
    const onMouseUp = () => {
        var _a, _b;
        isMultiSelectingStarted.current = false;
        isMultiSelectingInProgress.current = false;
        startBlockPathRef.current = null;
        currentBlockPathRef.current = null;
        (_a = editor.refElement) === null || _a === void 0 ? void 0 : _a.removeEventListener('mousemove', onMouseMove);
        (_b = editor.refElement) === null || _b === void 0 ? void 0 : _b.removeEventListener('mouseup', onMouseUp);
        document === null || document === void 0 ? void 0 : document.removeEventListener('mouseup', onMouseUp);
    };
    const onShiftArrowUp = (event) => {
        if (typeof event.isDefaultPrevented === 'function' && event.isDefaultPrevented())
            return;
        if (selectionState.selectionStarted &&
            selectionState.startedIndexToSelect !== null &&
            selectionState.indexToSelect !== null) {
            const currentIndex = selectionState.indexToSelect;
            const nextTopIndex = currentIndex - 1;
            if (currentIndex === 0)
                return;
            // jump to next index if started selection from this index
            if (currentIndex === selectionState.startedIndexToSelect) {
                const selectedPaths = editor.path.selected ? [...editor.path.selected, nextTopIndex] : [nextTopIndex];
                editor.setPath({ current: nextTopIndex, selected: selectedPaths });
                selectionState.indexToSelect = nextTopIndex;
                return;
            }
            if (nextTopIndex < selectionState.startedIndexToSelect) {
                const selectedPaths = editor.path.selected ? [...editor.path.selected, nextTopIndex] : [nextTopIndex];
                editor.setPath({ current: nextTopIndex, selected: selectedPaths });
                selectionState.indexToSelect = nextTopIndex;
                return;
            }
            const selectedBlocks = Paths.getSelectedPaths(editor);
            if ((selectedBlocks === null || selectedBlocks === void 0 ? void 0 : selectedBlocks.includes(currentIndex)) && currentIndex !== selectionState.startedIndexToSelect) {
                const filteredIndexes = selectedBlocks.filter((index) => index !== currentIndex);
                editor.setPath({ current: nextTopIndex, selected: filteredIndexes });
                selectionState.indexToSelect = nextTopIndex;
                return;
            }
            return;
        }
        const block = findPluginBlockByPath(editor);
        const slate = findSlateBySelectionPath(editor);
        if (!slate || !slate.selection || !block)
            return;
        const parentPath = Path.parent(slate.selection.anchor.path);
        // [TODO] - handle cases for inline node elements
        const isStart = Editor$1.isStart(slate, slate.selection.focus, parentPath);
        if (Range.isExpanded(slate.selection) && isStart) {
            const prevPath = getPreviousPath(editor);
            if (typeof prevPath !== 'number')
                return;
            const prevBlock = findPluginBlockByPath(editor, { at: prevPath });
            if (block && prevBlock) {
                event.preventDefault();
                ReactEditor.blur(slate);
                ReactEditor.deselect(slate);
                Transforms.deselect(slate);
                const selectedPaths = editor.path.selected
                    ? [...editor.path.selected, block === null || block === void 0 ? void 0 : block.meta.order, block.meta.order - 1]
                    : [block === null || block === void 0 ? void 0 : block.meta.order, block.meta.order - 1];
                editor.setPath({ current: null, selected: selectedPaths });
                selectionState.startedIndexToSelect = block.meta.order;
                selectionState.indexToSelect = block.meta.order - 1;
                selectionState.selectionStarted = true;
            }
        }
    };
    const onShiftArrowDown = (event) => {
        if (selectionState.selectionStarted &&
            selectionState.indexToSelect !== null &&
            selectionState.startedIndexToSelect !== null) {
            const currentIndex = selectionState.indexToSelect;
            const nextIndex = currentIndex + 1;
            if (nextIndex === Object.keys(editor.children).length)
                return;
            // jump to next index if started selection from this index
            if (currentIndex === selectionState.startedIndexToSelect) {
                const selectedPaths = editor.path.selected ? [...editor.path.selected, nextIndex] : [nextIndex];
                editor.setPath({ current: nextIndex, selected: selectedPaths });
                selectionState.indexToSelect = nextIndex;
                return;
            }
            if (nextIndex > selectionState.startedIndexToSelect) {
                const selectedPaths = editor.path.selected ? [...editor.path.selected, nextIndex] : [nextIndex];
                editor.setPath({ current: nextIndex, selected: selectedPaths });
                selectionState.indexToSelect = nextIndex;
                return;
            }
            const selectedBlocks = Paths.getSelectedPaths(editor);
            if ((selectedBlocks === null || selectedBlocks === void 0 ? void 0 : selectedBlocks.includes(currentIndex)) && currentIndex !== selectionState.startedIndexToSelect) {
                const filteredIndexes = selectedBlocks.filter((index) => index !== currentIndex);
                editor.setPath({ current: nextIndex, selected: filteredIndexes });
                selectionState.indexToSelect = nextIndex;
                return;
            }
            return;
        }
        const block = findPluginBlockByPath(editor);
        const slate = findSlateBySelectionPath(editor);
        if (!slate || !slate.selection || !block)
            return;
        const parentPath = Path.parent(slate.selection.anchor.path);
        // [TODO] - handle cases for inline node elements
        const isEnd = Editor$1.isEnd(slate, slate.selection.focus, parentPath);
        if (Range.isExpanded(slate.selection) && isEnd) {
            const nextPath = Paths.getNextPath(editor);
            const nextBlock = findPluginBlockByPath(editor, { at: nextPath });
            if (block && nextBlock) {
                event.preventDefault();
                ReactEditor.blur(slate);
                ReactEditor.deselect(slate);
                Transforms.deselect(slate);
                const selectedPaths = editor.path.selected
                    ? [...editor.path.selected, block === null || block === void 0 ? void 0 : block.meta.order, (block === null || block === void 0 ? void 0 : block.meta.order) + 1]
                    : [block === null || block === void 0 ? void 0 : block.meta.order, block.meta.order + 1];
                editor.setPath({ current: null, selected: selectedPaths });
                selectionState.startedIndexToSelect = block.meta.order;
                selectionState.indexToSelect = block.meta.order + 1;
                selectionState.selectionStarted = true;
            }
        }
    };
    return { onMouseDown, onShiftArrowUp, onShiftArrowDown, selectionState };
}

const getEditorStyles = (styles) => (Object.assign(Object.assign({}, styles), { width: styles.width || 400, paddingBottom: typeof styles.paddingBottom === 'number' ? styles.paddingBottom : 100 }));
const Editor = ({ placeholder, marks, className, selectionBoxRoot, width, style, children, autoFocus = true, }) => {
    const editor = useYooptaEditor();
    const isReadOnly = useYooptaReadOnly();
    const selectionBox = useRectangeSelectionBox({ editor, root: selectionBoxRoot });
    const multiSelection = useMultiSelection({ editor });
    useEffect(() => {
        if (!autoFocus || isReadOnly)
            return;
        editor.focus();
    }, [autoFocus, isReadOnly]);
    useEffect(() => {
        if (isReadOnly)
            return;
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [editor.path, isReadOnly]);
    const handleEmptyZoneClick = (e) => {
        var _a;
        const editorEl = editor.refElement;
        if (!editorEl)
            return;
        const { bottom } = editorEl.getBoundingClientRect();
        const paddingBottom = parseInt(getComputedStyle(editorEl).paddingBottom, 10);
        const paddingBottomAreaTop = bottom - paddingBottom;
        const defaultBlock = buildBlockData$1({ id: generateId() });
        if (e.clientY >= paddingBottomAreaTop) {
            const lastPath = Object.keys(editor.children).length - 1;
            const lastBlock = findPluginBlockByPath(editor, { at: lastPath });
            const lastSlate = findSlateBySelectionPath(editor, { at: lastPath });
            if (lastBlock && lastSlate && lastSlate.selection) {
                const string = Editor$1.string(lastSlate, lastSlate.selection.anchor.path);
                const parentPath = Path.parent(lastSlate.selection.anchor.path);
                const [lastNode] = Editor$1.node(lastSlate, parentPath);
                if (lastBlock.type === defaultBlock.type &&
                    Element$1.isElement(lastNode) &&
                    ((_a = lastNode.props) === null || _a === void 0 ? void 0 : _a.nodeType) !== 'void' &&
                    string.trim().length === 0) {
                    editor.focusBlock(lastBlock.id, { slate: lastSlate });
                    return;
                }
            }
            const nextPath = lastPath + 1;
            editor.insertBlock(defaultBlock.type, { at: nextPath, focus: true });
        }
    };
    const resetSelectionState = () => {
        multiSelection.selectionState.indexToSelect = null;
        multiSelection.selectionState.startedIndexToSelect = null;
        multiSelection.selectionState.selectionStarted = false;
    };
    const onMouseDown = (event) => {
        if (isReadOnly)
            return;
        multiSelection.onMouseDown(event);
        resetSelectionState();
        handleEmptyZoneClick(event);
    };
    const onBlur = (event) => {
        var _a;
        const isInsideEditor = (_a = editor.refElement) === null || _a === void 0 ? void 0 : _a.contains(event.relatedTarget);
        if (isInsideEditor || isReadOnly)
            return;
        resetSelectionState();
        const selectedBlocks = Paths.getSelectedPaths(editor);
        if (Array.isArray(selectedBlocks) && selectedBlocks.length > 0) {
            editor.setPath({ current: null, selected: null });
        }
    };
    const onKeyDown = (event) => {
        if (isReadOnly)
            return;
        if (HOTKEYS.isRedo(event)) {
            event.preventDefault();
            editor.redo();
            return;
        }
        if (HOTKEYS.isUndo(event)) {
            event.preventDefault();
            editor.undo();
            return;
        }
        if (HOTKEYS.isSelect(event)) {
            const selectedBlocks = Paths.getSelectedPaths(editor);
            const isAllBlocksSelected = (selectedBlocks === null || selectedBlocks === void 0 ? void 0 : selectedBlocks.length) === Object.keys(editor.children).length;
            if (isAllBlocksSelected) {
                event.preventDefault();
                return;
            }
            if (Array.isArray(selectedBlocks) && selectedBlocks.length > 0) {
                event.preventDefault();
                const allBlockIndexes = Object.keys(editor.children).map((k, i) => i);
                editor.setPath({ current: null, selected: allBlockIndexes });
                return;
            }
        }
        if (HOTKEYS.isCopy(event) || HOTKEYS.isCut(event)) {
            const selectedBlocks = Paths.getSelectedPaths(editor);
            if (Array.isArray(selectedBlocks) && selectedBlocks.length > 0) {
                event.preventDefault();
                const htmlString = editor.getHTML(editor.getEditorValue());
                const textString = editor.getPlainText(editor.getEditorValue());
                const htmlBlob = new Blob([htmlString], { type: 'text/html' });
                const textBlob = new Blob([textString], { type: 'text/plain' });
                const clipboardItem = new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob,
                });
                navigator.clipboard.write([clipboardItem]).then(() => {
                    const html = new DOMParser().parseFromString(htmlString, 'text/html');
                    console.log('HTML copied\n', html.body);
                });
                if (HOTKEYS.isCut(event)) {
                    // [TEST]
                    editor.batchOperations(() => {
                        const selectedBlocks = Paths.getSelectedPaths(editor);
                        if (Array.isArray(selectedBlocks) && selectedBlocks.length > 0) {
                            const isAllBlocksSelected = selectedBlocks.length === Object.keys(editor.children).length;
                            selectedBlocks.forEach((index) => {
                                var _a;
                                const blockId = (_a = Blocks.getBlock(editor, { at: index })) === null || _a === void 0 ? void 0 : _a.id;
                                if (blockId)
                                    editor.deleteBlock({ blockId });
                            });
                            if (isAllBlocksSelected) {
                                const defaultBlock = buildBlockData$1({ id: generateId() });
                                editor.insertBlock(defaultBlock.type, { at: 0, focus: true });
                            }
                        }
                    });
                    editor.setPath({ current: null, selected: null });
                    resetSelectionState();
                }
                return;
            }
        }
        if (HOTKEYS.isBackspace(event)) {
            event.stopPropagation();
            const selectedBlocks = Paths.getSelectedPaths(editor);
            const isAllBlocksSelected = (selectedBlocks === null || selectedBlocks === void 0 ? void 0 : selectedBlocks.length) === Object.keys(editor.children).length;
            if (isAllBlocksSelected) {
                event.preventDefault();
                // [TEST]
                editor.batchOperations(() => {
                    const allBlocks = Object.keys(editor.children);
                    allBlocks.forEach((blockId) => editor.deleteBlock({ blockId }));
                    editor.setPath({ current: null, selected: null });
                    resetSelectionState();
                });
                return;
            }
            // [TEST]
            editor.batchOperations(() => {
                const selectedBlocks = Paths.getSelectedPaths(editor);
                if (Array.isArray(selectedBlocks) && (selectedBlocks === null || selectedBlocks === void 0 ? void 0 : selectedBlocks.length) > 0) {
                    event.preventDefault();
                    selectedBlocks.forEach((index) => editor.deleteBlock({ at: index }));
                    editor.setPath({ current: null, selected: null });
                    resetSelectionState();
                }
            });
            return;
        }
        // [TODO] - handle sharing cursor between blocks
        if (HOTKEYS.isShiftArrowUp(event)) {
            multiSelection.onShiftArrowUp(event);
        }
        if (HOTKEYS.isShiftArrowDown(event)) {
            multiSelection.onShiftArrowDown(event);
        }
        if (HOTKEYS.isTab(event)) {
            const selectedBlocks = Paths.getSelectedPaths(editor);
            if (Array.isArray(selectedBlocks) && selectedBlocks.length > 0) {
                event.preventDefault();
                editor.batchOperations(() => {
                    selectedBlocks.forEach((index) => {
                        const block = Blocks.getBlock(editor, { at: index });
                        editor.increaseBlockDepth({ blockId: block === null || block === void 0 ? void 0 : block.id });
                    });
                });
            }
            return;
        }
        if (HOTKEYS.isShiftTab(event)) {
            const selectedBlocks = Paths.getSelectedPaths(editor);
            if (Array.isArray(selectedBlocks) && selectedBlocks.length > 0) {
                event.preventDefault();
                editor.batchOperations(() => {
                    selectedBlocks.forEach((index) => {
                        const block = Blocks.getBlock(editor, { at: index });
                        editor.decreaseBlockDepth({ blockId: block === null || block === void 0 ? void 0 : block.id });
                    });
                });
            }
            return;
        }
    };
    // This event handler will be fired only in read-only mode
    const onCopy = (e) => {
        if (!isReadOnly)
            return;
        const clipboardData = e.clipboardData;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (range.collapsed)
                return;
            const clonedContent = range.cloneContents();
            const blocksEl = clonedContent.querySelectorAll('[data-yoopta-block-id]');
            if (!blocksEl.length)
                return;
            const content = Array.from(blocksEl).reduce((acc, blockEl) => {
                const blockId = blockEl.getAttribute('data-yoopta-block-id') || '';
                const block = editor.children[blockId];
                if (block)
                    acc[blockId] = block;
                return acc;
            }, {});
            const htmlString = editor.getHTML(content);
            const textString = editor.getPlainText(content);
            clipboardData.setData('text/html', htmlString);
            clipboardData.setData('text/plain', textString);
            return;
        }
    };
    const editorStyles = getEditorStyles(Object.assign(Object.assign({}, style), { userSelect: selectionBox.selection ? 'none' : 'auto', pointerEvents: selectionBox.selection ? 'none' : 'auto', width: width || (style === null || style === void 0 ? void 0 : style.width), paddingBottom: style === null || style === void 0 ? void 0 : style.paddingBottom }));
    return (jsxs("div", Object.assign({ ref: (ref) => (editor.refElement = ref), className: className ? `yoopta-editor ${className}` : 'yoopta-editor', style: editorStyles, onMouseDown: onMouseDown, onBlur: onBlur, onCopy: onCopy, onCut: onCopy }, { children: [jsx(RenderBlocks, { editor: editor, marks: marks, placeholder: placeholder }), selectionBoxRoot !== false && (jsx(SelectionBox, { origin: selectionBox.origin, coords: selectionBox.coords, isOpen: selectionBox.selection && !isReadOnly })), children] })));
};

function getValue(editor, type) {
    const slate = findSlateBySelectionPath(editor);
    if (!slate)
        return null;
    const marks = Editor$1.marks(slate);
    return marks === null || marks === void 0 ? void 0 : marks[type];
}

function isActive(editor, type) {
    const slate = findSlateBySelectionPath(editor);
    if (!slate)
        return false;
    const marks = Editor$1.marks(slate);
    return !!(marks === null || marks === void 0 ? void 0 : marks[type]);
}

// [TODO] - check format argument
function toggle(editor, type) {
    const slate = findSlateBySelectionPath(editor);
    const active = isActive(editor, type);
    if (!slate)
        return;
    if (!active) {
        Editor$1.addMark(slate, type, true);
    }
    else {
        Editor$1.removeMark(slate, type);
    }
    // editor.emit('change', { value: editor.children, operations: [] });
}

function update(editor, type, value) {
    const slate = findSlateBySelectionPath(editor);
    if (!slate || !slate.selection)
        return;
    if (Range.isExpanded(slate.selection)) {
        Editor$1.addMark(slate, type, value);
        // editor.emit('change', { value: editor.children, operations: [] });
    }
}

function buildMarks(editor, marks) {
    const formats = {};
    marks.forEach((mark) => {
        const type = mark.type;
        formats[type] = {
            hotkey: mark.hotkey,
            type,
            getValue: () => getValue(editor, type),
            isActive: () => isActive(editor, type),
            toggle: () => toggle(editor, type),
            update: (props) => update(editor, type, props),
        };
    });
    return formats;
}
function buildBlocks(editor, plugins) {
    const blocks = {};
    plugins.forEach((plugin) => {
        var _a;
        const rootBlockElement = getRootBlockElement(plugin.elements);
        const nodeType = (_a = rootBlockElement === null || rootBlockElement === void 0 ? void 0 : rootBlockElement.props) === null || _a === void 0 ? void 0 : _a.nodeType;
        const isInline = nodeType === 'inline' || nodeType === 'inlineVoid';
        if (!isInline) {
            const elements = {};
            Object.keys(plugin.elements).forEach((key) => {
                const _a = plugin.elements[key], element = __rest(_a, ["render"]);
                elements[key] = element;
            });
            // Omit fetchers and other non-block related options
            const { display, placeholder, shortcuts } = plugin.options || {};
            blocks[plugin.type] = {
                type: plugin.type,
                elements,
                hasCustomEditor: !!plugin.customEditor,
                options: {
                    display,
                    placeholder,
                    shortcuts,
                },
                isActive: () => {
                    const block = findPluginBlockByPath(editor, { at: editor.path.current });
                    return (block === null || block === void 0 ? void 0 : block.type) === plugin.type;
                },
            };
        }
    });
    return blocks;
}
function buildBlockSlateEditors(editor) {
    const blockEditorsMap = {};
    Object.keys(editor.children).forEach((id) => {
        const slate = buildSlateEditor(editor);
        if (slate.children.length === 0) {
            const block = editor.children[id];
            if (block) {
                const slateStructure = buildBlockElementsStructure(editor, block.type);
                slate.children = [slateStructure];
            }
        }
        blockEditorsMap[id] = slate;
    });
    return blockEditorsMap;
}
function buildBlockShortcuts(editor) {
    const shortcuts = {};
    Object.values(editor.blocks).forEach((block) => {
        var _a, _b, _c, _d;
        const hasShortcuts = block.options && Array.isArray((_a = block.options) === null || _a === void 0 ? void 0 : _a.shortcuts) && ((_b = block.options) === null || _b === void 0 ? void 0 : _b.shortcuts.length) > 0;
        if (hasShortcuts) {
            (_d = (_c = block.options) === null || _c === void 0 ? void 0 : _c.shortcuts) === null || _d === void 0 ? void 0 : _d.forEach((shortcut) => {
                shortcuts[shortcut] = block;
            });
        }
    });
    return shortcuts;
}
// const DEFAULT_PLUGIN_OPTIONS: PluginOptions = {};
function buildPlugins(plugins) {
    const pluginsMap = {};
    const inlineTopLevelPlugins = {};
    plugins.forEach((plugin) => {
        if (plugin.elements) {
            Object.keys(plugin.elements).forEach((type) => {
                var _a;
                const element = plugin.elements[type];
                const nodeType = (_a = element.props) === null || _a === void 0 ? void 0 : _a.nodeType;
                if (nodeType === 'inline' || nodeType === 'inlineVoid') {
                    inlineTopLevelPlugins[type] = Object.assign(Object.assign({}, element), { rootPlugin: plugin.type });
                }
            });
        }
        pluginsMap[plugin.type] = plugin;
    });
    plugins.forEach((plugin) => {
        if (plugin.elements) {
            const elements = Object.assign(Object.assign({}, plugin.elements), inlineTopLevelPlugins);
            pluginsMap[plugin.type] = Object.assign(Object.assign({}, plugin), { elements });
        }
    });
    return pluginsMap;
}
function buildCommands(editor, plugins) {
    const commands = {};
    plugins.forEach((plugin) => {
        if (plugin.commands) {
            Object.keys(plugin.commands).forEach((command) => {
                var _a;
                if ((_a = plugin.commands) === null || _a === void 0 ? void 0 : _a[command]) {
                    commands[command] = (...args) => { var _a; return (_a = plugin.commands) === null || _a === void 0 ? void 0 : _a[command](editor, ...args); };
                }
            });
        }
    });
    return commands;
}

function createYooptaMark({ type, hotkey, render }) {
    return {
        type,
        hotkey,
        render,
    };
}

const FakeSelectionMark = createYooptaMark({
    type: 'fakeSelection',
    render: (props) => {
        return jsx("span", Object.assign({ style: { backgroundColor: '#d7e6fa' } }, { children: props.children }));
    },
});

const YooptaEditor = ({ id, editor, value, marks: marksProps, plugins: pluginsProps, autoFocus, className, tools, selectionBoxRoot, children, placeholder, readOnly, width, style, onChange, onPathChange, }) => {
    const marks = useMemo(() => {
        if (marksProps)
            return [FakeSelectionMark, ...marksProps];
        return [FakeSelectionMark];
    }, [marksProps]);
    const plugins = useMemo(() => {
        return pluginsProps.map((plugin) => plugin.getPlugin);
    }, [pluginsProps]);
    const [editorState, setEditorState] = useState(() => {
        if (!editor.id)
            editor.id = id || generateId();
        editor.readOnly = readOnly || false;
        if (marks)
            editor.formats = buildMarks(editor, marks);
        editor.blocks = buildBlocks(editor, plugins);
        const isValueValid = validateYooptaValue(value);
        if (!isValueValid && typeof value !== 'undefined') {
            // [TODO] - add link to documentation
            console.error(`Initial value is not valid. Should be an object with blocks. You passed: ${JSON.stringify(value)}`);
        }
        editor.children = (isValueValid ? value : {});
        editor.blockEditorsMap = buildBlockSlateEditors(editor);
        editor.shortcuts = buildBlockShortcuts(editor);
        editor.plugins = buildPlugins(plugins);
        editor.commands = buildCommands(editor, plugins);
        return { editor, version: 0 };
    });
    const [_, setStatePath] = useState(null);
    const onEditorPathChange = useCallback((path) => {
        setStatePath(path);
        onPathChange === null || onPathChange === void 0 ? void 0 : onPathChange(path);
    }, []);
    const onValueChange = useCallback((value, options) => {
        setEditorState((prevState) => ({
            editor: prevState.editor,
            version: prevState.version + 1,
        }));
        if (typeof onChange === 'function' && Array.isArray(options.operations)) {
            const operations = options.operations.filter((operation) => operation.type !== 'validate_block_paths' &&
                operation.type !== 'set_block_path' &&
                operation.type !== 'set_slate');
            if (operations.length > 0)
                onChange(value, { operations });
        }
    }, []);
    useEffect(() => {
        const changeHandler = (options) => {
            onValueChange(options.value, { operations: options.operations });
        };
        editor.on('change', changeHandler);
        editor.on('path-change', onEditorPathChange);
        return () => {
            editor.off('change', changeHandler);
            editor.off('path-change', onEditorPathChange);
        };
    }, [editor, onValueChange]);
    return (jsx(YooptaContextProvider, Object.assign({ editorState: editorState }, { children: jsx(ToolsProvider, Object.assign({ tools: tools }, { children: jsx(Editor, Object.assign({ placeholder: placeholder, marks: marks, autoFocus: autoFocus, className: className, selectionBoxRoot: selectionBoxRoot, width: width, style: style }, { children: children })) })) })));
};

const ExtendedBlockActions = ({ id, className, style, onClick, children }) => {
    const isReadOnly = useYooptaReadOnly();
    const [isBlockOptionsOpen, setIsBlockOptionsOpen] = useState(false);
    const { refs: blockOptionRefs, floatingStyles: blockOptionFloatingStyles, context, } = useFloating({
        placement: 'bottom-start',
        open: isBlockOptionsOpen,
        onOpenChange: setIsBlockOptionsOpen,
        middleware: [inline(), flip(), shift(), offset(10)],
        whileElementsMounted: autoUpdate,
    });
    const { isMounted, styles: blockOptionsTransitionStyles } = useTransitionStyles(context, {
        duration: 100,
    });
    const onDotsClick = () => {
        onClick === null || onClick === void 0 ? void 0 : onClick();
        setIsBlockOptionsOpen(true);
    };
    const blockOptionsStyle = Object.assign(Object.assign({}, blockOptionsTransitionStyles), blockOptionFloatingStyles);
    if (isReadOnly)
        return null;
    return (jsxs(Fragment, { children: [isMounted && (jsx(BlockOptions, Object.assign({ isOpen: true, onClose: () => setIsBlockOptionsOpen(false), refs: blockOptionRefs, style: blockOptionsStyle }, { children: children }))), jsx("button", Object.assign({ type: "button", contentEditable: false, ref: blockOptionRefs.setReference, id: id, className: `yoopta-button yoopta-extended-block-actions ${className || ''}`, onClick: onDotsClick, style: isBlockOptionsOpen ? Object.assign(Object.assign({}, style), { opacity: 1 }) : style }, { children: jsx(DotsHorizontalIcon, {}) }))] }));
};

const UI = Object.assign(Object.assign({}, BlockOptionsUI), { ExtendedBlockActions,
    Portal,
    Overlay });

// [TODO] - Move to @yoopta/utils or @yoopta/editor/utils
// helpers for deserializing text nodes when you use custom parsers in your plugins
function deserializeTextNodes(editor, nodes) {
    var _a;
    const deserializedNodes = [];
    nodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            deserializedNodes.push({
                text: node.textContent || '',
            });
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            // [TODO] - Hmmmm
            if (element.nodeName === 'P' || element.nodeName === 'SPAN' || element.nodeName === 'DIV') {
                deserializedNodes.push(Object.assign({}, deserializeTextNodes(editor, element.childNodes)[0]));
            }
            if (element.nodeName === 'B' || element.nodeName === 'STRONG') {
                deserializedNodes.push(Object.assign({ 
                    // @ts-ignore [FIXME] - Fix types
                    bold: true }, deserializeTextNodes(editor, element.childNodes)[0]));
            }
            if (element.nodeName === 'I' || element.nodeName === 'EM') {
                deserializedNodes.push(Object.assign({ 
                    // @ts-ignore [FIXME] - Fix types
                    italic: true }, deserializeTextNodes(editor, element.childNodes)[0]));
            }
            if (element.nodeName === 'S' || element.nodeName === 'STRIKE') {
                deserializedNodes.push(Object.assign({ 
                    // @ts-ignore [FIXME] - Fix types
                    strike: true }, deserializeTextNodes(editor, element.childNodes)[0]));
            }
            if (element.nodeName === 'U' || element.nodeName === 'INS') {
                deserializedNodes.push(Object.assign({ 
                    // @ts-ignore [FIXME] - Fix types
                    underline: true }, deserializeTextNodes(editor, element.childNodes)[0]));
            }
            if (element.nodeName === 'CODE') {
                deserializedNodes.push(Object.assign({ 
                    // @ts-ignore [FIXME] - Fix types
                    code: true }, deserializeTextNodes(editor, element.childNodes)[0]));
            }
            if (element.nodeName === 'MARK') {
                const color = element.style.color;
                const backgroundColor = element.style.backgroundColor || 'transparent';
                deserializedNodes.push(Object.assign({ 
                    // @ts-ignore [FIXME] - Fix types
                    highlight: { color: color, backgroundColor: backgroundColor } }, deserializeTextNodes(editor, element.childNodes)[0]));
            }
            if (element.nodeName === 'A') {
                deserializedNodes.push({
                    id: generateId(),
                    type: 'link',
                    props: {
                        url: element.getAttribute('href') || '',
                        target: element.getAttribute('target') || '',
                        rel: element.getAttribute('rel') || '',
                    },
                    children: deserializeTextNodes(editor, element.childNodes),
                });
            }
        }
    });
    // @ts-ignore [FIXME] - Fix types
    if (deserializedNodes.length === 0 && !((_a = deserializedNodes[0]) === null || _a === void 0 ? void 0 : _a.text)) {
        deserializedNodes.push({ text: '' });
    }
    return deserializedNodes;
}

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = ".yoo-editor-z-\\[100\\]{z-index:100}.yoo-editor-mr-2{margin-right:.5rem}.yoo-editor-h-4{height:1rem}.yoo-editor-w-4{width:1rem}.yoopta-editor *{border:0 solid #e5e7eb;box-sizing:border-box;scrollbar-color:#d3d1cb transparent}::-moz-selection{background:#c6ddf8}::selection{background:#c6ddf8}.yoopta-placeholder{display:contents;position:relative}.yoopta-placeholder:after{color:inherit;content:attr(data-placeholder);font-size:75%;font-style:inherit;font-weight:inherit;opacity:.5;padding-left:5px;position:absolute;text-indent:2px;top:50%;transform:translateY(-50%);-webkit-user-select:none;-moz-user-select:none;user-select:none}.yoopta-button{background-color:transparent;border-style:none;cursor:pointer}.yoopta-block{border-radius:.25rem;margin-bottom:1px;margin-top:2px;padding:0 2px;position:relative}.yoopta-selection-block:before{background-color:#2383e224;border-radius:4px;content:\"\";content:var(--tw-content);height:100%;inset:0;opacity:0;pointer-events:none;position:absolute;transition-duration:.2s;transition-property:opacity;transition-timing-function:cubic-bezier(.4,0,.2,1);width:100%;z-index:1}.yoopta-selection-block[data-block-selected=true]:before{background-color:#2383e224;opacity:1}.yoopta-block-actions{pointer-events:none}.yoopta-block-action-buttons{display:flex;pointer-events:auto}.yoopta-block-actions-plus{align-items:center;background-color:inherit;background-color:transparent;border-radius:6px;border-style:none;color:#37352f59;cursor:pointer;display:flex;height:24px;justify-content:center;margin:0 1px;padding:0;position:relative;transition-duration:.18s;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);width:24px}.yoopta-block-actions-plus:active,.yoopta-block-actions-plus:focus,.yoopta-block-actions-plus:hover{background-color:#37362f14}.yoopta-block-actions-drag{align-items:center;background-color:inherit;background-color:transparent;border-radius:6px;border-style:none;color:#37352f59;cursor:pointer;display:flex;height:24px;justify-content:center;margin:0 1px;padding:0;position:relative;transition-duration:.18s;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);width:18px}.yoopta-block-actions-drag:active,.yoopta-block-actions-drag:focus,.yoopta-block-actions-drag:hover{background-color:#37362f14}.yoopta-slate:focus{outline:2px solid transparent;outline-offset:2px}.yoopta-slate:focus-visible{outline:2px solid transparent;outline-offset:2px}.yoopta-block-options-button{background-color:transparent;border-radius:.125rem;border-style:none;cursor:pointer;display:flex;justify-content:flex-start;line-height:120%;margin-left:4px;margin-right:4px;padding:.375rem .5rem;width:100%}.yoopta-block-options-button:hover{background-color:#37352f14}.yoopta-block-options-item{align-items:center;cursor:default;display:flex;font-size:.875rem;line-height:1.25rem;outline:2px solid transparent;outline-offset:2px;position:relative;transition-duration:.15s;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);-webkit-user-select:none;-moz-user-select:none;user-select:none}.yoopta-block-options-item[data-disabled]{opacity:.5;pointer-events:none}.yoopta-extended-block-actions{--tw-bg-opacity:1;align-items:center;background-color:rgb(238 238 238/var(--tw-bg-opacity));border-radius:2px;border-style:none;cursor:pointer;display:flex;height:22px;justify-content:space-between;opacity:1;padding:0 4px;position:absolute;right:8px;top:8px;transition-duration:.15s;transition-property:opacity;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-timing-function:cubic-bezier(.4,0,1,1);width:22px;z-index:10}.yoopta-block-options-separator{background-color:#37352f14;height:1px;margin-bottom:4px;margin-top:4px;width:100%}.yoopta-block-options-menu-content{--tw-border-opacity:1;--tw-bg-opacity:1;--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);background-color:rgb(255 255 255/var(--tw-bg-opacity));border-color:rgb(229 231 235/var(--tw-border-opacity));border-radius:.375rem;border-style:solid;border-width:1px;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);min-width:200px;overflow:hidden;padding:6px 0;position:relative;width:auto}.yoopta-block-options-group{display:flex;flex-direction:column}.yoopta-align-left{justify-content:flex-start;text-align:left}.yoopta-align-center{justify-content:center;text-align:center}.yoopta-align-right{justify-content:flex-end;text-align:right}";
styleInject(css_248z);

export { Blocks, Elements, HOTKEYS, Paths, UI, YooptaPlugin, buildBlockData$1 as buildBlockData, buildBlockElement$1 as buildBlockElement, buildBlockElementsStructure, buildSlateEditor, createYooptaEditor, createYooptaMark, YooptaEditor as default, deserializeHTML, deserializeTextNodes, findPluginBlockByPath, findSlateBySelectionPath, generateId, getRootBlockElement, getRootBlockElementType, serializeTextNodes, serializeTextNodesIntoMarkdown, useBlockData, useBlockSelected, useYooptaEditor, useYooptaFocused, useYooptaPluginOptions, useYooptaReadOnly, useYooptaTools };
//# sourceMappingURL=index.js.map
