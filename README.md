# aiFiddle
Minimalist browser based AI assisted code editor with live preview.
https://aifiddle.aicoderproject.com/

This uses the same merging methodology of the aiCoder project and expands to html and CSS in a browser based editor with immediate execution. 


Install from source:
```bash
pnpm install
# You only have to build the workers once.
pnpm run build:monaco-workers   
```


Build instructions.
```bash
# Make sure you followed the install instructions first.
pnpm run build
# output will be in ./dist
```

Run dev server:
```bash
pnpm run dev
```





# What makes this different from other LLM powered coding tools?
This tool uses AST (abstract syntax trees) to automatically merge LLM generate code snippets in to existing code. Because the process we use to merge LLM generate snippets is deterministic it is extremely relegable.

### Problems with current code generation methods:
- Whole code file is regenerated each time a change is made
- LLMs some times like to forget things and delete large chunks of your original file when regenerating the whole file each time.
- LLM output is not guaranteed to be syntactically correct. 

### How we solve these problems
- By merging snippets that follow specific rules we can surgically modify the original code with out regenerating the whole file.
- Code is never accidentally deleted as any function or method not included in the snippet is touched. 
- Using ASTs to merge snippets with original code makes it impossible to merge syntactically incorrect code preventing corruption.  

We provide the rules for how to format code snippets to the LLM. See the [Snippet generation prompt](src/prompts/system.md) for what the rules are.
You can take a look at the actual code used for doing the AST merging in the [snipsplicer repo](https://github.com/mmiscool/snipsplicer).



# Credits
This project uses various npm packages. 
[See ./3rdPartyLicenseCredits.md](3rdPartyLicenceCredits.md) for the complete list.