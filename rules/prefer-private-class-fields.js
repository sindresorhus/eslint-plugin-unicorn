import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {getStaticStringValue} from './ast/index.js';

const {isIdentifierName} = helperValidatorIdentifier;

const MESSAGE_ID = 'prefer-private-class-fields';
const messages = {
	[MESSAGE_ID]: 'Prefer the private class field `{{replacement}}` over the underscore-prefixed `{{original}}`.',
};

const memberAccessState = {
	blocked: 'blocked',
	convertible: 'convertible',
	ignored: 'ignored',
};

/*
Scope boundary for instance observation:

Converting `_foo` to `#foo` makes the field non-enumerable and invisible to reflection, so the rule skips the autofix when it sees the instance observed. Detecting every such case is impossible (the instance can escape to code we can't see via `return this`, `fn(this)`, aliasing, etc.), so this is deliberately best-effort: we only block on the common, local enumeration patterns and treat the rest as unsupported.

Detected (block the fix): `{...this}`, rest destructuring of `this`, and `Object.keys`/`values`/`entries`/`assign(…, this)` and `JSON.stringify(this)`.

NOT detected (the fix runs, accepting it may change behavior): `Reflect.ownKeys`, `Object.getOwnPropertyNames`/`Symbols`/`Descriptor(s)`, `Object.hasOwn`, `Object.prototype.hasOwnProperty.call`, the `in` operator, `for…in`, observing static members through the class name, and any escape of the bare instance.
*/
const objectObserverMethods = new Set([
	'assign',
	'entries',
	'keys',
	'values',
]);

const isCandidateMember = member => {
	if (
		member.type !== 'PropertyDefinition'
		&& member.type !== 'MethodDefinition'
		&& member.type !== 'AccessorProperty'
	) {
		return false;
	}

	if (
		member.computed
		|| member.key.type !== 'Identifier'
		|| !member.key.name.startsWith('_')
	) {
		return false;
	}

	// TypeScript modifiers that change the member's semantics or contract
	return !(member.accessibility !== undefined
		|| member.declare
		|| member.readonly
		|| member.override
		|| (Array.isArray(member.decorators) && member.decorators.length > 0));
};

// `#constructor` is a syntax error; an empty or otherwise invalid name can't be a private identifier
const isValidPrivateName = name => name !== 'constructor' && isIdentifierName(name);

const hasPrivateMember = (classBody, name) =>
	classBody.body.some(member =>
		member.key?.type === 'PrivateIdentifier' && member.key.name === name);

const getStaticName = (key, computed) => {
	if (!computed && key?.type === 'Identifier') {
		return key.name;
	}

	if (
		computed
		|| key?.type === 'Literal'
	) {
		return getStaticStringValue(key);
	}
};

const getMemberName = member => getStaticName(member.key, member.computed);

const getMemberExpressionPropertyName = member => getStaticName(member.property, member.computed);

const mayHaveMemberNamed = (member, name) => {
	const memberName = getMemberName(member);
	return memberName === name || (memberName === undefined && member.computed);
};

const hasMemberNamed = (classBody, name) =>
	classBody.body.some(member => mayHaveMemberNamed(member, name));

const hasOtherMemberNamed = (classBody, name, members) =>
	classBody.body.some(member => !members.includes(member) && mayHaveMemberNamed(member, name));

/**
Find the class whose instance `this` refers to, or `undefined` when `this` is rebound by a nested non-arrow function or is outside any class.

@param {import('eslint').Rule.Node} node
*/
const getThisOwnerClassBody = node => {
	for (let current = node.parent; current; current = current.parent) {
		const {type} = current;

		if (type === 'ClassBody') {
			return current;
		}

		// A non-arrow function rebinds `this`, except when it is a class method's body
		if (type === 'FunctionExpression' || type === 'FunctionDeclaration') {
			const {parent} = current;
			const isMethodBody = parent.type === 'MethodDefinition' && parent.value === current;
			if (!isMethodBody) {
				return;
			}
		}
	}
};

