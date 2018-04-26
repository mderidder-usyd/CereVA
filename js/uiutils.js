var loadingGif = $("#loadingGif");
var bundle_edges = true;
var split_graph = false;
var displayLowThreshold = false;
var visible_nodes = [];
//For drag selection
var selectedEls = [];
var selectedNodeNames = [];
var binnedNodeNames = [];

function highlightBrainRegionForNode(node_name, node_id, neighbours, neighboursColour){
    console.log("highlightBrainRegionForNode(" + node_name + ", " + node_id + ", " + neighbours + ")");
    //Show the selected node in green
    roiJSON[activeParcellation][node_id].roi.color = [0,1,0];
    roiJSON[activeParcellation][node_id].roi.visible = true;
    roiJSON[activeParcellation][node_id].roi.opacity = 0.2;
    visible_nodes.push(roiJSON[activeParcellation][node_id].roi);

    //Don't know why X is addition and Y/Z are subtraction... Something to do with IJK2RAS as it flips changes the orientation to be in LAS mode or similar
    var centroid = roiJSON[activeParcellation][node_id].roi.points._centroid;
    brain.indexX = 128 + Math.floor(parseFloat(centroid[0]));
    brain.indexY = 128 - Math.floor(parseFloat(centroid[1]));
    brain.indexZ = 128 - Math.floor(parseFloat(centroid[2]));

    console.log("neighbours.length: " + neighbours.length);

    for (var i=1; i<neighbours.length; i++){
        var nname = removeSpecialCharactersFromNodeNameString( neighbours[i] ).replace("-1", ""); //-1 is added if the neighbour is earlier in the radial
        var nbrID = nodeNameToIDDictionary[nname];

        //Ensure this isn't a click on the diagonal in the matrix
        if (nbrID !== node_id && roiJSON[activeParcellation][nbrID] !== undefined) {
            console.log("neighboursColour" + neighboursColour);

            //Show all other nodes in red or neighboursColour
            if (neighboursColour){
                roiJSON[activeParcellation][nbrID].roi.color = neighboursColour;
            }
            else{
                roiJSON[activeParcellation][nbrID].roi.color = [1, 0, 0];
            }
            roiJSON[activeParcellation][nbrID].roi.visible = true;
            visible_nodes.push(roiJSON[activeParcellation][nbrID].roi);
        }
    }

    selectedNodeName = node_name;
    selectedNodeID = node_id;
    selectedNodeNeighbours = neighbours;
}

function clearHighlightedBrainRegions(){
    //Clear currently visible nodes
    if (visible_nodes){
        for (var i=0; i<visible_nodes.length; i++){
            visible_nodes[i].visible = false;
        }
        visible_nodes = [];
    }
}

function toggleSurfaceMesh(button_num){
    switch(button_num){
        case 0: //L Pial
            l_pial.visible = !l_pial.visible;
            break;
        case 1: //R Pial
            r_pial.visible = !r_pial.visible;
            break;
        case 2: //L SmoothWM
            l_smoothwm.visible = !l_smoothwm.visible;
            break;
        case 3: //R SmoothWM
            r_smoothwm.visible = !r_smoothwm.visible;
            break;
        case 4:
            brain.opacity == 0 ? brain.opacity = 1 : brain.opacity = 0;
            break;
        case 5:
            toggleROIAtlas();
            break;
    }
}

var display_rois = false;

var centroidsWithLabels = "";

var percentColors = [
    { pct: 0.0, color: { r: 0xff, g: 0x00, b: 0 } },
    { pct: 0.5, color: { r: 0xff, g: 0xff, b: 0 } },
    { pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } } ];

function getColorForPercentage(pct) {
    for (var i = 1; i < percentColors.length - 1; i++) {
        if (pct < percentColors[i].pct) {
            break;
        }
    }
    var lower = percentColors[i - 1];
    var upper = percentColors[i];
    var range = upper.pct - lower.pct;
    var rangePct = (pct - lower.pct) / range;
    var pctLower = 1 - rangePct;
    var pctUpper = rangePct;
    var color = {
        r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
        g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
        b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
    };
    return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
    // or output as hex if preferred
}  

