/// <reference path="../../../pb_data/types.d.ts" />

// Update data and assets of the provided staged project.
routerAdd("PUT", "/v1/staged/{project_id}", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);
    const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

    // Get the current user
    const user = MBUser.getAuthenticated(c);

    // Get the project
    const projectId = c.request.pathValue("project_id");
    let project;
    if (projectId == "new") {
        // Do we have a spare staged project slot?
        if (!user.hasStagedSlotAvailable()) {
            throw new BadRequestError("Too many staged projects.");
        }

        // Create new default project record.
        project = new MBProject();

        // Add project to user record.
        user.addStagedProject(project);
    } else {
        project = MBProject.get(projectId);

        // Check that this project belongs to the user
        if (!project.belongsTo(user)) {
            throw new NotFoundError();
        }

        // Must be staged
        if (!project.isStaged()) {
            throw new BadRequestError("Project is not staged.");
        }
    }

	try {
    	// Update record with provided data
    	project.load(c);
    } catch(e) {
    	if (projectId == "new") {
	    	// Failed to create valid project so delete it.
	    	project.delete();
    	}
    	throw e;
    }

    // Return the updated metadata
    return c.json(200, project.metadata);
});
