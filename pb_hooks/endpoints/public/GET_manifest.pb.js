/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("GET", "/v1/public/manifest.json", (c) => {
    const manifest = {};

    // Get all released project records
    const records = $app.findRecordsByFilter("projects", 
        `status = 'Released'`,
        `-release_date`,
        0,
        0
    );

    // Generate the manifest from the records
    for (var r of records) {
        const name = r.get("name");
        if (manifest[name] == undefined) {
            manifest[name] = [];
        }
        manifest[name].push([
            r.id,
            r.get("version"),
            r.get("release_date").time().unix()
        ]);
    }

    return c.json(200, manifest);
});
