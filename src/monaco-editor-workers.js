self.require = self.require || {};
self.require.toUrl = (uri) => uri;

// monaco-editor-workers.js
import * as EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import * as JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import * as CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import * as HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import * as TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

export function getMonacoWorker(label) {
  switch (label) {
    case 'json': return new JsonWorker.default();
    case 'css': return new CssWorker.default();
    case 'html': return new HtmlWorker.default();
    case 'typescript':
    case 'javascript': return new TsWorker.default();
    default: return new EditorWorker.default();
  }
}


// suppress all errors from the console.
