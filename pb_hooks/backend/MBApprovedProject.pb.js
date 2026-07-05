/// <reference path="../../pb_data/types.d.ts" />

const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

class MBApprovedProject extends MBProject {
    constructor(record) {
    	super(record);
    }

    withdraw() {
	    this.record.set("status", "Staged");
	    this.record.set("approval_post_id", "");
	    $app.save(this.record);
    }

    release() {
		this.record.set("release_date", new DateTime());
	    this.record.set("status", "Released");
	    this.record.set("approval_post_id", "");
	    $app.save(this.record);
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

module.exports = MBApprovedProject;
