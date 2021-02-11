import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs-extra";
import {InsightDataset, NotFoundError} from "../src/controller/IInsightFacade";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    chai.use(chaiHttp);

    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        oneFile: "./test/data/oneFile.zip",
        invalidBM: "./test/data/invalidBM.zip",
        invalidDirectoryName: "./test/data/invalidDirectoryName.zip",
        invalidEnd: "./test/data/invalidEnd.zip",
        invalidMid: "./test/data/invalidMiddle.zip",
        noCourse: "./test/data/noCourseDirectory.zip",
        notJson: "./test/data/isNotJson.zip",
        noValidCourse: "./test/data/notValidCourse.zip",
        oneValidCourse: "./test/data/oneValidCourse.zip",
        pictureData: "./test/data/pictureData.zip",
        pdfFile: "./test/data/copy.pdf",
        rooms: "./test/data/rooms.zip",

    };
    let datasets: { [id: string]: Buffer } = {};

    let SERVER_URL: string = "http://localhost:4321";
    let dataPromise = new Promise(((resolve, reject) => resolve(fs.readFileSync("./test/data/courses.zip"))));
    let ZIP_FILE_DATA: any;
    const cacheDir = __dirname + "/../data";

    const addCourseDataset = function () {
        return chai.request(SERVER_URL)
            .put("/dataset/courses/courses")
            .send(datasets["courses"])
            .set("Content-Type", "application/x-zip-compressed");
    };

    const addRoomDataset = function () {
        return chai.request(SERVER_URL)
            .put("/dataset/rooms/rooms")
            .send(datasets["rooms"])
            .set("Content-Type", "application/x-zip-compressed");
    };

    const deleteCourseDataset = function () {
        return chai.request(SERVER_URL)
            .del("/dataset/courses");
    };
    const deleteRoomDataset = function () {
        return chai.request(SERVER_URL)
            .del("/dataset/rooms");
    };
    const listDatasets = function () {
        return chai.request(SERVER_URL)
        .get("/datasets");
    };

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        server.start(); // ----------------------------?
        // TODO: start server here once and handle errors properly

        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]);
        }
    });

    after(function () {
        server.stop(); // ----------------------------?
        // TODO: stop server here once!
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        // Log.test(`BeforeTest: ${this.currentTest.title}`);
        // try {
        //     fs.removeSync(cacheDir);
        //     fs.mkdirSync(cacheDir);
        // } catch (err) {
        //     Log.error(err);
        // }
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    // TODO: read your courses and rooms datasets here once!

    it("Test getStatic", function () {
        try {
            return chai.request(SERVER_URL)
                .get("/")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    // Sample on how to format PUT requests
    it("PUT test for courses dataset", function () {
        let expected = ["courses"];
        try {
            return addCourseDataset()
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(expected);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("start and stop the server multiple times", function () {
        // let expected = ["courses"];
        // try {
        //     return addCourseDataset()
        //         .then ( () => {
        //             return addRoomDataset();
        //         })
        //         .then(function (res: Response) {
        //             expect(res.status).to.be.equal(200);
        //             expect(res.body.result).to.deep.equal(expected);
        //         })
        //         .catch(function (err: any) {
        //             // some logging here please!
        //             expect.fail(err);
        //         });
        // } catch (err) {
        //     // and some more logging here!
        // }
    });

    it("should add multiple datasets", function () {
        let expected = ["courses", "rooms"];
        try {
            return addCourseDataset()
                .then ( () => {
                    return addRoomDataset();
                })
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(expected);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    it("should add and delete multiple dataset", function () {
        let expected: string[] = [];
        try {
            return addCourseDataset()
                .then ( () => {
                    return addRoomDataset();
                })
                .then ( () => {
                    return deleteCourseDataset();
                }).then ( () => {
                    return deleteRoomDataset();
                }).then ( () => {
                    return listDatasets();
                })
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(expected);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("should delete an added dataset", function () {
        let expected = "courses";
        ZIP_FILE_DATA = datasets["courses"];
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/courses/courses")
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(() => {
                    return chai.request(SERVER_URL)
                        .del("/dataset/courses");
                })
                .then(() => {
                    return chai.request(SERVER_URL)
                        .del("/dataset/rooms");
                })
                .then(function (res: Response) {
                            // some logging here please!
                            expect(res.status).to.be.equal(200);
                            expect(res.body.result).to.deep.equal(expected);
                        })
                        .catch(function (err: any) {
                            // some logging here please!
                            expect.fail(err);
                        })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    it("respond with 404 if dataset is not added", function () {
        try {
            return chai.request(SERVER_URL)
                .del("/dataset/notAddedDataset")
                .then(function (res: Response) {
                    // some logging here please!
                    expect.fail();
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    it("list datasets using GET /datasets if dataset is already added", function () {
        ZIP_FILE_DATA = datasets["courses"];
        let expected = [{id: "courses", kind: "courses", numRows: 64612}];
        try {
            return chai.request(SERVER_URL)
                .get("/datasets")
                .then(function (res: Response) {
                            // some logging here please!
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(expected);
                })
                .catch(function (err: any) {
                            // some logging here please!
                    expect.fail(err);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }

    });
    it("list datasets using GET /datasets if no datasets are added", function () {
        let expected: InsightDataset[] = [];
        try {
            return chai.request(SERVER_URL)
                .get("/datasets")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(expected);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }

    });
    it("list datasets using GET /datasets", function () {
        ZIP_FILE_DATA = datasets["courses"];
        let expected = [{id: "courses", kind: "courses", numRows: 64612}];
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/courses/courses")
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(() => {
                    return chai.request(SERVER_URL)
                        .get("/datasets")
                        .then(function (res: Response) {
                            // some logging here please!
                            expect(res.status).to.be.equal(200);
                            expect(res.body.result).to.deep.equal(expected);
                        })
                        .catch(function (err: any) {
                            // some logging here please!
                            expect.fail(err);
                        });
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }

    });
    it("list datasets after adding then removing dataset", function () {
        ZIP_FILE_DATA = datasets["courses"];
        let expected: InsightDataset[] = [];
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/courses/courses")
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(() => {
                    return chai.request(SERVER_URL)
                        .del("/dataset/courses");
                })
                .then(() => {
                    return chai.request(SERVER_URL)
                        .get("/datasets")
                        .then(function (res: Response) {
                            // some logging here please!
                            expect(res.status).to.be.equal(200);
                            expect(res.body.result).to.deep.equal(expected);
                        })
                        .catch(function (err: any) {
                            // some logging here please!
                            expect.fail(err);
                        });
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }

    });
    it("process queries through POST", function () {
        const queryObj: JSON =
            JSON.parse(
                JSON.stringify({
                    WHERE: {
                        GT: {
                            courses_avg: 97
                        }
                    },
                    OPTIONS: {
                        COLUMNS: [
                            "courses_dept",
                            "courses_avg"
                        ],
                        ORDER: "courses_avg"
                    }
                }));

        ZIP_FILE_DATA = datasets["courses"];
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/courses/courses")
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(() => {
                    return chai.request(SERVER_URL)
                        .post("/query")
                        .send(queryObj)
                        .then(function (res: Response) {
                            // some logging here please!
                            expect(res.status).to.be.equal(200);
                            expect(Array.isArray(res.body.result)).to.equal(true);
                            // expect(res.body.result).to.deep.equal(expected);
                        })
                        .catch(function (err: any) {
                            // some logging here please!
                            expect.fail(err);
                        });
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("process room queries through POST", function () {
        const queryObj: JSON =
            JSON.parse(
                JSON.stringify({
                    WHERE: {
                        GT: {
                            rooms_seats: 97
                        }
                    },
                    OPTIONS: {
                        COLUMNS: [
                            "rooms_seats"
                        ],
                        ORDER: "rooms_seats"
                    }
                }));

        ZIP_FILE_DATA = datasets["rooms"];
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/rooms/rooms")
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(() => {
                    return chai.request(SERVER_URL)
                        .post("/query")
                        .send(queryObj)
                        .then(function (res: Response) {
                            // some logging here please!
                            expect(res.status).to.be.equal(200);
                            expect(Array.isArray(res.body.result)).to.equal(true);
                            // expect(res.body.result).to.deep.equal(expected);
                        })
                        .catch(function (err: any) {
                            // some logging here please!
                            expect.fail(err);
                        });
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("should not query a removed dataset", function () {
        const queryObj: JSON =
            JSON.parse(
                JSON.stringify({
                    WHERE: {
                        GT: {
                            rooms_seats: 97
                        }
                    },
                    OPTIONS: {
                        COLUMNS: [
                            "rooms_seats"
                        ],
                        ORDER: "rooms_seats"
                    }
                }));

        ZIP_FILE_DATA = datasets["rooms"];
        try {
            return addRoomDataset()
                .then (() => {
                    return deleteRoomDataset();
                })
                .then(() => {
                    return chai.request(SERVER_URL)
                        .post("/query")
                        .send(queryObj)
                        .then(function (res: Response) {
                            expect.fail("this should have failed");
                        })
                        .catch(function (err: any) {
                            // some logging here please!
                            expect(err.status).to.be.equal(400);
                        });
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });


    it("should reject to large a query", function () {
        const queryObj: JSON =
            JSON.parse(
                JSON.stringify({
                    WHERE: {
                        GT: {
                            courses_avg: 0
                        }
                    },
                    OPTIONS: {
                        COLUMNS: [
                            "courses_avg"
                        ],
                        ORDER: "courses_avg"
                    }
                }));

        ZIP_FILE_DATA = datasets["courses"];
        try {
            return addCourseDataset()
                .then(() => {
                    return chai.request(SERVER_URL)
                        .post("/query")
                        .send(queryObj)
                        .then(function (res: Response) {
                            expect.fail("this should have failed");
                        })
                        .catch(function (err: any) {
                            // some logging here please!
                            expect(err.status).to.be.equal(400);
                        });
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("process queries through POST after the server has been shut down and started again", function () {
        const queryObj: JSON =
            JSON.parse(
                JSON.stringify({
                    WHERE: {
                        GT: {
                            courses_avg: 97
                        }
                    },
                    OPTIONS: {
                        COLUMNS: [
                            "courses_dept",
                            "courses_avg"
                        ],
                        ORDER: "courses_avg"
                    }
                }));

        ZIP_FILE_DATA = datasets["courses"];
        try {
            return chai.request(SERVER_URL)
                .put("/dataset/courses/courses")
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then ( () => {
                    server.stop();
                    server = new Server(4321);
                    server.start();
                })
                .then(() => {
                    return chai.request(SERVER_URL)
                        .post("/query")
                        .send(queryObj)
                        .then(function (res: Response) {
                            // some logging here please!
                            expect(res.status).to.be.equal(200);
                            expect(Array.isArray(res.body.result)).to.equal(true);
                        })
                        .catch(function (err: any) {
                            // some logging here please!
                            expect.fail(err);
                        });
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("reject invalid queries", function () {
        const queryObj: JSON =
            JSON.parse(
                JSON.stringify({
                    WHERE: {
                        GT: {
                            courses_avg: 97
                        }
                    }
                }));

        ZIP_FILE_DATA = datasets["courses"];
        try {
            return addCourseDataset()
                .then(() => {
                    return chai.request(SERVER_URL)
                        .post("/query")
                        .send(queryObj)
                        .then(function (res: Response) {
                            // some logging here please!
                            expect.fail("this should have failed :- (");
                        })
                        .catch(function (err: any) {
                            expect(err.status).to.be.equal(400);
                        });
                })
                .catch(function (err: any) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
        }
    });

});
