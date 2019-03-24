'use strict';

const cleanRegexp = require('clean-regexp');

const {parse, generate, optimize} = require('regexp-tree');

const getDocsUrl = require('./utils/get-docs-url');

const message = 'Use regex shorthands to improve readability.';

const create = context => {
	const sourceCode = context.getSourceCode();
	const options = context.options[0] || [
		'charClassToMeta', // [0-9] -> [\d]
		'charClassToSingleChar' // [\d] -> \d
	];

	return {
		'NewExpression[callee.name="RegExp"]': node => {
			const args = node.arguments;

			if (args.length === 0 || args[0].type !== 'Literal') {
				return;
			}

			const hasRegExp = args[0].regex;

			let oldPattern = null;
			let flags = null;

			if (hasRegExp) {
				oldPattern = args[0].regex.pattern;
				flags = args[1] && args[1].type === 'Literal' ? args[1].value : args[0].regex.flags;
				return;
			} else {
				oldPattern = args[0].value;
				flags = args[1] && args[1].type === 'Literal' ? args[1].value : '';
			}

			const newPattern = cleanRegexp(oldPattern, flags);

			if (oldPattern !== newPattern) {
				let fixed;
				if (hasRegExp) {
					fixed = `/${newPattern}/`;
				} else {
					// Escape backslash and apostrophe because we wrap the result in single quotes.
					fixed = (newPattern || '').replace(/\\/, '\\\\');
					fixed = fixed.replace(/'/, '\'');
					fixed = `'${fixed}'`;
				}

				context.report({
					node,
					message,
					fix: fixer => fixer.replaceTextRange(args[0].range, fixed)
				});
			}
		},
		'Literal[regex]': node => {
			const {type, value} = sourceCode.getFirstToken(node);

			let parsedSource;
			try {
				parsedSource = parse(value);
			} catch ({message}) {
				context.report({
					node,
					message: '{{original}} can\'t be parsed: {{message}}',
					data: {
						original: value,
						message
					}
				});

				return;
			}

			const originalRegex = generate(parsedSource).toString();
			const optimizedRegex = optimize(value, options).toString();

			if (originalRegex === optimizedRegex) {
				return;
			}

			context.report({
				node,
				message,
				fix(fixer) {
					return fixer.replaceText(node, optimizedRegex);
				}
			});
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
