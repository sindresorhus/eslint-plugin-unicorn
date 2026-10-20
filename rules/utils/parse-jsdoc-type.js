// eslint-disable-next-line @stylistic/max-len
const tokenPattern = /\s+|=>|\.\.\.|[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*|(?:0[Xx][\dA-Fa-f](?:_?[\dA-Fa-f])*|0[Bb][01](?:_?[01])*|0[Oo][0-7](?:_?[0-7])*|(?:0|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?(?:[Ee][+\-]?\d(?:_?\d)*)?|\.\d(?:_?\d)*(?:[Ee][+\-]?\d(?:_?\d)*)?)n?|"(?:\\[^\n\r]|[^\n\r"\\])*"|'(?:\\[^\n\r]|[^\n\r'\\])*'|./gsv;
const identifierPattern = /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/v;
const aliases = new Map([['Boolean', 'boolean'], ['String', 'string'], ['Number', 'number']]);
const reservedNames = new Set(['import', 'typeof', 'extends', 'new']);
const unsupportedNames = new Set([...reservedNames, 'keyof', 'infer', 'asserts', 'is', 'readonly']);
const unknownNames = new Set(['any', 'unknown', 'never']);
const primitiveNames = new Set(['boolean', 'string', 'number', 'bigint', 'symbol', 'void', 'null', 'undefined', 'true', 'false', ...aliases.keys(), ...unknownNames]);
const closingTokens = new Map([['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']]);
const unknown = {kind: 'unknown'};
const array = {kind: 'name', name: 'Array'};
const nonPrimitive = {kind: 'non-primitive'};
const primitiveTypes = new Map([...primitiveNames].map(name => {
	if (unknownNames.has(name)) {
		return [name, unknown];
	}

	if (name === 'null' || name === 'undefined') {
		return [name, {kind: 'nullish', name}];
	}

	return [name, {kind: 'name', name: ['true', 'false'].includes(name) ? 'boolean' : aliases.get(name) ?? name}];
}));

const isNumericLiteralToken = token => /^(?:\d|\.\d)/v.test(token ?? '')
	&& (!token.endsWith('n') || /^0[box]/iv.test(token) || !/[.e]/iv.test(token));

function hasValidStringEscapes(token) {
	for (const match of token.matchAll(/\\(.)/gv)) {
		const following = token.slice(match.index + 2, -1);
		if (match[1] === 'x' && !/^[\da-f]{2}/iv.test(following)) {
			return false;
		}

		if (match[1] === 'u') {
			const codePoint = /^\{([\da-f]{1,6})\}/iv.exec(following);
			if (!/^[\da-f]{4}/iv.test(following) && (!codePoint || Number.parseInt(codePoint[1], 16) > 0x10_FF_FF)) {
				return false;
			}
		}
	}

	return true;
}

