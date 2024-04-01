const express = require('express');
const fs = require("fs");
const http = require('http');
const https = require('https');
const AdmZip = require("adm-zip");
const serveIndex = require('serve-index');
const subProcess = require('child_process')
const multer = require('multer');

const PUSHOVER_APP_KEY = process.env.CCR_PUSHOVER_APP_KEY;
const PUSHOVER_GROUP_KEY = process.env.CCR_PUSHOVER_GROUP_KEY;
const ADMIN_KEY = process.env.CCR_ADMIN_KEY;
const DISCOURSE_KEY = process.env.CCR_DISCOURSE_API_KEY;

const VAPID_PUB_KEY = process.env.VAPID_PUB_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

var app = express();
const upload = multer({ dest: `${__dirname}/repo/uploads/` });

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.post('/api/upload', upload.single('file'), function(req,res){
	if (req.file) {
		res.send({
			filename: req.file.filename
		});
	} else {
		res.status(500).end("Upload Failed.");
	}
});

// Queue a submission
app.post('/api/submit', function(req, res) 
{
	console.log(req.body);
	const reserved = [];

	if (req.body.name === undefined) {
		res.status(400).end("No project name provided!");
		return;
	} else if (reserved.includes(req.body.name) && req.body.key !== ADMIN_KEY){
		res.status(400).end("Reserved project name!");
		return;
	}
	
	if (req.body.version === undefined) {
		res.status(400).end("No project version provided!");
		return;
	}
	
	if (req.body.zip_url === undefined) {
		res.status(400).end("No project zip url provided!");
		return;
	}
	
	if (req.body.metadata_url === undefined) {
		res.status(400).end("No project metadata url provided!");
		return;
	}
	
	if (req.body.short_description === undefined) {
		res.status(400).end("No short description provided!");
		return;
	} else if (req.body.short_description.length > 40) {
		res.status(400).end("Short description is too long! (>40 chars)");
		return;
	}
	
	if (req.body.description === undefined) {
		res.status(400).end("No description provided!");
		return;
	}
	
	if (req.body.authors === undefined) {
		res.status(400).end("No authors provided!");
		return;
	}
	
	if (req.body.icon === undefined) {
		res.status(400).end("No icon provided!");
		return;
	}
	
	if (req.body.category === undefined) {
		res.status(400).end("No category provided!");
		return;
	}
	
	let name = req.body.name;
	let version = req.body.version;
	let zip_url = req.body.zip_url;
	let metadata_url = req.body.metadata_url;

	let Q = JSON.parse(fs.readFileSync( __dirname + "/repo/review_queue.json", 'utf8'));
	Q.push({
		name: req.body.name,
		version: req.body.version,
		zip_url: req.body.zip_url,
		metadata_url: req.body.metadata_url
	});
	fs.writeFileSync(__dirname + "/repo/review_queue.json", JSON.stringify(Q, null, 2));
	res.end();

	pushover("New Submission: " + req.body.name + " - " + req.body.version, req.body.authors + '\n' + req.body.update_notes)
})

// Approve a submission
app.post('/api/approve', function(req, res) {
	if (req.body.key == ADMIN_KEY) {
		let Q = JSON.parse(fs.readFileSync( __dirname + "/repo/review_queue.json", 'utf8'));
		Q.forEach((v, i, a) => {
			if (v.name == req.body.name && v.version == req.body.version) {
				let projectPath = `${__dirname}/repo/${v.name}/${v.version}`;
				let zipPath = `${__dirname}/repo/uploads/${req.body.zip_url}`;
				let metadataPath = `${__dirname}/repo/uploads/${req.body.metadata_url}`;

				// Move the project to the correct folder
				fs.mkdirSync(projectPath, { recursive: true });
				fs.copyFileSync(zipPath, projectPath + "/project.zip");

				// Update the 'webrepo_latest.zip' symlink
				if (v.name === 'WebRepo') {
					fs.rmSync(`${__dirname}/repo/webrepo_latest.zip`);
					fs.symlinkSync(projectPath + "/project.zip", `${__dirname}/repo/webrepo_latest.zip`);
				}

				// Move metadata file
				fs.copyFileSync(metadataPath, projectPath + "/metadata.json");
				
				// Add timestamp to metadata
				console.log(fs.readFileSync(projectPath + "/metadata.json", 'utf-8'));
				let md = JSON.parse(fs.readFileSync(projectPath + "/metadata.json", 'utf-8'));
				md.timestamp = Math.floor(Date.now() / 1000);
				if (req.body.forumNotification == false)
				{
					md.timestamp = 1; // Old timestamp
				}
				fs.writeFileSync(projectPath + "/metadata.json", JSON.stringify(md, null, 2));

				// Extract the new icon
				var zip = new AdmZip(projectPath + "/project.zip");
				zip.extractEntryTo(md.icon, `${__dirname}/repo/${v.name}`, false, true);

				// Extract docs
				//zip.extractEntryTo("docs.html", projectPath + "/docs.html", false, true);

				// Add project to repo manifest
				let manifest = JSON.parse(fs.readFileSync(`${__dirname}/repo/manifest.json`, 'utf-8'));
				if (manifest[v.name] == undefined) {
					manifest[v.name] = [];
				}
				manifest[v.name].push(v.version);
				fs.writeFileSync(`${__dirname}/repo/manifest.json`, JSON.stringify(manifest, null, 2));
			
				// Remove the project from the review queue
				Q.splice(i, 1);
				fs.writeFileSync(__dirname + "/repo/review_queue.json", JSON.stringify(Q, null, 2));

				// Remove uploaded files
				fs.rmSync(zipPath);
				fs.rmSync(metadataPath);

				// Notifications
				pushover("Project Approved", v.name + " - " + v.version);
				if (req.body.forumNotification == true)
				{
					let authorsStr = "";
					for (const author of md.authors) {
						authorsStr += " @" + author.trim();
					}
					let name = encodeURIComponent(v.name);
					forum(
`## [${md.name} - ${v.version}](https://codeawebrepo.co.uk/${name}/${v.version}/project.zip) is now available.
Description: ${md.short_description}
Author(s):${authorsStr}

![](https://codeawebrepo.co.uk/${name}/${md.icon.replace(/.*?\.codea\//, "")})
### Description:
${md.description}

### Change-notes:
${md.update_notes}
---
[Latest WebRepo project](https://codeawebrepo.co.uk/webrepo_latest.zip)`
					);
				}
			}
		});
	} else {
		pushover("Failed Authorisation!", "/approve");
	}
	res.end();
})

