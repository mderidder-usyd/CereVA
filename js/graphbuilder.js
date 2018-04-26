//Graph code adapted from: http://bl.ocks.org/mbostock/7607999
var roi_legend;
var current_network; //For recalculating when threshold changes
var subject1_edge_buckets = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var subject2_edge_buckets = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var s1max = 0, s2max = 0, s1min = 0, s2min = 0;

function calculateDifference(subject1, subject2, calledFromHistogramBuilder, IVAPPTesting){
	var m1 = $.grep(allSubjectsJSON, function(value) {
		return value.subject == subject1;
	});
	var m2 = $.grep(allSubjectsJSON, function(value) {
		return value.subject == subject2;
	});

	var match1 = m1[0];
	var match2 = m2[0];

	if (currentGraphType == HISTOGRAM_GRAPH && !calledFromHistogramBuilder){ //Special case, don't want to find the difference
		buildHistogramGraph(match1.network, match2.network, subject1, subject2);
	}
	else{
		var diffNetwork = [];
		for (var i=0; i<match1.network.length; i++){
			var name = match1.network[i].name;
			var int_id = match1.network[i].int_id;
				
			var node = {"name":name, "int_id":int_id, "connections":[]}
			for (var j=0; j<match1.network[i].connections.length; j++){
				var diff = Math.abs(match1.network[i].connections[j].correlation - match2.network[i].connections[j].correlation);
				var label = match1.network[i].connections[j].name;
				var orig = match1.network[i].connections[j].correlation > match2.network[i].connections[j].correlation ?
								match1.network[i].connections[j].correlation : match2.network[i].connections[j].correlation;
				var origFrom = match1.network[i].connections[j].correlation > match2.network[i].connections[j].correlation ? 1 : 2;
				node.connections.push({"name":label, "correlation":diff, "original":orig, "originalHigh":origFrom});
			}

			diffNetwork.push(node);
		}

		if (!calledFromHistogramBuilder){
			var vals = $( "#correlation-range" ).slider("option", "values");
			console.log("inCalculateDifference-buildGraph");
			buildGraph(diffNetwork, vals[0]/100,  vals[1]/100);
		}
		else{
			current_network = diffNetwork;
		}
	}
}

//For characteristic opacity
var maxCs = {"G":0,"S":0,"F":0,"P":0,"T":0,"O":0,"C":0,"I":0,"L":0};
var nodeNameToIDDictionary = {};

function convertNetworkToJson(fileURI, subject){
	console.log("convertNetworkToJson");

	var subject_json = {"subject":subject, "network":[], "characteristics":[]};
	$.getJSON("data/roi_legend", function(roi_data){
		roi_legend = roi_data;

		for (var i=0; i<roi_legend.length; i++){
			nodeNameToIDDictionary[roi_legend[i].region_label] = roi_legend[i].int_id;
		}

		$("#display_roi_atlas").removeAttr("disabled");

		$.get(fileURI + subject + "_adjacency_matrix_pcc.txt", function(network_data){
			var network_lines = network_data.split("\n");
			for (var i=0; i<network_lines.length; i++){
				var connections = network_lines[i].split("\t");

				//Catch blank lines at the beginning/end of the file
				if (connections[0] != undefined && connections[0] != ""){ 
					var node = {"name":roi_legend[i].region_label, "int_id":roi_legend[i].int_id, "connections":[]};
					for (var j=0; j<i; j++) { //Only add each edge once (symmetric matrix) //connections.length; j++){
						node.connections.push({"name":roi_legend[j].region_label, "correlation":connections[j]});

						if (connections[j] < 0){
							console.log(roi_legend[j].region_label + ": " + connections[j]);
						}
					}

					subject_json.network.push(node);
				}
			}

			allSubjectsJSON.push(subject_json);
		})
		.fail(function(data) {
	    	console.log("FAIL - DATA:");
			console.log(data);
	  	});
		
		if (!roiVolumesCreated && brainLoaded){
			setUpROIPoints();
		}

		if (subject != "Median" && subject != "Average"){
		  	$.get(fileURI + subject + "_characteristics.txt", function(characteristics){
				var characteristics_lines = characteristics.split("\n");

				var lobesC = {"G":0,"S":0,"F":0,"P":0,"T":0,"O":0,"C":0,"I":0,"L":0};

				for (var i=0; i<167; i++){ //Forgot to delete blank line at the end of some...characteristics_lines.length; i++){
					var mapLobes = roi_legend[i].lobes;
					for (var j=0; j<mapLobes.length; j++){
						lobesC[mapLobes[j]] += parseInt(characteristics_lines[i]);
					}
					
					maxCs.G = Math.abs(lobesC.G) > maxCs.G ? Math.abs(lobesC.G) : maxCs.G;
				}

				var ctcs = "";
				var op;
				if (lobesC.G > 40){
					op = lobesC.G / 54; //maxCs.G;
					ctcs += "<span title='Gyri' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>G</span>";
				}
				else if (lobesC.G < -40){
					op = Math.abs(lobesC.G) / 54; //maxCs.G;
					ctcs += "<span title='Gyri' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>G</span>";
				}
				else{
					ctcs += "_";
				}
				if (lobesC.S > 45){
					op = lobesC.S / 67; //maxCs.S;
					ctcs += "<span title='Sulci' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>S</span>";
				}
				else if (lobesC.S < -45){
					op = Math.abs(lobesC.S) / 67; //maxCs.S;
					ctcs += "<span title='Sulci' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>S</span>";
				}
				else{
					ctcs += "_";
				}
				if (lobesC.F > 25){
					op = lobesC.F / 33; //maxCs.F;
					ctcs += "<span title='Frontal' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>F</span>";
				}
				else if (lobesC.F < -25){
					op = Math.abs(lobesC.F) / 33; //maxCs.F;
					ctcs += "<span title='Frontal' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>F</span>";
				}
				else{
					ctcs += "_";
				}
				if (lobesC.P > 10){
					op = lobesC.P / 15; //maxCs.P;
					ctcs += "<span title='Parietal' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>P</span>";
				}
				else if (lobesC.P < -10){
					op = Math.abs(lobesC.P) / 15; //maxCs.P;
					ctcs += "<span title='Parietal' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>P</span>";
				}
				else{
					ctcs += "_";
				}
				if (lobesC.T > 20){
					op = lobesC.T / 26; //maxCs.T;
					ctcs += "<span title='Temporal' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>T</span>";
				}
				else if (lobesC.T < -20){
					op = Math.abs(lobesC.T) / 26; //maxCs.T;
					ctcs += "<span title='Temporal' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>T</span>";
				}
				else{
					ctcs += "_";
				}
				if (lobesC.O > 20){
					op = lobesC.O / 26; //maxCs.O;
					ctcs += "<span title='Occipital' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>O</span>";
				}
				else if (lobesC.O < -20){
					op = Math.abs(lobesC.O) / 26; //maxCs.O;
					ctcs += "<span title='Occipital' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>O</span>";
				}
				else{
					ctcs += "_";
				}
				if (lobesC.C > 8){
					op = lobesC.C / 12; //maxCs.C;
					ctcs += "<span title='Cingulate' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>C</span>";
				}
				else if (lobesC.C < -8){
					op = Math.abs(lobesC.C) / 12; //maxCs.C;
					ctcs += "<span title='Cingulate' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>C</span>";
				}
				else{
					ctcs += "_";
				}
				if (lobesC.I > 6){
					op = lobesC.I / 10; //maxCs.I;
					ctcs += "<span title='Insula' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>I</span>";
				}
				else if (lobesC.I < -6){
					op = Math.abs(lobesC.I) / 10; //maxCs.I;
					ctcs += "<span title='Insula' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>I</span>";
				}
				else{
					ctcs += "_";
				}
				if (lobesC.L > 0){
					op = lobesC.L / 3; //maxCs.L;
					ctcs += "<span title='Limbic' class='high-outlier' style='background-color:lightblue; opacity:" + op + "'>L</span>";
				}
				else if (lobesC.L < 0){
					op = Math.abs(lobesC.L) / 3; //maxCs.L;
					ctcs += "<span title='Limbic' class='low-outlier' style='background-color:yellow; opacity:" + op + "'>L</span>";
				}
				else{
					ctcs += "_";
				}


				$("#lbl_"+ subject).append(ctcs + "<br />");
		  	})
			.fail(function() {
    			$("#lbl_"+ subject).append("<br />");
  			});
	  	}
	  	else{
			$("#lbl_" + subject).append("<br />");
		}
	});
}

