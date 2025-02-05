import { SlateEditor, YooEditor, YooptaBlockData } from '../editor/types';
import { EditorEventHandlers } from '../types/eventHandlers';
import { PluginEvents } from './types';
export declare const useSlateEditor: (id: string, editor: YooEditor, block: YooptaBlockData, elements: any, withExtensions: any) => import("slate-react").ReactEditor;
export declare const useEventHandlers: (events: PluginEvents | undefined, editor: YooEditor, block: YooptaBlockData, slate: SlateEditor) => EditorEventHandlers;
//# sourceMappingURL=hooks.d.ts.map