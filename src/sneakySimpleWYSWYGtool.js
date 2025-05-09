
export class WYSIWYGEditor {
    constructor() {
        this.draggedElement = null;
        this.dragGhost = null;
        this.dropPreview = null;
        this.contextMenu = null;

        this._init();
    }

    _init() {
        this._addStyles();
        this._applyDraggableAttributes(document.body);
    }

    _onDragStart(e) {
        this._destroyGhost(); // ensure no previous ghost remains

        // test if the element is content editable
        if (e.target.hasAttribute('contenteditable')) {
            return;
        }

        this.draggedElement = e.target;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", this.draggedElement.getAttribute("data-wysiwyg-id"));
        this.draggedElement.classList.add("wysiwyg-dragging");

        // Hide default browser ghost
        const ghostHider = document.createElement("div");
        ghostHider.style.position = "absolute";
        ghostHider.style.width = "1px";
        ghostHider.style.height = "1px";
        ghostHider.style.opacity = "0";
        document.body.appendChild(ghostHider);
        e.dataTransfer.setDragImage(ghostHider, 0, 0);
        setTimeout(() => ghostHider.remove(), 0); // clean immediately

        // 🧱 Create visual drag ghost
        this.dragGhost = this.draggedElement.cloneNode(true);
        this.dragGhost.classList.add("wysiwyg-ghost");
        document.body.appendChild(this.dragGhost);
        this._trackMouse();
    }


    _trackMouse() {
        document.addEventListener("dragover", this._updateGhostPosition);
    }

    _stopTrackingMouse() {
        document.removeEventListener("dragover", this._updateGhostPosition);
    }

    _updateGhostPosition = (e) => {
        if (this.dragGhost) {
            this.dragGhost.style.left = `${e.clientX + 10}px`;
            this.dragGhost.style.top = `${e.clientY + 10}px`;
        }
    };

    _onDragOver(e) {
        e.preventDefault();

        const dropTarget = this._findNearestDraggable(e.target);
        if (!dropTarget || dropTarget === this.draggedElement || dropTarget === this.dropPreview) return;

        const pointerX = e.clientX;
        const pointerY = e.clientY;
        const rect = dropTarget.getBoundingClientRect();

        const width20 = rect.width * 0.3;
        const height20 = rect.height * 0.3;

        const isTop = pointerY < rect.top + height20;
        const isBottom = pointerY > rect.bottom - height20;
        const isLeft = pointerX < rect.left + width20;
        const isRight = pointerX > rect.right - width20;

        let dropLabel = "";

        if (isTop || isLeft) {
            dropLabel = "↖ Insert before";
        } else if (isBottom || isRight) {
            dropLabel = "↘ Insert after";
        } else {
            dropLabel = "↓ Append as child";
        }

        this._removeDropPreview();

        this.dropPreview = document.createElement("div");
        this.dropPreview.classList.add("wysiwyg-drop-preview");
        this.dropPreview.innerText = dropLabel;

        document.body.appendChild(this.dropPreview);
        this.dropPreview.style.left = `${rect.left + window.scrollX}px`;
        this.dropPreview.style.top = `${rect.top + window.scrollY - 20}px`;
        this.dropPreview.style.width = `${rect.width}px`;
    }

    _onDragEnter(e) {
        const el = this._findNearestDraggable(e.target);
        if (el && el !== this.draggedElement) {
            el.classList.add("wysiwyg-drop-target");
        }
    }

    _onDragLeave(e) {
        const el = this._findNearestDraggable(e.target);
        this._destroyGhost();
        this._clearHighlight(el);
    }

    _clearHighlight(el) {
        if (el && el.classList) {
            el.classList.remove("wysiwyg-drop-target");
        }
    }

    _removeDropPreview() {
        if (this.dropPreview && this.dropPreview.parentNode) {
            this.dropPreview.remove();
        }
        this.dropPreview = null;
    }


