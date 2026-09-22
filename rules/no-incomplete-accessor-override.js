import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';

const MESSAGE_ID = 'no-incomplete-accessor-override';
const UNKNOWN_NAME = Symbol('unknown name');
const messages = {
	[MESSAGE_ID]: 'This {{kind}}ter hides the inherited {{oppositeKind}}ter for `{{name}}`. Define both accessors in this class.',
};

const isClass = node => node?.type === 'ClassDeclaration' || node?.type === 'ClassExpression';

const getClass = (node, sourceCode, visitedVariables = new Set()) => {
	if (isClass(node)) {
		return node.declare || node.decorators?.length > 0 ? undefined : node;
	}

	if (node?.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1 || visitedVariables.has(variable)) {
		return;
	}

	const [definition] = variable.defs;
	if (variable.references.some(reference => reference.isWrite() && !reference.init)) {
		return;
	}

	if (definition.type === 'ClassName') {
		return getClass(definition.node, sourceCode, visitedVariables);
	}

	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
	) {
		return;
	}

	visitedVariables.add(variable);
	return getClass(definition.node.init, sourceCode, visitedVariables);
};

const getMemberName = (member, sourceCode) => {
	const {key} = member;
	if (key.type === 'PrivateIdentifier') {
		return;
	}

	if (!member.computed) {
		return key.type === 'Identifier' ? key.name : String(key.value);
	}

	const staticValue = getStaticValue(key, sourceCode.getScope(member));
	if (!staticValue) {
		return UNKNOWN_NAME;
	}

	const {value} = staticValue;
	if (typeof value === 'symbol') {
		return;
	}

	if (value && ['object', 'function'].includes(typeof value)) {
		return UNKNOWN_NAME;
	}

	return String(value);
};

const isRuntimeMember = member => !member.declare && ['MethodDefinition', 'PropertyDefinition', 'AccessorProperty'].includes(member.type);

const getMemberDescriptorKind = (member, name, sourceCode) => {
	if (member.decorators?.length > 0) {
		return 'unknown';
	}

	if (member.type === 'MethodDefinition' && !member.value.body) {
		return;
	}

	const memberName = getMemberName(member, sourceCode);
	if (memberName === UNKNOWN_NAME) {
		return 'unknown';
	}

	if (memberName !== name) {
		return;
	}

	if (member.type === 'AccessorProperty') {
		return 'both';
	}

	return member.type === 'MethodDefinition' && ['get', 'set'].includes(member.kind) ? member.kind : 'data';
};

const getDescriptorKind = (classNode, name, isStatic, sourceCode) => {
	if (classNode.declare || classNode.decorators?.length > 0) {
		return 'unknown';
	}

	let descriptorKind;

	for (const member of classNode.body.body) {
		if (!isRuntimeMember(member) || member.static !== isStatic) {
			continue;
		}

		const kind = getMemberDescriptorKind(member, name, sourceCode);
		if (kind === 'unknown') {
			return kind;
		}

		if (kind === 'data' && member.type === 'PropertyDefinition') {
			return kind;
		}

		if ((kind === 'get' || kind === 'set') && (descriptorKind === 'both' || descriptorKind === (kind === 'get' ? 'set' : 'get'))) {
			descriptorKind = 'both';
		} else if (kind) {
			descriptorKind = kind;
		}
	}

	return descriptorKind;
};

const getInheritedDescriptorKind = (classNode, name, isStatic, sourceCode) => {
	const visitedClasses = new Set();

	while (classNode.superClass) {
		classNode = getClass(classNode.superClass, sourceCode);
		if (!classNode || visitedClasses.has(classNode)) {
			return;
		}

		visitedClasses.add(classNode);
		const kind = getDescriptorKind(classNode, name, isStatic, sourceCode);
		if (kind) {
			return kind;
		}
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on(['ClassDeclaration', 'ClassExpression'], function * (classNode) {
		if (!classNode.superClass || classNode.declare || classNode.decorators?.length > 0) {
			return;
		}

		const reportedNamesByStatic = [new Set(), new Set()];

		for (const member of classNode.body.body) {
			if (member.type !== 'MethodDefinition' || !['get', 'set'].includes(member.kind) || !member.value.body) {
				continue;
			}

			const name = getMemberName(member, sourceCode);
			if (name === UNKNOWN_NAME || name === undefined || (member.static && (name === 'name' || name === 'length'))) {
				continue;
			}

			const reportedNames = reportedNamesByStatic[Number(member.static)];
			if (reportedNames.has(name) || getDescriptorKind(classNode, name, member.static, sourceCode) !== member.kind) {
				continue;
			}

			const oppositeKind = member.kind === 'get' ? 'set' : 'get';
			const inheritedKind = getInheritedDescriptorKind(classNode, name, member.static, sourceCode);
			if (inheritedKind !== oppositeKind && inheritedKind !== 'both') {
				continue;
			}

			reportedNames.add(name);
			yield {
				node: member.key,
				messageId: MESSAGE_ID,
				data: {kind: member.kind, oppositeKind, name: String(name)},
			};
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
			description: 'Disallow class accessors that hide an inherited getter or setter.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
