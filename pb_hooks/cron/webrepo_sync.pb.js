/// <reference path="../../pb_data/types.d.ts" />

cronAdd("webrepo_sync", "@hourly", () => {
// onAfterBootstrap((e) => {

    $app.logger().info("Syncing WebRepo Projects");

	// Erase all current projects
	// {
    //     const result = arrayOf(new DynamicModel({
    //         "id":		""
    //     }));
    //     $app.dao().db()
    //         .newQuery("SELECT id FROM projects;")
    //         .all(result);
    //     for (var r of result) {
	// 		const record = $app.dao().findRecordById("projects", r.id);
	// 		$app.dao().deleteRecord(record);
    //     }
    // }
    

    // Get remote manifest
    const remoteManifest = $http.send({
        url:        "https://codeawebrepo.co.uk/manifest.json",
        method:     "GET"
    }).json;

    // Generate our local manifest
    const localManifest = {};
    {
        const result = arrayOf(new DynamicModel({
            "name":		"",
            "version":	""
        }));
        $app.db()
            .newQuery("SELECT name, version FROM projects")
            .all(result);
        for (var project of result) {
            if (localManifest[project.name] == undefined) {
                localManifest[project.name] = [];
            }
            localManifest[project.name].push(project.version)
        }
    }

    const syncProjectVersion = (name, version, metadata) => {
        $app.logger().info(`Syncing project: ${name} (${version})`);

        const iconName = metadata.icon.replace(/.*\.codea\//, "");

        const collection = $app.findCollectionByNameOrId("projects")
        const record = new Record(collection);
        // const form = new RecordUpsertForm($app, record);

        const releaseDate = new DateTime();
        releaseDate.scan(metadata.timestamp);

        // Trim all author names
        const authors = metadata.authors.map((v)=>v.trim());

        if (metadata.platform == undefined) {
            metadata.platform = "iPhone & iPad";
        } else {
            // Swap platform names
            metadata.platform = metadata.platform.replace("iPad & iPhone", "iPhone & iPad");
        }

        record.load({
            "name":     metadata.name,
            "description_short": metadata.short_description,
            "description_long": metadata.description,
            "version": version,
            "update_notes": metadata.update_notes,
            "category": metadata.category.toLowerCase().replace("app", "application"),
            "platform": metadata.platform.replace(" Only", ""),
            "authors": authors,
            "release_date": releaseDate,
            "pending_approval": false,
            "installed_size": metadata.size,
            "forum_link": metadata.forum_link,
            "status": "Released"
        });
        try {
            record.set("icon", $filesystem.fileFromURL(`https://codeawebrepo.co.uk/${name}/${iconName}`));
        } catch(e) {
            // Attempt to download 'Icon.png'
            record.set("icon", $filesystem.fileFromURL(`https://codeawebrepo.co.uk/${name}/Icon.png`));
        }
        record.set("zip", $filesystem.fileFromURL(`https://codeawebrepo.co.uk/${name}/${version}/project.zip`));
		$app.save(record);
    };

    for (var name in remoteManifest) {
    	for (var version of remoteManifest[name]) {
    		// Get metadata
		    const metadata = $http.send({
		        url:        `https://codeawebrepo.co.uk/${name}/${version}/metadata.json`,
		        method:     "GET"
		    }).json;

		    if (localManifest[metadata.name] == undefined) {
		    	syncProjectVersion(name, version, metadata);
		    } else if (!localManifest[metadata.name].includes(version)) {
		    	syncProjectVersion(name, version, metadata);
		    }
    	}        
    }
});
