import path from 'node:path';
import {fileURLToPath} from 'node:url';

const messageIdError = path.basename(fileURLToPath(import.meta.url), '.js');
const messageIdSuggestion = `${messageIdError}/suggestion`;

function * renameParameter(context, fixer, variable) {
	const {sourceCode} = context;

	for (const identifier of variable.identifiers) {
		yield fixer.replaceText(identifier, 'context');
	}

	for (const reference of variable.references.filter(({identifier}) => !variable.identifiers.includes(identifier))) {
		yield fixer.replaceText(reference.identifier, 'context.sourceCode');
	}
}

const config = {
	create(context) {
		return {
			':function'(functionNode) {
				for (let parameter of functionNode.params) {
					if (parameter.type === 'AssignmentPattern') {
						parameter = parameter.left;
					}

					if (parameter.type === 'Identifier' && parameter.name === 'sourceCode') {
						const variable = context.sourceCode.getDeclaredVariables(functionNode)
							.find(variable => variable.defs.length === 1 && variable.defs[0].name === parameter);
						const fix = fixer => renameParameter(context, fixer, variable);

						context.report({
							node: parameter,
							messageId: messageIdError,
							suggest: [
								{
									messageId: messageIdSuggestion,
									fix,
								},
							],
						});
					}
				}
			},
		};
	},
	meta: {
		fixable: 'code',
		hasSuggestions: true,
		messages: {
			[messageIdError]: 'Accept `context` instead of `sourceCode` in utilities.',
			[messageIdSuggestion]: 'Switch to `context`.',
		},
	},
};

export default config;
