import {isExpressionStatement} from '../ast/index.js';

// A sequence expression discards the value of every element but the last one, and the last element hands the sequence's value on to whatever comes next.
const isDiscardedBySequence = node => {
	const {parent} = node;
	return parent.type === 'SequenceExpression'
		&& (parent.expressions.at(-1) !== node || isValueNotUsable(parent));
};

function isValueNotUsable(node) {
	return isExpressionStatement(node.parent) || isDiscardedBySequence(node);
}

export default isValueNotUsable;
