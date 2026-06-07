import jsesc from 'jsesc';
import {isStringLiteral, isDirective} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import isJestInlineSnapshot from './shared/is-jest-inline-snapshot.js';

const MESSAGE_ID = 'prefer-string-repeat';
const messages = {
	[MESSAGE_ID]: 'Use `String#repeat()` for repeated whitespace.',
};

const singleWhitespace = /^\s$/u;

function quoteWhitespace(character) {
	return jsesc(character, {
		quotes: 'single',
		wrap: true,
		es6: true,
		minimal: false,
		lowercaseHex: false,
		json: true,
	});
}

function getRepeatedWhitespace(value, minimumRepetitions) {
	const characters = [...value];
	if (characters.length < minimumRepetitions) {
		return;
	}

	const [character] = characters;
	if (!singleWhitespace.test(character)) {
		return;
	}

	if (characters.every(element => element === character)) {
		return {
			character,
			count: characters.length,
		};
	}
}

// eslint-disable-next-line complexity
function isRestrictedReplacement(node) {
	const {parent} = node;
	const {type} = parent;

	return (
		isDirective(parent)
		|| (
			[
				'Property',
				'PropertyDefinition',
				'MethodDefinition',
				'AccessorProperty',
			].includes(type)
			&& !parent.computed && parent.key === node
		)
		|| (
			[
				'TSAbstractPropertyDefinition',
				'TSAbstractMethodDefinition',
				'TSAbstractAccessorProperty',
				'TSPropertySignature',
				'TSMethodSignature',
			].includes(type)
			&& parent.key === node
		)
		|| (
			[
				'ImportDeclaration',
				'ExportNamedDeclaration',
				'ExportAllDeclaration',
			].includes(type)
			&& parent.source === node
		)
		|| (type === 'ImportAttribute' && (parent.key === node || parent.value === node))
		|| (type === 'ImportSpecifier' && parent.imported === node)
		|| (type === 'ExportSpecifier' && (parent.local === node || parent.exported === node))
		|| (type === 'ExportAllDeclaration' && parent.exported === node)
		|| (type === 'JSXAttribute' && parent.value === node)
		|| (type === 'TSEnumMember' && (parent.initializer === node || parent.id === node))
		|| (type === 'TSModuleDeclaration' && parent.id === node)
		|| (type === 'TSExternalModuleReference' && parent.expression === node)
		|| (type === 'TSLiteralType' && parent.literal === node)
		|| (type === 'TSImportType' && parent.source === node)
	);
}

function getProblem(node, value, context, minimumRepetitions) {
	const repeatedWhitespace = getRepeatedWhitespace(value, minimumRepetitions);
	if (!repeatedWhitespace) {
		return;
	}

	const replacement = `${quoteWhitespace(repeatedWhitespace.character)}.repeat(${repeatedWhitespace.count})`;

	return {
		node,
		messageId: MESSAGE_ID,
		* fix(fixer) {
			yield fixSpaceAroundKeyword(fixer, node, context);
			yield fixer.replaceText(node, replacement);
		},
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {minimumRepetitions} = context.options[0];

	context.on('Literal', node => {
		if (!isStringLiteral(node) || isRestrictedReplacement(node) || isJestInlineSnapshot(node)) {
			return;
		}

		return getProblem(node, node.value, context, minimumRepetitions);
	});

	context.on('TemplateLiteral', node => {
		if (
			node.parent.type === 'TaggedTemplateExpression'
			|| node.expressions.length > 0
			|| isRestrictedReplacement(node)
			|| isJestInlineSnapshot(node)
		) {
			return;
		}

		const [{value}] = node.quasis;
		if (typeof value.cooked !== 'string') {
			return;
		}

		return getProblem(node, value.cooked, context, minimumRepetitions);
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			minimumRepetitions: {
				type: 'integer',
				minimum: 2,
				description: 'The minimum number of repeated whitespace characters before `String#repeat()` is enforced.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#repeat()` for repeated whitespace.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [
			{
				minimumRepetitions: 3,
			},
		],
		messages,
	},
};

export default config;
