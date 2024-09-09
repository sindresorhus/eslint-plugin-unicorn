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
const isCompleted = true; // ✅
```

```js
const completed = progress === 100; // ❌
const isCompleted = progress === 100; // ✅
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
  const isCompleted = await progress === 100;
}
```

```js
// ❌
function* foo() {
  const completed = yield progress === 100;
}

// ✅
function* foo() {
  const isCompleted = yield progress === 100;
}
```

```js
// ❌
const isCompleted = true
const downloaded = isCompleted

// ✅
const isCompleted = true
const isDownloaded = isCompleted
```

<!-- Type Annotation -->
## Type Annotation

```js
const completed = isCompleted as  boolean; // ❌
const isCompleted = isCompleted as  boolean; // ✅
```

```js
const completed = isCompleted() as  boolean; // ❌
const isCompleted = isCompleted() as  boolean; // ✅
```

```js
// ❌
var isCompleted: boolean
const downloaded = isCompleted

// ✅
var isCompleted: boolean
const isDownloaded = isCompleted
```

```js
// ❌
function isCompleted(): boolean {}
const downloaded = isCompleted()

// ✅
function isCompleted(): boolean {}
const isDownloaded = isCompleted()
```

```js
function completed(): boolean {} // ❌
function isCompleted(): boolean {} // ✅
```

```js
const completed = (): boolean => {} // ❌
const isCompleted = (): boolean => {} // ✅
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
