import {createBuiltinTypeCheckers} from './type-helpers.js';

const {
	isTarget: isSet,
	isKnownNonTarget: isKnownNonSet,
} = createBuiltinTypeCheckers({
	name: 'Set',
	aliases: ['ReadonlySet'],
});

export {
	isKnownNonSet,
	isSet,
};
