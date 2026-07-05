/// <reference path="../../pb_data/types.d.ts" />

const pushover = require(`${__hooks}/utils/pushover.js`);
const discourse = require(`${__hooks}/utils/discourse.js`);

const ENABLE_PUSHOVER = true;
const ENABLE_DISCOURSE = true;

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function createPost(projectRecord, titleSuffix) {
    const discourse = require(`${__hooks}/utils/discourse.js`);

    // Upload icon to discourse
    let iconUpload;
    {
        const iconId = projectRecord.get("icon");
        const url = `http://127.0.0.1:80/api/files/projects/${projectRecord.id}/${iconId}?thumb=256x256`;
        iconUpload = discourse.uploadFileFromUrl(url);
    }

    // Generate author info
    let authorsHeading;
    let authors = JSON.parse(projectRecord.get("authors"));
    if (authors.length > 1) {
        authorsHeading = "Crew";
    } else {
        authorsHeading = "Pilot";
    }
    authors = authors.map((v) => {
        if (discourse.userExists(v)) {
            // User exists, add an '@' mention.
            return "@"+v;
        } else {
            // No matching user, just use the supplied name
            return v;
        }
    });
    authors = authors.join(", ");

    // Setup the renderer + data
    const postRenderer = $template.loadFiles(`${__hooks}/views/post.md`);
    const renderData = {
        version: projectRecord.get("version"),
        update_notes: projectRecord.get("update_notes"),
        description_short: projectRecord.get("description_short"),
        description_long: projectRecord.get("description_long"),
        category: capitalizeFirstLetter(projectRecord.get("category")),
        platform: projectRecord.get("platform"),
        pad_number: getRandomInt(10),
        project_id: projectRecord.id,
        icon_path: iconUpload.short_path,
        title_suffix: titleSuffix,
        authors_heading: authorsHeading,
        authors: authors
    };

    // Render!
    return postRenderer.render(renderData);
}

