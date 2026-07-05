/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("GET", "/v1/public/featured.json", (c) => {
    const records = $app.findAllRecords("featured_projects");

    // Generate metadata array
    const meta = [];
    for (const record of records) {
		const projectRecord = $app.findRecordById("projects", record.get("project"));
        const exported = projectRecord.publicExport();
        delete exported.approval_post_id;
        delete exported.collectionName;
        delete exported.collectionId;
        delete exported.created;
        delete exported.updated;
        meta.push(exported);
    }
    return c.json(200, meta);
});
