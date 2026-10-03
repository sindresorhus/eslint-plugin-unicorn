import {createBuiltinTypeCheckers} from './type-helpers.js';

const {
	isTarget: isWeakMap,
	isKnownNonTarget: isKnownNonWeakMap,
} = createBuiltinTypeCheckers({
	name: 'WeakMap',
});

export {
	isKnownNonWeakMap,
	isWeakMap,
};
