/// <reference path="../../pb_data/types.d.ts" />

const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

class MBStagedProject extends MBProject {
    constructor(record) {
    	super(record);
    }

    submit() {
		// Ensure that this name-version combo does not already exist.
        const name = this.record.get("name");
        const version = this.record.get("version");
        const records = $app.findRecordsByFilter(
            "projects",
            `name = {:name} && version = {:version} && (status = "PendingRelease" || status = "Released")`,
            "",
            1,
            0,
            {name, version}
        );
        if (records.length > 0) {
            throw new BadRequestError("Project with name-version pair already exists.");
        }
	
	    this.validateForSubmission();
	    
	    this.record.set("status", "PendingApproval");
	    $app.save(this.record);
    }

    validateForSubmission() {
    	const missingFields = [];

    	if (this.record.get("icon") == "") {
    		missingFields.push("icon");
            throw new BadRequestError("Validation failure: missing icon");
        }

        if (this.record.get("zip") == "") {
    		missingFields.push("icon");
        }

        
	    // TODO: Validate record fields

        if (missingFields.length > 0) {
            throw new BadRequestError(`Validation failure, missing fields: ${missingFields.join(",")}`);
        }
    }

    get metadata() {
        const exported = this.record.publicExport();
    
        // Strip values that shouldn't be visible for unreleased projects
        delete exported.approval_post_id;
        delete exported.collectionName;
        delete exported.collectionId;
        delete exported.created;
        delete exported.updated;
        delete exported.release_date;
        delete exported.download_count;
        delete exported.forum_post_id;

        return exported;
    }
}

module.exports = MBStagedProject;
