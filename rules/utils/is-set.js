import {
	createBuiltinTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const getStaticType = value =>
	value instanceof Set ? target : unknown;

const {
	isTarget: isSet,
	isKnownNonTarget: isKnownNonSet,
} = createBuiltinTypeCheckers({
	name: 'Set',
	aliases: ['ReadonlySet'],
	getStaticType,
});

export {
	isKnownNonSet,
	isSet,
};
