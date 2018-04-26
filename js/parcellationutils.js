var loadedParcellations = [];
var roiJSON = {
    "HarvardOxfordCortical":[],
    "HarvardOxfordSubcortical":[],
    "JHUWhiteMatter":[],
    "JuelichHistological":[],
    "MNIStructural":[],
    "Talairach":[],
    "OxfordThalamus":[],
    "WoodwardOxfordThalamus":[],
    "WoodwardThalamus":[]
};
var atlasNodeLabels = {
    "HarvardOxfordCortical":[],
    "HarvardOxfordSubcortical":[],
    "JHUWhiteMatter":[],
    "JuelichHistological":[],
    "MNIStructural":[],
    "Talairach":[],
    "OxfordThalamus":[],
    "WoodwardOxfordThalamus":[],
    "WoodwardThalamus":[]
};
var displayROIs = false;
var activeParcellation;
var subjectNetworkJson = {};

function loadParcellation(atlasName){
    console.log("loadParcellation(" + atlasName + ")");

    $("#parcellation-selector").hide();
    $("#active-parcellation").html(atlasName);

    if (loadedParcellations.indexOf(atlasName) == -1) {
        //Get region labels
        var path = "data/atlasxmlfiles/";
        var altasFileName = atlasName == "Talairach" ? "TalairachExtended" : atlasName;

        $.get(path + altasFileName + ".xml", function (data) {
            atlasNodeLabels[atlasName] = $(data).find("label");

            subjectNetworkJson[atlasName] = {};

            if (atlasName === "Talairach"){
                groupTalairachAreas(atlasNodeLabels[atlasName]);
                mapTalairachNodeNamesToGroups(atlasNodeLabels[atlasName]);
            }

            //Load ROI surfaces
            loadROIsForParcellation(atlasName);
        });

        loadedParcellations.push(atlasName);
    }

    //Switch to it
    activeParcellation = atlasName;
}

function loadHierarchy(typeName){
    if (typeName !== currentTalairachRoot) {
        currentTalairachRoot = typeName;

        expandedTalairachSubgroups = [];
        clearTalairachGroups();

        $("#active-hierarchy").html(typeName);
        $("#hierarchy-selector").hide();

        if (current_network) {
            buildGraph();
        }
    }
}

function clearTalairachGroups() {
    subjectChange = true;
    changeNodes = true;
    startPos = 0;
    endPos = 0;

    current_network = fullNetwork;
}

var skippedIDs;
var homogeneities = {};
function loadCorrelationMatrix(subjectName, atlasName, selectThisSubject){
    if (homogeneities[atlasName] === undefined){
        homogeneities[atlasName] = {};
    }

    //Get the homogeneity data first
    atlasabbreviation = "";
    if (atlasName === "Talairach"){
        atlasabbreviation = "tlrc";
    }
    else if(atlasName === "WoodwardOxfordThalamus"){
        atlasabbreviation = "woxt";
    }
    else if(atlasName === "WoodwardThalamus"){
        atlasabbreviation = "wthl";
    }
    else if(atlasName === "HarvardOxfordCortical"){
        atlasabbreviation = "hoc";
    }

    $.get("data/homogeneity/" + atlasabbreviation + "_ReHo_" + subjectName + "_ROI_full.txt" , function(homogeneity_data){
        homogeneities[atlasName][subjectName] = [];
        var tmpH = homogeneity_data.replace("\n", "").split("\t");
        for (var i=0; i<tmpH.length; i++){
            homogeneities[atlasName][subjectName].push(+tmpH[i]);
        }
        

        //Now get the correlations
        $.get("data/Subjects/" + subjectName + "_" + atlasName.toLowerCase() + "_adjacency_matrix_pcc.txt",
        function(network_data){
            console.log("Load: " + subjectName);
            subjectNetworkJson[atlasName][subjectName] = {};
            subjectNetworkJson[atlasName][subjectName]["network"] = [];

            //Test
            selectedSubject1 = subjectName;

            var network_lines = network_data.split("\n");
            var connections;
            skippedIDs = [];
            var idx=0;
            for (var i=0; i<network_lines.length; i++){
                connections = network_lines[i].split("\t");

                //Catch blank lines at the beginning/end of the file
                if (connections[0] != undefined && connections[0] != ""){
                    var node = {"name": atlasNodeLabels[atlasName][i].textContent, //roi_legend[j].region_label,
                        "int_id":idx, //i+1, //roi_legend[j].int_id,
                        "connections":[]};

                    for (var j=0; j<i; j++) {
                        node.connections.push({"name":atlasNodeLabels[atlasName][j].textContent, "correlation":connections[j]});
                    }
                    subjectNetworkJson[atlasName][subjectName]["network"].push(node);

                    idx++;
                }
            }

            if (selectThisSubject){
                selectSubject($("#cb_" + subjectName));
            }
        });
    });
    
}

