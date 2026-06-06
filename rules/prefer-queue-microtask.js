import {isMemberExpression} from './ast/index.js';
import {isNodeValueNotFunction, isUnresolvedVariable, isValueNotUsable} from './utils/index.js';

const MESSAGE_ID = 'prefer-queue-microtask';
const messages = {
	[MESSAGE_ID]: 'Prefer `queueMicrotask()` over `{{name}}`.',
};

const isGlobalOrUnresolvedIdentifier = (node, context) => (
	node.type === 'Identifier'
	&& (
		context.sourceCode.isGlobalReference(node)
		|| isUnresolvedVariable(node, context)
	)
);

const isProcessNextTick = (node, context) => (
	isMemberExpression(node, {
		object: 'process',
		property: 'nextTick',
		computed: false,
		optional: false,
	})
	&& isGlobalOrUnresolvedIdentifier(node.object, context)
);

const isOptionalCall = node => (
	node.parent.type === 'CallExpression'
	&& node.parent.callee === node
	&& node.parent.optional
);

const getProcessNextTickFix = (node, context) => {
	const {parent} = node;
	if (
		parent.type !== 'CallExpression'
		|| parent.callee !== node
		|| parent.arguments.length !== 1
		|| parent.arguments[0].type === 'SpreadElement'
		|| context.sourceCode.getCommentsInside(node).length > 0
	) {
		return;
	}

	return fixer => fixer.replaceText(node, 'queueMicrotask');
};

const isZero = node => (
	node.type === 'Literal'
	&& node.value === 0
);

const hasCommentInRange = (sourceCode, range) => (
	sourceCode.getAllComments().some(comment => (
		sourceCode.getRange(comment)[0] >= range[0]
		&& sourceCode.getRange(comment)[1] <= range[1]
	))
);

const getSecondArgumentRemovalRange = (callExpression, context) => {
	const {sourceCode} = context;
	const [, secondArgument] = callExpression.arguments;
	const commaToken = sourceCode.getTokenBefore(secondArgument);
	const tokenAfter = sourceCode.getTokenAfter(secondArgument);
	const tokenAfterRemovalRange = tokenAfter?.value === ',' ? sourceCode.getTokenAfter(tokenAfter) : tokenAfter;
	const range = [
		sourceCode.getRange(commaToken)[0],
		tokenAfter?.value === ',' ? sourceCode.getRange(tokenAfter)[1] : sourceCode.getRange(secondArgument)[1],
	];
	const commentRange = [
		range[0],
		sourceCode.getRange(tokenAfterRemovalRange)[0],
	];

	if (hasCommentInRange(sourceCode, commentRange)) {
		return;
	}

	return range;
};

const getSetTimeoutFix = (node, context) => {
	if (node.arguments.length !== 2) {
		return;
	}

	const removalRange = getSecondArgumentRemovalRange(node, context);
	if (!removalRange) {
		return;
	}

	return function * (fixer) {
		yield fixer.replaceText(node.callee, 'queueMicrotask');
		yield fixer.removeRange(removalRange);
	};
};

const getGlobalCallFix = node => {
	if (node.arguments.length !== 1) {
		return;
	}

	return fixer => fixer.replaceText(node.callee, 'queueMicrotask');
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {
		checkSetImmediate,
		checkSetTimeout,
	} = context.options[0];

	context.on('MemberExpression', node => {
		if (
			!isProcessNextTick(node, context)
			|| isOptionalCall(node)
		) {
			return;
		}

		return {
			node: node.property,
			messageId: MESSAGE_ID,
			data: {name: 'process.nextTick()'},
			fix: getProcessNextTickFix(node, context),
		};
	});

	context.on('CallExpression', node => {
		if (
			checkSetImmediate
			&& node.callee.type === 'Identifier'
			&& node.callee.name === 'setImmediate'
			&& !node.optional
			&& node.arguments.length > 0
			&& node.arguments[0].type !== 'SpreadElement'
			&& !isNodeValueNotFunction(node.arguments[0])
			&& isValueNotUsable(node)
			&& isGlobalOrUnresolvedIdentifier(node.callee, context)
		) {
			return {
				node: node.callee,
				messageId: MESSAGE_ID,
				data: {name: 'setImmediate()'},
				fix: getGlobalCallFix(node),
			};
		}

		if (
			checkSetTimeout
			&& node.callee.type === 'Identifier'
			&& node.callee.name === 'setTimeout'
			&& !node.optional
			&& node.arguments.length >= 2
			&& isZero(node.arguments[1])
			&& node.arguments[0].type !== 'SpreadElement'
			&& !isNodeValueNotFunction(node.arguments[0])
			&& isValueNotUsable(node)
			&& isGlobalOrUnresolvedIdentifier(node.callee, context)
		) {
			return {
				node: node.callee,
				messageId: MESSAGE_ID,
				data: {name: 'setTimeout()'},
				fix: getSetTimeoutFix(node, context),
			};
		}
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkSetImmediate: {
				type: 'boolean',
				description: 'Whether to also check `setImmediate()`.',
			},
			checkSetTimeout: {
				type: 'boolean',
				description: 'Whether to also check `setTimeout(…, 0)`.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `queueMicrotask()` over `process.nextTick()`, `setImmediate()`, and `setTimeout(…, 0)`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{checkSetImmediate: false, checkSetTimeout: false}],
		messages,
	},
};

export default config;
