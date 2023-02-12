function getTransferRequest(js, xfr) {
    
    // This version adds a number of alerts to easily see where it might fail for debugging purposes
    // Load the transfer details into more descriptive variables 
    var payload = xfr.getPayload();
    alert ("Transfer Reroute: Got Payload" + payload.generateXML());
    if (!payload) { return xfr; }
    // alert ("Transfer Reroute: Payload is not null");

    var source = payload.getSource();
    // alert ("Transfer Reroute: Got Source: " + source);
    if (!source) { return xfr; }
    // alert ("Transfer Reroute: Source is not null!");

    var mobID = source.getMob();
    if (!mobID) { return xfr; }
    // alert ("Transfer Reroute: Got Mob ID: " + mobID);

    var destination = payload.getDestination();
    // alert ("Transfer Reroute: Got destination: " + destination + " and it is not null");
    if (!destination) { return xfr; }
    // alert ("Transfer Reroute: Destination is not null");
    museumLogic(payload, mobID);

    // Fetch the storage handle to check where the tranfer is going to
    // Using handle because it is safer to check compared to the ID
    var storageCheck = destination.getStorage();
    // alert ("Transfer Reroute: Got something here: " + storageCheck);
    if (!storageCheck) { return xfr; }

    var destinationStorage = getStorageById(storageCheck).getHandle();
    // alert ("Transfer Reroute: Got storage handle: " + destinationStorage);
    if (!destinationStorage) { return xfr; }
	// alert ("Transfer Reroute: Destination storage is not null");

    // Need to make sure that the desitnation storage for the transfer is one of the portals
    // The source should only be changed if it's going towards one of them
    // This could probably be changed to storage groups instead
    var storageMPP = "mpp-secure-links";
    var storageGPP = "nisv-exp-test101";
    var storageOMP = "po-npomp01-expftp"; 
    
    // alert ("Transfer Reroute: Successfully entering reroute");
    if (destinationStorage == storageMPP || destinationStorage == storageGPP || destinationStorage == storageOMP) {

      	// Print the payload so we can see it before it's changed
        alert ("Transfer Reroute: Here is the initial payload!" + payload.generateXML());
        var mob = getMOBById(mobID);
        // alert ("Transfer Reroute: Checking if transfer is initated from safety storage");

      	// Load the all the MINs associated with the mobID into a MINQuery
        var sourceQuery = new MINQuery();
        sourceQuery.setParentMob(mobID);
        var mins = getMINs(sourceQuery).getEntries();
        
        var invalidSourceStorage = "img-objecten-safety";
        var usingInvalidStorage = false;      	

        // alert ("Transfer Reroute: Checking if transfer request needs to be rerouted.");

      	// Make sure none of the files in the transfers are coming from the wrong storage
        for (var i = 0; i < mins.length; i++) {
            if (getStorageById(mins[i].getStorage()).getHandle() == invalidSourceStorage) {
                usingInvalidStorage = true;
                break;
            }
        }
        if (!usingInvalidStorage)
            return xfr;
		
      	// Since we seem to be getting a transfer from the wrong storage we need to do some changes
      	// Go through the parent item of the transfer and check if there are any files on the storage we want a transfer from
        var parentItemId = mob.getParentItem();
        // alert ("Transfer Reroute: Found parent " + parentItemId + " will start looking for MIN on img-objecten-arc");
        var minQuery = new MINQuery();
        minQuery.setParentItem(parentItemId);
		
		
        var minCollection = getMINs(minQuery);
        mins = minCollection.getEntries();
        var correctMob = null;
    
      	// Check what storage every min in the parent item are using
      	// Check if any are on the storage the transfer should use
        var targetStorage  = "img-objecten-arc";
        for (var i = 0; i < mins.length; i++) {
            // Checking the storage handle because it's safer to do than checking the ID
            // alert ("Transfer Reroute: Checking storage of " + mins[i].getId());
            minStorage = getStorageById(mins[i].getStorage());
            minStorage = minStorage.getHandle()


            if (minStorage == targetStorage) {
                //  alert ("Transfer Reroute: The MIN that should be used is: "+ mins[i].getId());
                correctMob = mins[i].getParentMob();
                break;
            }
        }

      	// If a min was und on the storage we want then we can reroute the transfer
        if (correctMob) {
            // Changing the source mob as it is what the transfer is using to know what should be transferred
            // alert ("Transfer Reroute: Ok changing source");
            source.setMob(correctMob);
            alert ("Transfer Reroute: Here is the modified payload!" + payload.generateXML());
        }
        else {
            alert ("Transfer Reroute: Nothing was probably done, finishing");
        }
    }
    alert ("Returning xfr");
    return xfr;
    alert ("Wait, we're not supposed to be here,something went REALLY wrong");
}
    
