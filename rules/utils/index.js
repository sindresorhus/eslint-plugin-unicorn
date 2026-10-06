export {
	isParenthesized,
	getParentheses,
	getParenthesizedRange,
	getParenthesizedText,
} from './parentheses/parentheses.js';

export {
	isArrayPrototypeProperty,
} from './array-or-object-prototype-property.js';

export {
	isNodeMatches,
	isNodeMatchesNameOrPath,
} from './is-node-matches.js';

export {
	isBooleanExpression,
	isControlFlowTest,
	getBooleanAncestor,
	isGlobalBooleanCall,
	controlFlowStatementTypes,
	isBooleanContext,
} from './boolean.js';

export {default as assertToken} from './assert-token.js';
export {default as canTokensBeAdjacent} from './can-tokens-be-adjacent.js';
export {default as cartesianProductSamples} from './cartesian-product-samples.js';
export {default as containsSuspensionPoint} from './contains-suspension-point.js';
export {default as escapeTemplateElementRaw} from './escape-template-element-raw.js';
export {default as escapeString} from './escape-string.js';
export {default as isEscapedCharacter} from './is-escaped-character.js';
export {default as getClassHeadLocation} from './get-class-head-location.js';
export {default as getAttachedComment} from './get-attached-comment.js';
export {default as getAvailableVariableName} from './get-available-variable-name.js';
export {default as getCallArgumentText} from './get-call-argument-text.js';
export {default as getCallExpressionArgumentsText} from './get-call-expression-arguments-text.js';
export {getCallExpressionTokens, getNewExpressionTokens} from './get-call-or-new-expression-tokens.js';
export {default as getDuplicateArrayElements, isComparableStaticValue} from './get-duplicate-array-elements.js';
export {default as getIndentString} from './get-indent-string.js';
export {default as getIndentUnit} from './get-indent-unit.js';
export {default as getLinebreak} from './get-linebreak.js';
export {default as getLineIndent} from './get-line-indent.js';
export {default as getUnwrappedBranchText} from './get-unwrapped-branch-text.js';
export {default as getConciseArrowBodyText} from './get-concise-arrow-body-text.js';
export {default as getEnclosingFunction} from './get-enclosing-function.js';
export {default as getParentPattern} from './get-parent-pattern.js';
export {getFunctionOnlyExpression, getFunctionReturnExpression} from './function-body.js';
export {getOnlyExpression, getSingleStatement} from './single-statement.js';
export {getTypeArgumentsText, hasSameTypeArguments, hasTypeArguments} from './type-arguments.js';
export {default as reindentText} from './reindent-text.js';
export {default as isCallExpressionValueDiscardedWithVoid} from './is-call-expression-value-discarded-with-void.js';
export {default as isIdentifierName} from './is-identifier-name.js';
export {default as getComments, getMarkdownHtmlComments} from './get-comments.js';
export {
	getLastTrailingCommentOnSameLine,
	getCommentSafeProblem,
	hasCommentInRange,
	hasNonDirectiveComment,
	wouldRemoveComments,
} from './comments.js';
export {
	hasDirectBlockScopedDeclaration,
	hasMultilineToken,
	isBlockScopedDeclaration,
} from './block-scope.js';
export {default as getConstVariableInitializer} from './get-const-variable-initializer.js';
export {default as getFunctionFromIdentifier} from './get-function-from-identifier.js';
export {
	default as getStaticValueIfNoSideEffects,
	getStaticValueForControlFlow,
	getStaticRegExp,
	isBranchExpression,
	isSafeStaticPassThroughCall,
	hasPotentiallyMutableMemberAccess,
	hasSideEffectfulConstInitializer,
} from './get-static-value.js';
export {getMemberAccessOperatorRange, getStaticPropertyName} from './member-expression.js';
export {
	hasSameObjectShapePropertyCheck,
	isKnownNonCollectionLengthOrSize,
	isLengthOrSizeMemberExpression,
} from './length-or-size.js';
export {default as getReferences} from './get-references.js';
export {default as isTypeScriptFile} from './is-typescript-file.js';
export {default as isVirtualFilename} from './is-virtual-filename.js';
export {default as onRoot} from './on-root.js';
export {default as getScopes} from './get-scopes.js';
export {default as getTokenStore} from './get-token-store.js';
export {default as getTemplateElementRaw} from './get-template-element-raw.js';
export {default as getVariableIdentifiers} from './get-variable-identifiers.js';
export {default as hasUnsafeArrowConversionReference} from './has-unsafe-arrow-conversion-reference.js';
export {
	default as hasOptionalChainElement,
	hasUnparenthesizedOptionalChainElement,
} from './has-optional-chain-element.js';
export {default as isFunctionSelfUsedInside} from './is-function-self-used-inside.js';
export {default as isKnownNonIterable} from './is-known-non-iterable.js';
export {
	default as isArray,
	isKnownBigIntTypedArray,
	isKnownNonArray,
	isKnownNonIndexedCollection,
} from './is-array.js';
export {default as shouldSkipKnownNonArrayReceiver} from './should-skip-known-non-array-receiver.js';
export {isRegExp, isKnownNonRegExp} from './is-reg-exp.js';
export {default as isEvent, isKnownNonEvent} from './is-event.js';
export {isSet, isKnownNonSet} from './is-set.js';
export {isMap, isKnownNonMap} from './is-map.js';
export {default as matchesAnyRegExp} from './matches-any-regexp.js';
export {isWeakMap, isKnownNonWeakMap} from './is-weak-map.js';
export {isWeakSet, isKnownNonWeakSet} from './is-weak-set.js';
export {isKnownNonDomNode, isKnownNonKeyboardEvent} from './is-dom-node.js';
export {default as isHtmlRcdataNode} from './is-html-rcdata-node.js';
export {default as isLeftHandSide} from './is-left-hand-side.js';
export {
	default as isLogicalExpression,
	getLogicalExpressionOperands,
	getLogicalExpressionRoot,
	isOutermostLogicalExpression,
} from './is-logical-expression.js';
export {default as isMethodNamed} from './is-method-named.js';
export {default as isNewExpressionWithParentheses} from './is-new-expression-with-parentheses.js';
export {default as isNumber, isKnownNonNumber} from './is-number.js';
export {
	default as isBoolean,
	isBooleanFunction,
	isBooleanFunctionReference,
	isBooleanFunctionTypeAnnotation,
	isKnownBooleanFunctionReference,
	isBooleanTypeAnnotation,
} from './is-boolean.js';
export {default as isBigInt, isKnownNonBigInt} from './is-bigint.js';
export {default as isConstEnumReference} from './is-const-enum-reference.js';
export {default as isString, isKnownNonString} from './is-string.js';
export {default as isUrl, isFreshUrl} from './is-url.js';
export {default as isNodeValueNotDomNode} from './is-node-value-not-dom-node.js';
export {default as isNodeValueNotFunction} from './is-node-value-not-function.js';
export {default as isNodeContainsLexicalThis} from './is-node-contains-lexical-this.js';
export {default as isOnSameLine} from './is-on-same-line.js';
export {default as isPromiseType} from './is-promise-type.js';
export {default as isReactHookName} from './is-react-hook-name.js';
export {default as isSameIdentifier} from './is-same-identifier.js';
export {default as isSameBinding} from './is-same-binding.js';
export {default as isSameStatement} from './is-same-statement.js';
export {default as isSameTokens} from './is-same-tokens.js';
export {default as isFirstTokenOfExpressionStatement} from './is-first-token-of-expression-statement.js';
export {default as isSameReference} from './is-same-reference.js';
export {default as isUnresolvedVariable} from './is-unresolved-variable.js';
export {default as isGlobalIdentifier, isGlobalNameAvailable} from './is-global-identifier.js';
export {
	default as isBranchExit,
	hasOptionalChainInCurrentChain,
	isDefinitelyNotThrowingExpression,
	isDefinitelyNotThrowingReference,
	isProcessExitBranch,
	isProcessExitBranchAtStart,
	isProcessExitBlockAtStart,
	isProcessExitCall,
	isProcessExitCallAlwaysEvaluated,
	isProcessExitExpressionAtStart,
} from './is-branch-exit.js';
export {default as isShorthandImportLocal} from './is-shorthand-import-local.js';
export {default as isStrongPrecedenceNode} from './is-strong-precedence-node.js';
export {default as isStringLiteralRequired} from './is-string-literal-required.js';
export {default as isShorthandPropertyValue} from './is-shorthand-property-value.js';
export {default as isValueNotUsable} from './is-value-not-usable.js';
export {default as needsSemicolon} from './needs-semicolon.js';
export {default as normalizeComment} from './normalize-comment.js';
export {default as maskJSDocumentSyntax} from './jsdoc.js';
export {
	default as unwrapTypeScriptExpression,
	isTypeScriptExpressionWrapper,
	unwrapChainAndTypeScriptExpression,
	getOutermostTypeScriptExpression,
	getOutermostChainAndTypeScriptExpression,
} from './unwrap-typescript-expression.js';
export {
	getEslintDisableDirectives,
	isEslintDisableOrEnableDirective,
} from './eslint-directive.js';
export {
	isRuntimeImportSpecifier,
	isTypeImportSpecifier,
	isTypeOnlyDefinition,
} from './imports.js';
export {
	isDefinitionBeforeReference,
} from './scope.js';
export {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isNullishType,
	isStringMappingType,
	isTemplateLiteralType,
	isTypeParameterType,
	isUniqueSymbolType,
	isUnknownType,
	withTypeInformation,
} from './types.js';
export {
	getBuiltinCollectionType,
	isBuiltinSet,
} from './builtin-collection-type.js';
export {checkVueTemplate} from './rule.js';
export {default as getPrecedence, PRECEDENCE_ADDITION} from './get-precedence.js';
export {default as shouldAddParenthesesToAwaitExpressionArgument} from './should-add-parentheses-to-await-expression-argument.js';
export {default as shouldAddParenthesesToCallExpressionCallee} from './should-add-parentheses-to-call-expression-callee.js';
export {default as shouldAddParenthesesToConditionalExpressionChild, getConditionalExpressionChildText} from './should-add-parentheses-to-conditional-expression-child.js';
export {default as shouldAddParenthesesToMemberExpressionObject, getMemberExpressionObjectText} from './should-add-parentheses-to-member-expression-object.js';
export {default as shouldAddParenthesesToUnaryExpressionArgument} from './should-add-parentheses-to-unary-expression.js';
export {default as getNegatedExpressionText} from './get-negated-expression-text.js';
export {default as shouldAddParenthesesToNewExpressionCallee} from './should-add-parentheses-to-new-expression-callee.js';
export {default as shouldAddParenthesesToExpressionStatementExpression} from './should-add-parentheses-to-expression-statement-expression.js';
export {default as shouldAddParenthesesToLogicalExpressionChild, getLogicalExpressionChildText} from './should-add-parentheses-to-logical-expression-child.js';
export {default as shouldReportReplaceChildrenReceiver, mayBeHtmlTemplateElement} from './should-report-replace-children-receiver.js';
export {default as singular} from './singular.js';
export {default as toLocation} from './to-location.js';
export {default as trackBranchExits} from './track-branch-exits.js';
export {default as getAncestor} from './get-ancestor.js';
export {getPreviousNode, getNextNode, getNextStatement} from './get-sibling-node.js';
export {default as getChildNodes} from './get-child-nodes.js';
export {default as getVisitorChildNodes} from './get-visitor-child-nodes.js';
export {default as containsNode} from './contains-node.js';
export * from './string-cases.js';
export * from './numeric.js';
export {default as getBuiltinRule} from './get-builtin-rule.js';
export {default as trackLocalFunctionCalls} from './track-local-function-calls.js';