function median(arr){
	arr.sort( function(a,b) {return a-b;} );
	var half = Math.floor(arr.length/2);
	
	if (values.length%2){
		return arr[half];
	}
	else{
		return (arr[half] + arr[half+1])/2.0;
	}
}

var network_diameter, network_radius, network_innerRadius;
var network_cluster, network_bundle, network_line;
var network_svg, network_link, network_node;
var network_nodes, network_links;
var correlation_min, correlation_max;

function buildGraph(network_json, corr_min, corr_max){
	if (network_json == null){
		network_json = current_network;
	} 
	if (network_json == null && current_network == null){
		return;
	}

	var correlationSlider = $("#correlation-range");
	var edgeBucketsContainer = $("#edge-buckets-container");
	correlation_min = corr_min;
	correlation_max = corr_max;
	if (correlation_min == null){
		var vals = correlationSlider.slider("option", "values");
		correlation_min =  vals[0]/100;
		correlation_max =  vals[1]/100;
	}

	switch(currentGraphType){
		case CIRCLE_GRAPH:
			correlationSlider.show();
			edgeBucketsContainer.show();

			buildCircleGraph(network_json);
			break;
		case MATRIX_GRAPH:
			correlationSlider.hide();
			edgeBucketsContainer.hide();

			buildMatrixGraph(network_json);
			break;
		case HISTOGRAM_GRAPH:
			correlationSlider.hide();
			edgeBucketsContainer.hide();

			if (selectedSubject2){
				calculateDifference(selectedSubject1, selectedSubject2, false);
			}
			else{
				buildHistogramGraph(network_json, null);	
			}
			break;
	}

	updateDashboard();

	if (split_graphDiv){
		split_graphDiv = null;
	}
}

