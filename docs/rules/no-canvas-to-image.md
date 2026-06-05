# no-canvas-to-image

📝 Prefer drawing canvases directly instead of converting them to images.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`CanvasRenderingContext2D#drawImage()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) accepts a canvas as the image source. Converting a canvas to a data URL and loading it as an image, or copying it through `getImageData()` and `putImageData()`, does unnecessary work when the goal is just to draw one canvas onto another.

This rule intentionally checks simple syntactic patterns and does not infer DOM types. For the `toDataURL()` pattern, it only checks identifiers and non-computed property names that contain `canvas`, case-insensitively.

## Examples

```js
// ❌
const image = await loadImage(canvas.toDataURL());
context.drawImage(image, 0, 0);

// ✅
context.drawImage(canvas, 0, 0);
```

```js
// ❌
const imageData = sourceContext.getImageData(0, 0, width, height);
targetContext.putImageData(imageData, 0, 0);

// ✅
targetContext.drawImage(sourceCanvas, 0, 0);
```

```js
// ✅
const imageData = context.getImageData(0, 0, width, height);
imageData.data[0] = 0;
context.putImageData(imageData, 0, 0);
```
