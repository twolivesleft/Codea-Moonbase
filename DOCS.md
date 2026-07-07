# Moonbase API Documentation

Base URL for all endpoints is the Moonbase instance URL.

---

## Authentication

Authentication is not required for public read-only endpoints. For endpoints that create, modify, or review projects, an API key must be provided via the `Moonbase-Api-Key` header.

### Obtaining an API Key

1. **`GET /v1/auth/authenticate`** — Initiate the authentication flow.
   - Returns a JSON object with `stage1Url` and `stage2Url`.

2. Open `stage1Url` in a web browser, log in to the [talk.codea.io](https://talk.codea.io) forum, and follow the prompts. After successful login, the browser will display "User successfully authenticated! Please close this page."

3. **`GET <stage2Url>`** — Complete the flow and retrieve the API key.
   - The `stage2Url` is of the form `/v1/auth/key/<temp_key>`.
   - Returns a JSON object: `{ "api_key": "<final_api_key>" }`.

The final API key should be provided in the `Moonbase-Api-Key` header for all authenticated requests.

---

## Public Endpoints (No Authentication Required)

### `GET /v1/public/manifest.json`

**Source:** `pb_hooks/endpoints/public/GET_manifest.pb.js`

Returns a manifest of all publicly released projects, grouped by name.

**Headers:** None

**Response `200 OK`:**
```json
{
    "<PROJECT_NAME>": [
        ["<PROJECT_ID>", "<PROJECT_VERSION>", <RELEASE_DATE_UNIX>],
        ["mr1oa9nvzxkcv13", "1.2", 1639387136],
        ["mnvmy9q3x0kg70r", "1.1", 1639301120],
        ["bwoscu9e1llt4qq", "1.0.0", 1639123789]
    ],
    "3D Mesh Demo": [
        ["ba0j4r1h47wnsnt", "1.0.0", 1635773119]
    ]
}
```

---

### `GET /v1/public/featured.json`

**Source:** `pb_hooks/endpoints/public/GET_featured_projects.pb.js`

Returns metadata of all projects marked as featured.

**Headers:** None

**Response `200 OK`:**
```json
[
    {
        "name": "Example",
        "authors": ["Steppers"],
        "banner": "banner_DrsIRyEPPY.png",
        "category": "application",
        "description_long": "A long description...",
        "description_short": "A short desc.",
        "download_count": 45,
        "forum_link": "https://talk.codea.io/...",
        "forum_post_id": "",
        "icon": "icon_2x_DrsIRyEPPE.png",
        "id": "mr1oa9nvzxkcv13",
        "installed_size": 1153133,
        "platform": "iPhone & iPad",
        "release_date": "2021-12-13 09:18:56.000Z",
        "screenshots": [],
        "status": "Released",
        "update_notes": "- My update notes",
        "version": "1.0",
        "zip": "project_HyilduJamO.zip"
    }
]
```

Note: The `approval_post_id`, `collectionName`, `collectionId`, `created`, and `updated` fields are stripped from the response.

---

### `GET /v1/assets/{project_id}/{asset_id}`

**Source:** `pb_hooks/endpoints/assets/GET_project_asset.pb.js`

Retrieves a project asset (file or metadata) for a released project. For non-released projects, the authenticated user must be the owner or an admin.

**Path Parameters:**
- `project_id` — The unique ID of the project.
- `asset_id` — The asset to retrieve. Use `metadata.json` to get project metadata, or a filename (e.g., the zip filename, icon filename) to download the file.

**Headers (optional, for non-released projects):**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK` (when `asset_id` = `metadata.json`):**
```json
{
    "name": "Example",
    "authors": ["Steppers"],
    "banner": "banner_DrsIRyEPPY.png",
    "category": "application",
    "description_long": "A long description...",
    "description_short": "A short desc.",
    "download_count": 45,
    "forum_link": "https://talk.codea.io/...",
    "forum_post_id": "12345",
    "icon": "icon_2x_DrsIRyEPPE.png",
    "id": "mr1oa9nvzxkcv13",
    "installed_size": 1153133,
    "platform": "iPhone & iPad",
    "release_date": "2021-12-13 09:18:56.000Z",
    "screenshots": [],
    "status": "Released",
    "update_notes": "- My update notes",
    "version": "1.0",
    "zip": "project_HyilduJamO.zip"
}
```

**Response `200 OK` (file download):** The raw file content. If the asset matches the project's `zip` filename, the download count is incremented.

**Errors:**
- `403 Forbidden` — Asset is not from a released project and the requester is neither the owner nor an admin.
- `404 Not Found` — Project or asset not found.

---

## Authentication Endpoints

### `GET /v1/auth/authenticate`

**Source:** `pb_hooks/endpoints/auth/GET_authenticate.pb.js`

Initiates the Discourse SSO authentication flow. Creates a temporary user record and returns the URLs for the SSO flow.

**Headers:** None

**Response `200 OK`:**
```json
{
    "stage1Url": "https://talk.codea.io/session/sso_provider?sso=...&sig=...",
    "stage2Url": "https://<moonbase_host>/v1/auth/key/<temp_api_key>"
}
```

**Errors:**
- `400 Bad Request` — User already verified.

---

### `GET /v1/auth/callback`

**Source:** `pb_hooks/endpoints/auth/GET_callback.pb.js`

The Discourse SSO callback endpoint. Called by the browser after the user authenticates on the Discourse forum. The user will see an HTML confirmation page.

**Query Parameters:**
- `sso` — The SSO payload from Discourse.
- `sig` — The HMAC-SHA256 signature of the payload.

**Response `200 OK`:** HTML page with "User successfully authenticated! Please close this page."

**Errors:**
- `400 Bad Request` — Invalid signature or authentication failure.

---

### `GET /v1/auth/key/{key}`

**Source:** `pb_hooks/endpoints/auth/GET_key.pb.js`

Final step of the authentication flow. Takes a temporary API key and returns the user's final API key. If the user already had an API key from a prior authentication, the old key is returned and the temporary record is cleaned up.

**Path Parameters:**
- `key` — The temporary API key obtained from the `stage2Url` in step 1.

**Headers:** None

**Response `200 OK`:**
```json
{
    "api_key": "<final_api_key>"
}
```

**Errors:**
- `400 Bad Request` — User not yet authenticated.

---

### `GET /v1/auth/permissions.json`

**Source:** `pb_hooks/endpoints/auth/GET_permissions.pb.js`

Returns the permissions for the currently authenticated user.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK`:**
```json
{
    "admin": false,
    "max_staged": 4
}
```

- `admin` — Whether the user is a Moonbase admin/moderator.
- `max_staged` — The maximum number of staged projects the user can have simultaneously.

**Errors:**
- `401 Unauthorized` — No valid API key provided or user not verified.

---

## Staging Endpoints (Authentication Required)

These endpoints manage projects in the **Staged** state — projects that are being edited but not yet submitted for review.

### `GET /v1/staged/metadata.json`

**Source:** `pb_hooks/endpoints/staging/GET_metadata.pb.js`

Returns metadata for all staged projects belonging to the authenticated user.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK`:**
```json
[
    {
        "name": "Untitled",
        "version": "X.Y.Z",
        "authors": [],
        "banner": "",
        "category": "application",
        "description_long": "<Long Description Here>",
        "description_short": "<Short Description Here>",
        "forum_link": "",
        "icon": "",
        "id": "<project_id>",
        "installed_size": 0,
        "platform": "iPhone & iPad",
        "screenshots": [],
        "status": "Staged",
        "update_notes": "- Initial release",
        "zip": ""
    }
]
```

Note: The fields `approval_post_id`, `collectionName`, `collectionId`, `created`, `updated`, `release_date`, `download_count`, and `forum_post_id` are stripped from the response.

**Errors:**
- `401 Unauthorized` — No valid API key provided or user not verified.

---

### `PUT /v1/staged/{project_id}`

**Source:** `pb_hooks/endpoints/staging/PUT_project_asset.pb.js`

Creates or updates a staged project. Sending a PUT with `project_id` = `"new"` creates a new staged project. Otherwise, updates the specified existing staged project.

**Path Parameters:**
- `project_id` — The ID of an existing staged project, or `"new"` to create a new one.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Request Body (multipart/form-data or JSON):**
```json
{
    "name": "My Project",
    "version": "1.0.0",
    "authors": ["Steppers"],
    "category": "application",
    "platform": "iPhone & iPad",
    "description_short": "A short description",
    "description_long": "A long description...",
    "update_notes": "- Initial release",
    "forum_link": "https://talk.codea.io/...",
    "banner": "(file upload)",
    "icon": "(file upload)",
    "screenshots": ["(file uploads)"],
    "zip": "(file upload)"
}
```

File fields (`banner`, `icon`, `screenshots`, `zip`) should be uploaded as multipart form data.

**Response `200 OK`:** Returns the updated project metadata (same shape as `GET /v1/staged/metadata.json` for a single project).

**Errors:**
- `400 Bad Request` — Too many staged projects, project is not staged, or data validation failed.
- `401 Unauthorized` — No valid API key provided or user not verified.
- `404 Not Found` — Project does not exist or does not belong to the user.

---

### `DELETE /v1/staged/{project_id}`

**Source:** `pb_hooks/endpoints/staging/DELETE_project.pb.js`

Deletes a staged project belonging to the authenticated user.

**Path Parameters:**
- `project_id` — The ID of the staged project to delete.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `204 No Content`**

**Errors:**
- `400 Bad Request` — Project is not staged.
- `401 Unauthorized` — No valid API key provided or user not verified.
- `404 Not Found` — Project does not exist or does not belong to the user.

---

### `POST /v1/staged/{project_id}/submit`

**Source:** `pb_hooks/endpoints/staging/POST_submit.pb.js`

Submits a staged project for moderator approval. Transitions the project from **Staged** to **Pending Approval**. No further edits are allowed while pending approval.

**Path Parameters:**
- `project_id` — The ID of the staged project to submit.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK`:** Returns the project metadata (same shape as `GET /v1/staged/metadata.json` for a single project).

**Errors:**
- `400 Bad Request` — Project is not staged, validation failure (e.g., missing icon or zip), or project name-version pair already exists.
- `401 Unauthorized` — No valid API key provided or user not verified.
- `404 Not Found` — Project does not exist or does not belong to the user.

---

## Pending Endpoints (Authentication Required)

These endpoints manage projects in the **Pending Approval** or **Pending Release** states. Some operations require admin privileges.

### `GET /v1/pending/metadata.json`

**Source:** `pb_hooks/endpoints/pending/GET_metadata.pb.js`

Returns metadata of all projects currently in **Pending Approval** status. Admin only.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK`:**
```json
[
    {
        "name": "Example",
        "version": "1.0",
        "authors": ["Steppers"],
        "banner": "banner_DrsIRyEPPY.png",
        "category": "application",
        "description_long": "A long description...",
        "description_short": "A short desc.",
        "forum_link": "https://talk.codea.io/...",
        "icon": "icon_2x_DrsIRyEPPE.png",
        "id": "mr1oa9nvzxkcv13",
        "installed_size": 1153133,
        "platform": "iPhone & iPad",
        "screenshots": [],
        "status": "PendingApproval",
        "update_notes": "- My update notes",
        "version": "1.0",
        "zip": "project_HyilduJamO.zip"
    }
]
```

Note: The fields `collectionName`, `collectionId`, `created`, `updated`, `release_date`, `download_count`, and `forum_post_id` are stripped from the response.

**Errors:**
- `401 Unauthorized` — No valid API key provided or user not verified.
- `403 Forbidden` — User is not an admin.

---

### `POST /v1/pending/{project_id}/withdraw`

**Source:** `pb_hooks/endpoints/pending/POST_withdraw.pb.js`

Withdraws a pending project (either **Pending Approval** or **Pending Release**) back to the **Staged** state. The owner of the project can withdraw their own project.

**Path Parameters:**
- `project_id` — The ID of the project to withdraw.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK`:** Returns the updated project metadata.

**Errors:**
- `400 Bad Request` — Project is not in a pending state.
- `401 Unauthorized` — No valid API key provided or user not verified.
- `404 Not Found` — Project does not exist or does not belong to the user.

---

### `POST /v1/pending/{project_id}/approve`

**Source:** `pb_hooks/endpoints/pending/POST_approve.pb.js`

Approves a **Pending Approval** project, transitioning it to **Pending Release**. Admin only.

**Path Parameters:**
- `project_id` — The ID of the project to approve.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK`:** Returns the updated project metadata.

**Errors:**
- `400 Bad Request` — Project is not pending approval.
- `401 Unauthorized` — No valid API key provided or user not verified.
- `403 Forbidden` — User is not an admin.
- `404 Not Found` — Project does not exist.

---

### `POST /v1/pending/{project_id}/reject`

**Source:** `pb_hooks/endpoints/pending/POST_reject.pb.js`

Rejects a **Pending Approval** project, returning it to the **Staged** state. Admin only.

**Path Parameters:**
- `project_id` — The ID of the project to reject.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK`:** Returns the updated project metadata.

**Errors:**
- `400 Bad Request` — Project is not pending approval.
- `401 Unauthorized` — No valid API key provided or user not verified.
- `403 Forbidden` — User is not an admin.
- `404 Not Found` — Project does not exist.

---

### `POST /v1/pending/{project_id}/release`

**Source:** `pb_hooks/endpoints/pending/POST_release.pb.js`

Releases an approved project (in **Pending Release** state), transitioning it to **Released** and making it publicly available. The owner of the project can release their own approved project.

**Path Parameters:**
- `project_id` — The ID of the project to release.

**Headers:**
- `Moonbase-Api-Key: <users_api_key>`

**Response `200 OK`:** Returns the updated project metadata.

**Errors:**
- `400 Bad Request` — Project has not been approved (not in **Pending Release** state).
- `401 Unauthorized` — No valid API key provided or user not verified.
- `404 Not Found` — Project does not exist or does not belong to the user.

---

## Webhook Endpoints

### `POST /v1/webhook/discourse_like`

**Source:** `pb_hooks/endpoints/webhook/POST_discourse_like.pb.js`

Webhook endpoint called by the Discourse forum when a user reacts to a forum post. This is used to automate the approval/release workflow based on Discourse reactions.

- A **:rocket:** reaction from a moonbase admin on the submission post approves the project.
- A **:no_entry_sign:** reaction from a moonbase admin on the submission post rejects the project.
- On the approval post (after approval), a **:rocket:** reaction from the project owner releases the project.
- On the approval post, a **:no_entry_sign:** reaction from the project owner withdraws the project.

**Headers:**
- `X-Discourse-Event-Signature: sha256=<hmac_hex>` — HMAC-SHA256 of the raw request body using `DISCOURSE_WEBHOOK_SECRET`.

**Response `200 OK`:** A string describing the action taken (e.g., `"Approved project: ..."`, `"Released project: ..."`, `"No action"`).

**Errors:**
- `400 Bad Request` — Invalid webhook signature.

---

## Error Responses

All endpoints return appropriate HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| `200 OK` | Request succeeded. |
| `204 No Content` | Request succeeded, no response body. |
| `400 Bad Request` | Invalid request (validation failure, wrong state, etc.). |
| `401 Unauthorized` | Missing or invalid API key. |
| `403 Forbidden` | Authenticated but insufficient permissions. |
| `404 Not Found` | Resource not found. |

Error responses may include a plain text or JSON body with details.

---

## Environment Variables

The following environment variables configure the Moonbase API:

| Variable | Description |
|----------|-------------|
| `DISCOURSE_API_KEY` | API key assigned to the Discourse bot. |
| `DISCOURSE_USERNAME` | Username of the Discourse bot. |
| `DISCOURSE_WEBHOOK_SECRET` | Secret set in Discourse when configuring the webhook. |
| `DISCOURSE_IDENTITY_HOST` | Discourse host for SSO identity provider (default: `talk.codea.io`). |
| `DISCOURSE_IDENTITY_SECRET` | Secret set for Discourse Connect SSO. |

---

## End-to-End Usage Example

This example walks through the complete lifecycle of a project on Moonbase, from authentication through to public release, including a cancellation (withdrawal) midway for revisions.

### Prerequisites

- A [talk.codea.io](https://talk.codea.io) forum account.
- `curl` (or any HTTP client) for making API calls.
- The Moonbase instance URL (replace `https://moonbase.example.com` below with the actual host).

### Step 1: Authenticate and Obtain an API Key

```bash
# Step 1a: Initiate authentication
$ curl https://moonbase.example.com/v1/auth/authenticate
{
  "stage1Url": "https://talk.codea.io/session/sso_provider?sso=...&sig=...",
  "stage2Url": "https://moonbase.example.com/v1/auth/key/abc123tempkey..."
}
```

Open `stage1Url` in a browser, log in to talk.codea.io, and see the success message. Then complete the flow:

```bash
# Step 1b: Retrieve final API key
$ curl https://moonbase.example.com/v1/auth/key/abc123tempkey...
{
  "api_key": "fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0"
}
```

Save the returned `api_key` — all subsequent authenticated requests will include the header:
`Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0`

### Step 2: Check Your Permissions

```bash
$ curl -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    https://moonbase.example.com/v1/auth/permissions.json
{
  "admin": false,
  "max_staged": 4
}
```

This confirms we are a regular user (not admin) and can have up to 4 staged projects simultaneously.

### Step 3: Create a New Staged Project

```bash
$ curl -X PUT -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Super Game",
      "version": "1.0.0",
      "authors": ["GameDev99"],
      "category": "game",
      "platform": "iPhone & iPad",
      "description_short": "An amazing adventure game",
      "description_long": "Super Game takes you on an epic journey through mysterious lands.",
      "update_notes": "- Initial release"
    }' \
    https://moonbase.example.com/v1/staged/new
{
  "name": "Super Game",
  "version": "1.0.0",
  "authors": ["GameDev99"],
  "category": "game",
  "platform": "iPhone & iPad",
  "description_short": "An amazing adventure game",
  "description_long": "Super Game takes you on an epic journey through mysterious lands.",
  "update_notes": "- Initial release",
  "id": "proj_abc123",
  "status": "Staged",
  ...
}
```

Note the returned `id` (`proj_abc123`) — we will use it in subsequent requests.

### Step 4: Upload Project Assets

Upload the icon and the project zip file as multipart form data:

```bash
$ curl -X PUT -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    -F "icon=@icon_256.png" \
    -F "zip=@SuperGame-1.0.0.zip" \
    -F "banner=@banner.png" \
    -F "name=Super Game" \
    -F "version=1.0.0" \
    https://moonbase.example.com/v1/staged/proj_abc123
{
  "name": "Super Game",
  ...
  "icon": "icon_2x_xyz.png",
  "zip": "project_abc123def.zip",
  "banner": "banner_xyz.png",
  "status": "Staged"
}
```

### Step 5: List Your Staged Projects

```bash
$ curl -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    https://moonbase.example.com/v1/staged/metadata.json
[
  {
    "id": "proj_abc123",
    "name": "Super Game",
    "version": "1.0.0",
    "status": "Staged",
    ...
  }
]
```

### Step 6: Submit the Project for Approval

```bash
$ curl -X POST -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    https://moonbase.example.com/v1/staged/proj_abc123/submit
{
  "id": "proj_abc123",
  "name": "Super Game",
  "version": "1.0.0",
  "status": "PendingApproval",
  ...
}
```

The project is now awaiting moderator review. No further edits are possible until it is withdrawn.

### Step 7: Withdraw the Project (Owner Cancellation)

Suppose the author realises they need to fix something. They can withdraw the project back to **Staged**:

```bash
$ curl -X POST -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    https://moonbase.example.com/v1/pending/proj_abc123/withdraw
{
  "id": "proj_abc123",
  "name": "Super Game",
  "version": "1.0.0",
  "status": "Staged",
  ...
}
```

### Step 8: Make Edits and Re-submit

Now that the project is back in **Staged**, we can edit it:

```bash
$ curl -X PUT -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    -H "Content-Type: application/json" \
    -d '{
      "update_notes": "- Fixed crash on level 3\n- Improved performance"
    }' \
    https://moonbase.example.com/v1/staged/proj_abc123
{
  "id": "proj_abc123",
  "update_notes": "- Fixed crash on level 3\n- Improved performance",
  "status": "Staged"
}
```

Then submit again:

```bash
$ curl -X POST -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    https://moonbase.example.com/v1/staged/proj_abc123/submit
{
  "id": "proj_abc123",
  "status": "PendingApproval",
  ...
}
```

### Step 9: Admin Reviews and Approves the Project

An admin (a different user with the `admin` permission) lists all pending projects:

```bash
$ curl -H "Moonbase-Api-Key: <admin_api_key>" \
    https://moonbase.example.com/v1/pending/metadata.json
[
  {
    "id": "proj_abc123",
    "name": "Super Game",
    "status": "PendingApproval",
    ...
  }
]
```

The admin approves the project:

```bash
$ curl -X POST -H "Moonbase-Api-Key: <admin_api_key>" \
    https://moonbase.example.com/v1/pending/proj_abc123/approve
{
  "id": "proj_abc123",
  "name": "Super Game",
  "status": "PendingRelease",
  ...
}
```

The project is now in **Pending Release** — approved but not yet public.

### Step 10: Owner Releases the Project Publicly

The project owner (or the same admin, if authorised) can now release the project, making it visible to everyone:

```bash
$ curl -X POST -H "Moonbase-Api-Key: fpXk82mNqL9vR4tW7yB3jH5cD1gE6sU0" \
    https://moonbase.example.com/v1/pending/proj_abc123/release
{
  "id": "proj_abc123",
  "name": "Super Game",
  "version": "1.0.0",
  "status": "Released",
  "release_date": "2026-07-07 14:30:00.000Z",
  ...
}
```

The project is now publicly available.

### Step 11: Verify the Project is Public

Anyone (no authentication required) can see the project in the manifest and download its assets:

```bash
# Browse the manifest
$ curl https://moonbase.example.com/v1/public/manifest.json
{
  "Super Game": [
    ["proj_abc123", "1.0.0", 1720362600]
  ],
  ...
}

# Get project metadata
$ curl https://moonbase.example.com/v1/assets/proj_abc123/metadata.json
{
  "name": "Super Game",
  "download_count": 0,
  "status": "Released",
  ...
}

# Download the project zip
$ curl -O https://moonbase.example.com/v1/assets/proj_abc123/project_abc123def.zip
```

### Summary of State Transitions

```
           Request Approval                    approve                    release
  Staged ──────────────────► PendingApproval ───────────► PendingRelease ──────────► Released
    ▲                            │  │                         │
    │◄───────────────────────────┘  │◄────────────────────────┘
    │        reject (by admin)      │   withdraw (by owner)
    │                               │
    └───────────────────────────────┘
         reject / withdraw
```

Note: The admin can also reject a **Pending Approval** project (returning it to **Staged**), and the webhook endpoint can automate the approval/release workflow based on Discourse forum reactions.