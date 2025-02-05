import { NodeEntry, Path } from 'slate';
import { SlateEditor, SlateElement, YooEditor } from '../editor/types';
import { Plugin, PluginElement, PluginElementProps, PluginElementsMap } from '../plugins/types';
export declare function getRootBlockElementType(elems: PluginElementsMap<string, unknown> | undefined): string | undefined;
export declare function getRootBlockElement(elems: PluginElementsMap<string, unknown> | undefined): PluginElement<string, unknown> | undefined;
export declare function isRootElementVoid(elems: PluginElementsMap<string, unknown> | undefined): boolean;
export type GetBlockElementNodeOptions = {
    at?: Path;
    elementType?: string;
};
export declare function getBlockElementNode(slate: SlateEditor, options?: GetBlockElementNodeOptions): NodeEntry<SlateElement> | undefined;
export declare function buildSlateNodeElement(type: string, props?: PluginElementProps<unknown>): SlateElement<any>;
type ElementsMapWithTextContent = {
    [key: string]: string;
};
export declare function buildBlockElementsStructure(editor: YooEditor, blockType: string, elementsMapWithTextContent?: ElementsMapWithTextContent): SlateElement;
export declare function getPluginByInlineElement(plugins: YooEditor['plugins'], elementType: string): Plugin<Record<string, SlateElement>, unknown> | undefined;
export {};
//# sourceMappingURL=blockElements.d.ts.map