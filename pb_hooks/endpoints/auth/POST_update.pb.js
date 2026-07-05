/// <reference path="../../../pb_data/types.d.ts" />

// Configure an update endpoint to retrieve the latest state from discourse
routerAdd("POST", "/v1/auth/update", (c) => {
    const auth = require(`${__hooks}/util_user_auth.js`);

    // Check client is authenticated
    if (!auth.isAuthenticatedRequest(c)) {
        return c.noContent(401);
    }

    const discourse = require(`${__hooks}/util_discourse.js`);
    const userInfo = discourse.getUserInfo(auth.getExternalId(c));
    const userRecord = auth.getUserRecord(c);

    // Update username on file to keep it up to date
    userRecord.set("username", userInfo.username);

    // Update admin state (depends on moonbase_admin group membership)
    userRecord.set("admin", false);
    for (const group of userInfo.groups) {
        if (group.id == discourse.ADMIN_GROUP_ID) {
            userRecord.set("admin", true);
            break;
        }
    }

    // Commit updated user record
    $app.save(userRecord);

    return c.noContent(200);
})
