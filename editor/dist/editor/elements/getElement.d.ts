import { SlateElement, YooEditor } from '../types';
import { GetBlockElementEntryOptions } from './getElementEntry';
export type GetBlockElementOptions = GetBlockElementEntryOptions;
export declare function getElement<TElementKeys extends string>(editor: YooEditor, blockId: string, options?: GetBlockElementOptions): SlateElement<TElementKeys> | undefined;
//# sourceMappingURL=getElement.d.ts.map