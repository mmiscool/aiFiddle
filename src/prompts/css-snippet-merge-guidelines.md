# CSS Snippet Generation Guidelines for Deterministic Merging

When generating CSS snippets to be merged into an existing stylesheet, follow these rules:

## 1. Selector Uniqueness
- Each CSS rule is identified by its selector.
- The most recent rule for a selector will **overwrite** any previous rule with the same selector.

## 2. No Merging of Declarations
- Declarations from previous rules are **not preserved**.
- A new rule completely replaces the old one for the same selector.

## 3. Parsing Model
- CSS is parsed as selector–declaration blocks.
- Blocks are compared by selector and the last matching one is retained.

## 4. Nested Rules
- Nested or media queries are supported but are not merged recursively.
- Each block is treated independently.

## 5. Formatting
- All declarations in a block should be cleanly written.
- Empty blocks or duplicate selectors should be avoided.
