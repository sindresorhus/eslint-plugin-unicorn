export type Nullable = string | null;
export declare function acceptNull(value: Nullable): void;
export declare function acceptEither(value: Nullable | undefined): void;
export declare function acceptOptional(value?: Nullable): void;
export declare function identity<Value>(value: Value): Value;
export declare class Receiver {
	value: Nullable;
	constructor(value: Nullable);
	set(value: Nullable): void;
}
