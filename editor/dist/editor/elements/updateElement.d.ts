import { Path } from 'slate';
import { SlateElement, YooEditor } from '../types';
export type UpdateElementOptions = {
    path?: Path;
};
export type UpdateElement<TElementKeys extends string, TElementProps> = Partial<Omit<SlateElement<TElementKeys, TElementProps>, 'id'>>;
export declare function updateElement<TElementKeys extends string, TElementProps>(editor: YooEditor, blockId: string, element: UpdateElement<TElementKeys, TElementProps>, options?: UpdateElementOptions): void;
//# sourceMappingURL=updateElement.d.ts.map