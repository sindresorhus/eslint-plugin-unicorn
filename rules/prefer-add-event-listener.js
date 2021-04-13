'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const domEventsJson = require('./utils/dom-events.json');
const {flatten} = require('lodash');

const MESSAGE_ID = 'prefer-add-event-listener';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{method}}`.{{extra}}'
};
const extraMessages = {
	beforeunload: 'Use `event.preventDefault(); event.returnValue = \'foo\'` to trigger the prompt.',
	message: 'Note that there is difference between `SharedWorker#onmessage` and `SharedWorker#addEventListener(\'message\')`.'
};

const nestedEvents = Object.values(domEventsJson);
const eventTypes = new Set(flatten(nestedEvents));
const getEventMethodName = memberExpression => memberExpression.property.name;
const getEventTypeName = eventMethodName => eventMethodName.slice('on'.length);

const fixCode = (fixer, sourceCode, assignmentNode, memberExpression) => {
	const eventTypeName = getEventTypeName(getEventMethodName(memberExpression));
	let eventObjectCode = sourceCode.getText(memberExpression.object);
	if (isParenthesized(memberExpression.object, sourceCode)) {
		eventObjectCode = `(${eventObjectCode})`;
	}

	let fncCode = sourceCode.getText(assignmentNode.right);
	if (isParenthesized(assignmentNode.right, sourceCode)) {
		fncCode = `(${fncCode})`;
	}

	const fixedCodeStatement = `${eventObjectCode}.addEventListener('${eventTypeName}', ${fncCode})`;
	return fixer.replaceText(assignmentNode, fixedCodeStatement);
};

const shouldFixBeforeUnload = (assignedExpression, nodeReturnsSomething) => {
	if (
		assignedExpression.type !== 'ArrowFunctionExpression' &&
		assignedExpression.type !== 'FunctionExpression'
	) {
		return false;
	}

	if (assignedExpression.body.type !== 'BlockStatement') {
		return false;
	}

	return !nodeReturnsSomething.get(assignedExpression);
};

const isClearing = node => {
	if (node.type === 'Literal') {
		return node.raw === 'null';
	}

	if (node.type === 'Identifier') {
		return node.name === 'undefined';
	}

	return false;
};

const create = context => {
	const options = context.options[0] || {};
	const excludedPackages = new Set(options.excludedPackages || ['koa', 'sax']);
	let isDisabled;

	const nodeReturnsSomething = new WeakMap();
	let codePathInfo;

	return {
		onCodePathStart(codePath, node) {
			codePathInfo = {
				node,
				upper: codePathInfo,
				returnsSomething: false
			};
		},

		onCodePathEnd() {
			nodeReturnsSomething.set(codePathInfo.node, codePathInfo.returnsSomething);
			codePathInfo = codePathInfo.upper;
		},

		'CallExpression[callee.name="require"] > Literal'(node) {
			if (!isDisabled && excludedPackages.has(node.value)) {
				isDisabled = true;
			}
		},

		'ImportDeclaration > Literal'(node) {
			if (!isDisabled && excludedPackages.has(node.value)) {
				isDisabled = true;
			}
		},

		ReturnStatement(node) {
			codePathInfo.returnsSomething = codePathInfo.returnsSomething || Boolean(node.argument);
		},

		'AssignmentExpression:exit'(node) {
			if (isDisabled) {
				return;
			}

			const {left: memberExpression, right: assignedExpression} = node;

			if (
				memberExpression.type !== 'MemberExpression' ||
				memberExpression.computed
			) {
				return;
			}

			const eventMethodName = getEventMethodName(memberExpression);

			if (!eventMethodName || !eventMethodName.startsWith('on')) {
				return;
			}

			const eventTypeName = getEventTypeName(eventMethodName);

			if (!eventTypes.has(eventTypeName)) {
				return;
			}

			let replacement = 'addEventListener';
			let extra = '';
			let fix;

			if (isClearing(assignedExpression)) {
				replacement = 'removeEventListener';
			} else if (
				eventTypeName === 'beforeunload' &&
				!shouldFixBeforeUnload(assignedExpression, nodeReturnsSomething)
			) {
				extra = extraMessages.beforeunload;
			} else if (eventTypeName === 'message') {
				// Disable `onmessage` fix, see #537
				extra = extraMessages.message;
			} else {
				fix = fixer => fixCode(fixer, context.getSourceCode(), node, memberExpression);
			}

			context.report({
				node: memberExpression.property,
				messageId: MESSAGE_ID,
				data: {
					replacement,
					method: eventMethodName,
					extra: extra ? ` ${extra}` : ''
				},
				fix
			});
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			excludedPackages: {
				type: 'array',
				items: {
					type: 'string'
				},
				uniqueItems: true
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