var graph;
var edgeDictionary;
var currentTalairachRoot = "CellType";
var expandedTalairachSubgroups = [];
var startPos = 0;
var endPos = 0;
var changeNodes = false;
var fullNetwork = null;
var aaa;
function buildCircleGraph(network_json){
	//Clear the previous graph
	graph = split_graphDiv !== null ? split_graphDiv : $("#graph");
	var graph2Div = $("#graph2"), graph3Div = $("#graph3"), graph4Div = $("#graph4");
	graph.html("");

	if (split_graph && !split_graphDiv){
		graph2Div.show();
		graph3Div.show();
		graph4Div.show();
		graph.css("height", "50%");
		graph.css("width", "50%");

		graph.append("<p class='splitSubjectLabel'>" + $("#lbl_" + selectedSubject1).html() + "</p>")
	}
	else if (!split_graph){
		graph2Div.hide();
		graph2Div.html("<input type='button' onclick='loadAuxiliaryGraph(2)' value='Add' style='position:absolute; left:50%; top:50%;' />");
		graph3Div.hide();
		graph3Div.html("<input type='button' onclick='loadAuxiliaryGraph(3)' value='Add' style='position:absolute; left:50%; top:50%;' />");
		graph4Div.hide();
		graph4Div.html("<input type='button' onclick='loadAuxiliaryGraph(4)' value='Add' style='position:absolute; left:50%; top:50%;' />");

		graph = $("#graph");
		graph.css("height", "100%");
		graph.css("width", "100%");

		graph.html("");
	}
	else{
		split_graphDiv.append("<p class='splitSubjectLabel'>" + $("#lbl_" + selectedSubject1).html() + "</p>")
	}

	if (activeParcellation === "Talairach" && changeNodes === true){
		changeNodes = false;

		if (startPos == endPos) {
			fullNetwork = network_json;

			var offset = 0;
			switch (currentTalairachRoot) {
				case "Hemisphere":
					offset = 0;
					break;
				case "Lobe":
					offset = Object.keys(groupedTalairachAreas.Hemisphere).length;
					break;
				case "Gyrus":
					offset = Object.keys(groupedTalairachAreas.Hemisphere).length + Object.keys(groupedTalairachAreas.Lobe).length;
					break;
				case "TissueType":
					offset = Object.keys(groupedTalairachAreas.Hemisphere).length + Object.keys(groupedTalairachAreas.Lobe).length + Object.keys(groupedTalairachAreas.Gyrus).length;
					break;
				case "CellType":
					offset = Object.keys(groupedTalairachAreas.Hemisphere).length + Object.keys(groupedTalairachAreas.Lobe).length + Object.keys(groupedTalairachAreas.Gyrus).length + Object.keys(groupedTalairachAreas.TissueType).length;
					break;
			}

			startPos = 1106 + offset;
			endPos = 1105 + offset + Object.keys(groupedTalairachAreas[currentTalairachRoot]).length;
			network_json = network_json.slice(startPos, endPos + 1);
		}

		//Add the expanded nodes back in
		var addBackIn = [];
		for (var i=0; i<expandedTalairachSubgroups.length; i++){
			for (var j=0; j<groupedTalairachAreas[currentTalairachRoot][expandedTalairachSubgroups[i].name].length; j++){
				var idx = groupedTalairachAreas[currentTalairachRoot][expandedTalairachSubgroups[i].name][j].idx;
				addBackIn.push(fullNetwork[idx]);
			}

			//Remove expanded node
			var splc = expandedTalairachSubgroups[i].int_id-startPos-1;
			console.log(network_json);
			console.log("splc: " + splc);
			network_json.splice(splc, 1);
			console.log(network_json);
		}

		network_json.push.apply(network_json, addBackIn);

		//Sort network_json by int_id
		network_json.sort(function(a, b) {
			a = a.int_id;
			b = b.int_id;
			return a < b ? -1 : (a > b ? 1 : 0);
		});
	}
	current_network = network_json;

	var temp_network = removeBinnedNodes(network_json);

	loadingGif.show();

	network_diameter = Math.floor(graph.height()); 
	network_radius = Math.floor(network_diameter / 2);
	network_innerRadius = network_radius - 180;

	network_cluster = d3.layout.cluster()
	    .size([360, network_innerRadius])
	    .sort(null)
	    .value(function(d) { return d.size; });

	network_bundle = d3.layout.bundle();

	network_line = d3.svg.line.radial()
	    .interpolate("bundle")
	    .tension(0.75)
	    .radius(function(d) { return d.y; })
	    .angle(function(d) { return d.x / 180 * Math.PI;} );

	network_svg = d3.select("#" + graph.attr("id")).append("svg") 
	    .attr("width", network_diameter)
	    .attr("height", network_diameter)
		.style("position", "absolute")
		.style("top", "0px")
	  	.append("g")
	    .attr("transform", "translate(" + network_radius + "," + network_radius + ")")
		.attr("id", "svg-g");

	network_link = network_svg.append("g").selectAll(".link");
	network_node = network_svg.append("g").selectAll(".node");

	network_nodes = network_cluster.nodes(buildHierarchy(network_json));

	network_links = buildLinks(network_nodes);

	if (network_links.length/current_network.length < 1.5){ 
		network_line.tension(0.01);
	}
	else if (network_links.length/current_network.length < 3.5){
		network_line.tension(0.50);
	}
	else{
		network_line.tension(0.85);
	}

	network_node = network_node
		.data(network_nodes.filter(function(n) { return !n.children; }))
		.enter()
		.append("text")
		.attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
		.attr("dy", ".31em")
		.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")" + (d.x < 180 ? "" : "rotate(180)");})
		.style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
		.attr("id", function(d){ return removeSpecialCharactersFromNodeNameString(d.key)+"-anchor"; })
		.append("svg:tspan")
		.style("fill", function(d){
			if (d.x < 180 && d.int_id <= 1105) {
				var h = calculateHomogeneityForNode(d.int_id);
				if (h == -1){
					return "rgba(0,0,0,0.25)";
				}

				return getColorForPercentage(h);
			}
			return "";
		})
		.text(function(d){
			if (d.x < 180 && d.int_id <= 1105) {
				return "\u25A0";
			}
			return "";
		})
		.append("svg:tspan")
		.attr("class", function (d) {
			var cls = "node";
			if (activeParcellation === "Talairach" && d.int_id > 1105){
				cls += " talairachGroupNode";
			}
			return cls;
		})
		.attr("id", function(d){ return removeSpecialCharactersFromNodeNameString(d.key); })
		.attr("int_id", function(d){return d.int_id})
		.text(function(d) {
			if (activeParcellation === "Talairach" && d.int_id > 1105){
				return d.key + " (+)";
			}
			return d.key;
		})
		.on("click", nodeClick)
		.append("svg:tspan")
		.text(function(d){
			if (d.x >= 180 && d.int_id <= 1105) {
				return "\u25A0";
			}
			return "";
		})
		.style("fill", function(d){
			if (d.x >= 180 && d.int_id <= 1105) {
				var h = calculateHomogeneityForNode(d.int_id);
				if (h == -1){
					return "rgba(0,0,0,0.25)";
				}
				return getColorForPercentage(h); 
			}
			return "";
		});


	var nds = document.getElementsByClassName("node");
	for (var n=0; n<nds.length; n++){
		nds[n].oncontextmenu = function(){
			var idx = $(this).attr("int_id");
			var group = talairachNodeNamesToGroupJSON["Nodes"][idx][currentTalairachRoot.toLowerCase()];

			console.log("idx: " + idx);
			console.log("group: " + group);

			for (var key in expandedTalairachSubgroups){
				if (group === expandedTalairachSubgroups[key].name){
					expandedTalairachSubgroups.splice(key, 1);

					//Check if either of the selected nodes are within the group being shrunk
					if (selectedNode2){
						var selectedGroup = talairachNodeNamesToGroupJSON.Nodes[selectedNode2.int_id][currentTalairachRoot.toLowerCase()];
						if (selectedGroup === group){
							nodeClick(selectedNode2);
						}
					}
					if (selectedNode1){
						var selectedGroup = talairachNodeNamesToGroupJSON.Nodes[selectedNode1.int_id][currentTalairachRoot.toLowerCase()];
						if (selectedGroup === group){
							nodeClick(selectedNode1);
						}
					}

					clearTalairachGroups();
					buildGraph();

					return false;
				}
			}

			//Prevent menu
			return false;
		};
	}

	var lNum = 0;
	var gID = graph[0].getAttribute("id");
	if (!split_graph) {
		edgeDictionary = {};
	}
	else if (gID === "graph" && (edgeDictionary[gID] === undefined || edgeDictionary[gID] === null)){
		edgeDictionary = {};
		edgeDictionary[gID] = {}; //tmpDict;
	}
	else{
		edgeDictionary[gID] = {};
	}

	network_link = network_link.data(network_bundle(network_links))
	  .enter().append("path")
	  .each(function(d) {
	  		d.source = d[0], d.target = d[d.length - 1];

			//Alter the opacity
			var corre_diff = parseFloat(network_links[lNum].correlation); //In multi-subject graphs, this is the difference

			//Get the colours
			var colHigh1 = $("#colour-high1").val();
			var colHigh2 = $("#colour-high2").val();
			var colLow = $("#colour-low").val();

		  	if (!isDifferenceGraph) {
				corre_diff = corre_diff + 1;

				$(this).css("stroke", colHigh1);

				s1max = corre_diff > s1max ? corre_diff : s1max;
				s1min = corre_diff < s1min ? corre_diff : s1min;
			}
			else {
				if (originalHighCorrelationNetwork[lNum] == 2) {
					$(this).css("stroke", colHigh2);

					s2max = corre_diff > s2max ? corre_diff : s2max;
					s2min = corre_diff < s2min ? corre_diff : s2min;
				}
				else {
					$(this).css("stroke", colHigh1);

					s1max = corre_diff > s1max ? corre_diff : s1max;
					s1min = corre_diff < s1min ? corre_diff : s1min;
				}
			}

		  	var thresholdMode = $("#active-threshold-mode").html();

		  	var range, multiplier, opacity;
		  	if (thresholdMode === "Inside" && corre_diff >= correlation_min && corre_diff <= correlation_max) {
				range = Math.pow(correlation_max, 3) - Math.pow(correlation_min, 3);
				multiplier = 1 / range;
				opacity = (Math.pow(corre_diff, 3) - Math.pow(correlation_min, 3)) * multiplier;

				opacity = opacity < 0.1 ? 0.1 : opacity; //min opacity level

				$(this).css("opacity", opacity);

				var graphNum = gID.replace("graph", "").length > 0 ? gID.replace("graph", "") : 1;
				var edgeID = removeSpecialCharactersFromNodeNameString(d.source.name) + "---" + removeSpecialCharactersFromNodeNameString(d.target.name) + "-" + graphNum;
				if (!split_graph) {
					edgeDictionary[edgeID] = graphNum;
				}
				else{
					edgeDictionary[gID][edgeID] = graphNum;
				}

				$(this).attr("id", edgeID);
			}
			else if (thresholdMode === "Outside" && (corre_diff < correlation_min || corre_diff > correlation_max)){
				range = Math.pow(correlation_max, 3) - Math.pow(correlation_min, 3);
				multiplier = 1 / range;
				var diff;
				if (corre_diff < correlation_min) {
					diff = correlation_min - corre_diff;
					opacity = (Math.pow(corre_diff, 3) - Math.pow(diff, 3)) * multiplier;
				}
				else {
					diff = corre_diff - correlation_max;
					opacity = (Math.pow(corre_diff, 3) - Math.pow(diff, 3)) * multiplier;
				}

				opacity = opacity < 0.1 ? 0.1 : opacity; //min opacity level

				$(this).css("opacity", opacity);

				if (corre_diff <= correlation_min){
					$(this).css("stroke", colHigh2);
				}

				edgeDictionary[removeSpecialCharactersFromNodeNameString(d.source.name) + "---" + removeSpecialCharactersFromNodeNameString(d.target.name)] = 1;
				$(this).attr("id", removeSpecialCharactersFromNodeNameString(d.source.name) + "---" + removeSpecialCharactersFromNodeNameString(d.target.name));
			}
			else {
				//Shouldn't get here, but just in case
				$(this).css("opacity", "0");

				opacity = 0;
			}

			if (network_links[lNum].isLow) { 
				lowCount++;
				var adjusted_diff = corre_diff - 0.05;

				$(this).css("stroke", colLow);

				red = colLow.r;
				green = colLow.g;
				blue = colLow.b;

				$(this).css("opacity", "0.5");

				opacity = 0.5;
			}

			lNum++;
	  	})
	  .attr("class", "link")
	  .attr("d", network_line)
	  .on("mouseover", mouseoveredge)
	  .on("mouseout", mouseoutedge);



	d3.select(self.frameElement).style("height", network_diameter + "px");

	loadingGif.hide();

	if (markerDetails.subjectsInMarker.length > 0){
		drawMarkerGraph();
	}
}

