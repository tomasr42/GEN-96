function getTransferRequest(js, xfr) {
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
    
    /* This is the earliest point in time to call the museum logic  */
    museumLogic(xfr);

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
    

/**
 * Updates the transfer request and prevents transcode for museum content 
 * from "processed" sources. The idea is to try and fail the check as 
 * soon as possible to avoid performance overhead for non-museum transfers.
 *
 * @param {TransferRequest} xfr The transfer request object.
 * @return {TransferRequest} xfr The transfer request. 
 */
function museumLogic(xfr) {
    var minId, min, auxData, match;
    var payload = xfr.getPayload();
    var source  = payload.getSource();
    var options = payload.getOptions();
    
    // Step 1: An initial and cheap sanity check
    if (typeof options === 'undefined') {
        alert ("Transfer Reroute: No xfer options. This is unlikely an import. Skipping museum tenancy logic");
        return xfr;
    } 
    
    // Fetching the MIN from the source object. 
    minId = source.getMin();
    alert("got min:" + minId);
    if (!minId) { return xfr; }
    min = getMINById(minId);

    // Step 2: Check if we're importing.
    if (!isSourceImport(min)) {
        return xfr;
    }
    
    // Step 3: Check if GUCI contains "MUS" for museum.
    if (!checkGUCI(min)) {
        return xfr;
    }

    // Step 4: Check if the museum media import is from a "processed" source. 
    if (!isMuseumProcessedContent(min)) {
        return xfr;
    }

    // Step 5: Reset the transfer options and aux data to avoid a transcode
    alert("Transfer Reroute: Filename matched for Museum: " + match);
    alert("Transfer Reroute: Got Options. We need to erase this: " + options.generateXML());
    options = new TransferRequestOptions();
    payload.setOptions(options);

    auxData = payload.getAuxData();
    if (typeof auxData !== 'undefined') {
        alert ("Transfer Reroute: Got aux data. We need to erase this: " + auxData);
        payload.setAuxData(encode_json('{}'));
    }
    return xfr;
}

/**
 * Return true if the source media filename is containing the museum GUCI "MUS". 
 *
 * @param {MIN} min The source min object.
 * @return {boolean} True GUCI matches MUS, else False. 
 */
function checkGUCI(min) {
    var match, fileName;
    var retval = false;
    
    /* CONSTANTS FOR MUSEUM */
    var MUSEUM_GUCI_REGEX = "^[0-9A-Z_]+-MUS.*";
    
    fileName = min.getFileName();
    if (!fileName) {
        alert("Transfer Reroute: No filename on the MIN!");
        return retval;
    }
    alert("Transfer Reroute: Identified source file name: " + fileName);
    // fileExt = fileName.split('.').pop();
    match = fileName.match(MUSEUM_GUCI_REGEX);
    if (!match) { 
        return retval; 
    }
    retval = true;
    return retval;
}

/**
 * Returns true if the source is from an import storage. 
 * It's necessary to fetch the storage from the MIN as the 
 * source object is unlikely to contain the storage for an import. 
 *
 * @param {MIN} min The source min object.
 * @return {boolean} True if import, else False. 
 */
function isSourceImport(min) {
    var storage, srcStorage;
    var retval = false;
    
    /* CONSTANTS FOR MUSEUM */
    var MAYAM_NORMAL_IMPORT_STORAGE = "mayam-normal-imp";
    var MAYAM_PRIO_IMPORT_STORAGE   = "mayam-prio-imp";

    storage = min.getStorage();
    if (!storage) { 
        return retval; 
    }

    srcStorage = getStorageById(storage).getHandle();
    if (!srcStorage) { 
        return retval; 
    }
    alert ("Transfer Reroute: Got storage: " + srcStorage);

    // Ugly, but they are the same on both prod and stage.
    if (!(srcStorage == MAYAM_NORMAL_IMPORT_STORAGE || srcStorage == MAYAM_PRIO_IMPORT_STORAGE)) { 
        return retval; 
    }
    retval = true;
    return retval;
}

/**
 * Returns true if the asset associated with the transfer has 
 * Created By set to "Content Creator"
 *
 * @param {MIN} min The source min object.
 * @return {boolean} True if Content Creator, else False. 
 */
function isMuseumProcessedContent(min) {
    var assetId, asset, metadataObj, field, createdBy;
    var retval = false;

    /* CONSTANTS FOR MUSEUM */
    var MUSEUM_METADATA_FIELD       = "nisv.createdby";
    var MUSEUM_CREATED_BY           = "ContentCreator";

    assetId = min.getParentItem();
    if (assetId == null) { 
        return retval; 
    }
    asset = getItemById(assetId);
    try {
        metadataObj = getItemMetadataById(assetId);
    } catch(e) {
        alert("Error calling the getItemMetadataById:" + e);
        return retval;
    }
    if (!metadataObj) { 
        return retval; 
    }
    field = metadataObj.getField(MUSEUM_METADATA_FIELD);
    if (typeof field === 'undefined') {
        alert("Transfer Reroute: No field for created by for item: " + assetId);
        return retval;
    }
    createdBy = field.getValue();
    if (createdBy === 'undefined' || createdBy == '') { 
        alert("Transfer Reroute: nisv.createdby not set for item: " + assetId);
        return retval; 
    }
    if (createdBy != MUSEUM_CREATED_BY) {
        alert("Transfer Reroute: Found item having 'Created By' set, just not to ContentProcessor: " + createdBy);
        return retval;
    }
    retval = true;
    return retval;
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

