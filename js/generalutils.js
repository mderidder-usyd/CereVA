//Removes special charachers: spaces, brackets, commas, etc.
function removeSpecialCharactersFromNodeNameString(nodeName){
    return nodeName.replace(/ /g, "").replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,"");
}

//From: http://bateru.com/news/2011/03/javascript-standard-deviation-variance-average-functions/
function calculateVariance(numArr, arrSum){
    var v = 0;
    var i = numArr.length;
    var mean = arrSum/i;

    while( i-- ){
        v += Math.pow( (numArr[ i ] - mean), 2 );
    }
    v /= numArr.length;
    return v;
}


/**
 *  Calculate the person correlation score between two items in a dataset.
 *
 *  @param  {object}  prefs The dataset containing data about both items that
 *                    are being compared.
 *  @param  {string}  p1 Item one for comparison.
 *  @param  {string}  p2 Item two for comparison.
 *  @return {float}  The pearson correlation score.
 *
 *  @author matt.west@kojilabs.com (Matt West)
 *  @license Copyright 2013 Matt West.
 *  Licensed under MIT (http://opensource.org/licenses/MIT).
 */
function pearsonCorrelation(prefs, p1, p2) {
  var si = [];

  for (var key in prefs[p1]) {
    if (prefs[p2][key]) si.push(key);
  }

  var n = si.length;

  if (n == 0) return 0;

  var sum1 = 0;
  for (var i = 0; i < si.length; i++) sum1 += prefs[p1][si[i]];

  var sum2 = 0;
  for (var i = 0; i < si.length; i++) sum2 += prefs[p2][si[i]];

  var sum1Sq = 0;
  for (var i = 0; i < si.length; i++) {
    sum1Sq += Math.pow(prefs[p1][si[i]], 2);
  }

  var sum2Sq = 0;
  for (var i = 0; i < si.length; i++) {
    sum2Sq += Math.pow(prefs[p2][si[i]], 2);
  }

  var pSum = 0;
  for (var i = 0; i < si.length; i++) {
    pSum += prefs[p1][si[i]] * prefs[p2][si[i]];
  }

  var num = pSum - (sum1 * sum2 / n);
  var den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / n) *
      (sum2Sq - Math.pow(sum2, 2) / n));

  if (den == 0) return 0;

  return num / den;
}

var HOMOGENEITY_RELATIVE = 0;
var HOMOGENEITY_ABSOLUTE = 1;
var homogeneityType = HOMOGENEITY_RELATIVE;
function calculateHomogeneityForNode(nodeID){
    var h = homogeneities[activeParcellation][selectedSubject1][nodeID];
    if (homogeneityType === HOMOGENEITY_RELATIVE){
        var max = Math.max(...homogeneities[activeParcellation][selectedSubject1]);

        return h/max;
    }
    else{
        return h;
    }
}

var MARKER_MODE_OVERLAP = 0; //Show only whether the current subjects edges are above, below or within the marker
var MARKER_MODE_THRESHOLD = 1; //Show all marker edges within current threshold
var markerMode = MARKER_MODE_OVERLAP;
var markerDetails = {subjectsInMarker:[], meanCorrelations:[], standardDeviations:[]};
function addToMarker(){
    console.log("addToMarker");
    //Check if the subject already added
    if (markerDetails.subjectsInMarker.indexOf(selectedSubject1) < 0){
        console.log("-" +selectedSubject1);

        var numSubs = markerDetails.subjectsInMarker.length;
        markerDetails.subjectsInMarker.push(selectedSubject1);

        var normalisedCorrelations = getNormalisedCorrelationsForCurrentNetwork();

        if (numSubs == 0){
            markerDetails.meanCorrelations = normalisedCorrelations; //current_network;

            //Default standard deviation
            for (var i=0; i<markerDetails.meanCorrelations.length; i++){
                var sds = [];
                for (var j=0; j<markerDetails.meanCorrelations[i].length; j++){
                    sds.push(0);
                }
                markerDetails.standardDeviations.push(sds);
            }
        }
        else {
            //Create the average network
            for (var i=0; i<markerDetails.meanCorrelations.length; i++){
                //for (var j=0; j<markerDetails.network[i].connections.length; j++){
                for (var j=0; j<markerDetails.meanCorrelations[i].length; j++){
                    //convert to number
                    var m_edgeVal = +markerDetails.meanCorrelations[i][j];
                    var cn_edgeVal = normalisedCorrelations[i][j];

                    var mean = ((m_edgeVal*numSubs)+cn_edgeVal)/(numSubs+1);
                    markerDetails.meanCorrelations[i][j] = "" + mean;

                    //Using half a standard deviation
                    var oldSD = +markerDetails.standardDeviations[i][j];
                    var newSD = addToStandardDeviation(cn_edgeVal, mean, oldSD, m_edgeVal, markerDetails.meanCorrelations.length);
                    markerDetails.standardDeviations[i][j] = newSD/2;
                }
            }
        }
    }

    buildGraph();
}