var mo_edge;
function mouseoveredge(edge) {
	mo_edge = this;
	$(mo_edge).addClass("edge-mouseover");

	var src = edge.source;
	var correlation;
	$(src.connections).each(function(n,d){
		if (d.name == edge.target.name){
			correlation = d.correlation;
			return;
		}
	});

	var text = edge.source.name + "<->" + edge.target.name + " (";

	//Check if this is on the main graph or the marker graph and adjust text if required
	if (markerDetails.subjectsInMarker.length > 0){
		var eID = $(mo_edge).attr("id");

		var sourceID = nodeNameToIDDictionary[removeSpecialCharactersFromNodeNameString(edge.source.name)];
		var targetID = nodeNameToIDDictionary[removeSpecialCharactersFromNodeNameString(edge.target.name)];		
		var mCorr = markerDetails.meanCorrelations[sourceID][targetID];
		var sd = markerDetails.standardDeviations[sourceID][targetID];

		//Adjust normalised correlation back to the range for this subject
		mCorr = ((mCorr*100000)*(getMaxCorrelationForCurrentNetwork()*100000))/(100000*100000);

		var markerRange = parseFloat(mCorr-sd).toFixed(2) + "-" + parseFloat(mCorr+sd).toFixed(2);

		if ( eID.indexOf("marker---")===0 ){
			//This is a marker edge
			text = "Marker: "+ text + markerRange;
		}
		else {
			//Normal edge, but there are markers
			text = text + parseFloat(correlation).toFixed(2) + "; Marker: " + markerRange;
		}
	}
	else{
		//No markers
		text = text + parseFloat(correlation).toFixed(2);
	}
	text = text + ")";


	var tooltip = $("#circle_tooltip");
	tooltip.html(text);

	tooltip.css({
		top: d3.event.pageY+5,
		left: d3.event.pageX+10
	});
	tooltip.show();
}

function mouseoutedge() {
	$("#circle_tooltip").hide();

	if (mo_edge){
		$(mo_edge).removeClass("edge-mouseover");
	}
}

function drawMarkerGraph(){
	var container = d3.select("#svg-g");
	var graph = container.insert("g", ":first-child"); //puts it in the background

	network_link = graph.selectAll(".link");
	if (markerMode === MARKER_MODE_OVERLAP){
		network_nodes = network_cluster.nodes(buildHierarchy(current_network));
	}
	else{
		network_nodes = network_cluster.nodes(buildHierarchy(markerDetails.network));	
	}	
	network_links = buildLinks(network_nodes);
	
	var lNum = 0;
	network_link = network_link.data(network_bundle(network_links))
	  .enter().append("path")
	  .each(function(d) {
	  		d.source = d[0], d.target = d[d.length - 1];

			var sourceName = removeSpecialCharactersFromNodeNameString(network_links[lNum].source.name);
			var targetName = removeSpecialCharactersFromNodeNameString(network_links[lNum].target.name);
			var sourceID = nodeNameToIDDictionary[sourceName];
			var targetID = nodeNameToIDDictionary[targetName];

			//Alter the opacity
			var corre_diff = parseFloat(markerDetails.meanCorrelations[sourceID][targetID])+1;
			var sd = markerDetails.standardDeviations[sourceID][targetID];
			var min_marker = corre_diff-sd;
			var max_marker = corre_diff+sd;

			var thresholdMode = $("#active-threshold-mode").html();

			var graphNum=1;
			var edgeID = "marker---" + sourceName + "---" + targetName + "-" + graphNum;

			var range, multiplier, opacity;
			if (markerMode === MARKER_MODE_OVERLAP){
				var normalisedCorrelations = getNormalisedCorrelationsForCurrentNetwork();
				var cnCorr = parseFloat(normalisedCorrelations[sourceID][targetID])+1;
				if (max_marker < cnCorr){
					//Value above marker
					$(this).css("stroke", "orange");
			}
				else if (cnCorr < min_marker){
					//Value below marker
					$(this).css("stroke", "lightblue");
				}

				$(this).attr("id", edgeID);
			}
			else { //Threshold
				if (thresholdMode === "Inside") {
			  		//min marker or max marker in range, or full range within min and max marker
			  		if ((min_marker >= correlation_min && min_marker <= correlation_max) || (max_marker >= correlation_min && max_marker <= correlation_max)
			  			|| (correlation_min >= min_marker && correlation_max <= max_marker)) {

						range = Math.pow(correlation_max, 3) - Math.pow(correlation_min, 3);
						multiplier = 1 / range;
						opacity = (Math.pow(corre_diff, 3) - Math.pow(correlation_min, 3)) * multiplier;

						opacity = opacity < 0.1 ? 0.1 : opacity; //min opacity level

						$(this).css("opacity", opacity);						
						$(this).attr("id", edgeID);
					}
				}
				else if (thresholdMode === "Outside"){
					console.log("outside " + min_marker + "-" + max_marker);
					range = Math.pow(correlation_max, 3) - Math.pow(correlation_min, 3);
					multiplier = 1 / range;

					var diff, firstOr;
					if (correlation_min > min_marker && correlation_max < max_marker){ //both above and below
						$(this).css("stroke", "grey");
						$(this).css("stroke-dasharray", "5,10");

						opacity = 0.5;
					}
					else if (firstOr = min_marker > correlation_max || max_marker > correlation_max){ //above
						console.log("correlation_max:" + correlation_max + "; corre_diff:" + corre_diff + "; min_marker: " + min_marker + "; max_marker:" + max_marker);

						$(this).css("stroke", "lightblue");
						if (firstOr){
							diff = min_marker - correlation_max;
						}
						else{
							diff = max_marker - correlation_max;
						}
					}
					else if (firstOr = min_marker < correlation_min || max_marker < correlation_min){ //below
						$(this).css("stroke", "orange");
						if (firstOr){
							diff = correlation_min - min_marker;
						}
						else{
							diff = correlation_min - max_marker;
						}
					}
					
					opacity = (Math.pow(corre_diff, 3) - Math.pow(diff, 3)) * multiplier;
					opacity = opacity < 0.1 ? 0.1 : opacity; //min opacity level
					$(this).css("opacity", opacity);
					$(this).attr("id", edgeID);
					
				}
			}

		  	

		  	lNum++;
	  	})
	  .attr("class", "marker-stroke")
	  .attr("d", network_line)
	  .on("mouseover", mouseoveredge)
	  .on("mouseout", mouseoutedge);
}

