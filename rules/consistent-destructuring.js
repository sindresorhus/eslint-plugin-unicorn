import {findVariable} from '@eslint-community/eslint-utils';
import {isLeftHandSide, unwrapTypeScriptExpression} from './utils/index.js';
import {isCallOrNewExpression, isStringLiteral} from './ast/index.js';

const MESSAGE_ID = 'consistentDestructuring';
const MESSAGE_ID_SUGGEST = 'consistentDestructuringSuggest';

const thisScopeBoundaryNodeTypes = new Set([
	'FunctionDeclaration',
	'FunctionExpression',
	'MethodDefinition',
	'PropertyDefinition',
	'AccessorProperty',
	'StaticBlock',
	'Program',
]);

const isSimpleExpression = expression =>
	expression.type === 'Identifier'
	|| expression.type === 'ThisExpression';

const isChildInParentScope = (child, parent) => {
	while (child) {
		if (child === parent) {
			return true;
		}

		child = child.upper;
	}

	return false;
};

const getThisScopeBoundary = node => {
	while (node.parent) {
		node = node.parent;

		if (thisScopeBoundaryNodeTypes.has(node.type)) {
			return node;
		}
	}
};

const isIdentifierProperty = property =>
	property.type === 'Property'
	&& !property.computed
	&& property.key.type === 'Identifier';

const getAvailableDestructuredMember = (properties, member, memberScope, sourceCode) => {
	for (const property of properties) {
		if (property.key.name !== member) {
			continue;
		}

		const variable = findVariable(sourceCode.getScope(property.value), property.value);

		if (variable && findVariable(memberScope, property.value) === variable) {
			return property;
		}
	}
};

const shouldIgnoreMemberExpression = node =>
	node.computed
	|| (
		isCallOrNewExpression(node.parent)
		&& node.parent.callee === node
	)
	// Replacing the tag would change the `this` binding, like a method call.
	|| (
		node.parent.type === 'TaggedTemplateExpression'
		&& node.parent.tag === node
	)
	|| isLeftHandSide(node);

const isRootVariableReassigned = (declaration, memberExpressionNode, memberScope, sourceCode) => {
	if (!declaration.rootVariable) {
		return false;
	}

	const [, declarationEnd] = sourceCode.getRange(declaration.object);
	const [memberStart] = sourceCode.getRange(memberExpressionNode);

	return declaration.rootVariable.references.some(reference => {
		if (!reference.isWrite()) {
			return false;
		}

		const [referenceStart] = sourceCode.getRange(reference.identifier);
		if (referenceStart < declarationEnd) {
			return false;
		}

		// Be conservative: writes from other variable scopes may run before this read via calls/closures.
		return reference.from.variableScope !== memberScope.variableScope || referenceStart <= memberStart;
	});
};

const isMemberExpressionReassigned = ({
	declaration,
	memberExpressionNode,
	memberScope,
	memberExpressionWrites,
	sourceCode,
}) => {
	const [, declarationEnd] = sourceCode.getRange(declaration.object);
	const [memberStart] = sourceCode.getRange(memberExpressionNode);
	const propertyName = memberExpressionNode.property.name;
	const object = unwrapTypeScriptExpression(memberExpressionNode.object);
	const rootIdentifierName = object.type === 'Identifier' ? object.name : undefined;
	const rootVariable = object.type === 'Identifier' ? findVariable(memberScope, object) : undefined;
	const thisScopeBoundary = object.type === 'ThisExpression' ? getThisScopeBoundary(object) : undefined;

	return memberExpressionWrites.some(write => {
		if (
			write.propertyName !== propertyName
			|| write.rootIdentifierName !== rootIdentifierName
			|| write.rootVariable !== rootVariable
			|| write.thisScopeBoundary !== thisScopeBoundary
		) {
			return false;
		}

		// Be conservative: writes from other variable scopes may run before this read via calls/closures.
		if (write.scope.variableScope !== memberScope.variableScope) {
			return true;
		}

		return write.start >= declarationEnd
			&& write.start <= memberStart;
	});
};

