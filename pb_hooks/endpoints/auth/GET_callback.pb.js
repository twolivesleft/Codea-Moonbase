/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("GET", "/v1/auth/callback", (c) => {
    const auth = require(`${__hooks}/utils/auth.pb.js`);

    // End the authentication flow
    auth.end(c.request.url.query().get("sso"), c.request.url.query().get("sig"));
    
    return c.html(200, `
        <h2>User successfully authenticated! Please close this page.</h2>
    `);
});