function drawRadialCanvas(){
	console.log("neighbours:" + neighbours);

	testCanvas = document.getElementById("testCanvas");

	//Set width and height to the same as the graph container
	testCanvas.width = graph.width();
	testCanvas.height = graph.height();

	//Create the canvas context
	ctx = testCanvas.getContext('2d');
	ctx.strokeStyle = '#000';
	ctx.lineWidth = 1;
	ctx.fillStyle = '#000'

	//Move the origin to the centre
	ctx.translate(network_radius,network_radius);

	//Clear the canvas
	var cw = testCanvas.width;
	var ch = testCanvas.height;
	ctx.clearRect(-cw/2, -ch/2, cw, ch);
	ctx.strokeStyle = "rgba(0,0,255,0.1)";

	var lNum = 0;
	var lowCount = 0;
	var red, green, blue;

	//Edges are drawn twice so this is a lookup to stop that
	var edgeDictionary = {};

	network_link = network_link.data(network_bundle(network_links))
		.enter().append("path")
		.each(function(d) {
			d.source = d[0], d.target = d[d.length - 1];

			//Only draw if it hasn't been drawn before
			if (edgeDictionary[d.target.name + "-" + d.source.name] === undefined){
				edgeDictionary[d.source.name + "-" + d.target.name] = 1;

				//Alter the opacity
				var corre_diff = parseFloat(network_links[lNum].correlation); //In multi-subject graphs, this is the difference

				if (corre_diff < 0) {
					console.log(d + ": " + connections[j]);
				}

				//Get the colours
				var colHigh1 = hexToRgb($("#colour-high1").val());
				var colHigh2 = hexToRgb($("#colour-high2").val());
				var colLow = hexToRgb($("#colour-low").val());

				if (!isDifferenceGraph) {
					corre_diff = corre_diff + 1;

					$(this).css("stroke", colHigh1);

					red = colHigh1.r;
					green = colHigh1.g;
					blue = colHigh1.b;

					//Override colour if node selected
					if (neighbours !== undefined && neighbours.length > 0 &&
						(neighbours[0].name === d.source.name || neighbours[0].name === d.target.name)) {
						red = 44;
						green = 160;
						blue = 44;
					}

					s1max = corre_diff > s1max ? corre_diff : s1max;
					s1min = corre_diff < s1min ? corre_diff : s1min;
				}
				else {
					if (originalHighCorrelationNetwork[lNum] == 2) {
						$(this).css("stroke", colHigh2);

						red = colHigh2.r;
						green = colHigh2.g;
						blue = colHigh2.b;

						s2max = corre_diff > s2max ? corre_diff : s2max;
						s2min = corre_diff < s2min ? corre_diff : s2min;
					}
					else {
						$(this).css("stroke", colHigh1);

						red = colHigh1.r;
						green = colHigh1.g;
						blue = colHigh1.b;

						s1max = corre_diff > s1max ? corre_diff : s1max;
						s1min = corre_diff < s1min ? corre_diff : s1min;
					}
				}

				if (corre_diff >= correlation_min && corre_diff <= correlation_max) {
					var range = Math.pow(correlation_max, 3) - Math.pow(correlation_min, 3);
					var multiplier = 1 / range;
					var opacity = (Math.pow(corre_diff, 3) - Math.pow(correlation_min, 3)) * multiplier;

					opacity = opacity < 0.1 ? 0.1 : opacity; //min opacity level

					$(this).css("opacity", opacity);
				}
				else {
					$(this).css("opacity", "0");

					opacity = 0;
				}

				if (network_links[lNum].isLow) {
					lowCount++;
					var adjusted_diff = corre_diff - 0.05;

					var o = adjusted_diff * 10;

					o = o < 0.1 ? 0.1 : o; //min opacity level

					$(this).css("stroke", colLow);

					red = colLow.r;
					green = colLow.g;
					blue = colLow.b;

					$(this).css("opacity", "0.5"); //o);

					opacity = 0.5;
				}

				var p = new Path2D(network_line(d));
				ctx.strokeStyle = "rgba(" + red + "," + green + "," + blue + "," + opacity + ")";
				ctx.stroke(p);
			}
			lNum++;
		})
		.attr("class", "link");
}

