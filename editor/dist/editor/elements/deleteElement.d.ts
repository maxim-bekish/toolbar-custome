import { Path } from 'slate';
import { YooEditor } from '../types';
export type DeleteBlockElement = {
    type: string;
    path: Path;
};
export declare function deleteElement(editor: YooEditor, blockId: string, element: DeleteBlockElement): void;
//# sourceMappingURL=deleteElement.d.ts.map