function getMaxCorrelationForCurrentNetwork(){
    var maxCorr = -100000; //Decimals are multiplied and truncated at 5dp
    for (var i=0; i<current_network.length; i++){
        for (var j=0; j<current_network[i].connections.length; j++){
            var conn = current_network[i].connections[j];
            var corr = +conn.correlation;
            //Avoid decimal issues (at 5dp)
            corr = Math.trunc(corr*100000);

            if (corr>maxCorr){
                maxCorr = corr;
            }
        }
    }

    return maxCorr/100000;
}

function getNormalisedCorrelationsForCurrentNetwork(){
    var normalisedCorrelations = [];

    maxCorr = getMaxCorrelationForCurrentNetwork() * 100000;

    for (var i=0; i<current_network.length; i++){
        var innerCorrs = [];
        for (var j=0; j<current_network[i].connections.length; j++){
            var conn = current_network[i].connections[j];
            var corr = +conn.correlation;
            //Avoid decimal issues (at 5dp)
            corr = Math.trunc(corr*100000);

            var nCorr = corr/maxCorr;

            innerCorrs.push(nCorr);
        }
        normalisedCorrelations.push(innerCorrs);
    }
    return normalisedCorrelations;
}

function median(values) {
    values.sort( function(a,b) {return a - b;} );
    var half = Math.floor(values.length/2);

    if(values.length % 2) {
        return values[half];
    }
    else {
        return (values[half-1] + values[half]) / 2.0;
    }
}

//Calculate standard deviation with only new value: http://math.stackexchange.com/questions/775391/can-i-calculate-the-new-standard-deviation-when-adding-a-value-without-knowing-t
function addToStandardDeviation(newVal, newMean, oldSD, oldMean, numVals){
    var denomPt1 = (numVals-2)*(oldSD*oldSD);
    var denomPt2 = (newVal-newMean)*(newVal-oldMean);

    var variance = (denomPt1+denomPt2)/(numVals-1);

    return Math.sqrt(variance);
}

var DIRECTION_FILTER = 1;
var DIRECTION_RETURN = 2;
var filteredEdgeList = [];
function filterEdges(){
    //Create modal
    // >
    var modal = "<div id='filter-edges-background' style='position:absolute;top:0px;left:0px;width:100%;height:100%;background-color:rgba(100,100,100,0.4);z-index:250;'>";
    modal += "<div id='edges-container' style='position:absolute;top:20%;left:20%;z-index:251;height:60%;width:60%;background-color:white;overflow:scroll;' >";

    modal += "<select id='show_box' size='30'>"
    for (var i=0; i<current_network.length; i++){
        for (var j=(i+1); j<current_network.length; j++){
            var sourceName = current_network[i].name;
            var targetName = current_network[j].name;
            var edgeName = sourceName + " -- " + targetName;

            if (filteredEdgeList.indexOf(edgeName) < 0){
                modal += "<option>" + edgeName + "</option>";
            }
        }
    }
    modal += "</select>"
    modal += "<input type='button' value='Filter>>>' onclick='MoveBetweenFilterLists(DIRECTION_FILTER)' />";
    modal += "<input type='button' value='<<<Return' onclick='MoveBetweenFilterLists(DIRECTION_RETURN)' />";

    modal += "<select id='filter_box' size='30'>";
    for (var i=0; i<filteredEdgeList.length; i++){
        modal += "<option>" + filteredEdgeList[i] + "</option>";
    }
    modal += "</select>";

    modal += "<br /><input type='button' value='Done' onclick='$(\"#filter-edges-background\").remove();buildGraph();' />"
    modal += "</div></div>";
    $("body").append(modal);
}

function MoveBetweenFilterLists(direction) {
    var fromBox, toBox;
    if (direction === DIRECTION_FILTER){
        fromBox = document.getElementById("show_box");
        toBox = document.getElementById("filter_box");
    }
    else {
        fromBox = document.getElementById("filter_box");
        toBox = document.getElementById("show_box");
    }

    var selIdx = fromBox.selectedIndex;
    var row = fromBox.options[selIdx];
    var edgeName = row.text;
    fromBox.removeChild(row);
     
    var newOpt = document.createElement('option');
    newOpt.innerHTML = edgeName;
    toBox.appendChild(newOpt);

    if (direction === DIRECTION_FILTER){
        filteredEdgeList.push(edgeName)
    }
    else {
        var idx = filteredEdgeList.indexOf(edgeName);
        filteredEdgeList.splice(idx, 1);
    }

    fromBox.selectedIndex = selIdx < fromBox.length ? selIdx : (fromBox.length-1);
}