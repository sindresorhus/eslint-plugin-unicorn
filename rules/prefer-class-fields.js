import {getStringIfConstant, isSemicolonToken} from '@eslint-community/eslint-utils';
import {getStaticStringValue, isNumericLiteral, isStringLiteral} from './ast/index.js';
import {
	getIndentString,
	getLinebreak,
	hasJavaScriptTypeAnnotations,
	isNodeContainsLexicalThis,
	isNumeric,
	isParenthesized,
	isTypeScriptConstAssertion,
	isTypeScriptFile,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-class-fields/error';
const MESSAGE_ID_SUGGESTION = 'prefer-class-fields/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]:
		'Prefer class field declaration over `this` assignment in constructor for static values.',
	[MESSAGE_ID_SUGGESTION]:
		'Encountered same-named class field declaration and `this` assignment in constructor. Replace the class field declaration with the value from `this` assignment.',
};

/**
@param {import('eslint').Rule.Node} node
@param {import('eslint').Rule.RuleContext} context
@param {import('eslint').Rule.RuleFixer} fixer
*/
const removeFieldAssignment = (node, context, fixer) => {
	const [firstStatement, nextStatement] = node.parent.body;
	// Keep a following string literal out of the directive prologue.
	if (
		node === firstStatement
		&& nextStatement?.type === 'ExpressionStatement'
		&& isStringLiteral(nextStatement.expression)
		&& !isParenthesized(nextStatement.expression, context)
	) {
		return fixer.replaceText(node, ';');
	}

	const {sourceCode} = context;
	const {line} = sourceCode.getLoc(node).start;
	const nodeText = sourceCode.getText(node);
	const lineText = sourceCode.lines[line - 1];
	const isOnlyNodeOnLine = lineText.trim() === nodeText;

	return isOnlyNodeOnLine
		? fixer.removeRange([
			sourceCode.getIndexFromLoc({line, column: 0}),
			sourceCode.getIndexFromLoc({line: line + 1, column: 0}),
		])
		: fixer.remove(node);
};

// `TSAbstractPropertyDefinition` is a declaration-only field and cannot have an initializer.
const fieldTypes = new Set(['AccessorProperty', 'PropertyDefinition', 'TSAbstractPropertyDefinition']);

const hasNoInitializer = property => Boolean(
	property.declare
	|| property.definite
	|| property.type === 'TSAbstractPropertyDefinition',
);

const isSignedNumberLiteral = node => node.type === 'UnaryExpression'
	&& ((node.operator === '-' && isNumeric(node.argument))
		|| (node.operator === '+' && isNumericLiteral(node.argument)));

// Object and regular expression keys can invoke user code during coercion.
const isLiteralPropertyKey = node => (node.type === 'Literal' && !node.regex)
	|| getStaticStringValue(node) !== undefined
	|| isSignedNumberLiteral(node);

function getPropertyKey(node, computed = false) {
	if (!computed && node.type === 'Identifier') {
		return `.${node.name}`;
	}

	if (node.type === 'PrivateIdentifier') {
		return `#${node.name}`;
	}

	if (isLiteralPropertyKey(node)) {
		const name = getStringIfConstant(node);
		if (typeof name === 'string') {
			return `.${name}`;
		}
	}
}

function isLiteralValue(node) {
	switch (node.type) {
		case 'Literal': {
			return true;
		}

		case 'TemplateLiteral': {
			return getStaticStringValue(node) !== undefined;
		}

		case 'UnaryExpression': {
			return isSignedNumberLiteral(node);
		}

		case 'ArrayExpression': {
			return node.elements.every(element => !element || isLiteralValue(element));
		}

		case 'ObjectExpression': {
			return node.properties.every(property =>
				property.type === 'Property'
				&& property.kind === 'init'
				&& (!property.computed || isLiteralPropertyKey(property.key))
				&& isLiteralValue(property.value));
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion': {
			return isTypeScriptConstAssertion(node) && isLiteralValue(node.expression);
		}

		default: {
			return false;
		}
	}
}

