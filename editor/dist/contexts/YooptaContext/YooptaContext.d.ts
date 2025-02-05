/// <reference types="react" />
import { YooEditor, YooptaPathIndex } from '../../editor/types';
import { PluginOptions } from '../../plugins/types';
export type YooptaEditorContext = {
    editor: YooEditor;
};
export declare const YooptaContext: import("react").Context<YooptaEditorContext>;
/**
 *
 */
declare const YooptaContextProvider: ({ children, editorState }: {
    children: any;
    editorState: any;
}) => import("react/jsx-runtime").JSX.Element;
declare const useYooptaEditor: () => YooEditor;
declare const useBlockData: (blockId: string) => import("../../editor/types").YooptaBlockData<import("slate").Descendant>;
declare const useYooptaFocused: () => boolean;
declare const useYooptaReadOnly: () => boolean;
declare const useYooptaPluginOptions: <TOptions>(pluginType: string) => Partial<{
    display?: {
        title?: string | undefined;
        description?: string | undefined;
        icon?: import("react").ReactNode | import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    } | undefined;
    shortcuts?: string[] | undefined;
    HTMLAttributes?: import("react").HTMLAttributes<HTMLElement> | undefined;
} & TOptions>;
type UseBlockSelectedProps = {
    blockId: string;
    at?: YooptaPathIndex;
} | {
    at: YooptaPathIndex;
    blockId?: string;
};
declare const useBlockSelected: ({ blockId, at }: UseBlockSelectedProps) => boolean;
export { useYooptaEditor, useBlockData, useYooptaPluginOptions, useBlockSelected, useYooptaReadOnly, useYooptaFocused, YooptaContextProvider, };
//# sourceMappingURL=YooptaContext.d.ts.map