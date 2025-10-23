import path from 'node:path';
import {fileURLToPath} from 'node:url';

const messageIdError = path.basename(fileURLToPath(import.meta.url), '.js');
const suggestionMemberAccess = 'suggestion/member-access';
const suggestionDestructuringInBody = 'suggestion/destructuring-in-body';
const suggestionDestructuringInParameter = 'suggestion/destructuring-in-parameter';

const fix = (context, variable, functionNode, type) => ({
	* [suggestionMemberAccess](fixer) {
		for (const identifier of variable.identifiers) {
			yield fixer.replaceText(identifier, 'context');
		}

		for (const reference of variable.references.filter(({identifier}) => !variable.identifiers.includes(identifier))) {
			yield fixer.replaceText(reference.identifier, 'context.sourceCode');
		}
	},
	* [suggestionDestructuringInBody](fixer) {
		const {sourceCode} = context;

		for (const identifier of variable.identifiers) {
			yield fixer.replaceText(identifier, 'context');
		}

		const functionBody = functionNode.body;

		if (functionBody.type === 'BlockStatement') {
			yield fixer.insertTextAfter(
				sourceCode.getFirstToken(functionBody),
				'\n\tconst {sourceCode} = context;',
			);
			return;
		}

		yield fixer.insertTextBefore(
			functionBody,
			'{\n\tconst {sourceCode} = context;\n\treturn ',
		);

		yield fixer.insertTextAfter(
			functionBody,
			'}',
		);
	},
	* [suggestionDestructuringInParameter](fixer) {
		for (const identifier of variable.identifiers) {
			yield fixer.replaceText(identifier, '{sourceCode}');
		}
	},
})[type];

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

						const suggestions = [
							suggestionDestructuringInBody,
							suggestionMemberAccess,
							suggestionDestructuringInParameter,
						].filter(Boolean);

						context.report({
							node: parameter,
							messageId: messageIdError,
							suggest: suggestions.map(type => ({
								messageId: type,
								fix: fix(context, variable, functionNode, type),
							})),
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
			[suggestionMemberAccess]: 'Use `context.sourceCode`.',
			[suggestionDestructuringInBody]: 'Add `const {sourceCode} = context;`.',
			[suggestionDestructuringInParameter]: 'Change parameter to `{sourceCode}`.',
		},
	},
};

export default config;
