import axios from "axios";
import {trimSlashes, trimTailingSlash, trimLeadingSlash, resolveProjectIdentifier} from "./util.js";

const API_PATH = `/api/v4`;

export class GitlabApiDriver {
    constructor(baseUrl, accessToken) {
        this.BASE_URL = trimTailingSlash(baseUrl);
        
        if(this.BASE_URL.startsWith("http://")) {
            this.BASE_URL = this.BASE_URL.replace("http://", "https://");
        }
        if(!this.BASE_URL.startsWith("https://")) {
            this.BASE_URL = `https://${this.BASE_URL}`;
        }

        this.API_URL = `${this.BASE_URL}${API_PATH}`
        this.AT = accessToken;
        this.config = { headers: { "PRIVATE-TOKEN": this.AT } }
    }

    getProjectUrl(identifier) {
        const resolvedIdentifier = resolveProjectIdentifier(this.BASE_URL, identifier);
        if(typeof resolvedIdentifier.id !== 'undefined') {
            return `${this.API_URL}/projects/${resolvedIdentifier.id}`;
        }
        else if(typeof resolvedIdentifier.path !== 'undefined') {
            const encodedPath = encodeURIComponent(trimSlashes(resolvedIdentifier.path))
            return `${this.API_URL}/projects/${encodedPath}`;
        }
        else {
            throw new Error(`'${identifier}' is an invalid identifier for a project`);
        }
    }

    async getProject(identifier) {
        const url = this.getProjectUrl(identifier);
        try {
            const res = await axios.get(url, this.config);
            return res.data;
        }
        catch(e) {
            throw new GitlabApiError(`Error requesting project identified by '${identifier}'\n\nOriginal Error:\n${e}`)
        }
    }

    async getBranches(projectIdentifier) {
        const url = `${this.getProjectUrl(projectIdentifier)}/repository/branches`;
        try {
            const res = await axios.get(url, this.config);
            return res.data;
        }
        catch(e) {
            throw new GitlabApiError(`Error requesting branchs for project identified by '${projectIdentifier}'\n\nOriginal Error:\n${e}`)
        }
    }

    async branchExists(projectId, branchName) {
        const url = `${this.API_URL}/projects/${projectId}/repository/branches/${branchName}`;
        try {
            const res = await axios.get(url, this.config);
            return res.status === 200;
        }
        catch(e) {
            if(typeof e.response !== 'undefined' && e.response.status === 404) {
                return false;
            }
            else {
                throw new GitlabApiError(`Error requesting branch '${branchName}' for project ID '${projectId}'\n\nOriginal Error:\n${e}`)
            }
        }
    }

    async fileExists(projectId, branchName, filePath) {
        const encodedFilePath = encodeURIComponent(trimSlashes(filePath))
        const url = `${this.API_URL}/projects/${projectId}/repository/files/${encodedFilePath}?ref=${branchName}`
        try {
            const res = await axios.get(url, this.config);
            return res.status === 200;
        }
        catch(e) {
            if(typeof e.response !== 'undefined' && e.response.status === 404) {
                return false;
            }
            else {
                throw new GitlabApiError(`Error requesting file '${filePath}' from branch '${branchName}' for project ID '${projectId}'\n\nOriginal Error:\n${e}`)
            }
        }
    }

    async postCommit(projectId, commitObject) {
        const url = `${this.API_URL}/projects/${projectId}/repository/commits`
        const config = {
            headers: {
                "PRIVATE-TOKEN": this.AT,
                "Content-Type": "application/json"
            }
        }
        try {
            const res = await axios.post(url, commitObject, config);
            return res.status === 201;
        }
        catch(e) {
            throw new GitlabApiError(`Error executing commit on project ID '${projectId}'\n\nOriginal Error:\n${e}`)
        }
    }

    async postSnippetCommit(snippetId, commitObject) {
        const url = `${this.API_URL}/snippets/${snippetId}`
        const config = {
            headers: {
                "PRIVATE-TOKEN": this.AT,
                "Content-Type": "application/json"
            }
        }
        try {
            const res = await axios.put(url, commitObject, config);
            return res.status === 201;
        }
        catch(e) {
            throw new GitlabApiError(`Error executing commit on snippet ID '${snippetId}'\n\nOriginal Error:\n${e}`)
        }
    }

    async getRawFile(projectId, branchName, filePath) {
        const encodedFilePath = encodeURIComponent(trimSlashes(filePath))
        const url = `${this.API_URL}/projects/${projectId}/repository/files/${encodedFilePath}/raw?ref=${branchName}`
        try {
            const res = await axios.get(url, this.config);
            if(res.status === 200) {
                return res.data;
            }
        }
        catch(e) {
            if(typeof e.response !== 'undefined' && e.response.status === 404) {
                return false;
            }
            else {
                throw new GitlabApiError(`Error requesting raw file '${filePath}' from branch '${branchName}' for project ID '${projectId}'\n\nOriginal Error:\n${e}`)
            }
        }
    }

    async getVersion() {
        const url = `${this.API_URL}/version`;
        try {
            const res = await axios.get(url, this.config);
            if(res.status === 200) {
                return res.data;
            }
            else {
                return null;
            }
        }
        catch(e) {
            throw new GitlabApiError(`Error retrieving API version.\n\nOriginal Error:\n${e}`)
        }
    }
}

class GitlabApiError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}