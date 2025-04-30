import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import system_prompt from "bundle-text:./prompts/system.md"
import { conversation, writeSetting, listSettings, writeSetting, readSetting, replaceSettingIfNotFound } from "./llmCall.js";


let editorManager = null;

// new class extends conversation
export class ChatUI extends conversation {
    constructor(EditorManager) {
        super();
        editorManager = EditorManager;
        this.chatDiv = document.createElement("div");
        this.chatDiv.className = "chat";
        this.chatDiv.style.height = "100%";
        this.model = readSetting(`llm/default_model`);

        this.setup();
    }

    async setup() {
        this.setupSystemPrompts();
        this.createConversationUI();
        this.createSettingsUI();




        this.model = await readSetting(`llm/default_model`);
        await this.setModel();
        // attempt to read the api keys for each service
        for (let i = 0; i < this.llmServices.length; i++) {
            const service = this.llmServices[i];
            await readSetting(`llmConfig/${service.name}-api-key.txt`);
        }


        if (await readSetting(`prompts/system.md`) !== system_prompt) {
            const answer = await confirm("You have either customized your prompt or the default prompt has changed.\n Would you like to updated to the latest default prompt?")
            if (answer) writeSetting(`prompts/system.md`, system_prompt)

        }

        await replaceSettingIfNotFound(`prompts/system.md`, system_prompt);
        await replaceSettingIfNotFound(`llm/default_model`, "openai|gpt-4o-mini");
        return true;
    }

    async setMesaageInput(message) {
        this.messageInput.value = message;
    }
    async appendMesaageInput(message) {
        this.messageInput.value += message;
    }

    async setupSystemPrompts() {
        await this.addMessage({ role: "system", content: await readSetting(`prompts/system.md`), hidden: true, temp: false });
        await this.addMessage({ role: "user", content: "", hidden: true, temp: false, dynamicContent: "javascript" });
        await this.addMessage({ role: "user", content: "", hidden: true, temp: false, dynamicContent: "html" });
        await this.addMessage({ role: "user", content: "", hidden: true, temp: false, dynamicContent: "css" });
        await this.updateConversationDynamicContent();
        await this.renderConversationMessages();
    }


    async createConversationUI() {
        this.conversationDiv = document.createElement("div");
        this.conversationDiv.className = "conversation";
        this.chatDiv.appendChild(this.conversationDiv);

        this.topArea = document.createElement("div");
        this.topArea.className = "top-area";
        this.conversationDiv.appendChild(this.topArea);

        // add conversation title as a h3 element
        this.titleElement = document.createElement("h3");
        this.titleElement.innerText = this.title;
        this.titleElement.className = "conversation-title";
        this.topArea.appendChild(this.titleElement);

        const bottomArea = document.createElement("div");
        bottomArea.className = "bottom-area";
        this.conversationDiv.appendChild(bottomArea);

        this.messageInput = document.createElement("textarea");
        this.messageInput.className = "message-input";
        this.messageInput.placeholder = "Type your message here...";
        this.messageInput.value = ``;
        bottomArea.appendChild(this.messageInput);

        const sendButton = document.createElement("button");
        sendButton.className = "send-button";
        sendButton.innerText = "Send";
        sendButton.addEventListener("click", () => {
            this.submitMessageButtonEvent();
        });
        bottomArea.appendChild(sendButton);

        const controlsRow = document.createElement("div");
        controlsRow.className = "controls-row";
        bottomArea.appendChild(controlsRow);

        const modelSelector = document.createElement("select");
        modelSelector.className = "model-selector";
        controlsRow.appendChild(modelSelector);

        // use super.listAllModels() to get the models list and populate the selector
        const models = await this.listAllModels();
        await models.forEach(async model => {
            const option = document.createElement("option");
            option.value = model;
            option.innerText = model;
            // modify the innerText to replace the  "|" character with a "  |  " string
            option.innerText = model.replace(/\|/g, "___");
            await modelSelector.appendChild(option);
        });

        modelSelector.value = this.model;


        modelSelector.addEventListener("change", async () => {
            await super.setModel(modelSelector.value);
            await writeSetting(`llm/default_model`, modelSelector.value);
        });


        const settingsButton = document.createElement("button");
        settingsButton.className = "settings-button";
        settingsButton.innerText = "⚙️";
        settingsButton.title = "Switch to settings mode";
        settingsButton.addEventListener("click", () => {
            this.settingsDialog.showModal();
        });
        controlsRow.appendChild(settingsButton);
    }


    async submitMessageButtonEvent() {
        const message = `${this.messageInput.value}
Be sure to folow the explicit merge rules for the snippet language. 
Limit your snippets to the minimum required to comply with the merge rules.
Do not regenrated the whole pice of code from scratch each time excecpt for CSS. CSS required each chunk to be complete.
        `
        if (message) {
            await this.updateConversationDynamicContent();
            await this.renderConversationMessages();
            await super.addMessage({ role: "user", content: message, hidden: false, temp: false });
            await this.addMessageDiv({ role: "user", content: message, hidden: false, temp: false });
            const tempMessageDiv = await this.addMessageDiv({ role: "user", content: message, hidden: false, temp: false });
            this.messageInput.value = "";

            await super.callLLM(true, tempMessageDiv);
            await this.renderConversationMessages();
            console.log(this.messages);
        }
    }

