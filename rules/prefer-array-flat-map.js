import {
	isNodeMatches,
	wouldRemoveComments,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';
import {removeMethodCall} from './fix/index.js';

const MESSAGE_ID = 'prefer-array-flat-map';
const messages = {
	[MESSAGE_ID]: 'Prefer `.flatMap(…)` over `.map(…).flat()`.',
};

const ignored = ['React.Children', 'Children'];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!(
			isMethodCall(callExpression, {
				method: 'flat',
				optionalCall: false,
				optionalMember: false,
			})
			&& (
				callExpression.arguments.length === 0
				|| (
					callExpression.arguments.length === 1
					&& callExpression.arguments[0].type === 'Literal'
					&& callExpression.arguments[0].raw === '1'
				)
			)
			&& isMethodCall(callExpression.callee.object, {
				method: 'map',
				optionalCall: false,
			})
		)) {
			return;
		}

		const flatCallExpression = callExpression;
		const mapCallExpression = flatCallExpression.callee.object;
		if (isNodeMatches(mapCallExpression.callee.object, ignored)) {
			return;
		}

		const {sourceCode} = context;
		const mapProperty = mapCallExpression.callee.property;
		const fix = wouldRemoveComments(context, flatCallExpression, [mapCallExpression])
			? undefined
			: function * (fixer) {
				// Removes:
				//   map(…).flat();
				//         ^^^^^^^
				//   (map(…)).flat();
				//           ^^^^^^^
				yield removeMethodCall(fixer, flatCallExpression, context);

				// Renames:
				//   map(…).flat();
				//   ^^^
				//   (map(…)).flat();
				//    ^^^
				yield fixer.replaceText(mapProperty, 'flatMap');
			};

		return {
			node: flatCallExpression,
			loc: {
				start: sourceCode.getLoc(mapProperty).start,
				end: sourceCode.getLoc(flatCallExpression).end,
			},
			messageId: MESSAGE_ID,
			fix,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.flatMap(…)` over `.map(…).flat()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
