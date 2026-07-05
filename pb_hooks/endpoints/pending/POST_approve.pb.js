/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("POST", "/v1/pending/{project_id}/approve", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);
    const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

    // Get the current user
    const user = MBUser.getAuthenticated(c);

    // User must be an admin
    if (!user.isAdmin()) {
        throw new ForbiddenError();
    }

    // Get the project id.
    const project = MBProject.get(c.request.pathValue("project_id"));

    // Must be a pending project
    if (!project.isPendingApproval()) {
        throw new BadRequestError("Project is not pending approval.");
    }

    // Approve the project
    project.approve();

    // Send notifications, update forum posts, etc.
    require(`${__hooks}/utils/notifications.js`).notify_approve(project.record, user.name);

    return c.json(200, project.metadata);
});
