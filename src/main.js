self.require = self.require || {};
self.require.toUrl = (uri) => uri;
self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        if (label === 'json') {
            return './json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return './css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
            return './ts.worker.js';
        }
        return './editor.worker.js';
    }
};


import * as monaco from 'monaco-editor';
import { ChatUI } from './chat';
import { deleteFile, readSetting } from './llmCall';
import sneakySimpleWYSWYGtool from "bundle-text:./sneakySimpleWYSWYGtool.js";
import { mergeCode, mergeToolsPromptStrings } from "snipsplicer";










class aiFiddleEditor {
    constructor(container = document.body) {
        this.container = container;
        this.tabs = ['html', 'javascript', 'css'];
        this.editors = {};
        this.activeEditor = null;
        this.project = {
            html: '',
            js: '',
            css: '',
            name: '',
            conversations: []
        };

        this.startupActions();
    }

    async startupActions() {
        await this.readURLParams();
        if (this.mode === 'run') return;

        this.iframe = document.createElement('iframe');
        this.consolePanel = document.createElement('div');

        await this.setupLayout();
        await this.setupMessageListener();
        await this.setEditorValues();

    }


    async readURLParams() {
        //console.log(location.search);
        const params = await new URLSearchParams(location.search);
        if (await params.has('editor')) {
            this.mode = 'editor';
            await this.decodeProject(params.get('editor'));
            console.log('Loading project:', this.project);
            await this.saveProjectToStorage();
        } else if (await params.has('run')) {
            this.mode = 'run';
            await this.decodeProject(params.get('run'));
            console.log('Running project:', this.project);
            await this.replaceDOM();

            return;
        } else {
            this.mode = 'editor';
            await this.loadProjectFromStorage();
        }
    }

    async setupLayout() {
        this.container.style.margin = '0';
        this.container.style.height = '100vh';
        this.container.style.display = 'flex';
        this.container.style.background = '#1e1e1e';
        this.container.style.color = '#ccc';
        this.container.style.overflow = 'hidden';
        const createPanel = () => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            return div;
        };

        this.chatUI = await new ChatUI(this);

        //await this.chatUI.setup();


        this.chatPanel = this.chatUI.chatDiv;
        this.chatPanel.style.width = '20%';
        this.chatPanel.style.minWidth = '100px';
        this.chatPanel.style.borderRight = '1px solid #333';


        this.editorPanel = createPanel();
        this.editorPanel.style.width = '40%';
        this.editorPanel.style.minWidth = '100px';
        this.editorPanel.style.borderRight = '1px solid #333';

        this.previewPanel = createPanel();
        this.previewPanel.style.flex = '1';

        this.tabBar = document.createElement('div');
        this.tabBar.style.display = 'flex';
        this.tabBar.style.background = '#2d2d2d';
        this.tabBar.style.flexShrink = '0';

        this.editorContainer = document.createElement('div');
        this.editorContainer.style.flex = '1';
        this.editorPanel.appendChild(this.tabBar);
        this.editorPanel.appendChild(this.editorContainer);

        this.iframeToolbar = document.createElement('div');
        this.iframeToolbar.style.display = 'flex';
        this.iframeToolbar.style.gap = '8px';
        this.iframeToolbar.style.padding = '3px';
        this.iframeToolbar.style.background = '#2d2d2d';
        this.iframeToolbar.style.color = '#fff';
        this.iframeToolbar.style.alignItems = 'center';
        this.iframeToolbar.style.fontSize = '14px';
        this.iframeToolbar.style.height = '33px';


        // add an open button using the unicode character for folder
        const openBtn = document.createElement('button');
        openBtn.textContent = '📂'
        openBtn.style.background = '#555';
        openBtn.style.border = 'none';
        openBtn.style.color = '#fff';
        openBtn.style.cursor = 'pointer';
        openBtn.style.padding = '6px 10px';
        openBtn.onclick = () => {
            this.projectSelector();
        };
        openBtn.title = 'Open project';


        this.iframeToolbar.appendChild(openBtn);


