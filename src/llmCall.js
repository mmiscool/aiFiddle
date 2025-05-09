import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";



export async function readSetting(key) {
    let path = "setting." + key;
    return await readFile(path);
}
export async function writeSetting(key, value) {
    key = "setting." + key;
    await checkForKey(key);
    writeFile(key, value);
}
export async function listSettings() {
    // look at all keys in local storage and return the ones that start with setting.
    const settings = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('setting.')) {
            // remove the setting. from the key
            const newKey = await key.replace('setting.', '');
            settings.push({ name: newKey, value: localStorage.getItem(key) });
        }
    }
    return settings;
}

export async function readFile(filePath) {
    await checkForKey(filePath);
    return localStorage.getItem(filePath);
}
export async function writeFile(filePath, content) {
    localStorage.setItem(filePath, content);
}

export async function deleteFile(filePath) {
    localStorage.removeItem(filePath);
    //alert(`File ${filePath} deleted.`);
}
export async function deleteSetting(key) {
    // remove the setting. from the key
    const newKey = await key.replace('setting.', '');
    localStorage.removeItem(newKey);
}


async function checkForKey(key) {
    if (localStorage[key] === undefined) {
        console.log(`key ${key} not found in localStorage. Creating a new key.`);
        localStorage[key] = "";

    }
    return localStorage[key];
}


export async function replaceSettingIfNotFound(key, value, skipConfirmOverwrite = false) {
    // check if the key exists in local storage
    const existingValue = await readSetting(key);
    if (existingValue === undefined || existingValue === null || existingValue === "") {
        alert(`Key ${key} not found in localStorage. Creating a new key.`);
        await writeSetting(key, value);
    } else {
        if (await readSetting(key) !== value) {
            if (!skipConfirmOverwrite) {
                const answer = await confirm("The default system prompt has been updated. \n Would you like to update your modified prompt?")
                if (answer) await writeSetting(key, value);
            } else {
                await writeSetting(key, value);
            }
        }
    }
}



let throttleTime = 20; // seconds
let lastCallTime = 0;

