import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const file = new File([blob], "image.jpg");',
		'URL.createObjectURL(blob);',
		'const formData = new FormData();\nformData.append("file", blob, "image.jpg");',
		'const formData = new FormData();\nformData.set("file", blob, "image.jpg");',
		'const file = new File([buffer], "image.jpg");\nURL.createObjectURL(file);',
		'const formData = new FormData();\nconst file = new File(["text"], "text.txt");\nformData.append("file", file);',
		'const file = new File([blob], "image.jpg");\nURL.createObjectURL(file);',
		'const file = new File([imageBlob], "image.jpg");\nURL.createObjectURL(file);',
		'const file = new File([blob, otherBlob], "image.jpg");\nURL.createObjectURL(file);',
		'const file = new File([,], "image.jpg");\nURL.createObjectURL(file);',
		'const file = new File([...blob], "image.jpg");\nURL.createObjectURL(file);',
		'let file = new File([blob], "image.jpg");\nURL.createObjectURL(file);',
		'export const file = new File([blob], "image.jpg");\nURL.createObjectURL(file);',
		'const file = new File([blob], "image.jpg");\nURL.createObjectURL(file);\nconsole.log(file);',
		'const file = new File([blob], "image.jpg");\nformData.append("file", file);',
		'const formData = {append() {}};\nconst file = new File([blob], "image.jpg");\nformData.append("file", file);',
		'const file = new File([blob], "image.jpg");\nURL.revokeObjectURL(file);',
		'const file = new File([blob], "image.jpg");\nURL.createObjectURL?.(file);',
		'const file = new File([blob], "image.jpg");\nURL?.createObjectURL(file);',
		'let blob = new Blob();\nconst file = new File([blob], "image.jpg");\nURL.createObjectURL(file);',
		'const File = class {};\nconst file = new File([blob], "image.jpg");\nURL.createObjectURL(file);',
		'const Blob = class {};\nconst data = new Blob();\nconst file = new File([data], "image.jpg");\nURL.createObjectURL(file);',
		'const URL = {createObjectURL() {}};\nconst file = new File([blob], "image.jpg");\nURL.createObjectURL(file);',
		'for (const file = new File([blob], "image.jpg"); condition;) {\n\tURL.createObjectURL(file);\n}',
		'const file = new File([blob], "image.jpg", {type: "image/jpeg"});\nformData.append("file", file);',
		'const file = new File([blob], {name: "image.jpg"});\nformData.append("file", file);',
		'const blob = new Blob();\nconst file = new File([blob], getName());\nURL.createObjectURL(file);',
		'const blob = new Blob(["x"], {type: "text/plain"});\nconst file = new File([blob], "text.txt");\nURL.createObjectURL(file);',
		'const sourceFile = new File([blob], "source.jpg", {type: "text/plain"});\nconst file = new File([sourceFile], "image.jpg");\nURL.createObjectURL(file);',
		'const file = new File([blob], "image.jpg");\nconst blob = new Blob();\nURL.createObjectURL(file);',
		'const blob = new Blob();\nconst file = new File([blob], "image.jpg"); // Keep comment\nURL.createObjectURL(file);',
		'const blob = new Blob();\nconst file = new File([/* Keep comment */ blob], "image.jpg");\nURL.createObjectURL(file);',
		'const blob = new Blob();\n// eslint-disable-next-line no-restricted-syntax\nconst file = new File([blob], "image.jpg");\nURL.createObjectURL(file);',
		'const blob = new Blob(); /* Keep comment */ const file = new File([blob], "image.jpg");\nURL.createObjectURL(file);',
		'const file = new File([blob], "image.jpg");\n{\n\tconst blob = "not a blob";\n\tURL.createObjectURL(file);\n}',
		'const name = "image.jpg";\nconst formData = new FormData();\nconst file = new File([blob], name);\n{\n\tconst name = "other.jpg";\n\tformData.append("file", file);\n}',
		'let name = "a.jpg";\nconst formData = new FormData();\nconst file = new File([blob], name);\nname = "b.jpg";\nformData.append("file", file);',
		'const formData = new FormData();\nconst file = new File([blob], getName());\nformData.append("file", file);',
	],
	invalid: [
		outdent`
			const blob = new Blob();
			const file = new File([blob], "image.jpg");
			URL.createObjectURL(file);
		`,
		outdent`
			const imageBlob = new Blob();
			const file = new File([imageBlob], "image.jpg");
			URL.createObjectURL(file);
		`,
		outdent`
			const data = new Blob();
			const file = new File([data], "image.jpg");
			URL.createObjectURL(file);
		`,
		outdent`
			const sourceFile = new File([blob], "source.jpg");
			const file = new File([sourceFile], "image.jpg");
			URL.createObjectURL(file);
		`,
		outdent`
			const blob = new Blob();
			const formData = new FormData();
			const file = new File([blob], \`image.jpg\`);
			formData.append("file", file);
		`,
		outdent`
			const blob = new Blob();
			const formData = new FormData();
			const file = new File([blob], "image.jpg");
			formData.set("file", file);
		`,
		outdent`
			const blob = new Blob();
			const formData = new FormData();
			const file = new File([blob], "unused.jpg");
			formData.append("file", file, "image.jpg");
		`,
		outdent`
			const blob = new Blob();
			const formData = new FormData();
			const file = new File([blob], "image.jpg");
			formData.append("file", file);
		`,
		outdent`
			const blob = new Blob();
			const data = new FormData();
			const file = new File([blob], "image.jpg");
			data.append("file", file);
		`,
		outdent`
			const blob = new Blob();
			const formData = new FormData();
			const file = new File([blob], "image.jpg");
			formData.append("file", file, name);
		`,
	],
});
