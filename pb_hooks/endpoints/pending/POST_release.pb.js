/// <reference path="../../../pb_data/types.d.ts" />

// Move an approved project into the 'Released' state.
// No edits or withdrawals may be performed after this.
// The project will be made publicly available.
routerAdd("POST", "/v1/pending/{project_id}/release", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);
    const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

    // Get the current user
    const user = MBUser.getAuthenticated(c);

    // Get the project id.
    const project = MBProject.get(c.request.pathValue("project_id"));

    // Check that this project belongs to the user
    if (!project.belongsTo(user)) {
        throw new NotFoundError();
    }

    // Must be a pending project
    if (!project.isPendingRelease()) {
        throw new BadRequestError("Project has not been approved.");
    }

    // Release the project
    project.release();
    user.removeStagedProject(project);

    // Send notifications, update forum posts, etc.
    require(`${__hooks}/utils/notifications.js`).notify_release(project.record);

    return c.json(200, project.metadata);
});
