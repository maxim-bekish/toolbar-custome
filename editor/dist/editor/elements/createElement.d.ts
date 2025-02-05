import { Path, Span } from 'slate';
import { YooEditor } from '../types';
export type CreateBlockElementOptions = {
    path?: 'next' | 'prev' | Path | Span;
    focus?: boolean;
    split?: boolean;
};
export type CreateElement<TElementKeys, TElementProps> = {
    type: TElementKeys;
    props?: TElementProps;
};
export declare function createElement<TElementKeys extends string, TElementProps>(editor: YooEditor, blockId: string, element: CreateElement<TElementKeys, TElementProps>, options?: CreateBlockElementOptions): void;
//# sourceMappingURL=createElement.d.ts.map