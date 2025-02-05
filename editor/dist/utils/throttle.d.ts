export type ThrottleOptions = {
    leading?: boolean;
    trailing?: boolean;
};
export declare function throttle<T extends (...args: any[]) => any>(func: T, wait: number, { leading, trailing }?: ThrottleOptions): T & {
    cancel: () => void;
};
//# sourceMappingURL=throttle.d.ts.map