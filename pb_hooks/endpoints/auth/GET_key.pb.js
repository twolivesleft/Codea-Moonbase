/// <reference path="../../../pb_data/types.d.ts" />

routerAdd("GET", "/v1/auth/key/{key}", (c) => {
    const auth = require(`${__hooks}/utils/auth.pb.js`);
    return c.json(200, {api_key: auth.getFinalKey(c.request.pathValue("key"))});
});
