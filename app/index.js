import express from 'express';
import fs from 'fs';
import http from 'http';
import serveIndex from 'serve-index';
import multer from 'multer';
import backend from "./backend.mjs";
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_FILESIZE = process.env.MAX_FILESIZE;
const WEBHOOK_SECRET = process.env.DISCOURSE_WEBHOOK_SECRET;

var app = express();
const upload = multer({
	dest: `${__dirname}/repo/uploads/`,
	limits: {
		fileSize: MAX_FILESIZE
	}
});

// Calculates the signature of the received payload
// and compares it to the signature header.
// If they differ, the webhook call did not come from
// our Discourse server.
function VerifyWebhookSignature(req) {
	const signature = req.get("X-Discourse-Event-Signature");
	const text = req.body;
	const key = WEBHOOK_SECRET || "";
	// Compare signatures
	return signature == ("sha256=" + crypto.createHmac('sha256', key).update(text).digest('hex'));
}

app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// TODO: Add basic logging middleware to track API calls.

// File upload API
app.post('/api/upload', upload.single('file'), function(req,res){
	if (req.file) {
		res.send({
			filename: req.file.filename
		});
	} else {
		res.status(500).end("Upload Failed.");
	}
});

app.post('/api/webhook',
	express.text({type:"application/json"}),
	function(req, res) {
		// Verify signature
		if (!VerifyWebhookSignature(req)) {
			console.log("Invalid webhook signature. Someone it trying it on.");
			res.end(); // Ignore
			return;
		}
	
		req.body = JSON.parse(req.body);
		// console.log("/api/webhook -> " + JSON.stringify(req.body, null, 2));
		backend.OnWebhook(req.body);
		res.end();
	}
);

// Submission API
// WARNING: name & version must not contain non-ascii characters. 
app.post('/api/submit', express.json(), function(req, res) {
	//console.log(req.body.metadata);

	const metadata = req.body.metadata;

	// Check metadata validity
	const [valid, err] = backend.IsValidMetadata(metadata);
	if (!valid) {
		res.status(400).end(err); return;
	}

	// Check this is not already an approved version
	if (backend.IsExistingVersion(metadata)) {
		// Delete uploaded zip
		fs.rmSync(`${__dirname}/repo/uploads/${metadata.zip_name}`);
		res.status(400).end("version already exists"); return;
	}

	backend.OnSubmit(metadata);
	res.end();
})

app.use('/', express.static('repo', {
	'lastModified': false
}), serveIndex(__dirname + '/repo', { 'icons': true }));

http.createServer(app).listen(80);
