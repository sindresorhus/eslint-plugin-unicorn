const MESSAGE_ID = 'consistent-class-member-order';
const messages = {
	[MESSAGE_ID]: 'Expected {{current}} to come before {{previous}}.',
};

const GROUP_STATIC_FIELD = 'static-field';
const GROUP_STATIC_BLOCK = 'static-block';
const GROUP_PRIVATE_FIELD = 'private-field';
const GROUP_PUBLIC_FIELD = 'public-field';
const GROUP_CONSTRUCTOR = 'constructor';
const GROUP_STATIC_METHOD = 'static-method';
const GROUP_PRIVATE_METHOD = 'private-method';
const GROUP_PUBLIC_METHOD = 'public-method';

const defaultOrder = [
	GROUP_STATIC_FIELD,
	GROUP_STATIC_BLOCK,
	GROUP_PRIVATE_FIELD,
	GROUP_PUBLIC_FIELD,
	GROUP_CONSTRUCTOR,
	GROUP_STATIC_METHOD,
	GROUP_PRIVATE_METHOD,
	GROUP_PUBLIC_METHOD,
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

const getGroupLabel = group => group.replaceAll('-', ' ');

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
	const order = new Map(context.options[0].order.map((group, index) => [group, index]));

	context.on('ClassBody', function * (classBody) {
		let highestGroupIndex;
		let highestGroup;

		for (const member of classBody.body) {
			const group = getMemberGroup(member);
			if (group === undefined) {
				continue;
			}

			const groupIndex = order.get(group);
			if (
				highestGroupIndex !== undefined
				&& groupIndex < highestGroupIndex
			) {
				yield {
					node: member,
					messageId: MESSAGE_ID,
					data: {
						current: getGroupLabel(group),
						previous: getGroupLabel(highestGroup),
					},
				};

				continue;
			}

			highestGroupIndex = groupIndex;
			highestGroup = group;
		}
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			order: {
				type: 'array',
				description: 'The class member group order.',
				items: {
					enum: defaultOrder,
				},
				minItems: defaultOrder.length,
				maxItems: defaultOrder.length,
				uniqueItems: true,
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
			description: 'Enforce consistent class member order.',
			recommended: 'unopinionated',
		},
		schema,
		defaultOptions: [{order: defaultOrder}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
