import {findVariable} from '@eslint-community/eslint-utils';
import {
	getComments,
	getParenthesizedText,
	hasUnsafeArrowConversionReference,
} from './utils/index.js';

const MESSAGE_ID_INLINE = 'default-export-style/inline';
const MESSAGE_ID_SEPARATE = 'default-export-style/separate';
const MESSAGE_ID_SUGGESTION_INLINE = 'default-export-style/suggestion-inline';
const MESSAGE_ID_SUGGESTION_SEPARATE = 'default-export-style/suggestion-separate';

const STYLE_INLINE = 'inline';
const STYLE_SEPARATE = 'separate';
const STYLE_IGNORE = 'ignore';

const KIND_CLASS = 'class';
const KIND_FUNCTION = 'function';

const messages = {
	[MESSAGE_ID_INLINE]: 'Prefer declaring this default-exported {{kind}} inline.',
	[MESSAGE_ID_SEPARATE]: 'Prefer declaring this default-exported {{kind}} as a separate {{style}}.',
	[MESSAGE_ID_SUGGESTION_INLINE]: 'Use an inline default {{kind}} declaration.',
	[MESSAGE_ID_SUGGESTION_SEPARATE]: 'Use a separate const arrow function default export.',
};

const defaultOptions = {
	functions: STYLE_INLINE,
	classes: STYLE_INLINE,
};

const createStyleSchema = () => ({
	enum: [
		STYLE_INLINE,
		STYLE_SEPARATE,
		STYLE_IGNORE,
	],
});

const isExportedIdentifier = (exportDeclaration, name) =>
	exportDeclaration?.type === 'ExportDefaultDeclaration'
	&& exportDeclaration.declaration.type === 'Identifier'
	&& exportDeclaration.declaration.name === name;

const getName = node => node.id?.name;

const getKind = node => {
	switch (node.type) {
		case 'ClassDeclaration': {
			return KIND_CLASS;
		}

		case 'FunctionDeclaration': {
			return KIND_FUNCTION;
		}

		// No default
	}
};

const getOptionKey = kind => kind === KIND_CLASS ? 'classes' : 'functions';

const hasCommentsBetween = (context, left, right) => {
	const [, start] = context.sourceCode.getRange(left);
	const [end] = context.sourceCode.getRange(right);

	return getComments(context).some(comment => {
		const [commentStart, commentEnd] = context.sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});
};

const hasTrailingComment = (context, node) => {
	const [, end] = context.sourceCode.getRange(node);
	const nodeEndLine = context.sourceCode.getLoc(node).end.line;

	return getComments(context).some(comment =>
		context.sourceCode.getRange(comment)[0] >= end
		&& context.sourceCode.getLoc(comment).start.line === nodeEndLine,
	);
};

const isBindingReassigned = (scope, identifier) =>
	findVariable(scope, identifier)?.references.some(reference =>
		!reference.init && reference.isWrite()) ?? false;

const hasTypeScriptSyntax = node => {
	if (!node) {
		return false;
	}

	return Boolean(
		node.type.startsWith('TS')
		|| node.typeAnnotation
		|| node.typeParameters
		|| node.returnType
		|| node.implements?.length > 0
		|| node.superTypeArguments
		|| node.accessibility
		|| node.readonly
		|| node.override
		|| node.definite
		|| (
			node.optional
			&& node.type !== 'MemberExpression'
			&& node.type !== 'CallExpression'
		)
		|| node.abstract
		|| node.declare
		|| node.decorators?.length > 0,
	);
};

const hasTypeScriptSyntaxInTree = (node, visitorKeys) => {
	if (hasTypeScriptSyntax(node)) {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			if (value.some(child => child?.type && hasTypeScriptSyntaxInTree(child, visitorKeys))) {
				return true;
			}

			continue;
		}

		if (value?.type && hasTypeScriptSyntaxInTree(value, visitorKeys)) {
			return true;
		}
	}

	return false;
};