function toggleROIAtlas(){
    display_rois = !display_rois;
    //The checkbox is diabled until this is loaded, but checking anyway
    if (roi_legend){
        for (var i=0; i<roi_legend.length; i++){
            roiJSON[roi_legend[i].int_id].roi.color = [0,0,1]; //Colour gets updated on node click, etc, so doesn't matter that it's set when turning this off
            roiJSON[roi_legend[i].int_id].roi.visible = display_rois;

            console.log(roi_legend[i]);
            var centroid = roiJSON[roi_legend[i].int_id].roi.points._centroid;
            centroidsWithLabels += centroid[0].toFixed(2) + "\t" + centroid[1].toFixed(2) + "\t" + centroid[2].toFixed(2) + "\t" + roi_legend[i].region_label + "\n";
        }

        //Set other meshes to not visible if displaying ROIs and ensure checkboxes match
        if (display_rois){
            l_pial.visible = false;
            r_pial.visible = false;
            l_smoothwm.visible = false;
            r_smoothwm.visible = false;

            $("#display_l_pial").prop("checked", false);
            $("#display_r_pial").prop("checked", false);
            $("#display_l_smoothwm").prop("checked", false);
            $("#display_r_smoothwm").prop("checked", false);
            $("#display_roi_atlas").prop("checked", true);
        }
        else{
            l_pial.visible = true;
            r_pial.visible = true;
            l_smoothwm.visible = false;
            r_smoothwm.visible = false;

            $("#display_l_pial").prop("checked", true);
            $("#display_r_pial").prop("checked", true);
            $("#display_l_smoothwm").prop("checked", false);
            $("#display_r_smoothwm").prop("checked", false);
            $("#display_roi_atlas").prop("checked", false);
        }
    }
}

/**@param binSelected Refers to binning the elements within the recangle selection if true, and all but those selected if false*/
function binSelectedItems(binSelected){
    $("#binnedList").html("");
    if (selectedNodeNames.length > 0){
        if (binSelected){
            binnedNodeNames.push.apply(binnedNodeNames, selectedNodeNames); //Join

            console.log("binnedNodeNames");
            console.log(binnedNodeNames);

            updateBinnedList();
        }
        else{
            var allNodes;
            switch(currentGraphType){
                case CIRCLE_GRAPH:
                    allNodes = $("text");
                    break;
                case MATRIX_GRAPH:
                    allNodes = $("text");
                    break;
                case HISTOGRAM_GRAPH:
                    allNodes = $("rect");
                    break;
            }

            $(allNodes).each(function(){
                var nodeName;
                switch(currentGraphType){
                    case CIRCLE_GRAPH:
                        nodeName = $(this).html();
                        break;
                    case MATRIX_GRAPH:
                        nodeName = $(this).html();
                        break;
                    case HISTOGRAM_GRAPH:
                        nodeName = $(this).attr("id");
                        break;
                }



                if (selectedNodeNames.indexOf(nodeName) == -1 && nodeName != undefined){
                    binnedNodeNames.push(nodeName);
                }
            });
        }
        buildGraph();
    }
    else{
        $("#binnedList").html("None");
    }

    updateBinnedList();

    clearSelection();
}

function updateBinnedList(){
    $("#binnedList").html("");
    $(binnedNodeNames).each(function(){
        $("#binnedList").append("<input type='checkbox' class='cb_bin' id='bin_" + this + "' /><label for='bin_" + this + "' >" + this + "</label><br />");
    });
}

function clearSelection(){
    $('#dragSelectMenu').hide()
    for (var i=0; i<selectedEls.length; i++){
        $(selectedEls[i]).removeAttr("class", "selected");
    }

    selectedNodeNames = [];
    selectedEls = [];
}

function returnNodes(){
    $(".cb_bin").each(function(){
        if ($(this).is(":checked")){
            var id = $(this).attr("id");
            var nodeName = id.substring(4, id.length);
            binnedNodeNames = jQuery.grep(binnedNodeNames, function(value) {
                return value != nodeName;
            });
        }
    });

    updateBinnedList()
    buildGraph();
}

function selectAllNodes(){
    console.log("selectAllNodes()");
    $("input[type=checkbox]").each(function(){
        $(this).prop("checked", true);
    });
}

