'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const keyCodeToKey = (() => {
	// While there is no definitive list of key-keyCode pairs working in all browsers, this list could be extended(probably)
	const specialKeyToKeyCode = {
		Backspace: 8,
		Tab: 9,
		Clear: 12,
		Enter: 13,
		Shift: 16,
		Control: 17,
		Alt: 18,
		Pause: 19,
		CapsLock: 20,
		HangulMode: 21,
		HanjaMode: 25,
		Escape: 27,
		' ': 32,
		PageUp: 33,
		PageDown: 34,
		End: 35,
		Home: 36,
		ArrowLeft: 37,
		ArrowUp: 38,
		ArrowRight: 39,
		ArrowDown: 40,
		PrintScreen: 42,
		Insert: 45,
		Delete: 46,
		Meta: 91,
		ContextMenu: 93,
		BrowserSearch: 170,
		AudioVolumeDown: 174,
		AudioVolumeUp: 175,
		AudioVolumeMute: 173,
		MediaTrackNext: 176,
		MediaTrackPrevious: 177,
		MediaPlayPause: 179,
		';': 186,
		'=': 187,
		',': 188,
		'-': 189,
		'.': 190,
		'/': 191,
		'`': 192,
		BrightnessDown: 216,
		BrightnessUp: 217,
		'[': 219,
		']': 221,
		'\\\\': 220,
		'\\\'': 222,
		HiraganaKatakana: 242,
		KanjiMode: 244
	};

	const map = {};

	for (const key of Object.keys(specialKeyToKeyCode)) {
		map[specialKeyToKeyCode[key]] = key;
	}

	for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
		map[i] = String.fromCharCode(i).toLowerCase();
	}

	for (let i = '0'.charCodeAt(0); i <= '9'.charCodeAt(0); i++) {
		map[i] = String.fromCharCode(i);
	}

	for (let i = 1; i <= 12; i++) {
		map[111 + i] = `F${i}`;
	}

	return map;
})();

function tryGetBinopTo(node, operators, comparisonOf) {
	if (node.type === 'BinaryExpression' && operators.includes(node.operator)) {
		return (node.left === comparisonOf) ? node.right : node.left;
	}

	return null;
}

function isMemberProperty(node, name) {
	return node.type === 'MemberExpression' && node.property.name === name;
}

function isMemberCall(node, name) {
	return node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === name;
}

const create = context => {
	function checkParameter(node, variable) {
		variable.references.forEach(reference => {
			const {identifier} = reference;
			if (isMemberProperty(identifier.parent, 'keyCode')) {
				const memberExpression = identifier.parent;
				const comparisonTo = tryGetBinopTo(memberExpression.parent, ['==', '===', '!=', '!=='], memberExpression);

				if (comparisonTo !== null && comparisonTo.type === 'Literal' && typeof comparisonTo.value === 'number') {
					const parentText = context.getSourceCode().getText(memberExpression.object);

					const report = {
						node: memberExpression,
						message: `Prefer \`${parentText}.key\` over \`${parentText}.keyCode\``
					};

					const key = keyCodeToKey[comparisonTo.value];
					if (key !== undefined) {
						report.fix = fixer => [fixer.replaceText(comparisonTo, `'${key}'`), fixer.replaceText(memberExpression.property, 'key')];
					}

					context.report(report);
				}
			}
		});
	}

	function checkFunction(node) {
		if (isMemberCall(node.parent, 'addEventListener') || isMemberCall(node.parent, 'on')) {
			context.getDeclaredVariables(node).forEach(variable => {
				if (variable.defs[0].type === 'Parameter') {
					checkParameter(node, variable);
					return false;
				}
			});
		}
	}

	return {
		'FunctionExpression:exit': checkFunction,
		'ArrowFunctionExpression:exit': checkFunction
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
