chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
    // Like the video
    if (message.sendLike) {
        findAndClickLikeButton();
    }
    // Get the duration of the video
    if (message.getDuration) {
        sendResponse(getVideoDuration());
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
        console.log(returnedDuration);
        return returnedDuration;
    } else {
        // If the duration string is not found, wait amd try again
        setTimeout(getVideoDuration, 1000);
    }
}