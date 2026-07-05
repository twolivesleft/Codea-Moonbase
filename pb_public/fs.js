(()=>{

	const BLOCK_SIZE = 5;//1024*64; // 64KB
	const DB_NAME = "WebRepoFS"

	class FSFile {
		#fs = null;
		#path = null;
		#mode = null;

		// Current R/W position
		#pos = 0;
		
		constructor(fs, path, mode) {
			this.#fs = fs;
			this.#path = path;
			this.#mode = mode;
		}

		async read(numBytes) {
			const data = await this.#fs.readBytes(this.#path, this.#pos, this.#pos + numBytes);
			this.#pos += data.length;
			return data;
		}

		write(bytes) {
			if (this.#mode.includes('w')) {
				
			} else {
				print("Unable to write to readonly file");
			}
		}
	};

	class FS {
		// Our IDB connection
		#db = null;

		constructor(reformat) {
			this.#db = new Promise((resolve)=>{
				if (reformat == true) {
					// print("Deleting DB");
					const req = window.indexedDB.deleteDatabase(DB_NAME);
					req.onsuccess = ()=>{
						// print("deleted!");

						// Open DB again, recreating in the process
						this.#db_open(resolve);
					};
					req.onerror = (e)=>{
						print("error", e.toString());
					};
				} else {
					this.#db_open(resolve);	
				}
			});
		}

		#db_open(resolve) {
			// print("Opening DB");
		
			// Open connection to IDB{
			const request = indexedDB.open(DB_NAME, 1);
			request.onsuccess = (e)=>{
				// print('Opened DB');
				const db = request.result;
				resolve(db);
			};
			request.onerror = (e)=>{
				print('error', Object.keys(e).toString());
			};
			request.onupgradeneeded = (e)=>{
				// print('Upgrade IndexedDB');
				const db = e.target.result;

				// Create our object store
				const filesObjectStore = db.createObjectStore("files", { autoIncrement: true });
				const metadataObjectStore = db.createObjectStore("meta", { keyPath: "path" });

				// Create our path index.
				// A path could be shared by multiple blocks so is not unique.
				filesObjectStore.createIndex("path", "path", { unique: false });
			};
			request.onblocked = (e)=>{
				print('blocked');
			};
		}

		async close() {
			this.#db.then((db)=>{
				db.close();
			})
		}
		
		open(path, mode) {
			return new FSFile(this, path, mode);
		}

		async #saveData(path, data) {
			const db = await this.#db;

			const t = db.transaction(["files", "meta"], "readwrite");
			const files = t.objectStore("files");
			const metadata = t.objectStore("meta");

			// Store file metadata
			metadata.put({
				path: path,
				size: data.length
			});

			// Add data block by block
			let blockI = 0;
			for (var i = 0; i < data.length; i += BLOCK_SIZE) {
				const ie = Math.min(i + BLOCK_SIZE, data.length);
				const req = files.put({
					path: path,
					block: blockI++,
					data: data.subarray(i, ie)
				});
			}
		}

		saveBinary(path, data) {
			return this.#saveData(path, new Uint8Array(data));
		}

		saveText(path, text) {
			const encoder = new TextEncoder();
			return this.#saveData(path, encoder.encode(text));
		}

		async readBinary(path) {
			const db = await this.#db;
			
			const t = db.transaction(["meta"], "readonly");
			const metadata = t.objectStore("meta");

			// Retreive the metadata so we can get the total file size
			const meta = await new Promise((resolve)=>{
				let req = metadata.get(path);
				req.onsuccess = (e)=>{
					resolve(req.result);
				};
			});

			// Read all file bytes
			return await this.readBytes(path, 0, meta.size);
		}

		async readText(path) {
			// Read all file bytes
			const bytes = await this.readBinary(path);

			// Decode into a UTF-8 string
			const decoder = new TextDecoder();
			return decoder.decode(bytes);
		}

		readBlocks(path, start, end) {
			return new Promise(async (resolve)=>{
				const db = await this.#db;
				const keyRange = IDBKeyRange.only(path);

				const blocks = Array();

				const expectedNumBlocks = end - start;
				let numBlocks = 0;

				const done = ()=>{
					// Do some limited read caching here
					resolve(blocks);
				};
				
				const t = db.transaction("files")
					.objectStore("files")
					.index("path")
					.openCursor(keyRange).onsuccess = (event) => {
						const cursor = event.target.result;

						// Do we have another block?
						if (cursor) {
						
							const value = cursor.value;
							if (value.block >= start && value.block < end) {
								blocks[value.block - start] = value.data;

								// Have we read all expected blocks?
								// We can stop iterating early then.
								if (numBlocks++ == expectedNumBlocks) {
									done();
									return;
								}
							}

							// Next block?
							cursor.continue();
						} else {
						
							// No more blocks to read
							done();
						}
					};
			});
		}

		// Reads begin-end (end excl.)
		async readBytes(path, begin, end) {
			const numBytes = end - begin;
		
			// Calc blocks required to complete read
			const blockStart = Math.floor(begin / BLOCK_SIZE);
			const blockEnd = Math.floor((end - 1) / BLOCK_SIZE) + 1;

			// Read the relevant file blocks
			const blocks = await this.readBlocks(path, blockStart, blockEnd);

			// Calc total bytes read into blocks
			const blockBytes = blocks.reduce((total, b)=>b.length+total, 0);

			if (blockBytes == 0) {
				return null;
			}

			// print(`Read ${blockBytes} block bytes`);

			// Calc offset into first read block
			const firstBlockOffset = (begin % BLOCK_SIZE);
			// Update first block to account for this
			blocks[0] = blocks[0].subarray(firstBlockOffset);

			// Calc the number of valid read bytes.
			let readBytes = blockBytes - firstBlockOffset;
			if (readBytes > numBytes) {
				readBytes = numBytes;
			}

			// print(`Read ${readBytes} bytes`);

			// Create output byte array
			const data = new Uint8Array(readBytes);
			let dataIndex = 0;
			for (var i = 0; i < blocks.length; ++i) {
				const block = blocks[i];
				data.set(block.subarray(0, Math.min(block.length, readBytes)), dataIndex);
				readBytes -= block.length;
				dataIndex += block.length;
			}

			return data;
		}

		async writeBytes(path, begin, data) {
			const db = await this.#db;
		
			const numBytes = data.length;
			const end = begin + numBytes;

			// Calc blocks required to complete write
			const blockStart = Math.floor(begin / BLOCK_SIZE);
			const blockEnd = Math.floor((end - 1) / BLOCK_SIZE) + 1;

			print(blockStart + "," + blockEnd);

			// Read current metadata first
			const t = db.transaction(["meta"], "readwrite");
			const metadata = t.objectStore("meta");
			const meta = await new Promise((resolve)=>{
				let req = metadata.get(path);
				req.onsuccess = (e)=>{
					resolve(req.result);
				};
			});

			// Read file size first

			// Replace write blocks that are complete.
			// Modify write blocks that are incomplete.
		}
	};

	// window.fs = new FS(true); // TODO: Do not reformat every time

	// Verify FS is functioning.
	(async ()=>{
		const root = await navigator.storage.getDirectory();

		const handle = await root.getFileHandle("test.txt", { create: true });

		try {
			const writable = await handle.createWritable();
		} catch(e) {
			print(e.message);
		}

		print("writable");

		print(writable.toString());
	
		// fs.saveText("_StartupMessage_", "IndexedDB Initialised.");
		// print(await fs.readText("_StartupMessage_"));

		// fs.writeBytes("test.bin", 0, new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13]));
	})();

})();
