/// <reference path="../../../pb_data/types.d.ts" />

// Return all metadata of all staged projects belonging to the client.
routerAdd("GET", "/v1/staged/metadata.json", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);
    const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

    // Get the current user
    const user = MBUser.getAuthenticated(c);

    // Get all staged project IDs.
    const projectRecordIds = user.stagedProjectIds;

    // Generate full metadata response
    const meta = projectRecordIds.map((id) => MBProject.get(id).metadata);
    return c.json(200, meta);
});