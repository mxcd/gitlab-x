#!/usr/bin/env node

// Imports
import pkg from 'argparse';
const {ArgumentParser} = pkg;
import { apiTest, getApiDriver, filterFields } from './util.js'
import {GitlabApiDriver} from './api-driver.js'
import * as commitHelper from './commit-helper.js'

// version (same as package.json due to npx problems)
const version = "0.2.2";
 
const parser = new ArgumentParser({
  description: 'gitlab-x: Gitlab Executor API Interface'
});

parser.add_argument('action', {metavar: 'action', type: String, nargs: '?', default: 'get', help: 'action to be executed'});
parser.add_argument('parameters', {metavar: 'parameters', type: String, nargs: '*', help: 'action parameters to be used'});
parser.add_argument('-v', '--version', { action: 'version', version });
parser.add_argument('-t', '--access-token');
parser.add_argument('-u', '--url')
parser.add_argument('--verbose', {action: 'store_true', help: 'increased console output'})
parser.add_argument('--json', {action: 'store_true', help: 'always print result as json, even if it is a single value'})
parser.add_argument('-f', '--force', {action: 'store_true', help: 'force operation'})
parser.add_argument('--ref', {metavar: 'ref', type: String, help: 'provide a git ref'})


const args = parser.parse_args()

// Check presence of AT and URL
// Only use ENV variables when args are not set
if(typeof process.env.GITLAB_AT === 'undefined' && typeof args.access_token === 'undefined') {
  throw new Error("Error: no access token specified. Either set it as ENV variable 'GITLAB_AT' or pass it with [-t | --access-token]")
}
else if (typeof args.access_token === 'undefined') {
  args.access_token = process.env.GITLAB_AT;
}

if(typeof process.env.GITLAB_URL === 'undefined' && typeof args.url === 'undefined') {
  throw new Error("Error: no GitLab URL specified. Either set it as ENV variable 'GITLAB_URL' or pass it with [-u | --url]")
}
else if(typeof args.url === 'undefined') {
  args.url = process.env.GITLAB_URL;
}

if(args.verbose) {
  console.dir(args);
}

(async () => {
  if(!await apiTest(args)) {
    throw new Error(`Error: API at '${args.url}' not accessible with given access token`)
  }
  doAction(args);
})();



async function doAction(args) {
  const action = args.action;
  if(args.verbose) console.log(`Action is '${action}'`);
  switch(action) {
    case "version":
      await doVersion(args);
      break;
    case "get":
      await doGetAction(args);
      break;
    case "commit":
      await doCommitAction(args)
      break;
    default:
      throw new Error(`Error: '${action}' is an invalid action`);
  }
}

async function doGetAction(args) {
  // get action syntax:
  // gitlab-x get <object type> <object identifier> [<object fields>...]
  let parameters = args.parameters;
  if(parameters.length < 2) {
    throw new Error(`Error: not enough parameter for 'get' action`)
  }
  const objectType = parameters.shift();
  const objectIdentifier = parameters.shift();
  let fields;

  switch(objectType) {
    case "project":
      fields = parameters;
      if(args.verbose) console.log(`Doing 'GET' > 'project' with identifier '${objectIdentifier}' and fields '${fields}'`);
      await getProject(args, objectIdentifier, fields);
      break;
    case "branches":
      fields = parameters;
      if(args.verbose) console.log(`Doing 'GET' > 'branches' with identifier '${objectIdentifier}' and fields '${fields}'`);
      await getBranches(args, objectIdentifier, fields);
      break;
    case "raw":
      if(parameters.length != 1) {
        throw new Error(`Error: wrong number of parameters for 'get raw' action`)
      }
      const filePath = parameters.shift();
      if(args.verbose) console.log(`Doing 'GET' > 'raw' with project identifier '${objectIdentifier}' and file path '${fields}'`);
      await getRaw(args, objectIdentifier, filePath);
      break;
    default:
      throw new Error(`Error: object type '${objectType}' is not supported`)
  }
}

async function doCommitAction(args) {
  // gitlab-x commit <local file> <project identifier> [<target file>] [--ref <branch>] [--force]
  let parameters = args.parameters;
  if(parameters.length < 2) {
    throw new Error(`Error: not enough parameter for 'commit' action`)
  }
  if(parameters.length > 3) {
    throw new Error(`Error: too many parameters for 'commit' action`)
  }
  const localFile = parameters.shift();
  const projectIdentifier = parameters.shift();
  const targetFile = parameters.shift();
  if(args.verbose) console.log(`Doing 'COMMIT' with project identifier '${projectIdentifier}' and file path '${localFile}'`);
  const api = getApiDriver(args);
  await commitHelper.commitSingleFile(localFile, projectIdentifier, targetFile, args);
}

async function doVersion(args) {
  const api = getApiDriver(args);
  const version = await api.getVersion();
  const result = filterFields(args, version, args.parameters);
  console.dir(result);
}

async function getProject(args, objectIdentifier, fields) {
  const api = getApiDriver(args);
  const project = await api.getProject(objectIdentifier);
  const result = filterFields(args, project, fields);
  console.dir(result);
}

async function getBranches(args, objectIdentifier, fields) {
  const api = getApiDriver(args);
  const branches = await api.getBranches(objectIdentifier);
  const result = filterFields(args, branches, fields);
  console.dir(result);
}

async function getRaw(args, projectIdentifier, filePath) {
  const api = getApiDriver(args);
  const rawFile = await api.getRawFile(projectIdentifier, filePath, args.ref);
  process.stdout.write(rawFile)
}