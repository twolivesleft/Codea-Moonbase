/// <reference path="../../pb_data/types.d.ts" />

const APP_TOKEN = $os.getenv("PUSHOVER_APP_TOKEN");
const GROUP_KEY = $os.getenv("PUSHOVER_GROUP_KEY");

module.exports = {
    send: (title, message) => {
        const res = $http.send({
            url: "https://api.pushover.net/1/messages.json",
            method: "post",
            body: JSON.stringify({
                token:  APP_TOKEN,
                user:   GROUP_KEY,
                title,
                message
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });
        // $app.logger().info(JSON.stringify(res));
    }
};
