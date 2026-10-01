import {
	getChildNodes,
	isParenthesized,
	isNodeValueNotFunction,
	isSameReference,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import eventTypes from './shared/dom-events.js';
import {isUndefinedValue, isNullLiteral, isStaticRequire} from './ast/index.js';

const MESSAGE_ID = 'prefer-add-event-listener';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{method}}`.{{extra}}',
};
const extraMessages = {
	beforeunload: 'Use `event.preventDefault(); event.returnValue = \'foo\'` to trigger the prompt.',
	message: 'Note that there is difference between `SharedWorker#onmessage` and `SharedWorker#addEventListener(\'message\')`.',
	error: 'Note that there is difference between `{window,element}.onerror` and `{window,element}.addEventListener(\'error\')`.',
};

const getEventMethodName = memberExpression => memberExpression.property.name;
const getEventTypeName = eventMethodName => eventMethodName.slice('on'.length);

const fixCode = (fixer, context, assignmentNode, memberExpression) => {
	const {sourceCode} = context;
	const eventTypeName = getEventTypeName(getEventMethodName(memberExpression));
	let eventObjectCode = sourceCode.getText(memberExpression.object);
	if (isParenthesized(memberExpression.object, context)) {
		eventObjectCode = `(${eventObjectCode})`;
	}

	let fncCode = sourceCode.getText(assignmentNode.right);
	if (isParenthesized(assignmentNode.right, context)) {
		fncCode = `(${fncCode})`;
	}

	const fixedCodeStatement = `${eventObjectCode}.addEventListener('${eventTypeName}', ${fncCode})`;
	return fixer.replaceText(assignmentNode, fixedCodeStatement);
};

const shouldFixBeforeUnload = (assignedExpression, nodeReturnsSomething) => {
	if (
		assignedExpression.type !== 'ArrowFunctionExpression'
		&& assignedExpression.type !== 'FunctionExpression'
	) {
		return false;
	}

	return assignedExpression.body.type === 'BlockStatement' && !nodeReturnsSomething.get(assignedExpression);
};

// Whether the subtree contains another assignment of the same `on*` attribute, at any nesting depth. The handler being assigned is searched too, it runs on every event and can reassign the attribute just as effectively as a sibling statement can.
function containsOtherAssignment(node, memberExpression, assignment) {
	if (
		node.type === 'AssignmentExpression'
		&& node !== assignment
		&& isSameReference(node.left, memberExpression)
	) {
		return true;
	}

	for (const child of getChildNodes(node)) {
		if (containsOtherAssignment(child, memberExpression, assignment)) {
			return true;
		}
	}

	return false;
}

// Assigning an `on*` IDL attribute replaces the previous handler, so the rewrite is only safe when nothing else assigns the same receiver and property. Otherwise a later `on* = null` no longer removes the listener the fix added.
const isAssignedMoreThanOnce = (node, memberExpression, context) =>
	// The whole program is scanned, a nested block or function assigns the attribute just as effectively as a sibling statement does
	context.sourceCode.ast.body.some(statement => containsOtherAssignment(statement, memberExpression, node));

// `as`, `satisfies` and `!` are erased at compile time, `null as never` still clears the handler
const isClearing = node => {
	node = unwrapTypeScriptExpression(node);
	return isUndefinedValue(node) || isNullLiteral(node);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const options = context.options[0];
	const excludedPackages = new Set(options.excludedPackages);
	let isDisabled;

	const nodeReturnsSomething = new WeakMap();
	let codePathInfo;

	context.on('onCodePathStart', (codePath, node) => {
		codePathInfo = {
			node,
			upper: codePathInfo,
			returnsSomething: false,
		};
	});

	context.on('onCodePathEnd', () => {
		nodeReturnsSomething.set(codePathInfo.node, codePathInfo.returnsSomething);
		codePathInfo = codePathInfo.upper;
	});

	context.on('CallExpression', node => {
		if (!isStaticRequire(node)) {
			return;
		}

		if (!isDisabled && excludedPackages.has(node.arguments[0].value)) {
			isDisabled = true;
		}
	});

	context.on('Literal', node => {
		if (node.parent.type === 'ImportDeclaration' && !isDisabled && excludedPackages.has(node.value)) {
			isDisabled = true;
		}
	});

	context.on('ReturnStatement', node => {
		codePathInfo.returnsSomething ||= Boolean(node.argument);
	});

	context.on('AssignmentExpression:exit', node => {
		if (isDisabled) {
			return;
		}

		const {left: memberExpression, right: assignedExpression, operator} = node;

		if (
			memberExpression.type !== 'MemberExpression'
			|| memberExpression.computed
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
			eventTypeName === 'beforeunload'
			&& !shouldFixBeforeUnload(assignedExpression, nodeReturnsSomething)
		) {
			extra = extraMessages.beforeunload;
		} else if (eventTypeName === 'message') {
			// Disable `onmessage` fix, see #537
			extra = extraMessages.message;
		} else if (eventTypeName === 'error') {
			// Disable `onerror` fix, see #1493
			extra = extraMessages.error;
		} else if (
			operator === '='
			&& node.parent.type === 'ExpressionStatement'
			&& node.parent.expression === node
			&& !isNodeValueNotFunction(assignedExpression)
			// The whole assignment is rebuilt from two operands, so a comment in it would be lost
			&& context.sourceCode.getCommentsInside(node).length === 0
			&& !isAssignedMoreThanOnce(node, memberExpression, context)
		) {
			fix = fixer => fixCode(fixer, context, node, memberExpression);
		}

		return {
			node: memberExpression.property,
			messageId: MESSAGE_ID,
			data: {
				replacement,
				method: eventMethodName,
				extra: extra ? ` ${extra}` : '',
			},
			fix,
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			excludedPackages: {
				type: 'array',
				items: {
					type: 'string',
				},
				uniqueItems: true,
				description: 'Packages to exclude from checking.',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{excludedPackages: ['koa', 'sax']}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
