'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const domEventsJson = require('./utils/dom-events.json');

const message = 'Prefer `{{replacement}}` over `{{method}}`.{{extra}}';
const beforeUnloadMessage = ' Use `event.preventDefault(); event.returnValue = \'foo\'` to trigger the prompt.';

const nestedEvents = Object.keys(domEventsJson).map(key => domEventsJson[key]);
const eventTypes = new Set(nestedEvents.reduce((accumulatorEvents, events) => accumulatorEvents.concat(events), []));
const getEventMethodName = memberExpression => memberExpression.property.name;
const getEventTypeName = eventMethodName => eventMethodName.slice('on'.length);

const fix = (fixer, sourceCode, assignmentNode, memberExpression) => {
	const eventTypeName = getEventTypeName(getEventMethodName(memberExpression));
	const eventObjectCode = sourceCode.getText(memberExpression.object);
	const fncCode = sourceCode.getText(assignmentNode.right);
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
	let codePathInfo = null;

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

			if (memberExpression.type !== 'MemberExpression') {
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

			const problem = {
				node,
				message,
				data: {
					replacement: 'addEventListener',
					method: eventMethodName,
					extra: ''
				}
			};

			if (isClearing(assignedExpression)) {
				problem.data.replacement = 'removeEventListener';
			} else if (
				eventTypeName === 'beforeunload' &&
				!shouldFixBeforeUnload(assignedExpression, nodeReturnsSomething)
			) {
				problem.data.extra = beforeUnloadMessage;
			} else {
				problem.fix = fixer => fix(fixer, context.getSourceCode(), node, memberExpression);
			}

			context.report(problem);
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
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema
	}
};
