import { htmlManipulator } from './html.js';

const cleanHtmlExample = `
<html>
<head></head>
<body>__BODY_CONTENT__</body>
</html>
`;

async function runTests() {
    const tests = [
        {
            name: "Simple Self-Closing Tag",
            input: `<input id="username" class="userNameInput">`,
        },
        {
            name: "Nested Tags",
            input: `<div id="container"><span id="child">Hello</span></div>`,
        },
        {
            name: "Multiple Siblings",
            input: `<div><br><img src="image.png"><hr></div>`,
        },
        {
            name: "Long Text Content",
            input: `<p>This is a very long paragraph that describes the structure and behavior of the system being tested in significant detail.</p>`,
        },
        {
            name: "Multiline Text",
            input: `<pre>\nLine 1\nLine 2\nLine 3\n</pre>`,
        },
        {
            name: "Multiple Top-Level Elements",
            input: `<h1>Title</h1><p>Paragraph below the title.</p>`,
        }
    ];

    for (const test of tests) {
        console.log(`\n--- Running Test: ${test.name} ---`);

        const manipulator = new htmlManipulator();
        const stringToParse = cleanHtmlExample.replace('__BODY_CONTENT__', test.input);
        await manipulator.parse(stringToParse);

        console.log("Parsed Top Node:", JSON.stringify(manipulator.topNode, null, 2));
        console.log("Flattened Node List:", JSON.stringify(manipulator.flatNodeList, null, 2));

        const regeneratedHTML = await manipulator.generateHTML();
        console.log("Original string sent to be parced\n", stringToParse);
        console.log("Generated Pretty HTML:\n", regeneratedHTML);

        console.log("--- End Test ---\n");
    }
}

runTests();
