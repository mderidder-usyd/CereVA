var selectedSubject1;
var selectedSubject2;
var subjects;
var allSubjectsJSON = [];
var containers = ["pial", "smoothwm", "niftiAll", "niftiX", "niftiY", "niftiZ"];
var isDifferenceGraph = false;

var CIRCLE_GRAPH = 0;
var MATRIX_GRAPH = 1;
var HISTOGRAM_GRAPH = 2;
var currentGraphType = CIRCLE_GRAPH;

var anonymiseLabels = false;

var subjectChange = false;
var MODE_GENERAL = 0;
var MODE_CLASSIFICATION = 1;
var MODE_MARKER = 2;
var useWoodwardOxfordThalamus = false; //break the thalamus into sub regions?
var current_mode = MODE_MARKER; //Parcellation: WoodwardThalamus
//var current_mode = MODE_CLASSIFICATION; //Parcellation: Talairach
window.onload = function() {
    loadAndDisplayBrain();

    var classification = false;
    var marker = true;
    var fn = "data/Subjects/subjects_gh.txt";

    $.get(fn, function(data){
        subjects = data.split(",");
        var selectionList = $("#selectionList");

        for (var i=0; i<subjects.length; i++){
            var subjectName = subjects[i];
            if(anonymiseLabels){
                subjectName = "Subject " + i;
            }

            //Add to the selection panel
            var sub;
            if (subjects[i] === "wrraYMH_0603_WK"){ //These ones have been re-clustered
                sub = "<input type='checkbox' name='subjects' value='" + subjects[i] + "' id='cb_" + subjects[i] + "' disabled='true' />" +
                    "<label id='lbl_" + subjects[i] + "' for='cb_" + subjects[i] + "' >" + subjectName + "<small>(failed due to incorrect number of time points)</small></label><br />";
            }
            else if (subjects[i] === "wrraYMH_0117_ML" || subjects[i] === "wrraYMH_0458_MW"){
                sub = "<input type='checkbox' name='subjects' value='" + subjects[i] + "' id='cb_" + subjects[i] + "' disabled='true' />" +
                    "<label id='lbl_" + subjects[i] + "' for='cb_" + subjects[i] + "' >" + subjectName + " </label><br />";
            }
            else {
                sub = "<input type='checkbox' name='subjects' value='" + subjects[i] + "' id='cb_" + subjects[i] + "' />" +
                    "<label id='lbl_" + subjects[i] + "' for='cb_" + subjects[i] + "' >" + subjectName + " </label><br />"; //subjects[i]
            }

            selectionList.append(sub);

            if (current_mode === MODE_CLASSIFICATION){
                if (subjects[i] === "wrraYMH_0603_WK" || subjects[i] === "wrraYMH_0665_ML" || subjects[i] === "wrraYMH_0732_JD" || subjects[i] === "wrraYMH_0855_GD" || subjects[i] === "wrraYMH_0891_JS"){
                    selectionList.append("<hr />");
                }
            }
            if (current_mode === MODE_MARKER && subjects[i] === "wrraYMH_0931_LS"){
                selectionList.append("<hr />");
            }
        }

        //Default parcellation
        //loadParcellation("HarvardOxfordCortical");
        if (current_mode === MODE_CLASSIFICATION){
            loadParcellation("Talairach");
        }
        else{
            if (useWoodwardOxfordThalamus){
                loadParcellation("WoodwardOxfordThalamus");
            }
            else{
                loadParcellation("WoodwardThalamus");  
            }
        }

        $("input[name=subjects]").change(function(){
            selectSubject($(this));
        });
    });

    $("#correlation-range").slider({
        range: true,
        min: 1,
        max: 200, //1500,
        values: [ 170, 200 ],
        stop: function( event, ui ) {
            var low = ui.values[0]/100;
            var high = ui.values[1]/100;
            if (current_network && !split_graph){
                $("#graph").html("");
                buildGraph(current_network, low, high); //Rebuild the graph with new edges (makes interaction faster than calculating all 167x167 edges on click)
            }
            else if (current_network && split_graph){
                console.log("Threshold split graph: " + low + "-" + high);

                //Apply threshold to all graphs
                var subs = $(".splitSubjectLabel");
                for (var i=0; i<subs.length; i++){
                    split_graphDiv = $("#" + $(subs[i]).parent().attr("id"));
                    selectedSubject1 = subs[i].innerHTML;
                    var subNetwork = subjectNetworkJson["Talairach"][selectedSubject1].network;

                    //Reset for hierarchy grouping and then rebuild for threshold
                    resetParamsToForceNodeGroupingToBeRebuilt();
                    buildGraph(subNetwork);
                }
            }
        },
        slide: function( event, ui ) {
            var low = ui.values[0]/100;
            var high = ui.values[1]/100;

            if (!selectedSubject2){ //Values go from -1 to 1 for single subject
                low-=1;
                high-=1;
            }

            $("#range-vals").html(parseFloat(low).toFixed(2) + "-" + parseFloat(high).toFixed(2));
        }
    });

    loadColourPickers();

    $("#graph, #graph2, #graph3, #graph4").mouseenter(function(){
        if (split_graph && !$("#selectionList").is(":visible")){
            var subLabel = $(this).find(".splitSubjectLabel")[0];
            if (subLabel !== undefined && subLabel !== null){
                split_graphDiv = $(this);
                selectedSubject1 = $(subLabel).html();
                current_network = subjectNetworkJson[activeParcellation][selectedSubject1]["network"];
            }
        }
    });
};

