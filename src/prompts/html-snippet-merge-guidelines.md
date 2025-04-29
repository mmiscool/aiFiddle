# AI Instructions for Generating Mergeable HTML Snippets

> **IMPORTANT:**  
> These rules apply to **any and all HTML snippets** you generate.  
> **Every HTML snippet** must fully comply with these rules at all times.  
> These rules ensure that your generated HTML can be safely **automatically merged** into an existing document structure without manual editing.
> Make the smallest possible code snippet that will cause the desired change. 

You must follow these guidelines **exactly** for **every** snippet you generate.

The merge system operates under the following principles:

---

## 📋 Merge System Rules

- Each element must have a unique `id` attribute if it needs to be merged or modified.
- If no `id` is provided, a unique auto-generated ID will be assigned during normalization.
- **Duplicate IDs** between existing code and snippets will **merge attributes, children, and tagName** into the earlier node.
- Special attributes control how merging happens:
  - `DELETE_THIS_NODE` → The node will be removed.
  - `setParentNode="idOfNewParent"` → The node will be moved under the parent with the given `id`.
  - `moveBefore="targetId"` → The node will be moved **before** another node with the given `id`.
  - `moveAfter="targetId"` → The node will be moved **after** another node with the given `id`.
  - Setting an attribute's value to `DELETE_THIS_ATTRIBUTE` → That attribute will be **removed** from the node during merge.

---

# ✨ Merge Behaviors with Examples

---

## 1. Simple Insert

**Snippet:**

```html
<p id="newParagraph">This is a new paragraph.</p>
```

✅ If no element with `id="newParagraph"` exists, it will be added as a new node.

---

## 2. Merge Duplicate IDs (Attributes and Children)

**Original Code:**

```html
<div id="container">
  <p id="intro">Welcome!</p>
</div>
```

**Snippet:**

```html
<p id="intro" class="highlighted">Hello!</p>
```

✅ After merge:

```html
<div id="container">
  <p id="intro" class="highlighted">Hello!</p>
</div>
```

- `class="highlighted"` added
- `tagContent` ("Welcome!") overwritten with `"Hello!"`
- `tagName` remains `<p>`

---

## 3. Delete a Node

**Snippet:**

```html
<p id="intro" DELETE_THIS_NODE></p>
```
✅ Do not include the inner contents of the element or any other atribiutes besides the `DELETE_THIS_NODE` on thats that are to be delete. 
✅ Do not include parent nodes. Only the node being deleted. If working on a larger snippet sinply put these deletes at the end of the snippet. 
✅ The node with `id="intro"` will be completely **removed** from the document.

---

## 4. Remove a Specific Attribute

**Original Code:**

```html
<p id="intro" class="intro-text" data-info="special"></p>
```

**Snippet:**

```html
<p id="intro" class="DELETE_THIS_ATTRIBUTE"></p>
```

✅ After merge:

```html
<p id="intro" data-info="special"></p>
```

- `class` attribute was removed because its value was set to `"DELETE_THIS_ATTRIBUTE"`.
- `data-info` attribute remains untouched.

---

## 5. Reparent a Node to a New Parent

**Original Code:**

```html
<div id="outer">
  <div id="inner"></div>
</div>
```

**Snippet:**

```html
<p id="moved" setParentNode="inner">Move me inside inner</p>
```

✅ After merge:

```html
<div id="outer">
  <div id="inner">
    <p id="moved">Move me inside inner</p>
  </div>
</div>
```

---

## 6. Move a Node Before Another Node

**Original Code:**

```html
<div id="list">
  <p id="second">Second</p>
</div>
```

**Snippet:**

```html
<p id="first" moveBefore="second">First</p>
```

✅ After merge:

```html
<div id="list">
  <p id="first">First</p>
  <p id="second">Second</p>
</div>
```

---

## 7. Move a Node After Another Node

**Original Code:**

```html
<div id="list">
  <p id="first">First</p>
</div>
```

**Snippet:**

```html
<p id="second" moveAfter="first">Second</p>
```

✅ After merge:

```html
<div id="list">
  <p id="first">First</p>
  <p id="second">Second</p>
</div>
```

---

## 8. Move Across Different Parents

**Original Code:**

```html
<div id="parentA">
  <p id="moveMe">I'm moving</p>
</div>
<div id="parentB">
  <p id="target">Target here</p>
</div>
```

**Snippet:**

```html
<p id="moveMe" moveAfter="target"></p>
```

✅ After merge:

```html
<div id="parentA">
</div>
<div id="parentB">
  <p id="target">Target here</p>
  <p id="moveMe">I'm moving</p>
</div>
```

✅ The node `id="moveMe"` **hops to a new parent** automatically if needed!

---

# ⚠️ Important Rules Summary

| Behavior | Rule |
|:---|:---|
| Deleting Nodes | Add `DELETE_THIS_NODE` attribute |
| Deleting Attributes | Set attribute value to `DELETE_THIS_ATTRIBUTE` |
| Reparenting | Add `setParentNode="idOfNewParent"` |
| Moving Before/After | Add `moveBefore="id"` or `moveAfter="id"` |
| ID Uniqueness | Always ensure each node has a unique `id` |
| Attribute Merging | Latest snippet's attributes override earlier ones |
| Children Merging | Later children are appended to existing children |
| Tag Content Merging | Later tag content overwrites earlier content |

---

# ✅ Best Practices for Snippet Generation

- Always set `id` on any element you intend to merge, move, or delete.
- Keep snippets minimal and precise.
- Use `DELETE_THIS_NODE`, `setParentNode`, `moveBefore`, `moveAfter` **only when necessary**.
- Set any attribute's value to `"DELETE_THIS_ATTRIBUTE"` if you intend to remove that attribute.
- Assume that snippets will merge into an already complete `<html>` structure.

---

# 📢 FINAL REMINDER

❗ **These rules apply to every HTML snippet you generate.**  
❗ **Every snippet must comply fully — no exceptions.**  
❗ **Snippets not following these rules may fail to merge correctly.**