var selectedNode1, selectedNode2;
function nodeClick(node){
    if (split_graph){
        resetParamsToForceNodeGroupingToBeRebuilt();
    }

    if (activeParcellation === "Talairach" && node.int_id > 1105){
        talairachGroupNodeClick(node);
        return;
    }

    //Clear node and edge colours
    $(".node:not(.talairachGroupNode)").attr("class", "node");
    $(".talairachGroupNode").attr("class", "node talairachGroupNode");
    $(".link").attr("class", "link");

    clearHighlightedBrainRegions();
    clearHighlightedLineProfiles();
    $("#roi-details").html("");

    //Deselect node
    if (node == selectedNode1) {
        selectedNode1 = selectedNode2;
        selectedNode2 = null;
        if (selectedNode1 == null){
            return;
        }
        node = selectedNode1;
    }
    else if (node == selectedNode2){
        selectedNode2 = null;
        node = selectedNode1;
        //return;
    }
    else if ($("#active-click-mode").html() === "Single" || selectedNode1 == null) {
        selectedNode1 = node;
    }

    var neighbours = highlightNodesAndEdges(selectedNode1, "");

    var selectedNode2ColourModifier = null;
    if ($("#active-click-mode").html() === "Double" && selectedNode1 !== node){
        //Double select mode: Show all edges (in two different colours), but only highlight the two nodes on the brain
        selectedNode2 = node;

        highlightNodesAndEdges(selectedNode2, "2");

        neighbours = [selectedNode1.name, selectedNode2.name];

        selectedNode2ColourModifier = [0.6, 0, 0.6];
    }

    highlightBrainRegionForNode(selectedNode1.name, selectedNode1.int_id, neighbours, selectedNode2ColourModifier);
    loadLineProfilesForNodes(selectedNode1, selectedNode2);
}

function talairachGroupNodeClick(node){
    expandedTalairachSubgroups.push(node);

    changeNodes = true;
    buildGraph();
}

function highlightNodesAndEdges(node, theNumberTwo){
    if (node === undefined || node === null){
        return;
    }

    var selector = split_graph ? ("#" + split_graphDiv.attr("id") + " ") : "";
    console.log("selector: " + selector);

    var neighbourNames = [];

    //First object is source, the rest are targets
    neighbourNames.push(node.name);

    //Highlight edges
    var edges = split_graph ? edgeDictionary[split_graphDiv.attr("id")] : edgeDictionary;

    for (var edge in edges) {
        if (edge.indexOf(removeSpecialCharactersFromNodeNameString(node.name)) > -1) {
            $("#" + edge).attr("class", "link link" + theNumberTwo + "--target");

            var edgeNodes = edge.split("---");
            if (edgeNodes[0] === removeSpecialCharactersFromNodeNameString(node.name)) {
                neighbourNames.push(edgeNodes[1]);
            }
            else {
                neighbourNames.push(edgeNodes[0]);
            }
        }
    }

    //Highlight nodes
    for (var i = 0; i < neighbourNames.length; i++) {
        var nName = removeSpecialCharactersFromNodeNameString(neighbourNames[i]);
        var currClass = $("#" + nName).attr("class");

        if (nName.length > 0) {
            if (i == 0) {
                $(selector + "#" + nName).attr("class", currClass + " node" + theNumberTwo + "--source");
            }
            else {
                $(selector + "#" + nName).attr("class", currClass + " node" + theNumberTwo + "--target");
            }
        }
    }

    return neighbourNames;
}

// Slightly edited to allow multiple selectors from: http://stackoverflow.com/questions/4002059/get-dom-elements-inside-a-rectangle-area-of-a-page
// x1, y1 would be mouse coordinates onmousedown
// x2, y2 would be mouse coordinates onmouseup
// all coordinates are considered relative to the document
function rectangleSelect(selector, x1, y1, x2, y2) {
    var elements = [];
    var selectors = selector.split(" ");

    $(selectors).each(function(i, sel){
        jQuery(sel).each(function() {
            var $this = jQuery(this);
            var offset = $this.offset();
            var x = offset.left;
            var y = offset.top;
            var w = $this.width();
            var h = $this.height();

            //This element fits inside the selection rectangle
            //And it's not the tooltip or tooltip-background
            if (x >= x1 && y >= y1 && x + w <= x2 && y + h <= y2
                && $this.attr("class").indexOf("tooltip") == -1) {
                elements.push($this.get(0));
            }
        });
    });

    return elements;
}

