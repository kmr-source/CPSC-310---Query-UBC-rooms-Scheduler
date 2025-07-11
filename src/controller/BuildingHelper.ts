import Log from "../Util";
import DataSetObject from "./DataSetObject";
import * as JSZip from "jszip";
import RoomHelper from "./RoomHelper";
import {InsightDatasetKind} from "./IInsightFacade";
import GeolocationHandler from "./GeolocationHandler";
import BuildingTools from "./BuildingTools";

const fs = require("fs"); 
interface IBuildingAttributes {
    fullName: string;
    shortName: string;
    address: string;
    lat: number;
    lon: number;
}

interface GeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}
const parse5 = require("parse5");

interface IDataType { [index: string]: string | number; }
interface IRoomAttributes {
    number: string;
    seats: string;
    type: string;
    furniture: string;
    href: string;
}

export default class BuildingHelper {

    private readonly dataId: string;
    private kind = InsightDatasetKind.Rooms;

    constructor(dataId: string) {
        this.dataId = dataId;
        return;
    }

    public getRoomDataObjectArray(html: any, theZip: JSZip): Promise<DataSetObject[]> {
        // Array<childNodes>
        // add it all into my IRoomObject ---> parse to Json and put it in the DataSetObject Array
        // gives me a document obj
        let result: Array<Promise<DataSetObject>> = [];
        let tableArr: any[] = [];
        let h = html;
        // Log.trace(h);
        let document = parse5.parse(html);
        // let buildingsData = this.getBuildings(document);
        let table = BuildingTools.getTable(document.childNodes, "table");
        let searchTerms: {code: string, address: string, building: string} = { code: null,
            address: null, building: null};
        let thread = BuildingTools.getThreadTr(table);
        searchTerms = BuildingTools.getIndexSearchTerms(thread, this.setSearchTermsForIndex);
        // these are okay
        let tbody = BuildingTools.getTable(table.childNodes, "tbody");
        // loop to compute buildings (this is the array of children)
        for (const childIndex in tbody.childNodes) {
            // grabs indexs from Array of children of tbody
            let child: Node = tbody.childNodes[childIndex];
            if (child.nodeName === "tr") {
                // traverse and grab select td element (correct attribute name)
                // creat dataset obj
                result.push(this.getBuildingsObject(child, searchTerms, theZip));
            }
        }
        return Promise.all(result).then((arr) => {
            return arr.filter((element) => element !== null);
        });
    }

    // to get the attribute value
    // https://www.w3schools.com/jsref/prop_html_classname.asp
    // var x = document.getElementsByClassName("mystyle")[0].className; ==> returns classname = mystyle
    // var y = document.getID("myDiv").className => returns className == mystyle

    // http://cs310.students.cs.ubc.ca:11316/api/v1/project_team<TEAM NUMBER>/<ADDRESS>
    // every null throw error...
    // object is to define values for address, shortname and longName
    private getBuildingsObject(trNode: Node, searchTerms:
        { code: string; address: string; building: string },
                               theZip: JSZip): Promise<DataSetObject> {
        if (trNode.childNodes.length === 0) {
            return null;
        }
        let address: string;
        let shortName: string;
        let longName: string;
        for (const child in trNode.childNodes) {
            let trChild: any = trNode.childNodes[child];
            if (trChild.nodeName === "td") {
                let value = BuildingTools.getNodeValue(trChild);
                value = BuildingTools.cleanValue(value);
                if (value === searchTerms.code) {
                    shortName = BuildingTools.getTextNodeValue(trChild);
                }  else if (value === searchTerms.address) {
                    address = BuildingTools.getTextNodeValue(trChild);
                } else if (value === searchTerms.building) {
                    longName = this.setLongName(trChild);
                }
            }
        }
        let geoLocator = new GeolocationHandler();
        let roomHelper = new RoomHelper();
        return geoLocator.getLocation(address).then((geoResponse: GeoResponse) => {
            // TODO: ERROR MSG///AHHHMAYBE
            if (geoResponse === null) {
                return Promise.resolve(null);
            } else {
                const buildingAttr: IBuildingAttributes = {
                    fullName: longName, shortName: shortName,
                    lat: geoResponse.lat, lon: geoResponse.lon, address: address
                };

                return roomHelper.parseBuilding(shortName, theZip).then((result) => {
                    return this.buildRoomDataSetObj(result, buildingAttr);
                });
            }
        });
    }

    private setSearchTermsForIndex = (searchTerms: { code: string; address: string; building: string },
                                      value: string, child: any) => {
        if (value === "Code") {
            searchTerms.code = BuildingTools.getNodeValue(child);
        } else if (value === "Address") {
            searchTerms.address = BuildingTools.getNodeValue(child);
        } else if (value === "Building") {
            searchTerms.building = BuildingTools.getNodeValue(child);
        }
    }

    private setLongName(trChild: Node): string {
        for (const i in trChild.childNodes) {
            if (trChild.childNodes[i].nodeName === "a") {
                let aChild: any = trChild.childNodes[i];
                let value = BuildingTools.getTextNodeValue(aChild);
                return BuildingTools.cleanValue(value);
            }
        }
    }

    private buildRoomDataSetObj(roomAttr: IRoomAttributes[], buildingAttr: IBuildingAttributes): DataSetObject {
        let resultDataSetObj: DataSetObject;
        let room: IDataType;
        if (roomAttr === null) { // is invalid
            return null;
        }
        let shortName: string = buildingAttr.shortName;
        let contents: { [index: string]: IDataType[]};
        contents = {result: []};
        for (const ra of roomAttr) {
            room = {};
            if (ra.seats === undefined || ra.seats === null || ra.seats === "") {
                room["seats"] = "0";
            } else {
                room["seats"] = ra.seats;
            }
            room["fullname"] = buildingAttr.fullName;
            room["shortname"] = buildingAttr.shortName;
            room["number"] = ra.number;
            room["name"] = shortName + "_" + ra.number;
            room["address"] = buildingAttr.address;
            room["lat"] = buildingAttr.lat;
            room["lon"] = buildingAttr.lon;
            room["type"] = ra.type;
            room["furniture"] = ra.furniture;
            room["href"] = ra.href;
            contents["result"].push(room);
        }
        let contentsStr = JSON.stringify(contents);
        resultDataSetObj = new DataSetObject(this.dataId, buildingAttr.shortName, contentsStr, this.kind);
        return resultDataSetObj;
    }
}
