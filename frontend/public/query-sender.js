/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */

// sends an Ajax/REST request to the POST /query endpoint of your Web server,
// taking a query as produced by CampusExplorer.buildQuery as argument.
// You must use the browser-native XMLHttpRequest object
// and its send and onload methods to send requests because otherwise the Autobot tests will fail.
CampusExplorer.sendQuery = function (query) {
    return new Promise(function (fulfill, reject) {

        let httpReq = new XMLHttpRequest();
        let url = "http://localhost:1234/query";
        httpReq.open("POST", url, true);
        httpReq.onload = function () {
            if (httpReq.response) {
                let severResponse = JSON.parse(httpReq.response);
                fulfill(severResponse);
            }
            if (httpReq.status !== 200) {
                reject(httpReq.responseText);
            }
        };
        try {
            httpReq.send(JSON.stringify(query));
        } catch (error) {
            reject({error: error});
        }
        // console.log("CampusExplorer.sendQuery not implemented yet.");
    });
};
