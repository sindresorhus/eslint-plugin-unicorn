'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID = 'preferFlatMap';

const isFlat = node => {
	return (
		node.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === 'flat'
	);
};

const isMap = node => {
	return (
		node.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === 'map'
	);
};

const report = (context, nodeFlat, nodeMap) => {
	const source = context.getSourceCode();

	// Node covers:
	//   map(...).flat();
	//            ^^^^
	//   (map(...)).flat();
	//              ^^^^
	const flatIdentifer = nodeFlat.callee.property;

	// Location will be:
	//   map(...).flat();
	//           ^
	//   (map(...)).flat();
	//             ^
	const dot = source.getTokenBefore(flatIdentifer);

	// Location will be:
	//   map(...).flat();
	//                  ^
	//   (map(...)).flat();
	//                    ^
	const maybeSemicolon = source.getTokenAfter(nodeFlat);
	const hasSemicolon = Boolean(maybeSemicolon) && maybeSemicolon.value === ';';

	// Location will be:
	//   (map(...)).flat();
	//            ^
	const tokenBetween = source.getLastTokenBetween(nodeMap, dot);

	// Location will be:
	//   map(...).flat();
	//          ^
	//   (map(...)).flat();
	//            ^
	const beforeSemicolon = tokenBetween || nodeMap;

	// Location will be:
	//   map(...).flat();
	//                 ^
	//   (map(...)).flat();
	//                   ^
	const fixEnd = nodeFlat.end;

	// Location will be:
	//   map(...).flat();
	//           ^
	//   (map(...)).flat();
	//             ^
	const fixStart = dot.start;

	const mapProperty = nodeMap.callee.property;

	context.report({
		node: nodeFlat,
		messageId: MESSAGE_ID,
		fix: fixer => {
			const fixings = [
				// Removes:
				//   map(...).flat();
				//           ^^^^^^^
				//   (map(...)).flat();
				//             ^^^^^^^
				fixer.removeRange([fixStart, fixEnd]),

				// Renames:
				//   map(...).flat();
				//   ^^^
				//   (map(...)).flat();
				//    ^^^
				fixer.replaceText(mapProperty, 'flatMap')
			];

			if (hasSemicolon) {
				// Moves semicolon to:
				//   map(...).flat();
				//           ^
				//   (map(...)).flat();
				//             ^
				fixings.push(fixer.insertTextAfter(beforeSemicolon, ';'));
				fixings.push(fixer.remove(maybeSemicolon));
			}

			return fixings;
		}
	});
};

const create = context => ({
	CallExpression: node => {
		if (!isFlat(node)) {
			return;
		}

		const parent = node.callee.object;

		if (!isMap(parent)) {
			return;
		}

		report(context, node, parent);
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
			[MESSAGE_ID]: 'Prefer `.flatMap()` over `.map(...).flat()`.'
		}
	}
};
