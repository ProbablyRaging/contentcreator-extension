chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
    // Like the video
    if (message.sendLike) {
        findAndClickLikeButton();
    }
    // Get the duration of the video
    if (message.getDuration) {
        sendResponse(getVideoDuration());
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

function findAndClickLikeButton() {
    const likeButton = document.querySelector('[aria-label*="like this video along with"]');
    if (likeButton) {
        likeButton.click();
    } else {
        // If the like button is not found, wait amd try again
        setTimeout(findAndClickLikeButton, 1000);
    }
}

function getVideoDuration() {
    const durationStr = document.querySelector('.ytp-time-duration').innerHTML;
    if (durationStr) {
        const [minutesStr, secondsStr] = durationStr.split(':');
        const minutes = parseInt(minutesStr, 10);
        const seconds = parseInt(secondsStr, 10);
        const durationMs = (minutes * 60 + seconds) * 1000;
        // Limit the duration to 10 minutes
        const returnedDuration = durationMs > 600000 ? 600000 : durationMs;
        return returnedDuration;
    } else {
        // If the duration string is not found, wait amd try again
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
            blockTabInteractions();
            return;
        }
        count++;
    }, 1000);
}

function preventPausingVideos() {
    const playButton = document.querySelector('.ytp-play-button');
    if (playButton) {
        // let checkPlay;
        setInterval(() => {
            const buttonState = document.querySelector('.ytp-play-button').getAttribute('data-title-no-tooltip');
            if (buttonState === 'Play') {
                playButton.click();
                // clearInterval(checkPlay)
                return;
            }
        }, 1000);
    } else {
        // If the play buttons is not found, wait amd try again
        setTimeout(preventPausingVideos, 1000);
    }
}

function checkIfSignedIn() {
    const signInModal = document.querySelector('.style-scope.ytd-modal-with-title-and-button-renderer');
    if (signInModal) {
        chrome.runtime.sendMessage({ signedIn: false });
    } else {
        // If the like button is not found, wait amd try again
        setTimeout(checkIfSignedIn, 1000);
    }
}