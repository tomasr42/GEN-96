#!/bin/bash
if [ $# != 1 ]
then
  echo "Usage: $0 <TAG>"
  echo "Example: $0 MYTAG" 
  echo "The tag should preferably be in all UPPERCASE letters."
  exit
fi

### Changeme if you wish to use another prefix for the tests
# Do NOT use numbers. Only uppercase letters please, or it'll break further down.
BASENAME="MUS"

# GuciBasename (affects filenames), is extended once the SEQ is calculated
GUCIBASEPFX="3.01.3.0"
GUCIFILEPFX="3-01-3-0"


# Toggle to "1" if you wish to auto-scp the files which is mandatory if you are using 
# multiple lines in the manifest file
AUTO_SCP=1

#########################

### Fix the tag so it's all UPPERCASE
VAR=$(tr '[:lower:]' '[:upper:]' <<< ${1})
TAG=$(sed 's/[^A-Z]\+//g' <<< $VAR)


#### Static vars. No need to change anything
TEMPLATE_DIR="templates"
GMI_DIR="gmi"
MEDIA_DIR="media"
MANIFEST="manifest.dat"
# ESSENCE="Archief\ Arendo\ Joustra.pdf"
# MEDIA_FILE="${MEDIA_DIR}/${ESSENCE}"

MANIFEST_FILE="${MEDIA_DIR}/${MANIFEST}"

PGM="01-PGM.xml"
PGM_MD="program-md.xml"
ITM="02-ITM.xml"
DATE=$(date +%Y-%m-%d)
WFE_SERVER="st-wfe-bng-01.mam.beeldengeluid.nl"

### Identify the next counter

# Always start at 1, unless we find something
SEQ=$(printf "%03d\n" 1)

if [ "$AUTO_SCP" -eq "1" ]
then
  echo "Do these manually:"
fi

while read SRC_FILE 
do
    LIST=$(\ls -1 ${GMI_DIR}/${BASENAME}???${TAG}.xml 2> /dev/null)
    if [ "$?" -eq "0" ]
    then
      # Wildly assuming this to be correct
      FIRST=$(basename $(sort -r <<< "$LIST" | head -n 1))
      OLD_SEQ=$(grep -Eo "[0-9]{3}" <<< "$FIRST")
      if [ "$?" -eq "0" ]
      then
        SEQ=$((10#$OLD_SEQ + 1))
        SEQ=$(printf "%03d\n" $SEQ)
      fi
    fi
    #echo "Using sequence ${BASENAME}${SEQ}${TAG}" 


    ### Delete any old file 
    if [ -n "${OLD_SEQ}" ]
    then
      OLD_GMI_XML="${GMI_DIR}/${BASENAME}${OLD_SEQ}${TAG}.xml"
      rm -f ${OLD_GMI_XML}
    fi

    TITLE="${BASENAME}${SEQ}${TAG}"
    GUCIBASE="${GUCIBASEPFX}${SEQ}"
    GUCIFILE="${GUCIFILEPFX}${SEQ}"

    FILENAME="0${SEQ}"
    GMI_XML="${GMI_DIR}/${TITLE}.xml"
    cat "${TEMPLATE_DIR}/${PGM}" >> $GMI_XML
    cat "${TEMPLATE_DIR}/${PGM_MD}" >> $GMI_XML
    cat "${TEMPLATE_DIR}/${ITM}" >> $GMI_XML
    perl -pi -e "s/PGMTOR0000000000/PGM${TITLE}/" $GMI_XML
    perl -pi -e "s/TITLE/${TITLE}/" $GMI_XML
    perl -pi -e "s/REFID/${TITLE}/" $GMI_XML
    perl -pi -e "s/SOURCEID/${GUCIBASE}/" $GMI_XML
    perl -pi -e "s/CARRIERSOURCE/${FILENAME}.mp4/" $GMI_XML
    perl -pi -e "s/BASENAME/${GUCIBASE}/" $GMI_XML
    perl -pi -e "s/FILENAME/${FILENAME}.mp4/" $GMI_XML
    perl -pi -e "s/GMI_TEST/${TITLE}/" $GMI_XML
    perl -pi -e "s/DATE/$DATE/" $GMI_XML

    ### xfer step. Transfers the gmi/*.xml files and the .mxf file to match the GMI_XML filename
    TARGET_MEDIA_FILENAME="${FILENAME}.mp4"

### Note: You need to toggle AUTO_SCP (above) to "1" if you're using multiple lines 
# in the manifest file, or the GMI XML file will be deleted before you have a chance to send it. 
# (Damned lazy programmer!)
if [ "$AUTO_SCP" -eq "1" ]
then
    echo "transferring \"${MEDIA_DIR}/${SRC_FILE}\" -> ${TARGET_MEDIA_FILENAME}"
    scp $GMI_XML armedia@${WFE_SERVER}:/import/mayam/incoming/general/
    scp "${MEDIA_DIR}/${SRC_FILE}" armedia@${WFE_SERVER}:/import/mayam/incoming/general/${TARGET_MEDIA_FILENAME}
else
    cp $GMI_XML ${GMI_XML}.bak
    echo "scp $GMI_XML armedia@${WFE_SERVER}:/import/mayam/incoming/general/"
    echo "scp \"${MEDIA_DIR}/${SRC_FILE}\" armedia@${WFE_SERVER}:/import/mayam/incoming/general/${TARGET_MEDIA_FILENAME}"
fi

done < ${MANIFEST_FILE} 

