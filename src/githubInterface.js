export class GitHubClient {
    constructor() {
        this.tokenKey = 'github_token';
        this.token = localStorage.getItem(this.tokenKey) || '';
        this.api = this.token ? new Octokit.Octokit({ auth: this.token }) : null;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem(this.tokenKey, token);
        this.api = new Octokit.Octokit({ auth: this.token });
    }

    clearToken() {
        this.token = '';
        localStorage.removeItem(this.tokenKey);
        this.api = null;
    }

    async authenticate() {
        const token = prompt('Enter your GitHub Personal Access Token (PAT):');
        if (token) {
            this.setToken(token);
            alert('Authentication successful!');
        } else {
            alert('Authentication cancelled or invalid.');
        }
    }

    async readFile(owner, repo, path, branch = 'main') {
        const response = await this.api.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path,
            ref: branch
        });

        if (response.data.content) {
            return atob(response.data.content);
        }
        throw new Error('No content found');
    }

    async writeFile(owner, repo, path, content, commitMessage, branch = 'main') {
        let sha = null;

        try {
            const existing = await this.api.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner,
                repo,
                path,
                ref: branch
            });
            sha = existing.data.sha;
        } catch (err) {
            if (!err.message.includes('Not Found')) {
                throw err;
            }
            // If file does not exist, sha remains null
        }

        const encodedContent = btoa(content);

        const payload = {
            owner,
            repo,
            path,
            message: commitMessage,
            content: encodedContent,
            branch
        };
        if (sha) {
            payload.sha = sha;
        }

        const response = await this.api.request('PUT /repos/{owner}/{repo}/contents/{path}', payload);
        return response.data;
    }

    async deleteFile(owner, repo, path, commitMessage, branch = 'main') {
        const existing = await this.api.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path,
            ref: branch
        });

        const response = await this.api.request('DELETE /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path,
            message: commitMessage,
            sha: existing.data.sha,
            branch
        });

        return response.data;
    }

    async listFiles(owner, repo, path = '', branch = 'main') {
        const response = await this.api.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path,
            ref: branch
        });

        return response.data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type
        }));
    }
}
