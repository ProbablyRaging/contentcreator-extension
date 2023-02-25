chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
    // Like the video
    if (message.sendLike) {
        findAndClickLikeButton(message.tabId, message.videoId);
    }
    // Get the duration of the video
    if (message.getDuration) {
        sendResponse(getVideoDuration(message.playFull));
    }
    // Block tab interaction
    if (message.blockTab) {
        blockTabInteractions();
    }
    // Prevent video being paused
    if (message.preventPause) {
        preventPausingVideos();
    }

    if (message.checkSignin) {
        checkIfSignedIn();
    }
});

function findAndClickLikeButton(tabId, videoId) {
    const likeButton = document.querySelector('[aria-label*="like this video along with"]');
    if (likeButton) {
        likeButton.click();
        chrome.runtime.sendMessage({ videoLiked: true, tabId: tabId, videoId: videoId });
    } else {
        // If the like button is not found, wait amd try again
        setTimeout(findAndClickLikeButton, 1000);
    }
}

let retries = 0;
function getVideoDuration(playFull) {
    // Fallback if we can't find a duration
    if (retries >= 3) {
        retries = 0;
        return 600000;
    };
    const durationStr = document.querySelector('.ytp-time-duration').innerHTML;
    if (durationStr) {
        const [minutesStr, secondsStr] = durationStr.split(':');
        const minutes = parseInt(minutesStr, 10);
        const seconds = parseInt(secondsStr, 10);
        const durationMs = (minutes * 60 + seconds) * 1000;
        // If the play full video option is enabled
        if (playFull) return durationMs;
        // Limit the duration to 10 minutes
        const returnedDuration = durationMs > 600000 ? 600000 : durationMs;
        return returnedDuration;
    } else {
        // If the duration string is not found, wait amd try again
        retries++
        setTimeout(getVideoDuration, 1000);
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

let playStateInt;
function preventPausingVideos() {
    if (!playStateInt) {
        const playButton = document.querySelector('.ytp-play-button');
        if (playButton) {
            // let checkPlay;
            playStateInt = setInterval(() => {
                const buttonState = document.querySelector('.ytp-play-button').getAttribute('data-title-no-tooltip');
                if (buttonState === 'Play') {
                    playButton.click();
                    setTimeout(() => {
                        const newButtonState = document.querySelector('.ytp-play-button').getAttribute('data-title-no-tooltip');
                        if (newButtonState === 'Play') AddTextToBlocker();
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
                clearInterval(countdownInterval)
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