const isDeclarationBeforeMemberExpression = (declaration, memberExpressionNode, sourceCode) => {
	const [, declarationEnd] = sourceCode.getRange(declaration.object);
	const [memberStart] = sourceCode.getRange(memberExpressionNode);

	return declarationEnd < memberStart;
};

const getEnclosingCall = node => {
	let current = node;
	while (current.parent) {
		const {parent} = current;
		if (
			(parent.type === 'CallExpression' && parent.callee === current)
			|| (parent.type === 'NewExpression' && parent.callee === current)
			|| (parent.type === 'TaggedTemplateExpression' && parent.tag === current)
		) {
			return parent;
		}

		// `foo.bar()` is called through the member expression
		if (parent.type === 'MemberExpression' && parent.object === current) {
			current = parent;
			continue;
		}

		return;
	}
};

// A destructured value is a snapshot, so a call between the declaration and the read could have mutated the object. Only a call in the same variable scope as the declaration counts, a call in a nested function runs elsewhere.
const hasCallBetween = (declaration, memberExpressionNode, sourceCode) => {
	const declarationScope = sourceCode.getScope(declaration);

	return sourceCode.getTokensBetween(declaration, memberExpressionNode)
		.some(token => {
			if (token.type !== 'Identifier') {
				return false;
			}

			const node = sourceCode.getNodeByRangeIndex(sourceCode.getRange(token)[0]);
			if (node.type !== 'Identifier') {
				return false;
			}

			const call = getEnclosingCall(node);
			// A block is its own scope but runs in the same tick, so comparing the variable scope is what decides whether the call can run before the read. This is the same comparison `isMemberExpressionReassigned` makes above.
			if (!call || sourceCode.getScope(call).variableScope !== declarationScope.variableScope) {
				return false;
			}

			// The read is an argument of this call, so the call runs after it
			const [memberStart] = sourceCode.getRange(memberExpressionNode);
			const [callStart, callEnd] = sourceCode.getRange(call);
			return memberStart < callStart || memberStart > callEnd;
		});
};

const isMatchingDeclaration = ({
	declaration,
	memberExpressionNode,
	memberScope,
	memberRootIdentifier,
	memberRootVariable,
	memberThisScopeBoundary,
	memberExpressionWrites,
	sourceCode,
}) => {
	if (!isDeclarationBeforeMemberExpression(declaration, memberExpressionNode, sourceCode)) {
		return false;
	}

	if (
		declaration.rootIdentifierName
		&& memberRootIdentifier?.name === declaration.rootIdentifierName
		&& memberRootVariable !== declaration.rootVariable
	) {
		return false;
	}

	if (
		declaration.thisScopeBoundary
		&& memberThisScopeBoundary !== declaration.thisScopeBoundary
	) {
		return false;
	}

	if (
		// Property is destructured outside the current scope
		!isChildInParentScope(memberScope, declaration.scope)
		|| isRootVariableReassigned(declaration, memberExpressionNode, memberScope, sourceCode)
		|| isMemberExpressionReassigned({
			declaration,
			memberExpressionNode,
			memberScope,
			memberExpressionWrites,
			sourceCode,
		})
	) {
		return false;
	}

	// Walking the tokens in between is the most expensive check, so it runs last
	return !hasCallBetween(declaration.object, memberExpressionNode, sourceCode);
};

const isMatchingInExpression = (node, memberExpression, sourceCode) => {
	if (!(
		node.type === 'BinaryExpression'
		&& node.operator === 'in'
		&& isStringLiteral(node.left)
		&& memberExpression.property.type === 'Identifier'
		&& node.left.value === memberExpression.property.name
	)) {
		return false;
	}

	return sourceCode.getText(node.right) === sourceCode.getText(memberExpression.object);
};

