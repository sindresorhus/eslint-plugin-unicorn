import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction} from './ast/index.js';
import {isGlobalIdentifier} from './utils/index.js';

const MESSAGE_ID = 'no-invalid-argument-count';
const messages = {
	[MESSAGE_ID]: 'Expected {{expected}}, but got {{actual}}.',
};

const expressionWrapperTypes = new Set([
	'ChainExpression',
	'TSAsExpression',
	'TSTypeAssertion',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSInstantiationExpression',
]);

const globalObjectNames = new Set([
	'globalThis',
	'global',
	'self',
	'window',
]);

const typedArrayNames = [
	'Int8Array',
	'Uint8Array',
	'Uint8ClampedArray',
	'Int16Array',
	'Uint16Array',
	'Int32Array',
	'Uint32Array',
	'Float16Array',
	'Float32Array',
	'Float64Array',
	'BigInt64Array',
	'BigUint64Array',
];

const temporalClassNamesWithFromAndCompare = [
	'Duration',
	'Instant',
	'PlainDate',
	'PlainDateTime',
	'PlainTime',
	'PlainYearMonth',
	'ZonedDateTime',
];

const temporalClassNamesWithFrom = [
	...temporalClassNamesWithFromAndCompare,
	'PlainMonthDay',
];

const domPointClassNames = [
	'DOMPoint',
	'DOMPointReadOnly',
];

const domMatrixClassNames = [
	'DOMMatrix',
	'DOMMatrixReadOnly',
];

const domRectClassNames = [
	'DOMRect',
	'DOMRectReadOnly',
];

const cssNumericFactoryNames = [
	'number',
	'percent',
	'cap',
	'ch',
	'em',
	'ex',
	'ic',
	'lh',
	'rcap',
	'rch',
	'rem',
	'rex',
	'ric',
	'rlh',
	'vw',
	'vh',
	'vi',
	'vb',
	'vmin',
	'vmax',
	'svw',
	'svh',
	'svi',
	'svb',
	'svmin',
	'svmax',
	'lvw',
	'lvh',
	'lvi',
	'lvb',
	'lvmin',
	'lvmax',
	'dvw',
	'dvh',
	'dvi',
	'dvb',
	'dvmin',
	'dvmax',
	'cqw',
	'cqh',
	'cqi',
	'cqb',
	'cqmin',
	'cqmax',
	'cm',
	'mm',
	'Q',
	'in',
	'pt',
	'pc',
	'px',
	'deg',
	'grad',
	'rad',
	'turn',
	's',
	'ms',
	'Hz',
	'kHz',
	'dpi',
	'dpcm',
	'dppx',
	'fr',
];

const eventConstructorNames = [
	'AnimationPlaybackEvent',
	'AnimationEvent',
	'ClipboardEvent',
	'CloseEvent',
	'CommandEvent',
	'CompositionEvent',
	'ContentVisibilityAutoStateChangeEvent',
	'CookieChangeEvent',
	'DeviceMotionEvent',
	'DeviceOrientationEvent',
	'DragEvent',
	'ErrorEvent',
	'FocusEvent',
	'FontFaceSetLoadEvent',
	'GamepadEvent',
	'HashChangeEvent',
	'IDBVersionChangeEvent',
	'InputEvent',
	'KeyboardEvent',
	'MIDIConnectionEvent',
	'MIDIMessageEvent',
	'MediaEncryptedEvent',
	'MediaQueryListEvent',
	'MessageEvent',
	'MouseEvent',
	'PageRevealEvent',
	'PageSwapEvent',
	'PageTransitionEvent',
	'PaymentMethodChangeEvent',
	'PaymentRequestUpdateEvent',
	'PointerEvent',
	'PopStateEvent',
	'ProgressEvent',
	'RTCDTMFToneChangeEvent',
	'RTCPeerConnectionIceEvent',
	'SecurityPolicyViolationEvent',
	'StorageEvent',
	'SubmitEvent',
	'TouchEvent',
	'TransitionEvent',
	'ToggleEvent',
	'TrackEvent',
	'UIEvent',
	'WebGLContextEvent',
	'WheelEvent',
];

const requiredEventConstructorNames = [
	'AudioProcessingEvent',
	'BlobEvent',
	'FormDataEvent',
	'GPUUncapturedErrorEvent',
	'MediaKeyMessageEvent',
	'MediaStreamTrackEvent',
	'NavigateEvent',
	'NavigationCurrentEntryChangeEvent',
	'OfflineAudioCompletionEvent',
	'PictureInPictureEvent',
	'PromiseRejectionEvent',
	'RTCDataChannelEvent',
	'RTCErrorEvent',
	'RTCPeerConnectionIceErrorEvent',
	'RTCTrackEvent',
	'SpeechRecognitionErrorEvent',
	'SpeechRecognitionEvent',
	'SpeechSynthesisErrorEvent',
	'SpeechSynthesisEvent',
	'TaskPriorityChangeEvent',
];

const audioNodeConstructorNames = [
	'AnalyserNode',
	'AudioBufferSourceNode',
	'BiquadFilterNode',
	'ChannelMergerNode',
	'ChannelSplitterNode',
	'ConstantSourceNode',
	'ConvolverNode',
	'DelayNode',
	'DynamicsCompressorNode',
	'GainNode',
	'MediaStreamAudioDestinationNode',
	'OscillatorNode',
	'PannerNode',
	'PeriodicWave',
	'StereoPannerNode',
	'WaveShaperNode',
];

const storageObjectNames = [
	'localStorage',
	'sessionStorage',
];

const intlConstructorsWithSupportedLocalesOf = [
	'Collator',
	'DateTimeFormat',
	'DisplayNames',
	'DurationFormat',
	'ListFormat',
	'NumberFormat',
	'PluralRules',
	'RelativeTimeFormat',
	'Segmenter',
];

const webAssemblyErrorConstructors = [
	'CompileError',
	'LinkError',
	'RuntimeError',
];

