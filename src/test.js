import { DockviewComponent } from 'dockview-core';

const container = document.getElementById('container');

// Create the dockview instance
const dockview = new DockviewComponent({
    parentElement: container,
    floatingGroupBoundsProvider: () => ({
        top: 50,
        left: 50,
        width: 600,
        height: 400
    })
});

// Add a panel
dockview.addPanel({
    id: 'panel_1',
    contentComponent: 'textComponent',
    title: 'My Panel'
});

// Register a content renderer
dockview.registerComponent('textComponent', (container, _state) => {
    container.innerText = 'Hello from Dockview (no React)';
});