function loadColourPickers(){
    $("#colour-high1").colorPicker({
        onColorChange : function(id, newValue) {
            updateEdgeColours();
        }
    });
    $("#colour-high2").colorPicker({
        onColorChange : function(id, newValue) {
            updateEdgeColours();
        }
    });
    $("#colour-low").colorPicker({
        onColorChange : function(id, newValue) {
            updateEdgeColours();
        }
    });

    $("#colour-positiveoutlier").colorPicker({
        onColorChange : function(id, newValue) {
            $(".high-outlier").css("background-color", newValue);
        }
    });

    $("#colour-negativeoutlier").colorPicker({
        onColorChange : function(id, newValue) {
            $(".low-outlier").css("background-color", newValue);
        }
    });
}

function toggleCharacteristics(subject){
    console.log(subject);
    $("#lbl_" + subject).toggle();
}

function toggleLowThreshold(){
    displayLowThreshold = !displayLowThreshold;
    if (current_network){
        var vals = $( "#correlation-range" ).slider("option", "values");
        buildGraph(current_network, vals[0]/100, vals[1]/100);
    }
}

function toggleEdgeBundling(){
    bundle_edges = !bundle_edges;
    if (current_network){
        var vals = $( "#correlation-range" ).slider("option", "values");
        buildGraph(current_network, vals[0]/100, vals[1]/100);
    }
}

function toggleSplitGraph(){
    split_graph = !split_graph;

    if (!split_graph){
        changeNodes = true;
        startPos = 0;
        endPos = 0;
        $("#active-subjects").html(selectedSubject1);
        split_graphDiv = null;
    }
    else{
        $("#correlation-range").hide();
    }

    if (current_network){
        changeNodes = true;
        startPos = 0;
        endPos = 0;
        buildGraph(fullNetwork);
    }

    $("#settingsBox").hide();
}

function toggleSelectionPanel(){
    $("#selectionButton").toggle();
    $("#selectionPanel").toggle();
}

function toggleMeshOptionsPanel(){
    var meshOptionsButton = $("#meshOptionsButton");
    if (meshOptionsButton.css("left") == "0px"){
        meshOptionsButton.css("left", "300px"); //width of panel
        meshOptionsButton.html("<br />&lt;&lt;<br /><br />");
    }
    else{
        meshOptionsButton.css("left", "0px"); //width of panel
        meshOptionsButton.html("<br />&gt;&gt;<br /><br />");
    }
    $("#meshOptionsPanel").toggle();
}

function toggleSelectionMode(){
    var currModeLabel = $("#active-click-mode");

    if (currModeLabel.html() == "Single"){
        currModeLabel.html("Double");
    }
    else {
        currModeLabel.html("Single");
    }
}

function toggleThresholdMode(){
    var currThresholdLabel = $("#active-threshold-mode");

    if (currThresholdLabel.html() === "Inside"){
        currThresholdLabel.html("Outside");
    }
    else {
        currThresholdLabel.html("Inside");
    }

    if (selectedSubject1){
        buildGraph();
    }
}

function toggleDashboardPanel(){
    var dashboardPanelButton = $("#dashboardPanelButton");
    if (dashboardPanelButton.css("bottom") == "0px"){
        dashboardPanelButton.css("bottom", "300px"); //width of panel
        dashboardPanelButton.html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#x25BC;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
    }
    else{
        dashboardPanelButton.css("bottom", "0px"); //width of panel
        dashboardPanelButton.html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#x25B2;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
    }
    $("#dashboardPanel").toggle();
}

function toggleVolumes(){
    return;

    $("#niftiXcontainer").toggle();
    $("#niftiYcontainer").toggle();
    $("#niftiZcontainer").toggle();
    if (brainLoaded && !volumeLoaded){
        volumeLoaded = true;

        niftiX.add(brain);
        niftiY.add(brain);
        niftiZ.add(brain);

        niftiX.render();
        niftiY.render();
        niftiZ.render();
    }

    var volLabel = $("#active-volume");
    if (volLabel.html() == "Hidden"){
        volLabel.html("Visible");
    }
    else{
        volLabel.html("Hidden");
    }
}

