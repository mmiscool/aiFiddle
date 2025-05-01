import postcss from 'postcss';

export class cssManipulator {
    constructor(code = '') {
        this.code = code;
        this.ast = null;
    }

    async setCode(code) {
        this.code = code;
        this.ast = postcss.parse(this.code);
        return this.code;
    }

    async parse() {
        this.ast = postcss.parse(this.code);
        return this.ast;
    }

    async mergeCode(newCode) {
        const newAst = await postcss.parse(newCode);
        await this._mergeRules(newAst);   // Merge snippet first
        await this.mergeDuplicates();     // Then clean everything
        return this.generateCode();
    }

    _mergeRules(newAst) {
        const existingRules = new Map();

        this.ast.walkRules(rule => {
            if (!existingRules.has(rule.selector)) {
                existingRules.set(rule.selector, rule);
            }
        });

        newAst.walkRules(newRule => {
            // Entire block deletion marker
            const isDeleteBlock =
                newRule.nodes.length === 1 &&
                newRule.nodes[0].prop === 'DELETE_THIS' &&
                newRule.nodes[0].value === 'DELETE_THIS';

            if (isDeleteBlock) {
                const existing = this.ast.nodes.find(r =>
                    r.type === 'rule' && r.selector === newRule.selector
                );
                if (existing) {
                    existing.remove();
                }
                return;
            }

            const existing = existingRules.get(newRule.selector);
            if (existing) {
                const existingDecls = new Map();
                existing.walkDecls(decl => existingDecls.set(decl.prop, decl));

                newRule.walkDecls(decl => {
                    const value = decl.value.trim();
                    if (value === 'DELETE_THIS') {
                        existingDecls.delete(decl.prop);
                    } else if (value) {
                        existingDecls.set(decl.prop, decl);
                    }
                });

                existing.removeAll();
                for (const decl of existingDecls.values()) {
                    existing.append(decl);
                }
            } else {
                this.ast.append(newRule.clone());
            }
        });
    }

    async mergeDuplicates() {
        const ruleMap = new Map();

        this.ast.walkRules(rule => {
            const key = `${rule.parent?.type === 'atrule' ? rule.parent.toString() + '|' : ''}${rule.selector}`;

            const isDeleteBlock =
                rule.nodes.length === 1 &&
                rule.nodes[0].prop === 'DELETE_THIS' &&
                rule.nodes[0].value === 'DELETE_THIS';

            if (isDeleteBlock) {
                rule.remove();
                return;
            }

            if (!ruleMap.has(key)) {
                ruleMap.set(key, rule);
            } else {
                const existing = ruleMap.get(key);
                const declMap = new Map();

                existing.walkDecls(decl => declMap.set(decl.prop, decl));

                rule.walkDecls(decl => {
                    const value = decl.value.trim();
                    if (value === 'DELETE_THIS') {
                        declMap.delete(decl.prop);
                    } else if (value) {
                        declMap.set(decl.prop, decl);
                    }
                });

                existing.removeAll();
                for (const decl of declMap.values()) {
                    existing.append(decl);
                }

                rule.remove();
            }
        });
    }

    generateCode() {
        const result = this.ast.toString();
        this.code = result;
        return result;
    }

    getCode() {
        return this.code;
    }
}

