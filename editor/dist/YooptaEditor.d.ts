import { CSSProperties } from 'react';
import { SlateElement, YooEditor, YooptaPath, YooptaContentValue } from './editor/types';
import { Tools } from './contexts/YooptaContext/ToolsContext';
import { YooptaPlugin } from './plugins';
import { YooptaMark } from './marks';
import { YooptaOperation } from './editor/core/applyTransforms';
export type YooptaOnChangeOptions = {
    operations: YooptaOperation[];
};
export type YooptaEditorProps = {
    id?: string;
    editor: YooEditor;
    plugins: Readonly<YooptaPlugin<Record<string, SlateElement>>[]>;
    marks?: YooptaMark<any>[];
    value?: YooptaContentValue;
    onChange?: (value: YooptaContentValue, options: YooptaOnChangeOptions) => void;
    onPathChange?: (path: YooptaPath) => void;
    autoFocus?: boolean;
    className?: string;
    selectionBoxRoot?: HTMLElement | React.MutableRefObject<HTMLElement | null> | false;
    children?: React.ReactNode;
    tools?: Partial<Tools>;
    placeholder?: string;
    readOnly?: boolean;
    width?: number | string;
    style?: CSSProperties;
};
declare const YooptaEditor: ({ id, editor, value, marks: marksProps, plugins: pluginsProps, autoFocus, className, tools, selectionBoxRoot, children, placeholder, readOnly, width, style, onChange, onPathChange, }: YooptaEditorProps) => import("react/jsx-runtime").JSX.Element;
export { YooptaEditor };
//# sourceMappingURL=YooptaEditor.d.ts.map