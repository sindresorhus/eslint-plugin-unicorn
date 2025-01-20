import {createRule} from './utils/rule.js';

import betterRegex from './better-regex.js';
import catchErrorName from './catch-error-name.js';
import consistentDestructuring from './consistent-destructuring.js';
import consistentEmptyArraySpread from './consistent-empty-array-spread.js';
import consistentExistenceIndexCheck from './consistent-existence-index-check.js';
import consistentFunctionScoping from './consistent-function-scoping.js';
import customErrorDefinition from './custom-error-definition.js';
import emptyBraceSpaces from './empty-brace-spaces.js';
import errorMessage from './error-message.js';
import escapeCase from './escape-case.js';
import expiringTodoComments from './expiring-todo-comments.js';
import explicitLengthCheck from './explicit-length-check.js';
import filenameCase from './filename-case.js';
import importStyle from './import-style.js';
import newForBuiltins from './new-for-builtins.js';
import noAbusiveEslintDisable from './no-abusive-eslint-disable.js';
import noAnonymousDefaultExport from './no-anonymous-default-export.js';
import noArrayCallbackReference from './no-array-callback-reference.js';
import noArrayForEach from './no-array-for-each.js';
import noArrayMethodThisArgument from './no-array-method-this-argument.js';
import noArrayPushPush from './no-array-push-push.js';
import noArrayReduce from './no-array-reduce.js';
import noAwaitExpressionMember from './no-await-expression-member.js';
import noAwaitInPromiseMethods from './no-await-in-promise-methods.js';
import noConsoleSpaces from './no-console-spaces.js';
import noDocumentCookie from './no-document-cookie.js';
import noEmptyFile from './no-empty-file.js';
import noForLoop from './no-for-loop.js';
import noHexEscape from './no-hex-escape.js';
import noInstanceofArray from './no-instanceof-array.js';
import noInvalidFetchOptions from './no-invalid-fetch-options.js';
import noInvalidRemoveEventListener from './no-invalid-remove-event-listener.js';
import noKeywordPrefix from './no-keyword-prefix.js';
import noLengthAsSliceEnd from './no-length-as-slice-end.js';
import noLonelyIf from './no-lonely-if.js';
import noMagicArrayFlatDepth from './no-magic-array-flat-depth.js';
import noNegatedCondition from './no-negated-condition.js';
import noNegationInEqualityCheck from './no-negation-in-equality-check.js';
import noNestedTernary from './no-nested-ternary.js';
import noNewArray from './no-new-array.js';
import noNewBuffer from './no-new-buffer.js';
import noNull from './no-null.js';
import noObjectAsDefaultParameter from './no-object-as-default-parameter.js';
import noProcessExit from './no-process-exit.js';
import noSinglePromiseInPromiseMethods from './no-single-promise-in-promise-methods.js';
import noStaticOnlyClass from './no-static-only-class.js';
import noThenable from './no-thenable.js';
import noThisAssignment from './no-this-assignment.js';
import noTypeofUndefined from './no-typeof-undefined.js';
import noUnnecessaryAwait from './no-unnecessary-await.js';
import noUnnecessaryPolyfills from './no-unnecessary-polyfills.js';
import noUnreadableArrayDestructuring from './no-unreadable-array-destructuring.js';
import noUnreadableIife from './no-unreadable-iife.js';
import noUnusedProperties from './no-unused-properties.js';
import noUselessFallbackInSpread from './no-useless-fallback-in-spread.js';
import noUselessLengthCheck from './no-useless-length-check.js';
import noUselessPromiseResolveReject from './no-useless-promise-resolve-reject.js';
import noUselessSpread from './no-useless-spread.js';
import noUselessSwitchCase from './no-useless-switch-case.js';
import noUselessUndefined from './no-useless-undefined.js';
import noZeroFractions from './no-zero-fractions.js';
import numberLiteralCase from './number-literal-case.js';
import numericSeparatorsStyle from './numeric-separators-style.js';
import preferAddEventListener from './prefer-add-event-listener.js';
import preferArrayFind from './prefer-array-find.js';
import preferArrayFlatMap from './prefer-array-flat-map.js';
import preferArrayFlat from './prefer-array-flat.js';
import preferArrayIndexOf from './prefer-array-index-of.js';
import preferArraySome from './prefer-array-some.js';
import preferAt from './prefer-at.js';
import preferBlobReadingMethods from './prefer-blob-reading-methods.js';
import preferCodePoint from './prefer-code-point.js';
import preferDateNow from './prefer-date-now.js';
import preferDefaultParameters from './prefer-default-parameters.js';
import preferDomNodeAppend from './prefer-dom-node-append.js';
import preferDomNodeDataset from './prefer-dom-node-dataset.js';
import preferDomNodeRemove from './prefer-dom-node-remove.js';
import preferDomNodeTextContent from './prefer-dom-node-text-content.js';
import preferEventTarget from './prefer-event-target.js';
import preferExportFrom from './prefer-export-from.js';
import preferGlobalThis from './prefer-global-this.js';
import preferIncludes from './prefer-includes.js';
import preferJsonParseBuffer from './prefer-json-parse-buffer.js';
import preferKeyboardEventKey from './prefer-keyboard-event-key.js';
import preferLogicalOperatorOverTernary from './prefer-logical-operator-over-ternary.js';
import preferMathMinMax from './prefer-math-min-max.js';
import preferMathTrunc from './prefer-math-trunc.js';
import preferModernDomApis from './prefer-modern-dom-apis.js';
import preferModernMathApis from './prefer-modern-math-apis.js';
import preferModule from './prefer-module.js';
import preferNativeCoercionFunctions from './prefer-native-coercion-functions.js';
import preferNegativeIndex from './prefer-negative-index.js';
import preferNodeProtocol from './prefer-node-protocol.js';
import preferNumberProperties from './prefer-number-properties.js';
import preferObjectFromEntries from './prefer-object-from-entries.js';
import preferOptionalCatchBinding from './prefer-optional-catch-binding.js';
import preferPrototypeMethods from './prefer-prototype-methods.js';
import preferQuerySelector from './prefer-query-selector.js';
import preferReflectApply from './prefer-reflect-apply.js';
import preferRegexpTest from './prefer-regexp-test.js';
import preferSetHas from './prefer-set-has.js';
import preferSetSize from './prefer-set-size.js';
import preferSpread from './prefer-spread.js';
import preferStringRaw from './prefer-string-raw.js';
import preferStringReplaceAll from './prefer-string-replace-all.js';
import preferStringSlice from './prefer-string-slice.js';
import preferStringStartsEndsWith from './prefer-string-starts-ends-with.js';
import preferStringTrimStartEnd from './prefer-string-trim-start-end.js';
import preferStructuredClone from './prefer-structured-clone.js';
import preferSwitch from './prefer-switch.js';
import preferTernary from './prefer-ternary.js';
import preferTopLevelAwait from './prefer-top-level-await.js';
import preferTypeError from './prefer-type-error.js';
import preventAbbreviations from './prevent-abbreviations.js';
import relativeUrlStyle from './relative-url-style.js';
import requireArrayJoinSeparator from './require-array-join-separator.js';
import requireNumberToFixedDigitsArgument from './require-number-to-fixed-digits-argument.js';
import requirePostMessageTargetOrigin from './require-post-message-target-origin.js';
import stringContent from './string-content.js';
import switchCaseBraces from './switch-case-braces.js';
import templateIndent from './template-indent.js';
import textEncodingIdentifierCase from './text-encoding-identifier-case.js';
import throwNewError from './throw-new-error.js';

