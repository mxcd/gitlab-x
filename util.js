import { GitlabApiDriver } from "./api-driver.js";

export function trimLeadingSlash(str) {
    return str.startsWith("/") ? str.substring(1) : str;
}

export function trimTailingSlash(str) {
    return str.endsWith("/") ? str.substring(0, str.length-1) : str;
}

export function trimSlashes(str) {
    return trimLeadingSlash(trimTailingSlash(str));
}

export function resolveProjectIdentifier(baseUrl, identifier) {
    if(!isNaN(parseInt(identifier))) {
        return {id: parseInt(identifier)};
    }
    else {
        identifier = identifier.replace(/https?:\/\//, "");
        baseUrl = baseUrl.replace(/https?:\/\//, "")
        if(identifier.startsWith(baseUrl)) {
            identifier = identifier.replace(baseUrl, "")
        }
        return {path: trimSlashes(identifier)}
    }
}

export async function apiTest(args) {
    if(args.verbose) console.log(`Fetching GitLab Version`);
    const api = getApiDriver(args);
    const version = await api.getVersion();
    if(version !== null) {
        if(args.verbose) { console.log(`Success!`); console.dir(version); }
        return true;
    }
    if(args.verbose) console.log(`Fetching version failed!`);
    return false
}

export function getApiDriver(args) {
    return new GitlabApiDriver(args.url, args.access_token, args.verbose);
}

export function filterFields(args, obj, fields) {
    const filterSingleObj = (args, obj, fields) => {
        if(fields.length === 1 && !args.json) {
            return obj[fields[0]]
        }
        else {
            let result = {};
            for(let field of fields) {
                result[field] = obj[field]
            }
            return result;
        }
    }
    
    if(fields.length !== 0) {
        if(typeof obj === 'object') {
            if(Array.isArray(obj)) {
                let result = [];
                for(let listObj of obj) {
                    result.push(filterSingleObj(args, listObj, fields))
                }
                return result;
            }
            else {
                return filterSingleObj(args, obj, fields);
            }
        }
        else {
            return obj;
        }
    }
    else {
        return obj;
    }
}