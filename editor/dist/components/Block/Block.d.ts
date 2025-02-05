import React from 'react';
import { YooptaBlockData } from '../../editor/types';
type BlockProps = {
    children: React.ReactNode;
    block: YooptaBlockData;
    blockId: string;
    onActiveDragHandleChange: (props: any) => void;
};
declare const Block: React.MemoExoticComponent<({ children, block, blockId, onActiveDragHandleChange }: BlockProps) => import("react/jsx-runtime").JSX.Element>;
export { Block };
//# sourceMappingURL=Block.d.ts.map