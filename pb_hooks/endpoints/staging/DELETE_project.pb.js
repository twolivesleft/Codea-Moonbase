/// <reference path="../../../pb_data/types.d.ts" />

// Delete a staged project belonging to the user.
routerAdd("DELETE", "/v1/staged/{project_id}", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);
    const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

    // Get the current user
    const user = MBUser.getAuthenticated(c);

    // Get the project
    const project = MBProject.get(c.request.pathValue("project_id"));

    // Check that this project belongs to the user
    if (!project.belongsTo(user)) {
        throw new NotFoundError();
    }
    
    // Must be a staged project
    if (!project.isStaged()) {
        throw new BadRequestError("Project is not staged.");
    }

    // Delete the staged project record and its reference in the client record.
    project.delete();

    return c.noContent(200) // OK
});
