/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("GET", "/v1/auth/authenticate", (c) => {
    const MBUser = require(`${__hooks}/backend/MBUser.pb.js`);
    return c.json(200, new MBUser().authenticate());
});