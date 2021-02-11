import Log from "../Util";
import http = require ("http");

export default class GeolocationHandler {
    private requestPath = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team250/";

    // used example from: https://nodejs.org/api/http.html#http_http_get_url_options_callback
    public getLocation(address: string): Promise<any> {
        // address = "6265 Crescent Road";
        // const URLAddress = this.addressToRUL(address);
        let URLAddress = encodeURI(address);
        return new Promise<any>( (resolve, reject) => {
            let r = http.get(this.requestPath + URLAddress, (res) => {

                if (res.statusCode !== 200) {
                    return Promise.resolve(null);
                }
                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk) => {
                    rawData = rawData + chunk;
                    // let smack;
                });
                res.on("end", () => {
                    const parseDataToJson = JSON.parse(rawData);
                    if (parseDataToJson.error) {
                        Log.trace(parseDataToJson.error + "ERROR");
                        return Promise.resolve(null);
                    }
                    return resolve(JSON.parse(rawData));
                });
            });
            r.on("error", (error: any) => {
                Log.error(error);
                return Promise.resolve(null);
            });
        }).catch((err) => {
                Log.error(err);
        });
    }
}

