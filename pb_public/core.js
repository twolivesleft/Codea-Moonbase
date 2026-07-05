const URL_BASE = "https://moonbase.codeawebrepo.co.uk"
let ConnectedToCodea = false;

class Codea {

	#nextCallId = 0;
	#pendingCalls = new Object();

	constructor() {
		ConnectedToCodea = this.isConnected();
	}

	isConnected() {
		if (window.webkit != undefined) {
			if (window.webkit.messageHandlers != undefined) {
				if (window.webkit.messageHandlers.codea != undefined) {
					return true;
				}
			}
		}
		return false;
	}

	call(fnName, ...args) {
		const id = this.#nextCallId++;
	
		// Initiate call
		const argArr = [...args];
		window.webkit.messageHandlers.codea.postMessage({
			"fn": fnName,
			"args": argArr,
			"nArgs": argArr.length,
			"id": id
	    });

		// Return result promise
	    return new Promise((resolve)=>{
	    	this.#pendingCalls[id] = resolve;
	    });
	}

	resolveCall(id, results) {
		const r = new Array();
		for (var i = 0; i < results.n; ++i) {
			r.push(results[i]);
			print("res", results[i]);
		}
		this.#pendingCalls[id](r);
	}
}

{ // Setup 2 proxies to make the Codea interface easy to use.
	const codea = new Codea();

	const ProxyVal = (value, key)=>{
		return new Proxy(value, {
			memoise: {},
			apply: function (target, thisArg, argumentsList) {
				return target(...argumentsList);
			},
			get (target, prop) {

				// print(`${key}.${prop}`);
			
				// Already memoised?
				if (prop in this.memoise) {
					return this.memoise[prop];
				}
	
				// Generate a new Codea call
				const completeKey = `${key}.${prop}`;
				let fn = ProxyVal(codea.call.bind(codea, completeKey), completeKey);
	
				// Memoise & return
				this.memoise[prop] = fn
				return fn;
			}
		});
	};
	
	window.codea = new Proxy(codea, {
		memoise: {},
		get (obj, prop, receiver) {
		
			// Already memoised?
			if (prop in this.memoise) {
				return this.memoise[prop];
			}

			// Get the value or generate a Codea call
			let value = obj[prop];
			let fn = null;
			if (value instanceof Function) {
				fn = value.bind(obj);
			} else {
				fn = ProxyVal(obj.call.bind(obj, prop), prop);
			}

			// Memoise & return
			this.memoise[prop] = fn
			return fn;
		}
	});
}
// Make global print() function
window.print = codea.print;
window.warn = codea.warn;

async function FetchJSON(path) {
	const response = await fetch(`${URL_BASE}${path}`);
	const text = await response.text();
	// fs.saveText(path, text); // Cache result
	return JSON.parse(text);
}

function FetchManifest() {
	const path = `/v1/public/manifest.json`;
	return FetchJSON(path); // Always attempt an update
}

function FetchMetadata(id) {
	const path = `/v1/assets/${id}/metadata.json`;
	return FetchJSON(path); // Metadata should not change
}

function GetProjectAssetURL(projectId, assetId) {
	return `${URL_BASE}/v1/assets/${projectId}/${assetId}`;
}

async function InstallProject(project, button) {
	if (ConnectedToCodea) {
		// Communicate with Codea to install the project
		print(`Installing ${project.name}-${project.version}`);

		button.innerText = "Downloading";

		// Write zip to tmpfile initially.
		const [zipPath] = await codea.os.tmpname();
		let zipFile = await codea.io.open(zipPath, 'wb'	);

		// Initiate download
		const zipUrl = GetProjectAssetURL(project.id, project.zip);
		fetch(zipUrl)
		.then((response)=>{
			const reader = response.body.getReader();
			
			reader.read().then(async function process({ done, value }) {
				if (done) {
					print("Download complete");

					codea.io.close(zipFile);
					button.innerText = "Installing";
					await codea.webrepo.install(zipPath, name, version);
					button.innerText = "Installed";
					return;
				}
				
				const arr = Array.from(value);
				codea.io.write(zipFile, arr);

				return reader.read().then(process);
			});
		});
				
	} else {
		// Initiate download
		const anchor = document.createElement("a");
		anchor.href = GetProjectAssetURL(project.id, project.zip);
		anchor.download = `${project.name}-${project.version}.zip`;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
	}
}

function OpenAppInfo(meta) {
	window.location.href = `./app.html?name=${encodeURIComponent(meta.repoName)}`;
}

function OpenExternalURL(url) {
	if (ConnectedToCodea) {
		// TODO: Send message to Codea to use `openURL()` instead
		window.location.href = url;
	} else {
		window.location.href = url;
	}
}

// Called from Codea when the project
// is closed or restarted.
function willClose() {
	if (fs !== undefined) fs.close();
}
