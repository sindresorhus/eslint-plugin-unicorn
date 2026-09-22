import {decodeHTMLAttribute} from 'entities';

const maximumNamedHtmlCharacterReferenceLength = 64;
const decimalDigitPattern = /^\d$/u;
const hexadecimalDigitPattern = /^[\da-f]$/iu;
const isSrcsetWhitespace = character => /^[\t\n\f\r ]$/u.test(character);

function getNumericCharacterReferenceEnd(value, index) {
	let end = index + 2;
	const isHexadecimal = value[end]?.toLowerCase() === 'x';
	const digitPattern = isHexadecimal
		? hexadecimalDigitPattern
		: decimalDigitPattern;

	if (isHexadecimal) {
		end++;
	}

	const digitStart = end;
	while (digitPattern.test(value[end])) {
		end++;
	}

	if (end === digitStart) {
		return;
	}

	return value[end] === ';' ? end + 1 : end;
}

function getSrcsetCharacter(value, index) {
	if (value[index] !== '&') {
		return {
			value: value[index],
			end: index + 1,
		};
	}

	let end;
	if (value[index + 1] === '#') {
		end = getNumericCharacterReferenceEnd(value, index);
	} else {
		const possibleCharacterReference = value.slice(index, index + maximumNamedHtmlCharacterReferenceLength);
		const semicolonIndex = possibleCharacterReference.indexOf(';');
		end = semicolonIndex === -1 ? undefined : index + semicolonIndex + 1;
	}

	if (end === undefined) {
		return {
			value: value[index],
			end: index + 1,
		};
	}

	const source = value.slice(index, end);
	const decodedValue = decodeHTMLAttribute(source);
	if (decodedValue === source) {
		return {
			value: value[index],
			end: index + 1,
		};
	}

	return {
		value: decodedValue,
		end,
	};
}

function skipSrcsetSeparators(value, index) {
	while (index < value.length) {
		const character = getSrcsetCharacter(value, index);
		if (character.value !== ',' && !isSrcsetWhitespace(character.value)) {
			return index;
		}

		index = character.end;
	}

	return value.length;
}

function getSrcsetCandidate(value, index) {
	let end = index;
	let trailingCommaStart;

	while (index < value.length) {
		const character = getSrcsetCharacter(value, index);
		if (isSrcsetWhitespace(character.value)) {
			return {
				end: trailingCommaStart ?? end,
				next: index,
				hasTrailingComma: trailingCommaStart !== undefined,
			};
		}

		if (character.value === ',') {
			trailingCommaStart ??= index;
		} else {
			trailingCommaStart = undefined;
		}

		end = character.end;
		index = character.end;
	}

	return {
		end: trailingCommaStart ?? end,
		next: index,
		hasTrailingComma: trailingCommaStart !== undefined,
	};
}

function getNextSrcsetCandidateStart(value, index) {
	let parenthesisDepth = 0;

	while (index < value.length) {
		const character = getSrcsetCharacter(value, index);
		index = character.end;

		if (character.value === '(') {
			parenthesisDepth++;
		} else if (character.value === ')' && parenthesisDepth > 0) {
			parenthesisDepth--;
		} else if (character.value === ',' && parenthesisDepth === 0) {
			return index;
		}
	}

	return value.length;
}

export default function getSrcsetCandidates(value) {
	const candidates = [];
	let index = 0;

	while (index < value.length) {
		index = skipSrcsetSeparators(value, index);
		const start = index;
		const candidate = getSrcsetCandidate(value, index);

		if (candidate.end > start) {
			candidates.push({
				value: value.slice(start, candidate.end),
				offsets: [start, candidate.end],
			});
		}

		index = candidate.hasTrailingComma
			? candidate.next
			: getNextSrcsetCandidateStart(value, candidate.next);
	}

	return candidates;
}
