function rendererMouseUp(l,m,r){
	//If roi atlas and network, show the node on the network
	if (display_rois && current_mouseover && selectedSubject1){

		nodeClick(current_network[current_mouseover.node_arr_pos]);
	}
}

var current_mouseover;
var prev_mouseover;
function rendererMouseMove(){
	if (!display_rois){
		return;
	}

	if (selectedNode){
		return;
	}

    // grab the current mouse position
    var _pos = niftiAll.interactor.mousePosition;

    // pick the current object
    var _id = niftiAll.pick(_pos[0], _pos[1]);

    if (_id != 0) {
    	prev_mouseover = current_mouseover;
   		current_mouseover = niftiAll.get(_id);

        //Ensure it is an ROI, then grab the object and turn it green
        if (current_mouseover!= brain && current_mouseover != l_pial && current_mouseover != r_pial && current_mouseover != l_smoothwm && current_mouseover != r_smoothwm
        	&& current_mouseover._classname != "slice" && current_mouseover._classname != "object"){

			//Clear the previous
	    	if (prev_mouseover){
	    		prev_mouseover.color = [0, 0, 1];
	    	}

       		current_mouseover.color = [0, 1, 0];
       	}
       	else {
       		if (current_mouseover){
       			current_mouseover.color = [0, 0, 1];
       			current_mouseover = null;
       		}
       		if(prev_mouseover){
        		prev_mouseover.color = [0,0,1];
        		prev_mouseover = null;
        	}
       	}
    } 
    else {
        //No roi under the mouse - set back to blue
        if (current_mouseover){
        	current_mouseover.color = [0, 0, 1];
        	current_mouseover = null;
        }
        if(prev_mouseover){
        	prev_mouseover.color = [0,0,1];
        	prev_mouseover = null;
        }
    }
}