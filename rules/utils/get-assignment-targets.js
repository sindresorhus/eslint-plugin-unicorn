import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

/**
Get the identifiers and member expressions that an assignment target writes, looking through destructuring patterns (`[a, ...b]`, `{a: c.d}`), defaults (`a = 1`), rest elements, and TypeScript expression wrappers.

@param {import('estree').Node} node
@returns {Generator<import('estree').Identifier | import('estree').MemberExpression>}
*/
export default function * getAssignmentTargets(node) {
	node = unwrapTypeScriptExpression(node);

	switch (node.type) {
		case 'Identifier':
		case 'MemberExpression': {
			yield node;
			break;
		}

		case 'AssignmentPattern':
		case 'RestElement': {
			yield * getAssignmentTargets(node.type === 'AssignmentPattern' ? node.left : node.argument);
			break;
		}

		case 'ArrayPattern': {
			for (const element of node.elements) {
				if (element) {
					yield * getAssignmentTargets(element);
				}
			}

			break;
		}

		case 'ObjectPattern': {
			for (const property of node.properties) {
				yield * getAssignmentTargets(property.type === 'Property' ? property.value : property.argument);
			}

			break;
		}

		// No default
	}
}
