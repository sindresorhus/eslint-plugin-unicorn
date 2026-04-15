import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {
	escapeString,
	getIndentString,
	getParenthesizedText,
	hasOptionalChainElement,
	isParenthesized,
	isValueNotUsable,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';
import {
	isMemberExpression, isMethodCall, isStringLiteral, isExpressionStatement,
} from './ast/index.js';

const {isIdentifierName} = helperValidatorIdentifier;
const MESSAGE_ID = 'prefer-dataset';
const INVERSE_MESSAGE_ID = 'prefer-attributes';
const messages = {
	[MESSAGE_ID]: 'Prefer `.dataset` over `{{method}}(…)`.',
	[INVERSE_MESSAGE_ID]: 'Prefer `.{{method}}(…)` over `.dataset`.',
};

const dashToCamelCase = string => string.replaceAll(/-[a-z]/g, s => s[1].toUpperCase());
const camelCaseToDash = string => `data-${string.replaceAll(/[A-Z]/g, char => `-${char.toLowerCase()}`)}`;
const isDatasetAccess = node => isMemberExpression(node, {property: 'dataset'});

// Names inherited from `Object.prototype` — never a real `data-*` attribute.
const DATASET_INHERITED_MEMBERS = new Set([
	'constructor',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'toLocaleString',
	'toString',
	'valueOf',
	'__proto__',
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
]);

// HTML attribute names cannot contain whitespace, ", ', <, >, /, =, or control chars.
const INVALID_ATTRIBUTE_NAME_CHARS = /[\s\u0000-\u001F"'/<=>]/; // eslint-disable-line no-control-regex

// A dataset key only safely maps to a `data-*` attribute when it is not
// inherited from `Object.prototype` (the inverse `dataset.toString` is the
// inherited method, not an attribute), doesn't contain a dash (`dataset.fooBar`
// and `dataset['foo-bar']` collapse to the same `data-foo-bar`), and doesn't
// include chars forbidden in HTML attribute names (`setAttribute` would throw).
const isUnsafeDatasetKey = key =>
	DATASET_INHERITED_MEMBERS.has(key)
	|| key.includes('-')
	|| INVALID_ATTRIBUTE_NAME_CHARS.test(key);

// Get text for a node that becomes the receiver of a method call, preserving
// any required parentheses so e.g. `(a + b).dataset.foo` rewrites to
// `(a + b).getAttribute('data-foo')` rather than `a + b.getAttribute(...)`.
function getReceiverText(node, context) {
	const text = getParenthesizedText(node, context);
	if (
		!isParenthesized(node, context.sourceCode)
		&& shouldAddParenthesesToMemberExpressionObject(node, context)
	) {
		return `(${text})`;
	}

	return text;
}

function getFix(callExpression, context) {
	const method = callExpression.callee.property.name;

	// `foo?.bar = ''` is invalid
	// TODO: Remove this restriction if https://github.com/nicolo-ribaudo/ecma262/pull/4 get merged
	if (method === 'setAttribute' && hasOptionalChainElement(callExpression.callee)) {
		return;
	}

	// `element.setAttribute(…)` returns `undefined`, but `AssignmentExpression` returns value of RHS
	if (method === 'setAttribute' && !isValueNotUsable(callExpression)) {
		return;
	}

	if (method === 'removeAttribute' && !isExpressionStatement(callExpression.parent)) {
		return;
	}

	return fixer => {
		const [nameNode] = callExpression.arguments;
		const name = dashToCamelCase(nameNode.value.toLowerCase().slice(5));
		let text = '';
		const datasetText = `${getReceiverText(callExpression.callee.object, context)}${callExpression.callee.optional ? '?' : ''}.dataset`;
		switch (method) {
			case 'setAttribute':
			case 'getAttribute':
			case 'removeAttribute': {
				text = isIdentifierName(name) ? `.${name}` : `[${escapeString(name, nameNode.raw.charAt(0))}]`;
				text = `${datasetText}${text}`;
				if (method === 'setAttribute') {
					text += ` = ${getParenthesizedText(callExpression.arguments[1], context)}`;
				} else if (method === 'removeAttribute') {
					text = `delete ${text}`;
				}

				/*
				For non-exists attribute, `element.getAttribute('data-foo')` returns `null`,
				but `element.dataset.foo` returns `undefined`, switch to suggestions if necessary
				*/
				break;
			}

			case 'hasAttribute': {
				text = `Object.hasOwn(${datasetText}, ${escapeString(name, nameNode.raw.charAt(0))})`;
				break;
			}
			// No default
		}

		return fixer.replaceText(callExpression, text);
	};
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			preferAttributes: {
				type: 'boolean',
				description: 'Prefer attribute methods over named `.dataset` access.',
			},
		},
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {preferAttributes} = context.options[0];

	if (preferAttributes) {
		const {sourceCode} = context;

		const getHasAttributeReport = (reportNode, keyNode, datasetNode) => {
			if (isUnsafeDatasetKey(keyNode.value)) {
				return;
			}

			const objectText = getReceiverText(datasetNode.object, context);
			const chain = datasetNode.optional ? '?.' : '.';
			const attributeName = escapeString(camelCaseToDash(keyNode.value), keyNode.raw.charAt(0));

			return {
				node: reportNode,
				messageId: INVERSE_MESSAGE_ID,
				data: {method: 'hasAttribute'},
				fix(fixer) {
					let text = `${objectText}${chain}hasAttribute(${attributeName})`;
					if (needsSemicolon(sourceCode.getTokenBefore(reportNode), context, text)) {
						text = `;${text}`;
					}

					return fixer.replaceText(reportNode, text);
				},
			};
		};

		context.on('BinaryExpression', binaryExpression => {
			if (!(
				binaryExpression.operator === 'in'
				&& isStringLiteral(binaryExpression.left)
				&& isDatasetAccess(binaryExpression.right)
			)) {
				return;
			}

			return getHasAttributeReport(binaryExpression, binaryExpression.left, binaryExpression.right);
		});

		context.on('CallExpression', callExpression => {
			if (
				isMethodCall(callExpression, {
					object: 'Object',
					method: 'hasOwn',
					argumentsLength: 2,
					optionalCall: false,
					optionalMember: false,
				})
				&& isDatasetAccess(callExpression.arguments[0])
				&& isStringLiteral(callExpression.arguments[1])
			) {
				return getHasAttributeReport(callExpression, callExpression.arguments[1], callExpression.arguments[0]);
			}

			if (
				isMethodCall(callExpression, {
					method: 'hasOwnProperty',
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				&& isDatasetAccess(callExpression.callee.object)
				&& isStringLiteral(callExpression.arguments[0])
			) {
				return getHasAttributeReport(callExpression, callExpression.arguments[0], callExpression.callee.object);
			}
		});

		context.on('VariableDeclarator', declarator => {
			if (!(
				declarator.init
				&& isDatasetAccess(declarator.init)
				&& declarator.id.type === 'ObjectPattern'
			)) {
				return;
			}

			const {properties} = declarator.id;

			// Skip the whole pattern if any destructured key can't safely map to a
			// `data-*` attribute, or is a runtime computed key we can't analyze
			const hasUnsafeKey = properties.some(property => {
				if (property.type !== 'Property') {
					return false;
				}

				if (!property.computed && property.key.type === 'Identifier') {
					return isUnsafeDatasetKey(property.key.name);
				}

				if (isStringLiteral(property.key)) {
					return isUnsafeDatasetKey(property.key.value);
				}

				return true;
			});
			if (hasUnsafeKey) {
				return;
			}

			const datasetNode = declarator.init;
			const objectText = getReceiverText(datasetNode.object, context);
			const chain = datasetNode.optional ? '?.' : '.';

			// Only autofix when all properties are simple (no defaults, rest, computed)
			// and object is a plain identifier (safe to repeat for multi-property)
			const declaration = declarator.parent;
			let fix;
			if (
				properties.length > 0
				&& declaration.declarations.length === 1
				&& !declaration.parent.type.startsWith('For')
				&& declaration.parent.type !== 'ExportNamedDeclaration'
				&& properties.every(property =>
					property.type === 'Property'
					&& !property.computed
					&& property.key.type === 'Identifier'
					&& property.value.type === 'Identifier',
				)
				&& (properties.length === 1 || datasetNode.object.type === 'Identifier')
			) {
				const indent = getIndentString(declaration, context);
				const declarations = properties.map(property => {
					const attributeName = escapeString(camelCaseToDash(property.key.name), '\'');
					return `${declaration.kind} ${property.value.name} = ${objectText}${chain}getAttribute(${attributeName})`;
				});

				fix = fixer => fixer.replaceText(
					declaration,
					`${declarations.join(`;\n${indent}`)};`,
				);
			}

			return {
				node: datasetNode,
				messageId: INVERSE_MESSAGE_ID,
				data: {method: 'getAttribute'},
				fix,
			};
		});

		context.on('MemberExpression', memberExpression => {
			const {object, parent} = memberExpression;
			if (!isDatasetAccess(object)) {
				return;
			}

			const keyName = memberExpression.computed
				? (isStringLiteral(memberExpression.property) ? memberExpression.property.value : undefined)
				: memberExpression.property.name;
			if (keyName === undefined || isUnsafeDatasetKey(keyName)) {
				return;
			}

			// `element.dataset?.foo` short-circuits if `dataset` is nullish; the rewrite
			// would lose that — skip (the outer `element?.dataset.foo` form is fine
			// because the optional is on the dataset access, captured via `object.optional`)
			if (memberExpression.optional) {
				return;
			}

			// Method calls and tagged templates on dataset are not attribute reads — skip
			if (
				(parent.type === 'CallExpression' && parent.callee === memberExpression)
				|| (parent.type === 'TaggedTemplateExpression' && parent.tag === memberExpression)
			) {
				return;
			}

			if (
				parent.type === 'UpdateExpression'
				|| (parent.type === 'AssignmentExpression' && parent.left === memberExpression && parent.operator !== '=')
			) {
				return;
			}

			const isWrite = parent.type === 'AssignmentExpression' && parent.left === memberExpression;
			const isDelete = parent.type === 'UnaryExpression' && parent.operator === 'delete';
			const method = isWrite ? 'setAttribute' : (isDelete ? 'removeAttribute' : 'getAttribute');

			const objectText = getReceiverText(object.object, context);
			const chain = object.optional ? '?.' : '.';
			const quote = memberExpression.computed ? memberExpression.property.raw.charAt(0) : undefined;
			const attributeName = escapeString(camelCaseToDash(keyName), quote);

			let fix;
			if (isWrite && isValueNotUsable(parent)) {
				fix = fixer => fixer.replaceText(parent, `${objectText}${chain}setAttribute(${attributeName}, ${getParenthesizedText(parent.right, context)})`);
			} else if (isDelete && isExpressionStatement(parent.parent)) {
				fix = fixer => {
					let text = `${objectText}${chain}removeAttribute(${attributeName})`;
					if (needsSemicolon(sourceCode.getTokenBefore(parent), context, text)) {
						text = `;${text}`;
					}

					return fixer.replaceText(parent, text);
				};
			} else if (!isWrite && !isDelete) {
				fix = fixer => fixer.replaceText(memberExpression, `${objectText}${chain}getAttribute(${attributeName})`);
			}

			return {
				node: memberExpression,
				messageId: INVERSE_MESSAGE_ID,
				data: {method},
				fix,
			};
		});

		return;
	}

	context.on('CallExpression', callExpression => {
		if (!(
			(
				isMethodCall(callExpression, {
					method: 'setAttribute',
					argumentsLength: 2,
					optionalCall: false,
					optionalMember: false,
				})
				|| isMethodCall(callExpression, {
					methods: ['removeAttribute', 'hasAttribute'],
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				|| isMethodCall(callExpression, {
					method: 'getAttribute',
					argumentsLength: 1,
					optionalCall: false,
				})
			)
			&& isStringLiteral(callExpression.arguments[0])
		)) {
			return;
		}

		const method = callExpression.callee.property.name;
		// Playwright's `Locator#getAttribute()` returns a promise.
		// https://playwright.dev/docs/api/class-locator#locator-get-attribute
		if (
			callExpression.parent.type === 'AwaitExpression'
			&& callExpression.parent.argument === callExpression
			&& method === 'getAttribute'
		) {
			return;
		}

		const attributeName = callExpression.arguments[0].value.toLowerCase();

		if (!attributeName.startsWith('data-')) {
			return;
		}

		return {
			node: callExpression,
			messageId: MESSAGE_ID,
			data: {method},
			fix: getFix(callExpression, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent style for DOM element dataset access.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{preferAttributes: false}],
		messages,
	},
};

export default config;