const defaultArgumentCounts = {
	AggregateError: {min: 1, max: 3},
	BigInt: 1,
	Boolean: {max: 1},
	Date: 0,
	Error: {max: 3},
	EvalError: {max: 3},
	Number: {max: 1},
	RangeError: {max: 3},
	ReferenceError: {max: 3},
	RegExp: {max: 2},
	String: {max: 1},
	Symbol: {max: 1},
	SyntaxError: {max: 3},
	TypeError: {max: 3},
	URIError: {max: 3},
	addEventListener: {min: 2, max: 3},
	decodeURI: 1,
	decodeURIComponent: 1,
	encodeURI: 1,
	encodeURIComponent: 1,
	escape: 1,
	eval: {max: 1},
	fetch: {min: 1, max: 2},
	isFinite: 1,
	isNaN: 1,
	parseFloat: 1,
	parseInt: {min: 1, max: 2},
	queueMicrotask: 1,
	structuredClone: {min: 1, max: 2},
	SuppressedError: {min: 2, max: 3},
	atob: 1,
	blur: 0,
	btoa: 1,
	clearImmediate: 1,
	close: 0,
	dispatchEvent: 1,
	focus: 0,
	moveBy: 2,
	moveTo: 2,
	open: {max: 3},
	postMessage: {min: 1, max: 3},
	print: 0,
	removeEventListener: {min: 2, max: 3},
	resizeBy: 2,
	resizeTo: 2,
	scroll: {max: 2},
	scrollBy: {max: 2},
	scrollTo: {max: 2},
	setImmediate: {min: 1},
	stop: 0,
	unescape: 1,
	alert: {max: 1},
	cancelAnimationFrame: 1,
	cancelIdleCallback: 1,
	clearInterval: {max: 1},
	clearTimeout: {max: 1},
	confirm: {max: 1},
	createImageBitmap: [1, 2, 5, 6],
	matchMedia: 1,
	prompt: {max: 2},
	reportError: 1,
	requestAnimationFrame: 1,
	requestIdleCallback: {min: 1, max: 2},
	setInterval: {min: 1},
	setTimeout: {min: 1},
	'Buffer.alloc': {min: 1, max: 3},
	'Buffer.allocUnsafe': 1,
	'Buffer.allocUnsafeSlow': 1,
	'Buffer.byteLength': {min: 1, max: 2},
	'Buffer.compare': 2,
	'Buffer.concat': {min: 1, max: 2},
	'Buffer.copyBytesFrom': {min: 1, max: 3},
	'Buffer.from': {min: 1, max: 3},
	'Buffer.isBuffer': 1,
	'Buffer.isEncoding': 1,
	'AbortSignal.abort': {max: 1},
	'AbortSignal.any': 1,
	'AbortSignal.timeout': 1,
	'AudioDecoder.isConfigSupported': 1,
	'AudioEncoder.isConfigSupported': 1,
	'caches.delete': 1,
	'caches.has': 1,
	'caches.keys': 0,
	'caches.match': {min: 1, max: 2},
	'caches.open': 1,
	'crypto.getRandomValues': 1,
	'crypto.randomUUID': 0,
	'crypto.subtle.decrypt': 3,
	'crypto.subtle.deriveBits': {min: 2, max: 3},
	'crypto.subtle.deriveKey': 5,
	'crypto.subtle.digest': 2,
	'crypto.subtle.encrypt': 3,
	'crypto.subtle.exportKey': 2,
	'crypto.subtle.generateKey': 3,
	'crypto.subtle.importKey': 5,
	'crypto.subtle.sign': 3,
	'crypto.subtle.unwrapKey': 7,
	'crypto.subtle.verify': 4,
	'crypto.subtle.wrapKey': 4,
	'CSS.escape': 1,
	'CSSNumericValue.parse': 1,
	'CSS.registerProperty': 1,
	'CSSStyleValue.parse': 2,
	'CSSStyleValue.parseAll': 2,
	'CSS.supports': [1, 2],
	'console.clear': 0,
	'console.count': {max: 1},
	'console.countReset': {max: 1},
	'console.dir': {max: 2},
	'console.groupEnd': 0,
	'console.table': {max: 2},
	'console.time': {max: 1},
	'console.timeEnd': {max: 1},
	'console.timeStamp': {max: 1},
	'customElements.define': {min: 2, max: 3},
	'customElements.get': 1,
	'customElements.getName': 1,
	'customElements.upgrade': 1,
	'customElements.whenDefined': 1,
	'document.adoptNode': 1,
	'document.captureEvents': 0,
	'document.caretPositionFromPoint': {min: 2, max: 3},
	'document.caretRangeFromPoint': 2,
	'document.clear': 0,
	'document.close': 0,
	'document.createAttribute': 1,
	'document.createAttributeNS': 2,
	'document.createCDATASection': 1,
	'document.createComment': 1,
	'document.createDocumentFragment': 0,
	'document.createElement': {min: 1, max: 2},
	'document.createElementNS': {min: 2, max: 3},
	'document.createEvent': 1,
	'document.createNodeIterator': {min: 1, max: 3},
	'document.createNSResolver': 1,
	'document.createProcessingInstruction': 2,
	'document.createRange': 0,
	'document.createTextNode': 1,
	'document.createTreeWalker': {min: 1, max: 3},
	'document.elementFromPoint': 2,
	'document.elementsFromPoint': 2,
	'document.execCommand': {min: 1, max: 3},
	'document.exitFullscreen': 0,
	'document.exitPictureInPicture': 0,
	'document.exitPointerLock': 0,
	'document.getElementById': 1,
	'document.getElementsByClassName': 1,
	'document.getElementsByName': 1,
	'document.getElementsByTagName': 1,
	'document.getElementsByTagNameNS': 2,
	'document.getSelection': 0,
	'document.hasFocus': 0,
	'document.hasStorageAccess': 0,
	'document.importNode': {min: 1, max: 2},
	'document.open': {max: 3},
	'document.queryCommandEnabled': 1,
	'document.queryCommandIndeterm': 1,
	'document.queryCommandState': 1,
	'document.queryCommandSupported': 1,
	'document.queryCommandValue': 1,
	'document.querySelector': 1,
	'document.querySelectorAll': 1,
	'document.releaseEvents': 0,
	'document.requestStorageAccess': 0,
	'document.startViewTransition': {max: 1},
	getSelection: 0,
	'cookieStore.delete': 1,
	'cookieStore.get': {max: 1},
	'cookieStore.getAll': {max: 1},
	'cookieStore.set': [1, 2],
	'history.back': 0,
	'history.forward': 0,
	'history.go': {max: 1},
	'history.pushState': {min: 2, max: 3},
	'history.replaceState': {min: 2, max: 3},
	'ImageDecoder.isTypeSupported': 1,
	'IDBKeyRange.bound': {min: 2, max: 4},
	'IDBKeyRange.lowerBound': {min: 1, max: 2},
	'IDBKeyRange.only': 1,
	'IDBKeyRange.upperBound': {min: 1, max: 2},
	'indexedDB.cmp': 2,
	'indexedDB.databases': 0,
	'indexedDB.deleteDatabase': {min: 1, max: 2},
	'indexedDB.open': {min: 1, max: 2},
	'location.assign': 1,
	'location.reload': 0,
	'location.replace': 1,
	'MediaRecorder.isTypeSupported': 1,
	'MediaSource.isTypeSupported': 1,
	'navigation.back': {max: 1},
	'navigation.entries': 0,
	'navigation.forward': {max: 1},
	'navigation.navigate': {min: 1, max: 2},
	'navigation.reload': {max: 1},
	'navigation.traverseTo': {min: 1, max: 2},
	'navigation.updateCurrentEntry': 1,
	'navigator.canShare': {max: 1},
	'navigator.clearAppBadge': 0,
	'navigator.clipboard.read': {max: 1},
	'navigator.clipboard.readText': 0,
	'navigator.clipboard.write': 1,
	'navigator.clipboard.writeText': 1,
	'navigator.credentials.create': {max: 1},
	'navigator.credentials.get': {max: 1},
	'navigator.credentials.preventSilentAccess': 0,
	'navigator.credentials.store': 1,
	'navigator.geolocation.clearWatch': 1,
	'navigator.geolocation.getCurrentPosition': {min: 1, max: 3},
	'navigator.geolocation.watchPosition': {min: 1, max: 3},
	'navigator.getGamepads': 0,
	'navigator.gpu.getPreferredCanvasFormat': 0,
	'navigator.gpu.requestAdapter': {max: 1},
	'navigator.javaEnabled': 0,
	'navigator.locks.query': 0,
	'navigator.mediaSession.setActionHandler': 2,
	'navigator.mediaSession.setCameraActive': 1,
	'navigator.mediaSession.setMicrophoneActive': 1,
	'navigator.mediaSession.setPositionState': {max: 1},
	'navigator.mediaSession.setScreenshareActive': 1,
	'navigator.locks.request': [2, 3],
	'navigator.mediaDevices.enumerateDevices': 0,
	'navigator.mediaDevices.getDisplayMedia': {max: 1},
	'navigator.mediaDevices.getUserMedia': 1,
	'navigator.permissions.query': 1,
	'navigator.registerProtocolHandler': 2,
	'navigator.requestMediaKeySystemAccess': 2,
	'navigator.requestMIDIAccess': {max: 1},
	'navigator.scheduling.isInputPending': {max: 1},
	'navigator.serviceWorker.getRegistration': {max: 1},
	'navigator.serviceWorker.getRegistrations': 0,
	'navigator.serviceWorker.register': {min: 1, max: 2},
	'navigator.setAppBadge': {max: 1},
	'navigator.share': {max: 1},
	'navigator.storage.estimate': 0,
	'navigator.storage.getDirectory': 0,
	'navigator.storage.persist': 0,
	'navigator.storage.persisted': 0,
	'navigator.vibrate': 1,
	'navigator.wakeLock.request': {max: 1},
	'Notification.requestPermission': {max: 1},
	'PublicKeyCredential.getClientCapabilities': 0,
	'PublicKeyCredential.isConditionalMediationAvailable': 0,
	'PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable': 0,
	'PublicKeyCredential.parseCreationOptionsFromJSON': 1,
	'PublicKeyCredential.parseRequestOptionsFromJSON': 1,
	'PublicKeyCredential.signalAllAcceptedCredentials': 1,
	'PublicKeyCredential.signalCurrentUserDetails': 1,
	'PublicKeyCredential.signalUnknownCredential': 1,
	'trustedTypes.createPolicy': {min: 1, max: 2},
	'trustedTypes.getAttributeType': {min: 2, max: 4},
	'trustedTypes.getPropertyType': {min: 2, max: 3},
	'trustedTypes.isHTML': 1,
	'trustedTypes.isScript': 1,
	'trustedTypes.isScriptURL': 1,
	'Array.from': {min: 1, max: 3},
	'Array.fromAsync': {min: 1, max: 3},
	'Array.isArray': 1,
	'ArrayBuffer.isView': 1,
	'Atomics.add': 3,
	'Atomics.and': 3,
	'Atomics.compareExchange': 4,
	'Atomics.exchange': 3,
	'Atomics.isLockFree': 1,
	'Atomics.load': 2,
	'Atomics.notify': {min: 2, max: 3},
	'Atomics.or': 3,
	'Atomics.pause': {max: 1},
	'Atomics.store': 3,
	'Atomics.sub': 3,
	'Atomics.wait': {min: 3, max: 4},
	'Atomics.waitAsync': {min: 3, max: 4},
	'Atomics.xor': 3,
	'BigInt.asIntN': 2,
	'BigInt.asUintN': 2,
	'Date.now': 0,
	'Date.parse': 1,
	'Date.UTC': {min: 1, max: 7},
	'Intl.Collator': {max: 2},
	'Intl.DateTimeFormat': {max: 2},
	...Object.fromEntries(intlConstructorsWithSupportedLocalesOf.map(name => [`Intl.${name}.supportedLocalesOf`, {max: 2}])),
	'Intl.getCanonicalLocales': {max: 1},
	'Intl.NumberFormat': {max: 2},
	'Intl.supportedValuesOf': 1,
	'Iterator.from': 1,
	'JSON.isRawJSON': 1,
	'JSON.parse': {min: 1, max: 2},
	'JSON.rawJSON': 1,
	'JSON.stringify': {min: 1, max: 3},
	'Map.groupBy': 2,
	'Math.abs': 1,
	'Math.acos': 1,
	'Math.acosh': 1,
	'Math.asin': 1,
	'Math.asinh': 1,
	'Math.atan': 1,
	'Math.atan2': 2,
	'Math.atanh': 1,
	'Math.cbrt': 1,
	'Math.ceil': 1,
	'Math.clz32': 1,
	'Math.cos': 1,
	'Math.cosh': 1,
	'Math.exp': 1,
	'Math.expm1': 1,
	'Math.floor': 1,
	'Math.f16round': 1,
	'Math.fround': 1,
	'Math.imul': 2,
	'Math.log': 1,
	'Math.log1p': 1,
	'Math.log10': 1,
	'Math.log2': 1,
	'Math.pow': 2,
	'Math.random': 0,
	'Math.round': 1,
	'Math.sign': 1,
	'Math.sin': 1,
	'Math.sinh': 1,
	'Math.sqrt': 1,
	'Math.sumPrecise': 1,
	'Math.tan': 1,
	'Math.tanh': 1,
	'Math.trunc': 1,
	'navigator.sendBeacon': {min: 1, max: 2},
	'Number.isFinite': 1,
	'Number.isInteger': 1,
	'Number.isNaN': 1,
	'Number.isSafeInteger': 1,
	'Number.parseFloat': 1,
	'Number.parseInt': {min: 1, max: 2},
	'Object.assign': {min: 1},
	'Object.create': {min: 1, max: 2},
	'Object.defineProperties': 2,
	'Object.defineProperty': 3,
	'Object.entries': 1,
	'Object.freeze': 1,
	'Object.fromEntries': 1,
	'Object.getOwnPropertyDescriptor': 2,
	'Object.getOwnPropertyDescriptors': 1,
	'Object.getOwnPropertyNames': 1,
	'Object.getOwnPropertySymbols': 1,
	'Object.getPrototypeOf': 1,
	'Object.groupBy': 2,
	'Object.hasOwn': 2,
	'Object.is': 2,
	'Object.isExtensible': 1,
	'Object.isFrozen': 1,
	'Object.isSealed': 1,
	'Object.keys': 1,
	'Object.preventExtensions': 1,
	'Object.seal': 1,
	'Object.setPrototypeOf': 2,
	'Object.values': 1,
	'performance.clearMarks': {max: 1},
	'performance.clearMeasures': {max: 1},
	'performance.clearResourceTimings': 0,
	'performance.getEntries': 0,
	'performance.getEntriesByName': {min: 1, max: 2},
	'performance.getEntriesByType': 1,
	'performance.mark': {min: 1, max: 2},
	'performance.measure': {min: 1, max: 3},
	'performance.now': 0,
	'performance.setResourceTimingBufferSize': 1,
	'performance.toJSON': 0,
	'Promise.all': 1,
	'Promise.allSettled': 1,
	'Promise.any': 1,
	'Promise.race': 1,
	'Promise.reject': {max: 1},
	'Promise.resolve': {max: 1},
	'Promise.try': {min: 1},
	'Promise.withResolvers': 0,
	'process.abort': 0,
	'process.availableMemory': 0,
	'process.chdir': 1,
	'process.constrainedMemory': 0,
	'process.cpuUsage': {max: 1},
	'process.cwd': 0,
	'process.disconnect': 0,
	'process.dlopen': {min: 2, max: 3},
	'process.emitWarning': {min: 1, max: 4},
	'process.execve': {min: 1, max: 3},
	'process.exit': {max: 1},
	'process.finalization.register': 2,
	'process.finalization.registerBeforeExit': 2,
	'process.finalization.unregister': 1,
	'process.getActiveResourcesInfo': 0,
	'process.getBuiltinModule': 1,
	'process.getegid': 0,
	'process.geteuid': 0,
	'process.getgid': 0,
	'process.getgroups': 0,
	'process.getuid': 0,
	'process.hasUncaughtExceptionCaptureCallback': 0,
	'process.hrtime': {max: 1},
	'process.hrtime.bigint': 0,
	'process.initgroups': 2,
	'process.kill': {min: 1, max: 2},
	'process.loadEnvFile': {max: 1},
	'process.memoryUsage': 0,
	'process.memoryUsage.rss': 0,
	'process.nextTick': {min: 1},
	'process.permission.has': {min: 1, max: 2},
	'process.ref': 1,
	'process.report.getReport': {max: 1},
	'process.report.writeReport': {max: 2},
	'process.resourceUsage': 0,
	'process.send': {min: 1, max: 4},
	'process.setegid': 1,
	'process.seteuid': 1,
	'process.setgid': 1,
	'process.setgroups': 1,
	'process.setSourceMapsEnabled': 1,
	'process.setuid': 1,
	'process.setUncaughtExceptionCaptureCallback': 1,
	'process.threadCpuUsage': {max: 1},
	'process.umask': {max: 1},
	'process.unref': 1,
	'process.uptime': 0,
	'Reflect.apply': 3,
	'Reflect.construct': {min: 2, max: 3},
	'Reflect.defineProperty': 3,
	'Reflect.deleteProperty': 2,
	'Reflect.get': {min: 2, max: 3},
	'Reflect.getOwnPropertyDescriptor': 2,
	'Reflect.getPrototypeOf': 1,
	'Reflect.has': 2,
	'Reflect.isExtensible': 1,
	'Reflect.ownKeys': 1,
	'Reflect.preventExtensions': 1,
	'Reflect.set': {min: 3, max: 4},
	'Reflect.setPrototypeOf': 2,
	'RegExp.escape': 1,
	'scheduler.postTask': {min: 1, max: 2},
	'scheduler.yield': 0,
	'screen.orientation.lock': 1,
	'screen.orientation.unlock': 0,
	'speechSynthesis.cancel': 0,
	'speechSynthesis.getVoices': 0,
	'speechSynthesis.pause': 0,
	'speechSynthesis.resume': 0,
	'speechSynthesis.speak': 1,
	'Symbol.for': 1,
	'Symbol.keyFor': 1,
	'String.raw': {min: 1},
	'Response.error': 0,
	'Response.json': {min: 1, max: 2},
	'Response.redirect': {min: 1, max: 2},
	'Temporal.Instant.fromEpochMilliseconds': 1,
	'Temporal.Instant.fromEpochNanoseconds': 1,
	'Temporal.Now.instant': 0,
	'Temporal.Now.plainDateISO': {max: 1},
	'Temporal.Now.plainDateTimeISO': {max: 1},
	'Temporal.Now.plainTimeISO': {max: 1},
	'Temporal.Now.timeZoneId': 0,
	'Temporal.Now.zonedDateTimeISO': {max: 1},
	'URL.canParse': {min: 1, max: 2},
	'URL.createObjectURL': 1,
	'URL.parse': {min: 1, max: 2},
	'URL.revokeObjectURL': 1,
	'VideoDecoder.isConfigSupported': 1,
	'VideoEncoder.isConfigSupported': 1,
	'WebAssembly.compile': {min: 1, max: 2},
	'WebAssembly.compileStreaming': {min: 1, max: 2},
	'WebAssembly.instantiate': {min: 1, max: 3},
	'WebAssembly.instantiateStreaming': {min: 1, max: 3},
	'WebAssembly.Module.customSections': 2,
	'WebAssembly.Module.exports': 1,
	'WebAssembly.Module.imports': 1,
	'WebAssembly.validate': {min: 1, max: 2},
	...Object.fromEntries(cssNumericFactoryNames.map(name => [`CSS.${name}`, 1])),
	...Object.fromEntries(domPointClassNames.map(name => [`${name}.fromPoint`, {max: 1}])),
	...Object.fromEntries(domMatrixClassNames.flatMap(name => [
		[`${name}.fromFloat32Array`, 1],
		[`${name}.fromFloat64Array`, 1],
		[`${name}.fromMatrix`, {max: 1}],
	])),
	...Object.fromEntries(domRectClassNames.map(name => [`${name}.fromRect`, {max: 1}])),
	...Object.fromEntries(storageObjectNames.flatMap(name => [
		[`${name}.clear`, 0],
		[`${name}.getItem`, 1],
		[`${name}.key`, 1],
		[`${name}.removeItem`, 1],
		[`${name}.setItem`, 2],
	])),
	...Object.fromEntries(temporalClassNamesWithFrom.map(name => [`Temporal.${name}.from`, name === 'Duration' || name === 'Instant' ? 1 : {min: 1, max: 2}])),
	...Object.fromEntries(temporalClassNamesWithFromAndCompare.map(name => [`Temporal.${name}.compare`, name === 'Duration' ? {min: 2, max: 3} : 2])),
	...Object.fromEntries(typedArrayNames.map(name => [`${name}.from`, {min: 1, max: 3}])),
	'new AbortController': 0,
	'new AggregateError': {min: 1, max: 3},
	'new Animation': {max: 2},
	'new ArrayBuffer': {min: 1, max: 2},
	'new AsyncDisposableStack': 0,
	'new Audio': {max: 1},
	'new AudioBuffer': 1,
	'new AudioContext': {max: 1},
	'new AudioData': 1,
	'new AudioDecoder': 1,
	'new AudioEncoder': 1,
	'new AudioWorkletNode': {min: 2, max: 3},
	'new Blob': {max: 2},
	'new Boolean': {max: 1},
	'new Buffer': {min: 1, max: 3},
	'new BroadcastChannel': 1,
	'new ByteLengthQueuingStrategy': 1,
	'new ClipboardItem': {min: 1, max: 2},
	'new CompressionStream': 1,
	'new Comment': {max: 1},
	'new CountQueuingStrategy': 1,
	'new CustomEvent': {min: 1, max: 2},
	'new CSSKeywordValue': 1,
	'new CSSMathClamp': 3,
	'new CSSMathInvert': 1,
	'new CSSMathNegate': 1,
	'new CSSMatrixComponent': {min: 1, max: 2},
	'new CSSPerspective': 1,
	'new CSSRotate': [1, 4],
	'new CSSScale': {min: 2, max: 3},
	'new CSSSkew': 2,
	'new CSSSkewX': 1,
	'new CSSSkewY': 1,
	'new CSSStyleSheet': {max: 1},
	'new CSSTransformValue': 1,
	'new CSSTranslate': {min: 2, max: 3},
	'new CSSUnitValue': 2,
	'new CSSUnparsedValue': 1,
	'new CSSVariableReferenceValue': {min: 1, max: 2},
	'new DataView': {min: 1, max: 3},
	'new DataTransfer': 0,
	'new DecompressionStream': 1,
	'new Date': {max: 7},
	'new DocumentFragment': 0,
	'new DocumentTimeline': {max: 1},
	'new DOMMatrix': {max: 1},
	'new DOMMatrixReadOnly': {max: 1},
	'new DOMException': {max: 2},
	'new DOMPoint': {max: 4},
	'new DOMPointReadOnly': {max: 4},
	'new DOMQuad': {max: 4},
	'new DOMRect': {max: 4},
	'new DOMRectReadOnly': {max: 4},
	'new DOMParser': 0,
	'new DisposableStack': 0,
	'new EncodedAudioChunk': 1,
	'new EncodedVideoChunk': 1,
	'new Error': {max: 3},
	'new Event': {min: 1, max: 2},
	'new EventSource': {min: 1, max: 2},
	'new EventTarget': 0,
	'new EvalError': {max: 3},
	'new File': {min: 2, max: 3},
	'new FileReader': 0,
	'new FinalizationRegistry': 1,
	'new FontFace': {min: 2, max: 3},
	'new FormData': {max: 2},
	'new GPUInternalError': 1,
	'new GPUOutOfMemoryError': 1,
	'new GPUPipelineError': 2,
	'new GPUValidationError': 1,
	'new Headers': {max: 1},
	'new Image': {max: 2},
	'new ImageCapture': 1,
	'new ImageData': [2, 3, 4],
	'new ImageDecoder': 1,
	'new IIRFilterNode': 2,
	'new IntersectionObserver': {min: 1, max: 2},
	'new Intl.Collator': {max: 2},
	'new Intl.DateTimeFormat': {max: 2},
	'new Intl.DisplayNames': 2,
	'new Intl.DurationFormat': {max: 2},
	'new Intl.ListFormat': {max: 2},
	'new Intl.Locale': {min: 1, max: 2},
	'new Intl.NumberFormat': {max: 2},
	'new Intl.PluralRules': {max: 2},
	'new Intl.RelativeTimeFormat': {max: 2},
	'new Intl.Segmenter': {max: 2},
	'new KeyframeEffect': {min: 1, max: 3},
	'new Map': {max: 1},
	'new MessageChannel': 0,
	'new MediaElementAudioSourceNode': 2,
	'new MediaMetadata': {max: 1},
	'new MediaRecorder': {min: 1, max: 2},
	'new MutationObserver': 1,
	'new MediaSource': 0,
	'new MediaStream': {max: 1},
	'new MediaStreamAudioSourceNode': 2,
	'new Notification': {min: 1, max: 2},
	'new OfflineAudioContext': [1, 3],
	'new OffscreenCanvas': 2,
	'new Option': {max: 4},
	'new OverconstrainedError': {min: 1, max: 2},
	'new Number': {max: 1},
	'new Path2D': {max: 1},
	'new PaymentRequest': {min: 2, max: 3},
	'new PerformanceMark': {min: 1, max: 2},
	'new PerformanceObserver': 1,
	'new Promise': 1,
	'new Proxy': 2,
	'new Range': 0,
	'new RangeError': {max: 3},
	'new ReadableStream': {max: 2},
	'new ReadableStreamBYOBReader': 1,
	'new ReferenceError': {max: 3},
	'new RegExp': {max: 2},
	'new ReportingObserver': {min: 1, max: 2},
	'new Request': {min: 1, max: 2},
	'new ResizeObserver': 1,
	'new Response': {max: 2},
	'new RTCError': {min: 1, max: 2},
	'new RTCIceCandidate': {max: 1},
	'new RTCPeerConnection': {max: 1},
	'new RTCRtpScriptTransform': {min: 1, max: 3},
	'new RTCSessionDescription': 1,
	'new Sanitizer': {max: 1},
	'new ScrollTimeline': {max: 1},
	'new Set': {max: 1},
	'new SharedArrayBuffer': {min: 1, max: 2},
	'new SpeechSynthesisUtterance': {max: 1},
	'new String': {max: 1},
	'new StaticRange': 1,
	'new SuppressedError': {min: 2, max: 3},
	'new SyntaxError': {max: 3},
	'new TaskController': {max: 1},
	'new Temporal.Duration': {max: 10},
	'new Temporal.Instant': 1,
	'new Temporal.PlainDate': {min: 3, max: 4},
	'new Temporal.PlainDateTime': {min: 3, max: 10},
	'new Temporal.PlainMonthDay': {min: 2, max: 4},
	'new Temporal.PlainTime': {max: 6},
	'new Temporal.PlainYearMonth': {min: 2, max: 4},
	'new Temporal.ZonedDateTime': {min: 2, max: 3},
	'new TextDecoder': {max: 2},
	'new TextDecoderStream': {max: 2},
	'new TextEncoder': 0,
	'new TextEncoderStream': 0,
	'new Text': {max: 1},
	'new Touch': 1,
	'new TransformStream': {max: 3},
	'new TypeError': {max: 3},
	'new URIError': {max: 3},
	'new URL': {min: 1, max: 2},
	'new URLPattern': {max: 3},
	'new URLSearchParams': {max: 1},
	'new VideoColorSpace': {max: 1},
	'new VideoDecoder': 1,
	'new VideoEncoder': 1,
	'new VideoFrame': {min: 1, max: 2},
	'new ViewTimeline': {max: 1},
	'new VTTCue': 3,
	'new VTTRegion': 0,
	'new WebSocket': {min: 1, max: 2},
	'new WebTransport': {min: 1, max: 2},
	'new WebTransportError': {max: 2},
	'new WebAssembly.Exception': {min: 2, max: 3},
	'new WebAssembly.Global': {min: 1, max: 2},
	'new WebAssembly.Instance': {min: 1, max: 2},
	'new WebAssembly.Memory': 1,
	'new WebAssembly.Module': {min: 1, max: 2},
	'new WebAssembly.Table': {min: 1, max: 2},
	'new WebAssembly.Tag': 1,
	'new WeakMap': {max: 1},
	'new WeakRef': 1,
	'new WeakSet': {max: 1},
	'new Worker': {min: 1, max: 2},
	'new WritableStream': {max: 2},
	'new XMLHttpRequest': 0,
	'new XPathEvaluator': 0,
	'new XMLSerializer': 0,
	'new XSLTProcessor': 0,
	'new SharedWorker': {min: 1, max: 2},
	...Object.fromEntries(eventConstructorNames.map(name => [`new ${name}`, {min: 1, max: 2}])),
	...Object.fromEntries(requiredEventConstructorNames.map(name => [`new ${name}`, 2])),
	...Object.fromEntries(audioNodeConstructorNames.map(name => [`new ${name}`, {min: 1, max: 2}])),
	...Object.fromEntries(typedArrayNames.map(name => [`new ${name}`, {max: 3}])),
	...Object.fromEntries(webAssemblyErrorConstructors.map(name => [`new WebAssembly.${name}`, {max: 3}])),
};

