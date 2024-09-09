# Prefer readable boolean variable names

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

For better clarity and readability, Boolean variable names should start with a verb or adverb that clearly expresses the Boolean value.

The following prefixes are allows:

- `is`: isUserLoggedIn, isEmailVerified, isAdmin
- `was`: wasDataFetched, wasPaymentSuccessful, wasUserNotified
- `has`: hasAdminPrivileges, hasUserAgreed, hasPendingTasks
- `can`: canEditProfile, canUserVote, canAccessResource
- `should`: shouldDisplayNotification, shouldSendReminder, shouldUpdateProfile
- `had`: hadPreviousSession, hadErrorOccurred, hadUserLoggedOut
- `will`: willSendEmail, willUserAttend, willProcessOrder
- `would`: wouldApproveRequest, wouldUserRecommend, wouldLikeToSubscribe
- `could`: couldGenerateReport, couldUserParticipate, couldCauseError
- `shall`: shallProceedWithAction, shallUserContinue, shallWeStart
- `does`: doesUserExist, doesEmailMatch, doesSupportFeature
- `needs`: needsPasswordReset, needsUserAttention, needsApproval
- `must`: mustCompleteForm, mustVerifyIdentity, mustChangePassword
- `includes`: includesSensitiveData, includesAttachments, includesKeywords
- `enables`: enablesDarkMode, enablesNotifications, enablesFeatureX
- `disables`: disablesAutoPlay, disablesPopups, disablesFeatureY
- `supports`: supportsMultipleLanguages, supportsFileUpload, supportsUserRoles
- `allows`: allowsUserLogin, allowsFileUpload, allowsMultipleSessions
- `requires`: requiresAdminApproval, requiresUserConsent, requiresVerification

## Examples

```js
const completed = true; // ❌
const hasCompleted = true; // ✅
```

```js
const completed = progress === 100; // ❌
const hasCompleted = progress === 100; // ✅
```

```js
const adult = age >= 18; // ❌
const isAdult = age >= 18; // ✅
```

```js
const adult = age >= 18 ? true : false; // ❌
const isAdult = age >= 18 ? true : false; // ✅
```

```js
const gotModifyRights = isGotPreviewRights() && isGotDownloadRights(); // ❌
const isGotModifyRights = isGotPreviewRights() && isGotDownloadRights(); // ✅
```

```js
const showingModal = !!modalElement; // ❌
const isShowingModal = !!modalElement; // ✅
```

```js
const showingModal = (this.showingModal = true); // ❌
const isShowingModal = (this.showingModal = true); // ✅
```

```js
const showingModal = (doSomething(), !!modalElement); // ❌
const isShowingModal = (doSomething(), !!modalElement); // ✅
```

```js
// ❌
async function foo() {
  const completed = await progress === 100;
}

// ✅
async function foo() {
  const hasCompleted = await progress === 100;
}
```

```js
// ❌
function* foo() {
  const completed = yield progress === 100;
}

// ✅
function* foo() {
  const hasCompleted = yield progress === 100;
}
```

```js
// ❌
const hasCompleted = true
const downloaded = hasCompleted

// ✅
const hasCompleted = true
const isDownloaded = hasCompleted
```

<!-- Type Annotation -->
## Type Annotation

```js
const completed = hasCompleted as boolean; // ❌
const hasCompleted = hasCompleted as boolean; // ✅
```

```js
const completed = isDownloadDone() as boolean; // ❌
const hasCompleted = isDownloadDone() as boolean; // ✅
```

```js
// ❌
var hasCompleted: boolean
const downloaded = hasCompleted

// ✅
var hasCompleted: boolean
const isDownloaded = hasCompleted
```

```js
// ❌
function hasCompleted(): boolean {}
const downloaded = hasCompleted()

// ✅
function hasCompleted(): boolean {}
const isDownloaded = hasCompleted()
```

```js
function completed(): boolean {} // ❌
function hasCompleted(): boolean {} // ✅
```

```js
const completed = (): boolean => {} // ❌
const hasCompleted = (): boolean => {} // ✅
```

```js
function download(url: string, showProgress: boolean) {} // ❌

function download(url: string, shouldShowProgress: boolean) {} // ✅
```

## Options

You can specify which words can start with the string, and it will be merged with the default value.

```js
{
	'unicorn/better-boolean-variable-names': [
		'error',
		{
			prefixes: ['tracks', 'displays']
		}
	]
}
```

```js
const displaysName = getBooleanFromSomeWhere() // ✅
```
