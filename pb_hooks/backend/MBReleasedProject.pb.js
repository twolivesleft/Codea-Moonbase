/// <reference path="../../pb_data/types.d.ts" />

const MBProject = require(`${__hooks}/backend/MBProject.pb.js`);

class MBReleasedProject extends MBProject {
    constructor(record) {
    	super(record);
    }
    
    get metadata() {
        const exported = this.record.publicExport();

        //exported.release_date
    
        // Strip values that shouldn't be visible for released projects
        delete exported.approval_post_id;
        delete exported.collectionName;
        delete exported.collectionId;
        delete exported.created;
        delete exported.updated;
        
        return exported;
    }

    incrementDownloadCount() {
        $app.db().newQuery(
            `UPDATE projects
            SET download_count = download_count + 1
            WHERE id = '${this.record.id}'`)
            .execute();
    }
}

module.exports = MBReleasedProject;