const formatArgumentCount = count => `${count} ${count === 1 ? 'argument' : 'arguments'}`;

const unwrapExpression = node => {
	while (expressionWrapperTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const isThisParameter = parameter =>
	parameter?.type === 'Identifier'
	&& parameter.name === 'this';

const isOptionalParameter = parameter =>
	parameter.type === 'AssignmentPattern'
	|| parameter.type === 'RestElement'
	|| parameter.optional === true;

const getArity = functionNode => {
	const parameters = isThisParameter(functionNode.params[0])
		? functionNode.params.slice(1)
		: functionNode.params;
	let minimum = parameters.length;
	let hasRest = false;

	for (const parameter of parameters.toReversed()) {
		if (parameter.type === 'RestElement') {
			hasRest = true;
		}

		if (!isOptionalParameter(parameter)) {
			break;
		}

		minimum--;
	}

	return {
		minimum,
		maximum: hasRest ? Infinity : parameters.length,
	};
};

const hasWriteReference = variable => variable.references.some(reference =>
	!reference.init
	&& reference.isWrite());

const getFunctionNodeFromVariable = variable => {
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;

	if (definition.type === 'FunctionName') {
		if (hasWriteReference(variable)) {
			return;
		}

		return definition.node.body ? definition.node : undefined;
	}

	if (definition.type !== 'Variable') {
		return;
	}

	const {node} = definition;
	const init = node.init && unwrapExpression(node.init);
	if (
		node.parent.kind !== 'const'
		|| !init
		|| !isFunction(init)
	) {
		return;
	}

	return init;
};

const getFunctionNode = (callExpression, sourceCode) => {
	const callee = unwrapExpression(callExpression.callee);

	if (isFunction(callee)) {
		return callee;
	}

	if (callee.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(sourceCode.getScope(callee), callee);
	return getFunctionNodeFromVariable(variable);
};

// Only too-many-arguments is reported for user-defined functions, so this only ever describes an upper bound.
const getExpectedText = ({minimum, maximum}) =>
	minimum === maximum
		? formatArgumentCount(maximum)
		: `at most ${formatArgumentCount(maximum)}`;

const hasInvalidArgumentCount = ({minimum, maximum}, argumentCount) =>
	argumentCount < minimum || argumentCount > maximum;

const joinAllowedCounts = counts => {
	const formattedCounts = [...counts]
		.toSorted((left, right) => left - right)
		.map(count => formatArgumentCount(count));

	if (formattedCounts.length === 1) {
		return formattedCounts[0];
	}

	if (formattedCounts.length === 2) {
		return `${formattedCounts[0]} or ${formattedCounts[1]}`;
	}

	return `${formattedCounts.slice(0, -1).join(', ')}, or ${formattedCounts.at(-1)}`;
};

const normalizeArgumentCount = value => {
	if (typeof value === 'number') {
		return {
			allowedCounts: new Set([value]),
			minimum: value,
			maximum: value,
		};
	}

	if (Array.isArray(value)) {
		return {
			allowedCounts: new Set(value),
			minimum: Math.min(...value),
			maximum: Math.max(...value),
		};
	}

	const minimum = value.min ?? 0;
	const maximum = value.max ?? Infinity;

	if (minimum > maximum) {
		throw new TypeError('`min` must be less than or equal to `max`.');
	}

	return {
		minimum,
		maximum,
	};
};

const getConfiguredExpectedText = expectedArgumentCount => {
	const {allowedCounts, minimum, maximum} = expectedArgumentCount;

	if (allowedCounts) {
		return joinAllowedCounts(allowedCounts);
	}

	if (minimum === maximum) {
		return formatArgumentCount(minimum);
	}

	if (minimum === 0) {
		return `at most ${formatArgumentCount(maximum)}`;
	}

	if (maximum === Infinity) {
		return `at least ${formatArgumentCount(minimum)}`;
	}

	return `between ${minimum} and ${formatArgumentCount(maximum)}`;
};

const hasSpreadArgument = callArguments =>
	callArguments.some(argument => argument.type === 'SpreadElement');

const getNonSpreadArgumentCount = callArguments =>
	callArguments.filter(argument => argument.type !== 'SpreadElement').length;

const isConfiguredArgumentCountInvalid = (expectedArgumentCount, callArguments) => {
	if (hasSpreadArgument(callArguments)) {
		return Boolean(expectedArgumentCount.allowedCounts)
			|| expectedArgumentCount.maximum !== Infinity
			|| getNonSpreadArgumentCount(callArguments) < expectedArgumentCount.minimum;
	}

	return expectedArgumentCount.allowedCounts
		? !expectedArgumentCount.allowedCounts.has(callArguments.length)
		: hasInvalidArgumentCount(expectedArgumentCount, callArguments.length);
};

// Collects the dotted callee path and its root node without resolving any scope.
const getCalleeRawPath = node => {
	node = unwrapExpression(node);

	const parts = [];
	while (node.type === 'MemberExpression' && !node.computed) {
		if (node.property.type !== 'Identifier') {
			return;
		}

		parts.unshift(node.property.name);
		node = unwrapExpression(node.object);
	}

	if (node.type === 'Identifier') {
		parts.unshift(node.name);
		return {parts, root: node};
	}

	if (node.type === 'ThisExpression') {
		parts.unshift('this');
		return {parts, root: node};
	}
};

const stripGlobalObjectNames = parts => {
	let start = 0;
	while (start < parts.length - 1 && globalObjectNames.has(parts[start])) {
		start++;
	}

	return start === 0 ? parts : parts.slice(start);
};

const isMatchingParts = (pathParts, patternParts) =>
	pathParts.length === patternParts.length
	&& patternParts.every((part, index) => part === '*' || pathParts[index] === part);

const parsePattern = pattern => {
	if (pattern.startsWith('new ')) {
		return {
			type: 'NewExpression',
			pattern: pattern.slice(4),
		};
	}

	return {
		type: 'CallExpression',
		pattern,
	};
};

const createConfiguredArgumentCountEntries = (customArgumentCounts = {}) => {
	const customPatterns = new Set(Object.keys(customArgumentCounts));
	const entries = [];

	for (const [pattern, expectedArgumentCount] of Object.entries(defaultArgumentCounts)) {
		if (!customPatterns.has(pattern)) {
			entries.push({
				...parsePattern(pattern),
				expectedArgumentCount: normalizeArgumentCount(expectedArgumentCount),
				checkGlobal: !pattern.startsWith('*.'),
			});
		}
	}

	for (const [pattern, expectedArgumentCount] of Object.entries(customArgumentCounts)) {
		entries.push({
			...parsePattern(pattern),
			expectedArgumentCount: normalizeArgumentCount(expectedArgumentCount),
			checkGlobal: Object.hasOwn(defaultArgumentCounts, pattern) && !pattern.startsWith('*.'),
		});
	}

	return entries;
};

const createBuckets = () => ({
	exactGlobal: new Map(),
	exactLocal: new Map(),
	wildcardGlobal: [],
	wildcardLocal: [],
});

// Indexes the entries by expression type for O(1) exact-pattern lookups, keeping each
// entry's original position so the first matching entry still wins.
const buildLookup = entries => {
	const lookup = {
		CallExpression: createBuckets(),
		NewExpression: createBuckets(),
	};

	for (const [index, entry] of entries.entries()) {
		const buckets = lookup[entry.type];
		const indexedEntry = {...entry, index};

		if (entry.pattern.includes('*')) {
			indexedEntry.patternParts = entry.pattern.split('.');
			(entry.checkGlobal ? buckets.wildcardGlobal : buckets.wildcardLocal).push(indexedEntry);
		} else {
			(entry.checkGlobal ? buckets.exactGlobal : buckets.exactLocal).set(entry.pattern, indexedEntry);
		}
	}

	return lookup;
};

const getConfiguredArgumentCountProblem = (expression, lookup, context) => {
	const calleePath = getCalleeRawPath(expression.callee);
	if (!calleePath) {
		return;
	}

	const {parts, root} = calleePath;
	const buckets = lookup[expression.type];
	const candidates = [];

	// Local patterns match the raw path, without resolving scope.
	if (buckets.exactLocal.size > 0 || buckets.wildcardLocal.length > 0) {
		const entry = buckets.exactLocal.get(parts.join('.'));
		if (entry) {
			candidates.push(entry);
		}

		for (const wildcardEntry of buckets.wildcardLocal) {
			if (isMatchingParts(parts, wildcardEntry.patternParts)) {
				candidates.push(wildcardEntry);
			}
		}
	}

	// Global patterns match the path with leading global-object names stripped, and only
	// when the root identifier truly refers to a global binding. The scope lookup is
	// deferred until a pattern actually matches, since that is rare in real code.
	if (
		root.type === 'Identifier'
		&& (buckets.exactGlobal.size > 0 || buckets.wildcardGlobal.length > 0)
	) {
		const globalParts = stripGlobalObjectNames(parts);
		const globalCandidates = [];

		const entry = buckets.exactGlobal.get(globalParts.join('.'));
		if (entry) {
			globalCandidates.push(entry);
		}

		for (const wildcardEntry of buckets.wildcardGlobal) {
			if (isMatchingParts(globalParts, wildcardEntry.patternParts)) {
				globalCandidates.push(wildcardEntry);
			}
		}

		if (globalCandidates.length > 0 && isGlobalIdentifier(root, context)) {
			candidates.push(...globalCandidates);
		}
	}

	if (candidates.length === 0) {
		return;
	}

	// Local candidates are collected before global ones, so restore the original entry
	// order to keep the first configured pattern winning.
	candidates.sort((left, right) => left.index - right.index);

	for (const entry of candidates) {
		if (!isConfiguredArgumentCountInvalid(entry.expectedArgumentCount, expression.arguments)) {
			continue;
		}

		return {
			node: expression.callee,
			messageId: MESSAGE_ID,
			data: {
				expected: getConfiguredExpectedText(entry.expectedArgumentCount),
				actual: hasSpreadArgument(expression.arguments)
					? 'a spread argument'
					: formatArgumentCount(expression.arguments.length),
			},
		};
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const lookup = buildLookup(createConfiguredArgumentCountEntries(context.options[0]));

	context.on('CallExpression', callExpression => {
		const configuredArgumentCountProblem = getConfiguredArgumentCountProblem(callExpression, lookup, context);
		if (configuredArgumentCountProblem) {
			return configuredArgumentCountProblem;
		}

		if (callExpression.arguments.some(argument => argument.type === 'SpreadElement')) {
			return;
		}

		const functionNode = getFunctionNode(callExpression, sourceCode);
		if (!functionNode) {
			return;
		}

		const arity = getArity(functionNode);
		const argumentCount = callExpression.arguments.length;

		// In JavaScript a parameter without a default is still optional at the call site, so
		// only report passing too many arguments to a user-defined function, never too few.
		if (argumentCount <= arity.maximum) {
			return;
		}

		return {
			node: callExpression.callee,
			messageId: MESSAGE_ID,
			data: {
				expected: getExpectedText(arity),
				actual: formatArgumentCount(argumentCount),
			},
		};
	});

	context.on('NewExpression', newExpression => getConfiguredArgumentCountProblem(newExpression, lookup, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow calling functions and constructors with an invalid number of arguments.',
			recommended: 'unopinionated',
		},
		schema: [
			{
				type: 'object',
				description: 'Additional call and constructor patterns to check.',
				propertyNames: {
					pattern: String.raw`^(?:new )?(?:\*|[A-Za-z_$][\w$]*)(?:\.(?:\*|[A-Za-z_$][\w$]*))*$`,
				},
				additionalProperties: {
					anyOf: [
						{
							type: 'integer',
							minimum: 0,
						},
						{
							type: 'array',
							items: {
								type: 'integer',
								minimum: 0,
							},
							minItems: 1,
							uniqueItems: true,
						},
						{
							type: 'object',
							properties: {
								min: {
									type: 'integer',
									minimum: 0,
								},
								max: {
									type: 'integer',
									minimum: 0,
								},
							},
							additionalProperties: false,
							minProperties: 1,
						},
					],
				},
			},
		],
		defaultOptions: [{}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
