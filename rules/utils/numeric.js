'use strict';

// Determine whether this node is a decimal integer literal.
// Copied from https://github.com/eslint/eslint/blob/cc4871369645c3409dc56ded7a555af8a9f63d51/lib/rules/utils/ast-utils.js#L1237
const DECIMAL_INTEGER_PATTERN = /^(?:0|0[0-7]*[89]\d*|[1-9](?:_?\d)*)$/u;
const isDecimalInteger = node => isNumber(node) && DECIMAL_INTEGER_PATTERN.test(node.raw);

const isNumber = node => typeof node.value === 'number';
const isBigInt = node => Boolean(node.bigint);
const isNumberic = node => isNumber(node) || isBigInt(node);
const isLegacyOctal = node => isNumber(node) && /^0\d+$/.test(node.raw);

function getPrefix(text) {
	let prefix = '';
	let data = text;

	if (/^0[box]/i.test(text)) {
		prefix = text.slice(0, 2);
		data = text.slice(2);
	}

	return {prefix, data};
}

function parseNumber(text) {
	const {
		number,
		mark = '',
		sign = '',
		power = ''
	} = text.match(/^(?<number>.*?)(?:(?<mark>e)(?<sign>[+-])?(?<power>\d+))?$/i).groups;

	return {number, mark, sign, power};
}

function parseFloat(text) {
	const parts = text.split('.');
	const [integer, fractional = ''] = parts;
	const dot = parts.length === 2 ? '.' : '';

	return {integer, dot, fractional};
}

module.exports = {isNumber, isBigInt, isNumberic, isLegacyOctal, getPrefix, parseNumber, parseFloat, isDecimalInteger};
