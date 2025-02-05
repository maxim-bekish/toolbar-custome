import { CSSProperties } from 'react';
import { YooEditor } from '@yoopta/editor';
type Props = {
    editor: YooEditor;
    highlightColors: CSSProperties;
    onClose: () => void;
    refs: {
        setFloating: (el: any) => void;
    };
    floatingStyles: React.CSSProperties;
};
declare const HighlightColor: ({ editor, refs, floatingStyles, highlightColors }: Props) => import("react/jsx-runtime").JSX.Element;
export { HighlightColor };
//# sourceMappingURL=HighlightColor.d.ts.map