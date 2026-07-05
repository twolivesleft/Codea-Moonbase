/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("GET", "/v1/auth/permissions.json", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);

    // Get the current user
    const user = MBUser.getAuthenticated(c);

    const permissions = {
        admin: user.isAdmin(),
        max_staged: user.record.get("max_staged")
    };
    return c.json(200, permissions);
});
