import {getOutermostChainAndTypeScriptExpression} from './unwrap-typescript-expression.js';

/**
Check whether a node is a reference target, including through optional-chain and TypeScript expression wrappers.
*/
const isLeftHandSide = node => {
	node = getOutermostChainAndTypeScriptExpression(node);

	return (
		(node.parent.type === 'AssignmentExpression' || node.parent.type === 'AssignmentPattern')
		&& node.parent.left === node
	)
	|| (node.parent.type === 'UpdateExpression' && node.parent.argument === node)
	|| (node.parent.type === 'ArrayPattern' && node.parent.elements.includes(node))
	|| (node.parent.type === 'RestElement' && node.parent.argument === node)
	|| (
		(node.parent.type === 'ForOfStatement' || node.parent.type === 'ForInStatement')
		&& node.parent.left === node
	)
	|| (
		node.parent.type === 'Property'
		&& node.parent.value === node
		&& node.parent.parent.type === 'ObjectPattern'
		&& node.parent.parent.properties.includes(node.parent)
	)
	|| (
		node.parent.type === 'UnaryExpression'
		&& node.parent.operator === 'delete'
		&& node.parent.argument === node
	);
};

export default isLeftHandSide;
