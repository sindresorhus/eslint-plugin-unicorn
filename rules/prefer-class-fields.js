import {getStringIfConstant, isSemicolonToken} from '@eslint-community/eslint-utils';
import {getStaticStringValue, isNumericLiteral, isStringLiteral} from './ast/index.js';
import {removeStatement} from './fix/index.js';
import {
	getEslintDisableDirectives,
	getIndentString,
	getLineIndent,
	getLinebreak,
	hasJavaScriptTypeAnnotations,
	hasMultilineToken,
	isNodeContainsLexicalThis,
	isNumeric,
	isParenthesized,
	isTypeScriptConstAssertion,
	isTypeScriptFile,
	reindentText,
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

	return removeStatement(node, context, fixer);
};

// `TSAbstractPropertyDefinition` is a declaration-only field and cannot have an initializer.
const fieldTypes = new Set(['AccessorProperty', 'PropertyDefinition', 'TSAbstractPropertyDefinition']);

const cannotHaveInitializer = property => Boolean(
	property.declare
	|| property.definite
	|| property.type === 'TSAbstractPropertyDefinition',
);

const isSignedNumericLiteral = node => node.type === 'UnaryExpression'
	&& ((node.operator === '-' && isNumeric(node.argument))
		|| (node.operator === '+' && isNumericLiteral(node.argument)));

// Object-valued keys can invoke user code during coercion.
const isLiteralPropertyKey = node => (node.type === 'Literal' && !node.regex)
	|| getStaticStringValue(node) !== undefined
	|| isSignedNumericLiteral(node);

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
			return isSignedNumericLiteral(node);
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

	const hasCommentsAffectedByEdit = (node, existingProperty, classBody) => {
		// Moving the assignment can detach line-based comments. Replacing an initializer can remove comments inside it.
		const {start, end} = sourceCode.getLoc(node);
		if (
			sourceCode.getCommentsBefore(node).length > 0
			|| sourceCode.getAllComments().some(comment => {
				const location = sourceCode.getLoc(comment);
				return location.end.line >= start.line - 1 && location.start.line <= end.line;
			})
			|| (existingProperty?.value && sourceCode.getCommentsInside(existingProperty.value).length > 0)
		) {
			return true;
		}

		// An edit can split a line directive from the line it covers, including when the edit is on the directive's own line.
		const destination = sourceCode.getLoc(existingProperty ?? sourceCode.getLastToken(classBody));
		return getEslintDisableDirectives(context).some(({type, node}) => {
			if (type !== 'disable-line' && type !== 'disable-next-line') {
				return false;
			}

			const location = sourceCode.getLoc(node);
			const lastAffectedLine = location.end.line + (type === 'disable-next-line' ? 1 : 0);
			return location.start.line <= destination.end.line && lastAffectedLine >= destination.start.line;
		});
	};

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
			|| (existingProperty && cannotHaveInitializer(existingProperty))
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

		// Later fields can observe the moved value or overwrite a public field through an unknown key.
		if (existingProperty && classBody.body.slice(classBody.body.indexOf(existingProperty) + 1).some(member =>
			fieldTypes.has(member.type)
			&& !member.static
			&& (
				(member.value && !isLiteralValue(member.value))
				|| (
					member.computed
					&& left.property.type !== 'PrivateIdentifier'
					&& getPropertyKey(member.key, true) === undefined
				)
			))) {
			return;
		}

		if (hasCommentsAffectedByEdit(node, existingProperty, classBody)) {
			return;
		}

		/**
			@param {import('eslint').Rule.RuleFixer} fixer
			*/
		function * fix(fixer) {
			yield removeFieldAssignment(node, context, fixer);
			const indent = existingProperty ? getLineIndent(existingProperty, context) : getIndentString(constructor, context);
			const valueText = sourceCode.getText(right);
			const propertyValue = hasMultilineToken(right, context)
				? valueText
				: reindentText(valueText, getLineIndent(right, context), indent);

			if (existingProperty) {
				const lastToken = sourceCode.getLastToken(existingProperty);
				const hasSemicolon = isSemicolonToken(lastToken);
				if (existingProperty.value) {
					yield fixer.replaceText(existingProperty.value, propertyValue);
					// A following computed member can become part of the new initializer.
					if (!hasSemicolon) {
						yield fixer.insertTextAfter(existingProperty, ';');
					}
				} else {
					const initializer = ` = ${propertyValue}`;
					yield hasSemicolon
						? fixer.insertTextBefore(lastToken, initializer)
						: fixer.insertTextAfter(existingProperty, `${initializer};`);
				}

				return;
			}

			const lastProperty = classBody.body.at(-1);
			if (fieldTypes.has(lastProperty.type) && !isSemicolonToken(sourceCode.getLastToken(lastProperty))) {
				yield fixer.insertTextAfter(lastProperty, ';');
			}

			const closingBrace = sourceCode.getLastToken(classBody);
			const {line, column} = sourceCode.getLoc(closingBrace).start;
			const isClosingBraceOnOwnLine = column === getIndentString(closingBrace, context).length;
			const insertionIndex = sourceCode.getIndexFromLoc({line, column: isClosingBraceOnOwnLine ? 0 : column});

			const linebreak = getLinebreak(context);
			const propertyText = sourceCode.getText(left.property);
			const fieldName = left.computed ? `[${propertyText}]` : propertyText;
			const fieldText = `${indent}${fieldName} = ${propertyValue};${linebreak}`;
			const text = isClosingBraceOnOwnLine
				? fieldText
				: `${linebreak}${fieldText}${getLineIndent(classBody.parent, context)}`;
			yield fixer.insertTextBeforeRange([insertionIndex, insertionIndex], text);
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
			A TypeScript parameter property already declares and initializes the field. Moving an assignment to that property into a separate field would create a duplicate declaration.
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
