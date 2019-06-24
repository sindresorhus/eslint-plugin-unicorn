'use strict';
const getDocsUrl = require('./utils/get-docs-url');
const isMethodNamed = require('./utils/is-method-named');

const MESSAGE_ID_FLATMAP = 'flat-map';
const MESSAGE_ID_SPREAD = 'spread';

const SELECTOR_SPREAD = [
	// [].concat(...bar.map((i) => i))
	// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	'CallExpression',

	// [].concat(...bar.map((i) => i))
	// ^^
	'[callee.object.type="ArrayExpression"]',
	'[callee.object.elements.length=0]',

	// [].concat(...bar.map((i) => i))
	//    ^^^^^^
	'[callee.property.name="concat"]',

	// [].concat(...bar.map((i) => i))
	//           ^^^^^^^^^^^^^^^^^^^^
	'[arguments.0.type="SpreadElement"]',

	// [].concat(...bar.map((i) => i))
	//                  ^^^
	'[arguments.0.argument.callee.property.name="map"]'
].join('');

const reportFlatMap = (context, nodeFlat, nodeMap) => {
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
		fix: fixer => {
			const fixings = [
				// Removes:
				//   map(…).flat();
				//         ^^^^^^^
				//   (map(…)).flat();
				//           ^^^^^^^
				fixer.removeRange([fixStart, fixEnd]),

				// Renames:
				//   map(…).flat();
				//   ^^^
				//   (map(…)).flat();
				//    ^^^
				fixer.replaceText(mapProperty, 'flatMap')
			];

			if (hasSemicolon) {
				// Moves semicolon to:
				//   map(…).flat();
				//         ^
				//   (map(…)).flat();
				//           ^
				fixings.push(fixer.insertTextAfter(beforeSemicolon, ';'));
				fixings.push(fixer.remove(maybeSemicolon));
			}

			return fixings;
		}
	});
};

const create = context => ({
	CallExpression: node => {
		if (!isMethodNamed(node, 'flat')) {
			return;
		}

		if (node.arguments.length > 1) {
			return;
		}

		if (node.arguments.length === 1 && node.arguments[0].type === 'Literal' && node.arguments[0].value !== 1) {
			return;
		}

		const parent = node.callee.object;

		if (!isMethodNamed(parent, 'map')) {
			return;
		}

		reportFlatMap(context, node, parent);
	},
	[SELECTOR_SPREAD]: node => {
		context.report({
			node,
			messageId: MESSAGE_ID_SPREAD
		});
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code',
		messages: {
			[MESSAGE_ID_FLATMAP]: 'Prefer `.flatMap(…)` over `.map(…).flat()`.',
			[MESSAGE_ID_SPREAD]: 'Prefer `.flatMap(…)` over `[].concat(...foo.map(…))`.'
		}
	}
};
