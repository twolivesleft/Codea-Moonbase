/// <reference path="../../pb_data/types.d.ts" />

// Get 'projects' collection
const collectionName = "projects";
const collection = $app.findCollectionByNameOrId(collectionName)

// Default Project Data
const defaultProjectData = {
    name: "Untitled",
    version: "X.Y.Z",
    authors: [],
    status: "Staged",
    platform: "iPhone & iPad",
    category: "application",
    description_short: "<Short Description Here>",
    description_long: "<Long Description Here>",
    update_notes: "- Initial release"
}

class MBProject {
    constructor(record) {
        if (record == undefined) {
            const record = new Record(collection, defaultProjectData);
            $app.save(record);

            const MBStagedProject = require(`${__hooks}/backend/MBStagedProject.pb.js`);
            return new MBStagedProject(record);
        } else {
            this.record = record;
        }
    }

    // static new() {
    //     const record = new Record(collection, defaultProjectData);
    //     $app.dao().saveRecord(record);
    //     return new MBStagedProject(record);
    // }

    static get(id) {
        // Each state is returned as a different type
        //
        // TODO: Find a better solution to this require mess...
        const MBStagedProject = require(`${__hooks}/backend/MBStagedProject.pb.js`);
        const MBPendingProject = require(`${__hooks}/backend/MBPendingProject.pb.js`);
        const MBApprovedProject = require(`${__hooks}/backend/MBApprovedProject.pb.js`);
        const MBReleasedProject = require(`${__hooks}/backend/MBReleasedProject.pb.js`);

    	const record = $app.findRecordById(collectionName, id);
    	switch (record.get("status")) {
    		case "Staged":			return new MBStagedProject(record);
    		case "PendingApproval":	return new MBPendingProject(record);
    		case "PendingRelease":	return new MBApprovedProject(record);
    		case "Released":		return new MBReleasedProject(record);
    	}
    }

    delete() {
        $app.delete(this.record);
    }

    belongsTo(user) {
        return user.stagedProjectIds.includes(this.record.id);
    }

    load(c) {
        // Generate form from the passed context
        const form = new RecordUpsertForm($app, this.record)
        const body = c.requestInfo().body;
        form.load(body);
        const origRecord = this.record.fresh();

        this.record.load(c.requestInfo().body);

		try{
	        const new_screenshots = c.findUploadedFiles("screenshots");
			if (new_screenshots.length > 0)
			{        
	        	this.record.set("screenshots", new_screenshots);
	        }
        }catch(_){}

		try{
        	const new_zip = c.findUploadedFiles("zip");
			if (new_zip.length > 0)
			{
	        	this.record.set("zip", new_zip[0]);
	        }
		} catch(_) {}

		try{
	        const new_icon = c.findUploadedFiles("icon");
			if (new_icon.length > 0)
			{        
	        	this.record.set("icon", new_icon[0]);
	        }
        }catch(_){}

        try {
            // Verify & commit the record update
            form.submit((next)=>{
                return (r) => {
                    // Ensure we don't change protected fields
                    r.set("id", origRecord.get("id"));
                    r.set("created", origRecord.get("created"));
                    r.set("updated", origRecord.get("updated"));
                    r.set("status", origRecord.get("status"));
                    r.set("release_date", origRecord.get("release_date"));
                    r.set("download_count", origRecord.get("download_count"));
                    r.set("forum_post_id", origRecord.get("forum_post_id"));
                    r.set("approval_post_id", origRecord.get("approval_post_id"));
                    // TODO:
                    // calcInstalledSize(r);
                    next(r);
                };
            });
        } catch(e) {
            console.log(e);
            throw new BadRequestError("Data validation failed.");
        }
    }

    getAssetPath(assetId) {
        // return `${$app.dataDir()}/storage/${this.record.baseFilesPath()}/${assetId}`;
        return `storage/${this.record.baseFilesPath()}/${assetId}`;
    }

    isStaged(){
        return this.record.get("status") == "Staged";
    }
    
    isPendingApproval(){
        return this.record.get("status") == "PendingApproval";
    }
    
    isPendingRelease(){
        return this.record.get("status") == "PendingRelease";
    }
    
    isReleased(){
        return this.record.get("status") == "Released";
    }

    get id() {
        return this.record.id;
    }

    get metadata() {
        const metadata = this.record.publicExport();
    
        // Strip some info out
        delete metadata.collectionName;
        delete metadata.collectionId;
        delete metadata.created;
        delete metadata.updated;
    
        return metadata;
    }

    toString() {
        return `${this.record.get("name")}-${this.record.get("version")}`;
    } 
}

module.exports = MBProject;
