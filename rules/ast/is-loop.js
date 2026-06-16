import loopTypes from './loop-types.js';

export default function isLoop(node) {
	return loopTypes.includes(node.type);
}
