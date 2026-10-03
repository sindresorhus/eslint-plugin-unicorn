import {createBuiltinTypeCheckers} from './type-helpers.js';

const {
	isTarget: isWeakSet,
	isKnownNonTarget: isKnownNonWeakSet,
} = createBuiltinTypeCheckers({
	name: 'WeakSet',
});

export {
	isKnownNonWeakSet,
	isWeakSet,
};
