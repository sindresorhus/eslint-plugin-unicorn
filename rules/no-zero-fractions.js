'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MSG_ZERO_FRACTION = 'Zero fraction in number.';
const MSG_DANGLING_DOT = 'Dangling dot in number.';

// Groups:
// 1 - integer part
// 2 - dangling dot or dot with zeroes
// 3 - dot with digits except last zeroes
// 4 - scientific notation
const RE_DANGLINGDOT_OR_ZERO_FRACTIONS = /^([+-]?[0-9]*)(?:(\.0*)|(\.[0-9]*[1-9])0+)(e[+-]?[0-9]+)?$/;

const create = context => {
	return {
		Literal: node => {
			if (typeof node.value === 'number'){
				const m = RE_DANGLINGDOT_OR_ZERO_FRACTIONS.exec(node.raw);
				if(m !== null){
					const isDanglingDot = m[2] === '.';
					context.report({
						node,
						message: isDanglingDot ? MSG_DANGLING_DOT : MSG_ZERO_FRACTION,
						fix: fixer => {
							let wantedStr = (m[2] === undefined) ? m[1]+m[3] : m[1];
							if(m[4] !== undefined){
								wantedStr+= m[4];
							}
							return fixer.replaceText(node, wantedStr);
						}
					});
				}
			}
		}
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
