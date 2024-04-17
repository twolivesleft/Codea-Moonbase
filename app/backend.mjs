import fs from 'fs';
import AdmZip from 'adm-zip';
import forum from './discourse.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.HOST;

function WriteManifest(name, manifest) {
	fs.writeFileSync(__dirname + `/repo/manifest-${name}.json`, JSON.stringify(manifest, null, 2));
}

function ReadManifest(name) {
	return JSON.parse(fs.readFileSync( __dirname + `/repo/manifest-${name}.json`, 'utf8'));
}

function StringIsAscii(str) {
	return [...str].every((char) => char.codePointAt() <= 127);
}

function IsValidMetadata(metadata) {
	// Check all required data is included in the metadata

	// Name
	// Short Description
	// Long Description
	// Version
	// Authors
	// Icon
	// Category
	// Platforms
	// Zip name
	// Update notes

	const required = [
		"name",
		"description_short",
		"description_long",
		"version",
		"authors",
		"icon",
		"category",
		"platform",
		"zip_name",
		"update_notes"
	];

	// Check property presence
	for (const id of required) {
		if (metadata[id] === undefined) {
			return [ false, `${id} missing.` ];
		}
	}

	// Check additional requirements
	if (metadata.name > 32) {
		return [ false, `name must be <32 characters.` ];
	}

	if (!StringIsAscii(metadata.name)) {
		return [ false, `name must contain ascii characters only.` ];
	}

	if (!StringIsAscii(metadata.version)) {
		return [ false, `version must contain ascii characters only.` ];
	}

	if (metadata.description_short > 40) {
		return [ false, `description_short must be <40 characters.` ];
	}

	return [true, ""];
}

function IsExistingVersion(metadata) {
	// Check metadata version against versions in the public manifest.
	const manifest = ReadManifest("public");

	// Check if this project actually already exists
	if (manifest[metadata.name] === undefined) {
		return false;
	}

	// Check for this specific version
	return manifest[metadata.name].versions.some((v)=>{
		return v.id == metadata.version;
	});
}

function IsExistingSubmission(metadata) {
	// Check metadata version against versions in the review manifest.
	const manifest = ReadManifest("review");

	// Check if this project actually already exists
	if (manifest[metadata.name] === undefined) {
		return false;
	}

	// Check for this specific version
	return manifest[metadata.name].versions.some((v)=>{
		return v.id == metadata.version;
	});
}

async function GetAuthorMessage(authors) {
	var author_msg = null;
	if (authors.length == 1) {
		author_msg = "Pilot:\n";
	} else {
		author_msg = "Crew:\n";
	}
	for (const username of authors) {
		const info = await forum.GetUserInfoByName(username);
		author_msg += (info.user === undefined) ? `${username}\n` : `@${username}\n`;
	}
	return author_msg;
}

async function OnSubmit(metadata) {
	console.log("OnSubmit -> " + JSON.stringify(metadata));

	// Add the project to the repo and add it to the review manifest.
	// Don't add it to the public manifest.

	// Replace unicode quotes in the project title. 
	metadata.name
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"');

	var topicId = null;
	var postId = null;

	// Get an existing topicId from a manifest.
	const pub_manifest = ReadManifest("public");
	const rev_manifest = ReadManifest("review");
	// Public manifest
	if (pub_manifest[metadata.name] !== undefined) {
		topicId = pub_manifest[metadata.name].topicId;
	}
	// Review manifest
	if (topicId === null && rev_manifest[metadata.name] !== undefined) {
		topicId = rev_manifest[metadata.name].topicId;
	}

	// Random landing pad number. Fun!
	const pad_number = Math.floor(Math.random() * 10) + 1;

	// Zip file path
	const zip_path = encodeURIComponent(`${metadata.name}/${metadata.version}/project.zip`);

	// Author(s) message
	const author_msg = await GetAuthorMessage(metadata.authors);

	// Generate forum post content
	const icon_path = encodeURIComponent(`${metadata.name}/${metadata.version}/${metadata.icon.replace(/.*?\.codea\//, "")}`);
	var postContent = 
`## Landing Request (Version: ${metadata.version})

![](https://${HOST}/${icon_path})
---
### Course Corrections (Update notes):
${metadata.update_notes}

### Callsign (Short desc.):
${metadata.description_short}

### Ship Manifest (Long desc.):
${metadata.description_long}

### ${author_msg}

### Cargo (Category & platform):
${metadata.category} for ${metadata.platform}.

[Download Zip](https://${HOST}/${zip_path})

---
:satellite: Approach pad #${pad_number} and await further instruction. :satellite:`;

	if (IsExistingSubmission(metadata)) {	
		console.log("Revise existing approval request post.");

		const version = rev_manifest[metadata.name].versions.find((v)=>{
			return v.id == metadata.version;
		});

		// Increment revision number & append to post
		version.revision++;
		postContent += `\n\n---\nrevision #${version.revision}`
		forum.EditPost(version.postId, postContent);

		// Write manifest changes to disk
		WriteManifest("review", rev_manifest);
		
	} else {
		console.log("Create approval request post.")

		// Create a new forum topic
		if (topicId === null) {
			console.log("Create new topic.");
			[topicId, postId] = await forum.CreateTopic(`${metadata.name} (Project Thread)`, postContent);
			// Add topic id to manifest
		} else {
			postId = await forum.CreatePost(topicId, postContent);
		}
		// console.log(`${topicId}, ${postId}`);

		// Add new manifest entry
		if (rev_manifest[metadata.name] === undefined) {
			console.log("New review manifest entry");
			rev_manifest[metadata.name] = {
				topicId: topicId,
				versions: []
			}
		}

		// Add version, postId & revision to manifest
		rev_manifest[metadata.name].versions.push({
			id: metadata.version
			postId: postId,
			revision: 1
		});
		
		// Save review manifest
		// console.log("Updated manifest -> " + JSON.stringify(rev_manifest, null, 2));
		WriteManifest("review", rev_manifest);
	}
	
	// Move the submission files
	let project_path = `${__dirname}/repo/${metadata.name}/${metadata.version}`;
	let zip_upload_path = `${__dirname}/repo/uploads/${metadata.zip_name}`;
	fs.mkdirSync(project_path, { recursive: true });
	fs.copyFileSync(zip_upload_path, project_path + "/project.zip");
	// Adjust metadata
	metadata.metadata_url = undefined; // clear
	metadata.zip_name = undefined; // clear
	metadata.forum_link = `https://talk.codea.io/t/${topicId}`;
	// Write metadata to file
	fs.writeFileSync(project_path + "/metadata.json", JSON.stringify(metadata, null, 2));
	// Extract the new icon
	var zip = new AdmZip(project_path + "/project.zip");
	zip.extractEntryTo(metadata.icon, `${__dirname}/repo/${metadata.name}/${metadata.version}`, false, true);
	// Remove original uploaded zip file
	fs.rmSync(zip_upload_path);
}

