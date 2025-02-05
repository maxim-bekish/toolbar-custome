import { MouseEvent, ReactNode } from 'react';
type Props = {
    children: ReactNode;
    lockScroll?: boolean;
    className?: string;
    onClick?: (e: MouseEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
    style?: React.CSSProperties;
};
declare const Overlay: ({ className, children, lockScroll, ...props }: Props) => import("react/jsx-runtime").JSX.Element;
export { Overlay };
//# sourceMappingURL=Overlay.d.ts.map