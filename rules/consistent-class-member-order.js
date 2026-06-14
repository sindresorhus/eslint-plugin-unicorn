const MESSAGE_ID = 'consistent-class-member-order';
const messages = {
	[MESSAGE_ID]: 'Expected {{current}} to come before {{previous}}.',
};

const GROUP_PRIVATE_FIELD = 0;
const GROUP_PUBLIC_FIELD = 1;
const GROUP_STATIC_FIELD = 2;
const GROUP_CONSTRUCTOR = 3;
const GROUP_PRIVATE_METHOD = 4;
const GROUP_PUBLIC_METHOD = 5;
const GROUP_STATIC_METHOD = 6;
const GROUP_STATIC_BLOCK = 7;

const groupLabels = [
	'private field',
	'public field',
	'static field',
	'constructor',
	'private method',
	'public method',
	'static method',
	'static block',
];

const fieldTypes = new Set([
	'AccessorProperty',
	'PropertyDefinition',
	'TSAbstractAccessorProperty',
	'TSAbstractPropertyDefinition',
]);

const methodTypes = new Set([
	'MethodDefinition',
	'TSAbstractMethodDefinition',
]);

const isPrivateMember = member =>
	member.key?.type === 'PrivateIdentifier'
	|| member.accessibility === 'private';

const getMemberGroup = member => {
	if (member.type === 'StaticBlock') {
		return GROUP_STATIC_BLOCK;
	}

	if (
		methodTypes.has(member.type)
		&& member.kind === 'constructor'
	) {
		return GROUP_CONSTRUCTOR;
	}

	if (fieldTypes.has(member.type)) {
		if (member.static) {
			return GROUP_STATIC_FIELD;
		}

		return isPrivateMember(member)
			? GROUP_PRIVATE_FIELD
			: GROUP_PUBLIC_FIELD;
	}

	if (methodTypes.has(member.type)) {
		if (member.static) {
			return GROUP_STATIC_METHOD;
		}

		return isPrivateMember(member)
			? GROUP_PRIVATE_METHOD
			: GROUP_PUBLIC_METHOD;
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ClassBody', function * (classBody) {
		let highestGroup;

		for (const member of classBody.body) {
			const group = getMemberGroup(member);
			if (group === undefined) {
				continue;
			}

			if (
				highestGroup !== undefined
				&& group < highestGroup
			) {
				yield {
					node: member,
					messageId: MESSAGE_ID,
					data: {
						current: groupLabels[group],
						previous: groupLabels[highestGroup],
					},
				};

				continue;
			}

			highestGroup = group;
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent class member order.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