function OnApprove(manifest_entry, name, version) {
	console.log(`Approving: ${name} - ${version}`);

	let project_path = `${__dirname}/repo/${name}/${version}`;

	// Update metadata timestamp
	let metadata = JSON.parse(fs.readFileSync(project_path + "/metadata.json", 'utf-8'));
	metadata.timestamp = 0; //  Math.floor(Date.now() / 1000);
	fs.writeFileSync(project_path + "/metadata.json", JSON.stringify(metadata, null, 2));

	// Update the project's icon link
	const icon_name = metadata.icon.match(/[^\\/]+$/)[0];
	fs.rmSync(`${__dirname}/repo/${name}/${icon_name}`, {force:true});
	fs.symlinkSync(`${project_path}/${icon_name}`, `${__dirname}/repo/${name}/${icon_name}`);

	// Move the manifest entry from review to public.
	let rev_manifest = ReadManifest("review");
	let pub_manifest = ReadManifest("public");

	// New project in public manifest
	if (pub_manifest[name] === undefined) {
		pub_manifest[name] = {
			topicId: manifest_entry.topicId,
			versions: []
		};
	}

	const versionEntry = rev_manifest[name].versions.find((v)=>{
		return v.id == version;
	});
	versionEntry.revision = undefined;
	
	// Move from review -> public
	pub_manifest[name].versions.push(versionEntry);
	// Remove from review manifest (if no other versions in review)
	rev_manifest[name].versions = rev_manifest[name].versions.filter((v)=>{
		return v.id != version
	});
	if (rev_manifest[name].versions.length == 0) {
		rev_manifest[name] = undefined;
	}
	WriteManifest("public", pub_manifest);
	WriteManifest("review", rev_manifest);

	const topicId = manifest_entry.topicId;
	forum.CreatePost(topicId, `:satellite: Version ${version} touchdown confirmed. :satellite:`);
}

function OnReject(metadata) {
	// Delete the project from the server.
}

async function OnWebhook(payload) {
	// Received a 'like' webhook call
	if (payload.like !== undefined) {
		// console.log("Handle 'like'");

		const rev_manifest = ReadManifest("review");

		var project_name = null;
		var version = null;

		// Check that this is an approval request post.
		var isValidPost = false;
		for (const projectId in rev_manifest) {
			const entry = rev_manifest[projectId];
			if (entry.topicId == payload.like.post.topic_id) {
				// Check the postId
				for (const versionEntry in entry.versions) {
					if (versionEntry.postId == payload.like.post.id) {
						project_name = projectId;
						version = versionEntry.id;
						isValidPost = true;
						break;
					} 
				}
				break;
			}
		}
		if (!isValidPost) {
			console.log("Invalid post");
			return;
		}

		// Check if the user is a moonbase admin
		var isAdmin = false;
		const userInfo = await forum.GetUserInfo(payload.like.user.id);
		if (userInfo.groups.length > 0) {
			for (const group of userInfo.groups) {
				if (group.name == "moonbase_admin") {
					isAdmin = true;
					break;
				}
			} 
		}
		if (!isAdmin) {
			console.log("Not admin");
			return;
		}

		// Check the reaction added by the user.
		const reaction_users = await forum.GetReactionUsers(payload.like.post.id);
		for (const reaction of reaction_users) {
			if (reaction.id == "rocket") {
				for (const user of reaction.users) {
					if (user.username == payload.like.user.username) {
						// A moonbase_admin user added a 'rocket' emoji. Approve!
						OnApprove(rev_manifest[project_name], project_name, version);
						return;
					}
				}
			}
		}
		console.log("Incorrect emoji.");
	}
}

export default {
	IsValidMetadata: IsValidMetadata,
	IsExistingVersion: IsExistingVersion,
	IsExistingSubmission: IsExistingSubmission,
	OnSubmit: OnSubmit,
	OnApprove: OnApprove,
	OnReject: OnReject,
	OnWebhook: OnWebhook
};