    async updateConversationDynamicContent() {
        // loop over all the messages and check if the message has the dynamicContent property
        for (let i = 0; i < this.messages.length; i++) {
            const message = this.messages[i];
            if (message.dynamicContent) {
                console.log("Dynamic Content: ", message.dynamicContent);
                if (message.dynamicContent === "javascript") message.content = "This is the projects javascript code \n\n```javascript \n\n" + editorManager.project.js + "\n\n```";
                if (message.dynamicContent === "html") message.content = "This is the projects html code \n\n```html \n\n" + editorManager.project.html + "\n\n```";
                if (message.dynamicContent === "css") message.content = "This is the projects css code \n\n```css \n\n" + editorManager.project.css + "\n\n```";
            }
        }
        return true
    }

    async renderConversationMessages() {
        this.titleElement.innerText = this.title;

        // remove all divs with class message
        const messageDivs = this.conversationDiv.querySelectorAll(".message");
        await messageDivs.forEach(async div => {
            await div.remove();
        });




        // use a for loop to itterate over each this.message
        for (let i = 0; i < this.messages.length; i++) {
            const message = this.messages[i];


            await this.addMessageDiv(message);
        }


    }


    async addMessageDiv(message) {
        const messageDiv = document.createElement("div");
        await this.topArea.appendChild(messageDiv);
        if (message.hidden) {
            messageDiv.style.display = "none";
        }
        messageDiv.className = "message";
        messageDiv.innerText = message.content;
        if (message.role === "user") {
            messageDiv.classList.add("message");
        } else {
            messageDiv.classList.add("response");
        }
        this.topArea.scrollTop = this.topArea.scrollHeight;

        await renderMarkdown(message.content, messageDiv);

        //console.log("Message Div: ", messageDiv);
        return messageDiv;
    }

    async createSettingsUI() {
        this.settingsDialog = document.createElement("dialog");

        this.settingsDialog.addEventListener("close", async () => {

            // ensure that at least one of the key settings is set
            const settings = await listSettings();
            const keys = settings.filter(setting => setting.name.includes("key"));
            const keysSet = keys.filter(setting => setting.value !== "");
            if (keysSet.length === 0) {
                alert("You must set at least one API key for the LLM services.");
                this.settingsDialog.showModal();
                return;
            }
            // close the dialog
            this.settingsDialog.close();
        });



        this.settingsDialog.className = "dialog";
        document.body.appendChild(this.settingsDialog);
        this.settingsDialog.showModal();

        // make a div to hold the dialog's content
        const dialogContent = document.createElement("div");
        dialogContent.className = "dialog-content";
        this.settingsDialog.appendChild(dialogContent);


        // add a button to the top of the settings div to switch to the chat div
        const chatButton = document.createElement("button");
        chatButton.innerText = "X";
        // tooltip
        chatButton.title = "<----Back to chat";
        chatButton.addEventListener("click", () => {
            this.settingsDialog.close();
        });

        Object.assign(chatButton.style, {
            position: "absolute",
            top: "0px",
            right: "0px",
            width: "30px",
            height: "30px",
            background: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "50%",
            fontSize: "1.2em",
            fontWeight: "bold",
            lineHeight: "30px",
            textAlign: "center",
            cursor: "pointer"
        });


        dialogContent.appendChild(chatButton);


        const settings = await listSettings();
        //console.log("Settings: ", settings);

        // sort the settings by name
        settings.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });


        // itterate over settings and create a input for each setting.
        // make it so that the setting value is writted immediately on change
        settings.forEach(setting => {
            const label = document.createElement("label");
            label.innerText = setting.name;
            // replace "llmConfig/" with "" in the label
            label.innerText = label.innerText.replace("llmConfig/", "");
            label.innerText = label.innerText.replace(".txt", "");
            label.style.width = "100%";
            label.style.marginTop = "10px";

            let input = document.createElement("input");
            // check if the name contains the word prompt. If it is a prompt then create a textarea
            if (setting.name.includes("prompt")) {
                input = document.createElement("textarea");
                //input.style.height = "400px";
            } else if (setting.name.includes("key")) {
                input.type = "password";
            } else {
                input.type = "text";
            }

            input.id = setting.name;
            input.value = setting.value;
            input.addEventListener("change", async () => {
                await this.saveSettings();
            });
            dialogContent.appendChild(label);
            dialogContent.appendChild(input);

            // add an onchange event to the input
            input.addEventListener("change", async () => {
                await writeSetting(setting.name, input.value);
            });

        });

    }
}





function renderMarkdown(md, targetElement) {
    const html = marked(md, {
        highlight: (code, lang) => {
            return hljs.highlightAuto(code, [lang]).value;
        }
    });

    targetElement.innerHTML = html;
    targetElement.classList.add("rendered-markdown");
    enhanceCodeBlocks(targetElement);
}

function enhanceCodeBlocks(container) {
    container.querySelectorAll("pre code").forEach(codeBlock => {
        const pre = codeBlock.parentElement;

        const btnContainer = document.createElement("div");
        btnContainer.className = "code-buttons";

        const copyBtn = document.createElement("button");
        copyBtn.textContent = "📋 Copy";
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(codeBlock.textContent);
        };

        const alertBtn = document.createElement("button");
        alertBtn.textContent = "🤖✎⚡";
        alertBtn.onclick = async () => {
            const lang = await codeBlock.className.split(" ").find(cls => cls.startsWith("language-")).replace("language-", "");
            await editorManager.applyChanges(lang, codeBlock.textContent);
        };

        btnContainer.append(copyBtn, alertBtn);
        pre.prepend(btnContainer);
    });
}