        this.nameInput = document.createElement('input');
        this.nameInput.placeholder = 'Project name';
        this.nameInput.style.flex = '1';
        this.nameInput.style.background = '#444';
        this.nameInput.style.color = '#fff';
        this.nameInput.style.border = '1px solid #666';
        this.nameInput.style.padding = '4px';
        this.nameInput.value = this.project.name;

        const makeButton = (label, toolTip, handler) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.background = '#555';
            btn.style.border = 'none';
            btn.style.color = '#fff';
            btn.style.cursor = 'pointer';
            btn.style.padding = '6px 10px';
            btn.onclick = handler;
            // set the tooltip on the button
            btn.title = toolTip;

            return btn;
        };

        // ad a checkbox to toggle if we include the sneakySimpleWYSWYGtool
        this.sneakyToolCheckbox = document.createElement('input');
        this.sneakyToolCheckbox.type = 'checkbox';
        this.sneakyToolCheckbox.style.marginRight = '5px';
        this.sneakyToolCheckbox.style.cursor = 'pointer';
        this.sneakyToolCheckbox.style.width = '20px';
        this.sneakyToolCheckbox.style.height = '20px';
        this.sneakyToolCheckbox.checked = false;
        this.sneakyToolCheckbox.title = 'Include WYSIWYG tool';
        this.sneakyToolCheckbox.onclick = () => {
            if (this.sneakyToolCheckbox.checked) this.runProject();
        }

        this.iframeToolbar.appendChild(this.sneakyToolCheckbox);
        // label the checkbox
        const sneakyToolLabel = document.createElement('label');
        sneakyToolLabel.textContent = 'WYSIWYG';
        this.iframeToolbar.appendChild(sneakyToolLabel);



        const runBtn = makeButton('▶', 'Run', () => this.runProject("run"));
        const linkBtn = makeButton('🔗✎', 'Generate shareable link to load this project in the editor', () => this.copyEditorLink());
        const execBtn = makeButton('🔗▶', 'Generate shareable link to run project without the editor', () => this.copyRunOnlyLink());

        this.iframeToolbar.append(this.nameInput, runBtn, linkBtn, execBtn);

        //this.consolePanel.style.height = '30%';
        this.consolePanel.style.background = '#111';
        this.consolePanel.style.color = '#0f0';
        this.consolePanel.style.fontFamily = 'monospace';
        this.consolePanel.style.padding = '2px';
        this.consolePanel.style.overflowY = 'scroll';
        this.consolePanel.style.bottom = '0';

        this.iframe.style.flex = '1';
        this.iframe.style.border = 'none';
        //this.iframe.style.background = '#fff';

        const hBar = this.createResizeBar('row', (y) => {
            const top = y - this.iframeToolbar.offsetHeight - this.previewPanel.getBoundingClientRect().top;
            this.iframe.style.height = `${top}px`;
            this.iframe.style.flex = 'none';
        });

        this.previewPanel.append(this.iframeToolbar, this.iframe, hBar, this.consolePanel);

        const vBar1 = this.createResizeBar('col', (x) => this.chatPanel.style.width = `${x}px`);
        const vBar2 = this.createResizeBar('col', (x) => {
            const offset = this.chatPanel.offsetWidth + vBar1.offsetWidth;
            this.editorPanel.style.width = `${x - offset}px`;
        });

        this.container.append(this.chatPanel, vBar1, this.editorPanel, vBar2, this.previewPanel);
        await this.loadEditor()
    }

    projectSelector() {

        // display a list of projects in the local storage and allow the user to select one
        const projects = Object.keys(localStorage).filter(key => key.endsWith('.project'));
        const projectList = document.createElement('dialog');

        projectList.style.position = 'absolute';
        projectList.style.background = '#333';
        projectList.style.color = '#fff';
        projectList.style.padding = '10px';
        projectList.style.borderRadius = '5px';

        projectList.style.zIndex = '10000';
        projectList.style.width = '200px';
        projectList.style.maxHeight = '300px';
        projectList.style.overflowY = 'scroll';
        projectList.style.overflowX = 'hidden';
        projectList.style.left = '10px';
        projectList.style.top = '10px';
        projectList.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        projectList.style.border = '1px solid #666';
        projectList.style.fontSize = '14px';
        projectList.style.fontWeight = 'bold';

        // add a close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '❌'
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#fff';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.padding = '0px 5px';
        closeBtn.onclick = () => {
            document.body.removeChild(projectList);
        };
        projectList.appendChild(closeBtn);




        projects.forEach(project => {
            const projectName = project.replace('.project', '');
            const projectItem = document.createElement('div');
            const projectRow = document.createElement('div');

            // add a trach icon to delete the project
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️'
            deleteBtn.style.background = 'none';
            deleteBtn.style.border = 'none';
            deleteBtn.style.color = '#fff';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.padding = '0px 5px';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Do you really want to delete the ${projectName} project`)) deleteFile(project);
                document.body.removeChild(projectList);
            };

            projectRow.appendChild(deleteBtn);


            projectItem.innerHTML += projectName;
            projectItem.style.padding = '5px';
            projectItem.style.cursor = 'pointer';
            projectItem.style.borderBottom = '1px solid #444';
            projectItem.onclick = () => {
                this.project.name = projectName;
                this.loadProjectFromStorage();
                this.setEditorValues();
                this.saveProjectToStorage();
                document.body.removeChild(projectList);
            };

            projectRow.appendChild(projectItem);
            projectList.appendChild(projectRow);
            projectRow.style.display = 'flex';
        });
        document.body.appendChild(projectList);

        projectList.showModal();
    }


    createResizeBar(direction, onDrag) {
        const bar = document.createElement('div');
        bar.style.background = '#444';
        bar.style.userSelect = 'none';
        bar.style.zIndex = '10000';
        if (direction === 'col') {
            bar.style.width = '5px';
            bar.style.cursor = 'col-resize';
        } else {
            bar.style.height = '5px';
            bar.style.cursor = 'row-resize';
        }
        bar.addEventListener('mousedown', (e) => {
            // disable pointer events on the iframe
            this.iframe.style.pointerEvents = 'none';
            const startPos = direction === 'col' ? e.clientX : e.clientY;
            const onMouseMove = (e) => {
                const pos = direction === 'col' ? e.clientX : e.clientY;
                onDrag(pos);
            };
            const onMouseUp = () => {
                this.iframe.style.pointerEvents = 'auto';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
        return bar;
    }

    async loadEditor() {
        this.tabButtons = {}; // Add this before loop
        this.tabs.forEach(tab => {
            const button = document.createElement('button');
            button.textContent = tab;
            button.style.flex = '1';
            button.style.padding = '10px';
            button.style.margin = '1px';
            button.style.color = '#ccc';
            button.style.border = 'none';
            button.style.cursor = 'pointer';
            // round the top corners of the button
            button.style.borderTopLeftRadius = '10px';
            button.style.borderTopRightRadius = '10px';

            button.onclick = () => this.switchTab(tab);
            this.tabBar.appendChild(button);
            this.tabButtons[tab] = button;

            button.onmouseenter = () => {
                if (this.activeEditor !== this.editors[tab]) {
                    button.style.background = '#333';
                }
            };
            button.onmouseleave = () => {
                if (this.activeEditor !== this.editors[tab]) {
                    button.style.background = '#444';
                }
            };

            const container = document.createElement('div');
            container.style.display = 'none';
            container.style.height = '100%';
            container.style.flex = '1';
            this.editorContainer.appendChild(container);

            this.editors[tab] = monaco.editor.create(container, {
                value: '',
                language: tab === 'javascript' ? 'javascript' : tab.toLowerCase(),
                theme: 'vs-dark',
                automaticLayout: true
            });

            this.editors[tab].onDidChangeModelContent(() => this.saveEditorValues());
        });

        //this.nameInput.addEventListener('onChange', () => this.saveEditorValues());

        // use the onchange event to save the project name
        this.nameInput.addEventListener('change', () => {
            this.project.name = this.nameInput.value;
            this.saveProjectToStorage();
        });

        this.switchTab('html');
    }

    async replaceDOM() {
        const htmlString = await this.generatePageContent(false)
        document.open();
        document.write(htmlString);
        document.close();
    }

    setupMessageListener() {
        window.addEventListener('message', async (e) => {
            if (e.data.type === 'html-edit') {
                const newHTML = e.data.html
                //set the editor value to the new HTML
                await this.editors['html'].setValue(newHTML);

                await this.editors['html'].trigger(`anyString`, 'editor.action.formatDocument');
                await this.applyChanges('html', newHTML);
                //alert(newHTML)
                return
            }
            console.log('e.data type:', typeof e.data, Array.isArray(e.data));
            console.log('e.data:', e.data);

            const errorData = e.data?.data;
            console.log('errorData:', errorData);


            let filteredErrorString = "";
            for (let key in errorData) {
                console.log(errorData[key]);
                // check if the value starts with blob:
                if ((errorData[key] + "").startsWith('blob:')) {
                    console.log('Ignoring blob URL:', errorData[key]);
                    continue;
                }
                filteredErrorString += errorData[key] + "  ";

            }

            //console.log(JSON.stringify(e.data, null, 2));

            if (e.data?.type === 'iframe-console') {
                const msg = document.createElement('div');
                // set the color of the message based on the type
                msg.style.color = '#0f0';
                if (e.data.data[0] === 'error') {
                    msg.style.color = 'RED';
                }
                if (e.data.data[0] === 'warn') {
                    msg.style.color = 'YELLOW';
                }
                if (e.data.data[0] === 'debug') {
                    msg.style.color = 'BLUE';
                }
                if (e.data.data[0] === 'info') {
                    msg.style.color = 'CYAN';
                }
                if (e.data.data[0] === 'log') {
                    msg.style.color = 'WHITE';
                }


                // add a 1px border to the message
                msg.style.border = '1px solid #333';

                // Prepare the message text
                //const messageText = e.data.data.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');

                const messageText = filteredErrorString;
                msg.textContent = messageText;

                // Create the alert button
                const alertBtn = document.createElement('button');
                alertBtn.textContent = '🔍';
                alertBtn.title = 'Show full message';
                alertBtn.style.marginLeft = '8px';
                alertBtn.style.background = 'none';
                alertBtn.style.border = 'none';
                alertBtn.style.color = '#fff';
                alertBtn.style.cursor = 'pointer';
                alertBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    this.chatUI.appendMesaageInput(messageText);
                };

                // Add the button to the message div
                msg.appendChild(alertBtn);

                this.consolePanel.appendChild(msg);
                this.consolePanel.scrollTop = this.consolePanel.scrollHeight;
            }
        });
    }

    switchTab(name) {
        Object.entries(this.editors).forEach(([tab, editor]) => {
            const dom = editor.getDomNode().parentElement;
            dom.style.display = tab === name ? 'block' : 'none';
            if (tab === name) {
                this.activeEditor = editor;
                this.tabButtons[tab].style.background = 'blue'; // active
                this.tabButtons[tab].style.color = '#fff';
            } else {
                this.tabButtons[tab].style.background = '#444'; // inactive
                this.tabButtons[tab].style.color = '#ccc';
            }
        });
    }



    async applyChanges(language, snippet) {
        console.log('Applying changes:', language, snippet);
        //console.log(language, await this.editors[language].getValue(), snippet)
        const currentCode = await this.editors[language].getValue()

        const result = await mergeCode(language, currentCode, snippet);
        await this.switchTab(language);
        await this.editors[language].setValue(result);
        await this.saveEditorValues();
        if (await readSetting('llm/auto_execute_code.bool') == "true") await this.runProject();
    }




    async saveEditorValues() {
        this.project.name = this.nameInput.value;
        this.project.html = await this.editors['html'].getValue();
        this.project.js = await this.editors['javascript'].getValue();
        this.project.css = await this.editors['css'].getValue();


        this.saveProjectToStorage();

        // check if the sneakyToolCheckbox is checked and auto execute is enabled
        if (this.sneakyToolCheckbox.checked) await this.runProject();
    }

    setEditorValues() {
        this.nameInput.value = this.project.name;
        this.editors['html'].setValue(this.project.html);
        this.editors['javascript'].setValue(this.project.js);
        this.editors['css'].setValue(this.project.css);
    }

    async saveProjectToStorage(project = this.project) {
        //console.log('Saving project:', project);
        localStorage.setItem(this.project.name + ".project", JSON.stringify(project));

        // set the URL to the current project. 
        // the new URL should point to the same server path but without
        // the existing query params
        const url = new URL(location.href);
        // remove all existing query params
        url.search = '';

        url.searchParams.set('editor', await this.encodeProject());
        //console.log('New URL:', url.href);
        history.replaceState({}, '', url);

    }

    loadProjectFromStorage() {
        if (!this.project.name) {
            this.project.name = 'Untitled Project';
        }
        const data = localStorage.getItem(this.project.name + ".project");
        if (!data) {
            console.warn('No project found in local storage');
        } else {
            this.project = JSON.parse(data);
            console.log('Loaded project:', this.project);
        }
    }
    async encodeProject() {
        try {
            const json = JSON.stringify(this.project);
            const uint8Array = new TextEncoder().encode(json);

            // Create a ReadableStream from the Uint8Array
            const readableStream = new Response(uint8Array).body;

            // Pipe it through the gzip CompressionStream
            const compressedStream = readableStream.pipeThrough(new CompressionStream('gzip'));

            // Read the compressed data into an ArrayBuffer
            const compressedBuffer = await new Response(compressedStream).arrayBuffer();

            // Convert to base64
            const base64 = await btoa(String.fromCharCode(...new Uint8Array(compressedBuffer)));
            return base64;
        } catch (e) {
            console.error('Error compressing project:', e);
            alert('Failed to encode project.');
            return null;
        }
    }

    async decodeProject(str) {
        try {
            // Decode base64 to binary string and convert to Uint8Array
            const binaryString = atob(str);
            const compressedData = Uint8Array.from(binaryString, c => c.charCodeAt(0));

            // Create a ReadableStream from the compressed data
            const compressedStream = new Response(compressedData).body;

            // Pipe it through the gzip DecompressionStream
            const decompressedStream = compressedStream.pipeThrough(new DecompressionStream('gzip'));

            // Read the decompressed data as text
            const decompressedText = await new Response(decompressedStream).text();

            // Parse and assign the project
            this.project = await JSON.parse(decompressedText);
        } catch (e) {
            console.error('Error decompressing project:', e);
            alert('Failed to load project from URL. The data may be corrupted or invalid.');
        }
    }



    async runProject(mode) {
        if (mode === 'run') this.sneakyToolCheckbox.checked = false;
        this.iframe.srcdoc = await this.generatePageContent();
        this.consolePanel.innerHTML = '';
    }

    async generatePageContent(hijackDebugger = true) {
        let returnString = "";

        let JSurlBlob = createModuleBlobURL(this.project.js + "\n\n//# sourceURL=injectedScript.js", 'application/javascript');
        let CSSurlBlob = createModuleBlobURL(this.project.css, 'text/css');





        if (hijackDebugger) {
            let sneakyCodeString = "";
            if (this.sneakyToolCheckbox.checked == true) {
                sneakyCodeString = sneakySimpleWYSWYGtool;
            } else {
                sneakyCodeString = "";
            }

            returnString = `
        <html>
            <head>
                <meta name="color-scheme" content="light dark">
                <link rel="stylesheet" href="${CSSurlBlob}">
            </head>

            <body>
                ${this.project.html}

                <script type="module">
                    (function () {
                        const oldLog = console.log;
                        console.log = function (...args) {
                            window.parent.postMessage({ type: 'iframe-console', data: ['log', ...args] }, '*');
                            oldLog.apply(console, args);
                        };
                        const oldError = console.error;
                        console.error = function (...args) {
                            window.parent.postMessage({ type: 'iframe-console', data: ['error', ...args] }, '*');
                            oldError.apply(console, args);
                        };
                        const oldWarn = console.warn;
                        console.warn = function (...args) {
                            window.parent.postMessage({ type: 'iframe-console', data: ['warn', ...args] }, '*');
                            oldWarn.apply(console, args);
                        };
                        const oldDebug = console.debug;
                        console.debug = function (...args) {
                            window.parent.postMessage({ type: 'iframe-console', data: ['debug', ...args] }, '*');
                            oldDebug.apply(console, args);
                        };
                        const oldInfo = console.info;
                        console.info = function (...args) {
                            window.parent.postMessage({ type: 'iframe-console', data: ['info', ...args] }, '*');
                            oldInfo.apply(console, args);
                        };

                        window.addEventListener('error', function (event) {
                            window.parent.postMessage({
                                type: 'iframe-console',
                                data: ['error', event.message, event.filename, event.lineno, event.colno, event.error?.stack]
                            }, '*');
                        });

                        window.addEventListener('unhandledrejection', function (event) {
                            window.parent.postMessage({
                                type: 'iframe-console',
                                data: ['error', event.reason?.message || event.reason, event.reason?.stack]
                            }, '*');
                        });
                    })();
                    
                    ${sneakyCodeString}
                </script>

                <script type="module" src="${JSurlBlob}"></script>
                <style>
                    .wysiwyg-dragging {
                        opacity: 0.5;
                    }

                    .wysiwyg-drop-target {
                        outline: 2px dashed #00aaff;
                    }
                </style>

            </body>
        </html>`;
        }

        else {
            returnString = `
                <html>
                    <head>
                        <meta name="color-scheme" content="light dark">   
                        <style>${this.project.css}</style>
                        
                    </head>
                    <body>${this.project.html}<script type=module>${this.project.js}</script></body>
                </html>`;
        }

        console.log('Generated HTML:', returnString);
        return returnString;
    }

    async copyEditorLink() {
        const encoded = encodeURIComponent(await this.encodeProject());
        const url = `${location.origin}${location.pathname}?editor=${encoded}`;
        navigator.clipboard.writeText(url);
        alert("Editor link copied to clipboard.");
    }

    async copyRunOnlyLink() {
        const encoded = encodeURIComponent(await this.encodeProject());
        const url = `${location.origin}${location.pathname}?run=${encoded}`;
        navigator.clipboard.writeText(url);
        alert("Run-only link copied to clipboard.");
    }
}










// In your main entry file (like index.js) — very early in execution

const ignoredPackages = [
    'node_modules/monaco-editor',
];

// In your main entry point (early, like index.js)

const ignoredFilenames = [
    'editorSimpleWorker.js',
    'errors.js'
];

window.addEventListener('error', (event) => {
    if (event.filename) {
        const shouldIgnorePackage = ignoredPackages.some(pkg => event.filename.includes(pkg));
        const shouldIgnoreFilename = ignoredFilenames.some(name => event.filename.endsWith(name));

        if (shouldIgnorePackage || shouldIgnoreFilename) {
            event.stopImmediatePropagation();
            event.preventDefault();
            console.warn(`Ignored error from ${event.filename}`);
            return;
        }
    }
    // Otherwise, let it happen normally
});

window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && reason.stack) {
        const shouldIgnorePackage = ignoredPackages.some(pkg => reason.stack.includes(pkg));
        const shouldIgnoreFilename = ignoredFilenames.some(name => reason.stack.includes(name));

        if (shouldIgnorePackage || shouldIgnoreFilename) {
            event.stopImmediatePropagation();
            event.preventDefault();
            console.warn(`Ignored unhandled rejection from stack trace`);
            return;
        }
    }
    // Otherwise, let it happen normally
});

export function createModuleBlobURL(code, type) {
    const blob = new Blob([code], { type });
    const url = URL.createObjectURL(blob);
    return url;
}









// Instantiate the class
window.aiFiddle = new aiFiddleEditor();

