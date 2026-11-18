import {isNewExpression} from '../ast/index.js';
import {isNodeMatchesNameOrPath} from './is-node-matches.js';
import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

/**
Get the first argument of `new URL(path, import.meta.url)`.
*/
export default function getModuleRelativeUrlArgument(node) {
	if (!isNewExpression(node, {name: 'URL', argumentsLength: 2})) {
		return;
	}

	const [resource, base] = node.arguments;
	if (isNodeMatchesNameOrPath(unwrapTypeScriptExpression(base), 'import.meta.url')) {
		return resource;
	}
}