    _destroyGhost() {
        if (this.dragGhost && this.dragGhost.parentNode) {
            this.dragGhost.remove();
        }
        this.dragGhost = null;
        this._removeDropPreview()
        this._stopTrackingMouse();
    }


    _findNearestDraggable(el) {
        while (el && el !== document.body) {
            if (el.hasAttribute("draggable")) return el;
            el = el.parentElement;
        }
        return null;
    }

    _addStyles() {
        const style = document.createElement("style");
        style.textContent = `
                            .wysiwyg-drop-target {
                                outline: 2px dashed #00aaff !important;
                            }
                            .wysiwyg-ghost {
                                position: fixed;
                                z-index: 10000;
                                pointer-events: none;
                                opacity: 0.7;
                                transform: scale(0.95);
                                background: #222;
                                color: #fff;
                                padding: 5px;
                                border: 1px solid #00aaff;
                                border-radius: 4px;
                                max-width: 300px;
                                font-size: 0.9em;
                            }


                            .wysiwyg-drop-preview {
                                position: absolute;
                                pointer-events: none;
                                z-index: 9999;
                                background: rgba(0, 255, 153, 0.2);
                                border: 2px dashed #00ff99;
                                color: #00ff99;
                                text-align: center;
                                font-style: italic;
                                font-size: 12px;
                                padding: 2px 6px;
                                border-radius: 4px;
                                user-select: none;
                            }

                            .wysiwyg-dragging {
                                opacity: 0.5 !important;
                            }

                            .wysiwyg-drop-target {
                                outline: 2px dashed #00aaff;
                            }



                            .wysiwyg-outline {
                                position: relative;
                                /* Make sure the parent is positioned */
                            }

                            .wysiwyg-outline:hover::after {
                                content: '';
                                position: absolute;
                                top: -2px;
                                left: -2px;
                                right: -2px;
                                bottom: -2px;
                                border: 1px dashed yellow;
                                pointer-events: none;
                                z-index: 9999;
                            }



                            .wysiwyg-context-menu  * {
                                all: initial;
                                box-sizing: border-box;
                                width: 100%;
                                margin: 0;
                                padding: 0;
                                border: none;
                                background: none;
                                color: inherit;
                                font: inherit;
                                                                flex-direction: column;
                                flex-wrap: wrap;
                                display: flex;
                            }


 
                            .wysiwyg-context-menu {
                                position: absolute;
                                z-index: 10001;
                                background: #222;
                                color: #fff;
                                border: 1px solid #555;
                                padding: 5px 0;
                                border-radius: 5px;
                                display: none;
                                min-width: 120px;
                                box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
                                font-size: 13px;
                                font-family: monospace;
                                flex-direction: column;
                                flex-wrap: wrap;
                                display: flex;
                            }

                            WYSIWYG-ignore{
                                    position: fixed;
                                    top: 50px;
                                    left: 20px;
                                    width: 90%;
                                    height: 200px;
                                    z-index: 99999;
                                    background: #111;
                                    color: #fff;
                                    border: 1px solid #555;
                                    border-radius: 8px;
                                    padding: 2px;
                                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                                    cursor: move;
                                    /* display: inline-flex; */ /* Uncomment if needed */
                                    flex-wrap: wrap;
                                    overflow-y: scroll;
                                    font-family: monospace;
                                    display: flex;
                                    flex-direction: row;
                                    flex-wrap: wrap;
                                }

                                WYSIWYG-ignore > *{
                                    flex: 0 0 auto;
                                    margin: 2px;
                                    padding: 4px 6px;
                                    background: #222;
                                    border: 1px solid #333;
                                    border-radius: 4px;
                                    cursor: grab;
                                    display: flex;
                                    flex-direction: row;
                                    flex-wrap: wrap;
                                }
        `;

        style.id = "wysiwyg-drag-drop-styles";
        document.head.appendChild(style);
        style.id = "wysiwyg-drag-drop-styles";
    }




