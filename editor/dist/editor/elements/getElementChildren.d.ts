import { SlateElement, YooEditor } from '../types';
import { GetBlockElementEntryOptions } from './getElementEntry';
export type GetElementChildrenOptions = GetBlockElementEntryOptions;
export declare function getElementChildren<TElementKeys extends string>(editor: YooEditor, blockId: string, options?: GetElementChildrenOptions): SlateElement<TElementKeys>['children'] | undefined;
//# sourceMappingURL=getElementChildren.d.ts.map