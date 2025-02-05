import { Path } from 'slate';
import { YooEditor } from '../types';
export type EmptyBlockElement = {
    type: string;
    path: Path;
};
export declare function isElementEmpty(editor: YooEditor, blockId: string, element: EmptyBlockElement): boolean | undefined;
//# sourceMappingURL=isElementEmpty.d.ts.map