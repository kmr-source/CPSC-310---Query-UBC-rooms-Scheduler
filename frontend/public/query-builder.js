/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let query = {};
    // grabs the info i need
    const obj = document.querySelector(".tab-panel.active > form");
    // gets me the data type either courses or rooms
    const nameDataset= obj.getAttribute("data-type");
    let where;
    let options = {};
    let columns;
    let order;
    let apply;
    let group;
    group = getGroups(query,nameDataset,obj);
    apply = getApply(query, nameDataset, obj);
    order = getOrder(query,nameDataset,obj);
    where = getWhere(nameDataset,query,obj);
    columns = getColumnsKeyArray(query,nameDataset,obj);
    // query["WHERE"] = where;
    options["COLUMNS"] = columns;
    query["OPTIONS"] = options;
    if (order.length !== 0) {
        options["ORDER"] = {dir: null, keys: null};
        options["ORDER"]["dir"] = getDirection(query,nameDataset,obj);
        if (order.length === 1) {
            options["ORDER"]["keys"] = [order[0]];
        } else if (order.length > 1) {
            options["ORDER"]["keys"] = order;
        }
    }
    if (apply.length === 0 && group.length ===0) {
        return query;
    }
    if (apply.length !== 0 && group.length !==0 ) {
        let qq = {GROUP:[], APPLY: []};
        query["TRANSFORMATIONS"] = qq;
        // query["TRANSFORMATIONS"]["GROUP"] = group;
        // query["TRANSFORMATIONS"]["APPLY"] = apply;
        query.TRANSFORMATIONS.APPLY = apply;
        query.TRANSFORMATIONS.GROUP = group;
    }
    return query;
};
    // TODO: store the 5 order, column, group, transformation, conditons
    // document.getElementById("courses-columns-field-title");

    function getWhere(dataSetName, query, objWithData) {
        // condition All, any, and none gets tall the top bars
        let filterValues = [];
        let whereObjArr = objWithData.getElementsByClassName("control-group condition");
        let logicAll = objWithData.querySelector("input[value=all][checked]");
        let logicAny = objWithData.querySelector("input[value=any][checked]");
        let logicNone =  objWithData.querySelector("input[value=none][checked]");
        query["WHERE"] = {};
        if (whereObjArr.length === 1) {
            if (logicNone) {
                query["WHERE"]["NOT"]= buildConditionObj(whereObjArr[0],dataSetName);
                return query;
            }
            query["WHERE"] = buildConditionObj(whereObjArr[0],dataSetName);
            return query;

        } else if (whereObjArr.length >1) {
            if (logicNone) {
                let qq = {NOT:{OR:[]}};
                query["WHERE"] = qq;
                for (let e of whereObjArr) {
                    query["WHERE"]["NOT"]["OR"].push(buildConditionObj(e,dataSetName));
                }
                return query;
            }else if (logicAll) {
                query["WHERE"] = {AND:[]};
                for (let e of whereObjArr) {
                    query["WHERE"]["AND"].push(buildConditionObj(e, dataSetName));
                }
                return query;

            }else if (logicAny) {
                query["WHERE"]["OR"] =[];
                for (let e of whereObjArr) {
                    query["WHERE"]["OR"].push(buildConditionObj(e, dataSetName));
                }
                return query;
            }
            return query;
        }
    }
    function buildConditionObj(whereConditions, datasetName){
        let whereField = whereConditions
            .querySelector(".control.fields > select > option[selected]")
            .getAttribute("value");
        // GT , IS ET string
        let comparisonOperator = whereConditions
            .querySelector(".control.operators > select > option[selected]")
            .getAttribute("value");
        // value 50, 60 , 80 etc
        let keyValue = whereConditions.getElementsByClassName("control term")[0]
            .children[0].value;
        // dataset name like course or rooms + field (string name of what we are searching)
        // NOT BUTTON
        let bodyNameKey = datasetName + "_" + whereField;
        let controlNot = getControlNot(whereConditions);
        let body = {};
        let conditionObj = {};
        if (isNaN(parseFloat(keyValue))) {
            body[bodyNameKey] = keyValue;
        } else {
            body[bodyNameKey] = parseFloat(keyValue);
        }
        conditionObj[comparisonOperator] = body;
        if (controlNot) {
            return {NOT: conditionObj};
        } else {
            return conditionObj;
        }

    }
    function getControlNot(wherecondition) {
        let pathNot = wherecondition.getElementsByClassName("control not")[0].children[0].checked;
        if (pathNot) {
            return true;
        }
        return false;
    }
    // returns array of keys for Grouping
    function getGroups(query,datasetname,obj) {
        // is there always a group? or not?
        //let groupArr = obj.getElementsByClassName("form-group groups")[0];
        //let groupElem = groupArr.getElementsByClassName("control-group")[0];
        //let groupElemArr = groupElem.getElementsByClassName("control field");
        let groupArray = obj.querySelectorAll(".form-group.groups .control.field input[checked]")
        const gArrKeys = [];
        for (let i of groupArray) {
            let value = i.getAttribute("value");
            gArrKeys.push(datasetname + "_" + value);
        }
        // for (let i in groupArray) {
        //     // TODO: FIX ERROR OF TYPE
        //     let value = groupArray[i].querySelector("input[checked=checked]").getAttribute("value");
        //     gArrKeys.push(value);
        // }
        return gArrKeys;
    }
    // gets all the keys being used  (nothing changed)
    function getColumnsKeyArray(query,datasetname,obj) {
        let orderKeysArr = [];
        // get keys from column
        let columnArrayTranElem = obj.querySelectorAll(".form-group.columns .control.field input[checked]");
        let columnTrans = obj.querySelectorAll(".form-group.columns .control.transformation input[checked]");
        if (columnArrayTranElem.length === 0 && columnTrans.length === 0) {
            return orderKeysArr;
        }
        // get the normal column keys
        for (let i of columnArrayTranElem) {
            let value = i.getAttribute("value");
            value = datasetname + "_" + value;
            orderKeysArr.push(value);
        }
        // get Transform keys
        for (let i of columnTrans) {
            let value = i.getAttribute("value");
            orderKeysArr.push(value);
        }
        return orderKeysArr;
    }

    function getApply(query, datasetname, obj) {
        let applyArr = [];
        let field = " ";
        let operator = " ";
        let key = " ";
        let applyTransArray = obj.querySelectorAll(".control-group.transformation");
        for (let elem of applyTransArray) {
            if (elem !== null) {
                key = elem.querySelector("input[type]").value;
            }
            let applyObj = {};
            operator = elem.getElementsByClassName("control operators")[0]
                .querySelector("option[selected]").value;;
            field = elem.getElementsByClassName("control fields")[0]
                .querySelector("option[selected]").value;
            let fieldKey = datasetname + "_" + field;
            applyObj[key] = {};
            applyObj[key][operator] = fieldKey;
            applyArr.push(applyObj);
        }
        return applyArr;
    }

    function getDirection(query,datasetname,obj) {
        let descendElement = obj.getElementsByClassName("form-group order")[0]
            .getElementsByClassName("control-group")[0]
            .getElementsByClassName("control descending")[0];
        let descendCheck = descendElement.querySelector("input[checked=checked]");
        let descend = null;
        if (descendCheck!== null) {
            descend = "DOWN";
        } else if (descend === null) {
            descend = "UP";
        }
        return descend;
    }

    function getOrder(query,datasetname,obj) {
        let optionElemArr = obj.getElementsByClassName("control order fields")[0]
            .getElementsByTagName("select")[0];
        let finalOrderArr = [];
        for (let elem of optionElemArr) {
            if (elem.selected) {
                if (elem.className === "transformation") {
                    finalOrderArr.push(elem.value);
                } else {
                    let value = datasetname + "_" + elem.value;
                    finalOrderArr.push(value);
                }
            }
        }
        return finalOrderArr;
    }