    _applyDraggableAttributes(root) {
        // add contextmenu event to the body
        root.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._removeContextMenu();
        });
        // add a click event to the body
        root.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._removeContextMenu();
        });

        document.body.addEventListener("drop", e => this._onDrop(e));
        document.body.addEventListener("dragend", () => this._onDragEnd()); // ✅ NEW cleanup hook
        document.body.addEventListener("dragover", e => this._onDragOver(e));

        document.body.setAttribute("data-wysiwyg-id", crypto.randomUUID());

        const allElements = root.querySelectorAll("*");

        allElements.forEach(el => {
            if (["HTML", "HEAD", "SCRIPT", "STYLE", "META", "TITLE", "LINK"].includes(el.tagName)) return;
            if (el.classList.contains("WYSIWYG-ignore")) return;

            if (!el.hasAttribute("data-wysiwyg-id")) {
                el.setAttribute("data-wysiwyg-id", crypto.randomUUID());
            }

            el.setAttribute("draggable", "true");

            el.addEventListener("dragstart", e => this._onDragStart(e));
            el.addEventListener("dragend", () => this._onDragEnd()); // ✅ NEW cleanup hook
            el.addEventListener("dragover", e => this._onDragOver(e));
            el.addEventListener("drop", e => this._onDrop(e));
            el.addEventListener("dragenter", e => this._onDragEnter(e));
            el.addEventListener("dragleave", e => this._onDragLeave(e));
            // prevent selecting text on elements in general
            el.addEventListener("selectstart", async e => {
                if (!el.hasAttribute('contenteditable')) {
                    e.stopPropagation();
                    e.preventDefault();
                    return
                } else {
                    e.stopPropagation();
                }
            });


            el.classList.add("wysiwyg-outline");


            // double click to make content editable
            el.addEventListener("dblclick", (e) => {
                this._makeEditable(el);
                e.stopPropagation();
            });

            //make a blur event to remove content editable
            el.addEventListener('blur', (e) => {
                if (el.hasAttribute('contenteditable')) {
                    el.removeAttribute('contenteditable');

                    this._getHtmlBody();
                }
            });


            // prevent default for all click events
            el.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                this._removeContextMenu();
            });


            this._addContextMenuItems(el);



            // Right-click context menu

        });
    }

    // add context menu item
    _addContextMenuItems(el) {
        el.addEventListener("contextmenu", (e) => {
            e.stopPropagation();
            if (e.target.isContentEditable) return;
            e.preventDefault();


            this._createContextMenu(el, e);
            this._addContextMenuItems(el);
            // Position the context menu while ensuring it doesn't go off-screen
            const menuWidth = this.contextMenu.offsetWidth;
            const menuHeight = this.contextMenu.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const x = Math.min(e.clientX, viewportWidth - menuWidth);
            const y = Math.min(e.clientY, viewportHeight - menuHeight);
            this.contextMenu.style.left = `${x}px`;
            this.contextMenu.style.top = `${y}px`;
            this.contextMenu.style.display = "block";
        });
    }

    _onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        let dropTarget = this._findNearestDraggable(e.target);
        if (!dropTarget || dropTarget === this.draggedElement) return;

        const pointerX = e.clientX;
        const pointerY = e.clientY;
        const rect = dropTarget.getBoundingClientRect();

        const width20 = rect.width * 0.3;
        const height20 = rect.height * 0.3;

        const isTop = pointerY < rect.top + height20;
        const isBottom = pointerY > rect.bottom - height20;
        const isLeft = pointerX < rect.left + width20;
        const isRight = pointerX > rect.right - width20;

        const parent = dropTarget.parentNode;

        const tagFromPalette = e.dataTransfer.getData('text/plain');
        if (tagFromPalette && !this.draggedElement) {
            const newEl = document.createElement(tagFromPalette);
            newEl.textContent = `New ${tagFromPalette}`;
            newEl.setAttribute('id', Date.now());
            newEl.setAttribute('data-wysiwyg-id', crypto.randomUUID());
            this._applyDraggableAttributes(newEl);

            if (isTop || isLeft) {
                parent.insertBefore(newEl, dropTarget);
            } else if (isBottom || isRight) {
                if (dropTarget.nextSibling) {
                    parent.insertBefore(newEl, dropTarget.nextSibling);
                } else {
                    parent.appendChild(newEl);
                }
            } else {
                dropTarget.appendChild(newEl);
            }
        } else if (this.draggedElement && dropTarget && parent) {
            if (isTop || isLeft) {
                parent.insertBefore(this.draggedElement, dropTarget);
            } else if (isBottom || isRight) {
                if (dropTarget.nextSibling) {
                    parent.insertBefore(this.draggedElement, dropTarget.nextSibling);
                } else {
                    parent.appendChild(this.draggedElement);
                }
            } else {
                dropTarget.appendChild(this.draggedElement);
            }
        }

        this._clearHighlight(dropTarget);
        this._removeDropPreview();
        this._destroyGhost();

        if (this.draggedElement) {
            this.draggedElement.classList.remove("wysiwyg-dragging");
            this.draggedElement = null;
        }

        this._getHtmlBody(); // Call to get the HTML body
    }


    _onDragEnd() {
        this._removeDropPreview();
        this._destroyGhost();

        if (this.draggedElement) {
            this.draggedElement.classList.remove("wysiwyg-dragging");
            this.draggedElement = null;
        }
    }


    _createContextMenu(el, e) {
        this._removeContextMenu();


        e.preventDefault();
        e.stopPropagation();
        const shadowDiv = document.createElement("div");
        const shadow = shadowDiv.attachShadow({ mode: 'open' });

        this.contextMenu = document.createElement("div");
        this.contextMenu.className = "wysiwyg-context-menu";
        this.contextMenu.style.position = "absolute";
        this.contextMenu.style.zIndex = "10001";
        this.contextMenu.style.background = "#222";
        this.contextMenu.style.color = "#fff";
        this.contextMenu.style.border = "1px solid #555";
        this.contextMenu.style.padding = "5px 0";
        this.contextMenu.style.borderRadius = "5px";
        this.contextMenu.style.display = "none";
        this.contextMenu.style.minWidth = "120px";
        this.contextMenu.style.boxShadow = "0 0 5px rgba(0,0,0,0.5)";
        this.contextMenu.style.fontSize = "13px";

        const addItem = (label, action) => {
            const item = document.createElement("div");
            item.textContent = label;
            item.style.padding = "6px 10px";
            item.style.cursor = "pointer";
            item.onmouseenter = () => item.style.background = "#444";
            item.onmouseleave = () => item.style.background = "transparent";
            item.onclick = () => {
                this._removeContextMenu();
                action();
            };
            this.contextMenu.appendChild(item);
        };

        document.addEventListener("click", (el) => {
            this._removeContextMenu();
        });


        document.body.appendChild(this.contextMenu);

        // Save for reuse
        this._addContextMenuItems = (el) => {
            this.contextMenu.innerHTML = "";
            // add "WYSWYG-ignore" class to the the context menu
            this.contextMenu.classList.add("WYSIWYG-ignore");


            addItem("🗑 Delete", () => {
                el.remove();
                this._getHtmlBody();
            });

            addItem("✏️ Change ID", () => {
                const currentId = el.id || "";
                const newId = prompt("Enter new ID", currentId);
                if (newId) {
                    el.id = newId;
                    this._getHtmlBody();
                }
            });

            addItem("⬆️ Move Up", () => {
                const parent = el.parentElement;
                if (parent && el.previousElementSibling) {
                    parent.insertBefore(el, el.previousElementSibling);
                    this._getHtmlBody();
                }
            });

            addItem("⬇️ Move Down", () => {
                const parent = el.parentElement;
                if (parent && el.nextElementSibling) {
                    parent.insertBefore(el.nextElementSibling, el);
                    this._getHtmlBody();
                }
            });

            // move up one level to parent element 
            addItem("🡴 Move Up One Level", () => {
                const parent = el.parentElement;
                if (parent && parent.parentElement) {
                    parent.parentElement.insertBefore(el, parent);
                    this._getHtmlBody();
                }
            });

            // make element content editable
            addItem("✏️ Edit Content", () => {
                this._makeEditable(el);
            });

            // add a new element
            addItem("➕ Add Element", () => {
                const tagName = prompt("Enter tag name (e.g., div, p, span)", "div");
                if (tagName) {
                    const newElement = document.createElement(tagName);
                    newElement.textContent = "New Element";
                    newElement.setAttribute("data-wysiwyg-id", crypto.randomUUID());
                    newElement.setAttribute("draggable", "true");
                    // milliseconds since 1970
                    let tempId = Date.now();
                    tempId = prompt("Enter new ID", tempId);
                    if (tempId) {
                        newElement.setAttribute("id", tempId);

                        this._applyDraggableAttributes(newElement);
                        el.appendChild(newElement);
                        this._getHtmlBody();
                    }
                }
            });
        };


        this._addContextMenuItems(el);
        // Position the context menu while ensuring it doesn't go off-screen
        const menuWidth = this.contextMenu.offsetWidth;
        const menuHeight = this.contextMenu.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const x = Math.min(e.clientX, viewportWidth - menuWidth);
        const y = Math.min(e.clientY, viewportHeight - menuHeight);
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = "block";




    }

    _makeEditable(el) {
        this._removeContextMenu();
        el.setAttribute('contenteditable', "true");
        el.focus();
    }
    _removeMakeEditable(el) {
        if (el.hasAttribute('contenteditable')) {
            el.removeAttribute('contenteditable');
            this._getHtmlBody();
        }
    }



    //remove context menu
    _removeContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }


    async _getHtmlBody() {
        // Clone the full document element
        const clone = document.documentElement.cloneNode(true);

        // Remove <script> tags
        const scripts = await clone.querySelectorAll("script");
        await scripts.forEach(async el => await el.remove());

        // remove all style tags
        const styles = await clone.querySelectorAll("style");
        await styles.forEach(async el => await el.remove());


        // remove all elements that have the class WYSIWYG-ignore
        const ignoreElements = await clone.querySelectorAll(".WYSIWYG-ignore");
        await ignoreElements.forEach(async el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });


        // move all <link> elements to the head
        const links = await clone.querySelectorAll("link");
        await links.forEach(async el => {
            const head = clone.querySelector("head");
            if (head) {
                head.appendChild(el);
            }
        });

        // remove all link tags that have an href that starts with blob
        const blobLinks = await clone.querySelectorAll("link");
        await blobLinks.forEach(async el => {
            const href = el.getAttribute("href");
            if (href && href.startsWith("blob")) {
                el.remove();
            }
        });

        // make all meta tags have an id that matches the name
        const metas = await clone.querySelectorAll("meta");
        await metas.forEach(async meta => {
            const name = meta.getAttribute("name");
            if (name) {
                await meta.setAttribute("id", name);
            }
        });


        // move all <style>, <meta>, <link> and <title> elements to the head
        const headElements = await clone.querySelectorAll("style, meta, link, title");
        await headElements.forEach(async el => {
            const head = clone.querySelector("head");
            if (head) {
                head.appendChild(el);
                await el.setAttribute("setParentNode", "head");
            }
        });

        // set all title elements to have id of "title"
        const titles = await clone.querySelectorAll("title");
        await titles.forEach(async el => {
            const title = el.innerText;
            if (title) {
                await el.setAttribute("id", "title");
                await el.setAttribute("setParentNode", "head");
            }
        });

        // remove the draggable and wysiwyg-id attributes
        const allElements = await clone.querySelectorAll("*");
        await allElements.forEach(async el => {
            if (el.hasAttribute("draggable")) {
                el.removeAttribute("draggable");
            }
            if (el.hasAttribute("data-wysiwyg-id")) {
                el.removeAttribute("data-wysiwyg-id");
            }
            if (el.hasAttribute('contenteditable')) {
                this._removeMakeEditable(el);
            }

        });
        // remove all classes that start with wysiwyg
        const allClasses = await clone.querySelectorAll("*");
        await allClasses.forEach(async el => {
            const classes = el.classList;
            classes.forEach(async className => {
                if (className.startsWith("wysiwyg")) {
                    el.classList.remove(className);
                }
            });
        });


        // Extract head and body content
        const head = clone.querySelector("head");
        const body = clone.querySelector("body");
        const headHtml = head?.innerHTML || "";
        const bodyHtml = body?.innerHTML || "";

        // Construct clean HTML
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            ${headHtml}
        </head>
        <body>
            ${bodyHtml}
        </body>
        </html>
    `;

        // Send to parent
        window.parent.postMessage({ type: 'html-edit', html }, '*');
        return html;
    }

}

// Usage
const editor = new WYSIWYGEditor();

createFloatingTagPalette();


function createFloatingTagPalette(tags = null) {
    if (!tags) {
        tags = [
            '-', 'div', 'p', 'span', 'h1', 'h2', 'br', 'hr', 'strong', 'em',
            '-', 'table', 'tr', 'td', 'th',
            '-', 'form', 'button', 'input', 'textarea', 'select', 'meter', 'progress',
            '-', 'details', 'summary', 'figure', 'figcaption', 'blockquote', 'hr', 'canvas',
            '-', 'section', 'article', 'nav', 'aside', 'ul', 'ol', 'li',
        ];
    }

    const panel = document.createElement('div');
    panel.className = 'WYSIWYG-ignore';
    panel.style.position = 'fixed';
    panel.style.top = '50px';
    panel.style.left = '20px';
    panel.style.width = '200px';
    panel.style.height = '200px';
    panel.style.zIndex = '99999';
    panel.style.background = '#111';
    panel.style.color = '#fff';
    panel.style.border = '1px solid #555';
    panel.style.borderRadius = '8px';
    panel.style.padding = '2px';
    panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    panel.style.cursor = 'move';
    panel.style.display = 'inline-flex';
    panel.style.flexWrap = 'wrap';
    panel.style.overflowY = 'scroll';

    // Load position from local storage if available
    const savedPosition = localStorage.getItem('floating-tag-panel-position');
    if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);
        panel.style.left = left;
        panel.style.top = top;
    }
    // add a span to the top of the panel
    const title = document.createElement('span');
    title.textContent = 'Drag to insert:';
    title.style.width = '100%';
    title.style.fontSize = '14px';
    title.style.fontWeight = 'bold';
    title.style.margin = '4px';
    title.style.color = '#00ff99';
    title.style.cursor = 'default';
    title.style.userSelect = 'none';
    title.style.pointerEvents = 'none';
    panel.appendChild(title);



    panel.setAttribute('id', 'floating-tag-panel');

    tags.forEach(tag => {
        if (tag === '-') {
            const separator = document.createElement('div');
            separator.style.width = '100%';
            separator.style.height = '1px';
            separator.style.background = '#333';
            separator.style.margin = '4px 0';
            panel.appendChild(separator);
            return;
        }
        const tagBox = document.createElement('div');
        tagBox.textContent = `${tag}`;
        tagBox.draggable = true;
        tagBox.dataset.insertTag = tag;
        tagBox.className = 'WYSIWYG-ignore';
        tagBox.style.margin = '1px';
        tagBox.style.padding = '4px 6px';
        tagBox.style.background = '#222';
        tagBox.style.border = '1px solid #333';
        tagBox.style.borderRadius = '4px';
        tagBox.style.cursor = 'grab';
        tagBox.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', tag);
        });
        panel.appendChild(tagBox);
    });

    makePanelMovable(panel);
    document.body.appendChild(panel);
}

function makePanelMovable(panel) {
    let offsetX, offsetY, isDragging = false;

    panel.addEventListener('mousedown', (e) => {
        if (e.target !== panel) return;
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
        // write the position to local storage
        localStorage.setItem('floating-tag-panel-position', JSON.stringify({ left: panel.style.left, top: panel.style.top }));
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}
