import getIndentString from './utils/get-indent-string.js';

const MESSAGE_ID = 'no-undeclared-class-members';
const MESSAGE_ID_SUGGESTION = 'no-undeclared-class-members/suggestion';
const messages = {
	[MESSAGE_ID]: 'Class member `{{name}}` is used but not declared.',
	[MESSAGE_ID_SUGGESTION]: 'Declare `{{name}}` as a class field.',
};

const classMemberTypes = new Set([
	'AccessorProperty',
	'MethodDefinition',
	'PropertyDefinition',
	'TSAbstractAccessorProperty',
	'TSAbstractMethodDefinition',
	'TSAbstractPropertyDefinition',
]);

const transparentExpressionWrapperTypes = new Set([
	'ChainExpression',
	'TSAsExpression',
	'TSInstantiationExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const isNonArrowFunction = node =>
	node.type === 'FunctionDeclaration'
	|| node.type === 'FunctionExpression';

const getStaticName = (key, computed) => {
	if (!computed && key?.type === 'Identifier') {
		return key.name;
	}

	if (
		key?.type === 'Literal'
		&& typeof key.value === 'string'
	) {
		return key.value;
	}

	if (
		computed
		&& key?.type === 'TemplateLiteral'
		&& key.expressions.length === 0
	) {
		return key.quasis[0].value.cooked;
	}
};

const removeTransparentWrapper = node => {
	while (node && transparentExpressionWrapperTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const isThisExpression = node => removeTransparentWrapper(node)?.type === 'ThisExpression';

const getThisMemberName = memberExpression => {
	if (
		memberExpression.type !== 'MemberExpression'
		|| memberExpression.computed
		|| !isThisExpression(memberExpression.object)
	) {
		return;
	}

	return getStaticName(memberExpression.property, memberExpression.computed);
};

const isClassMethodFunction = node =>
	node.parent.type === 'MethodDefinition'
	&& node.parent.value === node;

const getThisOwnerClassBody = node => {
	for (let current = node.parent; current; current = current.parent) {
		if (current.type === 'ClassBody') {
			return current;
		}

		if (isNonArrowFunction(current) && !isClassMethodFunction(current)) {
			return;
		}
	}
};

const getContainingClassElement = (node, classBody) => {
	let current = node;
	while (current.parent !== classBody) {
		current = current.parent;
	}

	return current;
};

const isInStaticContext = (node, classBody) => {
	const classElement = getContainingClassElement(node, classBody);
	return classElement.type === 'StaticBlock' || classElement.static === true;
};

const isInConstructor = (node, classBody) => {
	const classElement = getContainingClassElement(node, classBody);
	return classElement.type === 'MethodDefinition' && classElement.kind === 'constructor';
};

const isClassElementDefinition = (node, classBody) => {
	const classElement = getContainingClassElement(node, classBody);

	if (classElement.key) {
		for (let current = node; current !== classElement; current = current.parent) {
			if (current === classElement.key) {
				return true;
			}
		}
	}

	return classElement.decorators?.some(decorator => {
		for (let current = node; current !== classElement; current = current.parent) {
			if (current === decorator) {
				return true;
			}
		}

		return false;
	}) === true;
};

const isSimpleAssignmentTarget = memberExpression => {
	const {parent} = memberExpression;
	return parent.type === 'AssignmentExpression'
		&& parent.left === memberExpression
		&& parent.operator === '=';
};

const getParameterPropertyName = parameter => {
	if (parameter.type !== 'TSParameterProperty') {
		return;
	}

	const {parameter: propertyParameter} = parameter;
	if (propertyParameter.type === 'Identifier') {
		return propertyParameter.name;
	}

	if (
		propertyParameter.type === 'AssignmentPattern'
		&& propertyParameter.left.type === 'Identifier'
	) {
		return propertyParameter.left.name;
	}
};

const walkNode = (node, visitorKeys, visitor, shouldSkip = () => false) => {
	if (!node || shouldSkip(node)) {
		return;
	}

	visitor(node);

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];
		if (Array.isArray(value)) {
			for (const child of value) {
				if (child) {
					walkNode(child, visitorKeys, visitor, shouldSkip);
				}
			}
		} else if (value) {
			walkNode(value, visitorKeys, visitor, shouldSkip);
		}
	}
};

const getDeclaredClassMemberNames = (classBody, sourceCode) => {
	const names = new Set(['constructor']);

	for (const member of classBody.body) {
		if (!(
			classMemberTypes.has(member.type)
			&& member.static !== true
			&& member.kind !== 'constructor'
		)) {
			continue;
		}

		const name = getStaticName(member.key, member.computed);
		if (name) {
			names.add(name);
		}
	}

	const constructor = classBody.body.find(member =>
		member.type === 'MethodDefinition'
		&& member.kind === 'constructor'
		&& member.static !== true
		&& member.value?.body);

	if (!constructor) {
		return names;
	}

	for (const parameter of constructor.value.params) {
		const name = getParameterPropertyName(parameter);
		if (name) {
			names.add(name);
		}
	}

	const shouldSkip = node => node !== constructor.value.body && (
		node.type === 'ClassDeclaration'
		|| node.type === 'ClassExpression'
		|| node.type === 'ArrowFunctionExpression'
		|| isNonArrowFunction(node)
	);

	walkNode(constructor.value.body, sourceCode.visitorKeys, node => {
		if (
			node.type !== 'AssignmentExpression'
			|| node.operator !== '='
		) {
			return;
		}

		const name = getThisMemberName(node.left);
		if (name) {
			names.add(name);
		}
	}, shouldSkip);

	return names;
};

const getInsertClassFieldSuggestion = (classBody, name, context) => {
	const {sourceCode} = context;
	const firstMember = classBody.body[0];

	if (firstMember) {
		const classIndent = getIndentString(classBody.parent, context);
		const memberIndent = getIndentString(firstMember, context) || `${classIndent}\t`;
		const openingBrace = sourceCode.getFirstToken(classBody);
		const insertionTarget = sourceCode.getCommentsBefore(firstMember)[0] ?? firstMember;
		const firstMemberLocation = sourceCode.getLoc(insertionTarget).start;

		if (firstMemberLocation.line === sourceCode.getLoc(openingBrace).start.line) {
			return;
		}

		const insertIndex = sourceCode.getIndexFromLoc({line: firstMemberLocation.line, column: 0});
		return {
			messageId: MESSAGE_ID_SUGGESTION,
			data: {name},
			fix: fixer => fixer.insertTextBeforeRange([insertIndex, insertIndex], `${memberIndent}${name};\n`),
		};
	}

	const closingBrace = sourceCode.getLastToken(classBody);
	const classIndent = getIndentString(classBody.parent, context);
	return {
		messageId: MESSAGE_ID_SUGGESTION,
		data: {name},
		fix: fixer => fixer.insertTextBefore(closingBrace, `\n${classIndent}\t${name};\n${classIndent}`),
	};
};

const shouldReportMemberAccess = (node, name, classBody, declaredNames) =>
	getThisOwnerClassBody(node) === classBody
	&& !isInStaticContext(node, classBody)
	&& !isClassElementDefinition(node, classBody)
	&& !declaredNames.has(name);

const getProblemsForClassBody = function * (classBody, memberAccesses, context) {
	const declaredNames = getDeclaredClassMemberNames(classBody, context.sourceCode);
	const suggestedNames = new Set();

	for (const {node, name} of memberAccesses) {
		if (!shouldReportMemberAccess(node, name, classBody, declaredNames)) {
			continue;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
			data: {name},
		};

		if (
			isSimpleAssignmentTarget(node)
			&& !isInConstructor(node, classBody)
			&& !suggestedNames.has(name)
		) {
			const suggestion = getInsertClassFieldSuggestion(classBody, name, context);
			if (suggestion) {
				suggestedNames.add(name);
				problem.suggest = [suggestion];
			}
		}

		yield problem;
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const memberAccesses = [];
	const classBodies = [];

	context.on('MemberExpression', node => {
		const name = getThisMemberName(node);
		if (name) {
			memberAccesses.push({node, name});
		}
	});

	context.on('ClassBody', node => {
		classBodies.push(node);
	});

	context.onExit('Program', function * () {
		for (const classBody of classBodies) {
			if (classBody.parent.superClass) {
				continue;
			}

			yield * getProblemsForClassBody(classBody, memberAccesses, context);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Require class members to be declared.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
