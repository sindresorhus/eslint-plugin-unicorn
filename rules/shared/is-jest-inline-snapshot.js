
import {isMethodCall, isCallExpression} from '../ast/index.js';

const isJestInlineSnapshot = node =>
	isMethodCall(node.parent, {
		method: 'toMatchInlineSnapshot',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& node.parent.arguments[0] === node
	&& isCallExpression(node.parent.callee.object, {
		name: 'expect',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	});

export default isJestInlineSnapshot;
