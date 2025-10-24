import hasSameRange from './has-same-range.js';

const isShorthandExportLocal = (node, context) => {
	const {type, local, exported} = node.parent;
	return type === 'ExportSpecifier' && hasSameRange(local, exported, context) && local === node;
};

export default isShorthandExportLocal;
