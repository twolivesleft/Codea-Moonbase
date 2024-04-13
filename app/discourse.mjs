import https from 'https';
import utf2html from './utf2html.mjs';

// API Key (Docker secret)
const DISCOURSE_KEY = process.env.DISCOURSE_API_KEY;
const DISCOURSE_USERNAME = process.env.DISCOURSE_USERNAME;
const FORUM_HOST = "talk.codea.io";
const MOONBASE_CATEGORY_ID = 20;

var last_api_call_time = +new Date();
async function APICall(method, path, payload, rateLimit) {

	const hasPayload = (payload !== undefined && payload !== null);

	// console.log(`Call ${path} (${method}):\n${payload}`);

	// Rate limit certain api calls (posts)
	if (rateLimit === true) {
		while (true) {
			const now = +new Date();
			if (now - last_api_call_time > 5000) {
				last_api_call_time = now;
				break;
			} else {
				// Wait for next oportunity
				await new Promise(r => setTimeout(r, 5000 - (now - last_api_call_time)));
			}
		}
	}

	var options = {
		hostname: FORUM_HOST,
		port: 443,
		path: path,
		method: method,
		headers: {
			"Api-Key": DISCOURSE_KEY,
			"Api-Username": DISCOURSE_USERNAME
		}
	};

	if (hasPayload) {
		options.headers["Content-Type"] = "application/json";
		options.headers["Content-Length"] = payload.length;
	}

	return await new Promise((resolve, reject) => {	
		var req = https.request(options, (res) => {
			// console.log('statusCode:', res.statusCode);
			// console.log('headers:', res.headers);
		
			const body = [];
			res.on('data', (chunk) => body.push(chunk));
			res.on('end', () => {
				resolve(Buffer.concat(body).toString());
			})
		});
		
		req.on('error', (e) => {
			console.error(e);
		});

		if (hasPayload) {
			req.write(payload);
		}
		req.end();
	});
}

async function CreateTopic(name, content) {
	const res = await APICall("POST", "/posts.json", JSON.stringify({
		title: utf2html(name),
		raw: utf2html(content),
		category: MOONBASE_CATEGORY_ID // Moonbase category
	}), true); // rate limit post actions
	// console.log("CreateTopic -> " + res);
	const response = JSON.parse(res);
	return [response.topic_id, response.id];
}

async function CreatePost(topicId, content) {
	const res = await APICall("POST", "/posts.json", JSON.stringify({
		raw: utf2html(content),
		topic_id: topicId
	}), true); // Rate limit post actions
	// console.log("CreatePost -> " + res);
	return JSON.parse(res).id;
}

async function EditPost(postId, content) {
	const res = await APICall("PUT", `/posts/${postId}.json`, JSON.stringify({
		post: {
			raw: utf2html(content),
			edit_reason: "Submission revised."
		}
	}), true); // Rate limit post actions
	// console.log("EditPost -> " + res);
	return JSON.parse(res).id;
}

async function GetUserInfo(userId) {
	const res = await APICall("GET", `/admin/users/${userId}.json`, null, false);
	// console.log("GetUserInfo -> " + res);
	return JSON.parse(res);
}

async function GetUserInfoByName(username) {
	const res = await APICall("GET", `/u/${username}.json`, null, false);
	// console.log("GetUserInfoByName -> " + res);
	return JSON.parse(res);
}

async function GetReactionUsers(postId) {
	const res = await APICall("GET", `/discourse-reactions/posts/${postId}/reactions-users.json`, null, false);
	// console.log("GetReactionUsers -> " + res);
	return JSON.parse(res).reaction_users;
}

export default {
	CreateTopic: CreateTopic,
	CreatePost: CreatePost,
	EditPost: EditPost,
	GetUserInfo: GetUserInfo,
	GetUserInfoByName: GetUserInfoByName,
	GetReactionUsers: GetReactionUsers
};
