/// <reference types="react" />
export type ToolProps<RenderProps = any, ToolProps = any> = {
    render: React.ComponentType<RenderProps>;
    tool: React.ComponentType<ToolProps>;
    props?: Record<string, unknown>;
};
export type Tools = {
    ActionMenu: ToolProps;
    Toolbar: ToolProps;
    LinkTool: ToolProps;
    [key: string]: ToolProps;
};
export type ToolsContextType = {
    [key: string]: ToolProps['render'];
};
type Props = {
    tools?: Partial<Tools>;
    children: React.ReactNode;
};
export declare const ToolsProvider: ({ children, tools }: Props) => import("react/jsx-runtime").JSX.Element;
export declare const useYooptaTools: () => ToolsContextType;
export {};
//# sourceMappingURL=ToolsContext.d.ts.map