function selectSubject(checkbox){
    var subjectName = checkbox.val();
    console.log("selectSubject(" + subjectName + ")");

    if (subjectNetworkJson[activeParcellation][subjectName] === undefined || subjectNetworkJson[activeParcellation][subjectName] === null){
        console.log("Subject not yet loaded");
        //Load subject
        loadCorrelationMatrix(subjectName, activeParcellation, true);

        return;
    }

    //Clear min/max
    s1max = 0, s1min = 0;
    
    //Clear previous selections
    clearTalairachGroups();
    clearHighlightedBrainRegions();
    clearHighlightedLineProfiles();
    $("#roi-details").html("");

    var activeSubjectsLabel = $("#active-subjects");

    if (checkbox.is(":checked")){
        console.log("checked!")
        toggleSelectionPanel();

        loadClusterMapForSubject(subjectName);

        if (selectedSubject1 !== subjectName){
            $("#cb_" + selectedSubject1).prop("checked", false); //Clear previous selection
        }
        selectedSubject1 = subjectName;
        if (split_graphDiv !== null) {
            activeSubjectsLabel.html("Multiple");
        }
        else{
            activeSubjectsLabel.html($("#lbl_" + selectedSubject1).html());
        }
    }
    else{
        //Remove
        selectedSubject1 = null;
        activeSubjectsLabel.html("None");
        $("#line-profile-container").html("");
    }

    var correlationSlider = $("#correlation-range");
    var correlationSliderVals = $("#range-vals");
    var edgeBucketsContainer = $("#edge-buckets-container");
    var markerButton = $("#add-marker-button");
    var filterEdgeButton = $("#filter-edges-button");
    if (selectedSubject1 && selectedSubject2){
        //Only reset slider if going from single subject to multiple, else reuse manual positions
        if (!isDifferenceGraph){
            correlationSlider.slider("values", 0, 80);
            correlationSlider.slider("values", 1, 120);
            correlationSliderVals.html("0.80-1.20");
        }
        isDifferenceGraph = true;

        calculateDifference(selectedSubject1, selectedSubject2);

        correlationSlider.show();
        edgeBucketsContainer.show();
        markerButton.show();
        filterEdgeButton.show();
    }
    else if (selectedSubject1){
        var sub = $.grep(allSubjectsJSON, function(value) {
            return value.subject == selectedSubject1;
        });

        //Only reset the slider if going from 2 subjects to one
        if (isDifferenceGraph){
            correlationSlider.slider("values", 0, 170);
            correlationSlider.slider("values", 1, 200);

            correlationSliderVals.html("0.70-1.00");
        }

        isDifferenceGraph = false;

        var vals = correlationSlider.slider("option", "values");

        if (subjectNetworkJson[activeParcellation][subjectName].network !== undefined){
            buildGraph(subjectNetworkJson[activeParcellation][subjectName].network, vals[0] / 100, vals[1] / 100);
        }
        else {
            buildGraph(sub[0].network, vals[0] / 100, vals[1] / 100);
        }

        correlationSlider.show();
        edgeBucketsContainer.show();
        markerButton.show();
        filterEdgeButton.show();
    }
    else{
        $("#graph").html("");
        correlationSlider.hide();
        edgeBucketsContainer.hide();
        markerButton.hide();
        filterEdgeButton.hide();
    }
}

