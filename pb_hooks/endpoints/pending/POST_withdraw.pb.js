/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("POST", "/v1/pending/{project_id}/withdraw", (c) => {
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
    if (!(project.isPendingApproval() || project.isPendingRelease())) {
        throw new BadRequestError("Project is not pending approval or release.");
    }

    // Withdraw the project
    project.withdraw();

    // Send notifications, update forum posts, etc.
    require(`${__hooks}/utils/notifications.js`).notify_withdraw(project.record);

    return c.json(200, project.metadata);
});
