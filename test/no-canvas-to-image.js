import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'context.drawImage(canvas, 0, 0);',
		'context.drawImage(image, 0, 0);',
		'context.drawImage(await image, 0, 0);',
		'context.drawImage(await loadImage(url), 0, 0);',
		'context.drawImage(await loadImage(...canvas.toDataURL()), 0, 0);',
		'context.drawImage(await loadImage(canvas.toBlob()), 0, 0);',
		'context.drawImage?.(await loadImage(canvas.toDataURL()), 0, 0);',
		'context?.drawImage(await loadImage(canvas.toDataURL()), 0, 0);',
		'context.putImageData(imageData, 0, 0);',
		'context.putImageData(await imageData, 0, 0);',
		'context.putImageData(...context.getImageData(0, 0, width, height));',
		'context.putImageData?.(context.getImageData(0, 0, width, height), 0, 0);',
		'context?.putImageData(context.getImageData(0, 0, width, height), 0, 0);',
		'const url = canvas.toDataURL();',
		'const image = await loadImage(url); context.drawImage(image, 0, 0);',
		'const image = await loadImage(canvas.toBlob()); context.drawImage(image, 0, 0);',
		outdent`
			let image = await loadImage(canvas.toDataURL());
			context.drawImage(image, 0, 0);
		`,
		outdent`
			const image = await loadImage(canvas.toDataURL());
			console.log(image);
			context.drawImage(image, 0, 0);
		`,
		outdent`
			context.drawImage(image, 0, 0);
			const image = await loadImage(canvas.toDataURL());
		`,
		outdent`
			const imageData = context.getImageData(0, 0, width, height);
			imageData.data[0] = 0;
			context.putImageData(imageData, 0, 0);
		`,
		outdent`
			let imageData = context.getImageData(0, 0, width, height);
			otherContext.putImageData(imageData, 0, 0);
		`,
		outdent`
			const imageData = context.getImageData(0, 0, width, height);
			console.log(imageData);
			otherContext.putImageData(imageData, 0, 0);
		`,
		outdent`
			otherContext.putImageData(imageData, 0, 0);
			const imageData = context.getImageData(0, 0, width, height);
		`,
	],
	invalid: [
		'context.drawImage(loadImage(canvas.toDataURL()), 0, 0);',
		'context.drawImage(await loadImage(canvas.toDataURL()), 0, 0);',
		outdent`
			const image = await loadImage(canvas.toDataURL());
			context.drawImage(image, 0, 0);
		`,
		outdent`
			const image = loadImage(canvas.toDataURL('image/jpeg'));
			context.drawImage(await image, 0, 0);
		`,
		'context.putImageData(context.getImageData(0, 0, width, height), 0, 0);',
		'context2.putImageData(context1.getImageData(0, 0, width, height), 0, 0);',
		outdent`
			const imageData = context1.getImageData(0, 0, width, height);
			context2.putImageData(imageData, 0, 0);
		`,
	],
});
