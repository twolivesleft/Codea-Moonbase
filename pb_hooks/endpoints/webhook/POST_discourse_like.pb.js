/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("POST", "/v1/webhook/discourse_like", (c)=>{
    const info = c.requestInfo();

    // Validate correct webhook signature
    const signature = info.headers["x_discourse_event_signature"];
    const WEBHOOK_SECRET = $os.getenv("DISCOURSE_WEBHOOK_SECRET");
    const payload = toString(c.request.body);
    // Compare signatures
    if (signature != `sha256=${$security.hs256(payload, WEBHOOK_SECRET)}`) {
        throw new BadRequestError();
    }

    // Parse the event payload
    const body = JSON.parse(payload);

    // Return ping
    if (body.ping != undefined) {
        return c.json(200, {pong:"OK"});
    }
    
    // Get reaction data
    const postId = body.like.post.id;
    const userId = body.like.user.id;

    // The post should be related to a pending project
    const MBProject = require(`${__hooks}/backend/MBProject.pb`);
    let project;
    let isApprovalPost = false;
    try {
        const record = $app.findFirstRecordByData("projects", "forum_post_id", postId);
        project = MBProject.get(record.id);
    } catch(e) {
		try {
	        const record = $app.findFirstRecordByData("projects", "approval_post_id", postId);
	        project = MBProject.get(record.id);
	        isApprovalPost = true;
	    } catch(e) {
   	    	$app.logger().info("No post match");
	        return c.string(200, "No action");
	    }
    }

    const discourse = require(`${__hooks}/utils/discourse.js`)

    if (isApprovalPost) {
		if(!project.isPendingRelease()) {
			return c.string(200, "No action");
		}
    
    	// Get the user that triggered the webhook
    	try {
	   	    const userRecord = $app.findFirstRecordByData("users", "external_id", userId);
	   	    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);
	   	    const user = new MBUser(userRecord);

	   	    if (!project.belongsTo(user)) {
	   	    	return c.string(200, "No action");
	   	    }
	   	    
    		const userReactions = discourse.getUserReactions(postId);
			for (const reaction of userReactions) {
				if (reaction.id == "rocket" && reaction.users.find(rUser => rUser.username == user.name)) {
					// Release the project
	                project.release();

	                // Send notifications, update forum posts, etc.
	                require(`${__hooks}/utils/notifications.js`).notify_release(project.record, user.name);

	                return c.string(200, `Released project: ${project}`);
				}

				if (reaction.id == "prohibited" && reaction.users.find(rUser => rUser.username == user.name)) {
					// Withdraw the project
	                project.withdraw();

	                // Send notifications, update forum posts, etc.
	                require(`${__hooks}/utils/notifications.js`).notify_withdraw(project.record, user.name);

	                return c.string(200, `Withdrew project: ${project}`);
				}
			}
	   	    
   	    } catch(e) {
   	    	return c.string(200, "No action");
   	    }
    }
    else
    {
		// Must be a pending project
    	if (!project.isPendingApproval()) {
        	return c.string(200, "No action");
	    }
    
    	const moonbaseAdminUsernames = discourse.getApproverUsernames();
    	const userReactions = discourse.getUserReactions(postId);
	    for (const reaction of userReactions) {
            let adminReactors = reaction.users.filter(user => moonbaseAdminUsernames.includes(user.username));
            if (adminReactors.length > 0) {
                if (reaction.id == "rocket") {
	                // Approve the project
	                project.approve();

	                // Send notifications, update forum posts, etc.
	                require(`${__hooks}/utils/notifications.js`).notify_approve(project.record, adminReactors[0].username);

	                return c.string(200, `Approved project: ${project}`);
                }

                if (reaction.id == "prohibited") {
	                // Reject the project
	                project.reject();

	                // Send notifications, update forum posts, etc.
	                require(`${__hooks}/utils/notifications.js`).notify_reject(project.record, adminReactors[0].username);

	                return c.string(200, `Rejected project: ${project}`);
                }
            }
       	}
    }

    return c.string(200, "No action");
});
