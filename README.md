# Moonbase Documentation

## How it works
### Project Status
A project managed by Moonbase can be in 1 of 4 states:
- **Staged** - A user is making changes to this project.
  - When the project is submitted it transitions to the ‘Pending Approval’ state.
  - Any modifications may be made to a project in this state. 

- **Pending Approval** - The project has been submitted to moderators for approval. Project modifications cannot be made in this state
  - The project can be withdrawn by a user to return it to the ‘Staged’ state.
  - A rejected project will be returned to the ‘Staged’ state.
  - An approved project will transition to the ‘Pending Release’ state.

- **Pending Release** - The project has been approved by the moderators and requires final user signal to publish the project publicly. Project modifications cannot be made in this state.
  - The project can be withdrawn by a user to return it to the ‘Staged’ state.
  - The project can be released by owning user to publish the project publicly, transitioning it to the ‘Released’ state.

- **Released** - The project has been published to Moonbase and will now be publicly accessible. Project modifications cannot be made in this state.
  - If a project version absolutely **MUST** be removed and the issue cannot be remedied by a new project version then this can be done from the Moonbase backend dashboard.

### Authentication
Generally unless a user is intending to upload and/or publish projects to Moonbase there is no need to authenticate. All published projects are made available via the API without the need of authentication.

Authentication is tied to the talk.codea.io forum and requires the user to have a forum account in order to authenticate.
#### Obtaining an API key
This is done in 3 steps:
1. A HTTP GET request is made to `/v1/auth/authenticate`.
   - This returns a json object containing 2 URLs; `stage1Url` & `stage2Url`.
2. A web browser is used to navigate to `stage1Url` which will prompt the user to login to the talk.codea.io forum. Once the user has logged in they will see a message that reads ‘User successfully authenticated! Please close this page’. The web browser may now be closed.
3. A HTTP GET request is then made to the `stage2Url` from the first call.
   - This returns a JSON object containing an `api_key` entry. This is the user’s final API key that should be provided when making any API requests requiring authentication.

### API
---
`GET /v1/public/manifest.json`
Returns manifest of all publicly available projects. Including project names, versions, release dates and IDs of all project versions.

**Headers:** N/A

**Response:**
```
{
	"<PROJECT_NAME>":[
		["<PROJECT_ID>","<PROJECT_VERSION>",<RELEASE_DATE>],
		["mr1oa9nvzxkcv13","1.2",1639387136],
		["mnvmy9q3x0kg70r","1.1",1639301120],
		["bwoscu9e1llt4qq","1.0.0",1639123789]
	],
	"3D Mesh Demo":[
		["ba0j4r1h47wnsnt","1.0.0",1635773119]
	],
	...
}
```

---
`GET /v1/assets/<PROJECT_ID>/metadata.json`
Returns all metadata of the given project.

**Headers:**
`Moonbase-Api-Key: <users_api_key>`

**Response:**
```
{
	"name":"Example",
	"authors":["Steppers"],
	"banner":"banner_DrsIRyEPPY.png",
	"category":"application",
	"description_long":"A long description...",
	"description_short":"A short desc.",
	"download_count":45,
	"forum_link":"https://talk.codea.io/...",
	"forum_post_id":"",
	"icon":"icon_2x_DrsIRyEPPE.png",
	"id":"mr1oa9nvzxkcv13",
	"installed_size":1153133,
	"platform":"iPhone \u0026 iPad",
	"release_date":"2021-12-13 09:18:56.000Z",
	"screenshots":[],
	"status":"Released",
	"update_notes":"- My update notes",
	"version":"1.0",
	"zip":"project_HyilduJamO.zip"
}
```
