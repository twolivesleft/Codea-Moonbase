/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("GET", "/v1/assets/{project_id}/{asset_id}", (c) => {
    const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

    // Get the project and asset ids.
    const projectId = c.request.pathValue("project_id");
    const assetId = c.request.pathValue("asset_id");

    const project = MBProject.get(projectId);

    // Must be released
    if (!project.isReleased()) {
        const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);

        // If the project is not approved it is still accessible to the owner
        // & admins.

        // Get the current user
        const user = MBUser.getAuthenticated(c);

        // Admins can access any project assets (used during approval process).
        if (!user.isAdmin()) {
            // Project must belong to user
            if (!project.belongsTo(user)) {
                throw new ForbiddenError();
            }
        }
    }

    switch(assetId) {
        case "metadata.json":
            return c.json(200, project.metadata);
        default:
            // The asset id shouldn't include any directory prefix.
            if ($filepath.dir(assetId) != '.') {
                return new NotFoundError();
            }

            // Increment download count for zip downloads
            if (assetId == project.record.get("zip")) {
                project.incrementDownloadCount();
            }

            // Return the requested file
            let fs = $os.dirFS($app.dataDir());
            let path = project.getAssetPath(assetId)
            // $app.logger().info(`Get file: ${fs}, ${path}`);
            return c.fileFS(fs, path);
    }
});
