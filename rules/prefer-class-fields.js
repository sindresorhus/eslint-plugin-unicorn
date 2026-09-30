import {isSemicolonToken} from '@eslint-community/eslint-utils';
import {getIndentString, getLinebreak} from './utils/index.js';

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
@param {import('eslint').Rule.RuleContext['sourceCode']} sourceCode
@param {import('eslint').Rule.RuleFixer} fixer
*/
const removeFieldAssignment = (node, sourceCode, fixer) => {
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

// `TSAbstractPropertyDefinition` is a declaration only field, it can not get an initializer
const fieldTypes = new Set(['AccessorProperty', 'PropertyDefinition', 'TSAbstractPropertyDefinition']);

/**
@type {import('eslint').Rule.RuleModule['create']}
*/
const create = context => {
	const {sourceCode} = context;

	context.on('ClassBody', classBody => {
		const constructor = classBody.body.find(node =>
			node.kind === 'constructor'
			&& !node.computed
			&& !node.static
			&& node.type === 'MethodDefinition'
			&& node.value.type === 'FunctionExpression');

		if (!constructor) {
			return;
		}

		const node = constructor.value.body.body.find(node => node.type !== 'EmptyStatement');

		if (!(
			node?.type === 'ExpressionStatement'
			&& node.expression.type === 'AssignmentExpression'
			&& node.expression.operator === '='
			&& node.expression.left.type === 'MemberExpression'
			&& node.expression.left.object.type === 'ThisExpression'
			&& !node.expression.left.computed
			&& ['Identifier', 'PrivateIdentifier'].includes(node.expression.left.property.type)
			&& node.expression.right.type === 'Literal'
		)) {
			return;
		}

		const propertyName = node.expression.left.property.name;
		const propertyValue = node.expression.right.raw;
		const propertyType = node.expression.left.property.type;
		// `get 'bar'()` is the same accessor as `get bar()`
		const isSameKey = key =>
			(key.type === propertyType && key.name === propertyName)
			|| (propertyType === 'Identifier' && key.type === 'Literal' && key.value === propertyName);

		/*
		TypeScript emits the assignment of a parameter property at the top of the constructor, after the class field initializers, so `constructor(private x) { this.x = 0; }` must not become a field, and a field named like a parameter property would be a duplicate declaration.
		*/
		if (constructor.value.params.some(parameter =>
			parameter.type === 'TSParameterProperty'
			// `private x = 1` is an `AssignmentPattern`
			&& isSameKey(parameter.parameter.left ?? parameter.parameter))) {
			return;
		}

		/*
		A `get`/`set` accessor or a method defines the property on the prototype, a data field would shadow it. A private name is unique in the whole class, a `static` member with that name is already the declaration, so adding a field with it would be a duplicate.
		*/
		const hasConflictingMember = classBody.body.some(node =>
			(node.type === 'MethodDefinition' || fieldTypes.has(node.type))
			&& !node.computed
			&& isSameKey(node.key)
			&& (
				(propertyType === 'PrivateIdentifier' && node.static)
				|| (
					node.type === 'MethodDefinition'
					&& !node.static
				)
			),
		);
		const existingProperty = classBody.body.find(node =>
			fieldTypes.has(node.type)
			&& !node.computed
			&& !node.static
			&& isSameKey(node.key));

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
		};

		/*
		An `abstract` or `declare` field has no initializer, and a definite assignment assertion can not have one either.
		*/
		if (
			existingProperty
			&& (
				existingProperty.declare
				|| existingProperty.definite
				|| existingProperty.type === 'TSAbstractPropertyDefinition'
			)
		) {
			return problem;
		}

		/**
			@param {import('eslint').Rule.RuleFixer} fixer
			*/
		function * fix(fixer) {
			yield removeFieldAssignment(node, sourceCode, fixer);

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

			let text = `${indent}${propertyName} = ${propertyValue};${linebreak}`;

			const characterBefore = sourceCode.getText()[sourceCode.getRange(closingBrace)[0] - 1];
			if (characterBefore !== '\n') {
				text = `${linebreak}${text}`;
			}

			const lastProperty = classBody.body.at(-1);
			if (
				lastProperty.type === 'PropertyDefinition'
				&& sourceCode.getLastToken(lastProperty).value !== ';'
			) {
				text = `;${text}`;
			}

			yield fixer.insertTextBefore(closingBrace, text);
		}

		// The assignment is rebuilt as a field, a comment inside it would be lost
		if (hasConflictingMember || sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		if (existingProperty?.value) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			];
			return problem;
		}

		problem.fix = fix;
		return problem;
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
