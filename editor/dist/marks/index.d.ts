/// <reference types="react" />
export type YooptaMark<TProps> = {
    type: string;
    hotkey?: string;
    render: (props: TProps) => JSX.Element;
};
export type YooptaMarkParams<TProps> = {
    type: string;
    hotkey?: string;
    render: (props: TProps) => JSX.Element;
};
export declare function createYooptaMark<TProps>({ type, hotkey, render }: YooptaMarkParams<TProps>): YooptaMark<TProps>;
//# sourceMappingURL=index.d.ts.map