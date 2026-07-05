/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("GET", "/v1/staged/:project_id/:asset_id", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);
    const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

    // Get the current user
    const user = MBUser.getAuthenticated(c);

    // Get params
    const projectId = c.pathParam("staged_project_id");
    const assetId = c.pathParam("asset_id");

    // Get the project
    const project = MBProject.get(projectId);

    // Admins can access any project assets (used during approval process).
    if (!user.isAdmin()) {
        // Project must belong to user
        if (!project.belongsTo(user)) {
            throw new ForbiddenError();
        }
    }

    // Handle asset id
    switch (assetId) {
        case "metadata.json":
            return c.json(200, MBProject.get(projectId).metadata);

        default:
            // The asset id shouldn't include any directory prefix.
            if ($filepath.dir(assetId) != '.') {
                return new NotFoundError();
            }

            // Return the requested file
            return c.file(project.getAssetPath(assetId));
    }
});
