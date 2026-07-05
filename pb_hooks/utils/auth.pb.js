/// <reference path="../../pb_data/types.d.ts" />

// Imports
const b64 = require(`${__hooks}/utils/base64.js`);

// Constants
const DISCOURSE_HOST = $os.getenv("DISCOURSE_HOST");
const DISCOURSE_IDENTITY_SECRET = $os.getenv("DISCOURSE_IDENTITY_SECRET");
const HOST_URL = $app.settings().meta.appURL;

const begin = (userRecord) => {
    if(userRecord.get("verified") == true) {
        throw new BadRequestError(`User ${userRecord.id} (${userRecord.get("username")}) already verified.`);
    }

    const nonce = $security.randomString(32);
    const callbackUrl = `${HOST_URL}/v1/auth/callback`;

    const payload = `nonce=${nonce}&return_sso_url=${callbackUrl}`;
    const b64Payload = b64.btoa(payload);
    const urlPayload = encodeURI(b64Payload);

    const sig = $security.hs256(urlPayload, DISCOURSE_IDENTITY_SECRET);

    const stage1Url = `https://${DISCOURSE_HOST}/session/sso_provider?sso=${urlPayload}&sig=${sig}`;
    const stage2Url = `${HOST_URL}/v1/auth/key/${userRecord.get("api_key")}`; 

    // Update user record
    userRecord.set("external_id", nonce);
    $app.save(userRecord);

    return {stage1Url, stage2Url};
}

const end = (sso, sig) => {
    // Check signature
    if (sig != $security.hs256(sso, DISCOURSE_IDENTITY_SECRET)) {
        throw new BadRequestError("Authentication Failure");
    }

    // Decode & parse payload
    let payload = b64.atob(sso);
    {
        const pairs = payload.split('&');
        payload = {};
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            payload[decodeURIComponent(key)] = decodeURIComponent(value);
        }
    }

    // Get the user record to be authenticated
    let userRecord;
    try {
        userRecord = $app.findFirstRecordByData("users", "external_id", payload.nonce);
    } catch(_) {
        throw new BadRequestError("Authentication Failure");
    }

    // Is the user a moonbase admin?
    let isAdmin = payload.groups.includes("moonbase_admin");

    // Setup a redirect if the user already has a user record.
    try {
        const redirectRecord = $app.findFirstRecordByData("users", "external_id", payload.external_id);
        userRecord.set("api_key_redirect", redirectRecord.get("api_key"));

        // Update the redirect record (things may have changed)
        redirectRecord.set("admin", isAdmin);
        redirectRecord.set("username", payload.username);
        $app.save(redirectRecord);
    } catch(_) {}

    // Update the user record
    userRecord.set("external_id", payload.external_id);
    userRecord.set("username", payload.username);
    userRecord.set("max_staged", 4);
    userRecord.set("verified", true);
    userRecord.set("admin", isAdmin)
    $app.save(userRecord);
}

const getFinalKey = (apiKey) => {
    // Get user record
    const record = $app.findFirstRecordByData("users", "api_key", apiKey);

    if (record.get("verified") == false) {
        throw new BadRequestError("User not authenticated");
    }

    const key = record.get("api_key_redirect");
    if (key != "") {
        // Return the redirect key and remove the passed record
        $app.delete(record);
        return key;
    } else {
        // Echo the supplied key
        return apiKey;
    }
}

module.exports = {
    begin,
    end,
    getFinalKey
}