/**
Read the type facts needed by rules. Unsupported or malformed syntax stays unknown, including when nested inside a supported container.
*/
function parseJSDocumentType(text) {
	const trimmed = text.trim();
	const primitiveType = primitiveTypes.get(trimmed);
	if (primitiveType) {
		return primitiveType;
	}

	if (identifierPattern.test(trimmed)) {
		return unsupportedNames.has(trimmed) ? unknown : {kind: 'name', name: trimmed};
	}

	const tokens = [];
	const lineBreaks = new Set();
	for (const match of text.matchAll(tokenPattern)) {
		const token = match[0];
		if (/^["']/v.test(token) && (token.length === 1 || !hasValidStringEscapes(token))) {
			return unknown;
		}

		if (!/^\s/v.test(token)) {
			tokens.push(token);
		} else if (/[\n\r\u{2028}\u{2029}]/v.test(token)) {
			lineBreaks.add(tokens.length);
		}
	}

	const parenthesisCloses = new Map();
	const openings = [];
	for (const [index, token] of tokens.entries()) {
		if (closingTokens.has(token)) {
			openings.push(index);
		} else if ([')', ']', '}', '>'].includes(token)) {
			const opening = openings.pop();
			if (closingTokens.get(tokens[opening]) !== token) {
				return unknown;
			}

			if (tokens[opening] === '(') {
				parenthesisCloses.set(opening, index);
			}
		}
	}

	if (openings.length > 0) {
		return unknown;
	}

	let index = 0;

	function consume(token) {
		if (tokens[index] === token) {
			index++;
			return true;
		}

		return false;
	}

	function expect(token) {
		if (!consume(token)) {
			throw new SyntaxError('Unsupported JSDoc type');
		}
	}

	function parseUnion() {
		consume('|');
		return parseCombined('|', 'union', parseIntersection);
	}

	function parseIntersection() {
		consume('&');
		return parseCombined('&', 'intersection', parsePostfix);
	}

	function parseCombined(separator, kind, parseMember) {
		const elements = [parseMember()];
		while (consume(separator)) {
			elements.push(parseMember());
		}

		return elements.length === 1 ? elements[0] : {kind, elements};
	}

	function parsePostfix() {
		let type;
		if (consume('?')) {
			if (tokens[index] === '?' || tokens[index] === '!') {
				throw new SyntaxError('Unsupported JSDoc type');
			}

			type = tokens[index] === undefined || [')', '>', ']', '}', ',', ';', '|', '&'].includes(tokens[index])
				? unknown
				: {kind: 'nullable', element: parsePostfix()};
		} else if (consume('!')) {
			if (tokens[index] === '!') {
				throw new SyntaxError('Unsupported JSDoc type');
			}

			type = parsePostfix();
		} else if (consume('...')) {
			parsePostfix();
			type = nonPrimitive;
		} else if (consume('readonly')) {
			type = parsePostfix();
			if (type.kind !== 'name' || !['Array', 'ReadonlyArray'].includes(type.name)) {
				throw new SyntaxError('Unsupported JSDoc type');
			}
		} else {
			type = parsePrimary();
		}

		while (tokens[index] === '[' && tokens[index + 1] === ']') {
			index += 2;
			type = array;
		}

		if (consume('?')) {
			return {kind: 'nullable', element: type};
		}

		if (consume('=')) {
			return {kind: 'optional', element: type};
		}

		consume('!');
		return type;
	}

	function parseList(opening, closing, parseMember) {
		expect(opening);
		if (consume(closing)) {
			return;
		}

		while (true) {
			parseMember();
			if (consume(closing)) {
				return;
			}

			expect(',');
			if (consume(closing)) {
				return;
			}
		}
	}

	function parseArrowParameter() {
		consume('...');
		if (!identifierPattern.test(tokens[index] ?? '') || reservedNames.has(tokens[index])) {
			throw new SyntaxError('Unsupported JSDoc parameter');
		}

		index++;
		consume('?');
		if (consume(':')) {
			parseUnion();
		}
	}

	function parseFunctionParameter() {
		if (tokens[index] === 'this' && tokens[index + 1] === ':') {
			index += 2;
		}

		parseUnion();
	}

	function parseTupleMember() {
		const nameIndex = index + (tokens[index] === '...' ? 1 : 0);
		const colonIndex = nameIndex + (tokens[nameIndex + 1] === '?' ? 2 : 1);
		if (identifierPattern.test(tokens[nameIndex] ?? '') && tokens[colonIndex] === ':') {
			index = colonIndex + 1;
		}

		parseUnion();
	}

	function parseRecord() {
		expect('{');
		if (consume('}')) {
			return unknown;
		}

		while (!consume('}')) {
			if (tokens[index] === 'readonly' && ![':', '?', ',', ';', '}'].includes(tokens[index + 1])) {
				index++;
			}

			if (consume('[')) {
				if (!identifierPattern.test(tokens[index++] ?? '')) {
					throw new SyntaxError('Unsupported JSDoc index signature');
				}

				expect(':');
				parseUnion();
				expect(']');
				expect(':');
				parseUnion();
			} else {
				const key = tokens[index++];
				if (!identifierPattern.test(key ?? '') && !/^["']/v.test(key ?? '') && !isNumericLiteralToken(key)) {
					throw new SyntaxError('Unsupported JSDoc property');
				}

				consume('?');
				if (tokens[index] === '(') {
					parseList('(', ')', parseArrowParameter);
				}

				if (consume(':')) {
					parseUnion();
				}
			}

			if (!consume(',') && !consume(';') && tokens[index] !== '}' && !lineBreaks.has(index)) {
				throw new SyntaxError('Unsupported JSDoc property');
			}
		}

		return nonPrimitive;
	}

	function parsePrimary() {
		const token = tokens[index];
		if (token === '(') {
			if (tokens[parenthesisCloses.get(index) + 1] === '=>') {
				parseList('(', ')', parseArrowParameter);
				expect('=>');
				return {kind: 'function', returnType: parseUnion()};
			}

			index++;
			const type = parseUnion();
			expect(')');
			return type;
		}

		if (token === '[') {
			parseList('[', ']', parseTupleMember);
			return array;
		}

		if (token === '{') {
			return parseRecord();
		}

		if (token === 'function' && tokens[index + 1] === '(') {
			index++;
			parseList('(', ')', parseFunctionParameter);
			return {kind: 'function', returnType: consume(':') ? parseUnion() : unknown};
		}

		if (token === '*') {
			index++;
			return unknown;
		}

		if (/^["']/v.test(token ?? '')) {
			index++;
			return {kind: 'name', name: 'string'};
		}

		if (token === '-' || /^(?:\d|\.\d)/v.test(token ?? '')) {
			consume('-');
			const literal = tokens[index++];
			if (!isNumericLiteralToken(literal)) {
				throw new SyntaxError('Unsupported JSDoc literal');
			}

			return {kind: 'name', name: literal.endsWith('n') ? 'bigint' : 'number'};
		}

		return parseNamedType();
	}

	function parseNamedType() {
		const token = tokens[index];
		if (!identifierPattern.test(token ?? '') || unsupportedNames.has(token)) {
			throw new SyntaxError('Unsupported JSDoc type');
		}

		let name = tokens[index++];
		while (consume('.')) {
			if (tokens[index] === '<') {
				break;
			}

			if (!identifierPattern.test(tokens[index] ?? '')) {
				throw new SyntaxError('Unsupported JSDoc type name');
			}

			name += `.${tokens[index++]}`;
		}

		if (tokens[index] === '<') {
			if (tokens[index + 1] === '>' || primitiveNames.has(name)) {
				throw new SyntaxError('Unsupported JSDoc generic');
			}

			parseList('<', '>', parseUnion);
		}

		return primitiveTypes.get(name) ?? {kind: 'name', name};
	}

	try {
		const type = parseUnion();
		return index === tokens.length ? type : unknown;
	} catch {
		return unknown;
	}
}

export {parseJSDocumentType};