const hasSafeParametersForArrowConversion = (functionNode, context) =>
	functionNode.params.every(parameter => !hasUnsafeArrowConversionReference(parameter, context.sourceCode.visitorKeys));

const hasOtherReferences = (scope, identifier, allowedReferenceIdentifier) =>
	findVariable(scope, identifier)?.references.some(reference =>
		!reference.init
		&& reference.identifier !== allowedReferenceIdentifier,
	) ?? false;

const hasCommentsOutsideFunction = (context, node, functionNode) =>
	context.sourceCode.getCommentsInside(node).length > context.sourceCode.getCommentsInside(functionNode).length;

const getVariableArrowFunction = (node, context) => {
	if (
		node.type !== 'VariableDeclaration'
		|| node.kind !== 'const'
		|| node.declarations.length !== 1
	) {
		return;
	}

	const [declarator] = node.declarations;

	if (
		declarator.id.type !== 'Identifier'
		|| hasTypeScriptSyntax(declarator.id)
		|| declarator.init?.type !== 'ArrowFunctionExpression'
		|| hasTypeScriptSyntaxInTree(declarator.init, context.sourceCode.visitorKeys)
	) {
		return;
	}

	return declarator;
};

const getSeparateDeclaration = (statement, context) => {
	const name = getName(statement);

	if (name) {
		const kind = getKind(statement);
		return kind && {kind, name, declaration: statement};
	}

	const arrowFunctionDeclarator = getVariableArrowFunction(statement, context);

	if (arrowFunctionDeclarator) {
		return {
			kind: KIND_FUNCTION,
			name: arrowFunctionDeclarator.id.name,
			declaration: statement,
			functionNode: arrowFunctionDeclarator.init,
		};
	}
};

const canConvertFunctionToArrow = (functionNode, context) =>
	functionNode.type === 'FunctionDeclaration'
	&& !functionNode.generator
	&& !hasTypeScriptSyntaxInTree(functionNode, context.sourceCode.visitorKeys)
	&& context.sourceCode.getCommentsInside(functionNode).length === 0
	&& hasSafeParametersForArrowConversion(functionNode, context)
	&& !hasUnsafeArrowConversionReference(functionNode.body, context.sourceCode.visitorKeys);

const canConvertArrowToFunction = (functionNode, context) =>
	functionNode.type === 'ArrowFunctionExpression'
	&& !hasTypeScriptSyntaxInTree(functionNode, context.sourceCode.visitorKeys)
	&& context.sourceCode.getCommentsInside(functionNode).length === 0
	&& hasSafeParametersForArrowConversion(functionNode, context)
	&& !hasUnsafeArrowConversionReference(functionNode.body, context.sourceCode.visitorKeys);

const getParametersText = (functionNode, sourceCode) =>
	functionNode.params.map(parameter => sourceCode.getText(parameter)).join(', ');

const getArrowFunctionBodyText = (functionNode, context) =>
	functionNode.body.type === 'BlockStatement'
		? context.sourceCode.getText(functionNode.body)
		: `{ return ${getParenthesizedText(functionNode.body, context)}; }`;

const getInlineFunctionText = (name, functionNode, context) =>
	`export default ${functionNode.async ? 'async ' : ''}function ${name}(${getParametersText(functionNode, context.sourceCode)}) ${getArrowFunctionBodyText(functionNode, context)}`;

const getSeparateArrowFunctionText = (name, functionNode, context) =>
	`const ${name} = ${functionNode.async ? 'async ' : ''}(${getParametersText(functionNode, context.sourceCode)}) => ${context.sourceCode.getText(functionNode.body)};\nexport default ${name};`;

const fixSeparateToInline = (declaration, exportDeclaration, context) => function * (fixer) {
	yield fixer.insertTextBefore(declaration, 'export default ');
	yield fixer.removeRange([
		context.sourceCode.getRange(declaration)[1],
		context.sourceCode.getRange(exportDeclaration)[1],
	]);
};

