import {
	createTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const domNodeTypeNames = new Set([
	'CharacterData',
	'Document',
	'DocumentFragment',
	'Element',
	'HTMLElement',
	'Node',
	'SVGElement',
	'Text',
]);

const keyboardEventTypeNames = new Set([
	'KeyboardEvent',
	'React.KeyboardEvent',
]);

const keyboardEventNonTargetTypeNames = new Set([
	'Event',
	'MouseEvent',
	'PointerEvent',
	'React.MouseEvent',
	'React.PointerEvent',
]);

const getStaticDomNodeType = value => {
	const {Node} = globalThis;
	return typeof Node === 'function' && value instanceof Node ? target : unknown;
};

const {
	isKnownNonTarget: isKnownNonDomNode,
} = createTypeCheckers({
	targetTypeNames: domNodeTypeNames,
	getStaticType: getStaticDomNodeType,
});

const {
	isKnownNonTarget: isKnownNonKeyboardEvent,
} = createTypeCheckers({
	targetTypeNames: keyboardEventTypeNames,
	nonTargetTypeNames: keyboardEventNonTargetTypeNames,
});

export {
	isKnownNonDomNode,
	isKnownNonKeyboardEvent,
};