function loadROIsForParcellation(atlasName){
    console.log("loadROIsForParcellation");
    $(atlasNodeLabels[atlasName]).each(function(){
        var idx = this.getAttribute("index");
        if ( (idx != 0 || activeParcellation !== "Talairach") && this.getAttribute("x") >= 0){
            roiJSON[atlasName][idx] = { "roi": new X.mesh(), "label": this.innerHTML };
            roiJSON[atlasName][idx].roi.file = "data/" + atlasName.toLowerCase() + "/" + idx + ".obj";
            roiJSON[atlasName][idx].roi.opacity = 0.2;
            if (!displayROIs){
                roiJSON[atlasName][idx].roi.visible = false;
            }
            roiJSON[atlasName][idx].roi.color = [Math.random(),Math.random(),Math.random()];

            niftiAll.add(roiJSON[atlasName][idx].roi);

            //Make sure it's not added twice by different parcellations - if the alert shows up, this will need to be done by parcellation
            if (nodeNameToIDDictionary[removeSpecialCharactersFromNodeNameString(roiJSON[atlasName][idx].label)] !== undefined) {
                alert(removeSpecialCharactersFromNodeNameString(roiJSON[atlasName][idx].label) + " already in dictionary. Split into parcellations.");
                console.log(removeSpecialCharactersFromNodeNameString(roiJSON[atlasName][idx].label) + " already in dictionary. Split into parcellations.");
            }
            else{
                nodeNameToIDDictionary[removeSpecialCharactersFromNodeNameString(roiJSON[atlasName][idx].label)] = idx;
            }
        }
    });
}

var subjectClusterMaps = {};
function loadClusterMapForSubject(subjectName){
    if (subjectClusterMaps[subjectName] === undefined){
        subjectClusterMaps[subjectName] = {};
    }
    else{
        console.log("-Subject already loaded.")
    }

    if (subjectClusterMaps[subjectName][activeParcellation] === undefined){
        $.getJSON("data/ClusterRoiMaps/" + subjectName + "_" + activeParcellation + ".txt", function(data){
            //There's only one key, but the name is from source files, so can't figure it out easily and can't reference by index
            var key;
            for (var d in data){
                key = d;
                break;
            }

            subjectClusterMaps[subjectName][activeParcellation] = data[key];
        });
    }
    else{
        console.log("-Subject and parcellation already loaded.")
    }
}

var groupedTalairachAreas = { Hemisphere: {}, Lobe: {}, Gyrus: {}, TissueType: {}, CellType: {} };
function groupTalairachAreas(nodeLabels){
    var split, nodeName;
    for (var i=0; i<nodeLabels.length; i++) {
        if (nodeLabels[i].getAttribute("x") >= 0) { //Ignore extended labels
            nodeName = nodeLabels[i].textContent;
            split = nodeName.split(".");

            if (groupedTalairachAreas.Hemisphere[split[0]] === undefined || groupedTalairachAreas.Hemisphere[split[0]] === null) {
                groupedTalairachAreas.Hemisphere[split[0]] = [];
            }
            if (groupedTalairachAreas.Lobe[split[1]] === undefined || groupedTalairachAreas.Lobe[split[1]] === null) {
                groupedTalairachAreas.Lobe[split[1]] = [];
            }
            if (groupedTalairachAreas.Gyrus[split[2]] === undefined || groupedTalairachAreas.Gyrus[split[2]] === null) {
                groupedTalairachAreas.Gyrus[split[2]] = [];
            }
            if (groupedTalairachAreas.TissueType[split[3]] === undefined || groupedTalairachAreas.TissueType[split[3]] === null) {
                groupedTalairachAreas.TissueType[split[3]] = [];
            }
            if (groupedTalairachAreas.CellType[split[4]] === undefined || groupedTalairachAreas.CellType[split[4]] === null) {
                groupedTalairachAreas.CellType[split[4]] = [];
            }

            var nodeDetails = {
                name: nodeName,
                idx: nodeLabels[i].getAttribute("index"),
                x: nodeLabels[i].getAttribute("x"),
                y: nodeLabels[i].getAttribute("y"),
                z: nodeLabels[i].getAttribute("z")
            };

            groupedTalairachAreas.Hemisphere[split[0]].push(nodeDetails);
            groupedTalairachAreas.Lobe[split[1]].push(nodeDetails);
            groupedTalairachAreas.Gyrus[split[2]].push(nodeDetails);
            groupedTalairachAreas.TissueType[split[3]].push(nodeDetails);
            groupedTalairachAreas.CellType[split[4]].push(nodeDetails);
        }
    }
}

var talairachNodeNamesToGroupJSON = {"Nodes":[]};
function mapTalairachNodeNamesToGroups(nodeLabels){
    var split, nodeName;
    for (var i=0; i<nodeLabels.length; i++) {
        nodeName = nodeLabels[i].textContent;
        split = nodeName.split(".");

        var nodeDetails = {
            name:nodeName,
            hemisphere:split[0],
            lobe:split[1],
            gyrus:split[2],
            tissuetype:split[3],
            celltype:split[4],
            idx:nodeLabels[i].getAttribute("index"),
            x:nodeLabels[i].getAttribute("x"),
            y:nodeLabels[i].getAttribute("y"),
            z:nodeLabels[i].getAttribute("z")
        };

        talairachNodeNamesToGroupJSON.Nodes.push(nodeDetails);
    }
}