function loadLineProfilesForNodes(node1, node2){
    var style = "width:45%;float:left;";
    $("#line-profile-container").html("<div id='line-profiles-1' style='" + style + "'></div><div id='line-profiles-2' style='" + style + "'></div>");

    $("#roi-details").html("");

    var nID = activeParcellation === "Talairach" ? node1.int_id : node1.int_id+1;
    var clusterFrequencies1 = subjectClusterMaps[selectedSubject1][activeParcellation]["r" + nID];
    var lineProfiles1Container = $("#line-profiles-1");
    displayLineProfiles(node1.name, selectedSubject1, clusterFrequencies1, lineProfiles1Container);

    if (node2){
        nID = activeParcellation === "Talairach" ? node1.int_id : node2.int_id+1;
        var clusterFrequencies2 = subjectClusterMaps[selectedSubject1][activeParcellation]["r" + nID];
        var lineProfiles2Container = $("#line-profiles-2");
        displayLineProfiles(node2.name, selectedSubject1, clusterFrequencies2, lineProfiles2Container);

        $("#line-profiles-1").sortable();
        $("#line-profiles-2").sortable();
    }

    showRoiWeightings()
}

function sortLineProfiles(profiles, frequencies){
    var sortProfiles = [];
    for (var i=0; i<frequencies.length; i++){
        sum += frequencies[i];
        sortProfiles.push({idx: i, frequency: frequencies[i]});
    }

    sortProfiles.sort(function(a, b) {
        a = a.frequency;
        b = b.frequency;
        return a < b ? -1 : (a > b ? 1 : 0);
    });

    return sortProfiles;
}

function displayLineProfiles(nodeName, subjectName, lineProfileFrequencies, htmlContainer){
    console.log("displayLineProfiles: " + nodeName + ", " + subjectName + ", " + htmlContainer.attr("id"));
    var sum = 0;
    var sortProfiles = [];
    for (var i=0; i<lineProfileFrequencies.length; i++){
        sum += lineProfileFrequencies[i];
        sortProfiles.push({idx: i, frequency: lineProfileFrequencies[i]});
    }

    sortProfiles.sort(function(a, b) {
        a = a.frequency;
        b = b.frequency;
        return a < b ? -1 : (a > b ? 1 : 0);
    });

    var mean = sum / lineProfileFrequencies.length;
    var variance = calculateVariance(lineProfileFrequencies, sum);
    var sd = Math.sqrt(variance);

    var numClusters = 0;
    htmlContainer.html("<u><b>" + nodeName + "</b></u><br />");

    //Put the average profile in first
    var roi = +nodeNameToIDDictionary[removeSpecialCharactersFromNodeNameString(nodeName)];
    createLineProfile(htmlContainer.attr("id"), "Average", subjectAverageProfiles[subjectName][roi], "N/A", 1.5);

    htmlContainer.append("<hr />");

    for (var j=sortProfiles.length-1; j>=0; j--){
        var pcnt = 100*sortProfiles[j].frequency/sum;
        if (pcnt>0) {
            var cnum = sortProfiles[j].idx + 1;
            createLineProfile(htmlContainer.attr("id"), cnum, subjectLineProfiles[subjectName][cnum], pcnt, 1.5);
            
            numClusters++;
        }
    }

    var roiDetails = $("#roi-details");
    roiDetails.append("<u><b>" + nodeName + "</b></u><br /><br />");
    roiDetails.append("<b>Number of voxels:</b> " + sum + "<br />");
    roiDetails.append("<b>Homogeneity (ReHo):</b> " + homogeneities[activeParcellation][selectedSubject1][roi] + "<br />");
    roiDetails.append("<b>Number of clusters:</b> " + numClusters + "/" + lineProfileFrequencies.length + "<br />");
    roiDetails.append("<b>Mean voxels per cluster:</b> " + mean.toFixed(2) + "<br />");
    roiDetails.append("<b>Cluster voxels standard deviation:</b> " + sd.toFixed(2) + "<br /><br />");
}

