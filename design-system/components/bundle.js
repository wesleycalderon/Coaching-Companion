/* @ds-bundle: {"format": 4, "namespace": "BTSStudio", "components": [{"name": "StatusBadge"}, {"name": "ProgressBadge"}, {"name": "EventBadge"}, {"name": "TagBadge"}, {"name": "RoleBadge"}, {"name": "CountBadge"}, {"name": "DurationBadge"}, {"name": "StatusPill"}, {"name": "Tabs"}, {"name": "ChoiceChips"}, {"name": "Select"}, {"name": "Combobox"}, {"name": "MultiCombobox"}, {"name": "LanguageDropdown"}, {"name": "RowActions"}, {"name": "DropdownButton"}, {"name": "Drawer"}, {"name": "AnimatedDrawer"}, {"name": "PublishDialog"}, {"name": "ToastProvider"}]} */
/* BTS Studio components, compiled from bundle/src/components/bts. Reads window.React and window.ReactDOM; clsx, tailwind-merge and the lucide-react icons it uses are bundled in. */
var BTSStudio = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // shim.js
  var React;
  var init_shim = __esm({
    "shim.js"() {
      React = window.React;
    }
  });

  // g:react
  var require_react = __commonJS({
    "g:react"(exports, module) {
      init_shim();
      module.exports = window.React;
    }
  });

  // g:react-dom
  var require_react_dom = __commonJS({
    "g:react-dom"(exports, module) {
      init_shim();
      module.exports = window.ReactDOM;
    }
  });

  // entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    AnimatedDrawer: () => AnimatedDrawer,
    ChoiceChips: () => ChoiceChips,
    Combobox: () => Combobox,
    CountBadge: () => CountBadge,
    Drawer: () => Drawer,
    DropdownButton: () => DropdownButton,
    DurationBadge: () => DurationBadge,
    EventBadge: () => EventBadge,
    Icons: () => Icons,
    LanguageDropdown: () => LanguageDropdown,
    MultiCombobox: () => MultiCombobox,
    ProgressBadge: () => ProgressBadge,
    PublishDialog: () => PublishDialog,
    RoleBadge: () => RoleBadge,
    RowActions: () => RowActions,
    Select: () => Select,
    StatusBadge: () => StatusBadge,
    StatusPill: () => StatusPill,
    Tabs: () => Tabs,
    TagBadge: () => TagBadge,
    ToastProvider: () => ToastProvider,
    computeRowActionsMenuPosition: () => computeRowActionsMenuPosition,
    formatDurationMinutes: () => formatDurationMinutes,
    prefersReducedMotion: () => prefersReducedMotion,
    useAnimatedDrawer: () => useAnimatedDrawer,
    useToast: () => useToast
  });
  init_shim();

  // src/components/bts/index.ts
  init_shim();

  // src/components/bts/StatusBadge/StatusBadge.tsx
  init_shim();

  // src/lib/cn.ts
  init_shim();

  // node_modules/clsx/dist/clsx.mjs
  init_shim();
  function r(e) {
    var t, f, n = "";
    if ("string" == typeof e || "number" == typeof e) n += e;
    else if ("object" == typeof e) if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
    } else for (f in e) e[f] && (n && (n += " "), n += f);
    return n;
  }
  function clsx() {
    for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
    return n;
  }

  // node_modules/tailwind-merge/dist/bundle-mjs.mjs
  init_shim();
  var CLASS_PART_SEPARATOR = "-";
  var createClassGroupUtils = (config) => {
    const classMap = createClassMap(config);
    const {
      conflictingClassGroups,
      conflictingClassGroupModifiers
    } = config;
    const getClassGroupId = (className) => {
      const classParts = className.split(CLASS_PART_SEPARATOR);
      if (classParts[0] === "" && classParts.length !== 1) {
        classParts.shift();
      }
      return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className);
    };
    const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
      const conflicts = conflictingClassGroups[classGroupId] || [];
      if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
        return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]];
      }
      return conflicts;
    };
    return {
      getClassGroupId,
      getConflictingClassGroupIds
    };
  };
  var getGroupRecursive = (classParts, classPartObject) => {
    var _a;
    if (classParts.length === 0) {
      return classPartObject.classGroupId;
    }
    const currentClassPart = classParts[0];
    const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
    const classGroupFromNextClassPart = nextClassPartObject ? getGroupRecursive(classParts.slice(1), nextClassPartObject) : void 0;
    if (classGroupFromNextClassPart) {
      return classGroupFromNextClassPart;
    }
    if (classPartObject.validators.length === 0) {
      return void 0;
    }
    const classRest = classParts.join(CLASS_PART_SEPARATOR);
    return (_a = classPartObject.validators.find(({
      validator
    }) => validator(classRest))) == null ? void 0 : _a.classGroupId;
  };
  var arbitraryPropertyRegex = /^\[(.+)\]$/;
  var getGroupIdForArbitraryProperty = (className) => {
    if (arbitraryPropertyRegex.test(className)) {
      const arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1];
      const property = arbitraryPropertyClassName == null ? void 0 : arbitraryPropertyClassName.substring(0, arbitraryPropertyClassName.indexOf(":"));
      if (property) {
        return "arbitrary.." + property;
      }
    }
  };
  var createClassMap = (config) => {
    const {
      theme,
      prefix
    } = config;
    const classMap = {
      nextPart: /* @__PURE__ */ new Map(),
      validators: []
    };
    const prefixedClassGroupEntries = getPrefixedClassGroupEntries(Object.entries(config.classGroups), prefix);
    prefixedClassGroupEntries.forEach(([classGroupId, classGroup]) => {
      processClassesRecursively(classGroup, classMap, classGroupId, theme);
    });
    return classMap;
  };
  var processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
    classGroup.forEach((classDefinition) => {
      if (typeof classDefinition === "string") {
        const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
        classPartObjectToEdit.classGroupId = classGroupId;
        return;
      }
      if (typeof classDefinition === "function") {
        if (isThemeGetter(classDefinition)) {
          processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
          return;
        }
        classPartObject.validators.push({
          validator: classDefinition,
          classGroupId
        });
        return;
      }
      Object.entries(classDefinition).forEach(([key, classGroup2]) => {
        processClassesRecursively(classGroup2, getPart(classPartObject, key), classGroupId, theme);
      });
    });
  };
  var getPart = (classPartObject, path) => {
    let currentClassPartObject = classPartObject;
    path.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
      if (!currentClassPartObject.nextPart.has(pathPart)) {
        currentClassPartObject.nextPart.set(pathPart, {
          nextPart: /* @__PURE__ */ new Map(),
          validators: []
        });
      }
      currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
    });
    return currentClassPartObject;
  };
  var isThemeGetter = (func) => func.isThemeGetter;
  var getPrefixedClassGroupEntries = (classGroupEntries, prefix) => {
    if (!prefix) {
      return classGroupEntries;
    }
    return classGroupEntries.map(([classGroupId, classGroup]) => {
      const prefixedClassGroup = classGroup.map((classDefinition) => {
        if (typeof classDefinition === "string") {
          return prefix + classDefinition;
        }
        if (typeof classDefinition === "object") {
          return Object.fromEntries(Object.entries(classDefinition).map(([key, value]) => [prefix + key, value]));
        }
        return classDefinition;
      });
      return [classGroupId, prefixedClassGroup];
    });
  };
  var createLruCache = (maxCacheSize) => {
    if (maxCacheSize < 1) {
      return {
        get: () => void 0,
        set: () => {
        }
      };
    }
    let cacheSize = 0;
    let cache = /* @__PURE__ */ new Map();
    let previousCache = /* @__PURE__ */ new Map();
    const update = (key, value) => {
      cache.set(key, value);
      cacheSize++;
      if (cacheSize > maxCacheSize) {
        cacheSize = 0;
        previousCache = cache;
        cache = /* @__PURE__ */ new Map();
      }
    };
    return {
      get(key) {
        let value = cache.get(key);
        if (value !== void 0) {
          return value;
        }
        if ((value = previousCache.get(key)) !== void 0) {
          update(key, value);
          return value;
        }
      },
      set(key, value) {
        if (cache.has(key)) {
          cache.set(key, value);
        } else {
          update(key, value);
        }
      }
    };
  };
  var IMPORTANT_MODIFIER = "!";
  var createParseClassName = (config) => {
    const {
      separator,
      experimentalParseClassName
    } = config;
    const isSeparatorSingleCharacter = separator.length === 1;
    const firstSeparatorCharacter = separator[0];
    const separatorLength = separator.length;
    const parseClassName = (className) => {
      const modifiers = [];
      let bracketDepth = 0;
      let modifierStart = 0;
      let postfixModifierPosition;
      for (let index = 0; index < className.length; index++) {
        let currentCharacter = className[index];
        if (bracketDepth === 0) {
          if (currentCharacter === firstSeparatorCharacter && (isSeparatorSingleCharacter || className.slice(index, index + separatorLength) === separator)) {
            modifiers.push(className.slice(modifierStart, index));
            modifierStart = index + separatorLength;
            continue;
          }
          if (currentCharacter === "/") {
            postfixModifierPosition = index;
            continue;
          }
        }
        if (currentCharacter === "[") {
          bracketDepth++;
        } else if (currentCharacter === "]") {
          bracketDepth--;
        }
      }
      const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.substring(modifierStart);
      const hasImportantModifier = baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER);
      const baseClassName = hasImportantModifier ? baseClassNameWithImportantModifier.substring(1) : baseClassNameWithImportantModifier;
      const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : void 0;
      return {
        modifiers,
        hasImportantModifier,
        baseClassName,
        maybePostfixModifierPosition
      };
    };
    if (experimentalParseClassName) {
      return (className) => experimentalParseClassName({
        className,
        parseClassName
      });
    }
    return parseClassName;
  };
  var sortModifiers = (modifiers) => {
    if (modifiers.length <= 1) {
      return modifiers;
    }
    const sortedModifiers = [];
    let unsortedModifiers = [];
    modifiers.forEach((modifier) => {
      const isArbitraryVariant = modifier[0] === "[";
      if (isArbitraryVariant) {
        sortedModifiers.push(...unsortedModifiers.sort(), modifier);
        unsortedModifiers = [];
      } else {
        unsortedModifiers.push(modifier);
      }
    });
    sortedModifiers.push(...unsortedModifiers.sort());
    return sortedModifiers;
  };
  var createConfigUtils = (config) => ({
    cache: createLruCache(config.cacheSize),
    parseClassName: createParseClassName(config),
    ...createClassGroupUtils(config)
  });
  var SPLIT_CLASSES_REGEX = /\s+/;
  var mergeClassList = (classList, configUtils) => {
    const {
      parseClassName,
      getClassGroupId,
      getConflictingClassGroupIds
    } = configUtils;
    const classGroupsInConflict = [];
    const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
    let result = "";
    for (let index = classNames.length - 1; index >= 0; index -= 1) {
      const originalClassName = classNames[index];
      const {
        modifiers,
        hasImportantModifier,
        baseClassName,
        maybePostfixModifierPosition
      } = parseClassName(originalClassName);
      let hasPostfixModifier = Boolean(maybePostfixModifierPosition);
      let classGroupId = getClassGroupId(hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
      if (!classGroupId) {
        if (!hasPostfixModifier) {
          result = originalClassName + (result.length > 0 ? " " + result : result);
          continue;
        }
        classGroupId = getClassGroupId(baseClassName);
        if (!classGroupId) {
          result = originalClassName + (result.length > 0 ? " " + result : result);
          continue;
        }
        hasPostfixModifier = false;
      }
      const variantModifier = sortModifiers(modifiers).join(":");
      const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
      const classId = modifierId + classGroupId;
      if (classGroupsInConflict.includes(classId)) {
        continue;
      }
      classGroupsInConflict.push(classId);
      const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
      for (let i = 0; i < conflictGroups.length; ++i) {
        const group = conflictGroups[i];
        classGroupsInConflict.push(modifierId + group);
      }
      result = originalClassName + (result.length > 0 ? " " + result : result);
    }
    return result;
  };
  function twJoin() {
    let index = 0;
    let argument;
    let resolvedValue;
    let string = "";
    while (index < arguments.length) {
      if (argument = arguments[index++]) {
        if (resolvedValue = toValue(argument)) {
          string && (string += " ");
          string += resolvedValue;
        }
      }
    }
    return string;
  }
  var toValue = (mix) => {
    if (typeof mix === "string") {
      return mix;
    }
    let resolvedValue;
    let string = "";
    for (let k = 0; k < mix.length; k++) {
      if (mix[k]) {
        if (resolvedValue = toValue(mix[k])) {
          string && (string += " ");
          string += resolvedValue;
        }
      }
    }
    return string;
  };
  function createTailwindMerge(createConfigFirst, ...createConfigRest) {
    let configUtils;
    let cacheGet;
    let cacheSet;
    let functionToCall = initTailwindMerge;
    function initTailwindMerge(classList) {
      const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
      configUtils = createConfigUtils(config);
      cacheGet = configUtils.cache.get;
      cacheSet = configUtils.cache.set;
      functionToCall = tailwindMerge;
      return tailwindMerge(classList);
    }
    function tailwindMerge(classList) {
      const cachedResult = cacheGet(classList);
      if (cachedResult) {
        return cachedResult;
      }
      const result = mergeClassList(classList, configUtils);
      cacheSet(classList, result);
      return result;
    }
    return function callTailwindMerge() {
      return functionToCall(twJoin.apply(null, arguments));
    };
  }
  var fromTheme = (key) => {
    const themeGetter = (theme) => theme[key] || [];
    themeGetter.isThemeGetter = true;
    return themeGetter;
  };
  var arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i;
  var fractionRegex = /^\d+\/\d+$/;
  var stringLengths = /* @__PURE__ */ new Set(["px", "full", "screen"]);
  var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
  var lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
  var colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/;
  var shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
  var imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
  var isLength = (value) => isNumber(value) || stringLengths.has(value) || fractionRegex.test(value);
  var isArbitraryLength = (value) => getIsArbitraryValue(value, "length", isLengthOnly);
  var isNumber = (value) => Boolean(value) && !Number.isNaN(Number(value));
  var isArbitraryNumber = (value) => getIsArbitraryValue(value, "number", isNumber);
  var isInteger = (value) => Boolean(value) && Number.isInteger(Number(value));
  var isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
  var isArbitraryValue = (value) => arbitraryValueRegex.test(value);
  var isTshirtSize = (value) => tshirtUnitRegex.test(value);
  var sizeLabels = /* @__PURE__ */ new Set(["length", "size", "percentage"]);
  var isArbitrarySize = (value) => getIsArbitraryValue(value, sizeLabels, isNever);
  var isArbitraryPosition = (value) => getIsArbitraryValue(value, "position", isNever);
  var imageLabels = /* @__PURE__ */ new Set(["image", "url"]);
  var isArbitraryImage = (value) => getIsArbitraryValue(value, imageLabels, isImage);
  var isArbitraryShadow = (value) => getIsArbitraryValue(value, "", isShadow);
  var isAny = () => true;
  var getIsArbitraryValue = (value, label, testValue) => {
    const result = arbitraryValueRegex.exec(value);
    if (result) {
      if (result[1]) {
        return typeof label === "string" ? result[1] === label : label.has(result[1]);
      }
      return testValue(result[2]);
    }
    return false;
  };
  var isLengthOnly = (value) => (
    // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
    // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
    // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
    lengthUnitRegex.test(value) && !colorFunctionRegex.test(value)
  );
  var isNever = () => false;
  var isShadow = (value) => shadowRegex.test(value);
  var isImage = (value) => imageRegex.test(value);
  var getDefaultConfig = () => {
    const colors = fromTheme("colors");
    const spacing = fromTheme("spacing");
    const blur = fromTheme("blur");
    const brightness = fromTheme("brightness");
    const borderColor = fromTheme("borderColor");
    const borderRadius = fromTheme("borderRadius");
    const borderSpacing = fromTheme("borderSpacing");
    const borderWidth = fromTheme("borderWidth");
    const contrast = fromTheme("contrast");
    const grayscale = fromTheme("grayscale");
    const hueRotate = fromTheme("hueRotate");
    const invert = fromTheme("invert");
    const gap = fromTheme("gap");
    const gradientColorStops = fromTheme("gradientColorStops");
    const gradientColorStopPositions = fromTheme("gradientColorStopPositions");
    const inset = fromTheme("inset");
    const margin = fromTheme("margin");
    const opacity = fromTheme("opacity");
    const padding = fromTheme("padding");
    const saturate = fromTheme("saturate");
    const scale = fromTheme("scale");
    const sepia = fromTheme("sepia");
    const skew = fromTheme("skew");
    const space = fromTheme("space");
    const translate = fromTheme("translate");
    const getOverscroll = () => ["auto", "contain", "none"];
    const getOverflow = () => ["auto", "hidden", "clip", "visible", "scroll"];
    const getSpacingWithAutoAndArbitrary = () => ["auto", isArbitraryValue, spacing];
    const getSpacingWithArbitrary = () => [isArbitraryValue, spacing];
    const getLengthWithEmptyAndArbitrary = () => ["", isLength, isArbitraryLength];
    const getNumberWithAutoAndArbitrary = () => ["auto", isNumber, isArbitraryValue];
    const getPositions = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"];
    const getLineStyles = () => ["solid", "dashed", "dotted", "double", "none"];
    const getBlendModes = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
    const getAlign = () => ["start", "end", "center", "between", "around", "evenly", "stretch"];
    const getZeroAndEmpty = () => ["", "0", isArbitraryValue];
    const getBreaks = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"];
    const getNumberAndArbitrary = () => [isNumber, isArbitraryValue];
    return {
      cacheSize: 500,
      separator: ":",
      theme: {
        colors: [isAny],
        spacing: [isLength, isArbitraryLength],
        blur: ["none", "", isTshirtSize, isArbitraryValue],
        brightness: getNumberAndArbitrary(),
        borderColor: [colors],
        borderRadius: ["none", "", "full", isTshirtSize, isArbitraryValue],
        borderSpacing: getSpacingWithArbitrary(),
        borderWidth: getLengthWithEmptyAndArbitrary(),
        contrast: getNumberAndArbitrary(),
        grayscale: getZeroAndEmpty(),
        hueRotate: getNumberAndArbitrary(),
        invert: getZeroAndEmpty(),
        gap: getSpacingWithArbitrary(),
        gradientColorStops: [colors],
        gradientColorStopPositions: [isPercent, isArbitraryLength],
        inset: getSpacingWithAutoAndArbitrary(),
        margin: getSpacingWithAutoAndArbitrary(),
        opacity: getNumberAndArbitrary(),
        padding: getSpacingWithArbitrary(),
        saturate: getNumberAndArbitrary(),
        scale: getNumberAndArbitrary(),
        sepia: getZeroAndEmpty(),
        skew: getNumberAndArbitrary(),
        space: getSpacingWithArbitrary(),
        translate: getSpacingWithArbitrary()
      },
      classGroups: {
        // Layout
        /**
         * Aspect Ratio
         * @see https://tailwindcss.com/docs/aspect-ratio
         */
        aspect: [{
          aspect: ["auto", "square", "video", isArbitraryValue]
        }],
        /**
         * Container
         * @see https://tailwindcss.com/docs/container
         */
        container: ["container"],
        /**
         * Columns
         * @see https://tailwindcss.com/docs/columns
         */
        columns: [{
          columns: [isTshirtSize]
        }],
        /**
         * Break After
         * @see https://tailwindcss.com/docs/break-after
         */
        "break-after": [{
          "break-after": getBreaks()
        }],
        /**
         * Break Before
         * @see https://tailwindcss.com/docs/break-before
         */
        "break-before": [{
          "break-before": getBreaks()
        }],
        /**
         * Break Inside
         * @see https://tailwindcss.com/docs/break-inside
         */
        "break-inside": [{
          "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
        }],
        /**
         * Box Decoration Break
         * @see https://tailwindcss.com/docs/box-decoration-break
         */
        "box-decoration": [{
          "box-decoration": ["slice", "clone"]
        }],
        /**
         * Box Sizing
         * @see https://tailwindcss.com/docs/box-sizing
         */
        box: [{
          box: ["border", "content"]
        }],
        /**
         * Display
         * @see https://tailwindcss.com/docs/display
         */
        display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
        /**
         * Floats
         * @see https://tailwindcss.com/docs/float
         */
        float: [{
          float: ["right", "left", "none", "start", "end"]
        }],
        /**
         * Clear
         * @see https://tailwindcss.com/docs/clear
         */
        clear: [{
          clear: ["left", "right", "both", "none", "start", "end"]
        }],
        /**
         * Isolation
         * @see https://tailwindcss.com/docs/isolation
         */
        isolation: ["isolate", "isolation-auto"],
        /**
         * Object Fit
         * @see https://tailwindcss.com/docs/object-fit
         */
        "object-fit": [{
          object: ["contain", "cover", "fill", "none", "scale-down"]
        }],
        /**
         * Object Position
         * @see https://tailwindcss.com/docs/object-position
         */
        "object-position": [{
          object: [...getPositions(), isArbitraryValue]
        }],
        /**
         * Overflow
         * @see https://tailwindcss.com/docs/overflow
         */
        overflow: [{
          overflow: getOverflow()
        }],
        /**
         * Overflow X
         * @see https://tailwindcss.com/docs/overflow
         */
        "overflow-x": [{
          "overflow-x": getOverflow()
        }],
        /**
         * Overflow Y
         * @see https://tailwindcss.com/docs/overflow
         */
        "overflow-y": [{
          "overflow-y": getOverflow()
        }],
        /**
         * Overscroll Behavior
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        overscroll: [{
          overscroll: getOverscroll()
        }],
        /**
         * Overscroll Behavior X
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        "overscroll-x": [{
          "overscroll-x": getOverscroll()
        }],
        /**
         * Overscroll Behavior Y
         * @see https://tailwindcss.com/docs/overscroll-behavior
         */
        "overscroll-y": [{
          "overscroll-y": getOverscroll()
        }],
        /**
         * Position
         * @see https://tailwindcss.com/docs/position
         */
        position: ["static", "fixed", "absolute", "relative", "sticky"],
        /**
         * Top / Right / Bottom / Left
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        inset: [{
          inset: [inset]
        }],
        /**
         * Right / Left
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        "inset-x": [{
          "inset-x": [inset]
        }],
        /**
         * Top / Bottom
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        "inset-y": [{
          "inset-y": [inset]
        }],
        /**
         * Start
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        start: [{
          start: [inset]
        }],
        /**
         * End
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        end: [{
          end: [inset]
        }],
        /**
         * Top
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        top: [{
          top: [inset]
        }],
        /**
         * Right
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        right: [{
          right: [inset]
        }],
        /**
         * Bottom
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        bottom: [{
          bottom: [inset]
        }],
        /**
         * Left
         * @see https://tailwindcss.com/docs/top-right-bottom-left
         */
        left: [{
          left: [inset]
        }],
        /**
         * Visibility
         * @see https://tailwindcss.com/docs/visibility
         */
        visibility: ["visible", "invisible", "collapse"],
        /**
         * Z-Index
         * @see https://tailwindcss.com/docs/z-index
         */
        z: [{
          z: ["auto", isInteger, isArbitraryValue]
        }],
        // Flexbox and Grid
        /**
         * Flex Basis
         * @see https://tailwindcss.com/docs/flex-basis
         */
        basis: [{
          basis: getSpacingWithAutoAndArbitrary()
        }],
        /**
         * Flex Direction
         * @see https://tailwindcss.com/docs/flex-direction
         */
        "flex-direction": [{
          flex: ["row", "row-reverse", "col", "col-reverse"]
        }],
        /**
         * Flex Wrap
         * @see https://tailwindcss.com/docs/flex-wrap
         */
        "flex-wrap": [{
          flex: ["wrap", "wrap-reverse", "nowrap"]
        }],
        /**
         * Flex
         * @see https://tailwindcss.com/docs/flex
         */
        flex: [{
          flex: ["1", "auto", "initial", "none", isArbitraryValue]
        }],
        /**
         * Flex Grow
         * @see https://tailwindcss.com/docs/flex-grow
         */
        grow: [{
          grow: getZeroAndEmpty()
        }],
        /**
         * Flex Shrink
         * @see https://tailwindcss.com/docs/flex-shrink
         */
        shrink: [{
          shrink: getZeroAndEmpty()
        }],
        /**
         * Order
         * @see https://tailwindcss.com/docs/order
         */
        order: [{
          order: ["first", "last", "none", isInteger, isArbitraryValue]
        }],
        /**
         * Grid Template Columns
         * @see https://tailwindcss.com/docs/grid-template-columns
         */
        "grid-cols": [{
          "grid-cols": [isAny]
        }],
        /**
         * Grid Column Start / End
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-start-end": [{
          col: ["auto", {
            span: ["full", isInteger, isArbitraryValue]
          }, isArbitraryValue]
        }],
        /**
         * Grid Column Start
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-start": [{
          "col-start": getNumberWithAutoAndArbitrary()
        }],
        /**
         * Grid Column End
         * @see https://tailwindcss.com/docs/grid-column
         */
        "col-end": [{
          "col-end": getNumberWithAutoAndArbitrary()
        }],
        /**
         * Grid Template Rows
         * @see https://tailwindcss.com/docs/grid-template-rows
         */
        "grid-rows": [{
          "grid-rows": [isAny]
        }],
        /**
         * Grid Row Start / End
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-start-end": [{
          row: ["auto", {
            span: [isInteger, isArbitraryValue]
          }, isArbitraryValue]
        }],
        /**
         * Grid Row Start
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-start": [{
          "row-start": getNumberWithAutoAndArbitrary()
        }],
        /**
         * Grid Row End
         * @see https://tailwindcss.com/docs/grid-row
         */
        "row-end": [{
          "row-end": getNumberWithAutoAndArbitrary()
        }],
        /**
         * Grid Auto Flow
         * @see https://tailwindcss.com/docs/grid-auto-flow
         */
        "grid-flow": [{
          "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
        }],
        /**
         * Grid Auto Columns
         * @see https://tailwindcss.com/docs/grid-auto-columns
         */
        "auto-cols": [{
          "auto-cols": ["auto", "min", "max", "fr", isArbitraryValue]
        }],
        /**
         * Grid Auto Rows
         * @see https://tailwindcss.com/docs/grid-auto-rows
         */
        "auto-rows": [{
          "auto-rows": ["auto", "min", "max", "fr", isArbitraryValue]
        }],
        /**
         * Gap
         * @see https://tailwindcss.com/docs/gap
         */
        gap: [{
          gap: [gap]
        }],
        /**
         * Gap X
         * @see https://tailwindcss.com/docs/gap
         */
        "gap-x": [{
          "gap-x": [gap]
        }],
        /**
         * Gap Y
         * @see https://tailwindcss.com/docs/gap
         */
        "gap-y": [{
          "gap-y": [gap]
        }],
        /**
         * Justify Content
         * @see https://tailwindcss.com/docs/justify-content
         */
        "justify-content": [{
          justify: ["normal", ...getAlign()]
        }],
        /**
         * Justify Items
         * @see https://tailwindcss.com/docs/justify-items
         */
        "justify-items": [{
          "justify-items": ["start", "end", "center", "stretch"]
        }],
        /**
         * Justify Self
         * @see https://tailwindcss.com/docs/justify-self
         */
        "justify-self": [{
          "justify-self": ["auto", "start", "end", "center", "stretch"]
        }],
        /**
         * Align Content
         * @see https://tailwindcss.com/docs/align-content
         */
        "align-content": [{
          content: ["normal", ...getAlign(), "baseline"]
        }],
        /**
         * Align Items
         * @see https://tailwindcss.com/docs/align-items
         */
        "align-items": [{
          items: ["start", "end", "center", "baseline", "stretch"]
        }],
        /**
         * Align Self
         * @see https://tailwindcss.com/docs/align-self
         */
        "align-self": [{
          self: ["auto", "start", "end", "center", "stretch", "baseline"]
        }],
        /**
         * Place Content
         * @see https://tailwindcss.com/docs/place-content
         */
        "place-content": [{
          "place-content": [...getAlign(), "baseline"]
        }],
        /**
         * Place Items
         * @see https://tailwindcss.com/docs/place-items
         */
        "place-items": [{
          "place-items": ["start", "end", "center", "baseline", "stretch"]
        }],
        /**
         * Place Self
         * @see https://tailwindcss.com/docs/place-self
         */
        "place-self": [{
          "place-self": ["auto", "start", "end", "center", "stretch"]
        }],
        // Spacing
        /**
         * Padding
         * @see https://tailwindcss.com/docs/padding
         */
        p: [{
          p: [padding]
        }],
        /**
         * Padding X
         * @see https://tailwindcss.com/docs/padding
         */
        px: [{
          px: [padding]
        }],
        /**
         * Padding Y
         * @see https://tailwindcss.com/docs/padding
         */
        py: [{
          py: [padding]
        }],
        /**
         * Padding Start
         * @see https://tailwindcss.com/docs/padding
         */
        ps: [{
          ps: [padding]
        }],
        /**
         * Padding End
         * @see https://tailwindcss.com/docs/padding
         */
        pe: [{
          pe: [padding]
        }],
        /**
         * Padding Top
         * @see https://tailwindcss.com/docs/padding
         */
        pt: [{
          pt: [padding]
        }],
        /**
         * Padding Right
         * @see https://tailwindcss.com/docs/padding
         */
        pr: [{
          pr: [padding]
        }],
        /**
         * Padding Bottom
         * @see https://tailwindcss.com/docs/padding
         */
        pb: [{
          pb: [padding]
        }],
        /**
         * Padding Left
         * @see https://tailwindcss.com/docs/padding
         */
        pl: [{
          pl: [padding]
        }],
        /**
         * Margin
         * @see https://tailwindcss.com/docs/margin
         */
        m: [{
          m: [margin]
        }],
        /**
         * Margin X
         * @see https://tailwindcss.com/docs/margin
         */
        mx: [{
          mx: [margin]
        }],
        /**
         * Margin Y
         * @see https://tailwindcss.com/docs/margin
         */
        my: [{
          my: [margin]
        }],
        /**
         * Margin Start
         * @see https://tailwindcss.com/docs/margin
         */
        ms: [{
          ms: [margin]
        }],
        /**
         * Margin End
         * @see https://tailwindcss.com/docs/margin
         */
        me: [{
          me: [margin]
        }],
        /**
         * Margin Top
         * @see https://tailwindcss.com/docs/margin
         */
        mt: [{
          mt: [margin]
        }],
        /**
         * Margin Right
         * @see https://tailwindcss.com/docs/margin
         */
        mr: [{
          mr: [margin]
        }],
        /**
         * Margin Bottom
         * @see https://tailwindcss.com/docs/margin
         */
        mb: [{
          mb: [margin]
        }],
        /**
         * Margin Left
         * @see https://tailwindcss.com/docs/margin
         */
        ml: [{
          ml: [margin]
        }],
        /**
         * Space Between X
         * @see https://tailwindcss.com/docs/space
         */
        "space-x": [{
          "space-x": [space]
        }],
        /**
         * Space Between X Reverse
         * @see https://tailwindcss.com/docs/space
         */
        "space-x-reverse": ["space-x-reverse"],
        /**
         * Space Between Y
         * @see https://tailwindcss.com/docs/space
         */
        "space-y": [{
          "space-y": [space]
        }],
        /**
         * Space Between Y Reverse
         * @see https://tailwindcss.com/docs/space
         */
        "space-y-reverse": ["space-y-reverse"],
        // Sizing
        /**
         * Width
         * @see https://tailwindcss.com/docs/width
         */
        w: [{
          w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", isArbitraryValue, spacing]
        }],
        /**
         * Min-Width
         * @see https://tailwindcss.com/docs/min-width
         */
        "min-w": [{
          "min-w": [isArbitraryValue, spacing, "min", "max", "fit"]
        }],
        /**
         * Max-Width
         * @see https://tailwindcss.com/docs/max-width
         */
        "max-w": [{
          "max-w": [isArbitraryValue, spacing, "none", "full", "min", "max", "fit", "prose", {
            screen: [isTshirtSize]
          }, isTshirtSize]
        }],
        /**
         * Height
         * @see https://tailwindcss.com/docs/height
         */
        h: [{
          h: [isArbitraryValue, spacing, "auto", "min", "max", "fit", "svh", "lvh", "dvh"]
        }],
        /**
         * Min-Height
         * @see https://tailwindcss.com/docs/min-height
         */
        "min-h": [{
          "min-h": [isArbitraryValue, spacing, "min", "max", "fit", "svh", "lvh", "dvh"]
        }],
        /**
         * Max-Height
         * @see https://tailwindcss.com/docs/max-height
         */
        "max-h": [{
          "max-h": [isArbitraryValue, spacing, "min", "max", "fit", "svh", "lvh", "dvh"]
        }],
        /**
         * Size
         * @see https://tailwindcss.com/docs/size
         */
        size: [{
          size: [isArbitraryValue, spacing, "auto", "min", "max", "fit"]
        }],
        // Typography
        /**
         * Font Size
         * @see https://tailwindcss.com/docs/font-size
         */
        "font-size": [{
          text: ["base", isTshirtSize, isArbitraryLength]
        }],
        /**
         * Font Smoothing
         * @see https://tailwindcss.com/docs/font-smoothing
         */
        "font-smoothing": ["antialiased", "subpixel-antialiased"],
        /**
         * Font Style
         * @see https://tailwindcss.com/docs/font-style
         */
        "font-style": ["italic", "not-italic"],
        /**
         * Font Weight
         * @see https://tailwindcss.com/docs/font-weight
         */
        "font-weight": [{
          font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", isArbitraryNumber]
        }],
        /**
         * Font Family
         * @see https://tailwindcss.com/docs/font-family
         */
        "font-family": [{
          font: [isAny]
        }],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-normal": ["normal-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-ordinal": ["ordinal"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-slashed-zero": ["slashed-zero"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-figure": ["lining-nums", "oldstyle-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-spacing": ["proportional-nums", "tabular-nums"],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        "fvn-fraction": ["diagonal-fractions", "stacked-fractons"],
        /**
         * Letter Spacing
         * @see https://tailwindcss.com/docs/letter-spacing
         */
        tracking: [{
          tracking: ["tighter", "tight", "normal", "wide", "wider", "widest", isArbitraryValue]
        }],
        /**
         * Line Clamp
         * @see https://tailwindcss.com/docs/line-clamp
         */
        "line-clamp": [{
          "line-clamp": ["none", isNumber, isArbitraryNumber]
        }],
        /**
         * Line Height
         * @see https://tailwindcss.com/docs/line-height
         */
        leading: [{
          leading: ["none", "tight", "snug", "normal", "relaxed", "loose", isLength, isArbitraryValue]
        }],
        /**
         * List Style Image
         * @see https://tailwindcss.com/docs/list-style-image
         */
        "list-image": [{
          "list-image": ["none", isArbitraryValue]
        }],
        /**
         * List Style Type
         * @see https://tailwindcss.com/docs/list-style-type
         */
        "list-style-type": [{
          list: ["none", "disc", "decimal", isArbitraryValue]
        }],
        /**
         * List Style Position
         * @see https://tailwindcss.com/docs/list-style-position
         */
        "list-style-position": [{
          list: ["inside", "outside"]
        }],
        /**
         * Placeholder Color
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://tailwindcss.com/docs/placeholder-color
         */
        "placeholder-color": [{
          placeholder: [colors]
        }],
        /**
         * Placeholder Opacity
         * @see https://tailwindcss.com/docs/placeholder-opacity
         */
        "placeholder-opacity": [{
          "placeholder-opacity": [opacity]
        }],
        /**
         * Text Alignment
         * @see https://tailwindcss.com/docs/text-align
         */
        "text-alignment": [{
          text: ["left", "center", "right", "justify", "start", "end"]
        }],
        /**
         * Text Color
         * @see https://tailwindcss.com/docs/text-color
         */
        "text-color": [{
          text: [colors]
        }],
        /**
         * Text Opacity
         * @see https://tailwindcss.com/docs/text-opacity
         */
        "text-opacity": [{
          "text-opacity": [opacity]
        }],
        /**
         * Text Decoration
         * @see https://tailwindcss.com/docs/text-decoration
         */
        "text-decoration": ["underline", "overline", "line-through", "no-underline"],
        /**
         * Text Decoration Style
         * @see https://tailwindcss.com/docs/text-decoration-style
         */
        "text-decoration-style": [{
          decoration: [...getLineStyles(), "wavy"]
        }],
        /**
         * Text Decoration Thickness
         * @see https://tailwindcss.com/docs/text-decoration-thickness
         */
        "text-decoration-thickness": [{
          decoration: ["auto", "from-font", isLength, isArbitraryLength]
        }],
        /**
         * Text Underline Offset
         * @see https://tailwindcss.com/docs/text-underline-offset
         */
        "underline-offset": [{
          "underline-offset": ["auto", isLength, isArbitraryValue]
        }],
        /**
         * Text Decoration Color
         * @see https://tailwindcss.com/docs/text-decoration-color
         */
        "text-decoration-color": [{
          decoration: [colors]
        }],
        /**
         * Text Transform
         * @see https://tailwindcss.com/docs/text-transform
         */
        "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
        /**
         * Text Overflow
         * @see https://tailwindcss.com/docs/text-overflow
         */
        "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
        /**
         * Text Wrap
         * @see https://tailwindcss.com/docs/text-wrap
         */
        "text-wrap": [{
          text: ["wrap", "nowrap", "balance", "pretty"]
        }],
        /**
         * Text Indent
         * @see https://tailwindcss.com/docs/text-indent
         */
        indent: [{
          indent: getSpacingWithArbitrary()
        }],
        /**
         * Vertical Alignment
         * @see https://tailwindcss.com/docs/vertical-align
         */
        "vertical-align": [{
          align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", isArbitraryValue]
        }],
        /**
         * Whitespace
         * @see https://tailwindcss.com/docs/whitespace
         */
        whitespace: [{
          whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
        }],
        /**
         * Word Break
         * @see https://tailwindcss.com/docs/word-break
         */
        break: [{
          break: ["normal", "words", "all", "keep"]
        }],
        /**
         * Hyphens
         * @see https://tailwindcss.com/docs/hyphens
         */
        hyphens: [{
          hyphens: ["none", "manual", "auto"]
        }],
        /**
         * Content
         * @see https://tailwindcss.com/docs/content
         */
        content: [{
          content: ["none", isArbitraryValue]
        }],
        // Backgrounds
        /**
         * Background Attachment
         * @see https://tailwindcss.com/docs/background-attachment
         */
        "bg-attachment": [{
          bg: ["fixed", "local", "scroll"]
        }],
        /**
         * Background Clip
         * @see https://tailwindcss.com/docs/background-clip
         */
        "bg-clip": [{
          "bg-clip": ["border", "padding", "content", "text"]
        }],
        /**
         * Background Opacity
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://tailwindcss.com/docs/background-opacity
         */
        "bg-opacity": [{
          "bg-opacity": [opacity]
        }],
        /**
         * Background Origin
         * @see https://tailwindcss.com/docs/background-origin
         */
        "bg-origin": [{
          "bg-origin": ["border", "padding", "content"]
        }],
        /**
         * Background Position
         * @see https://tailwindcss.com/docs/background-position
         */
        "bg-position": [{
          bg: [...getPositions(), isArbitraryPosition]
        }],
        /**
         * Background Repeat
         * @see https://tailwindcss.com/docs/background-repeat
         */
        "bg-repeat": [{
          bg: ["no-repeat", {
            repeat: ["", "x", "y", "round", "space"]
          }]
        }],
        /**
         * Background Size
         * @see https://tailwindcss.com/docs/background-size
         */
        "bg-size": [{
          bg: ["auto", "cover", "contain", isArbitrarySize]
        }],
        /**
         * Background Image
         * @see https://tailwindcss.com/docs/background-image
         */
        "bg-image": [{
          bg: ["none", {
            "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, isArbitraryImage]
        }],
        /**
         * Background Color
         * @see https://tailwindcss.com/docs/background-color
         */
        "bg-color": [{
          bg: [colors]
        }],
        /**
         * Gradient Color Stops From Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-from-pos": [{
          from: [gradientColorStopPositions]
        }],
        /**
         * Gradient Color Stops Via Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-via-pos": [{
          via: [gradientColorStopPositions]
        }],
        /**
         * Gradient Color Stops To Position
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-to-pos": [{
          to: [gradientColorStopPositions]
        }],
        /**
         * Gradient Color Stops From
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-from": [{
          from: [gradientColorStops]
        }],
        /**
         * Gradient Color Stops Via
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-via": [{
          via: [gradientColorStops]
        }],
        /**
         * Gradient Color Stops To
         * @see https://tailwindcss.com/docs/gradient-color-stops
         */
        "gradient-to": [{
          to: [gradientColorStops]
        }],
        // Borders
        /**
         * Border Radius
         * @see https://tailwindcss.com/docs/border-radius
         */
        rounded: [{
          rounded: [borderRadius]
        }],
        /**
         * Border Radius Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-s": [{
          "rounded-s": [borderRadius]
        }],
        /**
         * Border Radius End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-e": [{
          "rounded-e": [borderRadius]
        }],
        /**
         * Border Radius Top
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-t": [{
          "rounded-t": [borderRadius]
        }],
        /**
         * Border Radius Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-r": [{
          "rounded-r": [borderRadius]
        }],
        /**
         * Border Radius Bottom
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-b": [{
          "rounded-b": [borderRadius]
        }],
        /**
         * Border Radius Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-l": [{
          "rounded-l": [borderRadius]
        }],
        /**
         * Border Radius Start Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-ss": [{
          "rounded-ss": [borderRadius]
        }],
        /**
         * Border Radius Start End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-se": [{
          "rounded-se": [borderRadius]
        }],
        /**
         * Border Radius End End
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-ee": [{
          "rounded-ee": [borderRadius]
        }],
        /**
         * Border Radius End Start
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-es": [{
          "rounded-es": [borderRadius]
        }],
        /**
         * Border Radius Top Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-tl": [{
          "rounded-tl": [borderRadius]
        }],
        /**
         * Border Radius Top Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-tr": [{
          "rounded-tr": [borderRadius]
        }],
        /**
         * Border Radius Bottom Right
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-br": [{
          "rounded-br": [borderRadius]
        }],
        /**
         * Border Radius Bottom Left
         * @see https://tailwindcss.com/docs/border-radius
         */
        "rounded-bl": [{
          "rounded-bl": [borderRadius]
        }],
        /**
         * Border Width
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w": [{
          border: [borderWidth]
        }],
        /**
         * Border Width X
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-x": [{
          "border-x": [borderWidth]
        }],
        /**
         * Border Width Y
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-y": [{
          "border-y": [borderWidth]
        }],
        /**
         * Border Width Start
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-s": [{
          "border-s": [borderWidth]
        }],
        /**
         * Border Width End
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-e": [{
          "border-e": [borderWidth]
        }],
        /**
         * Border Width Top
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-t": [{
          "border-t": [borderWidth]
        }],
        /**
         * Border Width Right
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-r": [{
          "border-r": [borderWidth]
        }],
        /**
         * Border Width Bottom
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-b": [{
          "border-b": [borderWidth]
        }],
        /**
         * Border Width Left
         * @see https://tailwindcss.com/docs/border-width
         */
        "border-w-l": [{
          "border-l": [borderWidth]
        }],
        /**
         * Border Opacity
         * @see https://tailwindcss.com/docs/border-opacity
         */
        "border-opacity": [{
          "border-opacity": [opacity]
        }],
        /**
         * Border Style
         * @see https://tailwindcss.com/docs/border-style
         */
        "border-style": [{
          border: [...getLineStyles(), "hidden"]
        }],
        /**
         * Divide Width X
         * @see https://tailwindcss.com/docs/divide-width
         */
        "divide-x": [{
          "divide-x": [borderWidth]
        }],
        /**
         * Divide Width X Reverse
         * @see https://tailwindcss.com/docs/divide-width
         */
        "divide-x-reverse": ["divide-x-reverse"],
        /**
         * Divide Width Y
         * @see https://tailwindcss.com/docs/divide-width
         */
        "divide-y": [{
          "divide-y": [borderWidth]
        }],
        /**
         * Divide Width Y Reverse
         * @see https://tailwindcss.com/docs/divide-width
         */
        "divide-y-reverse": ["divide-y-reverse"],
        /**
         * Divide Opacity
         * @see https://tailwindcss.com/docs/divide-opacity
         */
        "divide-opacity": [{
          "divide-opacity": [opacity]
        }],
        /**
         * Divide Style
         * @see https://tailwindcss.com/docs/divide-style
         */
        "divide-style": [{
          divide: getLineStyles()
        }],
        /**
         * Border Color
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color": [{
          border: [borderColor]
        }],
        /**
         * Border Color X
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-x": [{
          "border-x": [borderColor]
        }],
        /**
         * Border Color Y
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-y": [{
          "border-y": [borderColor]
        }],
        /**
         * Border Color S
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-s": [{
          "border-s": [borderColor]
        }],
        /**
         * Border Color E
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-e": [{
          "border-e": [borderColor]
        }],
        /**
         * Border Color Top
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-t": [{
          "border-t": [borderColor]
        }],
        /**
         * Border Color Right
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-r": [{
          "border-r": [borderColor]
        }],
        /**
         * Border Color Bottom
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-b": [{
          "border-b": [borderColor]
        }],
        /**
         * Border Color Left
         * @see https://tailwindcss.com/docs/border-color
         */
        "border-color-l": [{
          "border-l": [borderColor]
        }],
        /**
         * Divide Color
         * @see https://tailwindcss.com/docs/divide-color
         */
        "divide-color": [{
          divide: [borderColor]
        }],
        /**
         * Outline Style
         * @see https://tailwindcss.com/docs/outline-style
         */
        "outline-style": [{
          outline: ["", ...getLineStyles()]
        }],
        /**
         * Outline Offset
         * @see https://tailwindcss.com/docs/outline-offset
         */
        "outline-offset": [{
          "outline-offset": [isLength, isArbitraryValue]
        }],
        /**
         * Outline Width
         * @see https://tailwindcss.com/docs/outline-width
         */
        "outline-w": [{
          outline: [isLength, isArbitraryLength]
        }],
        /**
         * Outline Color
         * @see https://tailwindcss.com/docs/outline-color
         */
        "outline-color": [{
          outline: [colors]
        }],
        /**
         * Ring Width
         * @see https://tailwindcss.com/docs/ring-width
         */
        "ring-w": [{
          ring: getLengthWithEmptyAndArbitrary()
        }],
        /**
         * Ring Width Inset
         * @see https://tailwindcss.com/docs/ring-width
         */
        "ring-w-inset": ["ring-inset"],
        /**
         * Ring Color
         * @see https://tailwindcss.com/docs/ring-color
         */
        "ring-color": [{
          ring: [colors]
        }],
        /**
         * Ring Opacity
         * @see https://tailwindcss.com/docs/ring-opacity
         */
        "ring-opacity": [{
          "ring-opacity": [opacity]
        }],
        /**
         * Ring Offset Width
         * @see https://tailwindcss.com/docs/ring-offset-width
         */
        "ring-offset-w": [{
          "ring-offset": [isLength, isArbitraryLength]
        }],
        /**
         * Ring Offset Color
         * @see https://tailwindcss.com/docs/ring-offset-color
         */
        "ring-offset-color": [{
          "ring-offset": [colors]
        }],
        // Effects
        /**
         * Box Shadow
         * @see https://tailwindcss.com/docs/box-shadow
         */
        shadow: [{
          shadow: ["", "inner", "none", isTshirtSize, isArbitraryShadow]
        }],
        /**
         * Box Shadow Color
         * @see https://tailwindcss.com/docs/box-shadow-color
         */
        "shadow-color": [{
          shadow: [isAny]
        }],
        /**
         * Opacity
         * @see https://tailwindcss.com/docs/opacity
         */
        opacity: [{
          opacity: [opacity]
        }],
        /**
         * Mix Blend Mode
         * @see https://tailwindcss.com/docs/mix-blend-mode
         */
        "mix-blend": [{
          "mix-blend": [...getBlendModes(), "plus-lighter", "plus-darker"]
        }],
        /**
         * Background Blend Mode
         * @see https://tailwindcss.com/docs/background-blend-mode
         */
        "bg-blend": [{
          "bg-blend": getBlendModes()
        }],
        // Filters
        /**
         * Filter
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://tailwindcss.com/docs/filter
         */
        filter: [{
          filter: ["", "none"]
        }],
        /**
         * Blur
         * @see https://tailwindcss.com/docs/blur
         */
        blur: [{
          blur: [blur]
        }],
        /**
         * Brightness
         * @see https://tailwindcss.com/docs/brightness
         */
        brightness: [{
          brightness: [brightness]
        }],
        /**
         * Contrast
         * @see https://tailwindcss.com/docs/contrast
         */
        contrast: [{
          contrast: [contrast]
        }],
        /**
         * Drop Shadow
         * @see https://tailwindcss.com/docs/drop-shadow
         */
        "drop-shadow": [{
          "drop-shadow": ["", "none", isTshirtSize, isArbitraryValue]
        }],
        /**
         * Grayscale
         * @see https://tailwindcss.com/docs/grayscale
         */
        grayscale: [{
          grayscale: [grayscale]
        }],
        /**
         * Hue Rotate
         * @see https://tailwindcss.com/docs/hue-rotate
         */
        "hue-rotate": [{
          "hue-rotate": [hueRotate]
        }],
        /**
         * Invert
         * @see https://tailwindcss.com/docs/invert
         */
        invert: [{
          invert: [invert]
        }],
        /**
         * Saturate
         * @see https://tailwindcss.com/docs/saturate
         */
        saturate: [{
          saturate: [saturate]
        }],
        /**
         * Sepia
         * @see https://tailwindcss.com/docs/sepia
         */
        sepia: [{
          sepia: [sepia]
        }],
        /**
         * Backdrop Filter
         * @deprecated since Tailwind CSS v3.0.0
         * @see https://tailwindcss.com/docs/backdrop-filter
         */
        "backdrop-filter": [{
          "backdrop-filter": ["", "none"]
        }],
        /**
         * Backdrop Blur
         * @see https://tailwindcss.com/docs/backdrop-blur
         */
        "backdrop-blur": [{
          "backdrop-blur": [blur]
        }],
        /**
         * Backdrop Brightness
         * @see https://tailwindcss.com/docs/backdrop-brightness
         */
        "backdrop-brightness": [{
          "backdrop-brightness": [brightness]
        }],
        /**
         * Backdrop Contrast
         * @see https://tailwindcss.com/docs/backdrop-contrast
         */
        "backdrop-contrast": [{
          "backdrop-contrast": [contrast]
        }],
        /**
         * Backdrop Grayscale
         * @see https://tailwindcss.com/docs/backdrop-grayscale
         */
        "backdrop-grayscale": [{
          "backdrop-grayscale": [grayscale]
        }],
        /**
         * Backdrop Hue Rotate
         * @see https://tailwindcss.com/docs/backdrop-hue-rotate
         */
        "backdrop-hue-rotate": [{
          "backdrop-hue-rotate": [hueRotate]
        }],
        /**
         * Backdrop Invert
         * @see https://tailwindcss.com/docs/backdrop-invert
         */
        "backdrop-invert": [{
          "backdrop-invert": [invert]
        }],
        /**
         * Backdrop Opacity
         * @see https://tailwindcss.com/docs/backdrop-opacity
         */
        "backdrop-opacity": [{
          "backdrop-opacity": [opacity]
        }],
        /**
         * Backdrop Saturate
         * @see https://tailwindcss.com/docs/backdrop-saturate
         */
        "backdrop-saturate": [{
          "backdrop-saturate": [saturate]
        }],
        /**
         * Backdrop Sepia
         * @see https://tailwindcss.com/docs/backdrop-sepia
         */
        "backdrop-sepia": [{
          "backdrop-sepia": [sepia]
        }],
        // Tables
        /**
         * Border Collapse
         * @see https://tailwindcss.com/docs/border-collapse
         */
        "border-collapse": [{
          border: ["collapse", "separate"]
        }],
        /**
         * Border Spacing
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing": [{
          "border-spacing": [borderSpacing]
        }],
        /**
         * Border Spacing X
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing-x": [{
          "border-spacing-x": [borderSpacing]
        }],
        /**
         * Border Spacing Y
         * @see https://tailwindcss.com/docs/border-spacing
         */
        "border-spacing-y": [{
          "border-spacing-y": [borderSpacing]
        }],
        /**
         * Table Layout
         * @see https://tailwindcss.com/docs/table-layout
         */
        "table-layout": [{
          table: ["auto", "fixed"]
        }],
        /**
         * Caption Side
         * @see https://tailwindcss.com/docs/caption-side
         */
        caption: [{
          caption: ["top", "bottom"]
        }],
        // Transitions and Animation
        /**
         * Tranisition Property
         * @see https://tailwindcss.com/docs/transition-property
         */
        transition: [{
          transition: ["none", "all", "", "colors", "opacity", "shadow", "transform", isArbitraryValue]
        }],
        /**
         * Transition Duration
         * @see https://tailwindcss.com/docs/transition-duration
         */
        duration: [{
          duration: getNumberAndArbitrary()
        }],
        /**
         * Transition Timing Function
         * @see https://tailwindcss.com/docs/transition-timing-function
         */
        ease: [{
          ease: ["linear", "in", "out", "in-out", isArbitraryValue]
        }],
        /**
         * Transition Delay
         * @see https://tailwindcss.com/docs/transition-delay
         */
        delay: [{
          delay: getNumberAndArbitrary()
        }],
        /**
         * Animation
         * @see https://tailwindcss.com/docs/animation
         */
        animate: [{
          animate: ["none", "spin", "ping", "pulse", "bounce", isArbitraryValue]
        }],
        // Transforms
        /**
         * Transform
         * @see https://tailwindcss.com/docs/transform
         */
        transform: [{
          transform: ["", "gpu", "none"]
        }],
        /**
         * Scale
         * @see https://tailwindcss.com/docs/scale
         */
        scale: [{
          scale: [scale]
        }],
        /**
         * Scale X
         * @see https://tailwindcss.com/docs/scale
         */
        "scale-x": [{
          "scale-x": [scale]
        }],
        /**
         * Scale Y
         * @see https://tailwindcss.com/docs/scale
         */
        "scale-y": [{
          "scale-y": [scale]
        }],
        /**
         * Rotate
         * @see https://tailwindcss.com/docs/rotate
         */
        rotate: [{
          rotate: [isInteger, isArbitraryValue]
        }],
        /**
         * Translate X
         * @see https://tailwindcss.com/docs/translate
         */
        "translate-x": [{
          "translate-x": [translate]
        }],
        /**
         * Translate Y
         * @see https://tailwindcss.com/docs/translate
         */
        "translate-y": [{
          "translate-y": [translate]
        }],
        /**
         * Skew X
         * @see https://tailwindcss.com/docs/skew
         */
        "skew-x": [{
          "skew-x": [skew]
        }],
        /**
         * Skew Y
         * @see https://tailwindcss.com/docs/skew
         */
        "skew-y": [{
          "skew-y": [skew]
        }],
        /**
         * Transform Origin
         * @see https://tailwindcss.com/docs/transform-origin
         */
        "transform-origin": [{
          origin: ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", isArbitraryValue]
        }],
        // Interactivity
        /**
         * Accent Color
         * @see https://tailwindcss.com/docs/accent-color
         */
        accent: [{
          accent: ["auto", colors]
        }],
        /**
         * Appearance
         * @see https://tailwindcss.com/docs/appearance
         */
        appearance: [{
          appearance: ["none", "auto"]
        }],
        /**
         * Cursor
         * @see https://tailwindcss.com/docs/cursor
         */
        cursor: [{
          cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", isArbitraryValue]
        }],
        /**
         * Caret Color
         * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
         */
        "caret-color": [{
          caret: [colors]
        }],
        /**
         * Pointer Events
         * @see https://tailwindcss.com/docs/pointer-events
         */
        "pointer-events": [{
          "pointer-events": ["none", "auto"]
        }],
        /**
         * Resize
         * @see https://tailwindcss.com/docs/resize
         */
        resize: [{
          resize: ["none", "y", "x", ""]
        }],
        /**
         * Scroll Behavior
         * @see https://tailwindcss.com/docs/scroll-behavior
         */
        "scroll-behavior": [{
          scroll: ["auto", "smooth"]
        }],
        /**
         * Scroll Margin
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-m": [{
          "scroll-m": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Margin X
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mx": [{
          "scroll-mx": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Margin Y
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-my": [{
          "scroll-my": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Margin Start
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-ms": [{
          "scroll-ms": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Margin End
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-me": [{
          "scroll-me": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Margin Top
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mt": [{
          "scroll-mt": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Margin Right
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mr": [{
          "scroll-mr": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Margin Bottom
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-mb": [{
          "scroll-mb": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Margin Left
         * @see https://tailwindcss.com/docs/scroll-margin
         */
        "scroll-ml": [{
          "scroll-ml": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-p": [{
          "scroll-p": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding X
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-px": [{
          "scroll-px": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding Y
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-py": [{
          "scroll-py": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding Start
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-ps": [{
          "scroll-ps": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding End
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pe": [{
          "scroll-pe": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding Top
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pt": [{
          "scroll-pt": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding Right
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pr": [{
          "scroll-pr": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding Bottom
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pb": [{
          "scroll-pb": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Padding Left
         * @see https://tailwindcss.com/docs/scroll-padding
         */
        "scroll-pl": [{
          "scroll-pl": getSpacingWithArbitrary()
        }],
        /**
         * Scroll Snap Align
         * @see https://tailwindcss.com/docs/scroll-snap-align
         */
        "snap-align": [{
          snap: ["start", "end", "center", "align-none"]
        }],
        /**
         * Scroll Snap Stop
         * @see https://tailwindcss.com/docs/scroll-snap-stop
         */
        "snap-stop": [{
          snap: ["normal", "always"]
        }],
        /**
         * Scroll Snap Type
         * @see https://tailwindcss.com/docs/scroll-snap-type
         */
        "snap-type": [{
          snap: ["none", "x", "y", "both"]
        }],
        /**
         * Scroll Snap Type Strictness
         * @see https://tailwindcss.com/docs/scroll-snap-type
         */
        "snap-strictness": [{
          snap: ["mandatory", "proximity"]
        }],
        /**
         * Touch Action
         * @see https://tailwindcss.com/docs/touch-action
         */
        touch: [{
          touch: ["auto", "none", "manipulation"]
        }],
        /**
         * Touch Action X
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-x": [{
          "touch-pan": ["x", "left", "right"]
        }],
        /**
         * Touch Action Y
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-y": [{
          "touch-pan": ["y", "up", "down"]
        }],
        /**
         * Touch Action Pinch Zoom
         * @see https://tailwindcss.com/docs/touch-action
         */
        "touch-pz": ["touch-pinch-zoom"],
        /**
         * User Select
         * @see https://tailwindcss.com/docs/user-select
         */
        select: [{
          select: ["none", "text", "all", "auto"]
        }],
        /**
         * Will Change
         * @see https://tailwindcss.com/docs/will-change
         */
        "will-change": [{
          "will-change": ["auto", "scroll", "contents", "transform", isArbitraryValue]
        }],
        // SVG
        /**
         * Fill
         * @see https://tailwindcss.com/docs/fill
         */
        fill: [{
          fill: [colors, "none"]
        }],
        /**
         * Stroke Width
         * @see https://tailwindcss.com/docs/stroke-width
         */
        "stroke-w": [{
          stroke: [isLength, isArbitraryLength, isArbitraryNumber]
        }],
        /**
         * Stroke
         * @see https://tailwindcss.com/docs/stroke
         */
        stroke: [{
          stroke: [colors, "none"]
        }],
        // Accessibility
        /**
         * Screen Readers
         * @see https://tailwindcss.com/docs/screen-readers
         */
        sr: ["sr-only", "not-sr-only"],
        /**
         * Forced Color Adjust
         * @see https://tailwindcss.com/docs/forced-color-adjust
         */
        "forced-color-adjust": [{
          "forced-color-adjust": ["auto", "none"]
        }]
      },
      conflictingClassGroups: {
        overflow: ["overflow-x", "overflow-y"],
        overscroll: ["overscroll-x", "overscroll-y"],
        inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
        "inset-x": ["right", "left"],
        "inset-y": ["top", "bottom"],
        flex: ["basis", "grow", "shrink"],
        gap: ["gap-x", "gap-y"],
        p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
        px: ["pr", "pl"],
        py: ["pt", "pb"],
        m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
        mx: ["mr", "ml"],
        my: ["mt", "mb"],
        size: ["w", "h"],
        "font-size": ["leading"],
        "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
        "fvn-ordinal": ["fvn-normal"],
        "fvn-slashed-zero": ["fvn-normal"],
        "fvn-figure": ["fvn-normal"],
        "fvn-spacing": ["fvn-normal"],
        "fvn-fraction": ["fvn-normal"],
        "line-clamp": ["display", "overflow"],
        rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
        "rounded-s": ["rounded-ss", "rounded-es"],
        "rounded-e": ["rounded-se", "rounded-ee"],
        "rounded-t": ["rounded-tl", "rounded-tr"],
        "rounded-r": ["rounded-tr", "rounded-br"],
        "rounded-b": ["rounded-br", "rounded-bl"],
        "rounded-l": ["rounded-tl", "rounded-bl"],
        "border-spacing": ["border-spacing-x", "border-spacing-y"],
        "border-w": ["border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
        "border-w-x": ["border-w-r", "border-w-l"],
        "border-w-y": ["border-w-t", "border-w-b"],
        "border-color": ["border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
        "border-color-x": ["border-color-r", "border-color-l"],
        "border-color-y": ["border-color-t", "border-color-b"],
        "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
        "scroll-mx": ["scroll-mr", "scroll-ml"],
        "scroll-my": ["scroll-mt", "scroll-mb"],
        "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
        "scroll-px": ["scroll-pr", "scroll-pl"],
        "scroll-py": ["scroll-pt", "scroll-pb"],
        touch: ["touch-x", "touch-y", "touch-pz"],
        "touch-x": ["touch"],
        "touch-y": ["touch"],
        "touch-pz": ["touch"]
      },
      conflictingClassGroupModifiers: {
        "font-size": ["leading"]
      }
    };
  };
  var twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);

  // src/lib/cn.ts
  function cn(...inputs) {
    return twMerge(clsx(inputs));
  }

  // src/components/bts/StatusBadge/status-badge.module.css
  var status_badge_default = {
    badge: "status_badge_badge",
    sm: "status_badge_sm",
    md: "status_badge_md",
    iconSlot: "status_badge_iconSlot",
    dot: "status_badge_dot",
    neutral: "status_badge_neutral",
    info: "status_badge_info",
    success: "status_badge_success",
    warning: "status_badge_warning",
    live: "status_badge_live",
    danger: "status_badge_danger"
  };

  // src/components/bts/StatusBadge/StatusBadge.tsx
  var TONE_CLASS = {
    neutral: status_badge_default.neutral,
    info: status_badge_default.info,
    success: status_badge_default.success,
    warning: status_badge_default.warning,
    danger: status_badge_default.danger,
    live: status_badge_default.live
  };
  function StatusBadge({
    tone = "neutral",
    label,
    icon,
    dot = false,
    size = "sm",
    title,
    "aria-label": ariaLabel,
    className
  }) {
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        className: cn(status_badge_default.badge, TONE_CLASS[tone], status_badge_default[size], className),
        title,
        "aria-label": ariaLabel
      },
      dot && /* @__PURE__ */ React.createElement("span", { className: status_badge_default.dot, "aria-hidden": "true" }),
      !dot && icon != null && /* @__PURE__ */ React.createElement("span", { className: status_badge_default.iconSlot, "aria-hidden": "true" }, icon),
      /* @__PURE__ */ React.createElement("span", null, label)
    );
  }

  // src/components/bts/ProgressBadge/ProgressBadge.tsx
  init_shim();

  // src/components/bts/ProgressBadge/progress-badge.module.css
  var progress_badge_default = {
    badge: "progress_badge_badge",
    sm: "progress_badge_sm",
    md: "progress_badge_md",
    iconSlot: "progress_badge_iconSlot",
    notStarted: "progress_badge_notStarted",
    inProgress: "progress_badge_inProgress",
    completed: "progress_badge_completed",
    locked: "progress_badge_locked",
    prominent: "progress_badge_prominent"
  };

  // src/components/bts/ProgressBadge/ProgressBadge.tsx
  var STATE_LABEL = {
    not_started: "Not started",
    in_progress: "In progress",
    completed: "Completed",
    locked: "Locked"
  };
  var STATE_CLASS = {
    not_started: progress_badge_default.notStarted,
    in_progress: progress_badge_default.inProgress,
    completed: progress_badge_default.completed,
    locked: progress_badge_default.locked
  };
  function ProgressBadge({
    state,
    emphasis = "subtle",
    size = "sm",
    icon,
    "aria-label": ariaLabel,
    className
  }) {
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        className: cn(
          progress_badge_default.badge,
          STATE_CLASS[state],
          emphasis === "prominent" && progress_badge_default.prominent,
          progress_badge_default[size],
          className
        ),
        "aria-label": ariaLabel
      },
      icon != null && /* @__PURE__ */ React.createElement("span", { className: progress_badge_default.iconSlot, "aria-hidden": "true" }, icon),
      /* @__PURE__ */ React.createElement("span", null, STATE_LABEL[state])
    );
  }

  // src/components/bts/EventBadge/EventBadge.tsx
  init_shim();
  var ACTION_TONE = {
    create: "success",
    update: "info",
    delete: "danger",
    publish: "success",
    assign: "info",
    unassign: "neutral"
  };
  var DEFAULT_LABEL = {
    create: "Create",
    update: "Update",
    delete: "Delete",
    publish: "Publish",
    assign: "Assign",
    unassign: "Unassign"
  };
  function EventBadge({ action, label, size = "sm", className }) {
    return /* @__PURE__ */ React.createElement(
      StatusBadge,
      {
        tone: ACTION_TONE[action],
        label: label != null ? label : DEFAULT_LABEL[action],
        size,
        className
      }
    );
  }

  // src/components/bts/TagBadge/TagBadge.tsx
  init_shim();

  // src/components/bts/TagBadge/tag-badge.module.css
  var tag_badge_default = {
    badge: "tag_badge_badge",
    sm: "tag_badge_sm",
    md: "tag_badge_md",
    iconSlot: "tag_badge_iconSlot"
  };

  // src/components/bts/TagBadge/TagBadge.tsx
  function TagBadge({ label, icon, size = "sm", className }) {
    return /* @__PURE__ */ React.createElement("span", { className: cn(tag_badge_default.badge, tag_badge_default[size], className) }, icon != null && /* @__PURE__ */ React.createElement("span", { className: tag_badge_default.iconSlot, "aria-hidden": "true" }, icon), /* @__PURE__ */ React.createElement("span", null, label));
  }

  // src/components/bts/RoleBadge/RoleBadge.tsx
  init_shim();

  // src/components/bts/RoleBadge/role-badge.module.css
  var role_badge_default = {
    badge: "role_badge_badge",
    sm: "role_badge_sm",
    md: "role_badge_md",
    iconSlot: "role_badge_iconSlot"
  };

  // src/components/bts/RoleBadge/RoleBadge.tsx
  function RoleBadge({
    label,
    icon,
    size = "sm",
    "aria-label": ariaLabel,
    className
  }) {
    return /* @__PURE__ */ React.createElement("span", { className: cn(role_badge_default.badge, role_badge_default[size], className), "aria-label": ariaLabel }, icon != null && /* @__PURE__ */ React.createElement("span", { className: role_badge_default.iconSlot, "aria-hidden": "true" }, icon), /* @__PURE__ */ React.createElement("span", null, label));
  }

  // src/components/bts/CountBadge/CountBadge.tsx
  init_shim();

  // src/components/bts/CountBadge/count-badge.module.css
  var count_badge_default = {
    badge: "count_badge_badge",
    sm: "count_badge_sm",
    dot: "count_badge_dot",
    neutral: "count_badge_neutral",
    alert: "count_badge_alert"
  };

  // src/components/bts/CountBadge/CountBadge.tsx
  function CountBadge({
    count,
    max,
    tone = "neutral",
    size = "md",
    dot = false,
    "aria-label": ariaLabel,
    className
  }) {
    const toneClass = tone === "alert" ? count_badge_default.alert : count_badge_default.neutral;
    const sizeClass = size === "sm" ? count_badge_default.sm : void 0;
    const defaultLabel = dot ? `${count} notifications` : `${count} items`;
    if (dot) {
      return /* @__PURE__ */ React.createElement(
        "output",
        {
          className: cn(count_badge_default.dot, toneClass, className),
          "aria-label": ariaLabel != null ? ariaLabel : defaultLabel
        }
      );
    }
    const display = max !== void 0 && count > max ? `+${max}` : String(count);
    return /* @__PURE__ */ React.createElement(
      "output",
      {
        className: cn(count_badge_default.badge, toneClass, sizeClass, className),
        "aria-label": ariaLabel != null ? ariaLabel : defaultLabel
      },
      display
    );
  }

  // src/components/bts/DurationBadge/DurationBadge.tsx
  init_shim();

  // src/components/bts/DurationBadge/duration-badge.module.css
  var duration_badge_default = {
    badge: "duration_badge_badge",
    icon: "duration_badge_icon"
  };

  // src/components/bts/DurationBadge/formatDuration.ts
  init_shim();
  function formatDurationMinutes(minutes) {
    if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) {
      return null;
    }
    const total = Math.round(minutes);
    if (total < 60) return `${total}m`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  // src/components/bts/DurationBadge/DurationBadge.tsx
  function DurationBadge({ minutes, exact, className }) {
    const formatted = formatDurationMinutes(minutes);
    if (!formatted) return null;
    const label = exact ? formatted : `~${formatted}`;
    return /* @__PURE__ */ React.createElement("span", { className: [duration_badge_default.badge, className].filter(Boolean).join(" ") }, /* @__PURE__ */ React.createElement("span", { className: duration_badge_default.icon, "aria-hidden": "true" }, "\u23F1"), /* @__PURE__ */ React.createElement("span", null, label));
  }

  // src/components/bts/StatusPill/StatusPill.tsx
  init_shim();

  // src/components/bts/StatusPill/status-pill.module.css
  var status_pill_default = {
    pill: "status_pill_pill",
    neutral: "status_pill_neutral",
    success: "status_pill_success",
    successSolid: "status_pill_successSolid",
    warning: "status_pill_warning",
    warningSolid: "status_pill_warningSolid",
    danger: "status_pill_danger"
  };

  // src/components/bts/StatusPill/StatusPill.tsx
  var TONE_CLASS2 = {
    neutral: status_pill_default.neutral,
    success: status_pill_default.success,
    successSolid: status_pill_default.successSolid,
    warning: status_pill_default.warning,
    warningSolid: status_pill_default.warningSolid,
    danger: status_pill_default.danger
  };
  function StatusPill({
    tone = "neutral",
    children,
    title,
    "aria-label": ariaLabel,
    className
  }) {
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        className: cn(status_pill_default.pill, TONE_CLASS2[tone], className),
        title,
        "aria-label": ariaLabel
      },
      children
    );
  }

  // src/components/bts/Tabs/Tabs.tsx
  init_shim();
  var import_react = __toESM(require_react());

  // src/components/bts/Tabs/tabs.module.css
  var tabs_default = {
    tabs: "tabs_tabs",
    tab: "tabs_tab",
    tabActive: "tabs_tabActive",
    icon: "tabs_icon",
    count: "tabs_count"
  };

  // src/components/bts/Tabs/Tabs.tsx
  function Tabs({
    tabs,
    value,
    onValueChange,
    ariaLabel,
    className,
    automationId
  }) {
    const tabRefs = (0, import_react.useRef)([]);
    function enabledTabIndexes() {
      return tabs.map((tab, index) => ({ tab, index })).filter(({ tab }) => !tab.disabled).map(({ index }) => index);
    }
    function focusAndSelect(index) {
      var _a;
      const tab = tabs[index];
      if (!tab || tab.disabled) return;
      (_a = tabRefs.current[index]) == null ? void 0 : _a.focus();
      onValueChange(tab.value);
    }
    function handleKeyDown(event) {
      const activeEl = document.activeElement;
      const activeButton = activeEl instanceof HTMLButtonElement ? activeEl : null;
      const currentIndex = activeButton ? tabRefs.current.indexOf(activeButton) : -1;
      if (currentIndex === -1) return;
      const enabled = enabledTabIndexes();
      const enabledIndex = enabled.indexOf(currentIndex);
      if (enabledIndex === -1) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        focusAndSelect(enabled[(enabledIndex + 1) % enabled.length]);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        focusAndSelect(enabled[(enabledIndex - 1 + enabled.length) % enabled.length]);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusAndSelect(enabled[0]);
      } else if (event.key === "End") {
        event.preventDefault();
        const lastEnabled = enabled.at(-1);
        if (lastEnabled !== void 0) {
          focusAndSelect(lastEnabled);
        }
      }
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: cn(tabs_default.tabs, className),
        role: "tablist",
        "aria-label": ariaLabel,
        tabIndex: -1,
        onKeyDown: handleKeyDown
      },
      tabs.map((tab, index) => {
        const selected = tab.value === value;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: tab.value,
            ref: (element) => {
              tabRefs.current[index] = element;
            },
            type: "button",
            role: "tab",
            "data-automation-id": automationId ? `${automationId}-tab-${tab.value}` : void 0,
            "aria-selected": selected,
            disabled: tab.disabled,
            tabIndex: selected ? 0 : -1,
            className: cn(tabs_default.tab, selected && tabs_default.tabActive),
            onClick: () => {
              if (!tab.disabled) onValueChange(tab.value);
            }
          },
          tab.icon ? /* @__PURE__ */ React.createElement("span", { className: tabs_default.icon, "aria-hidden": true }, tab.icon) : null,
          /* @__PURE__ */ React.createElement("span", null, tab.label),
          tab.count === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: tabs_default.count }, tab.count)
        );
      })
    );
  }

  // src/components/bts/ChoiceChips/ChoiceChips.tsx
  init_shim();
  var import_react2 = __toESM(require_react());

  // src/components/bts/ChoiceChips/choice-chips.module.css
  var choice_chips_default = {
    choiceChips: "choice_chips_choiceChips",
    choiceChip: "choice_chips_choiceChip",
    choiceChipSelected: "choice_chips_choiceChipSelected",
    choiceChipCount: "choice_chips_choiceChipCount"
  };

  // src/components/bts/ChoiceChips/ChoiceChips.tsx
  function ChoiceChips({
    choices,
    value,
    onValueChange,
    ariaLabel,
    className,
    automationId
  }) {
    const chipRefs = (0, import_react2.useRef)([]);
    function enabledChoiceIndexes() {
      return choices.map((choice, index) => ({ choice, index })).filter(({ choice }) => !choice.disabled).map(({ index }) => index);
    }
    function focusAndSelect(index) {
      var _a;
      const choice = choices[index];
      if (!choice || choice.disabled) return;
      (_a = chipRefs.current[index]) == null ? void 0 : _a.focus();
      onValueChange(choice.value);
    }
    function handleKeyDown(event) {
      const activeEl = document.activeElement;
      const activeButton = activeEl instanceof HTMLButtonElement ? activeEl : null;
      const currentIndex = activeButton ? chipRefs.current.indexOf(activeButton) : -1;
      if (currentIndex === -1) return;
      const enabled = enabledChoiceIndexes();
      const enabledIndex = enabled.indexOf(currentIndex);
      if (enabledIndex === -1) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        focusAndSelect(enabled[(enabledIndex + 1) % enabled.length]);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        focusAndSelect(enabled[(enabledIndex - 1 + enabled.length) % enabled.length]);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusAndSelect(enabled[0]);
      } else if (event.key === "End") {
        event.preventDefault();
        const lastEnabled = enabled.at(-1);
        if (lastEnabled !== void 0) {
          focusAndSelect(lastEnabled);
        }
      }
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: cn(choice_chips_default.choiceChips, className),
        role: "radiogroup",
        "aria-label": ariaLabel,
        tabIndex: -1,
        onKeyDown: handleKeyDown
      },
      choices.map((choice, index) => {
        const selected = choice.value === value;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: choice.value,
            ref: (element) => {
              chipRefs.current[index] = element;
            },
            type: "button",
            role: "radio",
            "data-automation-id": automationId ? `${automationId}-chip-${choice.value}` : void 0,
            "aria-checked": selected,
            disabled: choice.disabled,
            className: cn(choice_chips_default.choiceChip, selected && choice_chips_default.choiceChipSelected),
            onClick: () => {
              if (!choice.disabled) onValueChange(choice.value);
            }
          },
          /* @__PURE__ */ React.createElement("span", null, choice.label),
          choice.count === void 0 ? null : /* @__PURE__ */ React.createElement("span", { className: choice_chips_default.choiceChipCount }, choice.count)
        );
      })
    );
  }

  // src/components/bts/Select/Select.tsx
  init_shim();
  var import_react6 = __toESM(require_react());

  // src/components/bts/internal/useSearchableListbox.ts
  init_shim();
  var import_react3 = __toESM(require_react());
  function groupOptions(options) {
    const order = [];
    const map = /* @__PURE__ */ new Map();
    options.forEach((option, index) => {
      var _a;
      const key = (_a = option.group) != null ? _a : "";
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key).push({ option, index });
    });
    return order.map((key) => ({ group: key, items: map.get(key) }));
  }
  function useSearchableListbox({
    options,
    filterOption,
    disabled = false,
    loading = false,
    onOpen
  }) {
    const [open, setOpen] = (0, import_react3.useState)(false);
    const [query, setQuery] = (0, import_react3.useState)("");
    const [activeIndex, setActiveIndex] = (0, import_react3.useState)(0);
    const rootRef = (0, import_react3.useRef)(null);
    const triggerRef = (0, import_react3.useRef)(null);
    const inputRef = (0, import_react3.useRef)(null);
    const baseId = (0, import_react3.useId)();
    const labelId = `${baseId}-label`;
    const listboxId = `${baseId}-listbox`;
    const errorId = `${baseId}-error`;
    const optionId = (index) => `${baseId}-option-${index}`;
    const filtered = (0, import_react3.useMemo)(() => {
      const q = query.trim().toLowerCase();
      return options.filter((option) => q.length === 0 || filterOption(option, q));
    }, [options, query, filterOption]);
    const enabledIndexes = (0, import_react3.useMemo)(
      () => filtered.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled),
      [filtered]
    );
    const groups = (0, import_react3.useMemo)(() => groupOptions(filtered), [filtered]);
    (0, import_react3.useEffect)(() => {
      if (!open) return;
      const onDocClick = (event) => {
        var _a;
        const target = event.target;
        if (target && ((_a = rootRef.current) == null ? void 0 : _a.contains(target))) return;
        setOpen(false);
      };
      const onDocKey = (event) => {
        var _a;
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          (_a = triggerRef.current) == null ? void 0 : _a.focus();
        }
      };
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onDocKey);
      return () => {
        document.removeEventListener("mousedown", onDocClick);
        document.removeEventListener("keydown", onDocKey);
      };
    }, [open]);
    (0, import_react3.useEffect)(() => {
      if (open) {
        const id = globalThis.setTimeout(() => {
          var _a;
          return (_a = inputRef.current) == null ? void 0 : _a.focus();
        }, 20);
        return () => globalThis.clearTimeout(id);
      }
      setQuery("");
      return void 0;
    }, [open]);
    (0, import_react3.useEffect)(() => {
      var _a, _b;
      setActiveIndex((_b = (_a = enabledIndexes[0]) == null ? void 0 : _a.index) != null ? _b : 0);
    }, [enabledIndexes]);
    const openPanel = () => {
      if (disabled || loading) return;
      setOpen(true);
      onOpen == null ? void 0 : onOpen();
    };
    const closePanel = (returnFocus = true) => {
      var _a;
      setOpen(false);
      if (returnFocus) (_a = triggerRef.current) == null ? void 0 : _a.focus();
    };
    const moveActive = (direction) => {
      if (enabledIndexes.length === 0) return;
      const positions = enabledIndexes.map((entry) => entry.index);
      const current = positions.indexOf(activeIndex);
      const nextPos = current === -1 ? 0 : (current + direction + positions.length) % positions.length;
      setActiveIndex(positions[nextPos]);
    };
    const handleNavigationKey = (event) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveActive(1);
          return true;
        case "ArrowUp":
          event.preventDefault();
          moveActive(-1);
          return true;
        case "Home":
          event.preventDefault();
          if (enabledIndexes[0]) setActiveIndex(enabledIndexes[0].index);
          return true;
        case "End":
          event.preventDefault();
          if (enabledIndexes.at(-1)) setActiveIndex(enabledIndexes.at(-1).index);
          return true;
        default:
          return false;
      }
    };
    const activeDescendant = open && filtered[activeIndex] ? optionId(activeIndex) : void 0;
    return {
      open,
      query,
      activeIndex,
      rootRef,
      triggerRef,
      inputRef,
      labelId,
      listboxId,
      errorId,
      optionId,
      filtered,
      enabledIndexes,
      groups,
      activeDescendant,
      setQuery,
      setActiveIndex,
      setOpen,
      openPanel,
      closePanel,
      moveActive,
      handleNavigationKey
    };
  }

  // src/components/bts/internal/ListboxTrigger.tsx
  init_shim();

  // node_modules/lucide-react/dist/esm/lucide-react.js
  init_shim();

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  init_shim();
  var import_react5 = __toESM(require_react());

  // node_modules/lucide-react/dist/esm/shared/src/utils.js
  init_shim();
  var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  var mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
  }).join(" ").trim();

  // node_modules/lucide-react/dist/esm/Icon.js
  init_shim();
  var import_react4 = __toESM(require_react());

  // node_modules/lucide-react/dist/esm/defaultAttributes.js
  init_shim();
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  // node_modules/lucide-react/dist/esm/Icon.js
  var Icon = (0, import_react4.forwardRef)(
    ({
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = "",
      children,
      iconNode,
      ...rest
    }, ref) => {
      return (0, import_react4.createElement)(
        "svg",
        {
          ref,
          ...defaultAttributes,
          width: size,
          height: size,
          stroke: color,
          strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
          className: mergeClasses("lucide", className),
          ...rest
        },
        [
          ...iconNode.map(([tag, attrs]) => (0, import_react4.createElement)(tag, attrs)),
          ...Array.isArray(children) ? children : [children]
        ]
      );
    }
  );

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  var createLucideIcon = (iconName, iconNode) => {
    const Component = (0, import_react5.forwardRef)(
      ({ className, ...props }, ref) => (0, import_react5.createElement)(Icon, {
        ref,
        iconNode,
        className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
        ...props
      })
    );
    Component.displayName = `${iconName}`;
    return Component;
  };

  // node_modules/lucide-react/dist/esm/icons/bell.js
  init_shim();
  var Bell = createLucideIcon("Bell", [
    ["path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", key: "1qo2s2" }],
    ["path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0", key: "qgo35s" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/box.js
  init_shim();
  var Box = createLucideIcon("Box", [
    [
      "path",
      {
        d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
        key: "hh9hay"
      }
    ],
    ["path", { d: "m3.3 7 8.7 5 8.7-5", key: "g66t2b" }],
    ["path", { d: "M12 22V12", key: "d0xqtd" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/check.js
  init_shim();
  var Check = createLucideIcon("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);

  // node_modules/lucide-react/dist/esm/icons/chevron-down.js
  init_shim();
  var ChevronDown = createLucideIcon("ChevronDown", [
    ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/copy.js
  init_shim();
  var Copy = createLucideIcon("Copy", [
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/external-link.js
  init_shim();
  var ExternalLink = createLucideIcon("ExternalLink", [
    ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
    ["path", { d: "M10 14 21 3", key: "gplh6r" }],
    ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/file-text.js
  init_shim();
  var FileText = createLucideIcon("FileText", [
    ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
    ["path", { d: "M10 9H8", key: "b1mrlr" }],
    ["path", { d: "M16 13H8", key: "t4e002" }],
    ["path", { d: "M16 17H8", key: "z1uh3a" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/gamepad-2.js
  init_shim();
  var Gamepad2 = createLucideIcon("Gamepad2", [
    ["line", { x1: "6", x2: "10", y1: "11", y2: "11", key: "1gktln" }],
    ["line", { x1: "8", x2: "8", y1: "9", y2: "13", key: "qnk9ow" }],
    ["line", { x1: "15", x2: "15.01", y1: "12", y2: "12", key: "krot7o" }],
    ["line", { x1: "18", x2: "18.01", y1: "10", y2: "10", key: "1lcuu1" }],
    [
      "path",
      {
        d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z",
        key: "mfqc10"
      }
    ]
  ]);

  // node_modules/lucide-react/dist/esm/icons/list-checks.js
  init_shim();
  var ListChecks = createLucideIcon("ListChecks", [
    ["path", { d: "m3 17 2 2 4-4", key: "1jhpwq" }],
    ["path", { d: "m3 7 2 2 4-4", key: "1obspn" }],
    ["path", { d: "M13 6h8", key: "15sg57" }],
    ["path", { d: "M13 12h8", key: "h98zly" }],
    ["path", { d: "M13 18h8", key: "oe0vm4" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/lock.js
  init_shim();
  var Lock = createLucideIcon("Lock", [
    ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
    ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/pencil.js
  init_shim();
  var Pencil = createLucideIcon("Pencil", [
    [
      "path",
      {
        d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
        key: "1a8usu"
      }
    ],
    ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/plus.js
  init_shim();
  var Plus = createLucideIcon("Plus", [
    ["path", { d: "M5 12h14", key: "1ays0h" }],
    ["path", { d: "M12 5v14", key: "s699le" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/route.js
  init_shim();
  var Route = createLucideIcon("Route", [
    ["circle", { cx: "6", cy: "19", r: "3", key: "1kj8tv" }],
    ["path", { d: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", key: "1d8sl" }],
    ["circle", { cx: "18", cy: "5", r: "3", key: "gq8acd" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/search.js
  init_shim();
  var Search = createLucideIcon("Search", [
    ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
    ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/shield.js
  init_shim();
  var Shield = createLucideIcon("Shield", [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
        key: "oel41y"
      }
    ]
  ]);

  // node_modules/lucide-react/dist/esm/icons/star.js
  init_shim();
  var Star = createLucideIcon("Star", [
    [
      "path",
      {
        d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
        key: "r04s7s"
      }
    ]
  ]);

  // node_modules/lucide-react/dist/esm/icons/trash-2.js
  init_shim();
  var Trash2 = createLucideIcon("Trash2", [
    ["path", { d: "M3 6h18", key: "d0wm0j" }],
    ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
    ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
    ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
    ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/user.js
  init_shim();
  var User = createLucideIcon("User", [
    ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
    ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/users.js
  init_shim();
  var Users = createLucideIcon("Users", [
    ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
    ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
    ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
    ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/x.js
  init_shim();
  var X = createLucideIcon("X", [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
  ]);

  // src/components/bts/internal/ListboxTrigger.tsx
  function ListboxTrigger({
    styles,
    triggerRef,
    open,
    disabled = false,
    error,
    hasValue,
    labelId,
    listboxId,
    errorId,
    automationId,
    onClick,
    onKeyDown,
    children
  }) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        ref: triggerRef,
        type: "button",
        className: cn(styles.trigger, open && styles.triggerOpen, error && styles.triggerError),
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        "aria-controls": open ? listboxId : void 0,
        "aria-labelledby": labelId,
        "aria-describedby": error ? errorId : void 0,
        disabled,
        "data-automation-id": `${automationId}-trigger`,
        onClick,
        onKeyDown
      },
      /* @__PURE__ */ React.createElement("span", { className: cn(styles.triggerText, !hasValue && styles.placeholder) }, children),
      /* @__PURE__ */ React.createElement(ChevronDown, { className: styles.chevron, "aria-hidden": true, strokeWidth: 2 })
    );
  }

  // src/components/bts/internal/ListboxOptionText.tsx
  init_shim();
  function ListboxOptionText({
    styles,
    label,
    description
  }) {
    return /* @__PURE__ */ React.createElement("span", { className: styles.optionText }, /* @__PURE__ */ React.createElement("span", { className: styles.optionLabel }, label), description ? /* @__PURE__ */ React.createElement("span", { className: styles.optionDescription }, description) : null);
  }

  // src/components/bts/Select/select.module.css
  var select_default = {
    root: "select_root",
    label: "select_label",
    labelHidden: "select_labelHidden",
    trigger: "select_trigger",
    triggerOpen: "select_triggerOpen",
    triggerError: "select_triggerError",
    triggerText: "select_triggerText",
    triggerIcon: "select_triggerIcon",
    placeholder: "select_placeholder",
    chevron: "select_chevron",
    fieldError: "select_fieldError",
    list: "select_list",
    groupHeader: "select_groupHeader",
    option: "select_option",
    optionSelected: "select_optionSelected",
    optionIcon: "select_optionIcon",
    optionText: "select_optionText",
    optionLabel: "select_optionLabel",
    optionDescription: "select_optionDescription",
    optionCheck: "select_optionCheck"
  };

  // src/components/bts/Select/Select.tsx
  function Select({
    options,
    value,
    onChange,
    label,
    placeholder = "Select\u2026",
    disabled = false,
    error,
    hideLabel = false,
    automationId = "select",
    className
  }) {
    var _a, _b;
    const [open, setOpen] = (0, import_react6.useState)(false);
    const [activeIndex, setActiveIndex] = (0, import_react6.useState)(0);
    const rootRef = (0, import_react6.useRef)(null);
    const triggerRef = (0, import_react6.useRef)(null);
    const optionRefs = (0, import_react6.useRef)([]);
    const typeaheadRef = (0, import_react6.useRef)({ buffer: "", timer: null });
    const baseId = (0, import_react6.useId)();
    const labelId = `${baseId}-label`;
    const listboxId = `${baseId}-listbox`;
    const errorId = `${baseId}-error`;
    const enabledIndexes = (0, import_react6.useMemo)(
      () => options.map((o, i) => ({ o, i })).filter(({ o }) => !o.disabled).map(({ i }) => i),
      [options]
    );
    const groups = (0, import_react6.useMemo)(() => groupOptions(options), [options]);
    const selectedOption = value == null ? null : (_a = options.find((o) => o.value === value)) != null ? _a : null;
    (0, import_react6.useEffect)(() => {
      if (!open) return;
      const onDocClick = (event) => {
        var _a2;
        const target = event.target;
        if (target && ((_a2 = rootRef.current) == null ? void 0 : _a2.contains(target))) return;
        setOpen(false);
      };
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);
    (0, import_react6.useEffect)(() => {
      var _a2;
      if (!open) return;
      const selectedIndex = options.findIndex((o) => o.value === value && !o.disabled);
      const start = selectedIndex >= 0 ? selectedIndex : (_a2 = enabledIndexes[0]) != null ? _a2 : 0;
      setActiveIndex(start);
    }, [open, options, value, enabledIndexes]);
    (0, import_react6.useEffect)(() => {
      var _a2;
      if (open) (_a2 = optionRefs.current[activeIndex]) == null ? void 0 : _a2.focus();
    }, [open, activeIndex]);
    const closeAndFocusTrigger = () => {
      var _a2;
      setOpen(false);
      (_a2 = triggerRef.current) == null ? void 0 : _a2.focus();
    };
    const commit = (option) => {
      if (option.disabled) return;
      onChange(option.value);
      closeAndFocusTrigger();
    };
    const moveActive = (direction) => {
      if (enabledIndexes.length === 0) return;
      const current = enabledIndexes.indexOf(activeIndex);
      const next = current === -1 ? 0 : (current + direction + enabledIndexes.length) % enabledIndexes.length;
      setActiveIndex(enabledIndexes[next]);
    };
    const typeahead = (char) => {
      const state = typeaheadRef.current;
      state.buffer += char.toLowerCase();
      if (state.timer) globalThis.clearTimeout(state.timer);
      state.timer = globalThis.setTimeout(() => {
        state.buffer = "";
      }, 500);
      const match = options.findIndex(
        (o) => !o.disabled && o.label.toLowerCase().startsWith(state.buffer)
      );
      if (match >= 0) setActiveIndex(match);
    };
    const handleListKeyDown = (event) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveActive(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveActive(-1);
          break;
        case "Home":
          event.preventDefault();
          if (enabledIndexes[0] !== void 0) setActiveIndex(enabledIndexes[0]);
          break;
        case "End":
          event.preventDefault();
          if (enabledIndexes.at(-1) !== void 0) setActiveIndex(enabledIndexes.at(-1));
          break;
        case "Escape":
          event.preventDefault();
          closeAndFocusTrigger();
          break;
        default:
          if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
            typeahead(event.key);
          }
          break;
      }
    };
    const handleTriggerKeyDown = (event) => {
      if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        setOpen(true);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { ref: rootRef, className: cn(select_default.root, className) }, /* @__PURE__ */ React.createElement("span", { id: labelId, className: cn(select_default.label, hideLabel && select_default.labelHidden) }, label), /* @__PURE__ */ React.createElement(
      ListboxTrigger,
      {
        styles: select_default,
        triggerRef,
        open,
        disabled,
        error,
        hasValue: selectedOption != null,
        labelId,
        listboxId,
        errorId,
        automationId,
        onClick: () => setOpen((v) => !v),
        onKeyDown: handleTriggerKeyDown
      },
      (selectedOption == null ? void 0 : selectedOption.icon) ? /* @__PURE__ */ React.createElement("span", { className: select_default.triggerIcon, "aria-hidden": true }, selectedOption.icon) : null,
      (_b = selectedOption == null ? void 0 : selectedOption.label) != null ? _b : placeholder
    ), error ? /* @__PURE__ */ React.createElement("p", { id: errorId, className: select_default.fieldError, role: "alert" }, error) : null, open ? /* @__PURE__ */ React.createElement(
      "ul",
      {
        id: listboxId,
        className: select_default.list,
        role: "listbox",
        "aria-labelledby": labelId,
        onKeyDown: handleListKeyDown
      },
      groups.flatMap(({ group, items }) => {
        const rows = [];
        if (group) {
          rows.push(
            /* @__PURE__ */ React.createElement(
              "li",
              {
                key: `group-${group}`,
                className: select_default.groupHeader,
                role: "presentation",
                "aria-hidden": "true"
              },
              group
            )
          );
        }
        for (const { option, index } of items) {
          const selected = option.value === value;
          rows.push(
            /* @__PURE__ */ React.createElement("li", { key: option.value, role: "presentation" }, /* @__PURE__ */ React.createElement(
              "button",
              {
                ref: (el) => {
                  optionRefs.current[index] = el;
                },
                type: "button",
                role: "option",
                "aria-selected": selected,
                tabIndex: index === activeIndex ? 0 : -1,
                className: cn(select_default.option, selected && select_default.optionSelected),
                disabled: option.disabled,
                "data-automation-id": `${automationId}-option-${option.value}`,
                onClick: () => commit(option)
              },
              option.icon ? /* @__PURE__ */ React.createElement("span", { className: select_default.optionIcon, "aria-hidden": true }, option.icon) : null,
              /* @__PURE__ */ React.createElement(
                ListboxOptionText,
                {
                  styles: select_default,
                  label: option.label,
                  description: option.description
                }
              ),
              selected ? /* @__PURE__ */ React.createElement("span", { className: select_default.optionCheck, "aria-hidden": true }, "\u2713") : null
            ))
          );
        }
        return rows;
      })
    ) : null);
  }

  // src/components/bts/Combobox/Combobox.tsx
  init_shim();

  // src/components/bts/internal/SearchableListboxPanel.tsx
  init_shim();
  function SearchableListboxPanel({
    styles,
    inputRef,
    query,
    setQuery,
    onInputKeyDown,
    searchPlaceholder,
    searchAriaLabel,
    listboxId,
    labelId,
    activeDescendant,
    automationId,
    multiselectable = false,
    searchTrailing,
    filtered,
    groups,
    activeIndex,
    setActiveIndex,
    optionId,
    optionsLength,
    emptyMessage,
    noOptionsMessage,
    renderOption
  }) {
    return /* @__PURE__ */ React.createElement("div", { className: styles.panel }, /* @__PURE__ */ React.createElement("div", { className: styles.searchWrap }, /* @__PURE__ */ React.createElement(Search, { className: styles.searchIcon, "aria-hidden": true, strokeWidth: 2 }), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: inputRef,
        type: "text",
        role: "combobox",
        className: styles.searchInput,
        value: query,
        placeholder: searchPlaceholder,
        "aria-label": searchAriaLabel != null ? searchAriaLabel : searchPlaceholder,
        "aria-expanded": true,
        "aria-controls": listboxId,
        "aria-activedescendant": activeDescendant,
        "aria-autocomplete": "list",
        autoComplete: "off",
        "data-automation-id": `${automationId}-search`,
        onChange: (event) => setQuery(event.target.value),
        onKeyDown: onInputKeyDown
      }
    ), searchTrailing), /* @__PURE__ */ React.createElement(
      "ul",
      {
        id: listboxId,
        className: styles.list,
        role: "listbox",
        "aria-multiselectable": multiselectable ? "true" : void 0,
        "aria-labelledby": labelId
      },
      filtered.length === 0 ? /* @__PURE__ */ React.createElement("li", { className: styles.empty, role: "presentation" }, optionsLength === 0 ? noOptionsMessage : emptyMessage) : groups.flatMap(({ group, items }) => {
        const rows = [];
        if (group) {
          rows.push(
            /* @__PURE__ */ React.createElement(
              "li",
              {
                key: `group-${group}`,
                className: styles.groupHeader,
                role: "presentation",
                "aria-hidden": "true"
              },
              group
            )
          );
        }
        for (const { option, index } of items) {
          const active = index === activeIndex;
          const { selected, className, onSelect, content } = renderOption({
            option,
            index,
            active
          });
          rows.push(
            /* @__PURE__ */ React.createElement("li", { key: option.value, role: "presentation" }, /* @__PURE__ */ React.createElement(
              "button",
              {
                type: "button",
                id: optionId(index),
                role: "option",
                "aria-selected": selected,
                className,
                disabled: option.disabled,
                "data-automation-id": `${automationId}-option-${option.value}`,
                onClick: onSelect,
                onMouseEnter: () => setActiveIndex(index)
              },
              content
            ))
          );
        }
        return rows;
      })
    ));
  }

  // src/components/bts/Combobox/combobox.module.css
  var combobox_default = {
    root: "combobox_root",
    label: "combobox_label",
    labelHidden: "combobox_labelHidden",
    trigger: "combobox_trigger",
    triggerOpen: "combobox_triggerOpen",
    triggerError: "combobox_triggerError",
    triggerText: "combobox_triggerText",
    placeholder: "combobox_placeholder",
    chevron: "combobox_chevron",
    fieldError: "combobox_fieldError",
    panel: "combobox_panel",
    searchWrap: "combobox_searchWrap",
    searchIcon: "combobox_searchIcon",
    searchInput: "combobox_searchInput",
    list: "combobox_list",
    empty: "combobox_empty",
    groupHeader: "combobox_groupHeader",
    option: "combobox_option",
    optionActive: "combobox_optionActive",
    optionSelected: "combobox_optionSelected",
    optionText: "combobox_optionText",
    optionLabel: "combobox_optionLabel",
    optionDescription: "combobox_optionDescription",
    optionCheck: "combobox_optionCheck"
  };

  // src/components/bts/Combobox/Combobox.tsx
  function defaultFilter(option, query) {
    return option.label.toLowerCase().includes(query);
  }
  function Combobox({
    options,
    value,
    onChange,
    label,
    placeholder = "Select\u2026",
    searchPlaceholder = "Search\u2026",
    searchAriaLabel,
    emptyMessage = "No matches found.",
    noOptionsMessage = "No options available.",
    disabled = false,
    loading = false,
    error,
    hideLabel = false,
    filterOption = defaultFilter,
    onOpen,
    automationId = "combobox",
    className
  }) {
    var _a, _b;
    const {
      open,
      query,
      activeIndex,
      rootRef,
      triggerRef,
      inputRef,
      labelId,
      listboxId,
      errorId,
      optionId,
      filtered,
      groups,
      activeDescendant,
      setQuery,
      setActiveIndex,
      setOpen,
      openPanel,
      closePanel,
      handleNavigationKey
    } = useSearchableListbox({ options, filterOption, disabled, loading, onOpen });
    const selectedOption = value == null ? null : (_a = options.find((o) => o.value === value)) != null ? _a : null;
    const triggerText = (_b = selectedOption == null ? void 0 : selectedOption.label) != null ? _b : placeholder;
    const commit = (option) => {
      if (option.disabled) return;
      onChange(option.value);
      closePanel();
    };
    const handleInputKeyDown = (event) => {
      if (handleNavigationKey(event)) return;
      switch (event.key) {
        case "Enter": {
          event.preventDefault();
          const active = filtered[activeIndex];
          if (active && !active.disabled) commit(active);
          break;
        }
        case "Tab":
          setOpen(false);
          break;
        default:
          break;
      }
    };
    return /* @__PURE__ */ React.createElement("div", { ref: rootRef, className: cn(combobox_default.root, className) }, /* @__PURE__ */ React.createElement("span", { id: labelId, className: cn(combobox_default.label, hideLabel && combobox_default.labelHidden) }, label), /* @__PURE__ */ React.createElement(
      ListboxTrigger,
      {
        styles: combobox_default,
        triggerRef,
        open,
        disabled: disabled || loading,
        error,
        hasValue: selectedOption != null,
        labelId,
        listboxId,
        errorId,
        automationId,
        onClick: () => open ? closePanel(false) : openPanel()
      },
      triggerText
    ), error ? /* @__PURE__ */ React.createElement("p", { id: errorId, className: combobox_default.fieldError, role: "alert" }, error) : null, open ? /* @__PURE__ */ React.createElement(
      SearchableListboxPanel,
      {
        styles: combobox_default,
        inputRef,
        query,
        setQuery,
        onInputKeyDown: handleInputKeyDown,
        searchPlaceholder,
        searchAriaLabel,
        listboxId,
        labelId,
        activeDescendant,
        automationId,
        filtered,
        groups,
        activeIndex,
        setActiveIndex,
        optionId,
        optionsLength: options.length,
        emptyMessage,
        noOptionsMessage,
        renderOption: ({ option, active }) => {
          const selected = option.value === value;
          return {
            selected,
            className: cn(
              combobox_default.option,
              active && combobox_default.optionActive,
              selected && combobox_default.optionSelected
            ),
            onSelect: () => commit(option),
            content: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
              ListboxOptionText,
              {
                styles: combobox_default,
                label: option.label,
                description: option.description
              }
            ), selected ? /* @__PURE__ */ React.createElement("span", { className: combobox_default.optionCheck, "aria-hidden": true }, "\u2713") : null)
          };
        }
      }
    ) : null);
  }

  // src/components/bts/MultiCombobox/MultiCombobox.tsx
  init_shim();
  var import_react7 = __toESM(require_react());

  // src/components/bts/MultiCombobox/multi-combobox.module.css
  var multi_combobox_default = {
    root: "multi_combobox_root",
    label: "multi_combobox_label",
    labelHidden: "multi_combobox_labelHidden",
    control: "multi_combobox_control",
    controlOpen: "multi_combobox_controlOpen",
    controlError: "multi_combobox_controlError",
    placeholder: "multi_combobox_placeholder",
    chips: "multi_combobox_chips",
    chip: "multi_combobox_chip",
    chipLabel: "multi_combobox_chipLabel",
    chipRemove: "multi_combobox_chipRemove",
    toggle: "multi_combobox_toggle",
    chevron: "multi_combobox_chevron",
    fieldError: "multi_combobox_fieldError",
    panel: "multi_combobox_panel",
    searchWrap: "multi_combobox_searchWrap",
    searchIcon: "multi_combobox_searchIcon",
    searchInput: "multi_combobox_searchInput",
    clearAll: "multi_combobox_clearAll",
    list: "multi_combobox_list",
    empty: "multi_combobox_empty",
    groupHeader: "multi_combobox_groupHeader",
    option: "multi_combobox_option",
    optionActive: "multi_combobox_optionActive",
    checkbox: "multi_combobox_checkbox",
    checkboxChecked: "multi_combobox_checkboxChecked",
    optionText: "multi_combobox_optionText",
    optionLabel: "multi_combobox_optionLabel",
    optionDescription: "multi_combobox_optionDescription"
  };

  // src/components/bts/MultiCombobox/MultiCombobox.tsx
  function defaultFilter2(option, query) {
    return option.label.toLowerCase().includes(query);
  }
  function MultiCombobox({
    options,
    values,
    onChange,
    label,
    placeholder = "Select\u2026",
    searchPlaceholder = "Search\u2026",
    searchAriaLabel,
    emptyMessage = "No matches found.",
    noOptionsMessage = "No options available.",
    disabled = false,
    error,
    hideLabel = false,
    clearable = true,
    filterOption = defaultFilter2,
    automationId = "multi-combobox",
    className
  }) {
    const {
      open,
      query,
      activeIndex,
      rootRef,
      triggerRef,
      inputRef,
      labelId,
      listboxId,
      errorId,
      optionId,
      filtered,
      groups,
      activeDescendant,
      setQuery,
      setActiveIndex,
      setOpen,
      handleNavigationKey
    } = useSearchableListbox({ options, filterOption, disabled });
    const valueSet = (0, import_react7.useMemo)(() => new Set(values), [values]);
    const selectedOptions = (0, import_react7.useMemo)(
      () => options.filter((o) => valueSet.has(o.value)),
      [options, valueSet]
    );
    const toggleValue = (option) => {
      if (option.disabled) return;
      onChange(
        valueSet.has(option.value) ? values.filter((v) => v !== option.value) : [...values, option.value]
      );
    };
    const removeValue = (value) => onChange(values.filter((v) => v !== value));
    const handleInputKeyDown = (event) => {
      if (handleNavigationKey(event)) return;
      switch (event.key) {
        case "Enter": {
          event.preventDefault();
          const active = filtered[activeIndex];
          if (active) toggleValue(active);
          break;
        }
        case "Backspace":
          if (query.length === 0 && values.length > 0) {
            removeValue(values[values.length - 1]);
          }
          break;
        default:
          break;
      }
    };
    const triggerAriaLabel = `${label}${values.length > 0 ? `, ${values.length} selected` : ""}`;
    return /* @__PURE__ */ React.createElement("div", { ref: rootRef, className: cn(multi_combobox_default.root, className) }, /* @__PURE__ */ React.createElement("span", { id: labelId, className: cn(multi_combobox_default.label, hideLabel && multi_combobox_default.labelHidden) }, label), /* @__PURE__ */ React.createElement("div", { className: cn(multi_combobox_default.control, open && multi_combobox_default.controlOpen, error && multi_combobox_default.controlError) }, selectedOptions.length === 0 ? /* @__PURE__ */ React.createElement("span", { className: multi_combobox_default.placeholder }, placeholder) : /* @__PURE__ */ React.createElement("ul", { className: multi_combobox_default.chips }, selectedOptions.map((option) => /* @__PURE__ */ React.createElement("li", { key: option.value, className: multi_combobox_default.chip }, /* @__PURE__ */ React.createElement("span", { className: multi_combobox_default.chipLabel }, option.label), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: multi_combobox_default.chipRemove,
        "aria-label": `Remove ${option.label}`,
        "data-automation-id": `${automationId}-remove-${option.value}`,
        disabled,
        onClick: () => removeValue(option.value)
      },
      /* @__PURE__ */ React.createElement(X, { size: 12, "aria-hidden": true, strokeWidth: 2.5 })
    )))), /* @__PURE__ */ React.createElement(
      "button",
      {
        ref: triggerRef,
        type: "button",
        className: multi_combobox_default.toggle,
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        "aria-controls": open ? listboxId : void 0,
        "aria-label": triggerAriaLabel,
        "aria-describedby": error ? errorId : void 0,
        disabled,
        "data-automation-id": `${automationId}-trigger`,
        onClick: () => setOpen((v) => !v)
      },
      /* @__PURE__ */ React.createElement(ChevronDown, { className: multi_combobox_default.chevron, "aria-hidden": true, strokeWidth: 2 })
    )), error ? /* @__PURE__ */ React.createElement("p", { id: errorId, className: multi_combobox_default.fieldError, role: "alert" }, error) : null, open ? /* @__PURE__ */ React.createElement(
      SearchableListboxPanel,
      {
        styles: multi_combobox_default,
        inputRef,
        query,
        setQuery,
        onInputKeyDown: handleInputKeyDown,
        searchPlaceholder,
        searchAriaLabel,
        listboxId,
        labelId,
        activeDescendant,
        automationId,
        multiselectable: true,
        searchTrailing: clearable && values.length > 0 ? /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: multi_combobox_default.clearAll,
            "data-automation-id": `${automationId}-clear`,
            onClick: () => onChange([])
          },
          "Clear all"
        ) : null,
        filtered,
        groups,
        activeIndex,
        setActiveIndex,
        optionId,
        optionsLength: options.length,
        emptyMessage,
        noOptionsMessage,
        renderOption: ({ option, active }) => {
          const selected = valueSet.has(option.value);
          return {
            selected,
            className: cn(multi_combobox_default.option, active && multi_combobox_default.optionActive),
            onSelect: () => toggleValue(option),
            content: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: cn(multi_combobox_default.checkbox, selected && multi_combobox_default.checkboxChecked) }, selected ? /* @__PURE__ */ React.createElement(Check, { size: 12, "aria-hidden": true, strokeWidth: 3 }) : null), /* @__PURE__ */ React.createElement(
              ListboxOptionText,
              {
                styles: multi_combobox_default,
                label: option.label,
                description: option.description
              }
            ))
          };
        }
      }
    ) : null);
  }

  // src/components/bts/LanguageDropdown/LanguageDropdown.tsx
  init_shim();
  var import_react8 = __toESM(require_react());

  // src/components/bts/LanguageDropdown/languageLabels.ts
  init_shim();
  var NATIVE_NAMES = {
    en: "English",
    es: "Espa\xF1ol",
    fr: "Fran\xE7ais",
    de: "Deutsch",
    it: "Italiano",
    pt: "Portugu\xEAs",
    "pt-BR": "Portugu\xEAs (Brasil)",
    "pt-br": "Portugu\xEAs (Brasil)",
    nl: "Nederlands",
    ja: "\u65E5\u672C\u8A9E",
    ko: "\uD55C\uAD6D\uC5B4",
    zh: "\u4E2D\u6587",
    "zh-CN": "\u7B80\u4F53\u4E2D\u6587",
    "zh-cn": "\u7B80\u4F53\u4E2D\u6587",
    "zh-TW": "\u7E41\u9AD4\u4E2D\u6587",
    "zh-tw": "\u7E41\u9AD4\u4E2D\u6587",
    ar: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    ru: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    pl: "Polski",
    sv: "Svenska",
    da: "Dansk",
    nb: "Norsk",
    no: "Norsk",
    fi: "Suomi",
    cs: "\u010Ce\u0161tina",
    hu: "Magyar",
    ro: "Rom\xE2n\u0103",
    tr: "T\xFCrk\xE7e",
    th: "\u0E44\u0E17\u0E22",
    vi: "Ti\u1EBFng Vi\u1EC7t",
    id: "Bahasa Indonesia",
    ms: "Bahasa Melayu",
    hi: "\u0939\u093F\u0928\u094D\u0926\u0940",
    uk: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430",
    el: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC",
    he: "\u05E2\u05D1\u05E8\u05D9\u05EA",
    sk: "Sloven\u010Dina",
    bg: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438",
    hr: "Hrvatski",
    sl: "Sloven\u0161\u010Dina",
    et: "Eesti",
    lv: "Latvie\u0161u",
    lt: "Lietuvi\u0173"
  };
  function normalizeCode(code) {
    return code.trim();
  }
  function baseCode(code) {
    var _a;
    return ((_a = code.split(/[-_]/)[0]) != null ? _a : code).toLowerCase();
  }
  var displayNamesCache;
  function intlNativeName(code) {
    var _a;
    try {
      if (!displayNamesCache) {
        displayNamesCache = new Intl.DisplayNames(["en"], { type: "language" });
      }
      const base = baseCode(code);
      return (_a = displayNamesCache.of(base)) != null ? _a : displayNamesCache.of(code);
    } catch {
      return void 0;
    }
  }
  function nativeNameFor(code, fallback) {
    var _a, _b;
    const key = normalizeCode(code);
    const direct = (_a = NATIVE_NAMES[key]) != null ? _a : NATIVE_NAMES[key.toLowerCase()];
    if (direct) return direct;
    return (_b = intlNativeName(key)) != null ? _b : fallback;
  }
  function codeBadge(code) {
    var _a;
    const base = (_a = code.split(/[-_]/)[0]) != null ? _a : code;
    return base.slice(0, 2).toUpperCase();
  }

  // src/components/bts/LanguageDropdown/LanguageTranslateIcon.tsx
  init_shim();
  function LanguageTranslateIcon({ className }) {
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "195 35 455 520",
        fill: "currentColor",
        className,
        "aria-hidden": true
      },
      /* @__PURE__ */ React.createElement("polygon", { points: "512.55 488.24 542.37 537.3 558.09 491.72" }),
      /* @__PURE__ */ React.createElement("path", { d: "M277.8,213.22c-1.12-1.1,1.46,8.97,5.04,12.59c6.35,6.41,11.31,7.23,13.95,7.34c5.84,0.23,13.06-1.46,17.34-3.25c4.14-1.77,11.4-5.47,14.15-10.88c0.58-1.16,2.17-3.1,1.17-7.89c-0.76-3.69-3.11-4.98-5.97-4.78c-2.86,0.19-11.53,2.51-15.73,3.79c-4.19,1.27-12.83,3.9-16.6,4.72C287.4,215.68,279.12,214.48,277.8,213.22z" }),
      /* @__PURE__ */ React.createElement("path", { d: "M383.96,333.55c-1.66-0.6-35.96-14.81-40.83-17.14c-3.98-1.91-13.74-6.04-18.33-7.91c12.93-19.94,21.09-34.98,22.18-37.28c2.01-4.19,15.7-30.98,16.02-32.62c0.31-1.67,0.7-7.84,0.4-9.31c-0.3-1.5-5.32,1.38-12.13,3.69c-6.82,2.3-19.79,10.74-24.8,11.79c-5.03,1.05-21.09,7.13-29.32,9.86c-8.22,2.73-23.77,7.47-30.17,9.2c-6.41,1.73-12,1.86-15.58,2.95c0,0,0.48,5.02,1.43,6.52c0.94,1.5,4.33,5.19,8.27,6.22c3.94,1.04,10.46,0.62,13.44-0.06c2.97-0.69,8.11-3.2,8.8-4.3c0.7-1.12-0.36-4.55,0.81-5.59c1.19-1.03,16.84-4.69,22.75-6.47c5.91-1.82,28.54-9.61,31.61-9.21c-0.97,3.22-19.17,39.28-25.04,50.03c-5.86,10.75-39.93,58.07-47.18,66.41c-5.5,6.34-18.84,22.56-23.46,26.22c1.17,0.32,9.42-0.39,10.93-1.32c9.38-5.78,25-25.22,30.03-31.14c14.95-17.53,28.08-35.95,38.5-51.75h0.01c2.03,0.85,18.43,14.21,22.71,17.17c4.28,2.96,21.17,12.39,24.83,13.95c3.66,1.58,17.72,8.07,18.32,5.87C388.76,347.12,385.62,334.18,383.96,333.55z" }),
      /* @__PURE__ */ React.createElement("path", { d: "M304.69,512.21c3.29,2.01,6.39,3.65,9.86,5.3c6.94,3.47,14.79,7.12,22.28,9.86c10.23,3.83,20.45,6.94,30.68,9.31c5.66,1.28,11.87,2.37,17.9,3.29c0.55,0,16.8,2.01,20.09,2.01h16.44c6.39-0.55,12.42-0.91,18.81-1.83c5.11-0.73,10.77-1.64,16.25-2.92c4.02-0.91,8.22-1.83,12.24-3.1c3.83-1.1,8.22-2.56,12.42-4.02c2.74-0.91,5.66-2.19,8.58-3.29c2.37-1.1,5.3-2.37,8.04-3.47c3.29-1.46,7.12-3.47,10.77-5.3c2.92-1.46,6.21-3.29,9.31-5.11c2.37-1.28,7.85-5.48,10.77-5.48c3.29,0,5.48,2.92,5.48,5.48c0,5.3-7.12,6.94-10.41,9.31c-3.47,2.37-7.67,4.2-11.32,6.21c-7.3,3.83-14.79,7.12-21.91,9.86c-9.31,3.47-19.54,6.76-28.67,8.95c-3.47,0.73-6.94,1.64-10.41,2.19c-1.83,0.37-20.82,3.29-26.11,3.29h-24.11c-6.39-0.55-13.15-1.28-19.54-2.19c-5.66-0.91-11.69-2.01-17.35-3.29c-4.38-0.91-9.13-2.19-13.33-3.47c-7.3-2.01-14.43-4.57-21.37-7.3c-12.6-4.75-25.75-10.96-38.17-19.17c-2.19-1.46-2.37-2.92-2.37-4.57c0-2.74,2.01-5.3,5.3-5.3C297.75,507.47,303.59,511.67,304.69,512.21z" }),
      /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("path", { d: "M639.84,180.4l-40.77-12.98V48.36c0-3.47-2.56-5.84-5.84-5.84c-2.56,0-84.92,28.31-91.49,30.68c-22.33,7.44-86.8,29.73-86.8,29.73l0,0c-1.03,0.3-2.64,0.79-4.74,1.45L252.85,48.85c-1.19-0.42-2.43,0.46-2.43,1.72v2v104.72c-24.41,8.17-41.81,14.02-42.7,14.34c-1.64,0.55-4.2,0.91-5.66,2.92c-0.73,0.73-0.91,2.01-1.28,2.92v306.98c0,0.37,0.18,0.55,0.18,0.73c1.1,2.37,3.1,3.84,5.3,3.84c2.74,0,208.37-69.03,212.93-70.86c0.22-0.07,0.46-0.24,0.7-0.44l218.84,69.75c1.18,0.38,2.38-0.5,2.38-1.74V182.14C641.11,181.35,640.6,180.64,639.84,180.4z M410.97,409.4l-199.05,66.29V182.04l199.05-66.29V409.4z M587.93,55.67v108.21l-164.49-52.35L587.93,55.67z M567.69,385.27l-10.52-38.43l-60.52-18.34l-13.01,31.3l-29.29-8.89l62.18-152.59l28.51,8.64l51.94,187.19L567.69,385.27z" }), /* @__PURE__ */ React.createElement("polygon", { points: "507.84 300.38 547.77 312.48 529.56 247.88" }))
    );
  }

  // src/components/bts/LanguageDropdown/languageDropdown.module.css
  var languageDropdown_default = {
    root: "languageDropdown_root",
    rootFixedTopRight: "languageDropdown_rootFixedTopRight",
    trigger: "languageDropdown_trigger",
    triggerIcon: "languageDropdown_triggerIcon",
    triggerCode: "languageDropdown_triggerCode",
    dropdown: "languageDropdown_dropdown",
    header: "languageDropdown_header",
    list: "languageDropdown_list",
    row: "languageDropdown_row",
    rowCurrent: "languageDropdown_rowCurrent",
    rowText: "languageDropdown_rowText",
    rowName: "languageDropdown_rowName",
    rowSub: "languageDropdown_rowSub",
    rowCheck: "languageDropdown_rowCheck"
  };

  // src/components/bts/LanguageDropdown/LanguageDropdown.tsx
  function sameLang(a, b) {
    return a.toLowerCase() === b.toLowerCase();
  }
  function labelsFor(lang) {
    return {
      native: nativeNameFor(lang.code, lang.name),
      english: lang.name
    };
  }
  function sortLanguages(languages, current) {
    return [...languages].sort((a, b) => {
      if (sameLang(a.code, current)) return -1;
      if (sameLang(b.code, current)) return 1;
      return a.name.localeCompare(b.name, void 0, { sensitivity: "base" });
    });
  }
  function LanguageDropdown({
    languages,
    currentLanguage,
    onSelectLanguage,
    restrictToLanguages,
    placement = "inline",
    automationId = "language-dropdown"
  }) {
    var _a, _b;
    const listId = (0, import_react8.useId)();
    const rootRef = (0, import_react8.useRef)(null);
    const [open, setOpen] = (0, import_react8.useState)(false);
    (0, import_react8.useEffect)(() => {
      if (!open) return;
      const onDoc = (e) => {
        const el = rootRef.current;
        if (el && e.target instanceof Node && !el.contains(e.target)) setOpen(false);
      };
      const onKey = (e) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);
    const visibleLanguages = (restrictToLanguages == null ? void 0 : restrictToLanguages.length) ? languages.filter((l) => restrictToLanguages.some((r2) => sameLang(r2, l.code))) : languages;
    const currentMeta = (_b = (_a = visibleLanguages.find((l) => sameLang(l.code, currentLanguage))) != null ? _a : languages.find((l) => sameLang(l.code, currentLanguage))) != null ? _b : {
      code: currentLanguage,
      name: currentLanguage
    };
    const currentLabels = labelsFor(currentMeta);
    const sortedLanguages = sortLanguages(visibleLanguages, currentLanguage);
    const hasSwitcher = visibleLanguages.length > 1;
    const selectLanguage = (code) => {
      onSelectLanguage(code);
      setOpen(false);
    };
    if (visibleLanguages.length === 0) return null;
    const triggerCode = codeBadge(currentLanguage || "en");
    const rootClassName = placement === "fixed-top-right" ? `${languageDropdown_default.root} ${languageDropdown_default.rootFixedTopRight}` : languageDropdown_default.root;
    return /* @__PURE__ */ React.createElement("div", { ref: rootRef, className: rootClassName }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: languageDropdown_default.trigger,
        "data-automation-id": `${automationId}-trigger`,
        title: "Language",
        "aria-expanded": open,
        "aria-haspopup": "listbox",
        "aria-controls": hasSwitcher ? listId : void 0,
        "aria-label": `Change language (current: ${currentLabels.english})`,
        disabled: !hasSwitcher,
        onClick: () => hasSwitcher && setOpen((o) => !o)
      },
      /* @__PURE__ */ React.createElement(LanguageTranslateIcon, { className: languageDropdown_default.triggerIcon }),
      /* @__PURE__ */ React.createElement("span", { className: languageDropdown_default.triggerCode }, triggerCode)
    ), open && hasSwitcher ? /* @__PURE__ */ React.createElement("div", { id: listId, className: languageDropdown_default.dropdown, role: "listbox", "aria-label": "Choose language" }, /* @__PURE__ */ React.createElement("p", { className: languageDropdown_default.header }, "Language"), /* @__PURE__ */ React.createElement("ul", { className: languageDropdown_default.list }, sortedLanguages.map((lang) => {
      const { native, english } = labelsFor(lang);
      const selected = sameLang(lang.code, currentLanguage);
      return /* @__PURE__ */ React.createElement("li", { key: lang.code, role: "presentation" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: selected ? `${languageDropdown_default.row} ${languageDropdown_default.rowCurrent}` : languageDropdown_default.row,
          "data-automation-id": `${automationId}-option-${lang.code}`,
          role: "option",
          "aria-selected": selected,
          "aria-label": `${native}, ${english}`,
          onClick: () => selectLanguage(lang.code)
        },
        /* @__PURE__ */ React.createElement("span", { className: languageDropdown_default.rowText }, /* @__PURE__ */ React.createElement("span", { className: languageDropdown_default.rowName }, native), /* @__PURE__ */ React.createElement("span", { className: languageDropdown_default.rowSub }, english)),
        selected ? /* @__PURE__ */ React.createElement("span", { className: languageDropdown_default.rowCheck, "aria-hidden": true }, "\u2713") : null
      ));
    }))) : null);
  }

  // src/components/bts/RowActions/RowActions.tsx
  init_shim();
  var import_react9 = __toESM(require_react());
  var import_react_dom = __toESM(require_react_dom());

  // src/components/bts/RowActions/row-actions.module.css
  var row_actions_default = {
    trigger: "row_actions_trigger",
    menu: "row_actions_menu",
    item: "row_actions_item",
    itemIcon: "row_actions_itemIcon",
    itemDanger: "row_actions_itemDanger",
    itemDisabled: "row_actions_itemDisabled",
    menuDivider: "row_actions_menuDivider",
    triggerLeading: "row_actions_triggerLeading"
  };

  // src/components/bts/RowActions/RowActions.tsx
  var MENU_GAP_PX = 4;
  var VIEWPORT_PADDING_PX = 8;
  function estimateMenuHeight(items) {
    const itemCount = items.filter((item) => !item.isDivider).length;
    return itemCount * 36 + 8;
  }
  function measureMenuHeight(menuEl, items) {
    const measured = menuEl.getBoundingClientRect().height || menuEl.offsetHeight;
    return measured > 0 ? measured : estimateMenuHeight(items);
  }
  function computeRowActionsMenuPosition(triggerRect, menuHeight, viewportHeight = window.innerHeight) {
    const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_PADDING_PX;
    const spaceAbove = triggerRect.top - VIEWPORT_PADDING_PX;
    const requiredHeight = menuHeight + MENU_GAP_PX;
    const openBelow = spaceBelow >= requiredHeight || spaceBelow >= spaceAbove;
    const top = openBelow ? triggerRect.bottom + MENU_GAP_PX : Math.max(VIEWPORT_PADDING_PX, triggerRect.top - menuHeight - MENU_GAP_PX);
    return { top, left: triggerRect.right };
  }
  function computeMenuPosition(triggerRect, menuHeight) {
    return computeRowActionsMenuPosition(triggerRect, menuHeight);
  }
  function RowActions({
    items,
    triggerLabel,
    triggerAriaLabel,
    triggerClassName,
    triggerLeadingIcon,
    automationId
  }) {
    const [open, setOpen] = (0, import_react9.useState)(false);
    const [menuPos, setMenuPos] = (0, import_react9.useState)(null);
    const triggerRef = (0, import_react9.useRef)(null);
    const menuRef = (0, import_react9.useRef)(null);
    const updateMenuPosition = (0, import_react9.useCallback)(() => {
      if (!triggerRef.current || !menuRef.current) return false;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuHeight = measureMenuHeight(menuRef.current, items);
      setMenuPos(computeMenuPosition(triggerRect, menuHeight));
      return menuRef.current.getBoundingClientRect().height > 0 || menuRef.current.offsetHeight > 0;
    }, [items]);
    function openMenu() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos(computeMenuPosition(rect, estimateMenuHeight(items)));
      setOpen(true);
    }
    (0, import_react9.useLayoutEffect)(() => {
      if (!open) {
        setMenuPos(null);
        return;
      }
      if (updateMenuPosition()) return;
      const frame = requestAnimationFrame(() => {
        updateMenuPosition();
      });
      return () => cancelAnimationFrame(frame);
    }, [open, items, updateMenuPosition]);
    (0, import_react9.useEffect)(() => {
      if (!open) return;
      const handleReposition = () => updateMenuPosition();
      window.addEventListener("scroll", handleReposition, true);
      window.addEventListener("resize", handleReposition);
      return () => {
        window.removeEventListener("scroll", handleReposition, true);
        window.removeEventListener("resize", handleReposition);
      };
    }, [open, updateMenuPosition]);
    (0, import_react9.useEffect)(() => {
      if (!open) return;
      function handleOutside(e) {
        const target = e.target;
        if (menuRef.current && target instanceof Node && !menuRef.current.contains(target) && triggerRef.current && !triggerRef.current.contains(target)) {
          setOpen(false);
        }
      }
      function handleEsc(e) {
        if (e.key === "Escape") setOpen(false);
      }
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("keydown", handleEsc);
      return () => {
        document.removeEventListener("mousedown", handleOutside);
        document.removeEventListener("keydown", handleEsc);
      };
    }, [open]);
    const showIconOnly = triggerLabel === void 0;
    const ariaLabel = triggerAriaLabel != null ? triggerAriaLabel : showIconOnly ? "More actions" : void 0;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        ref: triggerRef,
        "data-automation-id": automationId ? `${automationId}-trigger` : void 0,
        className: triggerClassName != null ? triggerClassName : row_actions_default.trigger,
        onClick: (e) => {
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            openMenu();
          }
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-label": ariaLabel
      },
      showIconOnly ? /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 18 18", fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "4", r: "1.4", fill: "currentColor" }), /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "9", r: "1.4", fill: "currentColor" }), /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "14", r: "1.4", fill: "currentColor" })) : /* @__PURE__ */ React.createElement(React.Fragment, null, triggerLeadingIcon ? /* @__PURE__ */ React.createElement("span", { "aria-hidden": true, className: row_actions_default.triggerLeading }, triggerLeadingIcon) : null, triggerLabel, /* @__PURE__ */ React.createElement("svg", { width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(
        "path",
        {
          d: "M1 1l4 4 4-4",
          stroke: "currentColor",
          strokeWidth: "1.5",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }
      )))
    ), open && menuPos && (0, import_react_dom.createPortal)(
      /* @__PURE__ */ React.createElement(
        "div",
        {
          ref: menuRef,
          className: row_actions_default.menu,
          role: "menu",
          style: { top: menuPos.top, left: menuPos.left }
        },
        items.map((item, i) => {
          var _a, _b;
          const key = item.isDivider ? `divider-${i}` : (_a = item.label) != null ? _a : `item-${i}`;
          if (item.isDivider) {
            return /* @__PURE__ */ React.createElement("hr", { key, className: row_actions_default.menuDivider, "aria-hidden": true });
          }
          const cls = `${row_actions_default.item} ${item.danger ? row_actions_default.itemDanger : ""} ${item.disabled ? row_actions_default.itemDisabled : ""}`;
          const itemAutomationId = (_b = item.automationId) != null ? _b : automationId ? `${automationId}-item-${i}` : void 0;
          const content = item.icon ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": true, className: row_actions_default.itemIcon }, item.icon), /* @__PURE__ */ React.createElement("span", null, item.label)) : item.label;
          if (item.href) {
            return /* @__PURE__ */ React.createElement(
              "a",
              {
                key,
                href: item.href,
                "data-automation-id": itemAutomationId,
                className: cls,
                role: "menuitem",
                title: item.title,
                onClick: (e) => {
                  e.stopPropagation();
                  setOpen(false);
                }
              },
              content
            );
          }
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key,
              "data-automation-id": itemAutomationId,
              className: cls,
              role: "menuitem",
              type: "button",
              title: item.title,
              disabled: item.disabled,
              onClick: (e) => {
                var _a2;
                e.stopPropagation();
                setOpen(false);
                (_a2 = item.onClick) == null ? void 0 : _a2.call(item);
              }
            },
            content
          );
        })
      ),
      document.body
    ));
  }

  // src/components/bts/DropdownButton/DropdownButton.tsx
  init_shim();

  // src/components/bts/DropdownButton/dropdown-button.module.css
  var dropdown_button_default = {
    trigger: "dropdown_button_trigger",
    secondary: "dropdown_button_secondary",
    primary: "dropdown_button_primary"
  };

  // src/components/bts/DropdownButton/DropdownButton.tsx
  function DropdownButton({
    label,
    items,
    leadingIcon,
    variant = "secondary",
    automationId
  }) {
    return /* @__PURE__ */ React.createElement(
      RowActions,
      {
        items,
        triggerLabel: label,
        triggerLeadingIcon: leadingIcon,
        triggerClassName: cn(
          dropdown_button_default.trigger,
          variant === "primary" ? dropdown_button_default.primary : dropdown_button_default.secondary
        ),
        automationId
      }
    );
  }

  // src/components/bts/Drawer/Drawer.tsx
  init_shim();
  var import_react11 = __toESM(require_react());
  var import_react_dom2 = __toESM(require_react_dom());

  // src/components/bts/AnimatedDrawer/useAnimatedDrawer.ts
  init_shim();
  var import_react10 = __toESM(require_react());

  // src/components/bts/AnimatedDrawer/animated-drawer.module.css
  var animated_drawer_default = {
    drawerOverlay: "animated_drawer_drawerOverlay",
    drawerBackdropIn: "animated_drawer_drawerBackdropIn",
    drawerOverlayClosing: "animated_drawer_drawerOverlayClosing",
    drawerBackdropOut: "animated_drawer_drawerBackdropOut",
    drawerPanel: "animated_drawer_drawerPanel",
    drawerSlideOut: "animated_drawer_drawerSlideOut",
    drawerSlideIn: "animated_drawer_drawerSlideIn",
    drawerHeader: "animated_drawer_drawerHeader",
    drawerTitle: "animated_drawer_drawerTitle",
    drawerSubtitle: "animated_drawer_drawerSubtitle",
    drawerForm: "animated_drawer_drawerForm",
    drawerBody: "animated_drawer_drawerBody",
    drawerScroll: "animated_drawer_drawerScroll",
    drawerActions: "animated_drawer_drawerActions",
    drawerClose: "animated_drawer_drawerClose"
  };

  // src/components/bts/AnimatedDrawer/useAnimatedDrawer.ts
  function prefersReducedMotion() {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function useAnimatedDrawer({
    open,
    onOpenChange,
    canClose = open,
    onAfterClose,
    closeOnEscape = true
  }) {
    const [closing, setClosing] = (0, import_react10.useState)(false);
    const closingRef = (0, import_react10.useRef)(false);
    const resetCloseState = (0, import_react10.useCallback)(() => {
      closingRef.current = false;
      setClosing(false);
    }, []);
    const completeClose = (0, import_react10.useCallback)(() => {
      resetCloseState();
      onOpenChange(false);
      onAfterClose == null ? void 0 : onAfterClose();
    }, [onOpenChange, onAfterClose, resetCloseState]);
    const requestClose = (0, import_react10.useCallback)(() => {
      if (!canClose || closingRef.current) return;
      if (prefersReducedMotion()) {
        completeClose();
        return;
      }
      closingRef.current = true;
      setClosing(true);
    }, [canClose, completeClose]);
    const handleOverlayAnimationEnd = (0, import_react10.useCallback)(
      (e) => {
        if (!closingRef.current || e.target !== e.currentTarget) return;
        completeClose();
      },
      [completeClose]
    );
    (0, import_react10.useEffect)(() => {
      if (open) resetCloseState();
    }, [open, resetCloseState]);
    (0, import_react10.useEffect)(() => {
      if (!closeOnEscape || !open && !closing) return;
      function onKeyDown(e) {
        if (e.key === "Escape") requestClose();
      }
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, closing, closeOnEscape, requestClose]);
    const visible = open || closing;
    const overlayClassName = [
      animated_drawer_default.drawerOverlay,
      closing ? animated_drawer_default.drawerOverlayClosing : ""
    ].filter(Boolean).join(" ");
    const overlayProps = {
      className: overlayClassName,
      role: "presentation",
      tabIndex: -1,
      onClick: (e) => {
        if (closing) return;
        if (e.target === e.currentTarget) requestClose();
      },
      onAnimationEnd: handleOverlayAnimationEnd
    };
    const cancelClose = (0, import_react10.useCallback)(() => {
      resetCloseState();
    }, [resetCloseState]);
    return {
      visible,
      closing,
      isInteractionLocked: closing,
      isInteractionLockedSync: () => closingRef.current,
      requestClose,
      cancelClose,
      overlayClassName,
      panelClassName: animated_drawer_default.drawerPanel,
      overlayProps,
      styles: animated_drawer_default
    };
  }

  // src/components/bts/Drawer/drawer.module.css
  var drawer_default = {
    overlay: "drawer_overlay",
    drawerOverlayFadeIn: "drawer_drawerOverlayFadeIn",
    overlayClosing: "drawer_overlayClosing",
    drawerOverlayFadeOut: "drawer_drawerOverlayFadeOut",
    overlayLeft: "drawer_overlayLeft",
    overlayRight: "drawer_overlayRight",
    backdrop: "drawer_backdrop",
    panel: "drawer_panel",
    panelLeft: "drawer_panelLeft",
    drawerSlideInLeft: "drawer_drawerSlideInLeft",
    panelRight: "drawer_panelRight",
    drawerSlideInRight: "drawer_drawerSlideInRight",
    panelLeftClosing: "drawer_panelLeftClosing",
    drawerSlideOutLeft: "drawer_drawerSlideOutLeft",
    panelRightClosing: "drawer_panelRightClosing",
    drawerSlideOutRight: "drawer_drawerSlideOutRight",
    header: "drawer_header",
    heading: "drawer_heading",
    eyebrow: "drawer_eyebrow",
    title: "drawer_title",
    subtitle: "drawer_subtitle",
    headerMeta: "drawer_headerMeta",
    closeButton: "drawer_closeButton",
    body: "drawer_body",
    footer: "drawer_footer"
  };

  // src/components/bts/Drawer/Drawer.tsx
  var DRAWER_CLOSE_MS = 250;
  function CloseIcon() {
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true"
      },
      /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
      /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
    );
  }
  function joinClasses(...classes) {
    return classes.filter(Boolean).join(" ");
  }
  function Drawer({
    open,
    onClose,
    title,
    children,
    side = "right",
    eyebrow,
    subtitle,
    headerMeta,
    footer,
    closeLabel = "Close drawer",
    topOffset = "0px",
    width = "min(24rem, 90vw)",
    closeOnBackdrop = true,
    closeOnEscape = true,
    id,
    className,
    panelClassName,
    bodyClassName,
    footerClassName
  }) {
    const generatedTitleId = (0, import_react11.useId)();
    const titleId = id ? `${id}-title` : generatedTitleId;
    const panelRef = (0, import_react11.useRef)(null);
    const closeTimerRef = (0, import_react11.useRef)(null);
    const [rendered, setRendered] = (0, import_react11.useState)(open);
    const [closing, setClosing] = (0, import_react11.useState)(false);
    const clearCloseTimer = (0, import_react11.useCallback)(() => {
      if (!closeTimerRef.current) return;
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }, []);
    const finishClose = (0, import_react11.useCallback)(() => {
      clearCloseTimer();
      setRendered(false);
      setClosing(false);
    }, [clearCloseTimer]);
    (0, import_react11.useEffect)(() => {
      if (open) {
        clearCloseTimer();
        setRendered(true);
        setClosing(false);
        return;
      }
      if (!rendered || closing) return;
      if (prefersReducedMotion()) {
        finishClose();
        return;
      }
      setClosing(true);
      closeTimerRef.current = window.setTimeout(finishClose, DRAWER_CLOSE_MS);
    }, [clearCloseTimer, closing, finishClose, open, rendered]);
    (0, import_react11.useEffect)(() => {
      var _a;
      if (!rendered || closing) return;
      (_a = panelRef.current) == null ? void 0 : _a.focus();
    }, [closing, rendered]);
    (0, import_react11.useEffect)(() => {
      if (!rendered || closing || !closeOnEscape) return;
      const handleKeyDown = (event) => {
        if (event.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [closeOnEscape, closing, onClose, rendered]);
    (0, import_react11.useEffect)(() => clearCloseTimer, [clearCloseTimer]);
    if (!rendered || typeof document === "undefined") return null;
    const panelSideClass = side === "left" ? drawer_default.panelLeft : drawer_default.panelRight;
    const closingSideClass = side === "left" ? drawer_default.panelLeftClosing : drawer_default.panelRightClosing;
    const style = {
      "--ec-drawer-top-offset": topOffset,
      "--ec-drawer-width": width
    };
    const backdrop = /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: drawer_default.backdrop,
        "aria-label": closeLabel,
        "data-automation-id": id ? `${id}-backdrop` : "drawer-backdrop",
        onClick: () => {
          if (closeOnBackdrop && !closing) onClose();
        }
      }
    );
    const panel = /* @__PURE__ */ React.createElement(
      "div",
      {
        id,
        ref: panelRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        tabIndex: -1,
        className: joinClasses(
          drawer_default.panel,
          panelSideClass,
          closing && closingSideClass,
          panelClassName
        ),
        onAnimationEnd: (event) => {
          if (event.target === event.currentTarget && closing) finishClose();
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: drawer_default.header }, /* @__PURE__ */ React.createElement("div", { className: drawer_default.heading }, eyebrow ? /* @__PURE__ */ React.createElement("p", { className: drawer_default.eyebrow }, eyebrow) : null, /* @__PURE__ */ React.createElement("h2", { id: titleId, className: drawer_default.title }, title), subtitle ? /* @__PURE__ */ React.createElement("p", { className: drawer_default.subtitle }, subtitle) : null, headerMeta ? /* @__PURE__ */ React.createElement("div", { className: drawer_default.headerMeta }, headerMeta) : null), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: drawer_default.closeButton,
          "aria-label": closeLabel,
          "data-automation-id": id ? `${id}-close` : "drawer-close",
          onClick: () => {
            if (!closing) onClose();
          }
        },
        /* @__PURE__ */ React.createElement(CloseIcon, null)
      )),
      /* @__PURE__ */ React.createElement("div", { className: joinClasses(drawer_default.body, bodyClassName) }, children),
      footer ? /* @__PURE__ */ React.createElement("div", { className: joinClasses(drawer_default.footer, footerClassName) }, footer) : null
    );
    return (0, import_react_dom2.createPortal)(
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: joinClasses(
            drawer_default.overlay,
            side === "left" ? drawer_default.overlayLeft : drawer_default.overlayRight,
            closing && drawer_default.overlayClosing,
            className
          ),
          style
        },
        side === "left" ? panel : backdrop,
        side === "left" ? backdrop : panel
      ),
      document.body
    );
  }

  // src/components/bts/AnimatedDrawer/AnimatedDrawer.tsx
  init_shim();
  var import_react_dom3 = __toESM(require_react_dom());
  function AnimatedDrawer({
    children,
    ariaLabelledBy,
    ariaLabel,
    ...drawerOptions
  }) {
    const drawer = useAnimatedDrawer(drawerOptions);
    if (!drawer.visible) return null;
    return (0, import_react_dom3.createPortal)(
      /* @__PURE__ */ React.createElement("div", { ...drawer.overlayProps }, /* @__PURE__ */ React.createElement(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": ariaLabelledBy,
          "aria-label": ariaLabel,
          className: drawer.panelClassName
        },
        children
      )),
      document.body
    );
  }

  // src/components/bts/PublishDialog/PublishDialog.tsx
  init_shim();

  // src/components/bts/PublishDialog/publish-dialog.module.css
  var publish_dialog_default = {
    overlay: "publish_dialog_overlay",
    dialog: "publish_dialog_dialog",
    header: "publish_dialog_header",
    title: "publish_dialog_title",
    description: "publish_dialog_description",
    iconBtn: "publish_dialog_iconBtn",
    fields: "publish_dialog_fields",
    label: "publish_dialog_label",
    textarea: "publish_dialog_textarea",
    tagList: "publish_dialog_tagList",
    tag: "publish_dialog_tag",
    tagRemove: "publish_dialog_tagRemove",
    tagInput: "publish_dialog_tagInput",
    error: "publish_dialog_error",
    actions: "publish_dialog_actions",
    btnGhost: "publish_dialog_btnGhost",
    btnPublish: "publish_dialog_btnPublish"
  };

  // src/components/bts/PublishDialog/PublishDialog.tsx
  function CloseIcon2({ size = 16 }) {
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true"
      },
      /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
      /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
    );
  }
  function PublishDialog(props) {
    var _a;
    if (!props.open) return null;
    const {
      title = "Publish",
      description = "Add a description of changes for this publish \u2014 visible in version history.",
      publishLabel = "Publish",
      noteLabel = "Description of changes",
      backdropTestId,
      automationId = "publish-dialog"
    } = props;
    const showCategories = props.categories !== void 0 && props.onRemoveCategory !== void 0 && props.onChangeCategoryInput !== void 0;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: publish_dialog_default.overlay,
        "data-testid": backdropTestId,
        onClick: (e) => {
          if (e.target === e.currentTarget && !props.publishing) props.onClose();
        },
        role: "presentation"
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "publish-dialog-title",
          className: publish_dialog_default.dialog
        },
        /* @__PURE__ */ React.createElement("div", { className: publish_dialog_default.header }, /* @__PURE__ */ React.createElement("h2", { id: "publish-dialog-title", className: publish_dialog_default.title }, title), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: publish_dialog_default.iconBtn,
            "data-automation-id": `${automationId}-close-button`,
            onClick: props.onClose,
            disabled: props.publishing,
            "aria-label": "Close"
          },
          /* @__PURE__ */ React.createElement(CloseIcon2, { size: 16 })
        )),
        /* @__PURE__ */ React.createElement("p", { className: publish_dialog_default.description }, description),
        /* @__PURE__ */ React.createElement("div", { className: publish_dialog_default.fields }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "publish-dialog-change-note", className: publish_dialog_default.label }, noteLabel), /* @__PURE__ */ React.createElement(
          "textarea",
          {
            id: "publish-dialog-change-note",
            "data-automation-id": `${automationId}-change-note-textarea`,
            className: publish_dialog_default.textarea,
            rows: 3,
            value: props.changeNote,
            onChange: (e) => props.onChangeNote(e.target.value),
            placeholder: "What changed in this publish?",
            disabled: props.publishing
          }
        )), showCategories ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "publish-dialog-category-input", className: publish_dialog_default.label }, "Categories"), /* @__PURE__ */ React.createElement("div", { className: publish_dialog_default.tagList }, props.categories.map((category) => /* @__PURE__ */ React.createElement("span", { key: category, className: publish_dialog_default.tag }, category, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: publish_dialog_default.tagRemove,
            "data-automation-id": `${automationId}-category-remove-button-${category}`,
            onClick: () => props.onRemoveCategory(category),
            disabled: props.publishing,
            "aria-label": `Remove category ${category}`
          },
          /* @__PURE__ */ React.createElement(CloseIcon2, { size: 10 })
        ))), /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "publish-dialog-category-input",
            "data-automation-id": `${automationId}-category-input`,
            type: "text",
            value: (_a = props.categoryInput) != null ? _a : "",
            onChange: (e) => props.onChangeCategoryInput(e.target.value),
            onKeyDown: props.onCategoryKeyDown,
            onBlur: props.onCategoryBlur,
            placeholder: "e.g. release, compliance",
            disabled: props.publishing,
            className: publish_dialog_default.tagInput
          }
        ))) : null),
        props.error ? /* @__PURE__ */ React.createElement("p", { role: "alert", className: publish_dialog_default.error }, props.error) : null,
        /* @__PURE__ */ React.createElement("div", { className: publish_dialog_default.actions }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: publish_dialog_default.btnGhost,
            "data-automation-id": `${automationId}-cancel-button`,
            onClick: props.onClose,
            disabled: props.publishing
          },
          "Cancel"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: publish_dialog_default.btnPublish,
            "data-automation-id": `${automationId}-publish-button`,
            onClick: props.onPublish,
            disabled: props.publishing
          },
          props.publishing ? "Publishing..." : publishLabel
        ))
      )
    );
  }

  // src/components/bts/Toast/ToastContext.tsx
  init_shim();
  var import_react12 = __toESM(require_react());

  // src/components/bts/Toast/toast.module.css
  var toast_default = {
    container: "toast_container",
    toast: "toast_toast",
    slideIn: "toast_slideIn",
    error: "toast_error",
    icon: "toast_icon",
    success: "toast_success",
    info: "toast_info",
    message: "toast_message",
    dismiss: "toast_dismiss"
  };

  // src/components/bts/Toast/ToastContext.tsx
  var ToastContext = (0, import_react12.createContext)(null);
  function useToast() {
    const ctx = (0, import_react12.useContext)(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
  }
  var DURATION = {
    error: 7e3,
    success: 4e3,
    info: 8e3
  };
  function ToastProvider({ children }) {
    const [toasts, setToasts] = (0, import_react12.useState)([]);
    const timers = (0, import_react12.useRef)(/* @__PURE__ */ new Map());
    const dismiss = (0, import_react12.useCallback)((id) => {
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);
    const add = (0, import_react12.useCallback)(
      (message, variant) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, message, variant }]);
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), DURATION[variant])
        );
      },
      [dismiss]
    );
    const error = (0, import_react12.useCallback)((msg) => add(msg, "error"), [add]);
    const success = (0, import_react12.useCallback)((msg) => add(msg, "success"), [add]);
    const info = (0, import_react12.useCallback)((msg) => add(msg, "info"), [add]);
    const api = (0, import_react12.useMemo)(() => ({ error, success, info }), [error, success, info]);
    return /* @__PURE__ */ React.createElement(ToastContext.Provider, { value: api }, children, /* @__PURE__ */ React.createElement("div", { className: toast_default.container, "aria-label": "Notifications" }, toasts.map((t) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: t.id,
        role: t.variant === "error" ? "alert" : "status",
        "aria-live": t.variant === "error" ? "assertive" : "polite",
        "aria-atomic": "true",
        className: `${toast_default.toast} ${toast_default[t.variant]}`
      },
      /* @__PURE__ */ React.createElement("span", { className: toast_default.icon, "aria-hidden": "true" }, t.variant === "error" ? "\u2715" : t.variant === "info" ? "\u2139" : "\u2713"),
      /* @__PURE__ */ React.createElement("span", { className: toast_default.message }, t.message),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: toast_default.dismiss,
          "aria-label": "Dismiss notification",
          "data-automation-id": `toast-dismiss-${t.id}`,
          onClick: () => dismiss(t.id)
        },
        "\xD7"
      )
    ))));
  }

  // entry.ts
  var Icons = { Route, Shield, FileText, Box, Star, User, Lock, Bell, Plus, Pencil, Trash2, Copy, ExternalLink, Gamepad2, ListChecks, Users };
  return __toCommonJS(entry_exports);
})();

window.BTSStudio = BTSStudio;
