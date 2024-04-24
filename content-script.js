console.log('Content script loaded');

if (window.trustedTypes && window.trustedTypes.createPolicy) {

    window.trustedTypes.createPolicy('default', {

        createHTML: string => string,

        createScriptURL: string => string,

        createScript: string => string,

    });
}

// showScriptIsLoaded();


//When the page fully loads
let allSlides = [];
window.addEventListener('load', function () {
    console.log('Page is fully loaded. Starting timer');
    allSlides = getAllSlidesOnPageLoad();
    startLocationChangeTimer();
})

let oldLocation = location.href;
function startLocationChangeTimer() {
    setInterval(function () {
        if (location.href != oldLocation) {
            // do your action
            onLocationChanged(oldLocation, location.href)
            oldLocation = location.href

        }
    }, 100);
}

function isFullscreen() {
    return (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) ? true : false;
}


// function showScriptIsLoaded() {
//     let toolbar = document.getElementById('docs-menubar');
//     let newHtml = `<div id="piano-menu-tabbar" role="menuitem" class="menu-button goog-control goog-inline-block" aria-disabled="false" aria-expanded="false" aria-haspopup="true" style="user-select: none;">Piano LOADED!</div>`
//     toolbar.innerHTML += newHtml;
// }

function getAllSlidesOnPageLoad() {
    let allSlides = document.getElementsByClassName('punch-filmstrip-thumbnail');
    let allSlideIds = [];
    for (let i = 0; i < allSlides.length; i++) {
        let slide = allSlides[i];
        let slideData = parseSlideData(slide);
        allSlideIds.push(slideData);
    }
    console.log('allSlideIds', allSlideIds);
    return allSlideIds;
}

function parseSlideData(slide) {

    let sliderNumber = slide.getElementsByClassName("punch-filmstrip-thumbnail-pagenumber")[0].textContent;
    sliderNumber = parseInt(sliderNumber);

    let gs = slide.getElementsByTagName("g");
    let gID = null;

    //find the first g element with an id
    for (let i = 0; i < gs.length; i++) {
        if (gs[i].id) {
            gID = gs[i].id;
            break;
        }
    }

    if (!gID) {
        gID = "null"
    }
    else {
        //'filmstrip-slide-1-g2ba319b25dc_19_30'
        //We want the last part 'g2ba319b25dc_19_30'
        let split = gID.split("-");
        gID = split[split.length - 1];
    }


    return {
        slideNumber: sliderNumber,
        gID: gID
    }
}

document.addEventListener("fullscreenchange", onFullscreenChangeEvent);

function onFullscreenChangeEvent() {
    console.log('Fullscreen change event');
    parseAndSendCurrentSlideData(location.href)
}


function onLocationChanged(oldLocation, newLocation) {
    parseAndSendCurrentSlideData(newLocation);
}

function parseAndSendCurrentSlideData(url) {

    let slideId = getSlideIdFromUrl(url);
    let slideNumber = getSlideNumberFromGID(slideId);
    console.log('Slide number:', slideNumber);
    sendPostMessageToLocalServer(slideNumber);

}

function getSlideNumberFromGID(gID) {
    for (let i = 0; i < allSlides.length; i++) {
        if (allSlides[i].gID == gID) {
            return allSlides[i].slideNumber;
        }
    }
    return null;
}

function getSlideIdFromUrl(url) {
    let split = url.split("=");
    let slideId = split[split.length - 1]; //last part of the url
    slideId = slideId.substring(3);
    return slideId;
}

function sendPostMessageToLocalServer(slideNumber) {
    let localServerURL = "http://localhost:3000/slide";
    let fullScreen = isFullscreen();
    let speakerNotes = getSpeakerNoteTTextForCurrentSlide();
    let data = {
        slideNumber: slideNumber,
        speakerNotes: speakerNotes,
        isPresentationMode: fullScreen
    };
    fetch(localServerURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => {
        // console.log('Response from local server:', response);
    }).catch(error => {
        console.error('Error sending post message to local server:', error);
    });

}



function getSpeakerNoteTTextForCurrentSlide() {
    //This gives us an array of <g> elements, one per paragraph.
    //Each paragraph has an array of <text> elements, one per word
    let speakerNoteField = document.getElementById("speakernotes-workspace").children[0].children[0].children[0].children[0].children;
    let paragraphs = [];
    for (let i = 0; i < speakerNoteField.length; i++) {
        let text = getTextFromSVG(speakerNoteField[i]);
        paragraphs.push(text);
    }

    //If there are no paragraphs, or if there is only one paragraph and it is the default "Click to add speaker notes" text, return an empty array
    //This is to avoid sending the default text to the server
    if (paragraphs.length == 0 || (paragraphs.length == 1 && paragraphs[0] == "Click to add speaker notes")) {
        return [];
    }

    return paragraphs;
}

function getTextFromSVG(svgElm) {
    let textFields = svgElm.getElementsByTagName("text");
    let text = "";
    for (let i = 0; i < textFields.length; i++) {
        text += textFields[i].textContent + " ";
    }
    return text.trim();
}