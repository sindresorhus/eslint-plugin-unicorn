import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {
	escapeString, getIndentString, hasOptionalChainElement, isValueNotUsable,
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
		const {sourceCode} = context;
		let text = '';
		const datasetText = `${sourceCode.getText(callExpression.callee.object)}${callExpression.callee.optional ? '?' : ''}.dataset`;
		switch (method) {
			case 'setAttribute':
			case 'getAttribute':
			case 'removeAttribute': {
				text = isIdentifierName(name) ? `.${name}` : `[${escapeString(name, nameNode.raw.charAt(0))}]`;
				text = `${datasetText}${text}`;
				if (method === 'setAttribute') {
					text += ` = ${sourceCode.getText(callExpression.arguments[1])}`;
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
				description: 'Prefer attribute methods over `.dataset`.',
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
			if (keyNode.value.includes('-')) {
				return;
			}

			const objectText = sourceCode.getText(datasetNode.object);
			const chain = datasetNode.optional ? '?.' : '.';
			const attributeName = escapeString(camelCaseToDash(keyNode.value), keyNode.raw.charAt(0));

			return {
				node: reportNode,
				messageId: INVERSE_MESSAGE_ID,
				data: {method: 'hasAttribute'},
				fix: fixer => fixer.replaceText(
					reportNode,
					`${objectText}${chain}hasAttribute(${attributeName})`,
				),
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
			if (!(
				isMethodCall(callExpression, {
					object: 'Object',
					method: 'hasOwn',
					argumentsLength: 2,
					optionalCall: false,
					optionalMember: false,
				})
				&& isDatasetAccess(callExpression.arguments[0])
				&& isStringLiteral(callExpression.arguments[1])
			)) {
				return;
			}

			return getHasAttributeReport(callExpression, callExpression.arguments[1], callExpression.arguments[0]);
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
			const datasetNode = declarator.init;
			const objectText = sourceCode.getText(datasetNode.object);
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
			if (keyName === undefined) {
				return;
			}

			// Method calls and tagged templates on dataset — report without fix
			if (
				(parent.type === 'CallExpression' && parent.callee === memberExpression)
				|| (parent.type === 'TaggedTemplateExpression' && parent.tag === memberExpression)
			) {
				return {
					node: memberExpression,
					messageId: INVERSE_MESSAGE_ID,
					data: {method: 'getAttribute'},
				};
			}

			// Bracket keys with dashes (e.g. dataset["foo-bar"]) are ambiguous — skip
			if (memberExpression.computed && keyName.includes('-')) {
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

			const objectText = sourceCode.getText(object.object);
			const chain = object.optional ? '?.' : '.';
			const quote = memberExpression.computed ? memberExpression.property.raw.charAt(0) : undefined;
			const attributeName = escapeString(camelCaseToDash(keyName), quote);

			let fix;
			if (isWrite && isValueNotUsable(parent)) {
				fix = fixer => fixer.replaceText(parent, `${objectText}${chain}setAttribute(${attributeName}, ${sourceCode.getText(parent.right)})`);
			} else if (isDelete && isExpressionStatement(parent.parent)) {
				fix = fixer => fixer.replaceText(parent, `${objectText}${chain}removeAttribute(${attributeName})`);
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
