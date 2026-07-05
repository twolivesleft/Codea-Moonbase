/// <reference path="../../../pb_data/types.d.ts" />

// Move the project status to 'PendingApproval'.
// No edits are allowed while a project is pending approval.
// To make edits, a project must be withdrawn from the approval process first.
routerAdd("POST", "/v1/staged/{project_id}/submit", (c) => {
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

    // Must be staged
    if (!project.isStaged()) {
        throw new BadRequestError("Project is not staged.");
    }

    // Submit the project
    project.submit();

    // Send notifications, update forum posts, etc.
    require(`${__hooks}/utils/notifications.js`).notify_submit(project.record);

    return c.json(200, project.metadata);
});
