function test(fileName) {
    console.log("Matching on: " + fileName);
    let match = fileName.match(/^[0-9_]+-MUS.*/);
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

test(fileName1);
test(fileName2);
test(fileName3);
