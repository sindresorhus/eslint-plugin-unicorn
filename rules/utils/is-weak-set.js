import {
	createBuiltinTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const getStaticType = value =>
	value instanceof WeakSet ? target : unknown;

const {
	isTarget: isWeakSet,
	isKnownNonTarget: isKnownNonWeakSet,
} = createBuiltinTypeCheckers({
	name: 'WeakSet',
	getStaticType,
});

export {
	isKnownNonWeakSet,
	isWeakSet,
};