var numLineProfiles;
function clearHighlightedLineProfiles(){
    console.log("clearHighlightedLineProfiles");

    $("#line-profiles-1").html("");
    $("#line-profiles-2").html("");

    if (numLineProfiles === null || numLineProfiles === undefined){
        $.get("data/ClusterSVGs/numclusters.txt", function(data){
            numLineProfiles = JSON.parse(data);

            displayAllLineProfilesForSelectedSubject();
        });
    }
    else{
        displayAllLineProfilesForSelectedSubject();
    }
}

var subjectAverageProfiles = {};
var subjectLineProfiles = {};
function displayAllLineProfilesForSelectedSubject(){
    //Clear
    $("#line-profile-container").html("");

    if (split_graph) {
        $("#line-profile-container").html("Multiple subjects.");
        return;
    }

    //Create from text files
    if (subjectLineProfiles[selectedSubject1] === undefined || subjectLineProfiles[selectedSubject1] === null){
        console.log("AAA");
        $.get("data/Subjects/" + selectedSubject1 + "_" + activeParcellation.toLowerCase() + "_average_profiles.txt", function(data){
            var lines = data.split("\n");
            var profiles = [];
            for (var i=0; i<lines.length; i++){
                var profile = lines[i].split("\t");

                if (profile.length > 1){
                    //Convert string to number
                    for(var k=0; k<profile.length; k++){
                      profile[k] = +profile[k];
                    } 
                    profiles.push(profile);
                }
            }

            subjectAverageProfiles[selectedSubject1] = profiles;

            //Put this in the above .get
            $.get("data/ClusterSVGs/" + selectedSubject1 + "_profiles.txt", function(data){
                var lines = data.split("\n");
                var profiles = [];
                for (var i=0; i<lines.length; i++){
                    var profile = lines[i].split("\t");

                    if (profile.length > 1){
                        //Convert string to number
                        for(var k=0; k<profile.length; k++){
                          profile[k] = +profile[k];
                        } 
                        profiles.push(profile);
                    }
                }

                subjectLineProfiles[selectedSubject1] = profiles;

                loopThroughProfilesToDraw();
            });
        });
    }
    else{
        console.log("BBB");
        loopThroughProfilesToDraw();
    }

    $("#line-profile-container").sortable();
}

function loopThroughProfilesToDraw(){
    //Get sort order
    var prcnts = []; 
    for (var i=0; i<subjectLineProfiles[selectedSubject1].length; i++){
        prcnts.push(calculateLineProfilePercent(i));
    }
    getSortOrder(prcnts);
    var order = prcnts.sortIndices;

    //Draw
    for (var j=order.length-1; j>-1; j--){
        var pidx = order[j];
        createLineProfile("line-profile-container", pidx, subjectLineProfiles[selectedSubject1][pidx], calculateLineProfilePercent(pidx), 5);
    }
}

//From: https://stackoverflow.com/questions/3730510/javascript-sort-array-and-return-an-array-of-indicies-that-indicates-the-positi
function getSortOrder(toSort) {
  for (var i = 0; i < toSort.length; i++) {
    toSort[i] = [toSort[i], i];
  }
  toSort.sort(function(left, right) {
    return left[0] < right[0] ? -1 : 1;
  });
  toSort.sortIndices = [];
  for (var j = 0; j < toSort.length; j++) {
    toSort.sortIndices.push(toSort[j][1]);
    toSort[j] = toSort[j][0];
  }
  return toSort;
}

function calculateLineProfilePercent(profileNumber){
    var total = 0;
    var numVoxels = 0;
    var nRegions = Object.keys(subjectClusterMaps[selectedSubject1][activeParcellation]).length;
    for (var i=1; i<=nRegions; i++){
        total += subjectClusterMaps[selectedSubject1][activeParcellation]["r" + i][profileNumber];

        for (var j=0; j<subjectClusterMaps[selectedSubject1][activeParcellation]["r" + i].length; j++){
            numVoxels += subjectClusterMaps[selectedSubject1][activeParcellation]["r" + i][j];
        }
    }
    
    return (total/numVoxels)*100;
}

