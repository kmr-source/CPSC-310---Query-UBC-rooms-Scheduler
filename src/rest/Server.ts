/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import InsightFacade from "../controller/InsightFacade";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";
import {error} from "util";
import {type} from "os";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    private static insightFacade: InsightFacade;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);

                // NOTE: your endpoints should go here
                that.rest.get("/datasets", Server.getDatasets);
                that.rest.put("/dataset/:id/:kind", Server.putDataset);
                that.rest.del("/dataset/:id", Server.deleteDataset);
                that.rest.post("/query", Server.postQuery);
                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err});
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) { /// TODO: FIGURE OUT HOW THIS WORKS
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

    private static putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        // const publicDir = "frontend/public/";
        let urlArr: string[] = req.url.split("/");
        const id = urlArr[(urlArr.length - 1) - 1]; // if free of errors, gets dataset id from second last index
        const buffer: Buffer = req.body;
        const kindString = urlArr[(urlArr.length - 1)]; // see id
        let kind: InsightDatasetKind = null; // see id
        if (kindString === "courses") {
            kind = InsightDatasetKind.Courses;
        } else if (kindString === "rooms") {
            kind = InsightDatasetKind.Rooms;
        } else {
            // kind is null
        }
        // Log.trace(typeof req.body);
        const content: string = buffer.toString("base64"); /// doesn't work???

        Log.trace("RoutHandler::putDataset::" + req.url);
        if (this.insightFacade === undefined || this.insightFacade === null) {
            this.insightFacade = new InsightFacade();
        }
        return this.insightFacade.addDataset(id, content, kind)
            .then((arr: string[]) => {
                res.json(200, {result: arr});
                return next();
        }).catch((err) => {
            Log.error(JSON.stringify(err));
            res.json(400, {err: "ERROR: something went wrong"});
            return next();
        });
    }

    private static deleteDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        let urlArr: string[] = req.url.split("/");
        const id = urlArr[(urlArr.length - 1)]; // if free of errors, gets dataset id from last index

        Log.trace("RoutHandler::deleteDataset::" + req.url);
        if (this.insightFacade === undefined || this.insightFacade === null) {
            this.insightFacade = new InsightFacade();
        }
        return this.insightFacade.removeDataset(id)
            .then((str: string) => {
            res.json(200, {result: str});
            return next();
        }).catch((err) => {
            Log.error(JSON.stringify(err));
            if (err instanceof NotFoundError) {
                res.json(404, {err: "ERROR: something went wrong"});
            } else {
                res.json(400, {err: "ERROR: something went wrong"});
            }
            return next();
        });

    }

    private static postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        const query: JSON = req.body;

        if (this.insightFacade === undefined || this.insightFacade === null) {
            this.insightFacade = new InsightFacade();
        }

        return this.insightFacade.performQuery(query)
            .then((arr: string[]) => {
                res.json(200, {result: arr});
                return next();
            })
            .catch((err) => {
                Log.error(JSON.stringify(err));
                res.json(400, {err: "ERROR: something went wrong"});
                return next();
            });
    }

    private static getDatasets(req: restify.Request, res: restify.Response, next: restify.Next) {

        if (this.insightFacade === undefined || this.insightFacade === null) {
            this.insightFacade = new InsightFacade();
        }
        return this.insightFacade.listDatasets()
            .then((arr: InsightDataset[]) => {
                res.json(200, {result: arr});
                return next();
            });
    }

}