// Reject a submission
app.post('/api/reject', function(req, res) {
	if (req.body.key == ADMIN_KEY) {
		let Q = JSON.parse(fs.readFileSync( __dirname + "/repo/review_queue.json", 'utf8'));
		Q.forEach((v, i, a) => {
			if (v.name == req.body.name && v.version == req.body.version) {
				Q.splice(i, 1);
				fs.writeFileSync(__dirname + "/repo/review_queue.json", JSON.stringify(Q, null, 2));

				// Remove uploads
				let zipPath = `${__dirname}/repo/uploads/${req.body.zip_url}`;
				let metadataPath = `${__dirname}/repo/uploads/${req.body.metadata_url}`;
				fs.rmSync(zipPath);
				fs.rmSync(metadataPath);
				
				pushover("Project Rejected", v.name + " - " + v.version);
			}
		});
	} else {
		pushover("Failed Authorisation!", "/reject");
	}
	res.end();
})

app.post('/api/crash', function(req, res) {
	const projectName = req.body.project
	const projectVersion = req.body.version
	const crashDate = req.body.date

	const reportDir = `${__dirname}/repo/crashreports/${projectName}/${projectVersion}/${crashDate}/`
	fs.mkdirSync(reportDir, { recursive: true });

	// Move uploaded files
	let uploadPath = `${__dirname}/repo/uploads/${req.body.report}`;
	fs.copyFileSync(uploadPath, reportDir + "report.json");
	fs.rmSync(uploadPath);
	
	let uploadTracePath = `${__dirname}/repo/uploads/${req.body.trace}`;
	fs.copyFileSync(uploadTracePath, reportDir + "trace.txt");
	fs.rmSync(uploadTracePath);
	
	var reportURL = `https://codeawebrepo.co.uk/crashreports/${projectName}/${projectVersion}/${crashDate}`
	reportURL = encodeURI(reportURL)

	// Send an alert
	pushover(`Crash Report - ${projectName}`, `Reporter: ${req.body.reporter}\nNotes: ${req.body.notes}\nReport: ${reportURL}`);

	// Ideas:
	// - Send a crash notification to the project creator/project's forum discussion (if unmodified).
	// - Track stability of project version in its metadata file.
	// - Identify crash patterns and group them.
	// - Serve a custom crash browser frontend in html.
	
	// Check 
	res.end();
})

function customCacheControl(res, path) {
	res.setHeader('Cache-Control', 'no-cache');
}

app.use('/', express.static('repo', {
		'lastModified': false
	}), serveIndex(__dirname + '/repo', { 'icons': true }));

http.createServer(app).listen(80);

// Sends a notification
function pushover(title, message = 'N/A') {
    let payload = JSON.stringify({
        "token": PUSHOVER_APP_KEY,
        "user": PUSHOVER_GROUP_KEY,
        "title": title,
        "message": message
    });

    let options = {
    	host: 'api.pushover.net',
    	path: '/1/messages.json',
    	port: 443,
    	method: 'POST',
    	headers: {
    		'Content-Type': 'application/json',
    		'Content-Length': payload.length
    	}
    };

    var post_req = https.request(options);
    post_req.write(payload);
    post_req.end();
}

function forum(message) {
	let payload = JSON.stringify({
        'raw': message,
        'topic_id': '14050'
    });

    const curlProcess = subProcess.spawn('curl', [
    	'-vvv',
    	'-d', `${payload}`,
    	'-H', 'Content-Type: application/json',
    	'-H', `Api-Key: ${DISCOURSE_KEY}`,
    	'-H', 'Api-Username: WebRepo-Automation',
    	'https://talk.codea.io/posts.json'
    ]);
}
