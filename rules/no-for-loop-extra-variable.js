import {findVariable} from '@eslint-community/eslint-utils';

const MESSAGE_ID = 'no-for-loop-extra-variable';
const messages = {
	[MESSAGE_ID]: 'Do not cache array length in a for-loop initializer.',
};

const isLiteral = (node, value) => node?.type === 'Literal' && node.value === value;
const isIdentifierWithName = (node, name) => node?.type === 'Identifier' && node.name === name;

const getIteratorDeclarator = declarations => declarations.find(({id, init}) =>
	id.type === 'Identifier' && isLiteral(init, 0),
);

const getCachedLengthDeclarator = declarations => declarations.find(({id, init}) =>
	id.type === 'Identifier'
	&& init?.type === 'MemberExpression'
	&& !init.computed
	&& init.object.type === 'Identifier'
	&& init.property.type === 'Identifier'
	&& init.property.name === 'length',
);

const isSupportedTest = (test, iteratorName, cachedVariableName) =>
	test?.type === 'BinaryExpression'
	&& (
		(test.operator === '<'
			&& isIdentifierWithName(test.left, iteratorName)
			&& isIdentifierWithName(test.right, cachedVariableName))
		|| (
			test.operator === '>'
			&& isIdentifierWithName(test.left, cachedVariableName)
			&& isIdentifierWithName(test.right, iteratorName)
		)
	);

const isSupportedUpdate = (update, iteratorName) => {
	if (!update) {
		return false;
	}

	if (update.type === 'UpdateExpression') {
		return update.operator === '++' && isIdentifierWithName(update.argument, iteratorName);
	}

	if (
		update.type === 'AssignmentExpression'
		&& isIdentifierWithName(update.left, iteratorName)
	) {
		if (update.operator === '+=') {
			return isLiteral(update.right, 1);
		}

		if (update.operator === '=' && update.right?.type === 'BinaryExpression' && update.right.operator === '+') {
			return (
				isIdentifierWithName(update.right.left, iteratorName) && isLiteral(update.right.right, 1)
			) || (
				isLiteral(update.right.left, 1) && isIdentifierWithName(update.right.right, iteratorName)
			);
		}
	}

	return false;
};

const nodeContains = (ancestor, descendant) => {
	while (descendant) {
		if (descendant === ancestor) {
			return true;
		}

		descendant = descendant.parent;
	}

	return false;
};

const getVariable = (sourceCode, node, name) => {
	for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
		const variable = findVariable(scope, name);

		if (variable) {
			return variable;
		}
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ForStatement', node => {
		const {init, test, update} = node;

		if (
			!init
			|| init.type !== 'VariableDeclaration'
			|| !['let', 'var'].includes(init.kind)
			|| init.declarations.length !== 2
		) {
			return;
		}

		const iteratorDeclarator = getIteratorDeclarator(init.declarations);
		const cachedLengthDeclarator = getCachedLengthDeclarator(init.declarations);

		if (!iteratorDeclarator || !cachedLengthDeclarator || iteratorDeclarator === cachedLengthDeclarator) {
			return;
		}

		const iteratorName = iteratorDeclarator.id.name;
		const cachedVariableName = cachedLengthDeclarator.id.name;

		if (!isSupportedTest(test, iteratorName, cachedVariableName) || !isSupportedUpdate(update, iteratorName)) {
			return;
		}

		const cachedVariable = getVariable(sourceCode, node, cachedVariableName);

		if (!cachedVariable) {
			return;
		}

		const references = cachedVariable.references.filter(reference => reference.identifier !== cachedLengthDeclarator.id);

		if (
			references.length === 0
			|| references.some(reference =>
				reference.isWrite()
				|| !nodeContains(node, reference.identifier))
		) {
			return;
		}

		const replacementInit = `${init.kind} ${sourceCode.getText(iteratorDeclarator)}`;
		const arrayLengthText = sourceCode.getText(cachedLengthDeclarator.init);

		return {
			loc: sourceCode.getLoc(init),
			messageId: MESSAGE_ID,
			fix: fixer => [
				fixer.replaceText(init, replacementInit),
				...references.map(reference => fixer.replaceText(reference.identifier, arrayLengthText)),
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow cached array length variables in `for` loop initializers.',
			recommended: false,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
