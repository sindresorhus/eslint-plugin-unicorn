'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isMethodNamed = require('./utils/is-method-named');
const isLiteralValue = require('./utils/is-literal-value');
const {isNodeMatches} = require('./utils/is-node-matches');
const {methodCallSelector} = require('./selectors');

const MESSAGE_ID_FLATMAP = 'flat-map';
const MESSAGE_ID_SPREAD = 'spread';
const messages = {
	[MESSAGE_ID_FLATMAP]: 'Prefer `.flatMap(…)` over `.map(…).flat()`.',
	[MESSAGE_ID_SPREAD]: 'Prefer `.flatMap(…)` over `[].concat(...foo.map(…))`.'
};

const selector = [
	methodCallSelector({name: 'flat', max: 1}),
	methodCallSelector({path: 'callee.object', name: 'map'})
].join('');

const reportFlatMap = (context, nodeFlat) => {
	const nodeMap = nodeFlat.callee.object;
	const source = context.getSourceCode();

	// Node covers:
	//   map(…).flat();
	//          ^^^^
	//   (map(…)).flat();
	//            ^^^^
	const flatIdentifer = nodeFlat.callee.property;

	// Location will be:
	//   map(…).flat();
	//         ^
	//   (map(…)).flat();
	//           ^
	const dot = source.getTokenBefore(flatIdentifer);

	// Location will be:
	//   map(…).flat();
	//                ^
	//   (map(…)).flat();
	//                  ^
	const maybeSemicolon = source.getTokenAfter(nodeFlat);
	const hasSemicolon = Boolean(maybeSemicolon) && maybeSemicolon.value === ';';

	// Location will be:
	//   (map(…)).flat();
	//          ^
	const tokenBetween = source.getLastTokenBetween(nodeMap, dot);

	// Location will be:
	//   map(…).flat();
	//        ^
	//   (map(…)).flat();
	//          ^
	const beforeSemicolon = tokenBetween || nodeMap;

	// Location will be:
	//   map(…).flat();
	//               ^
	//   (map(…)).flat();
	//                 ^
	const fixEnd = nodeFlat.range[1];

	// Location will be:
	//   map(…).flat();
	//         ^
	//   (map(…)).flat();
	//           ^
	const fixStart = dot.range[0];

	const mapProperty = nodeMap.callee.property;

	context.report({
		node: nodeFlat,
		messageId: MESSAGE_ID_FLATMAP,
		* fix(fixer) {
			// Removes:
			//   map(…).flat();
			//         ^^^^^^^
			//   (map(…)).flat();
			//           ^^^^^^^
			yield fixer.removeRange([fixStart, fixEnd]);

			// Renames:
			//   map(…).flat();
			//   ^^^
			//   (map(…)).flat();
			//    ^^^
			yield fixer.replaceText(mapProperty, 'flatMap');

			if (hasSemicolon) {
				// Moves semicolon to:
				//   map(…).flat();
				//         ^
				//   (map(…)).flat();
				//           ^
				yield fixer.insertTextAfter(beforeSemicolon, ';');
				yield fixer.remove(maybeSemicolon);
			}
		}
	});
};

const ignored = ['React.Children', 'Children'];

const create = context => ({
	[selector]: node => {
		if (
			!(
				// `.flat()`
				node.arguments.length === 0 ||
				// `.flat(1)`
				(node.arguments.length === 1 && isLiteralValue(node.arguments[0], 1))
			) ||
			isNodeMatches(node.callee.object.callee.object, ignored)
		) {
			return;
		}

		reportFlatMap(context, node);
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.flatMap(…)` over `.map(…).flat()`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema: [],
		messages
	}
};
