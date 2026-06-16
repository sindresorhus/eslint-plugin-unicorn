import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {findVariable} from '@eslint-community/eslint-utils';
import {
	escapeString,
	getIndentString,
	getParenthesizedText,
	hasOptionalChainElement,
	isKnownNonDomNode,
	isLeftHandSide,
	isParenthesized,
	isValueNotUsable,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	wouldRemoveComments,
} from './utils/index.js';
import {removeStatement} from './fix/index.js';
import {
	isMemberExpression,
	isMethodCall,
	isStringLiteral,
	isExpressionStatement,
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
const isSimpleDatasetProperty = property =>
	property.type === 'Property'
	&& !property.computed
	&& property.key.type === 'Identifier'
	&& property.value.type === 'Identifier';

/*
The statically-known property key of `node.key` / `node['key']`, or `undefined` for computed non-string keys we can't analyze.
*/
const getStaticMemberKey = memberExpression => {
	if (!memberExpression.computed && memberExpression.property.type === 'Identifier') {
		return memberExpression.property.name;
	}

	if (memberExpression.computed && isStringLiteral(memberExpression.property)) {
		return memberExpression.property.value;
	}
};

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

/*
A dataset key only safely maps to a `data-*` attribute when it is not inherited from `Object.prototype` (the inverse `dataset.toString` is the inherited method, not an attribute), doesn't contain a dash (`dataset.fooBar` and `dataset['foo-bar']` collapse to the same `data-foo-bar`), and doesn't include chars forbidden in HTML attribute names (`setAttribute` would throw).
*/
const isUnsafeDatasetKey = key =>
	DATASET_INHERITED_MEMBERS.has(key)
	|| key.includes('-')
	|| INVALID_ATTRIBUTE_NAME_CHARS.test(key);

/*
Get text for a node that becomes the receiver of a method call, preserving any required parentheses so e.g. `(a + b).dataset.foo` rewrites to `(a + b).getAttribute('data-foo')` rather than `a + b.getAttribute(...)`.
*/
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

/*
For `const data = el.dataset`, collect the member expressions (`data.fooBar`) that read a `data-*` attribute through the variable. Returns `undefined` if any reference is something we can't safely rewrite to `getAttribute(…)` (write, `delete`, call, unsafe key, bare use like `foo(data)`, …).
*/
function getDatasetVariableReadMembers(variable) {
	const members = [];
	for (const reference of variable.references) {
		// The initializer write (`= el.dataset`) is the declaration itself.
		if (reference.init) {
			continue;
		}

		const {identifier} = reference;
		const member = identifier.parent;
		if (!(
			member.type === 'MemberExpression'
			&& member.object === identifier
			&& !member.optional
		)) {
			return;
		}

		const key = getStaticMemberKey(member);
		if (key === undefined || isUnsafeDatasetKey(key)) {
			return;
		}

		/*
		Only plain reads become `getAttribute(…)`. Writes, deletes, updates, and destructuring-assignment targets (`[data.foo] = …`) are left-hand sides; calls and tagged templates use the value, not the attribute. None can be rewritten.
		*/
		const {parent} = member;
		if (
			isLeftHandSide(member)
			|| (parent.type === 'CallExpression' && parent.callee === member)
			|| (parent.type === 'TaggedTemplateExpression' && parent.tag === member)
		) {
			return;
		}

		members.push(member);
	}

	return members;
}

/*
The fix repeats the element identifier at each usage site, so it must resolve to the same value there. Bail if the element is reassigned (its value could differ at the usage) or shadowed at any usage (a different binding of the same name). An undeclared global resolves to `undefined` at every site, so it's treated as stable.
*/
function isElementStableAcrossUsages(datasetNode, usageMembers, context) {
	const {sourceCode} = context;
	const {name} = datasetNode.object;
	const resolveElement = node => findVariable(sourceCode.getScope(node), name);
	const elementVariable = resolveElement(datasetNode.object);

	const isShadowed = usageMembers.some(member => resolveElement(member) !== elementVariable);
	const isReassigned = Boolean(elementVariable?.references.some(reference => reference.isWrite() && !reference.init));

	return !isShadowed && !isReassigned;
}

/*
Inline a `const data = el.dataset` declaration into its usages, rewriting each `data.fooBar` read to `el.getAttribute('data-foo-bar')` and removing the declaration. Returns `undefined` (report without fix) unless it's a simple `const` we can fully inline: every usage is a plain read, the element is a stable plain identifier, and no comments would be dropped.
*/
function getDatasetVariableInlineFix(declarator, context) {
	const {sourceCode} = context;
	const datasetNode = declarator.init;
	const declaration = declarator.parent;

	const [variable] = sourceCode.getDeclaredVariables(declarator);
	if (!variable) {
		return;
	}

	const usageMembers = getDatasetVariableReadMembers(variable);
	if (!(
		usageMembers
		&& usageMembers.length > 0
		&& declaration.kind === 'const'
		&& declaration.declarations.length === 1
		&& !declaration.parent.type.startsWith('For')
		&& declaration.parent.type !== 'ExportNamedDeclaration'
		&& datasetNode.object.type === 'Identifier'
		&& isElementStableAcrossUsages(datasetNode, usageMembers, context)
		&& !wouldRemoveComments(context, declaration)
		&& usageMembers.every(member => !wouldRemoveComments(context, member))
	)) {
		return;
	}

	const objectText = getReceiverText(datasetNode.object, context);
	return function * (fixer) {
		yield removeStatement(declaration, context, fixer);
		for (const member of usageMembers) {
			const quote = member.computed ? member.property.raw.charAt(0) : undefined;
			const attributeName = escapeString(camelCaseToDash(getStaticMemberKey(member)), quote);
			yield fixer.replaceText(member, `${objectText}.getAttribute(${attributeName})`);
		}
	};
}

function getFix(callExpression, context) {
	const method = callExpression.callee.property.name;

	/*
	`foo?.bar = ''` is invalid
	TODO: Remove this restriction if https://github.com/nicolo-ribaudo/ecma262/pull/4 get merged
	*/
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

	const preservedNodes = [callExpression.callee.object];
	if (method === 'setAttribute') {
		preservedNodes.push(callExpression.arguments[1]);
	}

	if (wouldRemoveComments(context, callExpression, preservedNodes)) {
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
			if (
				isUnsafeDatasetKey(keyNode.value)
				|| isKnownNonDomNode(datasetNode.object, context)
			) {
				return;
			}

			const objectText = getReceiverText(datasetNode.object, context);
			const chain = datasetNode.optional ? '?.' : '.';
			const attributeName = escapeString(camelCaseToDash(keyNode.value), keyNode.raw.charAt(0));
			const fix = wouldRemoveComments(context, reportNode, [datasetNode.object])
				? undefined
				: fixer => {
					let text = `${objectText}${chain}hasAttribute(${attributeName})`;
					if (needsSemicolon(sourceCode.getTokenBefore(reportNode), context, text)) {
						text = `;${text}`;
					}

					return fixer.replaceText(reportNode, text);
				};

			return {
				node: reportNode,
				messageId: INVERSE_MESSAGE_ID,
				data: {method: 'hasAttribute'},
				fix,
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
				&& (declarator.id.type === 'ObjectPattern' || declarator.id.type === 'Identifier')
			)) {
				return;
			}

			if (isKnownNonDomNode(declarator.init.object, context)) {
				return;
			}

			const datasetNode = declarator.init;

			/*
			`const data = el.dataset` then `data.fooBar` — assigning `.dataset` to a variable hides attribute access from greppability, the point of this option.
			*/
			if (declarator.id.type === 'Identifier') {
				return {
					node: datasetNode,
					messageId: INVERSE_MESSAGE_ID,
					data: {method: 'getAttribute'},
					fix: getDatasetVariableInlineFix(declarator, context),
				};
			}

			const {properties} = declarator.id;

			/*
			Skip the whole pattern if any destructured key can't safely map to a `data-*` attribute, or is a runtime computed key we can't analyze.
			*/
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

			const declaration = declarator.parent;
			const objectText = getReceiverText(datasetNode.object, context);
			const chain = datasetNode.optional ? '?.' : '.';

			/*
			Only autofix when all properties are simple (no defaults, rest, computed) and object is a plain identifier (safe to repeat for multi-property).
			*/
			let fix;
			if (
				properties.length > 0
				&& declaration.declarations.length === 1
				&& !declaration.parent.type.startsWith('For')
				&& declaration.parent.type !== 'ExportNamedDeclaration'
				&& !wouldRemoveComments(context, declaration, [datasetNode.object])
				&& properties.every(property => isSimpleDatasetProperty(property))
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
			const {object} = memberExpression;
			if (!isDatasetAccess(object)) {
				return;
			}

			if (isKnownNonDomNode(object.object, context)) {
				return;
			}

			const keyName = getStaticMemberKey(memberExpression);
			if (keyName === undefined || isUnsafeDatasetKey(keyName)) {
				return;
			}

			/*
			`element.dataset?.foo` short-circuits if `dataset` is nullish; the rewrite would lose that — skip (the outer `element?.dataset.foo` form is fine because the optional is on the dataset access, captured via `object.optional`).
			*/
			if (memberExpression.optional) {
				return;
			}

			/*
			`ChainExpression` wraps the outermost optional-chain expression, so for `delete element?.dataset.foo` the surrounding `delete` sits on the chain's parent — unwrap to see the real operator context.
			*/
			const parent = memberExpression.parent.type === 'ChainExpression'
				? memberExpression.parent.parent
				: memberExpression.parent;

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

			/*
			Any other left-hand side is a destructuring-assignment target (`[el.dataset.foo] = …`, `({x: el.dataset.foo} = …)`) with no attribute-method equivalent; the read rewrite would be invalid syntax — skip. Only plain `=` writes and `delete` are handled below.
			*/
			if (isLeftHandSide(memberExpression) && !isWrite && !isDelete) {
				return;
			}

			const method = isWrite ? 'setAttribute' : (isDelete ? 'removeAttribute' : 'getAttribute');

			const objectText = getReceiverText(object.object, context);
			const chain = object.optional ? '?.' : '.';
			const quote = memberExpression.computed ? memberExpression.property.raw.charAt(0) : undefined;
			const attributeName = escapeString(camelCaseToDash(keyName), quote);

			let fix;
			if (
				isWrite
				&& isValueNotUsable(parent)
				&& !wouldRemoveComments(context, parent, [object.object, parent.right])
			) {
				fix = fixer => fixer.replaceText(parent, `${objectText}${chain}setAttribute(${attributeName}, ${getParenthesizedText(parent.right, context)})`);
			} else if (
				isDelete
				&& isExpressionStatement(parent.parent)
				&& !wouldRemoveComments(context, parent, [object.object])
			) {
				fix = fixer => {
					let text = `${objectText}${chain}removeAttribute(${attributeName})`;
					if (needsSemicolon(sourceCode.getTokenBefore(parent), context, text)) {
						text = `;${text}`;
					}

					return fixer.replaceText(parent, text);
				};
			} else if (
				!isWrite
				&& !isDelete
				&& !wouldRemoveComments(context, memberExpression, [object.object])
			) {
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

		if (isKnownNonDomNode(callExpression.callee.object, context)) {
			return;
		}

		const method = callExpression.callee.property.name;

		/*
		Playwright's `Locator#getAttribute()` returns a promise.
		https://playwright.dev/docs/api/class-locator#locator-get-attribute
		`ChainExpression` wraps `await locator?.getAttribute(…)`, so unwrap it.
		*/
		const outerNode = callExpression.parent.type === 'ChainExpression' ? callExpression.parent : callExpression;
		if (
			outerNode.parent.type === 'AwaitExpression'
			&& outerNode.parent.argument === outerNode
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
		languages: [
			'js/js',
		],
	},
};

export default config;