const rules = {
	'better-regex': createRule(betterRegex),
	'catch-error-name': createRule(catchErrorName),
	'consistent-destructuring': createRule(consistentDestructuring),
	'consistent-empty-array-spread': createRule(consistentEmptyArraySpread),
	'consistent-existence-index-check': createRule(consistentExistenceIndexCheck),
	'consistent-function-scoping': createRule(consistentFunctionScoping),
	'custom-error-definition': createRule(customErrorDefinition),
	'empty-brace-spaces': createRule(emptyBraceSpaces),
	'error-message': createRule(errorMessage),
	'escape-case': createRule(escapeCase),
	'expiring-todo-comments': createRule(expiringTodoComments),
	'explicit-length-check': createRule(explicitLengthCheck),
	'filename-case': createRule(filenameCase),
	'import-style': createRule(importStyle),
	'new-for-builtins': createRule(newForBuiltins),
	'no-abusive-eslint-disable': createRule(noAbusiveEslintDisable),
	'no-anonymous-default-export': createRule(noAnonymousDefaultExport),
	'no-array-callback-reference': createRule(noArrayCallbackReference),
	'no-array-for-each': createRule(noArrayForEach),
	'no-array-method-this-argument': createRule(noArrayMethodThisArgument),
	'no-array-push-push': createRule(noArrayPushPush),
	'no-array-reduce': createRule(noArrayReduce),
	'no-await-expression-member': createRule(noAwaitExpressionMember),
	'no-await-in-promise-methods': createRule(noAwaitInPromiseMethods),
	'no-console-spaces': createRule(noConsoleSpaces),
	'no-document-cookie': createRule(noDocumentCookie),
	'no-empty-file': createRule(noEmptyFile),
	'no-for-loop': createRule(noForLoop),
	'no-hex-escape': createRule(noHexEscape),
	'no-instanceof-array': createRule(noInstanceofArray),
	'no-invalid-fetch-options': createRule(noInvalidFetchOptions),
	'no-invalid-remove-event-listener': createRule(noInvalidRemoveEventListener),
	'no-keyword-prefix': createRule(noKeywordPrefix),
	'no-length-as-slice-end': createRule(noLengthAsSliceEnd),
	'no-lonely-if': createRule(noLonelyIf),
	'no-magic-array-flat-depth': createRule(noMagicArrayFlatDepth),
	'no-negated-condition': createRule(noNegatedCondition),
	'no-negation-in-equality-check': createRule(noNegationInEqualityCheck),
	'no-nested-ternary': createRule(noNestedTernary),
	'no-new-array': createRule(noNewArray),
	'no-new-buffer': createRule(noNewBuffer),
	'no-null': createRule(noNull),
	'no-object-as-default-parameter': createRule(noObjectAsDefaultParameter),
	'no-process-exit': createRule(noProcessExit),
	'no-single-promise-in-promise-methods': createRule(noSinglePromiseInPromiseMethods),
	'no-static-only-class': createRule(noStaticOnlyClass),
	'no-thenable': createRule(noThenable),
	'no-this-assignment': createRule(noThisAssignment),
	'no-typeof-undefined': createRule(noTypeofUndefined),
	'no-unnecessary-await': createRule(noUnnecessaryAwait),
	'no-unnecessary-polyfills': createRule(noUnnecessaryPolyfills),
	'no-unreadable-array-destructuring': createRule(noUnreadableArrayDestructuring),
	'no-unreadable-iife': createRule(noUnreadableIife),
	'no-unused-properties': createRule(noUnusedProperties),
	'no-useless-fallback-in-spread': createRule(noUselessFallbackInSpread),
	'no-useless-length-check': createRule(noUselessLengthCheck),
	'no-useless-promise-resolve-reject': createRule(noUselessPromiseResolveReject),
	'no-useless-spread': createRule(noUselessSpread),
	'no-useless-switch-case': createRule(noUselessSwitchCase),
	'no-useless-undefined': createRule(noUselessUndefined),
	'no-zero-fractions': createRule(noZeroFractions),
	'number-literal-case': createRule(numberLiteralCase),
	'numeric-separators-style': createRule(numericSeparatorsStyle),
	'prefer-add-event-listener': createRule(preferAddEventListener),
	'prefer-array-find': createRule(preferArrayFind),
	'prefer-array-flat-map': createRule(preferArrayFlatMap),
	'prefer-array-flat': createRule(preferArrayFlat),
	'prefer-array-index-of': createRule(preferArrayIndexOf),
	'prefer-array-some': createRule(preferArraySome),
	'prefer-at': createRule(preferAt),
	'prefer-blob-reading-methods': createRule(preferBlobReadingMethods),
	'prefer-code-point': createRule(preferCodePoint),
	'prefer-date-now': createRule(preferDateNow),
	'prefer-default-parameters': createRule(preferDefaultParameters),
	'prefer-dom-node-append': createRule(preferDomNodeAppend),
	'prefer-dom-node-dataset': createRule(preferDomNodeDataset),
	'prefer-dom-node-remove': createRule(preferDomNodeRemove),
	'prefer-dom-node-text-content': createRule(preferDomNodeTextContent),
	'prefer-event-target': createRule(preferEventTarget),
	'prefer-export-from': createRule(preferExportFrom),
	'prefer-global-this': createRule(preferGlobalThis),
	'prefer-includes': createRule(preferIncludes),
	'prefer-json-parse-buffer': createRule(preferJsonParseBuffer),
	'prefer-keyboard-event-key': createRule(preferKeyboardEventKey),
	'prefer-logical-operator-over-ternary': createRule(preferLogicalOperatorOverTernary),
	'prefer-math-min-max': createRule(preferMathMinMax),
	'prefer-math-trunc': createRule(preferMathTrunc),
	'prefer-modern-dom-apis': createRule(preferModernDomApis),
	'prefer-modern-math-apis': createRule(preferModernMathApis),
	'prefer-module': createRule(preferModule),
	'prefer-native-coercion-functions': createRule(preferNativeCoercionFunctions),
	'prefer-negative-index': createRule(preferNegativeIndex),
	'prefer-node-protocol': createRule(preferNodeProtocol),
	'prefer-number-properties': createRule(preferNumberProperties),
	'prefer-object-from-entries': createRule(preferObjectFromEntries),
	'prefer-optional-catch-binding': createRule(preferOptionalCatchBinding),
	'prefer-prototype-methods': createRule(preferPrototypeMethods),
	'prefer-query-selector': createRule(preferQuerySelector),
	'prefer-reflect-apply': createRule(preferReflectApply),
	'prefer-regexp-test': createRule(preferRegexpTest),
	'prefer-set-has': createRule(preferSetHas),
	'prefer-set-size': createRule(preferSetSize),
	'prefer-spread': createRule(preferSpread),
	'prefer-string-raw': createRule(preferStringRaw),
	'prefer-string-replace-all': createRule(preferStringReplaceAll),
	'prefer-string-slice': createRule(preferStringSlice),
	'prefer-string-starts-ends-with': createRule(preferStringStartsEndsWith),
	'prefer-string-trim-start-end': createRule(preferStringTrimStartEnd),
	'prefer-structured-clone': createRule(preferStructuredClone),
	'prefer-switch': createRule(preferSwitch),
	'prefer-ternary': createRule(preferTernary),
	'prefer-top-level-await': createRule(preferTopLevelAwait),
	'prefer-type-error': createRule(preferTypeError),
	'prevent-abbreviations': createRule(preventAbbreviations),
	'relative-url-style': createRule(relativeUrlStyle),
	'require-array-join-separator': createRule(requireArrayJoinSeparator),
	'require-number-to-fixed-digits-argument': createRule(requireNumberToFixedDigitsArgument),
	'require-post-message-target-origin': createRule(requirePostMessageTargetOrigin),
	'string-content': createRule(stringContent),
	'switch-case-braces': createRule(switchCaseBraces),
	'template-indent': createRule(templateIndent),
	'text-encoding-identifier-case': createRule(textEncodingIdentifierCase),
	'throw-new-error': createRule(throwNewError)
};

export default rules;