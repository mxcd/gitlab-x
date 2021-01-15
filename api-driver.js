const axios = require("axios");
const util = require("./util.js");

const API_PATH = `/api/v4`;

class GitlabApiDriver {
    constructor(baseUrl, accessToken, verbose) {
        this.VERBOSE = verbose;
        this.BASE_URL = util.trimTailingSlash(baseUrl);
        
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
        const resolvedIdentifier = util.resolveProjectIdentifier(this.BASE_URL, identifier);
        if(typeof resolvedIdentifier.id !== 'undefined') {
            return `${this.API_URL}/projects/${resolvedIdentifier.id}`;
        }
        else if(typeof resolvedIdentifier.path !== 'undefined') {
            const encodedPath = encodeURIComponent(util.trimSlashes(resolvedIdentifier.path))
            return `${this.API_URL}/projects/${encodedPath}`;
        }
        else {
            throw new Error(`'${identifier}' is an invalid identifier for a project`);
        }
    }

    async getProject(identifier) {
        const url = this.getProjectUrl(identifier);
        try {
            if(this.VERBOSE) console.log(`GET > ${url}`);
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
            if(this.VERBOSE) console.log(`GET > ${url}`);
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
            if(this.VERBOSE) console.log(`GET > ${url}`);
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

    async fileExists(projectIdentifier, filePath, branchName) {
        if(typeof branchName === 'undefined') {
            branchName = (await this.getProject(projectIdentifier)).default_branch;
        }
        const encodedFilePath = encodeURIComponent(util.trimSlashes(filePath))
        const url = `${this.getProjectUrl(projectIdentifier)}/repository/files/${encodedFilePath}?ref=${branchName}`
        try {
            if(this.VERBOSE) console.log(`GET > ${url}`);
            const res = await axios.get(url, this.config);
            return res.status === 200;
        }
        catch(e) {
            if(typeof e.response !== 'undefined' && e.response.status === 404) {
                return false;
            }
            else {
                throw new GitlabApiError(`Error requesting file '${filePath}' from branch '${branchName}' for project identified by '${projectIdentifier}'\n\nOriginal Error:\n${e}`)
            }
        }
    }

    async postCommit(projectIdentifier, commitObject) {
        const url = `${this.getProjectUrl(projectIdentifier)}/repository/commits`
        const config = {
            headers: {
                "PRIVATE-TOKEN": this.AT,
                "Content-Type": "application/json"
            }
        }
        try {
            if(this.VERBOSE) console.log(`POST > ${url}`);
            const res = await axios.post(url, commitObject, config);
            return res.status === 201;
        }
        catch(e) {
            throw new GitlabApiError(`Error executing commit on project identified by '${projectIdentifier}'\n\nOriginal Error:\n${e}`)
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
            if(this.VERBOSE) console.log(`PUT > ${url}`);
            const res = await axios.put(url, commitObject, config);
            return res.status === 201;
        }
        catch(e) {
            throw new GitlabApiError(`Error executing commit on snippet ID '${snippetId}'\n\nOriginal Error:\n${e}`)
        }
    }

    async getRawFile(projectIdentifier, filePath, branchName) {
        if(typeof branchName === 'undefined') {
            branchName = (await this.getProject(projectIdentifier)).default_branch;
        }
        const encodedFilePath = encodeURIComponent(util.trimSlashes(filePath))
        const url = `${this.getProjectUrl(projectIdentifier)}/repository/files/${encodedFilePath}/raw?ref=${branchName}`
        try {
            if(this.VERBOSE) console.log(`GET > ${url}`);
            const res = await axios.request({
                responseType: 'arraybuffer',
                url: url,
                method: "get",
                headers: {
                    "PRIVATE-TOKEN": this.AT
                }
            });
            if(res.status === 200) {
                return res.data;
            }
        }
        catch(e) {
            throw new GitlabApiError(`Error requesting raw file '${filePath}' from branch '${branchName}' for project identified by '${projectIdentifier}'\n\nOriginal Error:\n${e}`)
        }
    }

    async getLatestArtifact(projectIdentifier, artifactPath, branchName, jobName) {
        if(typeof branchName === 'undefined') {
            branchName = (await this.getProject(projectIdentifier)).default_branch;
        }
        const encodedArtifactPath = encodeURIComponent(util.trimSlashes(artifactPath))
        const url = `${this.getProjectUrl(projectIdentifier)}/jobs/artifacts/${branchName}/raw/${encodedArtifactPath}?job=${jobName}`
        try {
            if(this.VERBOSE) console.log(`GET > ${url}`);
            const res = await axios.request({
                responseType: 'arraybuffer',
                url: url,
                method: "get",
                headers: {
                    "PRIVATE-TOKEN": this.AT
                }
            });
            if(res.status === 200) {
                return res.data;
            }
        }
        catch(e) {
            throw new GitlabApiError(`Error requesting artifact '${filePath}' generated by job '${jobName}' from branch '${branchName}' for project identified by '${projectIdentifier}'\n\nOriginal Error:\n${e}`)
        }
    }

    async getAllFiles(projectIdentifier, branchName) {
        if(typeof branchName === 'undefined') {
            branchName = (await this.getProject(projectIdentifier)).default_branch;
        }
        let files = [];
        let currentPage = 1;
        let totalPages = 1;
        while(currentPage <= totalPages) {
            const url = `${this.getProjectUrl(projectIdentifier)}/repository/tree/?ref=${branchName}&recursive=true&per_page=100&page=${currentPage}`
            try {
                if(this.VERBOSE) console.log(`GET > ${url}`);
                const res = await axios.get(url, this.config);
                files = files.concat(res.data);
                const totalPagesHeader = res.headers["x-total-pages"];
                if(typeof totalPagesHeader !== "undefined" && totalPages !== totalPagesHeader) {
                    totalPages = totalPagesHeader;
                    if(this.VERBOSE) console.log(`Set total pages to ${totalPagesHeader}`);
                }
                ++currentPage;
            }
            catch(e) {
                throw new GitlabApiError(`Error requesting files from branch '${branchName}' for project identified by '${projectIdentifier}'\n\nOriginal Error:\n${e}`)
            }
        }
        return files;
    }

    async getVersion() {
        const url = `${this.API_URL}/version`;
        try {
            if(this.VERBOSE) console.log(`GET > ${url}`);
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

module.exports.GitlabApiDriver = GitlabApiDriver
module.exports.GitlabApiError = GitlabApiError