function buildMatrixGraph(network_json){
	//Update the global var
	current_network = network_json;

	active_network = removeBinnedNodes(current_network);

	//Clear the previous graph
	var graphDiv = $("#graph");
	var graph2Div = $("#graph2"), graph3Div = $("#graph3"), graph4Div = $("#graph4");
	graphDiv.html("");

	if (split_graph){
		graph2Div.show();
		graph3Div.show();
		graph4Div.show();
		graphDiv.css("height", "40%");
		graphDiv.css("width", "40%");
	}
	else{
		graph2Div.hide();
		graph3Div.hide();
		graph4Div.hide();
		graphDiv.css("height", "100%");
		graphDiv.css("width", "100%");
	}

	$("#loadingGif").show();

	//Work out the size of the matrix
	var network_height = graphDiv.height()*0.9;
	var network_width = graphDiv.width()*0.9;

	//Make it square
	if (network_height > network_width){
		network_height = network_width;
	}
	else{
		network_width = network_height;
	}

	var margin = {top: 250, right: 25, bottom: 0, left: 215}; //If doing full square make top: 150

	var x = d3.scale.ordinal().rangeBands([0, network_width-margin.left-margin.right]),
    	z = d3.scale.linear().domain([0, 1]).clamp(true);

	var n = active_network.length;

	var matrix = [];
	active_network.forEach(function (node, i){
		node.connections.forEach(function (child, j){
			child.parent_pos = j;
			child.pos = i;
		});
		matrix.push(node.connections);
	});

	console.log("matrix");
	console.log(matrix);

	var orders = {
	    name: d3.range(n).sort(function(a, b) { return d3.ascending(active_network[a].name, active_network[b].name); }),
	    standard: d3.range(n).sort(function(a, b) { return d3.ascending(a, b); })
	};

	// The default sort order.
	x.domain(orders.standard);

	network_svg = d3.select("#graph").append("svg")
	    .attr("width", network_width) 
	    .attr("height", network_height) 
	  	.append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var row = network_svg.selectAll(".row")
      						.data(matrix)
    					.enter().append("g")
		      				.attr("class", "row")
		      				.attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
		      				.each(row);


    row.append("line")
	    .attr("x2", network_width);

	row.append("text")
      .attr("x", -6)
      .attr("y", x.rangeBand() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "end")
      .attr("class", "node node-row-label")
      .text(function(d, i) { return active_network[i].name; });

	var column = network_svg.selectAll(".column")
						      .data(matrix)
						    .enter().append("g")
						      .attr("class", "column")
						      .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

	column.append("line")
	      .attr("x1", -network_width);

	column.append("text")
	      .attr("x", 6)
	      .attr("y", x.rangeBand() / 2)
	      .attr("dy", ".32em")
	      .attr("text-anchor", "start")
	      .attr("class", "node node-column-label")
	      .text(function(d, i) { return active_network[i].name; });

	tooltip_bg = network_svg.append("rect")
							.attr("x", 0)
							.attr("y", 0)
							.attr("rx", 4)
							.attr("ry", 4)
							.attr("width", 50)
							.attr("height", 20)
							.attr("class", "tooltip-background")
							.attr("visibility", "hidden");

	tooltip = network_svg.append("text")
							.attr("x", 0)
							.attr("y", 0)
							.attr("class", "tooltip")
							.attr("visibility", "hidden")
							.text("");


	function row(row) {
	    var cell = d3.select(this).selectAll(".cell")
	        .data(row.filter(function(d) { return d.correlation; }))
	      .enter().append("rect")
	        .attr("class", "cell")
	        .attr("x", function(d) { return x(d.parent_pos); })
	        .attr("width", x.rangeBand())
	        .attr("height", x.rangeBand())
	        .style("fill-opacity", function(d){ 
	        	if (!isDifferenceGraph){
	        		return z( (d.correlation+1)/2 );
	        	}
	        	return Math.abs(d.correlation); //Difference
	    	})
	        .style("fill", function(d){ 
	        	if (isDifferenceGraph){
	        		if (d.originalHigh == 2){
	        			return $("#colour-high2").val();
	        		}
	        	}
	        	return $("#colour-high1").val();
	    	})
	        .on("click", edgeClick)
	        .on("mouseover", mouseover)
	        .on("mouseout", mouseout);
	}	

	function order(value) {
	    x.domain(orders[value]);

	    var t = network_svg.transition().duration(2500);

	    t.selectAll(".row")
	        .delay(function(d, i) { return x(i) * 4; })
	        .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
	      .selectAll(".cell")
	        .delay(function(d) { return x(d.x) * 4; })
	        .attr("x", function(d) { return x(d.x); });

	    t.selectAll(".column")
	        .delay(function(d, i) { return x(i) * 4; })
	        .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
  	}

	var tooltip;
  	var tooltip_bg;
  	function mouseover(edge) {
		d3.selectAll(".node-row-label").classed("node--source", function(d, i) { return (i == edge.pos || active_network[i] == selectedNode1) });
	    d3.selectAll(".node-column-label").classed("node--target", function(d, i) { return (i == edge.parent_pos || active_network[i] == current_neighbours[0][0]) });

	    d3.selectAll(".row").classed("row--mouseover", function(d, i) { return i == edge.pos; });
	    d3.selectAll(".column").classed("column--mouseover", function(d, i) { return i == edge.parent_pos; });
	}

	function mouseout() {
		d3.selectAll(".node-row-label").classed("node--source", function(d, i) { return active_network[i] == selectedNode1 });
	    d3.selectAll(".node-column-label").classed("node--target",  function(d, i) { return active_network[i] == current_neighbours[0][0] });

	    d3.selectAll(".row").classed("row--mouseover", false);
	    d3.selectAll(".column").classed("column--mouseover", false);
	}

	var current_neighbours = [[]];
	function edgeClick(edge){
		if (active_network[edge.pos]==selectedNode1 && active_network[edge.parent_pos] == current_neighbours[0][0]){
			//Deselect node
			selectedNode = null;
			
			//Reset graph
			tooltip.attr("visibility", "hidden");
			tooltip_bg.attr("visibility", "hidden");

			var vals = $("#correlation-range").slider("option", "values");
			console.log("in edgeClick-buildGraph");
			buildGraph(active_network, vals[0]/100, vals[1]/100);

			clearHighlightedBrainRegions();

			return;
		}

		selectedNode1 = active_network[edge.pos];

		//2D array is how it's formed in nodeClick, and it's easier to do it this way than untangle that.
		current_neighbours[0] = [];
		current_neighbours[0].push(active_network[edge.parent_pos]);

		d3.selectAll(".node-row-label").classed("node--source", function(d, i) { return i == edge.pos; });
	    d3.selectAll(".node-column-label").classed("node--target", function(d, i) { return i == edge.parent_pos; });

	    d3.selectAll(".cell").classed("cell--selected", function(d, i) { 
	    	if (d.pos == edge.pos && d.parent_pos == edge.parent_pos){
				tooltip.attr("x", x.rangeBand()*edge.parent_pos+10)
						.attr("y", x.rangeBand()*edge.pos+20)
						.attr("visibility", "visible")
						.text( parseFloat(d.correlation).toFixed(2) );
				tooltip_bg.attr("x", x.rangeBand()*edge.parent_pos+5)
							.attr("y", x.rangeBand()*edge.pos+5)
							.attr("width", $(tooltip[0][0]).width()+10)
							.attr("visibility", "visible");

				return true;
			}
			return false; 
	    }); 

		highlightBrainRegionForNode(active_network[edge.pos].name, active_network[edge.pos].int_id, current_neighbours);
	}

	if (selectedNode1){
		nodeClick(selectedNode1)
	}

	$("#loadingGif").hide();
}

function removeBinnedNodes(network){
	var active_network = [];
	$(network).each(function(){
		if ( binnedNodeNames.indexOf(this.name) == -1){
			active_network.push(this);
		}
	});

	return active_network;
}

