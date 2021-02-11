import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import GeolocationHandler from "../src/controller/GeolocationHandler";
import Scheduler from "../src/scheduler/Scheduler";
import {SchedRoom, SchedSection} from "../src/scheduler/IScheduler";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}
describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
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
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });
    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, err);
        });

    });
    it("Should add a valid ROOM dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, err);
        });

    });

    // checking adding invalid beginning json file dataset (invalidB)
    it("Should add invalidB dataset", function () {
        const id: string = "invalidB";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    // invalidBM
    it("Should add courses2 dataset", function () {
        const id: string = "oneFile";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, err);
        });
    });

    // invalidDirectoryName
    it("Should not add invalid Directory Dataset", function () {
        const id: string = "invalidDirectoryName";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // invalidEnd - should add to dataset
    it("Should add invalidEnd Dataset", function () {
        const id: string = "invalidEnd";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    // invalidMid
    it("Should add invalidMid Dataset", function () {
        const id: string = "invalidMid";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    // noCourseDirectory (noCourse)
    it("Should not add no Course Directory invalid dataset", function () {
        const id: string = "noCourse";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add no Course Directory invalid dataset", function () {
        const id: string = "noCourse";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then(() => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add invalid JSON dataset", function () {
        const id: string = "notJson";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // checking adding noValidCourse fails
    it("Should not add notValidCourse dataset", function () {
        const id: string = "noValidCourse";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            expect.fail();
        }).catch((err: any) => {
            // catches error throws nothing
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // oneValidCourse
    it("Should add oneValidCourse dataset", function () {
        const id: string = "oneValidCourse";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            // catches error throws nothing
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    // checking adding invalid picture dataset
    it("Should not add invalid picture dataset", function () {
        const id: string = "pictureData";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result);
        }).catch((err: any) => {
            // catches error throws nothing
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should be able to remove dataset", function () {
        const id: string = "courses";
        const expected: string = id;

        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((p) => {
            return insightFacade.removeDataset(id);
        }).then((result: string) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, err);
        });
    });

    // adding a dataset that does not exist
    it("Should not be able to add nonexisting dataset", function () {
        const id: string = "123";

        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // adding a Empty dadtaset testing ListDataSets
    it("Should Empty dataset", function () {
        return insightFacade.listDatasets().then((result: InsightDataset[]) => {
            return expect(result).to.be.empty;
        }).catch((err: any) => {
            expect.fail();
        });
    });

    // adding a Not empty dataset testing ListDataSets
    it("Should be able to have a Full List  dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];

        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            // expect(result).to.deep.equal(expected);
            expect((result[0].kind) === InsightDatasetKind.Courses);
            expect(((result[0]).numRows) === 64612);
            expect((result[0].id) === id);
            let v = result[0].numRows;
            Log.info(v + "hello");
        }).catch((err: any) => {
            expect.fail(err);
        });
    });

    it("Should be able to have a Full List ROOM  dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];

        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then(() => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            // expect(result).to.deep.equal(expected);
            // expect((result[0].kind) === InsightDatasetKind.Rooms);
            // expect(((result[0]).numRows) === 364);
            // expect((result[0].id) === id);
            let v = result[0].numRows;
            Log.info(v + "123");
        }).catch((err: any) => {
            expect.fail(err);
        });
    });

    // adding a dataset who's Id string is spaces should fail
    it(
        "Should not be able to add space ID dataset", function () {
        const id: string = " ";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // adding Duplicate dataset
    it("adding Duplicate dataset", function () {
        const id: string = "invalidB";
        const expected: string [] = [id];

        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        }).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // TODO: check the zip file one .... assertion for addData
    it("Adding pdf to dataset", function () {
        const id: string = "pdfFile";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // Add Multiple DataSets and Invalid DataSets
    // TODO: FIX THE FILES :D
    it("Adding multiple dataset", function () {
        const id1: string = "invalidB";
        const id2: string = "invalidBM";
        const pdfId: string = "pdfFile";
        const expected: string[] = [id1, id2, pdfId];

        return insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses).then(() => {
            return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
        }).then(() => {
            return insightFacade.addDataset(pdfId, datasets[pdfId], InsightDatasetKind.Courses);
        }).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "shouldn not have failed");
        });
    });

    // REMOVING DATASET TWICE (expect error)
    it("Remove same dataset Twice", function () {
        const id: string = "courses";

        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            return insightFacade.removeDataset(id);
        }).then(() => {
            return insightFacade.removeDataset(id);
        }).then((result: string) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);
        });
    });

    // REMOVING SPACE dataSet throw InsightError
    it("Should not be able to remove dataset", function () {
        const id: string = "_";
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not be able to remove space dataset", function () {
        const id: string = " ";
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not be able to remove NULL dataset", function () {
        const id: string = null;
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not be able to remove _  (underscore) dataset", function () {
        const id: string = "_";
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // should not be able to Add NULL dataSet
    it("Should not be able to add Null dataset", function () {
        const id: string = null;
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // should not be able to remove id if not yet add (NotFoundError)
    it("Should not be able to remove not yet added ID into dataset", function () {
        const id: string = "courses";
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result);
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);
        });
    });

    it("Should be able to geolocate", function () {
        let geo = new GeolocationHandler();
        let address = "2360 East Mall V6T 1Z3";
        let expected: any = null;
        return geo.getLocation(address).then((result: any) => {
            // expect(result).to.deep.equal(expected);
           // Log.trace(result.coords.latitude);
            Log.trace(result);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should NOT BE ABLE TO geolocate", function () {
        let geo = new GeolocationHandler();
        let address = "2360 Esgg h Mall V66 1Z3";
        let expected: any = null;
        return geo.getLocation(address).then((result: any) => {
            // expect(result).to.deep.equal(expected);
            Log.trace(result);
            expect.fail(result);
        }).catch((err: any) => {
            expect(err);
        });
    });

    it("Should schedule courses", function () {
        let sections = [
            {courses_dept: "cpsc", courses_id: "340", courses_uuid: "1319", courses_pass: 101, courses_fail: 7,
                courses_audit: 2
            },
            {courses_dept: "cpsc", courses_id: "340", courses_uuid: "3397", courses_pass: 171, courses_fail: 3,
                courses_audit: 1
            },
            {courses_dept: "cpsc", courses_id: "344", courses_uuid: "62413", courses_pass: 93, courses_fail: 2,
                courses_audit: 0
            },
            {courses_dept: "cpsc", courses_id: "344", courses_uuid: "72385", courses_pass: 43, courses_fail: 1,
                courses_audit: 0
            }
        ];

        let rooms = [
            {rooms_shortname: "AERL", rooms_number: "120", rooms_seats: 144, rooms_lat: 49.26372, rooms_lon: -123.25099
            },
            {rooms_shortname: "ALRD", rooms_number: "105", rooms_seats: 94, rooms_lat: 49.2699, rooms_lon: -123.25318
            },
            {rooms_shortname: "ANGU", rooms_number: "098", rooms_seats: 260, rooms_lat: 49.26486, rooms_lon: -123.25364
            },
            {rooms_shortname: "BUCH", rooms_number: "A101", rooms_seats: 275, rooms_lat: 49.26826, rooms_lon: -123.25468
            }
        ];
        const scheduler = new Scheduler();
        const result = scheduler.schedule(sections, rooms);
        let resultSections: SchedSection[] = [];
        let resultRooms: SchedRoom[] = [];
        for (let r of result) {
            resultSections.push(r[1]);
            resultRooms.push(r[0]);
        }
        const eScore = scheduler.EScore(resultSections, sections);
        const dScrore = scheduler.DScore(resultRooms);
        const score = scheduler.computeScore(dScrore, eScore);
        const s = score;
    });
    it("Should schedule our courses/rooms", function () {
        // from https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
        function hackyRandom(seed: number) {
            let x = Math.sin(seed) * 100;
            return Math.abs(x - Math.floor(x)) * 100;
        }
        const randSeed = 279;
        const numOfSections = 50;
        const numOfRooms = 10;
        let sections: SchedSection[] = [];
        let rooms: SchedRoom[] = [];
        for (let i = 0; i < numOfSections; i ++ ) {
            let j = i % 3 === 0 ? -1 : i;
            j = i % 7 === 0 ? -2 : i;
            sections.push({courses_dept: "dept:" + j, courses_id: "id:" + i, courses_uuid: "AAAHHH",
                courses_pass: hackyRandom(randSeed + i), courses_fail: hackyRandom(randSeed + i + 2),
                courses_audit: hackyRandom(randSeed + i + 3)});
        }
        for (let i = 0; i < numOfRooms; i ++ ) {
            let j = i % 2 === 0 ? 0 : i / 10000;
            j = i % 3 === 0 ? 0 : j;
            j = i % 6 === 0 ? 0.0001 : j;
            rooms.push({rooms_shortname: "name:" + i, rooms_number: "number:" + i,
                rooms_seats: hackyRandom(randSeed + i) * 3,
                rooms_lat: 49.26826 + j, rooms_lon: -123.25468 + j
            });
        }

        const scheduler = new Scheduler();
        const result = scheduler.schedule(sections, rooms);
        let resultSections: SchedSection[] = [];
        let resultRooms: SchedRoom[] = [];
        for (let r of result) {
            resultSections.push(r[1]);
            resultRooms.push(r[0]);
        }
        const eScore = scheduler.EScore(resultSections, sections);
        const dScrore = scheduler.DScore(resultRooms); // old: 0.06774141400309965
        const score = scheduler.computeScore(dScrore, eScore);
        let s = score; // old: 0.867622417135161
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: any } = {
        courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        rooms: {id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
    };
    let insightFacade: InsightFacade = new InsightFacade();
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises);
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
});
