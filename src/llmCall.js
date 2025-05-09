import { OpenAI } from "openai";



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


export async function replaceSettingIfNotFound(key, value) {
    // check if the key exists in local storage
    const existingValue = await readSetting(key);
    if (existingValue === undefined || existingValue === null || existingValue === "") {
        //alert(`Key ${key} not found in localStorage. Creating a new key.`);
        await writeSetting(key, value);
    } else {
        if (await readSetting(key) !== value) {
            const answer = await confirm("The default system prompt has been updated. \n Would you like to update your modifed prompt?")
            if (answer) await writeSetting(key, value);
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

        let llmResponse = await this.getOpenAIResponse(tempMessageDiv);
        llmResponse = await llmResponse.trim();
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
            await console.log(content); // Real-time printing to console
            responseText += content;
            if (tempMessageDiv) {
                console.log('tempMessageDiv:', tempMessageDiv.parent); // Debugging line

                tempMessageDiv.innerText = responseText;
                // get the dom parent of the tempMessageDiv
                const parent = tempMessageDiv.parentElement;
                console.log('parent:', parent); // Debugging line
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

        //alert(await JSON.stringify(allModels, null, 2));

        // console.log('allModels:', allModels); // Debugging line
        return allModels;
    }
    async setModel(model = this.model) {
        this.model = model;
        const [service, modelName] = model.split('|');
        this.service = service;
        this.modelName = modelName;
        //console.log('model:', model);
        //console.log('service:', service);
        //console.log('modelName:', modelName);
    }
}

