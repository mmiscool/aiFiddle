
export class WYSIWYGEditor {
    constructor() {
        this.draggedElement = null;
        this.dragGhost = null;
        this.dropPreview = null;
        this._init();
    }

    _init() {
        this._applyDraggableAttributes(document.body);
        this._addStyles();
    }

    _onDragStart(e) {
        this._destroyGhost(); // ensure no previous ghost remains

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
        document.head.appendChild(style);
    }




    _applyDraggableAttributes(root) {
        const allElements = root.querySelectorAll("*");

        allElements.forEach(el => {
            if (["HTML", "HEAD", "SCRIPT", "STYLE", "META", "TITLE", "LINK"].includes(el.tagName)) return;

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

        console.log(this._getHtmlBody()); // Call to get the HTML body
    }


    _onDragEnd() {
        this._removeDropPreview();
        this._destroyGhost();

        if (this.draggedElement) {
            this.draggedElement.classList.remove("wysiwyg-dragging");
            this.draggedElement = null;
        }
    }


    _getHtmlBody() {
        //return document.body.innerHTML;
        // we want the whole document but omitting any <script> and <style> tags
        // const clone = document.body.cloneNode(true);
        // const scripts = clone.querySelectorAll("script, style");
        // scripts.forEach(script => script.remove());
        // return clone.innerHTML;


        // we want to get the whole document but omitting any <script> and <style> tags
        const clone = document.documentElement.cloneNode(true);
        const scripts = clone.querySelectorAll("script, style");
        scripts.forEach(script => script.remove());
        const head = clone.querySelector("head");
        const body = clone.querySelector("body");
        const headHtml = head ? head.innerHTML : "";
        const bodyHtml = body ? body.innerHTML : "";
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

        window.parent.postMessage({ type: 'html-edit', html  }, '*');
        return html;
        
    }

}

// Usage
const editor = new WYSIWYGEditor();