/**
@type {import('eslint').Rule.RuleModule['create']}
*/
const create = context => {
	const {sourceCode} = context;
	const needsTypeReview = isTypeScriptFile(context.physicalFilename)
		|| Boolean(sourceCode.parserServices?.esTreeNodeToTSNodeMap)
		|| hasJavaScriptTypeAnnotations(context);

	const addFixOrSuggestion = (problem, constructor, matchingMembers) => {
		const {node} = problem;
		const {parent: classBody} = constructor;
		const {left, right} = node.expression;
		const existingProperties = matchingMembers.filter(node => fieldTypes.has(node.type) && !node.static);
		const existingProperty = existingProperties[0];

		/*
		A field with `abstract`, `declare`, or a definite assignment assertion cannot have an initializer. With duplicate fields, a later field could reset the value to `undefined`.
		*/
		if (
			existingProperties.length > 1
			|| (existingProperty && hasNoInitializer(existingProperty))
		) {
			return;
		}

		// Moving a default can change the inferred field type or narrow its type differently within the constructor.
		const isSimpleAssignment = !left.computed
			&& !existingProperty?.computed
			&& (right.type === 'Literal' || right.type === 'TemplateLiteral');
		if (isTypeScriptConstAssertion(right) || (needsTypeReview && !isSimpleAssignment)) {
			return;
		}

		// Base-class fields initialize before constructor parameter defaults.
		if (constructor.value.params.some(parameter => isNodeContainsLexicalThis(parameter, sourceCode.visitorKeys))) {
			return;
		}

		// Moving a value to an existing field can make it visible to later instance initializers.
		if (existingProperty && classBody.body.slice(classBody.body.indexOf(existingProperty) + 1).some(member =>
			fieldTypes.has(member.type) && !member.static && member.value && !isLiteralValue(member.value))) {
			return;
		}

		/**
			@param {import('eslint').Rule.RuleFixer} fixer
			*/
		function * fix(fixer) {
			yield removeFieldAssignment(node, context, fixer);
			const propertyValue = sourceCode.getText(right);

			if (existingProperty) {
				if (existingProperty.value) {
					yield fixer.replaceText(existingProperty.value, propertyValue);
					return;
				}

				const text = ` = ${propertyValue}`;
				const lastToken = sourceCode.getLastToken(existingProperty);
				if (isSemicolonToken(lastToken)) {
					yield fixer.insertTextBefore(lastToken, text);
					return;
				}

				yield fixer.insertTextAfter(existingProperty, `${text};`);
				return;
			}

			const closingBrace = sourceCode.getLastToken(classBody);
			const indent = getIndentString(constructor, context);
			const linebreak = getLinebreak(context);

			const propertyText = sourceCode.getText(left.property);
			const fieldName = left.computed ? `[${propertyText}]` : propertyText;
			let text = `${indent}${fieldName} = ${propertyValue};${linebreak}`;

			const characterBefore = sourceCode.text[sourceCode.getRange(closingBrace)[0] - 1];
			if (characterBefore !== '\n') {
				text = `${linebreak}${text}`;
			}

			const lastProperty = classBody.body.at(-1);
			if (
				lastProperty.type === 'PropertyDefinition'
				&& !isSemicolonToken(sourceCode.getLastToken(lastProperty))
			) {
				text = `;${text}`;
			}

			yield fixer.insertTextBefore(closingBrace, text);
		}

		// The assignment is rebuilt as a field, a comment inside it would be lost
		if (sourceCode.getCommentsInside(node).length > 0) {
			return;
		}

		if (existingProperty?.value) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			];
			return;
		}

		problem.fix = fix;
	};

	context.on('ClassBody', function * (classBody) {
		const constructor = classBody.body.find(node =>
			node.kind === 'constructor'
			&& !node.computed
			&& !node.static
			&& node.type === 'MethodDefinition'
			&& node.value.type === 'FunctionExpression');

		if (!constructor) {
			return;
		}

		const seenProperties = new Set();
		for (const node of constructor.value.body.body) {
			if (node.type === 'EmptyStatement') {
				continue;
			}

			if (!(
				node.type === 'ExpressionStatement'
				&& node.expression.type === 'AssignmentExpression'
				&& node.expression.operator === '='
				&& node.expression.left.type === 'MemberExpression'
				&& node.expression.left.object.type === 'ThisExpression'
				&& isLiteralValue(node.expression.right)
			)) {
				break;
			}

			const {property, computed} = node.expression.left;
			const key = getPropertyKey(property, computed);
			// A public `__proto__` assignment may call the inherited setter.
			if (key === undefined || key === '.__proto__' || seenProperties.has(key)) {
				break;
			}

			/*
			TypeScript emits the assignment of a parameter property at the top of the constructor, after the class field initializers, so `constructor(private x) { this.x = 0; }` must not become a field, and a field named like a parameter property would be a duplicate declaration.
			*/
			if (constructor.value.params.some(parameter =>
				parameter.type === 'TSParameterProperty'
				// `private x = 1` is an `AssignmentPattern`
				&& getPropertyKey(parameter.parameter.left ?? parameter.parameter) === key)) {
				break;
			}

			const matchingMembers = classBody.body.filter(member =>
				(member.type === 'MethodDefinition' || fieldTypes.has(member.type))
				&& getPropertyKey(member.key, member.computed) === key);
			const isPrivate = property.type === 'PrivateIdentifier';
			if (isPrivate && matchingMembers.length === 0) {
				break;
			}

			const problem = {node, messageId: MESSAGE_ID_ERROR};
			const isFirst = seenProperties.size === 0;

			/*
			A `get`/`set` accessor or a method defines the property on the prototype, a data field would shadow it. A private name is unique in the whole class, a `static` member with that name is already the declaration, so adding a field with it would be a duplicate.
			*/
			if (matchingMembers.some(member => member.static ? isPrivate : member.type === 'MethodDefinition')) {
				if (isFirst) {
					yield problem;
				}

				break;
			}

			// Fix assignments in order, so applying a fix independently cannot move it ahead of another assignment.
			if (isFirst) {
				addFixOrSuggestion(problem, constructor, matchingMembers);
			}

			yield problem;
			seenProperties.add(key);
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer class field declarations over `this` assignments in constructors.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