module.exports = {
    
    notify_submit: (projectRecord) => {
        const name = projectRecord.get("name");
        const version = projectRecord.get("version");
        if (ENABLE_PUSHOVER) {
            pushover.send(`Pending: ${name}-${version}`, `A project is pending approval.`);
        }

        // Create/Update a forum post
        if (ENABLE_DISCOURSE) {
            let postContent = createPost(projectRecord);

            // Do we have a topic?
            let topicId, postId;
            try {
                const record = $app.findFirstRecordByData("forum_topics", "project_name", name)
                topicId = record.get("topic_id");
            } catch(_) {
                // Create a new topic + post
                [topicId, postId] = discourse.createTopic(`${name} (Project Thread)`, postContent);

                // Create new forum_topic record.
                { 
                    const collection = $app.findCollectionByNameOrId("forum_topics");
                    const topicRecord = new Record(collection, {
                        project_name: name,
                        topic_id: topicId
                    });
                    $app.save(topicRecord);
                }

                // Set post_id in project record.
                {
                    projectRecord.set("forum_post_id", postId);
                    $app.save(projectRecord);
                }
                return;
            }

            // Create new post in topic
            postId = discourse.createPost(topicId, postContent);

            // Set post_id in project record.
            {
                projectRecord.set("forum_post_id", postId);
                $app.save(projectRecord);
            }
        }
    },

    notify_withdraw: (projectRecord) => {
        const name = projectRecord.get("name");
        const version = projectRecord.get("version");
        if (ENABLE_PUSHOVER) {
            pushover.send(`Withdrawn: ${name}-${version}`, `A pending project has been withdrawn.`);
        }

        // Create/Update a forum post
        if (ENABLE_DISCOURSE) {
            let postContent = createPost(projectRecord, "(Aborted)");
            let postId = projectRecord.get("forum_post_id");

            // Update latest post
            discourse.editPost(postId, postContent);

            // Get topic id
            const record = $app.findFirstRecordByData("forum_topics", "project_name", name)
            let topicId = record.get("topic_id");
        
            // Create new post in topic
            (async()=>{})().then(()=>{
                const postUrl = discourse.getPostUrlById(postId);
                discourse.createPost(topicId,
                    `#### :satellite:  [${version}](${postUrl}) Landing Aborted!  :satellite:`
                );
            });

            // Remove post_id in project record.
            {
                projectRecord.set("forum_post_id", null);
                projectRecord.set("approval_post_id", null);
                $app.save(projectRecord);
            }
        }
    },

    notify_approve: (projectRecord, approver) => {
        const name = projectRecord.get("name");
        const version = projectRecord.get("version");
        if (ENABLE_PUSHOVER) {
            pushover.send(`Approved: ${name}-${version}`, `A project has been approved by ${approver}.`);
        }

        // Create/Update a forum post
        if (ENABLE_DISCOURSE) {
            let postContent = createPost(projectRecord, "(Request Approved)");
            let postId = projectRecord.get("forum_post_id");

            // Update latest post
            discourse.editPost(postId, postContent);

            // Get topic id
            const record = $app.findFirstRecordByData("forum_topics", "project_name", name)
            let topicId = record.get("topic_id");
        
            // Create new post in topic
            (async()=>{})().then(()=>{
                const postUrl = discourse.getPostUrlById(postId);
                let approval_post_id = discourse.createPost(topicId,
                    `#### :satellite:  [${version}](${postUrl}) Landing request approved. Proceed with caution...  :satellite:`
                );
                projectRecord.set("approval_post_id", approval_post_id);
                $app.save(projectRecord);
            });
        }
    },

    notify_reject: (projectRecord, rejecter) => {
        const name = projectRecord.get("name");
        const version = projectRecord.get("version");
        if (ENABLE_PUSHOVER) {
            pushover.send(`Rejected: ${name}-${version}`, `A project has been rejected by ${rejecter}.`);
        }

        // Create/Update a forum post
        if (ENABLE_DISCOURSE) {
            let postContent = createPost(projectRecord, "(Request Denied)");
            let postId = projectRecord.get("forum_post_id");

            // Update latest post
            discourse.editPost(postId, postContent);

            // Get topic id
            const record = $app.findFirstRecordByData("forum_topics", "project_name", name)
            let topicId = record.get("topic_id");
        
            // Create new post in topic
            (async()=>{})().then(()=>{
                const postUrl = discourse.getPostUrlById(postId);
                discourse.createPost(topicId,
                    `#### :satellite:  [${version}](${postUrl}) Landing request denied. Maintain a safe distance.  :satellite:`
                );
            });

            // Remove post_id in project record.
            {
                projectRecord.set("forum_post_id", null);
                $app.save(projectRecord);
            }
        }
    },
    
    notify_release: (projectRecord) => {
        const name = projectRecord.get("name");
        const version = projectRecord.get("version");
        if (ENABLE_PUSHOVER) {
            pushover.send(`Released: ${name}-${version}`, `A new project has been released!`);
        }

        // Create/Update a forum post
        if (ENABLE_DISCOURSE) {
            let postContent = createPost(projectRecord, "(Touchdown Confirmed)");
            let postId = projectRecord.get("forum_post_id");

            // Get topic id
            const record = $app.findFirstRecordByData("forum_topics", "project_name", name)
            let topicId = record.get("topic_id");

            // Update submission post
            discourse.editPost(postId, postContent);

            // Create new post in topic
            (async()=>{})().then(()=>{
                const postUrl = discourse.getPostUrlById(postId);
                discourse.createPost(topicId,
                    `#### :satellite:  [${version}](${postUrl}) Touchdown confirmed.  :satellite:`
                );
            });

            // Remove post_id in project record.
            {
                projectRecord.set("forum_post_id", null);
                $app.save(projectRecord);
            }
        }
    }
}