function createLineProfile(containerID, clusterNum, yVals, percent, maxColumns){
    //Adapted from: http://bl.ocks.org/benjchristensen/2579599
    var container = $("#" + containerID);

    var m = [20, 15, 15, 20]; // margins
    var w = Math.floor(container.width()/maxColumns) - m[1] - m[3] - ((maxColumns-1)*1); // width
    var h = (w*9)/16; // height

    var data = yVals;

    if (data === undefined || data.length === undefined){
        console.log("createLineProfile -- undefined : " + clusterNum);
        return;
    }

    var x = d3.scale.linear().domain([0, data.length]).range([0, w]);
    var y = d3.scale.linear().domain([d3.min(data), d3.max(data)]).range([h, 0]);

    // create a line function that can convert data[] into x and y points
    var line = d3.svg.line()
        .x(function(d,i) { 
            return x(i); 
        })
        .y(function(d) { 
            return y(d); 
        })
        .interpolate("monotone");

    var graph = d3.select("#" + containerID).append("svg:svg")
          .attr("width", w + m[1] + m[3])
          .attr("height", h + m[0] + m[2])
          .attr("class", "profile-graph")
          .attr("id", "profile-graph-"+clusterNum)
          .on("click", function(d,i){ highlightForCluster(clusterNum); })
          .on("dblclick", function(d,i){ openProfilePopup(clusterNum); })
        .append("svg:g")
          .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    var xAxis = d3.svg.axis().scale(x).tickFormat(''); //Size(-h).tickSubdivide(true);

    graph.append("svg:g")
          .attr("class", "x-profile-axis")
          .attr("transform", "translate(0," + h + ")")
          .call(xAxis);

    var title;
    if (clusterNum === "Average"){
        title = "Average Signal";
    }
    else {
        title = (clusterNum+1) + " (" + parseFloat(percent).toFixed(2) + "%)";
    }

    graph.append("text") 
          .attr("transform", "translate(" + (w/2) + ",0)")//" + (h+m[1]) + ")")
          .style("text-anchor", "middle")
          .text(title);

    var yAxisLeft = d3.svg.axis().scale(y).ticks(4).orient("left");

    graph.append("svg:g")
          .attr("class", "y-profile-axis")
          //.attr("transform", "translate(-25,0)")
          .call(yAxisLeft);

    graph.append("svg:path").attr("d", line(data));
}

var currentClusterNum = -1;
function highlightForCluster(clusterNum){
    console.log("highlightForCluster: " + clusterNum);

    var svg = $("#profile-graph-" + clusterNum);

    //Only do something if nothing selected on radial
    if (selectedNode1 === undefined || selectedNode1 === null){
        //Clear node and edge colours
        $(".node:not(.talairachGroupNode)").attr("class", "node");
        $(".talairachGroupNode").attr("class", "node talairachGroupNode");
        $(".link").attr("class", "link");

        clearHighlightedBrainRegions();
        clearHighlightedLineProfiles();
        $("#roi-details").html("");

        //jquery can't addclass on svg
        if (currentClusterNum == clusterNum){
            //Clear selection
            currentClusterNum = -1;
            svg.attr("class", "profile-graph");
            clearICImage();

            return;
        }
        svg.attr("class", "profile-graph profile-graph-selected");

        currentClusterNum = clusterNum;

        displayICVoxels(currentClusterNum);

        var nRegions = Object.keys(subjectClusterMaps[selectedSubject1][activeParcellation]).length;

        for (var i=1; i<=nRegions; i++){
            var freq = subjectClusterMaps[selectedSubject1][activeParcellation]["r" + i][clusterNum];
            if (freq > 0){
                var labelID = current_network[i-1].key.replace(/\s/g, ""); //Replace all spaces
                d3.select("#" + labelID).classed("node--source", true);
            }
        }
    }
}

var tmp;
function openProfilePopup(clusterNum){
    tmp = clusterNum;

    //Double click clears the highlighting
    highlightForCluster(clusterNum);

    var modal = "<div id='popup-background' style='position:absolute;top:0px;left:0px;width:100%;height:100%;background-color:rgba(100,100,100,0.4);z-index:250;' onclick='$(\"#popup-background\").remove();'>";
    modal += "<div id='svg-container' style='position:absolute;top:20%;left:20%;z-index:251;height:60%;width:60%;' ></div></div>";
    $("body").append(modal);

    createLineProfile("svg-container", clusterNum, subjectLineProfiles[selectedSubject1][clusterNum], calculateLineProfilePercent(clusterNum), 1);
}

