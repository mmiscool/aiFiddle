export class htmlManipulator {
  constructor() {
    this.topNode = {};
    this.flatNodeList = [];
  }

  async parse(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const parseElement = (element) => {
      if (!element.tagName) return null;

      const node = {
        id: element.id || null,
        tagName: element.tagName.toLowerCase(),
        tagContent: null,
        children: [],
        attributes: []
      };

      for (let attr of element.attributes) {
        if (attr.name !== 'id') {
          node.attributes.push({ name: attr.name, value: attr.value });
        }
      }

      for (let child of element.childNodes) {  // 👈 IMPORTANT: use childNodes not children
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent.trim();
          if (text) {
            node.tagContent = text;
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childNode = parseElement(child);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      }

      this.flatNodeList.push(node);
      return node;
    };


    // 🛠 FIX: Parse from <html> element directly
    const htmlElement = doc.documentElement; // <html>
    this.topNode = parseElement(htmlElement);
  }

  async normalize() {
    await this.assignUniqueIds();
    await this.deduplicateById();
    await this.setParentNodes();
    await this.moveNodes();
    await this.removeMarkedAttributes();
    await this.removeDeletedNodes();
    return "done";
  }


  async generateHTML(autoCleanup = true) {
    if (autoCleanup) await this.normalize();


    const selfClosingTags = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr',
      'img', 'input', 'link', 'meta', 'source',
      'track', 'wbr'
    ]);

    const buildElement = (node, depth = 0) => {
      if (!node) return '';

      const indent = '  '.repeat(depth);
      const childIndent = '  '.repeat(depth + 1);
      let attrString = '';

      if (node.id) {
        attrString += ` id="${node.id}"`;
      }
      for (let attr of node.attributes) {
        attrString += ` ${attr.name}="${attr.value}"`;
      }

      if (selfClosingTags.has(node.tagName)) {
        return `${indent}<${node.tagName}${attrString}>\n`;
      }

      if (node.children.length === 0) {
        if (node.tagContent !== null) {
          if (node.tagContent.length > 40 || node.tagContent.includes('\n')) {
            // Pretty print long or multiline text
            const prettyText = node.tagContent.trim().split('\n').map(line => `${childIndent}${line.trim()}`).join('\n');
            return `${indent}<${node.tagName}${attrString}>\n${prettyText}\n${indent}</${node.tagName}>\n`;
          } else {
            // Short text stays inline
            return `${indent}<${node.tagName}${attrString}>${node.tagContent}</${node.tagName}>\n`;
          }
        } else {
          return `${indent}<${node.tagName}${attrString}></${node.tagName}>\n`;
        }
      } else {
        const childrenHTML = node.children.map(child => buildElement(child, depth + 1)).join('');
        return `${indent}<${node.tagName}${attrString}>\n${childrenHTML}${indent}</${node.tagName}>\n`;
      }
    };

    return buildElement(this.topNode).trim();
  }


  async assignUniqueIds() {
    let counter = 1;
    for (const node of this.flatNodeList) {
      if (node.tagName === "head") node.id = "head";
      if (node.tagName === "body") node.id = "body";
      if (node.tagName === "html") node.id = "html";
      if (!node.id) {
        let newId;
        do {
          newId = `auto-id-${counter++}`;
        } while (await this.findNodeById(newId)); // await here
        node.id = newId;
      }
    }
  }

  async findNodeById(id) {
    return this.flatNodeList.find(node => node.id === id) || null;
  }

  async deduplicateById() {
    const seen = new Map(); // id -> node

    // Make a copy because we'll modify flatNodeList during iteration
    for (const node of [...this.flatNodeList]) {
      if (node.id) {
        if (!seen.has(node.id)) {
          seen.set(node.id, node);
        } else {
          const existingNode = seen.get(node.id);

          // 1. Overwrite tagName
          existingNode.tagName = node.tagName;

          // 2. Merge attributes (later overrides earlier)
          for (const newAttr of node.attributes) {
            const existingAttrIndex = existingNode.attributes.findIndex(attr => attr.name === newAttr.name);
            if (existingAttrIndex !== -1) {
              existingNode.attributes[existingAttrIndex].value = newAttr.value;
            } else {
              existingNode.attributes.push({ name: newAttr.name, value: newAttr.value });
            }
          }

          // 3. Merge children (append later node's children to earlier node's children)
          existingNode.children.push(...node.children);

          // 4. Overwrite tagContent
          existingNode.tagContent = node.tagContent;

          // 5. Remove the duplicate node from tree
          await this._removeNodeFromTree(this.topNode, node);

          // 6. Remove from flatNodeList
          const index = this.flatNodeList.indexOf(node);
          if (index !== -1) {
            this.flatNodeList.splice(index, 1);
          }
        }
      }
    }
  }

  // Helper: remove node from nested tree
  async _removeNodeFromTree(currentNode, targetNode) {
    if (!currentNode.children) return false;

    const index = currentNode.children.indexOf(targetNode);
    if (index !== -1) {
      currentNode.children.splice(index, 1);
      return true;
    }

    for (const child of currentNode.children) {
      if (await this._removeNodeFromTree(child, targetNode)) {
        return true;
      }
    }

    return false;
  }

  async removeDeletedNodes() {
    for (const node of [...this.flatNodeList]) { // Make a copy because we'll modify flatNodeList
      const deleteAttrIndex = node.attributes.findIndex(attr => attr.name === "delete_this_node");
      console.log(node.attributes);
      if (deleteAttrIndex !== -1) {
        // 1. Remove from tree
        await this._removeNodeFromTree(this.topNode, node);

        // 2. Remove from flat list
        const index = this.flatNodeList.indexOf(node);
        if (index !== -1) {
          this.flatNodeList.splice(index, 1);
        }
      }
    }
  }

  async setParentNodes() {
    for (const node of [...this.flatNodeList]) { // Copy because we are modifying structure
      const reparentAttrIndex = node.attributes.findIndex(attr => attr.name === "setparentnode");

      if (reparentAttrIndex !== -1) {
        const newParentId = node.attributes[reparentAttrIndex].value;
        const newParent = await this.findNodeById(newParentId);

        if (newParent) {
          // 1. Remove from old parent
          await this._removeNodeFromTree(this.topNode, node);

          // 2. Add to new parent's children
          newParent.children.push(node);

          // 3. Remove the 'setParentNode' attribute
          node.attributes.splice(reparentAttrIndex, 1);
        } else {
          console.warn(`setParentNodes: Parent with id "${newParentId}" not found. Node "${node.id}" was not reparented.`);
        }
      }
    }
  }

  async moveNodes() {
    for (const node of [...this.flatNodeList]) {
      const moveBeforeAttrIndex = node.attributes.findIndex(attr => attr.name === "movebefore");
      const moveAfterAttrIndex = node.attributes.findIndex(attr => attr.name === "moveafter");

      if (moveBeforeAttrIndex !== -1 || moveAfterAttrIndex !== -1) {
        const moveAttrIndex = moveBeforeAttrIndex !== -1 ? moveBeforeAttrIndex : moveAfterAttrIndex;
        const moveType = moveBeforeAttrIndex !== -1 ? "before" : "after";
        const targetId = node.attributes[moveAttrIndex].value;

        const targetNode = await this.findNodeById(targetId);

        if (targetNode) {
          // 1. Remove from old parent
          await this._removeNodeFromTree(this.topNode, node);

          // 2. Find target's parent
          const targetParent = await this._findParent(this.topNode, targetNode);

          if (!targetParent) {
            console.warn(`moveNodes: Parent for target node "${targetId}" not found.`);
            continue;
          }

          // 3. Find target's index in parent's children
          const targetIndex = targetParent.children.indexOf(targetNode);

          if (targetIndex === -1) {
            console.warn(`moveNodes: Target node "${targetId}" not found in parent's children.`);
            continue;
          }

          // 4. Insert node before or after target
          const insertIndex = moveType === "before" ? targetIndex : targetIndex + 1;
          targetParent.children.splice(insertIndex, 0, node);

          // 5. Remove move attribute
          node.attributes.splice(moveAttrIndex, 1);
        } else {
          console.warn(`moveNodes: Target node "${targetId}" not found. Node "${node.id}" was not moved.`);
        }
      }
    }
  }
  async _findParent(currentNode, targetNode) {
    if (!currentNode.children) return null;

    if (currentNode.children.includes(targetNode)) {
      return currentNode;
    }

    for (const child of currentNode.children) {
      const result = await this._findParent(child, targetNode);
      if (result) return result;
    }

    return null;
  }

  async removeMarkedAttributes() {
    for (const node of this.flatNodeList) {
      node.attributes = node.attributes.filter(attr => attr.value !== "DELETE_THIS_ATTRIBUTE");
    }
  }

}

const cleanHtmlExample = `
<!DOCTYPE html>
<html lang="en">
<html>
<head></head>
<body>__BODY_CONTENT__</body>
</html>
`;
export async function mergeHTML(originalHTML, snippetToMerge) {
  const manipulator = new htmlManipulator();
  const stringToParse = cleanHtmlExample.replace('__BODY_CONTENT__', originalHTML + snippetToMerge) ;
  await manipulator.parse(stringToParse);
  const regeneratedHTML = await manipulator.generateHTML();
  console.log("before", stringToParse);
  console.log("after", regeneratedHTML)
  return regeneratedHTML;
}