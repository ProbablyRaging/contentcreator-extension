chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
    // Like the video
    if (message.sendLike) {
        findAndClickLikeButton(message.tabId, message.videoId);
    }
    // Check if an ad is playing
    if (message.checkForAds) {
        console.log(`2`, message.tabId);
        checkIfAdPlaying(message.tabId, message.reversed);
    }
    // Block tab interaction
    if (message.blockTab) {
        blockTabInteractions();
    }
    // Prevent video being paused
    if (message.preventPause) {
        preventPausingVideos();
    }
    // Make sure user is signed in to YouTube
    if (message.checkSignin) {
        checkIfSignedIn();
    }
});

let likeButtonRetries = 0;
function findAndClickLikeButton(tabId, videoId) {
    console.log(`3`, tabId);
    if (likeButtonRetries >= 30) return;
    const likeButton = document.querySelector('[aria-label*="like this video along with"]');
    if (likeButton) {
        likeButton.click();
        chrome.runtime.sendMessage({ videoLiked: true, tabId: tabId, videoId: videoId });
    } else {
        // If the like button is not found, wait amd try again
        setTimeout(() => {
            findAndClickLikeButton(tabId, videoId);
            likeButtonRetries++;
        }, 1000);
    }
}

function checkIfAdPlaying(tabId, reversed) {
    setTimeout(() => {
        const intBlockerText = document.querySelector('#interactionBlockerText');
        const detectAdPlaying = document.querySelector('.ytp-ad-simple-ad-badge');
        const skipAdButton = document.querySelector('.ytp-ad-skip-button');
        // If video interacted with and not ad detected, get the video duration
        if (!intBlockerText && !detectAdPlaying) {
            getVideoDuration(tabId, reversed)
            return;
        }
        // If video not interacted with an ad is playing
        if (!intBlockerText && detectAdPlaying && skipAdButton) {
            // Click the skip ad button if it's available
            skipAdButton.click();
            checkIfAdPlaying(tabId, reversed);
        } else {
            checkIfAdPlaying(tabId, reversed);
        }
    }, 5000);
}

let durationRetries = 0;
async function getVideoDuration(tabId, reversed) {
    const { playFull } = await chrome.storage.sync.get(['playFull']);
    // Fallback if we can't find a duration
    if (durationRetries >= 15) {
        durationRetries = 0;
        chrome.runtime.sendMessage({ videoDuration: 600000, tabId: tabId, reversed: reversed });
        return;
    };
    const durationStr = document.querySelector('.ytp-time-duration').innerHTML;
    if (durationStr) {
        const parts = durationStr.split(':');
        let durationMs = 0;
        if (parts.length === 2) {
            const [minutesStr, secondsStr] = parts;
            const minutes = parseInt(minutesStr, 10);
            const seconds = parseInt(secondsStr, 10);
            durationMs = (minutes * 60 + seconds) * 1000;
        } else if (parts.length === 3) {
            const [hoursStr, minutesStr, secondsStr] = parts;
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);
            const seconds = parseInt(secondsStr, 10);
            durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
        }
        // If the play full video option is enabled
        if (playFull) return durationMs;
        // Limit the duration to 10 minutes
        const returnedDuration = durationMs > 600000 ? 600000 : durationMs;
        chrome.runtime.sendMessage({ videoDuration: returnedDuration, tabId: tabId, reversed: reversed });
        return;
    } else {
        // If the duration string is not found, wait and try again
        durationRetries++
        setTimeout(() => {
            getVideoDuration(tabId, reversed);
        }, 1000);
    }
}

