import hasSameRange from './has-same-range.js';

const isShorthandImportLocal = (node, context) => {
	const {type, local, imported} = node.parent;
	return type === 'ImportSpecifier' && hasSameRange(local, imported, context) && local === node;
};

export default isShorthandImportLocal;
