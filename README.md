## gitlab-x
__GitLab Executor__

### Prequesities
To use this tool, it is required to have a GitLab account somewhere. In the GitLab, a personal access token needs to be created. The respective page can be found under `https://<gitlab.domain.com>/profile/personal_access_tokens`. Enter a name for your new access token and check the `api` box. If only read-only access is desired, `read_api` is sufficient. Keep the access token safe as it will only be displayed once.

### Usage
In order to provide the access token and base url of the GitLab to `gitlab-x` either use environment variables or pass them as command line options:  
#### Environment variables: 
`GITLAB_AT` can be used to provide the access token
`GITLAB_URL` can be used to provide the base url of the GitLab
```
export GITLAB_AT=asdf1234
export GITLAB_URL=https://gitlab.com
```
#### Command line:
If no environment varialbe is given for the access token or base url, they need to be provided as command line arguments:  
`-u` or `--url` followed by the GitLab URL
`-t` or `--access-token` followed by the access token  
```
$ npx gitlab-x -u gitlab.com -t asdf1234 version
```
### Commands
#### version
Retrieves the version of the GitLab being queried  

`$ npx gitlab-x version [fields...]`
```
$ npx gitlab-x version
{ version: '13.7.0-pre', revision: '59e06a7bf82' }

$ npx gitlab-x version revision
'59e06a7bf82'

$ npx gitlab-x version version
'13.7.0-pre'

$ npx gitlab-x version version --json
{ version: '13.7.0-pre' }
```
#### get
Queries API objects
##### get project
`$ npx gitlab-x get project <project_identifier> [fields...]`  
The `project_identifier` can be either:
- the project id as number
- the project path relative to the GitLab root
- the project url (basically base url and path combined)
```
$ npx gitlab-x get project /mxcd/test
{
  id: 23106572,
  description: '',
  name: 'test',
  name_with_namespace: 'Max Partenfelder / test',
  path: 'test',
  path_with_namespace: 'mxcd/test',
  created_at: '2020-12-14T23:26:00.959Z',
  default_branch: null,
  tag_list: [],
  .....

$ npx gitlab-x get project 23106572 name web_url
{ name: 'test', web_url: 'https://gitlab.com/mxcd/test' }
```

##### get branches
`$ npx gitlab-x get branches <project_identifier> [fields...]`  

##### get branch

##### get issues

##### get issue

##### get raw
`$ npx gitlab-x get raw <project_identifier> <file_path> [--ref <branch>]`