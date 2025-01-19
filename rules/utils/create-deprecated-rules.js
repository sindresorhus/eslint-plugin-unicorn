import packageJson from '../../package.json' with {type: 'json'};

const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

/** @returns {{ [ruleName: string]: import('eslint').Rule.RuleModule }} */
export default function createDeprecatedRules(data) {
	return Object.fromEntries(
		Object.entries(data).map(([ruleId, replacedBy = []]) => [
			ruleId,
			{
				create: () => ({}),
				meta: {
					docs: {
						url: `${repoUrl}/blob/v${packageJson.version}/docs/deprecated-rules.md#${ruleId}`,
					},
					deprecated: true,
					replacedBy: Array.isArray(replacedBy) ? replacedBy : [replacedBy],
				},
			},
		]),
	);
}
