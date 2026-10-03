import packageJson from '../../package.json' with {type: 'json'};
import getDocumentationUrl from './get-documentation-url.js';

const repositoryUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

/**
@returns {{ [ruleName: string]: import('eslint').Rule.RuleModule }}
*/
export default function createDeprecatedRules(rules) {
	return Object.fromEntries(Object.entries(rules).map(([ruleId, deprecatedInfo]) => {
		const url = `${repositoryUrl}/blob/v${packageJson.version}/docs/deleted-and-deprecated-rules.md#${ruleId}`;
		return [
			ruleId,
			{
				// eslint-disable-next-line internal/prefer-context-on
				create: () => ({}),
				meta: {
					docs: {
						description: deprecatedInfo.message,
						url,
					},
					deprecated: {
						message: deprecatedInfo.message,
						url,
						// A string is a Unicorn rule ID. An object is a complete `ReplacedByInfo`, for example, for a rule in another plugin.
						replacedBy: deprecatedInfo.replacedBy.map(replacement => typeof replacement === 'string'
							? {
								rule: {
									name: replacement,
									url: getDocumentationUrl(replacement),
								},
							}
							: replacement),
					},
				},
			},
		];
	}));
}