const hasMatchingInExpression = (node, memberExpression, sourceCode) => {
	if (isMatchingInExpression(node, memberExpression, sourceCode)) {
		return true;
	}

	if (
		node.type !== 'LogicalExpression'
		|| node.operator !== '&&'
	) {
		return false;
	}

	return hasMatchingInExpression(node.left, memberExpression, sourceCode)
		|| hasMatchingInExpression(node.right, memberExpression, sourceCode);
};

const isInPositiveGuardBranch = (parent, child, memberExpression, sourceCode) => {
	switch (parent.type) {
		case 'ConditionalExpression': {
			return parent.consequent === child
				&& hasMatchingInExpression(parent.test, memberExpression, sourceCode);
		}

		case 'LogicalExpression': {
			return parent.operator === '&&'
				&& parent.right === child
				&& hasMatchingInExpression(parent.left, memberExpression, sourceCode);
		}

		case 'IfStatement': {
			return parent.consequent === child
				&& hasMatchingInExpression(parent.test, memberExpression, sourceCode);
		}

		default: {
			return false;
		}
	}
};

const isInTypeGuardBoundary = node =>
	[
		'AccessorProperty',
		'FunctionDeclaration',
		'MethodDefinition',
		'PropertyDefinition',
	].includes(node.type);

const isInTypeGuardedBranch = (node, sourceCode) => {
	let child = node;
	let {parent} = node;

	while (parent) {
		if (isInTypeGuardBoundary(parent)) {
			return false;
		}

		if (isInPositiveGuardBranch(parent, child, node, sourceCode)) {
			return true;
		}

		child = parent;
		parent = parent.parent;
	}

	return false;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const declarations = new Map();
	const memberExpressions = [];
	const memberExpressionWrites = [];

	const addDirectMemberExpressionWrite = node => {
		const object = unwrapTypeScriptExpression(node.object);

		if (
			node.computed
			|| node.property.type !== 'Identifier'
			|| !['Identifier', 'ThisExpression'].includes(object.type)
		) {
			return;
		}

		const scope = sourceCode.getScope(node);

		memberExpressionWrites.push({
			propertyName: node.property.name,
			rootIdentifierName: object.type === 'Identifier' ? object.name : undefined,
			rootVariable: object.type === 'Identifier' ? findVariable(scope, object) : undefined,
			thisScopeBoundary: object.type === 'ThisExpression' ? getThisScopeBoundary(object) : undefined,
			start: sourceCode.getRange(node)[0],
			scope,
		});
	};

	const addMemberExpressionWrites = node => {
		switch (node.type) {
			case 'MemberExpression': {
				addDirectMemberExpressionWrite(node);
				break;
			}

			case 'AssignmentPattern': {
				addMemberExpressionWrites(node.left);
				break;
			}

			case 'RestElement': {
				addMemberExpressionWrites(node.argument);
				break;
			}

			case 'ObjectPattern': {
				for (const property of node.properties) {
					addMemberExpressionWrites(property.type === 'Property' ? property.value : property.argument);
				}

				break;
			}

			case 'ArrayPattern': {
				for (const element of node.elements) {
					if (element) {
						addMemberExpressionWrites(element);
					}
				}

				break;
			}

			default: {
				break;
			}
		}
	};

	context.on('AssignmentExpression', node => {
		addMemberExpressionWrites(node.left);
	});

	context.on(['ForInStatement', 'ForOfStatement'], node => {
		if (node.left.type !== 'VariableDeclaration') {
			addMemberExpressionWrites(node.left);
		}
	});

	context.on('UpdateExpression', node => {
		if (node.argument.type === 'MemberExpression') {
			addDirectMemberExpressionWrite(node.argument);
		}
	});

	context.on('UnaryExpression', node => {
		if (
			node.operator === 'delete'
			&& node.argument.type === 'MemberExpression'
		) {
			addDirectMemberExpressionWrite(node.argument);
		}
	});

	context.on('VariableDeclarator', node => {
		if (!(
			node.id.type === 'ObjectPattern'
			&& node.parent.kind === 'const'
			&& node.init
			// Ignore any complex expressions (e.g. arrays, functions)
			&& isSimpleExpression(node.init)
		)) {
			return;
		}

		const rootIdentifier = node.init.type === 'Identifier' ? node.init : undefined;
		const declaration = {
			scope: sourceCode.getScope(node),
			object: node.init,
			rootIdentifierName: rootIdentifier?.name,
			rootVariable: rootIdentifier && findVariable(sourceCode.getScope(node), rootIdentifier),
			thisScopeBoundary: node.init.type === 'ThisExpression' ? getThisScopeBoundary(node.init) : undefined,
			objectPattern: node.id,
		};
		const key = sourceCode.getText(node.init);

		declarations.set(key, [...(declarations.get(key) ?? []), declaration]);
	});

	const getProblem = node => {
		if (shouldIgnoreMemberExpression(node)) {
			return;
		}

		const object = unwrapTypeScriptExpression(node.object);
		const matchingDeclarations = declarations.get(sourceCode.getText(object));

		if (!matchingDeclarations) {
			return;
		}

		const memberScope = sourceCode.getScope(node);
		const memberRootIdentifier = object.type === 'Identifier' ? object : undefined;
		const memberRootVariable = memberRootIdentifier && findVariable(memberScope, memberRootIdentifier);
		const memberThisScopeBoundary = object.type === 'ThisExpression' ? getThisScopeBoundary(object) : undefined;
		const member = sourceCode.getText(node.property);

		let destructuredMember;

		for (const declaration of matchingDeclarations.toReversed()) {
			const destructuredProperties = declaration.objectPattern.properties.filter(property =>
				isIdentifierProperty(property)
				&& property.value.type === 'Identifier');

			// Finding the destructured member is cheap, so it runs before the expensive declaration checks
			const availableMember = getAvailableDestructuredMember(destructuredProperties, member, memberScope, sourceCode);

			if (
				availableMember
				&& isMatchingDeclaration({
					declaration,
					memberExpressionNode: node,
					memberScope,
					memberRootIdentifier,
					memberRootVariable,
					memberThisScopeBoundary,
					memberExpressionWrites,
					sourceCode,
				})
			) {
				destructuredMember = availableMember;
				break;
			}
		}

		if (!destructuredMember || isInTypeGuardedBranch(node, sourceCode)) {
			return;
		}

		// Don't try to fix nested member expressions
		if (node.parent.type === 'MemberExpression') {
			return {
				node,
				messageId: MESSAGE_ID,
			};
		}

		// The suggestion replaces the whole member expression with the bare binding, a comment inside it would be dropped.
		if (sourceCode.getCommentsInside(node).length > 0) {
			return {node, messageId: MESSAGE_ID};
		}

		const expression = sourceCode.getText(node);
		const newMember = destructuredMember.value.name;

		return {
			node,
			messageId: MESSAGE_ID,
			suggest: [{
				messageId: MESSAGE_ID_SUGGEST,
				data: {
					expression,
					property: newMember,
				},
				fix: fixer => fixer.replaceText(node, newMember),
			}],
		};
	};

	context.on('MemberExpression', node => {
		memberExpressions.push(node);
	});

	context.onExit('Program', function * () {
		for (const node of memberExpressions) {
			const problem = getProblem(node);

			if (problem) {
				yield problem;
			}
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Use destructured variables over properties.',
			recommended: false,
		},
		hasSuggestions: true,
		messages: {
			[MESSAGE_ID]: 'Use destructured variables over properties.',
			[MESSAGE_ID_SUGGEST]: 'Replace `{{expression}}` with destructured property `{{property}}`.',
		},
		languages: [
			'js/js',
		],
	},
};

export default config;
