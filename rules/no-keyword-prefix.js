const MESSAGE_ID = 'noKeywordPrefix';
const messages = {
	[MESSAGE_ID]: 'Do not prefix identifiers with keyword `{{keyword}}`.',
};

const prepareOptions = ({
	disallowedPrefixes,
	checkProperties = true,
	onlyCamelCase = true,
} = {}) => ({
	disallowedPrefixes: (disallowedPrefixes || [
		'new',
		'class',
	]),
	checkProperties,
	onlyCamelCase,
});

function findKeywordPrefix(name, options) {
	for (const keyword of options.disallowedPrefixes) {
		if (!name.startsWith(keyword)) {
			continue;
		}

		const nextCharacter = name[keyword.length];
		if (!nextCharacter) {
			continue;
		}

		if (
			!options.onlyCamelCase
			|| (
				nextCharacter >= 'A'
				&& nextCharacter <= 'Z'
			)
		) {
			return keyword;
		}
	}
}

function reportMemberExpression(report, node, options) {
	if (!options.checkProperties) {
		return;
	}

	const {name, parent} = node;
	const keyword = findKeywordPrefix(name, options);

	if (!keyword) {
		return;
	}

	if (
		parent.object.type === 'Identifier'
		&& parent.object.name === name
	) {
		report(node, keyword);
		return;
	}

	// `parent` is always a `MemberExpression` here
	const effectiveParent = parent.parent;

	if (
		effectiveParent.type === 'AssignmentExpression'
		&& (effectiveParent.right.type !== 'MemberExpression' || effectiveParent.left.type === 'MemberExpression')
		&& effectiveParent.left.property.name === name
	) {
		report(node, keyword);
	}
}

function reportObjectPatternAndShouldSkipPropertyCheck(report, node, options, property) {
	const {name} = node;
	const keyword = findKeywordPrefix(name, options);

	if (Boolean(keyword) && property.computed) {
		report(node, keyword);
	}

	// The property name, only the binding is checked here
	if (property.key === node) {
		return true;
	}

	// A same-name binding, like `{newFoo}`, is checked as a property
	if (property.key.name === name) {
		return false;
	}

	// A renamed binding declares a new local variable, that is not a property
	if (keyword) {
		report(node, keyword);
	}

	return true;
}

// Core logic copied from:
// https://github.com/eslint/eslint/blob/master/lib/rules/camelcase.js
const create = context => {
	const options = prepareOptions(context.options[0]);

	// Reported start positions, a shorthand property has a separate node for its key and its value at the same position, and both would otherwise be reported
	const reported = new Set();
	const ALLOWED_PARENT_TYPES = new Set(['CallExpression', 'NewExpression']);

	function report(node, keyword) {
		const [start] = context.sourceCode.getRange(node);
		if (reported.has(start)) {
			return;
		}

		reported.add(start);
		context.report({
			node,
			messageId: MESSAGE_ID,
			data: {
				name: node.name,
				keyword,
			},
		});
	}

	context.on('Identifier', node => {
		const {name, parent} = node;
		const keyword = findKeywordPrefix(name, options);
		const effectiveParent = parent.type === 'MemberExpression' ? parent.parent : parent;

		if (parent.type === 'MemberExpression') {
			reportMemberExpression(report, node, options);
		} else if (
			parent.type === 'Property'
			|| parent.type === 'AssignmentPattern'
		) {
			// `const {newFoo = 1} = object` puts the binding in an `AssignmentPattern` inside the shorthand `Property`. Its right hand side is the default value, a plain reference.
			const property = parent.type === 'AssignmentPattern' && parent.left === node ? parent.parent : parent;
			if (property.type === 'Property' && property.parent.type === 'ObjectPattern') {
				const shouldSkipPropertyCheck = reportObjectPatternAndShouldSkipPropertyCheck(report, node, options, property);
				if (shouldSkipPropertyCheck) {
					return;
				}
			}

			if (
				!options.checkProperties
			) {
				return;
			}

			// Don't check right hand side of AssignmentExpression to prevent duplicate warnings
			if (
				Boolean(keyword)
				&& !ALLOWED_PARENT_TYPES.has(effectiveParent.type)
				&& parent.right !== node
			) {
				report(node, keyword);
			}

			// Check if it's an import specifier
		} else if (
			[
				'ImportSpecifier',
				'ImportNamespaceSpecifier',
				'ImportDefaultSpecifier',
			].includes(parent.type)
		) {
			// Report only if the local imported identifier is invalid
			if (Boolean(keyword) && parent.local?.name === name) {
				report(node, keyword);
			}

			// Report anything that is invalid that isn't a CallExpression
		} else if (
			Boolean(keyword)
			&& !ALLOWED_PARENT_TYPES.has(effectiveParent.type)
		) {
			report(node, keyword);
		}
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			disallowedPrefixes: {
				type: 'array',
				items: {type: 'string'},
				minItems: 0,
				uniqueItems: true,
				description: 'The prefixes to disallow.',
			},
			checkProperties: {
				type: 'boolean',
				description: 'Whether to check property names.',
			},
			onlyCamelCase: {
				type: 'boolean',
				description: 'Whether to only check camelCase names.',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow identifiers starting with `new` or `class`.',
			recommended: false,
		},
		schema,
		defaultOptions: [{}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
