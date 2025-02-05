import { YooEditor } from '../../editor/types';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
export declare const useYooptaDragDrop: ({ editor }: {
    editor: YooEditor;
}) => {
    sensors: import("@dnd-kit/core").SensorDescriptor<import("@dnd-kit/core").SensorOptions>[];
    handleDragEnd: (event: DragEndEvent) => void;
    handleDragStart: (event: DragStartEvent) => void;
};
//# sourceMappingURL=dnd.d.ts.map