const transparentExpressionWrapperTypes = new Set([
	'ChainExpression',
	'TSAsExpression',
	'TSInstantiationExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const getTransparentExpression = node => {
	let current = node;
	while (transparentExpressionWrapperTypes.has(current.parent.type)) {
		current = current.parent;
	}

	return current;
};

// Unwrap transparent wrappers (`this as Foo`, `this!`, …) down to the expression they wrap
const removeTransparentWrapper = node => {
	while (node && transparentExpressionWrapperTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const isThisExpression = node => removeTransparentWrapper(node)?.type === 'ThisExpression';

const isDeleteExpression = node => {
	const {parent} = getTransparentExpression(node);
	return parent.type === 'UnaryExpression' && parent.operator === 'delete';
};

const isInStaticContext = (node, classBody) => {
	let current = node;
	while (current.parent !== classBody) {
		current = current.parent;
	}

	return current.type === 'StaticBlock' || current.static;
};

const isInFieldInitializerBeforeOrAtMember = (node, member, classBody) => {
	if (
		member.type !== 'PropertyDefinition'
		|| member.static
	) {
		return false;
	}

	let current = node;
	while (current.parent !== classBody) {
		current = current.parent;
	}

	return (
		current.type === 'PropertyDefinition'
		&& !current.static
		&& classBody.body.indexOf(current) <= classBody.body.indexOf(member)
	);
};

const isInside = (node, ancestor) => {
	for (let current = node; current; current = current.parent) {
		if (current === ancestor) {
			return true;
		}
	}

	return false;
};

const isInClassElementDefinition = node => {
	let current = node;
	while (current.parent && current.parent.type !== 'ClassBody') {
		current = current.parent;
	}

	if (!current.parent) {
		return false;
	}

	return (
		(current.key && isInside(node, current.key))
		|| current.decorators?.some(decorator => isInside(node, decorator))
	);
};

// The object a destructuring pattern reads from (`const {…} = source` / `({…} = source)`)
const getDestructuredObject = objectPattern => {
	const {parent} = objectPattern;
	if (parent.type === 'VariableDeclarator' && parent.id === objectPattern) {
		return parent.init;
	}

	if (parent.type === 'AssignmentExpression' && parent.left === objectPattern) {
		return parent.right;
	}
};

const isObjectRestRhs = parent =>
	(
		parent.type === 'VariableDeclarator'
		&& parent.id.type === 'ObjectPattern'
		&& parent.id.properties.some(property => property.type === 'RestElement')
	)
	|| (
		parent.type === 'AssignmentExpression'
		&& parent.left.type === 'ObjectPattern'
		&& parent.left.properties.some(property => property.type === 'RestElement')
	);

const isObjectObserverCall = (node, parent) => {
	if (
		parent.type !== 'CallExpression'
		|| !parent.arguments.includes(node)
		|| parent.callee.type !== 'MemberExpression'
	) {
		return false;
	}

	const {callee} = parent;
	const propertyName = getMemberExpressionPropertyName(callee);
	const {object} = callee;
	return object.type === 'Identifier'
		&& (
			(object.name === 'Object' && objectObserverMethods.has(propertyName))
			|| (object.name === 'JSON' && propertyName === 'stringify')
		);
};

const isObjectObservationExpression = (expression, parent) =>
	parent.type === 'SpreadElement'
	|| isObjectRestRhs(parent)
	|| isObjectObserverCall(expression, parent);

const hasInheritanceCandidateConflict = (classBody, name, allClassBodies) => {
	if (classBody.parent.superClass) {
		return true;
	}

	for (const otherClassBody of allClassBodies) {
		if (otherClassBody === classBody || !hasMemberNamed(otherClassBody, name)) {
			continue;
		}

		if (otherClassBody.parent.superClass) {
			return true;
		}
	}

	return false;
};

const isGetterSetterPair = members =>
	members.length === 2
	&& members[0].static === members[1].static
	&& members[0].kind !== members[1].kind
	&& members.every(member => member.kind === 'get' || member.kind === 'set');

const getMemberAccessState = ({access, name, member, classBody, candidatesByClass}) => {
	if (
		!isThisExpression(access.object)
		|| isDeleteExpression(access)
	) {
		return memberAccessState.blocked;
	}

	if (isInClassElementDefinition(access)) {
		return memberAccessState.blocked;
	}

	const owner = getThisOwnerClassBody(access);
	if (owner !== classBody) {
		if (owner && candidatesByClass.get(owner)?.has(name)) {
			return memberAccessState.ignored;
		}

		// `this` is rebound, outside any class, or belongs to a class that doesn't declare its own member with this name (the access could be reaching this class's member via inheritance)
		return memberAccessState.blocked;
	}

	if (
		member.static
		|| isInStaticContext(access, classBody)
		|| isInFieldInitializerBeforeOrAtMember(access, member, classBody)
	) {
		return memberAccessState.blocked;
	}

	return memberAccessState.convertible;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	// Underscore-prefixed property name -> `this._foo` style member accesses
	const memberAccesses = new Map();
	// Underscore-prefixed property names that have a reference incompatible with private fields
	const blockingNames = new Set();
	const classesWithObservableThis = new Set();
	let hasUnknownComputedReference = false;
	const classesWithCandidates = [];
	const allClassBodies = [];

	context.on('MemberExpression', node => {
		const {property, computed} = node;

		if (!computed && property.type === 'Identifier' && property.name.startsWith('_')) {
			if (!memberAccesses.has(property.name)) {
				memberAccesses.set(property.name, []);
			}

			memberAccesses.get(property.name).push(node);
			return;
		}

		// `this['_foo']` / `this[`_foo`]` can't become private-field access
		if (computed) {
			const name = getStaticName(property, computed);
			if (name?.startsWith('_')) {
				blockingNames.add(name);
			} else if (name === undefined && isThisExpression(node.object)) {
				// `this[expression]` can dynamically reach any underscore field; a computed access on any other object is unrelated
				hasUnknownComputedReference = true;
			}
		}
	});

	context.on('ThisExpression', node => {
		const expression = getTransparentExpression(node);
		const {parent} = expression;
		if (!isObjectObservationExpression(expression, parent)) {
			return;
		}

		const owner = getThisOwnerClassBody(node);
		if (owner) {
			classesWithObservableThis.add(owner);
		}
	});

	// `const {_foo} = this` / `const {['_foo']: v} = this` has no private-field equivalent
	context.on('Property', node => {
		if (node.parent.type !== 'ObjectPattern') {
			return;
		}

		const {key, computed} = node;
		const name = getStaticName(key, computed);
		if (name?.startsWith('_')) {
			blockingNames.add(name);
		} else if (computed && name === undefined && isThisExpression(getDestructuredObject(node.parent))) {
			// `const {[expression]: value} = this` can dynamically reach any underscore field; destructuring any other object is unrelated
			hasUnknownComputedReference = true;
		}
	});

	context.on('ClassBody', classBody => {
		allClassBodies.push(classBody);

		const candidatesByName = new Map();

		for (const member of classBody.body) {
			if (!isCandidateMember(member)) {
				continue;
			}

			const newName = member.key.name.slice(1);
			if (!isValidPrivateName(newName) || hasPrivateMember(classBody, newName)) {
				continue;
			}

			if (!candidatesByName.has(member.key.name)) {
				candidatesByName.set(member.key.name, []);
			}

			candidatesByName.get(member.key.name).push(member);
		}

		if (candidatesByName.size > 0) {
			classesWithCandidates.push({classBody, candidatesByName});
		}
	});

	context.onExit('Program', function * () {
		// ClassBody -> its candidate members keyed by underscore name
		const candidatesByClass = new Map(classesWithCandidates.map(({classBody, candidatesByName}) => [classBody, candidatesByName]));

		for (const {classBody, candidatesByName} of classesWithCandidates) {
			for (const [name, members] of candidatesByName) {
				const replacement = `#${name.slice(1)}`;

				// Duplicate public members are valid, but duplicate #private is a syntax error
				// (getter/setter pairs are the only valid case for two members with the same name)
				if (members.length > 1 && !isGetterSetterPair(members)) {
					yield {
						node: members[0].key,
						messageId: MESSAGE_ID,
						data: {original: name, replacement},
					};
					continue;
				}

				const convertibleAccesses = [];
				// `classesWithObservableThis` covers the common enumeration patterns (see the boundary note on `objectObserverMethods`)
				let isBlocked = hasUnknownComputedReference
					|| blockingNames.has(name)
					|| hasOtherMemberNamed(classBody, name, members)
					|| classesWithObservableThis.has(classBody);

				// Private fields are not polymorphic: converting an overridden
				// member would silently break dynamic dispatch through `this`
				if (
					!isBlocked
					&& hasInheritanceCandidateConflict(classBody, name, allClassBodies)
				) {
					isBlocked = true;
				}

				for (const access of memberAccesses.get(name) ?? []) {
					const accessState = getMemberAccessState({
						access,
						name,
						member: members[0],
						classBody,
						candidatesByClass,
					});
					if (accessState === memberAccessState.blocked) {
						isBlocked = true;
						continue;
					}

					if (accessState === memberAccessState.convertible) {
						convertibleAccesses.push(access);
					}
				}

				const problem = {
					node: members[0].key,
					messageId: MESSAGE_ID,
					data: {original: name, replacement},
				};

				if (!isBlocked) {
					problem.fix = function * (fixer) {
						for (const member of members) {
							yield fixer.replaceText(member.key, replacement);
						}

						for (const access of convertibleAccesses) {
							yield fixer.replaceText(access.property, replacement);
						}
					};
				}

				yield problem;
			}
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer private class fields over the underscore-prefix convention.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
