const isUndefined = node => node?.type === 'Identifier' && node.name === 'undefined';

// `void anything` always evaluates to `undefined`
const isUndefinedValue = node => isUndefined(node)
	|| (node?.type === 'UnaryExpression' && node.operator === 'void');

export default isUndefined;
export {isUndefinedValue};
