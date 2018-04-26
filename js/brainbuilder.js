var pial, smoothwm, niftiAll, niftiX, niftiY, niftiZ;
var l_pial, r_pial, l_smoothwm, r_smoothwm, brain;

var modelDir = "data/anatomical_template_data/";
var modelNames = [["2mm_lh_pial.obj", "2mm_rh_pial.obj"]];
var brainLoaded = false;
var volumeLoaded = false;

var prev_indexX, prev_indexY, prev_indexZ;

var l_pial_raw, r_pial_raw, l_smoothwm_raw, r_smoothwm_raw, l_inflated_raw, r_inflated_raw;
var l_roiMap, r_roiMap;

function loadAndDisplayBrain(){
	// create and initialize renderers
	niftiAll = new X.renderer3D();
	niftiAll.container = 'niftiAll';
	niftiAll.init();
	niftiAll.camera.position = [0, 0, 200];

	// create a new X.mesh and attach an obj file
	l_pial = new X.mesh();
	l_pial.file = modelDir + modelNames[0][0];
	l_pial.opacity = 0.5;

	r_pial = new X.mesh();
	r_pial.file = modelDir + modelNames[0][1];
	r_pial.opacity = 0.5;

	brain = new X.volume();
	niftiAll.add(l_pial);
	niftiAll.add(r_pial);

	// trigger rendering
	niftiAll.render();

	niftiAll.onShowtime = function() {
		niftiAll.interactor.onMouseUp = rendererMouseUp;
		niftiAll.interactor.onMouseMove = rendererMouseMove;		

		//This is called when a new IC brian is added, so need to set opacity here
		brain.opacity = 0;

		brainLoaded = true;
	};
}

function getParsedSurfaceVertices(data){
	var lines = data.split("\n");

	var pts = [];

	for (var i=0; i<lines.length; i++){
		if (lines[i][0] != "v"){ //Ignore the faces etc., only check vertices
			break;
		}

		var line = lines[i].split(" ");
		pts.push([parseFloat(line[1]), parseFloat(line[2]), parseFloat(line[3])]);
	}

	return pts;
}

function mapSurfaceAndROI(){
	$.get("data/anatomical_template_data/average_lh_pial.obj", function(data){
		l_pial_raw = getParsedSurfaceVertices(data);
	});
	$.get("data/anatomical_template_data/average_rh_pial.obj", function(data){
		r_pial_raw = getParsedSurfaceVertices(data);
	});
	$.get("data/anatomical_template_data/average_lh_smoothwm.obj", function(data){
		l_smoothwm_raw = getParsedSurfaceVertices(data);
	});
	$.get("data/anatomical_template_data/average_rh_smoothwm.obj", function(data){
		r_smoothwm_raw = getParsedSurfaceVertices(data);
	});
	$.get("data/anatomical_template_data/average_lh_inflated.obj", function(data){
		l_inflated_raw = getParsedSurfaceVertices(data);
	});
	$.get("data/anatomical_template_data/average_rh_inflated.obj", function(data){
		r_inflated_raw = getParsedSurfaceVertices(data);
	});
	$.get("data/anatomical_template_data/average_lh_vertex_ROIids", function(data){
		l_roiMap = data.split("\n");
	});
	$.get("data/anatomical_template_data/average_rh_vertex_ROIids", function(data){
		r_roiMap = data.split("\n");
	});
}

var roiVolumesCreated = false;
var roiJSON = {};
function setUpROIPoints(){
	if (!roiVolumesCreated){
		roiVolumesCreated = true;
	
		//Function is called from within the AJAX complete (also called in onShowTime), but better to check 
		if (!roi_legend){
			roiVolumesCreated = false;
			return;
		}

		for (var i=0; i<roi_legend.length; i++){
			roiJSON[roi_legend[i].int_id] = { "roi": new X.mesh() };

			//Load the rois and make sure they're positioned correctly
			roiJSON[roi_legend[i].int_id].roi.file = "data/rois/" + roi_legend[i].int_id + ".obj";
			roiJSON[roi_legend[i].int_id].roi.opacity = 0.2;
			niftiAll.add(roiJSON[roi_legend[i].int_id].roi);
			
			roiJSON[roi_legend[i].int_id].roi.visible = false;
			
			//Create new variable on the mesh for atlas selection
			roiJSON[roi_legend[i].int_id].roi.node_arr_pos = i;
		}
	}
}
