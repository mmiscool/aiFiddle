
export class ProjectPlanner {
    constructor() {
        this.requirements = [];
        this.tasks = [];
        this.loadData();
        this.initEventListeners();
    }
    initEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const addRequirementBtn = document.getElementById('addRequirementBtn');
            if (addRequirementBtn) {
                addRequirementBtn.addEventListener('click', this.addRequirement.bind(this));
            }
            const addTaskBtn = document.getElementById('addTaskBtn');
            if (addTaskBtn) {
                addTaskBtn.addEventListener('click', this.addTask.bind(this));
            }
            this.renderRequirements();
            this.renderTasks();
            const requirementsList = document.getElementById('requirementsList');
            const tasksList = document.getElementById('tasksList');
            if (requirementsList) {
                requirementsList.addEventListener('click', this.handleItemActions.bind(this));
                requirementsList.addEventListener('input', this.handleItemChange.bind(this));
                requirementsList.addEventListener('blur', this.handleItemChange.bind(this));
            }
            if (tasksList) {
                tasksList.addEventListener('click', this.handleItemActions.bind(this));
                tasksList.addEventListener('input', this.handleItemChange.bind(this));
                tasksList.addEventListener('blur', this.handleItemChange.bind(this));
                tasksList.addEventListener('change', this.handleTaskStatusChange.bind(this));
            }
        });
    }
    addRequirement() {
        const newRequirement = {
            id: `req-${ Date.now() }`,
            type: 'requirement',
            value: ''
        };
        this.requirements.push(newRequirement);
        this.saveData();
        this.renderRequirements();
        requestAnimationFrame(() => {
            const newItemElement = document.getElementById(`card-${ newRequirement.id }`);
            if (newItemElement) {
                const textarea = newItemElement.querySelector('.editable-textarea');
                if (textarea) {
                    textarea.focus();
                    this.autoResizeTextarea(textarea);
                }
            }
        });
    }
    addTask() {
        const newTask = {
            id: `task-${ Date.now() }`,
            type: 'task',
            value: '',
            subTasks: [],
            status: 'not started'
        };
        this.tasks.push(newTask);
        this.saveData();
        this.renderTasks();
        requestAnimationFrame(() => {
            const newItemElement = document.getElementById(`card-${ newTask.id }`);
            if (newItemElement) {
                const textarea = newItemElement.querySelector('.editable-textarea');
                if (textarea) {
                    textarea.focus();
                    this.autoResizeTextarea(textarea);
                }
            }
        });
    }
    updateItem(id, newValue) {
        const reqIndex = this.requirements.findIndex(item => item.id === id);
        if (reqIndex !== -1) {
            this.requirements[reqIndex].value = newValue;
            return;
        }
        const taskIndex = this.tasks.findIndex(item => item.id === id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].value = newValue;
        }
    }
    deleteItem(id) {
        this.requirements = this.requirements.filter(item => item.id !== id);
        this.tasks = this.tasks.filter(item => item.id !== id);
        const itemElement = document.getElementById(`card-${ id }`);
        if (itemElement) {
            itemElement.remove();
        }
        this.saveData();
    }
    renderRequirements() {
        const container = document.getElementById('requirementsList');
        if (!container)
            return;
        container.innerHTML = '';
        this.requirements.forEach(req => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-card requirement-card';
            itemDiv.id = `card-${ req.id }`;
            const headerDiv = document.createElement('div');
            headerDiv.className = 'item-header';
            const idSpan = document.createElement('span');
            idSpan.className = 'item-id';
            idSpan.textContent = `ID: ${ req.id }`;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'deleteBtn';
            deleteBtn.setAttribute('data-id', req.id);
            deleteBtn.setAttribute('aria-label', 'Delete');
            deleteBtn.textContent = '🗑';
            const editableTextarea = document.createElement('textarea');
            editableTextarea.className = 'editable-textarea';
            editableTextarea.setAttribute('data-id', req.id);
            editableTextarea.value = req.value;
            headerDiv.appendChild(idSpan);
            headerDiv.appendChild(deleteBtn);
            itemDiv.appendChild(headerDiv);
            itemDiv.appendChild(editableTextarea);
            container.appendChild(itemDiv);
            // Initial resize after adding to DOM
            this.autoResizeTextarea(editableTextarea);
        });
    }
    renderTasks() {
        const container = document.getElementById('tasksList');
        if (!container)
            return;
        container.innerHTML = '';
        this.tasks.forEach(task => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-card task-card';
            itemDiv.id = `card-${ task.id }`;
            const headerDiv = document.createElement('div');
            headerDiv.className = 'item-header';
            const idSpan = document.createElement('span');
            idSpan.className = 'item-id';
            idSpan.textContent = `ID: ${ task.id }`;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'deleteBtn';
            deleteBtn.setAttribute('data-id', task.id);
            deleteBtn.setAttribute('aria-label', 'Delete');
            deleteBtn.textContent = '🗑';
            const editableTextarea = document.createElement('textarea');
            editableTextarea.className = 'editable-textarea';
            editableTextarea.setAttribute('data-id', task.id);
            editableTextarea.value = task.value;
            const statusDiv = document.createElement('div');
            statusDiv.className = 'item-status';
            statusDiv.textContent = 'Status: ';
            const selectStatus = document.createElement('select');
            selectStatus.className = 'status-select';
            selectStatus.setAttribute('data-id', task.id);
            const options = [
                'not started',
                'in work',
                'completed'
            ];
            options.forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue.charAt(0).toUpperCase() + optionValue.slice(1);
                if (task.status === optionValue) {
                    option.selected = true;
                }
                selectStatus.appendChild(option);
            });
            statusDiv.appendChild(selectStatus);
            headerDiv.appendChild(idSpan);
            headerDiv.appendChild(deleteBtn);
            itemDiv.appendChild(headerDiv);
            itemDiv.appendChild(editableTextarea);
            itemDiv.appendChild(statusDiv);
            container.appendChild(itemDiv);
            // Initial resize after adding to DOM
            this.autoResizeTextarea(editableTextarea);
        });
    }
    handleItemActions(event) {
        const target = event.target;
        const deleteButton = target.closest('.deleteBtn');
        if (deleteButton && event.currentTarget.contains(deleteButton)) {
            const id = deleteButton.getAttribute('data-id');
            if (id) {
                this.deleteItem(id);
            }
        }
    }
    loadData() {
        const savedData = localStorage.getItem('projectPlanningData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.requirements = data.requirements || [];
                this.tasks = data.tasks || [];
            } catch (e) {
                console.error('Failed to parse saved data:', e);
                this.requirements = [];
                this.tasks = [];
            }
        }
    }
    saveData() {
        const data = {
            requirements: this.requirements,
            tasks: this.tasks
        };
        localStorage.setItem('projectPlanningData', JSON.stringify(data));
    }
    handleItemChange(event) {
        const target = event.target;
        if (target.classList.contains('editable-textarea') && event.currentTarget.contains(target)) {
            const itemId = target.getAttribute('data-id');
            if (itemId) {
                const newValue = target.value;
                this.updateItem(itemId, newValue);
                // Auto-resize textarea on input
                if (event.type === 'input') {
                    this.autoResizeTextarea(target);
                }
                // Save data on blur
                if (event.type === 'blur') {
                    this.saveData();
                }
            }
        }
    }
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        // Reset height
        textarea.style.height = textarea.scrollHeight + 'px';
    }
    handleTaskStatusChange(event) {
        const target = event.target;
        if (target.classList.contains('status-select') && event.currentTarget.contains(target)) {
            const id = target.getAttribute('data-id');
            const newStatus = target.value;
            if (id) {
                const taskIndex = this.tasks.findIndex(item => item.id === id);
                if (taskIndex !== -1) {
                    this.tasks[taskIndex].status = newStatus;
                    this.saveData();
                }
            }
        }
    }
}
new ProjectPlanner();