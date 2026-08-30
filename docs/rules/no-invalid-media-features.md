# no-invalid-media-features

📝 Disallow unknown media features and invalid values for known media features.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): 🎨 `css/recommended`, 🖌️ `css/unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Media query parsers accept unknown feature names and values so that future additions do not invalidate an entire query. A typo therefore silently makes the affected query fail to match.

This rule checks media feature names and validates values for known features. It supports boolean, plain, and range notation, including deprecated standard `device-*` features and features defined in current drafts. Vendor-prefixed features and custom media queries are ignored.

The rule does not validate whether a known feature supports a particular notation. For example, it does not report range notation used with a discrete feature. Media query grammar errors are handled by the CSS parser.

## Examples

```css
/* ❌ */
@media (unknown-feature: 10px) {}

/* ❌ */
@media (width: red) {}

/* ✅ */
@media (width >= 40rem) {}

/* ✅ */
@media (prefers-color-scheme: dark) {}
```

## Standards

The known feature names and value grammars follow [Media Queries Level 5](https://drafts.csswg.org/mediaqueries-5/), the [Device Posture API](https://w3c.github.io/device-posture/), [CSS Round Display](https://drafts.csswg.org/css-round-display/), [Window Management](https://w3c.github.io/window-management/), and the [Window Controls Overlay draft](https://wicg.github.io/window-controls-overlay/).