const fixInlineClassToSeparate = (exportDeclaration, context) => fixer => {
	const {declaration} = exportDeclaration;
	return fixer.replaceText(
		exportDeclaration,
		`${context.sourceCode.getText(declaration)}\nexport default ${declaration.id.name};`,
	);
};

const suggestArrowToInlineFunction = ({
	context,
	declaration,
	exportDeclaration,
	name,
	scope,
}) => {
	const [{id, init: functionNode}] = declaration.declarations;

	if (
		context.sourceCode.getCommentsInside(exportDeclaration).length > 0
		|| hasTrailingComment(context, exportDeclaration)
		|| hasCommentsOutsideFunction(context, declaration, functionNode)
		|| hasOtherReferences(scope, id, exportDeclaration.declaration)
		|| !canConvertArrowToFunction(functionNode, context)
	) {
		return;
	}

	return [
		{
			messageId: MESSAGE_ID_SUGGESTION_INLINE,
			data: {
				kind: KIND_FUNCTION,
			},
			fix: fixer => fixer.replaceTextRange(
				[
					context.sourceCode.getRange(declaration)[0],
					context.sourceCode.getRange(exportDeclaration)[1],
				],
				getInlineFunctionText(name, functionNode, context),
			),
		},
	];
};

const suggestFunctionToSeparateArrow = ({
	context,
	declaration,
	exportDeclaration,
	name,
	scope,
	rangeStartNode = declaration,
}) => {
	if (
		context.sourceCode.getCommentsInside(exportDeclaration).length > context.sourceCode.getCommentsInside(declaration).length
		|| hasOtherReferences(
			scope,
			declaration.id,
			exportDeclaration.declaration.type === 'Identifier' ? exportDeclaration.declaration : undefined,
		)
		|| !canConvertFunctionToArrow(declaration, context)
	) {
		return;
	}

	return [
		{
			messageId: MESSAGE_ID_SUGGESTION_SEPARATE,
			fix: fixer => fixer.replaceTextRange(
				[
					context.sourceCode.getRange(rangeStartNode)[0],
					context.sourceCode.getRange(exportDeclaration)[1],
				],
				getSeparateArrowFunctionText(name, declaration, context),
			),
		},
	];
};

const reportSeparateDeclaration = ({
	context,
	declaration,
	exportDeclaration,
	expectedStyle,
	kind,
	name,
	scope,
}) => {
	if (
		expectedStyle === STYLE_IGNORE
		|| hasCommentsBetween(context, declaration, exportDeclaration)
		|| isBindingReassigned(scope, exportDeclaration.declaration)
	) {
		return;
	}

	if (
		kind === KIND_FUNCTION
		&& declaration.type === 'FunctionDeclaration'
		&& declaration.generator
	) {
		return;
	}

	if (
		kind === KIND_FUNCTION
		&& declaration.type === 'FunctionDeclaration'
		&& hasTypeScriptSyntaxInTree(declaration, context.sourceCode.visitorKeys)
	) {
		return;
	}

	if (expectedStyle === STYLE_INLINE) {
		if (declaration.type === 'VariableDeclaration') {
			return {
				node: exportDeclaration,
				messageId: MESSAGE_ID_INLINE,
				data: {kind},
				suggest: suggestArrowToInlineFunction({
					context,
					declaration,
					exportDeclaration,
					name,
					scope,
				}),
			};
		}

		if (
			kind === KIND_CLASS
			&& hasTypeScriptSyntaxInTree(declaration, context.sourceCode.visitorKeys)
		) {
			return;
		}

		if (
			context.sourceCode.getCommentsInside(exportDeclaration).length > 0
			|| hasTrailingComment(context, exportDeclaration)
		) {
			return {
				node: exportDeclaration,
				messageId: MESSAGE_ID_INLINE,
				data: {kind},
			};
		}

		return {
			node: exportDeclaration,
			messageId: MESSAGE_ID_INLINE,
			data: {kind},
			fix: fixSeparateToInline(declaration, exportDeclaration, context),
		};
	}

	if (
		expectedStyle === STYLE_SEPARATE
		&& kind === KIND_FUNCTION
		&& declaration.type === 'FunctionDeclaration'
	) {
		return {
			node: exportDeclaration,
			messageId: MESSAGE_ID_SEPARATE,
			data: {
				kind,
				style: 'const arrow function',
			},
			suggest: suggestFunctionToSeparateArrow({
				context,
				declaration,
				exportDeclaration,
				name,
				scope,
			}),
		};
	}
};

