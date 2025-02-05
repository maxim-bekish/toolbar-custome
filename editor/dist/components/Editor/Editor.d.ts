import { CSSProperties, ReactNode } from 'react';
import { YooptaMark } from '../../marks';
type Props = {
    marks?: YooptaMark<any>[];
    selectionBoxRoot?: HTMLElement | React.MutableRefObject<HTMLElement | null> | false;
    autoFocus?: boolean;
    className?: string;
    placeholder?: string;
    width?: number | string;
    children: ReactNode;
    style?: CSSProperties;
};
declare const Editor: ({ placeholder, marks, className, selectionBoxRoot, width, style, children, autoFocus, }: Props) => import("react/jsx-runtime").JSX.Element;
export { Editor };
//# sourceMappingURL=Editor.d.ts.map