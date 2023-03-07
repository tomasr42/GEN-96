# GEN-96
Make getTransferRequest skip transcode for museum tenancy

# BACKGROUND
Museum tenancy MP4 files crash during browsegen. The plan is to make getTransferRequest skip browsegen if the tenant is museum. 

# DESCRIPTION
Development is in VS Code. 
compile using ``tsc getTransferRequest.ts``

# OVERVIEW OF FILES
```
getTransferRequest.js <== The file deployed on the Viz One. Never change this manually!
getTransferRequest.ts <== This is the main source code. Compile it into getTransferRequest.js
GMI/ <== For testing. Helps transferring GMI files 
+-- gmi/
+-- media
|   +-- manifest.dat
|   `-- README.txt
+-- result
+-- run-gmi.sh
`-- templates
|   +-- 01-PGM.xml
|   +-- 02-ITM.xml
|   `-- program-md.xml
test/
`-- test.ts <== for testing without having to deploy to the Viz One
```

# DEPLOYING
See the related repo "playbooks" and ``ansible-playbook -i inventory/inv_st deploy-getTransferRequest.yml --ask-pass``
Note that it takes _this_ repo as parameters for where to find getTransferRequest.js

# INVESTIGATION

**Test item**

https://studio-staging7.mam.beeldengeluid.nl/studio/#ItemPlace:2102302010095588721

**Forcing a transfer**

transfermgr copy min 2102302010707274408 stg central-hr-1

**Making an import**

armedia@st-hr-bng-01:~ # cd /ardome/media/imp/museum-nobrowsegen-imp/
armedia@st-hr-bng-01:/ardome/media/imp/museum-nobrowsegen-imp # cp MUSEUMTESTER_MUS1000AA07.mxf MUSEUMTESTER_MUS1000AA20.mxf

**This is what a transcode looks like with normal browsegen**

``` xml
IMPORTD-234031.337-230206-55096-INFO: Transfer Reroute: Got Payload<?xml version="1.0" encoding="UTF-8"?>
<atom:entry xmlns:atom="http://www.w3.org/2005/Atom" xmlns:core="http://ns.vizrt.com/ardome/core" xmlns:server="http://ns.vizrt.com/ardome/server" xmlns:storage="http://ns.vizrt.com/ardome/storage" xmlns:transcoder="http://ns.vizrt.com/ardome/transcoder" xmlns:transfer="http://ns.vizrt.com/ardome/transfer">
  <atom:title>Untitled</atom:title>
  <transfer:source>
    <atom:link rel="min" type="application/atom+xml;type=entry" href="https://studio-staging7.mam.beeldengeluid.nl/api/media/min/2102302060709445308"/>
    <atom:link rel="mob" type="application/atom+xml;type=entry" href="https://studio-staging7.mam.beeldengeluid.nl/api/media/mob/2102302060260315907"/>
    <core:ardomeIdentity name="min">2102302060709445308</core:ardomeIdentity>
    <core:ardomeIdentity name="mob">2102302060260315907</core:ardomeIdentity>
  </transfer:source>
  <transfer:destination>
    <storage:class>central</storage:class>
    <storage:type>A</storage:type>
    <storage:purpose>HIGHRES</storage:purpose>
    <server:zone>northholland</server:zone>
  </transfer:destination>
  <transfer:options>
    <transfer:removeHoldTime>300</transfer:removeHoldTime>
    <transcoder:profileName>coder</transcoder:profileName>
    <transcoder:cluster>import</transcoder:cluster>
    <transfer:postImportRemoveSource>1</transfer:postImportRemoveSource>
  </transfer:options>
  <transfer:auxData>{"apitype":"TRANSFER.BrowseRequest","data":{
    "postImportRemoveSource":true,"destinationStoragePurpose":"HIGHRES",
    "removeHoldTime":"300","destinationZone":"northholland","sourceMIN":"2102302060709445308","transcoderCluster":"import",
    "sourceMOB":"2102302060260315907",
    "owner":"DAEMON+autoimportd","description":"Transcoding Langs de Lijn En Omstreken 2023020621RA1-RCR3000KF68.wav",
    "transcoderProfile":"coder"},
    "version":1}</transfer:auxData>
</atom:entry>
```

**This is what a transfer looks like from transfermgr copy**

```xml
INFO: Transfer Reroute: Got Payload<?xml version="1.0" encoding="UTF-8"?>
<atom:entry xmlns:atom="http://www.w3.org/2005/Atom" xmlns:core="http://ns.vizrt.com/ardome/core" xmlns:transfer="http://ns.vizrt.com/ardome/transfer">
  <atom:title>Untitled</atom:title>
  <transfer:source>
    <atom:link rel="min" type="application/atom+xml;type=entry" href="https://studio-staging7.mam.beeldengeluid.nl/api/media/min/2102302010707274408"/>
    <core:ardomeIdentity name="min">2102302010707274408</core:ardomeIdentity>
  </transfer:source>
  <transfer:destination>
    <atom:link rel="storage" type="application/atom+xml;type=entry" href="https://studio-staging7.mam.beeldengeluid.nl/api/storage/25"/>
    <core:uniqueNumber name="storage">25</core:uniqueNumber>
  </transfer:destination>
  <transfer:options/>
</atom:entry>
```

So I want to hijack the transfer and rip out these two:
```xml
    <transcoder:profileName>coder</transcoder:profileName>
    <transcoder:cluster>import</transcoder:cluster>
```
and this one, for good measure
```xml
  <transfer:auxData>...
```