const reportInlineDeclaration = ({
	context,
	exportDeclaration,
	expectedStyle,
	kind,
}) => {
	const {declaration} = exportDeclaration;
	const name = getName(declaration);
	const exportScope = context.sourceCode.getScope(exportDeclaration);

	if (
		!name
		|| expectedStyle === STYLE_IGNORE
		|| expectedStyle === STYLE_INLINE
		|| isBindingReassigned(exportScope, name)
	) {
		return;
	}

	if (
		kind === KIND_FUNCTION
		&& (
			declaration.generator
			|| hasTypeScriptSyntaxInTree(declaration, context.sourceCode.visitorKeys)
		)
	) {
		return;
	}

	if (kind === KIND_FUNCTION) {
		return {
			node: exportDeclaration,
			messageId: MESSAGE_ID_SEPARATE,
			data: {
				kind,
				style: 'const arrow function',
			},
			suggest: suggestFunctionToSeparateArrow({
				context,
				declaration,
				exportDeclaration,
				name,
				scope: exportScope,
				rangeStartNode: exportDeclaration,
			}),
		};
	}

	if (
		kind === KIND_CLASS
		&& hasTypeScriptSyntaxInTree(declaration, context.sourceCode.visitorKeys)
	) {
		return;
	}

	if (
		context.sourceCode.getCommentsInside(exportDeclaration).length
		> context.sourceCode.getCommentsInside(declaration).length
	) {
		return {
			node: exportDeclaration,
			messageId: MESSAGE_ID_SEPARATE,
			data: {
				kind,
				style: 'class declaration',
			},
		};
	}

	return {
		node: exportDeclaration,
		messageId: MESSAGE_ID_SEPARATE,
		data: {
			kind,
			style: 'class declaration',
		},
		fix: fixInlineClassToSeparate(exportDeclaration, context),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0];

	context.on('Program', program => {
		for (const [index, statement] of program.body.entries()) {
			if (statement.type === 'ExportDefaultDeclaration') {
				const {declaration} = statement;
				const kind = getKind(declaration);
				const name = getName(declaration);

				if (!kind || !name) {
					continue;
				}

				const problem = reportInlineDeclaration({
					context,
					exportDeclaration: statement,
					expectedStyle: options[getOptionKey(kind)],
					kind,
				});

				if (problem) {
					return problem;
				}

				continue;
			}

			const nextStatement = program.body[index + 1];
			const separateDeclaration = getSeparateDeclaration(statement, context);

			if (
				!separateDeclaration
				|| !isExportedIdentifier(nextStatement, separateDeclaration.name)
			) {
				continue;
			}

			const problem = reportSeparateDeclaration({
				context,
				exportDeclaration: nextStatement,
				expectedStyle: options[getOptionKey(separateDeclaration.kind)],
				scope: context.sourceCode.getScope(nextStatement),
				...separateDeclaration,
			});

			if (problem) {
				return problem;
			}
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent default export declarations.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [
			{
				type: 'object',
				properties: {
					functions: createStyleSchema(),
					classes: createStyleSchema(),
				},
				additionalProperties: false,
			},
		],
		defaultOptions: [defaultOptions],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
