import { SlateElement, YooEditor } from '../editor/types';
import { Plugin } from '../plugins/types';
import { YooptaMark } from '../marks';
export declare function buildMarks(editor: any, marks: YooptaMark<any>[]): import("../editor/types").YooptaFormats;
export declare function buildBlocks(editor: any, plugins: Plugin<Record<string, SlateElement>>[]): import("../editor/types").YooptaBlocks;
export declare function buildBlockSlateEditors(editor: YooEditor): {};
export declare function buildBlockShortcuts(editor: YooEditor): {};
export declare function buildPlugins(plugins: Plugin<Record<string, SlateElement>>[]): Record<string, Plugin<Record<string, SlateElement>>>;
export declare function buildCommands(editor: YooEditor, plugins: Plugin<Record<string, SlateElement>>[]): Record<string, (...args: any[]) => any>;
//# sourceMappingURL=editorBuilders.d.ts.map