import { Location, NodeEntry, Span } from 'slate';
import { SlateElement, YooEditor } from '../types';
export type GetBlockElementEntryOptions = {
    path?: Location | Span | undefined;
    type?: string;
};
export declare function getElementEntry<TElementKeys extends string>(editor: YooEditor, blockId: string, options?: GetBlockElementEntryOptions): NodeEntry<SlateElement<TElementKeys>> | undefined;
//# sourceMappingURL=getElementEntry.d.ts.map