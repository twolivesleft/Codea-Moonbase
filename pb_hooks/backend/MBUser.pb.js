/// <reference path="../../pb_data/types.d.ts" />

// Imports
const b64 = require(`${__hooks}/utils/base64.js`);

// Constants
const DISCOURSE_HOST = $os.getenv("DISCOURSE_HOST");
const DISCOURSE_IDENTITY_SECRET = $os.getenv("DISCOURSE_IDENTITY_SECRET");
const HOST_URL = $app.settings().meta.appUrl;
const API_KEY_HEADER_NAME = "moonbase-api-key";

// 'users' collection
const collectionName = "users";
const collection = $app.findCollectionByNameOrId(collectionName)





const getRecordFromContext = (c) => {
    let record = c.requestInfo().userRecord;
    if (record == undefined) {
        // Find the user record
        const user_key = c.request.header.get(API_KEY_HEADER_NAME);
        record = $app.findFirstRecordByData("users", "api_key", user_key);

        // Cache record
        c.requestInfo().userRecord = record;
    }
    return record;
}





class MBUser {
    constructor(record) {
        if (record == undefined) {
            this.record = new Record(collection, {
                verified: false,
                api_key: $security.randomString(32)
            });
            $app.save(this.record);
        } else {
            this.record = record;
        }
    }

    static getAuthenticated(c) {
        try {
            const record = getRecordFromContext(c);
    
            // User must be authenticated
            if (!record.get("verified")) {
           		$app.logger().info("Not verified");
                throw new UnauthorizedError();
            }
    
            return new MBUser(record);
        } catch(e) {
           	$app.logger().info(`Err: ${e}`);
            throw new UnauthorizedError();
        }
    }

    authenticate() {
        const auth = require(`${__hooks}/utils/auth.pb.js`);
        return auth.begin(this.record);
    }

    isAdmin() {
        return this.record.get("admin");
    }

    hasStagedSlotAvailable() {
        return this.record.get("staged_projects").length < this.record.get("max_staged");
    }

    addStagedProject(project) {
        const projects = this.record.get("staged_projects");
        projects.push(project.id);
        this.record.set("staged_projects", projects);
        $app.save(this.record);
    }

    removeStagedProject(project) {
        const projects = this.record.get("staged_projects");
        projects.splice(projects.indexOf(project.id), 1);
        this.record.set("staged_projects", projects);
        $app.save(this.record);
    }

    get id() {
        return this.record.id;
    }

    get externalId() {
        return this.record.get("external_id");
    }

    get stagedProjectIds() {
        return this.record.get("staged_projects");
    }

    get name() {
    	return this.record.get("username");
    }
}

module.exports = MBUser;
