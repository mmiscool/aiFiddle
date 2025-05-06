
export class WYSIWYGEditor {
    constructor() {
        this.draggedElement = null;
        this.dragGhost = null;
        this.dropPreview = null;
        this.contextMenu = null;

        this._init();
    }

    _init() {
        this._applyDraggableAttributes(document.body);
        this._addStyles();
    }

    _onDragStart(e) {
        this._destroyGhost(); // ensure no previous ghost remains

        // test if the element is content editable
        if (e.target.hasAttribute("contenteditable")) {
            //e.preventDefault();
            //e.stopPropagation();
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

        const width20 = rect.width * 0.2;
        const height20 = rect.height * 0.2;

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
            .wysiwyg-dragging {
                opacity: 0.4 !important;
            }
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

        `;

        style.id = "wysiwyg-drag-drop-styles";
        document.head.appendChild(style);
        style.id = "wysiwyg-drag-drop-styles";
    }




    _applyDraggableAttributes(root) {
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

            // double click to make content editable
            el.addEventListener("dblclick", (e) => {
                this._makeEditable(el);
                e.stopPropagation();
            });

            //make a blur event to remove content editable
            el.addEventListener('blur', (e) => {
                if (el.hasAttribute('contenteditable')) {
                    el.removeAttribute('contenteditable');
                }
            });


            // prevent default for all click events
            el.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                this._removeContextMenu();
            });






            // Right-click context menu
            el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();

                this._createContextMenu();
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
        });
    }

    _onDrop(e) {
        e.preventDefault();

        let dropTarget = this._findNearestDraggable(e.target);
        if (!dropTarget || dropTarget === this.draggedElement) return;

        const pointerX = e.clientX;
        const pointerY = e.clientY;
        const rect = dropTarget.getBoundingClientRect();

        const width20 = rect.width * 0.2;
        const height20 = rect.height * 0.2;

        const isTop = pointerY < rect.top + height20;
        const isBottom = pointerY > rect.bottom - height20;
        const isLeft = pointerX < rect.left + width20;
        const isRight = pointerX > rect.right - width20;

        const parent = dropTarget.parentNode;

        if (this.draggedElement && dropTarget && parent) {
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


    _createContextMenu() {
        this._removeContextMenu();

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
            // el.preventDefault();
            // el.stopPropagation();

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
        };
    }

    _makeEditable(el) {
        this._removeContextMenu();
        el.setAttribute("contenteditable", "true");
        el.focus();
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
            if (el.hasAttribute("contenteditable")) {
                el.removeAttribute("contenteditable");
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