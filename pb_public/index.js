const DOM_header = document.getElementById("header");
const DOM_content = document.getElementById("content");
const DOM_footer = document.getElementById("footer");
const DOM_search = document.getElementById("search");

const DOM_news = document.createElement('div');
const DOM_list = document.createElement('div');

// Initialise the containers
DOM_news.classList.add('FlexContainer');
DOM_list.classList.add('FlexContainer');

let manifest = null;
let metadata = {};

let newsEntries = new Array();
let listEntries = new Array();

// Setup search callback
DOM_search.oninput = (e) => {
	const searchTerm = e.target.value;

	if (searchTerm === "") {
		// Trigger default tab
		document.getElementById("defaultTab").click();
		return;
	}

	const matches = listEntries.reduce((prev, e, idx, arr)=>{
		var match = fuzzy.match(searchTerm, e[1].name, {});
		if (match == null) {
			match = fuzzy.match(searchTerm, e[1].authors.toString(), {});
		}
		if (match == null) {
			match = fuzzy.match(searchTerm, e[1].description_short, {});
		}
		if (match == null) {
			match = fuzzy.match(searchTerm, e[1].description_long, {});
		}

		if(match != null) {
			prev[prev.length] = {
				score: match.score,
				index: idx,
				element: e[0]
			};
		}
		return prev;
	}, [])
    .sort(function(a,b) {
		var compare = b.score - a.score;
		if(compare) return compare;
		return a.index - b.index;
    })
	.map(function(el) { return el.element; });
	
	DOM_list.replaceChildren(...matches);
	DOM_content.replaceChildren(DOM_list);
};

// Tab click handlers
function onTab(e, tabName) {
	let replaceWith = null;

	if (e != null) {
		// Deselect previous tab
		if (onTab.currentTab != undefined) {
			onTab.currentTab.classList.toggle('selected');
		}
		// Update new tab
		onTab.currentTab = e.currentTarget;
		onTab.currentTab.classList.toggle('selected');
	}

	// Clear search box
	DOM_search.value = "";

	// Do the content replacement
	switch (tabName) {
		case "news": 
			DOM_content.replaceChildren(DOM_news);
			break;
		default:
			replaceWith = listEntries.filter((e)=>{
				return e[1].category == tabName;
			}).map((e)=>e[0]);
			DOM_list.replaceChildren(...replaceWith);
			DOM_content.replaceChildren(DOM_list);
			return;
	}
}
// Trigger default tab
document.getElementById("defaultTab").click();

async function GenerateNewsEntry(metadata) {
	const el = document.createElement('div');
	el.classList.add("NewsEntry");

	// Open App page
	el.onclick = ()=>{
		OpenAppInfo(metadata);
	};

	// Form the icon URL for the project
	const iconURL = GetProjectAssetURL(metadata.id, metadata.icon) // `${URL_BASE}/${encodeURIComponent(metadata.repoName)}/${GetIconFilename(metadata)}`;

	// Banner
	const banner = document.createElement('img');
	banner.classList.add("banner");
	banner.src = iconURL;
	el.appendChild(banner);

	// Bottom border
	const infoDiv = document.createElement('div');
	infoDiv.classList.add("info");
	el.appendChild(infoDiv);

	// Icon
	const icon = document.createElement('img');
	icon.classList.add("icon");
	icon.src = iconURL;
	el.appendChild(icon);

	// Title
	const title = document.createElement('h4');
	title.classList.add("title");
	title.innerHTML = metadata.name;
	el.appendChild(title);

	// Description
	const desc = document.createElement('p');
	desc.classList.add("desc");
	desc.innerHTML = metadata.description_short;
	el.appendChild(desc);

	// Add version / install button
	const version = document.createElement('button');
	version.classList.add("button");
	version.innerHTML = "Get " + metadata.version;
	version.onclick = (e)=>{
		e.stopPropagation();
		InstallProject(metadata);
	};
	el.appendChild(version);

	// Message
	const message = document.createElement('p');
	message.classList.add("message");
	if (metadata.versions.length == 1) {
		message.innerHTML = "New";
	} else {
		message.innerHTML = "Updated";
	}
	el.appendChild(message);

	// Add element to DOM only when the image has loaded
	const onload = (event)=>{
		// Push new element and then sort the array
		// by timestamp.
		newsEntries.push([el, metadata]);
		newsEntries.sort((a, b)=>{
			if (a[1].timestamp > b[1].timestamp) {
				return -1;
			}
			return 1;
		});
		for (const idx in newsEntries) {
			const element = newsEntries[idx];
			const mod = idx % 4;
			if (mod == 0 || mod == 3) {
				element[0].classList.add("stagger-large");
				element[0].classList.remove("stagger-small");
			} else {
				element[0].classList.remove("stagger-large");
				element[0].classList.add("stagger-small");
			}
		}
		DOM_news.replaceChildren(...newsEntries.map((e)=>e[0]));
	};
	banner.addEventListener("load", onload);
}

