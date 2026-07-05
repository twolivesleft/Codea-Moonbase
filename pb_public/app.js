const _ENV = {
	DOM_content: document.getElementById("content"),
	DOM_header: document.getElementById("header")
};

if (ConnectedToCodea) {
	const back = document.createElement('a');
	back.classList.add("WR_button");
	back.innerText = "Back";
	back.onclick = ()=>{
		window.history.go(-1);
		return false;
	};
	_ENV.DOM_header.appendChild(back);
}

// Load what we need
(async ()=>{
	const params = new URLSearchParams(window.location.search);
	const projectName = params.get("name");

	// Fetch the manifest
	const manifest = await FetchManifest();

	// Get the versions array
	const versions = manifest[projectName];

	// Get the metadata of the latest version
	const version = versions.at(0);
	const metadata = await FetchMetadata(version[0]);

	// Form the icon URL for the project
	const iconURL = GetProjectAssetURL(metadata.id, metadata.icon);

	// Initialise the page using the metadata
	(()=>{
		const el = document.createElement('div');
		el.classList.add("AppInfo");

		// Blurry backdrop
		const backdrop = document.createElement('img');
		backdrop.classList.add("backdrop");
		backdrop.src = iconURL;
		el.appendChild(backdrop);

		// App Icon
		const icon = document.createElement('img');
		icon.classList.add("icon");
		icon.src = iconURL;
		el.appendChild(icon);

		// App title
		const title = document.createElement('h4');
		title.classList.add("title");
		title.innerText = metadata.name;
		el.appendChild(title);

		// <hr>
		el.appendChild(document.createElement('hr'));
		{ // App properties (Authors, Category, Size etc.)
			const properties = document.createElement('div');
			properties.classList.add("properties");

			{ // Authors
				const div = document.createElement('div');
				div.innerHTML = "<b>DEVELOPER:</b><br>";
				for (let i in metadata.authors) {
					let author = metadata.authors[i];
					author = author.trim();
					div.innerHTML += `<a href="https://talk.codea.io/u/${author}/summary">${author}</a>`
					if (i < metadata.authors.length-1) {
						div.innerHTML += ", ";
					}
				}
				properties.appendChild(div);
			}

			{ // Category
				const div = document.createElement('div');
				div.innerHTML = `<b>CATEGORY:</b><br>${metadata.category}`;
				properties.appendChild(div);
			}

			{ // Platform
				const div = document.createElement('div');
				div.innerHTML = `<b>PLATFORM:</b><br>${metadata.platform}`;
				properties.appendChild(div);
			}

			{ // Size
				const div = document.createElement('div');
				let size = metadata.installed_size;
				let sizeUnit = "bytes";
				const KB = 1024;
				const MB = KB*1024;
				const GB = MB*1024;
				if (size > GB) {
					size /= GB;
					sizeUnit = "GB";
				} else if (size > MB) {
					size /= MB;
					sizeUnit = "MB";
				} else if (size > KB) {
					size /= KB;
					sizeUnit = "KB";
				}
				div.innerHTML = `<b>SIZE:</b><br>${+size.toFixed(1)} ${sizeUnit}`;
				properties.appendChild(div);
			}
			
			el.appendChild(properties);
		}

		// <hr>
		el.appendChild(document.createElement('hr'));
		{ // App download options
			const options = document.createElement('div');
			options.classList.add("properties");

			// Version
			const select = document.createElement('select');
			for (v of versions.toReversed()) {
				select.innerHTML += `<option value="${v[0]}">${v[1]}</option>`;
			}

			{ // Download button
				const bttn = document.createElement('button');
				bttn.innerText = "Install";
				bttn.onclick = ()=>{
					InstallProject(metadata.name, projectName, select.value, bttn);
				};
				options.appendChild(bttn);
			}

			// Add version selection after install button
			options.appendChild(select);

			// <hr>
			options.appendChild(document.createElement('hr'));

			{ // Forum link
				const bttn = document.createElement('button');
				bttn.innerText = "Codea Talk";
				bttn.onclick = ()=>{
					let url = metadata.forum_link;
					if (url == "https://codea.io/talk/") {
						url = "https://talk.codea.io"
					}
					window.location.href = url;
				};
				options.appendChild(bttn);
			}

			el.appendChild(options);
		}

		// <hr>
		el.appendChild(document.createElement('hr'));
		
		{ // Short description
			const sdesc = document.createElement('p');
			sdesc.innerText = metadata.description_short;
			el.appendChild(sdesc);
		}

		// Slim <hr>
		{
			const hr = document.createElement('hr')
			hr.classList.add("slim");
			el.appendChild(hr);
		}
		
		{ // Long description
			const desc = document.createElement('p');
			desc.innerText = metadata.description_long;
			el.appendChild(desc);
		}

		// Slim <hr>
		{
			const hr = document.createElement('hr')
			hr.classList.add("slim");
			el.appendChild(hr);
		}

		{ // Version History
			const history = document.createElement('p');

			// Load release notes async.
			(async ()=>{
				for (v of versions) {
					const meta = await FetchMetadata(v[0]);
					const notes = meta.update_notes.replaceAll('\n', "<br>");
					history.innerHTML += `<b>${meta.version}:</b><br><p>${notes}</p><br>`;
				}
			})();
			el.appendChild(history);
		}

		// Set content
		_ENV.DOM_content.replaceChildren(el);
	})();
})();
