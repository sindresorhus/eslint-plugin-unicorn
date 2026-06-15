import {getPropertyName} from '@eslint-community/eslint-utils';

const MESSAGE_ID = 'consistent-class-member-order';
const MESSAGE_ID_SUGGESTION = 'consistent-class-member-order-suggestion';
const messages = {
	[MESSAGE_ID]: 'Expected {{current}} to come before {{previous}}.',
	[MESSAGE_ID_SUGGESTION]: 'Reorder class members by group.',
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
	GROUP_STATIC_METHOD,
	GROUP_PRIVATE_FIELD,
	GROUP_PUBLIC_FIELD,
	GROUP_CONSTRUCTOR,
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

const getMemberName = (member, sourceCode) => {
	if (member.type === 'StaticBlock' || member.kind === 'constructor') {
		return;
	}

	const {key} = member;

	if (key?.type === 'PrivateIdentifier') {
		return `#${key.name}`;
	}

	if (key?.type === 'Identifier' && !member.computed) {
		return key.name;
	}

	return getPropertyName(member, sourceCode.getScope(member)) ?? undefined;
};

const getMemberDescription = (member, sourceCode) => {
	const label = getGroupLabel(getMemberGroup(member));
	const name = getMemberName(member, sourceCode);

	return name ? `${label} \`${name}\`` : label;
};

const getReorderedMembers = (classBody, order) => {
	const members = classBody.body.map((member, index) => ({
		member,
		index,
		group: getMemberGroup(member),
	}));

	if (
		members.some(({member, group}) =>
			group === undefined
			|| member.computed
			|| member.decorators?.length > 0)
	) {
		return;
	}

	return members.toSorted((first, second) =>
		order.get(first.group) - order.get(second.group)
		|| first.index - second.index);
};

const getMemberLineStart = (member, sourceCode) => {
	const {line} = sourceCode.getLoc(member).start;
	return sourceCode.getIndexFromLoc({line, column: 0});
};

const getMemberLineLeadingText = (member, sourceCode) => {
	const [memberStart] = sourceCode.getRange(member);
	const lineStart = getMemberLineStart(member, sourceCode);

	return sourceCode.text.slice(lineStart, memberStart);
};

const getMemberStart = (member, sourceCode) => {
	const [memberStart] = sourceCode.getRange(member);
	const lineStart = getMemberLineStart(member, sourceCode);
	const leadingText = getMemberLineLeadingText(member, sourceCode);

	return /^\s+$/v.test(leadingText)
		? lineStart
		: memberStart;
};

const isLineInitialMember = (member, sourceCode) =>
	/^\s*$/v.test(getMemberLineLeadingText(member, sourceCode));

const getMemberText = (member, sourceCode) => {
	const [, end] = sourceCode.getRange(member);
	return sourceCode.text.slice(getMemberStart(member, sourceCode), end);
};

const getSuggestion = (classBody, order, sourceCode) => {
	if (
		classBody.body.length === 0
		|| sourceCode.getCommentsInside(classBody).length > 0
		|| classBody.body.some(member => !isLineInitialMember(member, sourceCode))
	) {
		return;
	}

	const reorderedMembers = getReorderedMembers(classBody, order);
	if (!reorderedMembers) {
		return;
	}

	const firstMember = classBody.body[0];
	const lastMember = classBody.body.at(-1);
	const start = getMemberStart(firstMember, sourceCode);
	const [, end] = sourceCode.getRange(lastMember);
	const replacement = reorderedMembers
		.map(({member}) => getMemberText(member, sourceCode))
		.join('\n\n');

	return [
		{
			messageId: MESSAGE_ID_SUGGESTION,
			fix: fixer => fixer.replaceTextRange([start, end], replacement),
		},
	];
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const order = new Map(context.options[0].order.map((group, index) => [group, index]));

	context.on('ClassBody', classBody => {
		let highestGroupIndex;
		let highestMember;

		for (const member of classBody.body) {
			const group = getMemberGroup(member);
			if (group === undefined) {
				continue;
			}

			const groupIndex = order.get(group);

			// Report only the first out-of-order member. The suggestion reorders
			// the whole class, so a single problem keeps the output actionable
			// instead of flagging every member after it.
			if (
				highestGroupIndex !== undefined
				&& groupIndex < highestGroupIndex
			) {
				const suggestion = getSuggestion(classBody, order, sourceCode);

				return {
					node: member,
					messageId: MESSAGE_ID,
					data: {
						current: getMemberDescription(member, sourceCode),
						previous: getMemberDescription(highestMember, sourceCode),
					},
					...(suggestion && {suggest: suggestion}),
				};
			}

			highestGroupIndex = groupIndex;
			highestMember = member;
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
			recommended: true,
		},
		hasSuggestions: true,
		schema,
		defaultOptions: [{order: defaultOrder}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
