/// <reference path="../../../pb_data/types.d.ts" />

// Return metadata of all pending projects
routerAdd("GET", "/v1/pending/metadata.json", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);

    // Get the current user
    const user = MBUser.getAuthenticated(c);

    // Client must be an admin to view pending projects
    if (!user.isAdmin()) {
        throw new ForbiddenError();
    }

    // Get all pending project records
    const records = $app.findRecordsByFilter("projects",
        "status = 'PendingApproval'",
        "-created",
        0,
        0);

    // Generate metadata array
    const meta = [];
    for (const record of records) {
        const exported = record.publicExport();
        delete exported.collectionName;
        delete exported.collectionId;
        delete exported.created;
        delete exported.updated;
        delete exported.release_date;
        delete exported.download_count;
        delete exported.forum_post_id;
        meta.push(exported);
    }
    return c.json(200, meta);
});