function buildHistogramGraph(subject1, subject2, s1name, s2name){
	//Update the global var
	if (subject2){
		calculateDifference(s1name, s2name, true);
	}
	else if (binnedNodeNames.length == 0){
		current_network = subject1;
	}

	var active_network = removeBinnedNodes(current_network);

	//Clear the previous graph
	var graphDiv = $("#graph");
	var graph2Div = $("#graph2"), graph3Div = $("#graph3"), graph4Div = $("#graph4");
	graphDiv.html("");

	if (split_graph){
		graph2Div.show();
		graph3Div.show();
		graph4Div.show();
		graphDiv.css("height", "40%");
		graphDiv.css("width", "40%");
	}
	else{
		graph2Div.hide();
		graph3Div.hide();
		graph4Div.hide();
		graphDiv.css("height", "100%");
		graphDiv.css("width", "100%");
	}

	$("#loadingGif").show();

	var network_height = graphDiv.height();
	var network_width = graphDiv.width();

	var n = !isDifferenceGraph ? 1 : 2, // number of layers
    	m = active_network.length, // number of samples per layer
    	stack = d3.layout.stack();
    
    var layers = stack(sumNodes(subject1, subject2));

    var yGroupMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y; }); }),
    	yGroupMin = d3.min(layers, function(layer) { return d3.min(layer, function(d) { return d.y; }); }),
    	yStackMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); }),
    	yStackMin = d3.min(layers, function(layer) { return d3.min(layer, function(d) { return d.y0 + d.y; }); });


	yStackMin = yStackMin > 0 ? 0 : yStackMin;
	yGroupMin = yGroupMin > 0 ? 0 : yGroupMin;

	var margin = {top: 50, right: 10, bottom: 150, left: 50},
	    width = network_width - margin.left - margin.right,
	    height = network_height - margin.top - margin.bottom;

	var labelDomain = [active_network[0].name, active_network[active_network.length-1].name];

	var x = d3.scale.ordinal()
				    .domain(labelDomain)//d3.range(m))
				    .rangeRoundBands([0, width], .08);

	var labelPosFormula = d3.scale.ordinal()
							    .domain(d3.range(m))
							    .rangeRoundBands([0, width], .08);

	var y = d3.scale.linear()
				    .domain([yGroupMin, yStackMax])
				    .range([height, 0]);

	var color = d3.scale.linear()
					    .domain([0, n - 1])
					    .range([$("#colour-high1").val(), $("#colour-high2").val()]);

	var xAxis = d3.svg.axis()
				    .scale(x)
				    .tickSize(0)
				    .tickPadding(6)
				    .orient("bottom");

	var yAxis = d3.svg.axis()
				    .scale(y)
				    .ticks(10)
				    .orient("left");

	network_svg = d3.select("#graph").append("svg")
								    .attr("width", network_width + margin.left + margin.right) 
								    .attr("height", network_height + margin.top + margin.bottom)
								    .attr("id", "histogram-graph")
								  .append("g")
								    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var layer = network_svg.selectAll(".layer")
						    .data(layers)
						  .enter().append("g")
						    .attr("class", "layer")
						    .style("fill", function(d, i) { return color(i); });

	var rect = layer.selectAll("rect")
				    .data(function(d) { return d; })
				  .enter().append("rect")
				    .attr("x", function(d) { 
				    				x(d.x); //If this doesn't get called, the labels don't show correctly - must be incrementing or something
				    				return labelPosFormula(d.x); 
				    			}) 
				    .attr("y", height)
				    .attr("width", labelPosFormula.rangeBand()) //Make this x.rangeBand to display like dominos
				    .attr("height", 0)
				    .attr("class", "bar-label")
				    .attr("id", function(d){ return d.x; })
				    .style("stroke", "black")
				    .style("stroke-width", "0.25px")
	        		.on("mouseover", mouseover)
	        		.on("mouseout", mouseout);

	rect.transition()
	    .delay(function(d, i) { return i * 10; })
	    .attr("y", function(d) { 
	    	var h = y(d.y0) - y(d.y0 + d.y)
			if (h < 0){
				return y(d.y) + h; //Lower so it's below the 0
			}
	    	return y(d.y); //To stack, change this to: d.y0 + d.y
	   	}) 
	    .attr("height", function(d) { 
	    	var h = y(d.y0) - y(d.y0 + d.y)
			if (h < 0){
				return 0-h; //absval
			}
	    	return h; 
	    })
	    .style("fill", function(d) { return color(d.from-1); });

	network_svg.append("g")
			    .attr("class", "x axis")
			    .attr("transform", "translate(0," + height + ")")
			    .call(xAxis)
		    	.selectAll("text")  
		        .style("text-anchor", "end")
		        .attr("class", "node drop")
		        .attr("dx", "-.8em")
		        .attr("dy", ".15em")
		        .attr("transform", function(d) {
		            return "rotate(-65)";
		        })
		        .on("click", clickLabel);

	network_svg.append("g")
				.attr("class", "y axis")
			    .call(yAxis);

	$(".y text").each(function(){
		var lbl = parseInt($(this).html());
	});

	function clickLabel(lbl, i){
		network_svg.selectAll(".bar-label").each(function(d,j){
			if(j==i){
				$(this).css("fill","yellow");	
			}
		})
		
	}

	function sumNodes(subject1, subject2){
		var highVals = [];
		var lowVals = [];

		for (var i=0; i<subject1.length; i++){
			var s1val = 0;
			var s2val = 0;
			for (var j=0; j<subject1[i].connections.length; j++){
				if ( binnedNodeNames.indexOf(subject1[i].connections[j].name) == -1 ){ 
					s1val += parseFloat(subject1[i].connections[j].correlation);

					if (subject2){
						s2val += parseFloat(subject2[i].connections[j].correlation);
					}
				}
			}

			if ( binnedNodeNames.indexOf(subject1[i].name) == -1 ){
				if (subject2){
					if (s1val >= s2val && s1val > 0){
						highVals.push({x:subject1[i].name, y:s1val, from:1});
						lowVals.push({x:subject2[i].name, y:s2val, from:2});
					}
					else{
						highVals.push({x:subject2[i].name, y:s2val, from:2});
						lowVals.push({x:subject1[i].name, y:s1val, from:1});
					}
				}
				else{
					highVals.push({x:subject1[i].name, y:s1val, from:1});
				}
			}
		}

		if (subject2){
			return [highVals, lowVals];	
		}

		return [highVals];
	}


	var tooltip_bg = network_svg.append("rect")
							.attr("x", 0)
							.attr("y", 0)
							.attr("rx", 4)
							.attr("ry", 4)
							.attr("width", 50)
							.attr("height", 20)
							.attr("class", "tooltip-background")
							.attr("visibility", "hidden");

	var tooltip = network_svg.append("text")
							.attr("x", 0)
							.attr("y", 0)
							.attr("class", "tooltip")
							.attr("visibility", "hidden")
							.text("");

	function mouseover(edge) {
		tooltip.attr("x", $(this).attr("x"))
						.attr("y", $(this).attr("y"))
						.attr("visibility", "visible")
						.text(edge.x + " (" + parseFloat(edge.y).toFixed(2) + ")");
		tooltip_bg.attr("x", $(this).attr("x")-5)
						.attr("y", $(this).attr("y")-15)
						.attr("width", $(tooltip[0][0]).width()+10)
						.attr("visibility", "visible");
	}

	function mouseout() {
		tooltip.attr("visibility", "hidden");
		tooltip_bg.attr("visibility", "hidden");
	}

	$("#loadingGif").hide();

	return layers;
}

function updateDashboard(){
	$("#graph-nodes").html(current_network.length - binnedNodeNames.length);
	if (currentGraphType != CIRCLE_GRAPH){
		$("#graph-size").html("N/A - complete graph with 27889 edges");
		$("#graph-ave-degree").html("N/A - complete graph 167x167");
	}
	else{
		$("#graph-size").html(graph_size);
		$("#graph-density").html(density);
		$("#graph-ave-degree").html(ave_degree);
		$("#graph-max-degree").html(max_degree);

		$("#graph-distribution-histogram").html("");
		var w = $("#graph-distribution-histogram").width()/degree_histogram.length;

		degree_histogram.forEach(function(deg, i){
			var h = (deg/max_degree) * $("#graph-distribution-histogram").height();
			var l = i*w;
			var pt = $("#graph-distribution-histogram").height() - h;
			$("#graph-distribution-histogram").append(
				"<div style='width:"+w+"px;height:"+h+"px;background-color:slateblue;position:absolute;left:"+l+"px;margin-top:"+pt+"px'></div>"
				);
		});
	}
}

function updateEdgeColours(){
	if (!selectedSubject1){
		console.log("no subject");
		return;
	}

	if (currentGraphType == MATRIX_GRAPH || currentGraphType == HISTOGRAM_GRAPH){
		console.log("matrix or histogram");
		console.log("in updateEdgeColours-buildGraph");
		buildGraph();
		return;
	}

	updateSliderBuckets();

	var lNum = 0;
	network_link.each(function(d) { 
  		var corre_diff = parseFloat(network_links[lNum].correlation);
		
		if(!$(this).hasClass("link--source") && !$(this).hasClass("link--target")){ //Only update if it's not a selected edge
			if (!isDifferenceGraph){
				$(this).css("stroke", $("#colour-high1").val());
			}
			else{
				if (originalHighCorrelationNetwork[lNum] == 2){
					$(this).css("stroke", $("#colour-high2").val());
				}
				else{
					$(this).css("stroke", $("#colour-high1").val());
				}
			}
			
			if (network_links[lNum].isLow){ //displayLowThreshold && corre_diff > 0.05 && corre_diff < 0.1){ //< 0.05){
				$(this).css("stroke", $("#colour-low").val());
			}
		}
		lNum++;
  	});
}