function blockTabInteractions() {
    let count = 0;
    let staticStyles;
    const checkBlocker = setInterval(() => {
        let interactionBlocker = document.getElementById('interactionBlocker');
        if (!interactionBlocker) {
            interactionBlocker = document.createElement('interaction-blocker');
            interactionBlocker.id = 'interactionBlocker';
            interactionBlocker.style.position = 'fixed';
            interactionBlocker.style.top = '0';
            interactionBlocker.style.left = '0';
            interactionBlocker.style.width = '100%';
            interactionBlocker.style.height = '100%';
            interactionBlocker.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            interactionBlocker.style.zIndex = '999999';
            interactionBlocker.style.fontSize = '40px';
            interactionBlocker.style.color = 'white';
            interactionBlocker.style.display = 'flex';
            interactionBlocker.style.justifyContent = 'center';
            interactionBlocker.style.alignItems = 'center';
            interactionBlocker.oncontextmenu = function () {
                return false;
            };
            document.body.appendChild(interactionBlocker);
        }
        const checkStyles = document.getElementById('interactionBlocker').getAttribute('style');
        if (count < 1) staticStyles = checkStyles;
        if (staticStyles !== checkStyles) {
            clearInterval(checkBlocker);
            interactionBlocker.id = 'interactionBlocker';
            interactionBlocker.style.position = 'fixed';
            interactionBlocker.style.top = '0';
            interactionBlocker.style.left = '0';
            interactionBlocker.style.width = '100%';
            interactionBlocker.style.height = '100%';
            interactionBlocker.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            interactionBlocker.style.zIndex = '999999';
            interactionBlocker.style.fontSize = '30px';
            interactionBlocker.style.color = 'white';
            interactionBlocker.style.display = 'flex';
            interactionBlocker.style.justifyContent = 'center';
            interactionBlocker.style.alignItems = 'center';
            interactionBlocker.oncontextmenu = function () {
                return false;
            };
            blockTabInteractions();
            return;
        }
        count++;
    }, 1000);
}

let playStateChecked;
let playStateInt;
function preventPausingVideos() {
    if (!playStateInt) {
        const playButton = document.querySelector('.ytp-play-button');
        if (playButton) {
            playStateInt = setInterval(() => {
                const buttonState = document.querySelector('.ytp-play-button').getAttribute('data-title-no-tooltip');
                if (buttonState === 'Play') {
                    playButton.click();
                    setTimeout(() => {
                        const newButtonState = document.querySelector('.ytp-play-button').getAttribute('data-title-no-tooltip');
                        if (!playStateChecked && newButtonState === 'Play') {
                            AddTextToBlocker();
                            playStateChecked = true;
                        } else {
                            playStateChecked = true;
                        }
                    }, 1000);
                }
            }, 1000);
        } else {
            // If the play buttons is not found, wait amd try again
            setTimeout(preventPausingVideos, 1000);
        }
    }
}

function AddTextToBlocker() {
    if (document.querySelector('#interactionBlockerText')) return;
    const intBlocker = document.querySelector('#interactionBlocker');
    if (intBlocker) {
        const blockerText = document.createElement('interaction-blocker-text');
        blockerText.id = 'interactionBlockerText';
        blockerText.innerText = 'Click To Play (15s)';
        blockerText.style.backgroundColor = '#292b30';
        blockerText.style.padding = '10px';
        blockerText.style.borderRadius = '10px';
        blockerText.style.cursor = 'pointer';
        blockerText.style.border = '1px solid white';
        intBlocker.appendChild(blockerText);
        blockerText.onclick = function () {
            this.remove();
        }
        // Countdown
        let countdown = 15;
        const countdownInterval = setInterval(() => {
            const textDiv = document.querySelector('#interactionBlockerText');
            if (!textDiv) {
                clearInterval(countdownInterval);
                return;
            }
            if (countdown === 0) {
                chrome.runtime.sendMessage({ noResponse: true });
                clearInterval(countdownInterval);
            } else {
                blockerText.innerText = `Click To Play (${countdown}s)`;
                countdown--;
            }
        }, 1000);
    } else {
        setTimeout(AddTextToBlocker, 1000);
    }
}

function checkIfSignedIn() {
    const signInModal = document.querySelector('.style-scope.ytd-modal-with-title-and-button-renderer');
    if (signInModal) {
        try {
            chrome.runtime.sendMessage({ signedIn: false });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
    } else {
        // If the like button is not found, wait amd try again
        setTimeout(checkIfSignedIn, 1000);
    }
}