async function throttle() {
    const currentTime = new Date().getTime();
    if (currentTime < lastCallTime + throttleTime * 1000) {
        const remainingTime = (lastCallTime + throttleTime * 1000) - currentTime;
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    lastCallTime = new Date().getTime();
    console.log("done waiting");
    return "It's done waiting";
}

export class conversation {
    constructor() {
        this.messages = [];
        this.title = 'New Conversation';
        this.model = '';
        this.service = '';
        this.modelName = ''
        this.llmServices = [
            {
                name: 'openai',
                baseURL: null
            },
            {
                name: 'groq',
                baseURL: 'https://api.groq.com/openai/v1'
            },
            {
                name: 'X',
                baseURL: 'https://api.x.ai/v1'
            },
            {
                name: 'Google Gemini',
                baseURL: 'https://api.google.com/v1'
            }

        ];


    }






    async addMessage({ role, content = "", hidden = false, temp = false, dynamicContent = null }) {
        if (content == "" & dynamicContent == null) {
            console.log('content is empty');
            return;
        }

        await this.messages.push({
            role,
            content,
            hidden,
            dynamicContent,
        });

        return console.log(this.messages);
    }

    async lastMessage() {
        return this.messages[this.messages.length - 1].content;
    }
    async callLLM(addResponse = true, tempMessageDiv = null) {
        let llmResponse = '';
        if (this.service === "Google Gemini") {
            const googleGenAI = new GoogleGenAI({
                apiKey: await readSetting(`llmConfig/${this.service}-api-key.txt`),
                dangerouslyAllowBrowser: true,
            });


            // extract all the system prompts from the messages and concatenate them into a single string
            let systemPrompts = "";
            for (const message of this.messages) {
                if (message.role === 'system') {
                    systemPrompts += message.content + "\n";
                }
            }

            // take all the user messages excluding system messages and concatenate them into a single string
            let userMessages = "";
            for (const message of this.messages) {
                if (message.role === 'user') {
                    userMessages += message.content + "\n-----------------------------------------------------\n";
                }
            }

            //const ai = new GoogleGenAI({ apiKey: "GEMINI_API_KEY" });
            const ai = new GoogleGenAI({
                apiKey: await readSetting(`llmConfig/${this.service}-api-key.txt`),
                dangerouslyAllowBrowser: true,
            });



            const response = await ai.models.generateContentStream({
                model: this.modelName,
                contents: userMessages,
                config: {
                    systemInstruction: systemPrompts,
                },
            });


            llmResponse = '';
            for await (const chunk of response) {
                tempMessageDiv.innerText = llmResponse;
                // get the dom parent of the tempMessageDiv
                const parent = tempMessageDiv.parentElement;
                //console.log('parent:', parent); // Debugging line
                // scroll the parent to the bottom
                parent.scrollTop = parent.scrollHeight;
                llmResponse += chunk.text;
                //console.log(chunk.text);
            }

        } else {
            llmResponse = await this.getOpenAIResponse(tempMessageDiv);
            llmResponse = await llmResponse.trim();
        }


        if (addResponse) await this.addMessage({ role: 'assistant', content: llmResponse, hidden: false });



        if (this.title == "New Conversation") await this.generateTitle();


        return llmResponse;
    }

    async getOpenAIResponse(tempMessageDiv = null) {
        if (this.service === "groq") await throttle();
        // read the api key from the setting file taking in to account this.service
        const apiKey = await readSetting(`llmConfig/${this.service}-api-key.txt`);

        // set the base URL from the service
        const baseURL = this.llmServices.find(service => service.name === this.service)?.baseURL || null;


        // make a messages array that only contains the role and content fields
        let cleanedMessages = [];
        for (const message of this.messages) {
            await cleanedMessages.push({
                role: message.role,
                content: message.content,
            })
        }



        let openai;
        if (baseURL) {
            openai = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });
        } else {
            openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        }


        let responseText = '';

        const resultStream = await openai.chat.completions.create({
            model: this.modelName,
            messages: cleanedMessages,
            stream: true
        });


        for await (const chunk of resultStream) {
            const content = chunk.choices[0]?.delta?.content || '';
            //await console.log(content); // Real-time printing to console
            responseText += content;
            if (tempMessageDiv) {
                //console.log('tempMessageDiv:', tempMessageDiv.parent); // Debugging line

                tempMessageDiv.innerText = responseText;
                // get the dom parent of the tempMessageDiv
                const parent = tempMessageDiv.parentElement;
                //console.log('parent:', parent); // Debugging line
                // scroll the parent to the bottom
                parent.scrollTop = parent.scrollHeight;
            }

        }
        return responseText;
    }


    async generateTitle() {
        this.title = 'generating title now...';
        const prompt = 'Generate a title for the following conversation. Respond with a single short line of text: ';
        await this.addMessage({ role: 'user', content: prompt, temp: true });
        this.title = await this.callLLM(false);
        this.messages.pop(); // remove the last message
        return this.title;
    }


    async getOpenAIModels(apiKey, baseURL = null) {
        if (!apiKey) return [];

        let openai;
        if (baseURL) {
            openai = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });
        } else {
            openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        }

        try {
            const response = await openai.models.list();
            console.log('response:', response); // Debugging line
            const models = response.data;

            // filter list to only include models that have an id that is shorter than 13 characters
            const listOfModels = models.filter(model => model.id.length < 30).map(model => model.id);

            return listOfModels;
        } catch (error) {
            console.error("Error fetching models:", error);
        }

        return [];
    }

    async listAllModels() {
        const allModels = [];
        // iterate over all the services and get the models for each service
        for (let i = 0; i < this.llmServices.length; i++) {
            // check if the model is from google
            if (this.llmServices[i].name === "Google Gemini") {
                continue;
            }

            const service = this.llmServices[i].name;
            const apiKey = await readSetting(`llmConfig/${service}-api-key.txt`);
            const baseURL = this.llmServices[i].baseURL;

            // get the models for the service
            const models = await this.getOpenAIModels(apiKey, baseURL);

            // add the models to the allModels array
            for (let j = 0; j < models.length; j++) {
                allModels.push(`${service}|${models[j]}`);
            }
        }


        // sort the array alphabetically
        allModels.sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });


        // manually add the google models
        const geminiModels = [
            "Google Gemini|gemini-2.5-pro-preview-05-06",
            "Google Gemini|gemini-2.5-pro-exp-03-25",
            "Google Gemini|gemini-2.5-flash-preview-04-17",
            "Google Gemini|gemini-2.0-flash",
            "Google Gemini|gemini-2.0-flash-lite",
            "Google Gemini|gemini-2.0-flash-preview-image-generation",
            "Google Gemini|gemini-2.0-flash-live-001",
            "Google Gemini|gemini-1.5-pro",
            "Google Gemini|gemini-1.5-flash",
            "Google Gemini|gemini-1.5-flash-8b",
            "Google Gemini|gemini-1.0-ultra",
            "Google Gemini|gemini-1.0-pro",
            "Google Gemini|gemini-1.0-nano"
        ];

        await allModels.push(...geminiModels)


        return allModels;
    }
    async setModel(model = this.model) {
        this.model = model;
        const [service, modelName] = model.split('|');
        this.service = service;
        this.modelName = modelName;
    }
}