function updateSliderBuckets(){
	if (split_graph){

		return;
	}

	var s1maxbin = calculateEdgeBucket(s1max);
	var s2maxbin = calculateEdgeBucket(s2max);

	var max = 0;
	var s1high = s2high = 0;
	for (var b=0; b<subject1_edge_buckets.length; b++){
		max = subject1_edge_buckets[b] > max ? subject1_edge_buckets[b] : max;
		s1high = subject1_edge_buckets[b] > 0 ? b : s1high; //If bucket contains edges, mark as new high
	}

	if (isDifferenceGraph){
		for (var b=0; b<subject2_edge_buckets.length; b++){
			max = subject2_edge_buckets[b] > max ? subject2_edge_buckets[b] : max;
			s2high = subject2_edge_buckets[b] > 0 ? b : s2high;
		}
	}

	//Get colours from user selection	
	var c1 = hexToRgb($("#colour-high1").val());
	//temp
	var randCol = "#"+((1<<24)*Math.random()|0).toString(16); //https://stackoverflow.com/a/5365036/2461769
	c1 = hexToRgb(randCol);
	//end temp
	var c2 = hexToRgb($("#colour-high2").val());

	var subject1_gradientString = "to right";
	for (var b=0; b<subject1_edge_buckets.length; b++){
		var percent = b*5;
		subject1_gradientString += ",rgba(" + c1.r + "," + c1.g + "," + c1.b + "," + subject1_edge_buckets[b]/max + ") " + percent + "%";
	}

	$("#subject1-bins").css("background", "-webkit-linear-gradient(" + subject1_gradientString + ")")
							.css("background", "-o-linear-gradient(" + subject1_gradientString + ")")
							.css("background", "-moz-linear-gradient(" + subject1_gradientString + "")
							.css("background", "linear-gradient(" + subject1_gradientString + ")");

	var binW = $("#subject1-bins").width()/20;
	var lmargin = binW*(s1high+1);

	$("#subject1-bins").html("<div style='background-color:" + $("#colour-high1").val() + ";width:1px;height:100%;margin-left:" + lmargin + "px;'></div>")

	//Assume single subject then change if necessary
	$("#subject1-bins").css("height", "100%");
	$("#subject2-bins").hide();
	$("#similar-bins").hide();

	if (isDifferenceGraph){
		$("#subject1-bins").css("height", "50%");

		$("#subject2-bins").show();

		var subject2_gradientString = "right";
		for (var b=0; b<subject2_edge_buckets.length; b++){
			var percent = b*5;
			subject2_gradientString += ",rgba(" + c2.r + "," + c2.g + "," + c2.b + "," + subject2_edge_buckets[b]/max + ")";
		}

		$("#subject2-bins").css("background", -"webkit-linear-gradient(" + subject2_gradientString + ")")
								.css("background", "-o-linear-gradient(" + subject2_gradientString + ")")
								.css("background", "-moz-linear-gradient(" + subject2_gradientString + "")
								.css("background", "linear-gradient(to " + subject2_gradientString + ")");

	}
}

//Taken from: http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function buildHierarchy(classes) {
	
  var map = {};

  function find(name, data) {
    var node = map[name], i;
    if (!node) {
      node = map[name] = data || {name: name, children: []};
      if (name.length) {
      	if (bundle_edges){
        	node.parent = find(name.substring(0, i = name.lastIndexOf("_")));
			if (node.parent.children !== undefined) {
				node.parent.children.push(node);
			}
			else{
				node.parent["children"] = [node];
			}
        }
        else{
        	node.parent = {name: "", children:[]}; //null;
        }
        node.key = name;
      }
    }
    return node;
  }

  classes.forEach(function(d) {
    find(d.name, d);
  });

  return map[""];
}

var originalHighCorrelationNetwork = [];
var ave_degree, density, graph_size, degree_histogram, max_degree;
var edges;
// Return a list of links for the given array of nodes.
function buildLinks(nodes) {
	var map = {}, connections = [];

  	edges = [];

    // Compute a map from name to node.
	nodes.forEach(function(d) {
	    map[d.name] = d;
	});

	originalHighCorrelationNetwork = [];
	
	//Preparing for graph measures
	degree_histogram = [];
	max_degree = 0;
	// For each import, construct a link from the source to target node.
	var max_corre_diff = 2;
	nodes.forEach(function(d) {
	    if (d.connections){
	    	var curr_degree = 0;
		    d.connections.forEach(function(i) {
				if (map[i.name] !== undefined) {
					var corre_diff = parseFloat(i.correlation);

					edge_subject = 1;
					if (!isDifferenceGraph) {
						corre_diff = corre_diff + 1;
					}
					else {
						originalHighCorrelationNetwork.push(i.originalHigh);

						edge_subject = i.originalHigh;
					}

					edges.push(corre_diff);

					if (filteredEdgeList.indexOf(d.name + " -- " + i.name) <0 && filteredEdgeList.indexOf(i.name + " -- " + d.name)<0){
						var threshMode = $("#active-threshold-mode").html();
						if (threshMode == "Inside" && corre_diff >= correlation_min && corre_diff <= correlation_max) {
							connections.push({
								source: map[d.name],
								target: map[i.name],
								correlation: i.correlation,
								isLow: false
							});

							curr_degree++;
						}
						else if (threshMode == "Outside" && (corre_diff < correlation_min || corre_diff > correlation_max)) {
							connections.push({
								source: map[d.name],
								target: map[i.name],
								correlation: i.correlation,
								isLow: false
							});

							curr_degree++;
						}


						if (displayLowThreshold && isDifferenceGraph) {
							if (i.original && i.original > 0.75) {
								if (corre_diff < 0.1) {
									connections.push({
										source: map[d.name],
										target: map[i.name],
										correlation: i.correlation,
										isLow: true
									});
								}
							}
						}
					}

					//Max
					max_corre_diff = max_corre_diff > corre_diff ? max_corre_diff : corre_diff;
				}
		    });
			max_degree = max_degree > curr_degree ? max_degree : curr_degree;
		    degree_histogram.push(curr_degree);
	 	}
	});

	function connectionsCompare(a,b){
		if (a.isLow && !b.isLow){
			return -1;
		}

		if (!a.isLow && b.isLow){
			return 1;
		}

		return 0;
	}

	if (subjectChange){
		//Update the slider
		if (max_corre_diff > 2){ 
			var m = Math.ceil(max_corre_diff)*100;
			$("#correlation-range").slider( "option", "max",  m);
		}
		else{
			//Reset
			$("#correlation-range").slider( "option", "max",  200);
		}

		//Calculate graph measures
		ave_degree = 2*(connections.length/167);
		density = parseFloat((2*connections.length)/(167*166)).toFixed(3);
		graph_size = connections.length/2;

		//Clear buckets
		addToEdgeBuckets(null, -1, null, null);
		//Add for current subject
		edges.forEach(function(edge){
			addToEdgeBuckets(edge, edge_subject, $("#correlation-range").slider("option", "min"), $("#correlation-range").slider("option", "max"));
		});
		//Update colours
		updateSliderBuckets();
	}

	//So the yellow edges are in the background (SVG displays as it is passed objects and you can't change the z-index)
	connections.sort(connectionsCompare);

	return connections;
}

function addToEdgeBuckets(edge_val, subject, min_sliderval, max_sliderval){
	if (!edge_val && subject == -1){ //Clear the buckets
		subject1_edge_buckets = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
		subject2_edge_buckets = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
		return;
	}

	var bucket = calculateEdgeBucket(edge_val, min_sliderval, max_sliderval);

	if (bucket > 20){ console.log("EDGE_VAL: " + edge_val + "; BUCKET: " + bucket); }

	switch(subject){
		case 1:
			subject1_edge_buckets[bucket] += 1;
			break;
		case 2:
			subject2_edge_buckets[bucket] += 1;
			break;
	}
}

function calculateEdgeBucket(edge_val, min_sliderval, max_sliderval){
	min_sliderval = min_sliderval > 1 ? min_sliderval : 0; 
	var jump = ((max_sliderval/100) - min_sliderval)/20;
	var bucket = Math.floor(edge_val/jump);

	return bucket;
}