function museumLogic(payload, mob_id) {
    var mob, asset, asset_id, options, aux_data, metadata_obj, tape_group;

    options = payload.getOptions();
    if (typeof options === 'undefined') {
        alert ("Transfer Reroute: No options");
    } else {
        alert ("Transfer Reroute: Got Options" + options.generateXML());
        //alert ("Transfer Reroute:" + options.getTranscoderCluster());
        alert ("Transfer Reroute:" + options.transcoderCluster);
        //payload.setOptions(null);
        //payload.setAuxData(null);
    }
    
    aux_data = payload.getAuxData();
    if (typeof aux_data === 'undefined') {
        alert ("Transfer Reroute: No aux data");
    } else {
        alert ("Transfer Reroute: Got aux data" + aux_data.generateXML());
    }

    mob = getMOBById(mob_id);
    asset_id = mob.getParentItem();
    if (asset_id == null) {
        return;
    }
    asset = getItemById(asset_id);
    try {
        metadata_obj = getItemMetadataById(asset_id);
    } catch(e) {
        alert("Error calling the getItemMetadataById:" + e);
        return;
    }

    if(metadata_obj) {
        tape_group = metadata_obj.getField('nisv.tapegroup').getValue();
        if(tape_group && tape_group == 'BG_MUS_TAPE') {
            alert("Found item having museum tape group:" + asset_id);
        } else {
            alert("Item didn't have museum tape group: " + asset_id);
        }
    } else {
        alert("Item didn't have metadata, ignoring: " + asset_id);
    }
    return payload;
}

function shouldCalculateMd5Sum(js, xfr, item) {
    return 0;
}

/*
    Parameters:
                     xfr: the original request which this individual resolve-step is part of
       criteria_profiles: the profiles that the transfer system thinks fits this transfer
            all_profiles: all transcoder profiles in the system

    function getConversionTranscoderProfile(js, xfr, criteria_profiles, all_profiles) {
        var x = criteria_profiles.getEntries();
        for (i = 0; i < x.length; i++) {
            console.log("transcoder", i);
            console.log("property getName", x[i].getName());
            console.log("property getProfileSet", x[i].getProfileSet());
            console.log("property getRemoteName", x[i].getRemoteName());
            console.log("property getStepMethod", x[i].getStepMethod());
            console.log("property getRank", x[i].getRank());
            console.log("property getTargetFormats", x[i].getTargetFormats());
            console.log("property getStorage", x[i].getStorage());
            console.log("property getInputPath", x[i].getInputPath());
            console.log("property getOutputPath", x[i].getOutputPath());
            console.log("property getOutputExtension", x[i].getOutputExtension());
        }
        return null;
    }

    Return value: The name of the transcoder. Returning null means that you
    make no choice and leave it to the transfer system to pick the transcoder
    it thinks is the best one. That usually means it will pick the one with the
    highest rank.

*/
function getConversionTranscoderProfile(js, xfr, criteria_profiles, all_profiles) {
    return null;
}

