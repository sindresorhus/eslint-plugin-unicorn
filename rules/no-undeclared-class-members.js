import {
	getIndentString,
	getIndentUnit,
	getLinebreak,
	getLineIndent,
	getVisitorChildNodes,
} from './utils/index.js';
import {
	getContainingClassElement,
	getStaticName,
	getThisOwnerClassBody,
	isInClassElementDefinition,
	isInStaticContext,
	isThisExpression,
} from './shared/class-this.js';

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

const isNonArrowFunction = node =>
	node.type === 'FunctionDeclaration'
	|| node.type === 'FunctionExpression';

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

const isInConstructor = node => {
	const classElement = getContainingClassElement(node);
	return classElement.type === 'MethodDefinition' && classElement.kind === 'constructor';
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

const walkNode = (node, visitorKeys, visitor, shouldSkip) => {
	if (shouldSkip(node)) {
		return;
	}

	visitor(node);

	for (const child of getVisitorChildNodes(node, visitorKeys)) {
		walkNode(child, visitorKeys, visitor, shouldSkip);
	}
};

const getDeclaredClassMemberNames = (classBody, sourceCode) => {
	const names = new Set(['constructor']);

	for (const member of classBody.body) {
		if (!classMemberTypes.has(member.type) || member.static === true || member.kind === 'constructor') {
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

// The reported access is inside a class element, so the class body always has a first member.
const getInsertClassFieldSuggestion = (classBody, name, context) => {
	const {sourceCode} = context;
	const [firstMember] = classBody.body;
	const classIndent = getLineIndent(classBody.parent, context);
	const memberIndent = getIndentString(firstMember, context) || `${classIndent}${getIndentUnit(context)}`;
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
		fix: fixer => fixer.insertTextBeforeRange([insertIndex, insertIndex], `${memberIndent}${name};${getLinebreak(context)}`),
	};
};

const shouldReportMemberAccess = (node, name, classBody, declaredNames) =>
	getThisOwnerClassBody(node) === classBody
	&& !isInStaticContext(node)
	&& !isInClassElementDefinition(node)
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
			&& !isInConstructor(node)
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

/**
@param {import('eslint').Rule.RuleContext} context
*/
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

/**
@type {import('eslint').Rule.RuleModule}
*/
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
