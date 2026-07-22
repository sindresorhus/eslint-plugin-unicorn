import {isMethodCall} from './ast/index.js';
import {getStaticNumberValue, shouldSkipKnownNonArrayReceiver} from './utils/index.js';
import {isLengthOf} from './utils/comparison.js';

const MESSAGE_ID_NEGATIVE_INDEX = 'negative-index';
const MESSAGE_ID_LENGTH_INDEX = 'length-index';

const messages = {
	[MESSAGE_ID_NEGATIVE_INDEX]: 'Avoid using a negative index with `Array#with()`.',
	[MESSAGE_ID_LENGTH_INDEX]: 'Avoid using `.length` as the index in `Array#with()`.',
};

/**
@import * as ESLint from 'eslint';
*/

const isNegativeStaticIndex = node => Math.trunc(getStaticNumberValue(node)) < 0;

function getMessageId(indexNode, object) {
	if (isNegativeStaticIndex(indexNode)) {
		return MESSAGE_ID_NEGATIVE_INDEX;
	}

	if (isLengthOf(indexNode, object)) {
		return MESSAGE_ID_LENGTH_INDEX;
	}
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'with',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const {object} = callExpression.callee;
		const [indexNode] = callExpression.arguments;
		const messageId = getMessageId(indexNode, object);

		if (!messageId || shouldSkipKnownNonArrayReceiver(object, context)) {
			return;
		}

		return {
			node: callExpression.callee.property,
			messageId,
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow confusing uses of `Array#with()`.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