function GenerateListEntry(metadata) {
	const el = document.createElement('div');
	el.classList.add("ListEntry");

	// Open App page
	el.onclick = ()=>{
		OpenAppInfo(metadata);
	};

	// Form the icon URL for the project
	const iconURL = GetProjectAssetURL(metadata.id, metadata.icon) //`${URL_BASE}/${encodeURIComponent(metadata.repoName)}/${GetIconFilename(metadata)}`

	// Icon
	const icon = document.createElement('img');
	icon.classList.add("icon");
	icon.src = iconURL;
	el.appendChild(icon);

	// Title
	const title = document.createElement('h4');
	title.classList.add("title");
	title.innerHTML = metadata.name;
	el.appendChild(title);

	// Description
	const desc = document.createElement('p');
	desc.classList.add("desc");
	desc.innerHTML = metadata.short_description;
	el.appendChild(desc);

	// Add version / install button
	const version = document.createElement('button');
	version.classList.add("button");
	version.innerHTML = "Get " + metadata.version;
	version.onclick = (e)=>{
		e.stopPropagation();
		InstallProject(metadata.name, metadata.repoName, metadata.version);
	};
	el.appendChild(version);

	// Add element to DOM only when the image has loaded
	const onload = (event)=>{
	
		// Push new element and then sort the array
		// by timestamp.
		listEntries.push([el, metadata]);
		listEntries.sort((a, b)=>{
			if (a[1].timestamp > b[1].timestamp) {
				return -1;
			}
			return 1;
		});

		switch(metadata.category) {
			case 'Game':
				const games = listEntries.filter((e)=>e[1].category == "Game");
				DOM_games.replaceChildren(...games.map((e)=>e[0]));
				break;
			case 'App':
				const apps = listEntries.filter((e)=>e[1].category == "App");
				DOM_apps.replaceChildren(...apps.map((e)=>e[0]));
				break;
			case 'Library':
				const libs = listEntries.filter((e)=>e[1].category == "Library");
				DOM_libs.replaceChildren(...libs.map((e)=>e[0]));
				break;
			case 'Asset':
				const assets = listEntries.filter((e)=>e[1].category == "Asset");
				DOM_assets.replaceChildren(...assets.map((e)=>e[0]));
				break;
		}
	};
	icon.addEventListener("load", onload);
}

// Load what we need
(async ()=>{
	// Fetch the manifest
	const manifest = await FetchManifest();

	for (const repoName in manifest) {
		const versions = manifest[repoName];
		const latestVersion = versions[0];
		FetchMetadata(latestVersion[0]).then((metadata)=>{
			// Add useful values to metadata
			metadata.versions = versions;
			metadata.repoName = repoName;
	
			// Generate entries for this project
			GenerateNewsEntry(metadata);
			GenerateListEntry(metadata);
		});
	}
})();
