
export class Item {
    constructor(id, title = '', longDescription = '', children = []) {
        this.id = id;
        this.title = title;
        this.longDescription = longDescription;
        this.children = children;
    }
}
export class Requirement extends Item {
    constructor(id) {
        super(id);
    }
}
export class Task extends Item {
    constructor(id) {
        super(id);
        this.status = 'pending';
    }
}
export class ProjectManager {
    constructor(projectName) {
        this.projectName = projectName;
        this.storageKey = `project_${ projectName }`;
        this.requirements = [];
        this.tasks = [];
        this.load();
    }
    generateId() {
        return Date.now().toString();
    }
    load() {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                this.requirements = data.requirements || [];
                this.tasks = data.tasks || [];
            } catch (e) {
                alert('Failed to load project data.');
            }
        }
    }
    save() {
        const data = {
            requirements: this.requirements,
            tasks: this.tasks,
            lastUpdated: Date.now(),
            markDownString: this.generateMarkdown()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    generateMarkdown() {
        const renderItem = (item, type, depth = 0) => {
            const indent = '  '.repeat(depth);
            let md = `${ indent }- **${ item.title || 'Untitled' }**\n`;
            if (item.longDescription) {
                md += `${ indent }  ${ item.longDescription }\n`;
            }
            if (type === 'task') {
                md += `${ indent }  _Status: ${ item.status }_\n`;
            }
            const children = (type === 'requirement' ? this.requirements : this.tasks).filter(child => item.children.includes(child.id));
            for (const child of children) {
                md += renderItem(child, type, depth + 1);
            }
            return md;
        };
        let md = `# Requirements\n`;
        for (const item of this.requirements.filter(r => !this.requirements.some(p => p.children.includes(r.id)))) {
            md += renderItem(item, 'requirement');
        }
        md += `\n# Tasks\n`;
        for (const item of this.tasks.filter(t => !this.tasks.some(p => p.children.includes(t.id)))) {
            md += renderItem(item, 'task');
        }
        return md;
    }
    addRequirement() {
        const id = this.generateId();
        this.requirements.push(new Requirement(id));
        this.save();
    }
    addTask() {
        const id = this.generateId();
        this.tasks.push(new Task(id));
        this.save();
    }
    exportProject() {
        return JSON.stringify({
            requirements: this.requirements,
            tasks: this.tasks,
            lastUpdated: Date.now()
        }, null, 2);
    }
    importProject(json) {
        try {
            const data = JSON.parse(json);
            this.requirements = data.requirements || [];
            this.tasks = data.tasks || [];
            this.save();
        } catch (e) {
            alert('Import failed: Invalid JSON.');
        }
    }
    findItem(type, id) {
        const list = type === 'requirement' ? this.requirements : this.tasks;
        return list.find(item => item.id === id);
    }
    removeItem(type, id) {
        const list = type === 'requirement' ? this.requirements : this.tasks;
        const index = list.findIndex(item => item.id === id);
        if (index !== -1) {
            list.splice(index, 1);
            for (const parent of list) {
                parent.children = parent.children.filter(childId => childId !== id);
            }
            this.save();
        }
    }
}
export class Renderer {
    constructor(pm) {
        this.pm = pm;
        this.reqContainer = document.getElementById('requirementsContainer');
        this.taskContainer = document.getElementById('tasksContainer');
        this.draggedItem = null;
        this.initEventListeners();
    }
    render() {
        this.reqContainer.innerHTML = '';
        this.taskContainer.innerHTML = '';
        this.renderTree('requirement', this.pm.requirements, this.reqContainer);
        this.renderTree('task', this.pm.tasks, this.taskContainer);
    }
    renderTree(type, list, container, parentId = null) {
        const rootItems = list.filter(item => {
            if (parentId) {
                const parent = this.pm.findItem(type, parentId);
                return parent && parent.children.includes(item.id);
            }
            return !list.some(p => p.children.includes(item.id));
        });
        for (const item of rootItems) {
            const card = this.createCard(type, item);
            container.appendChild(card);
            const childContainer = document.createElement('div');
            childContainer.className = 'nested';
            container.appendChild(childContainer);
            if (item.children.length > 0) {
                this.renderTree(type, list, childContainer, item.id);
            }
        }
    }
    createCard(type, item) {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('draggable', true);
        card.dataset.id = item.id;
        card.dataset.type = type;
        card.addEventListener('dragstart', () => {
            this.draggedItem = {
                id: item.id,
                type
            };
        });
        card.addEventListener('dragover', e => {
            e.preventDefault();
            card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });
        card.addEventListener('drop', e => {
            e.preventDefault();
            card.classList.remove('drag-over');
            const sourceId = this.draggedItem.id;
            const sourceType = this.draggedItem.type;
            const targetId = item.id;
            const targetType = type;
            if (sourceType !== targetType || sourceId === targetId)
                return;
            const sourceItem = this.pm.findItem(sourceType, sourceId);
            const targetItem = this.pm.findItem(targetType, targetId);
            const isDescendant = (target, idToCheck) => {
                if (!target.children)
                    return false;
                if (target.children.includes(idToCheck))
                    return true;
                return target.children.some(childId => {
                    const child = this.pm.findItem(targetType, childId);
                    return child && isDescendant(child, idToCheck);
                });
            };
            if (isDescendant(sourceItem, targetId))
                return;
            const list = sourceType === 'requirement' ? this.pm.requirements : this.pm.tasks;
            for (const parent of list) {
                parent.children = parent.children.filter(id => id !== sourceId);
            }
            targetItem.children.push(sourceId);
            this.pm.save();
            this.render();
        });
        const title = document.createElement('input');
        title.value = item.title;
        title.placeholder = 'Title';
        title.oninput = e => {
            item.title = e.target.value;
            this.pm.save();
        };
        const desc = document.createElement('textarea');
        desc.value = item.longDescription;
        desc.placeholder = 'Description';
        desc.rows = 2;
        desc.oninput = e => {
            item.longDescription = e.target.value;
            this.pm.save();
        };
        card.appendChild(title);
        card.appendChild(desc);
        if (type === 'task') {
            const status = document.createElement('select');
            [
                'pending',
                'started',
                'completed'
            ].forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                if (item.status === s)
                    opt.selected = true;
                status.appendChild(opt);
            });
            status.onchange = e => {
                item.status = e.target.value;
                this.pm.save();
            };
            card.appendChild(status);
        }
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.onclick = () => {
            this.pm.removeItem(type, item.id);
            this.render();
        };
        actions.appendChild(delBtn);
        card.appendChild(actions);
        return card;
    }
    initEventListeners() {
        document.getElementById('export_project').addEventListener('click', exportProject);
        document.getElementById('import_project').addEventListener('click', importProject);
        document.getElementById('copy_markdown').addEventListener('click', copyMarkdown);
        document.getElementById('requirement_add').addEventListener('click', () => {
            addRequirement();
            this.render();
        });
        document.getElementById('task_add').addEventListener('click', () => {
            addTask();
            this.render();
        });
    }
}
const projectManager = new ProjectManager('myProjectName');
const renderer = new Renderer(projectManager);
export function addRequirement() {
    projectManager.addRequirement();
    renderer.render();
}
export function addTask() {
    projectManager.addTask();
    renderer.render();
}
export function exportProject() {
    const json = projectManager.exportProject();
    prompt('Copy your project JSON:', json);
}
export function importProject() {
    const json = prompt('Paste your project JSON:');
    if (json) {
        projectManager.importProject(json);
        renderer.render();
    }
}
export function copyMarkdown() {
    const md = projectManager.generateMarkdown();
    navigator.clipboard.writeText(md).then(() => alert('Markdown copied to clipboard.')).catch(() => alert('Failed to copy markdown.'));
}
renderer.render();