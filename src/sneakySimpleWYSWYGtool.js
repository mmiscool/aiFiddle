function overlayRenderedElementsWithEdges() {
    const allElements = document.querySelectorAll('*');

    const lineThickness = 10;

    allElements.forEach(el => {
        const style = window.getComputedStyle(el);

        // Skip elements not rendered
        if (style.display === 'none' || el.offsetParent === null) return;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const baseLeft = rect.left + scrollX;
        const baseTop = rect.top + scrollY;

        const idText = el.id ? el.id : '(no id)';

        // Create main overlay box
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = `${baseLeft}px`;
        overlay.style.top = `${baseTop}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.border = '3px solid red';
        overlay.style.boxSizing = 'border-box';
        overlay.style.pointerEvents = 'auto';
        overlay.style.zIndex = '999999';
        overlay.title = `Overlay for #${idText}`;
        overlay.onclick = () => alert(`Clicked main overlay for ID: ${idText}`);
        document.body.appendChild(overlay);

        // Create 4 blue edge overlays
        const edgeSpecs = [
            { top: baseTop - lineThickness, left: baseLeft, width: rect.width, height: lineThickness },                      // Top
            { top: baseTop, left: baseLeft + rect.width, width: lineThickness, height: rect.height },           // Right
            { top: baseTop + rect.height, left: baseLeft, width: rect.width, height: lineThickness },           // Bottom
            { top: baseTop, left: baseLeft - lineThickness, width: lineThickness, height: rect.height }                     // Left
        ];

        edgeSpecs.forEach(spec => {
            const edgeDiv = document.createElement('div');
            edgeDiv.style.position = 'absolute';
            edgeDiv.style.left = `${spec.left}px`;
            edgeDiv.style.top = `${spec.top}px`;
            edgeDiv.style.width = `${spec.width}px`;
            edgeDiv.style.height = `${spec.height}px`;
            edgeDiv.style.background = 'rgba(0, 128, 255, 0.4)';
            edgeDiv.style.pointerEvents = 'auto';
            edgeDiv.style.zIndex = '999998';
            edgeDiv.title = `Edge of #${idText}`;
            edgeDiv.onclick = () => alert(`Clicked edge overlay for ID: ${idText}`);
            document.body.appendChild(edgeDiv);
        });
    });
}






//overlayRenderedElementsWithEdges();