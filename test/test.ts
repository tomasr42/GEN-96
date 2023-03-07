function test1(fileName) {
    console.log("Matching on: " + fileName);
    let regex = "^[0-9A-Z_]+-MUS.*";

    //let match = fileName.match(/^[0-9A-Z_]+-MUS.*/);
    let match = fileName.match(regex);
    if (match) {
        console.log("Match: " + match);
    } else {
        console.log("Mismatch");
    }
    console.log("---");
}
    
let fileName1 = "3_01_3_a3851__-MUS3000R56S.mp4";
let fileName2 = "3_01_3_3851__-MUS3000R56S.mp4";
let fileName3 = "3_01_3-3851__-MUS3000R56S.mp4";
let fileName4 = "2_05_3_M_440_-MUS3000QX4U.mp4";

test1(fileName1);
test1(fileName2);
test1(fileName3);
test1(fileName4);

// JSON stuff

let json = '{"data":{"sourceMOB":"2102302150262067707","destinationStoragePurpose":"HIGHRES","removeHoldTime":"300","destinationZone":"northholland","owner":"DAEMON+autoimportd","transcoderProfile":"coder","transcoderCluster":"import","sourceMIN":"2102302150712400208","postImportRemoveSource":true,"description":"Transcoding MUS021TOR 3_01_3_0021__-MUS3000KGZB"},"apitype":"TRANSFER.BrowseRequest","version":1}';
let aux = JSON.parse(json);
/*
let text = "";
for (const x in obj) {
  text += obj[x] + ", ";
}
*/
if (aux.data.transcoderProfile != undefined) {
    console.log("target folder from xfer request = " + aux.data.transcoderProfile);
    delete aux.data.transcoderProfile;
}
if (aux.data.transcoderCluster != undefined) {
    console.log("target folder from xfer request = " + aux.data.transcoderProfile);
    delete aux.data.transcoderCluster;
}
if (aux.data.description != undefined) {
    if (aux.data.description.match(/^Transcoding/)) {
        aux.data.description = aux.data.description.replace(/^Transcoding/, "Central transfer for");
    }
}
if (aux.apitype != undefined && aux.apitype == "TRANSFER.BrowseRequest") {
    aux.apitype = "TRANSFER.SimpleRequest";
}

for (var prop in aux) {
    console.log(prop + ': ' + aux[prop]);
}
//= aux.getOwnPropertyNames();
console.log(typeof aux);

console.log(JSON.stringify(aux));

console.log("-------------");

var regex = "^TENANT_*";
var root = ["NISV_ADMINISTRATORS", "EXT"];
var groups = ["ADSF", "NISV_ADMINISTRATORS", "TENANT_NISV", "TENANT_asdf"];


for(var i = 0; i < groups.length; i++) {
       var group = groups[i];
       for( var j in root ) {
           if (group == root[j]) {
               console.log("Add group to ACLs: " + group);
           }
       }
       if (group.match(regex)) {
               console.log("Add group to ACLs: " + group);
       }
}
