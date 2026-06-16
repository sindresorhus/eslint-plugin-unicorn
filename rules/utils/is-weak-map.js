import {
	createBuiltinTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const getStaticType = value =>
	value instanceof WeakMap ? target : unknown;

const {
	isTarget: isWeakMap,
	isKnownNonTarget: isKnownNonWeakMap,
} = createBuiltinTypeCheckers({
	name: 'WeakMap',
	getStaticType,
});

export {
	isKnownNonWeakMap,
	isWeakMap,
};