function showNodesForCluster(clusterNum){
    console.log("showNodesForCluster");
    var high1 = 0, high2 = 0, high3 = 0;
    var high1Freq = 0, high2Freq = 0, high3Freq = 0;
    var high1Sum = 0, high2Sum = 0, high3Sum = 0;
    var percent1 = 0, percent2 = 0, percent3 = 0;

    var visibleNodeIDs = [];
    var expandedNodesString = "";
    if (expandedTalairachSubgroups.length > 0) {
        for (var n in current_network) {
            var idx = current_network[n].int_id;
            if (idx < 1106) {
                visibleNodeIDs.push(idx);
            }
        }
    }

    for (var key in subjectClusterMaps[selectedSubject1][activeParcellation]) {
        var freq = subjectClusterMaps[selectedSubject1][activeParcellation][key][clusterNum-1];
        var sum = subjectClusterMaps[selectedSubject1][activeParcellation][key].reduce(function(pv, cv) { return pv + cv; }, 0);
        var percent = 100*freq/sum;

        if (sum >= 20) { //Temp: Ignore small regions
            var idxNum = parseInt(key.substring(1));
            if (percent > percent1) {
                high1 = idxNum;
                high1Freq = freq;
                high1Sum = sum;
                percent1 = percent;
            }
            else if (percent > percent2) {
                high2 = idxNum;
                high2Freq = freq;
                high2Sum = sum;
                percent2 = percent;
            }
            else if (percent > percent3) {
                high3 = idxNum;
                high3Freq = freq;
                high3Sum = sum;
                percent3 = percent;
            }
        }

        //Check visible expanded nodes
        if (visibleNodeIDs.indexOf(idxNum) >= 0 && percent > 0){
            var textEl = $("text[int_id=" + idxNum + "]");
            var op = (1-(percent/200));
            textEl.css("fill", "fuchsia");
            textEl.css("opacity", op);

            expandedNodesString += "* " + fullNetwork[idxNum].name + "\n   Proportion: " + freq + "/" + sum + " (" + percent.toFixed(2) + "%)\n\n";
        }
    }

    var alertString = "Highest proportion in:\n" + fullNetwork[high1].name + "\nProportion: " + high1Freq + "/" + high1Sum + " (" + percent1.toFixed(2) + "%)\n";
    alertString += "\nSecond:\n" + fullNetwork[high2].name +  "\nProportion: " + high2Freq + "/" + high2Sum + " (" + percent2.toFixed(2) + "%)\n";
    alertString += "\nThird:\n" + fullNetwork[high3].name +  "\nProportion: " + high3Freq + "/" + high3Sum + " (" + percent3.toFixed(2) + "%)\n";
    if(visibleNodeIDs.length > 0){
        alertString += "\nIn expanded nodes:\n" + expandedNodesString;
    }

    //alert(alertString);
    alertCallback(alertString, function(){
        //Clear the highlighting
        for (var num in visibleNodeIDs){
            console.log("-" + visibleNodeIDs[num]);
            var textEl = $("text[int_id=" + visibleNodeIDs[num] + "]");
            textEl.css("fill", "");
            textEl.css("opacity", 1);
        }
    });
}

function alertCallback(alertMsg, callbackFunction){
    alert(alertMsg);
    if(typeof callbackFunction == "function") {
        callbackFunction();
    }
}

function showRoiWeightings(){
    var list = "";
    for (var sub in weightedNodeList){
        list += "<b>" +  sub + "</b><br />";
        for (var node in weightedNodeList[sub]){
            list += node + " (" + nodeNameToIDDictionary[removeSpecialCharactersFromNodeNameString(node)] + "): " + weightedNodeList[sub][node] + "<br />";
        }
    }

    $("#roi-weightings").html(list);
}

var split_graphDiv = null;
function loadAuxiliaryGraph(graphNum){
    split_graphDiv = $("#graph" + graphNum);

    $("#selectionButton").show();
    $("#selectionPanel").show();
}