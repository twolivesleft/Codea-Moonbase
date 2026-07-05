/// <reference path="../../pb_data/types.d.ts" />

// API Key (Docker secret)
const DISCOURSE_KEY = $os.getenv("DISCOURSE_API_KEY");
const DISCOURSE_USERNAME = $os.getenv("DISCOURSE_USERNAME");

const FORUM_HOST = "talk.codea.io";
const MOONBASE_CATEGORY_ID = 20;

// Admin group values
const MOONBASE_ADMIN_GROUP_ID = 41;
const MOONBASE_ADMIN_GROUP_NAME = "moonbase_admin";

function createTopic(name, content) {
    // $app.logger().info(name);
    const res = $http.send({
        url:    `https://${FORUM_HOST}/posts.json`,
        method: "post",
        body: JSON.stringify({
            title: name,
            raw: content,
            category: MOONBASE_CATEGORY_ID
        }),
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME,
            "Content-Type": "application/json"
        }
    });
    // $app.logger().info(JSON.stringify(res));
    return [res.json.topic_id, res.json.id];
}

function createPost(topicId, content) {
    const res = $http.send({
        url:    `https://${FORUM_HOST}/posts.json`,
        method: "post",
        body: JSON.stringify({
            raw: content,
            topic_id: topicId
        }),
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME,
            "Content-Type": "application/json"
        }
    });
    return res.json.id;
}

function editPost(postId, content) {
    const res = $http.send({
        url:    `https://${FORUM_HOST}/posts/${postId}.json`,
        method: "put",
        body: JSON.stringify({
            post: {
                raw: content,
                edit_reason: "Submission Revised."
            }
        }),
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME,
            "Content-Type": "application/json"
        }
    });
    return res.json.id;
}

function getUserInfo(userId) {
    const res = $http.send({
        url:    `https://${FORUM_HOST}/admin/users/${userId}.json`,
        method: "get",
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME
        }
    });
    return res.json;
}

function uploadFileFromPath(path) {
    const formData = new FormData();
    formData.append("type", "composer");
    formData.append("synchronous", true);
    formData.append("file", $filesystem.fileFromPath(path));

    const res = $http.send({
        url:    `https://${FORUM_HOST}/uploads.json`,
        method: "POST",
        body: formData,
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME
        }
    });
    return res.json;
}

function uploadFileFromUrl(url) {
    const formData = new FormData();
    formData.append("type", "composer");
    formData.append("synchronous", true);
    formData.append("file", $filesystem.fileFromURL(url));

    const res = $http.send({
        url:    `https://${FORUM_HOST}/uploads.json`,
        method: "POST",
        body: formData,
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME
        }
    });
    return res.json;
}

function userExists(username) {
    const res = $http.send({
        url:    `https://${FORUM_HOST}/u/${username}.json`,
        method: "GET"
    });
    return res.statusCode == 200;
}

function getUserReactions(postId) {
    const res = $http.send({
        url:    `https://${FORUM_HOST}/discourse-reactions/posts/${postId}/reactions-users.json`,
        method: "GET",
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME
        }
    });
    return res.json.reaction_users;
}

function getApproverUsernames() {
    const res = $http.send({
        url:    `https://${FORUM_HOST}/groups/${MOONBASE_ADMIN_GROUP_NAME}/members.json`,
        method: "GET",
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME
        }
    });
    return res.json.members.map((m)=>m.username);
}

function getPostUrlById(postId) {
    const res = $http.send({
        url: `https://talk.codea.io/posts/${postId}`,
        method: "GET",
        headers: {
            "Api-Key": DISCOURSE_KEY,
            "Api-Username": DISCOURSE_USERNAME
        }
    });
    const post = res.json;
    return `https://${FORUM_HOST}/t/${post.topic_slug}/${post.topic_id}/${post.post_number}`;
}

module.exports = {
    // Functions
    createTopic,
    createPost,
    editPost,

    getUserReactions,

    uploadFileFromPath,
    uploadFileFromUrl,

    getUserInfo,
    userExists,

    getPostUrlById,

    // Moonbase helpers
    getApproverUsernames,

    // Constants
    ADMIN_GROUP_ID: MOONBASE_ADMIN_GROUP_ID
}
