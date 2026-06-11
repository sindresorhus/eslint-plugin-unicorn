import {getStaticValue} from '@eslint-community/eslint-utils';
import {isStringLiteral} from '../ast/index.js';
import {isFunctionCall, isStaticProperties, hasTypeAnnotation} from './type-check.js';

// `String(…)`
const isStringCall = node => isFunctionCall(node, 'String');

const stringMethods = new Set([
	'fromCharCode',
	'fromCodePoint',
]);

// `String.fromCharCode(…)` / `String.fromCodePoint(…)`
const isStringMethodCall = node =>
	node.type === 'CallExpression'
	&& !node.optional
	&& isStaticProperties(node.callee, 'String', stringMethods);

const isStaticString = (node, scope) =>
	typeof getStaticValue(node, scope)?.value === 'string';

const isStringTypeAnnotation = node => node?.type === 'TSStringKeyword';

const hasStringTypeAnnotation = (node, scope) => hasTypeAnnotation(node, scope, isStringTypeAnnotation);

// eslint-disable-next-line complexity
export default function isString(node, scope) {
	if (
		isStringLiteral(node)
		|| isStringCall(node)
		|| isStringMethodCall(node)
	) {
		return true;
	}

	switch (node.type) {
		case 'TemplateLiteral': {
			return true;
		}

		// `typeof x` always returns a string
		case 'UnaryExpression': {
			if (node.operator === 'typeof') {
				return true;
			}

			break;
		}

		// `a + b` where at least one side is a string
		case 'BinaryExpression': {
			if (node.operator === '+' && (isString(node.left, scope) || isString(node.right, scope))) {
				return true;
			}

			break;
		}

		case 'AssignmentExpression': {
			if (node.operator === '=' && isString(node.right, scope)) {
				return true;
			}

			if (node.operator === '+=' && (isString(node.left, scope) || isString(node.right, scope))) {
				return true;
			}

			break;
		}

		case 'ConditionalExpression': {
			if (isString(node.consequent, scope) && isString(node.alternate, scope)) {
				return true;
			}

			break;
		}

		case 'SequenceExpression': {
			if (isString(node.expressions.at(-1), scope)) {
				return true;
			}

			break;
		}

		case 'Identifier': {
			if (hasStringTypeAnnotation(node, scope)) {
				return true;
			}

			break;
		}

		// `foo as string`, `foo satisfies string`, `<string>foo`
		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion': {
			if (isStringTypeAnnotation(node.typeAnnotation)) {
				return true;
			}

			break;
		}

		// `foo!`
		case 'TSNonNullExpression': {
			if (isString(node.expression, scope)) {
				return true;
			}

			break;
		}
		// No default
	}

	return isStaticString(node, scope);
}
