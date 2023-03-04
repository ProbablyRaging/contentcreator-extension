chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.storage.sync.set({ notifications: true });
        chrome.storage.sync.set({ browserNotification: true });
        chrome.storage.sync.set({ muteQueue: true });
    }
});

/**
 * Handle sending notifications
 */
setInterval(async () => {
    const { userId } = await chrome.storage.sync.get(['userId']);
    const { notifications } = await chrome.storage.sync.get(['notifications']);
    const { discordNotification } = await chrome.storage.sync.get(['discordNotification']);
    const { browserNotification } = await chrome.storage.sync.get(['browserNotification']);
    const { expireTime } = await chrome.storage.sync.get(['expireTime']);
    const { notificationSent } = await chrome.storage.sync.get(['notificationSent']);
    if (notifications && expireTime && new Date().valueOf() > expireTime) {
        if (browserNotification && !notificationSent) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '/assets/icons/icon128.png',
                title: 'ForTheContent',
                message: 'You are eligible to submit a new video',
            });
        }
        if (userId && discordNotification && !notificationSent) {
            fetch('http://54.79.93.12/api/sendnotification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });
        }
        chrome.action.setBadgeBackgroundColor({ color: '#ed5a64' });
        chrome.action.setBadgeText({ text: '1' });
        await chrome.storage.sync.set({ notificationSent: true });
        chrome.storage.sync.set({ expireTime: null });
    } else {
        await chrome.storage.sync.set({ notificationSent: false });
    }
}, 5 * 60 * 1000);

/**
 * Receiving messages from main.js and popup.js
 */
let initWindowId;
let videoIds = [];
let videoIdsReversed = [];
let index = 0;
let indexReversed = 0;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Login attempt
    if (message.login) {
        // Create a popup window for Discord authentication
        chrome.windows.create({
            url: 'https://discord.com/api/oauth2/authorize?client_id=977292001718464592&redirect_uri=http://54.79.93.12/auth/redirect&response_type=code&scope=guilds%20identify',
            focused: true,
            type: 'popup',
            width: 600,
            height: 800,
            left: 500
        }, function (window) {
            // Check for auth state changes
            checkAuthState(window);
        });
    }
    // Play queue button
    if (message.queue) {
        // Create a popup window for watching video queues
        const successMessage = 'Loading queue..';
        chrome.windows.create({
            url: `http://54.79.93.12/success?message=${successMessage}`,
            focused: true,
            width: 600,
            height: 800,
        }, async function (window) {
            // Store the queue window ID for checking later
            chrome.storage.sync.set({ activeWindowId: window.id });
            initWindowId = window.id;
            // Stop executing if the window is closed
            if (chrome.runtime.lastError) return;
            // Play queue
            createQueueWindow(window, 7000);
            // Start watch timer
            startWatchTimer();
        });
    }
    // If a video duration is available
    if (message.videoDuration) {
        setTimeout(() => {
            message.reversed ? openReversedTab(message.tabId, videoIdsReversed[indexReversed - 1]) : openTab(message.tabId, videoIds[index - 1]);
        }, message.videoDuration);
    }
    // If the like but was clicked successfully
    if (message.videoLiked) {
        incrementLikeCount(message.tabId, message.videoId);
    }
    // If the user isn't signed in to youtube
    if (message.signedIn === false) {
        const errorMessage = 'You must sign in to YouTube to use this app';
        if (initWindowId) createErrorWindow(initWindowId, errorMessage);
    }
    // If chrome user doesn't interact with window in time
    if (message.noResponse) {
        const errorMessage = 'You did not interact with the window in time';
        if (initWindowId) createErrorWindow(initWindowId, errorMessage);
    }
});

/**
 * Handle user authentication
 */
function checkAuthState(window) {
    chrome.tabs.get(window.tabs[0].id, function (tab) {
        if (chrome.runtime.lastError) {
            handleAuthentication(false);
            return;
        }
        if (tab.url.includes('auth/success?user')) {
            const params = new URLSearchParams(tab.url.split('?')[1]);
            const userId = params.get('user');
            fetch('http://54.79.93.12/api/getuser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            }).then(response => response.json())
                .then(data => {
                    if (data.result) {
                        // Send a message to the popup indicating that authentication was successful and store the user ID
                        handleAuthentication(true);
                        chrome.storage.sync.set({ userId: userId });
                    } else {
                        // Send a message to the popup indicating that authentication was unsuccessful
                        handleAuthentication(false);
                    }
                });
        } else if (tab.url.includes('error')) {
            handleAuthentication(false);
            return;
        } else {
            setTimeout(() => {
                checkAuthState(window);
            }, 500);
        }
    });
}

function handleAuthentication(success) {
    chrome.runtime.sendMessage({ success }, () => {
        if (chrome.runtime.lastError) return;
    });
}

/**
 * Handle playing queue
 */
async function createQueueWindow(window, delaySecondTab) {
    try {
        const tabs = window.tabs;
        // Make sure the initial tab was created
        if (tabs && tabs.length > 0 && tabs[0].id) {
            // Check if we need to mute the tab or not
            const { muteQueue } = await chrome.storage.sync.get({ muteQueue: false });
            chrome.tabs.update(tabs[0].id, { muted: muteQueue }, function (tab) {
                if (chrome.runtime.lastError) return;
                if (tab && tab.id) {
                    // Wait and start playing the queue
                    setTimeout(() => {
                        getQueueAndPlay(tab.id, false);
                    }, 3000);
                } else {
                    console.log('No tab found in the window');
                }
            });
            // Wait before creating a secondary tab for reversed queue
            setTimeout(() => {
                const successMessage = 'Loading reversed queue..';
                chrome.tabs.create({
                    url: `http://54.79.93.12/success?message=${successMessage}`,
                    windowId: window.id
                }, async function (tab) {
                    if (chrome.runtime.lastError) return;
                    // Create the secondary tab
                    chrome.tabs.update(tab.id, { muted: muteQueue }, function () {
                        if (chrome.runtime.lastError) return;
                        if (tab && tab.id) {
                            // Wait and start playing the queue
                            setTimeout(() => {
                                getQueueAndPlay(tab.id, true);
                            }, 3000);
                        } else {
                            console.log('No tab found in the window');
                        }
                    });
                });
            }, delaySecondTab);
        } else {
            console.log('No tab found in the window');
        }
    } catch (err) {
        console.log('There was a problem: ', err);
    }
}

let preventNext;
let monitorCheck;
let monitorCheckTwo;
let statusChangeCount = 0;
async function getQueueAndPlay(tabId, reversed) {
    videoIds = await getVideoList();
    videoIdsReversed = [...videoIds].reverse();
    // If there are no videos in the list
    if (!videoIds || videoIds.length < 1) {
        try {
            const errorMessage = 'There are currently no videos in the queue';
            chrome.tabs.update(tabId, { url: `http://54.79.93.12/error?message=${errorMessage}` });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
        return;
    }
    reversed ? openReversedTab(tabId) : openTab(tabId);
}

function openTab(tabId, previousVideoId) {
    clearInterval(monitorCheck);
    // Used to determine if the function should continue, can be flagged
    // by multiple different functions
    if (preventNext) return;
    // Award a token on previous video completion
    if (index > 0) awardToken(tabId);
    if (previousVideoId) incrementWatchCount(tabId, previousVideoId);
    // Get the availavble video IDs, navigate to the video watch page and watch
    // the video for 10 minutes before moving on to the next video in the list
    if (index < videoIds.length) {
        // Reset the status change count to prevent false positive when a new video is loaded
        statusChangeCount = 0;
        // Navigate to video page
        try {
            const urlToOpen = `https://www.youtube.com/watch?v=${videoIds[index]}&t=0`;
            chrome.tabs.update(tabId, { url: urlToOpen }, async function (tab) {
                if (chrome.runtime.lastError) return;
                // Add a listener to check if a page is refreshed or manually navigated
                initMonitoring(tab);
                // Send a message to like the video
                sendTabMessage(tab, { sendLike: true, tabId: tab.id, videoId: videoIds[index] });
                // Send a message to block page interactions
                sendTabMessage(tab, { blockTab: true });
                // Send a message to monitor play state
                sendTabMessage(tab, { preventPause: true });
                // Send a message to check if the user is signed in
                sendTabMessage(tab, { checkSignin: true });
                // Send a message to check if an ad is playing
                sendTabMessage(tab, { checkForAds: true, tabId: tab.id, reversed: false });
                index++;
            });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
    } else {
        // If no more videos are available, navigate to the queue finished page
        try {
            clearInterval(monitorCheck);
            clearInterval(monitorCheckTwo);
            const successMessage = 'You have reached the end of the queue';
            chrome.tabs.update(tabId, { url: `http://54.79.93.12/success?message=${successMessage}` });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
    }
}

function openReversedTab(tabId, previousVideoId) {
    clearInterval(monitorCheckTwo);
    // Used to determine if the function should continue, can be flagged
    // by multiple different functions
    if (preventNext) return;
    if (previousVideoId) incrementWatchCount(tabId, previousVideoId);
    // Get the availavble video IDs, navigate to the video watch page and watch
    // the video for 10 minutes before moving on to the next video in the list
    if (indexReversed < videoIdsReversed.length) {
        // Reset the status change count to prevent false positive when a new video is loaded
        statusChangeCount = 0;
        // Navigate to video page
        try {
            const urlToOpen = `https://www.youtube.com/watch?v=${videoIdsReversed[indexReversed]}&t=0`;
            chrome.tabs.update(tabId, { url: urlToOpen }, async function (tab) {
                if (chrome.runtime.lastError) return;
                // Add a listener to check if a page is refreshed or manually navigated
                initMonitoringTwo(tab);
                // Send a message to like the video
                sendTabMessage(tab, { sendLike: true, tabId: tab.id, videoId: videoIdsReversed[indexReversed] });
                // Send a message to block page interactions
                sendTabMessage(tab, { blockTab: true });
                // Send a message to monitor play state
                sendTabMessage(tab, { preventPause: true });
                // Send a message to check if the user is signed in
                sendTabMessage(tab, { checkSignin: true });
                // Send a message to check if an ad is playing
                sendTabMessage(tab, { checkForAds: true, tabId: tab.id, reversed: true });
                indexReversed++;
            });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
    } else {
        // If no more videos are available, navigate to the queue finished page
        try {
            clearInterval(monitorCheck);
            clearInterval(monitorCheckTwo);
            const successMessage = 'You have reached the end of the queue';
            chrome.tabs.update(tabId, { url: `http://54.79.93.12/success?message=${successMessage}` });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
    }
}

// Sets up monitoring of the specified tab in the specified window
function initMonitoring(tab) {
    // Check if the window still exists
    chrome.windows.get(initWindowId, { populate: false }, function (window) {
        if (chrome.runtime.lastError || !window) {
            // Window doesn't exist, stop monitoring
            clearInterval(monitorCheck);
            clearInterval(monitorCheckTwo);
            return;
        }
        // Check the status of the tab every second
        monitorCheck = setInterval(() => {
            chrome.windows.get(initWindowId, { populate: false }, function (window) {
                if (chrome.runtime.lastError || !window) {
                    // Window doesn't exist, stop monitoring
                    clearInterval(monitorCheck);
                    clearInterval(monitorCheckTwo);
                    return;
                }
                // If the user closes the tab early, stop monitoring
                chrome.tabs.query({ windowId: initWindowId }, function (tabs) {
                    if (tabs.length > 0) {
                        chrome.tabs.get(tab.id, function (tab) {
                            if (chrome.runtime.lastError) {
                                chrome.windows.remove(initWindowId);
                                clearInterval(monitorCheck);
                                clearInterval(monitorCheckTwo);
                                return;
                            }
                        });
                    } else {
                        chrome.windows.remove(initWindowId);
                        clearInterval(monitorCheck);
                        clearInterval(monitorCheckTwo);
                        return;
                    }
                });
            });
        }, 1000);
    });
}

function initMonitoringTwo(tab) {
    // Check if the window still exists
    chrome.windows.get(initWindowId, { populate: false }, function (window) {
        if (chrome.runtime.lastError || !window) {
            // Window doesn't exist, stop monitoring
            clearInterval(monitorCheck);
            clearInterval(monitorCheckTwo);
            return;
        }
        // Check the status of the tab every second
        monitorCheckTwo = setInterval(() => {
            chrome.windows.get(initWindowId, { populate: false }, function (window) {
                if (chrome.runtime.lastError || !window) {
                    // Window doesn't exist, stop monitoring
                    clearInterval(monitorCheck);
                    clearInterval(monitorCheckTwo);
                    return;
                }
                // If the user closes the tab early, stop monitoring
                chrome.tabs.query({ windowId: initWindowId }, function (tabs) {
                    if (tabs.length > 0) {
                        chrome.tabs.get(tab.id, function (tab) {
                            if (chrome.runtime.lastError) {
                                chrome.windows.remove(initWindowId);
                                clearInterval(monitorCheck);
                                clearInterval(monitorCheckTwo);
                                return;
                            }
                        });
                    } else {
                        chrome.windows.remove(initWindowId);
                        clearInterval(monitorCheck);
                        clearInterval(monitorCheckTwo);
                        return;
                    }
                });
            });
        }, 1000);
    });
}

function sendTabMessage(tab, message) {
    // Check if the window still exists
    chrome.windows.get(initWindowId, { populate: false }, function (window) {
        if (chrome.runtime.lastError || !window) return;
        // Check the status of the tab every second
        const statusCheck = setInterval(() => {
            chrome.windows.get(initWindowId, { populate: false }, function (window) {
                if (chrome.runtime.lastError || !window) return;
                // If the user closes the tab early, stop monitoring
                chrome.tabs.query({ windowId: initWindowId }, function (tabs) {
                    if (tabs.length > 0) {
                        chrome.tabs.get(tab.id, function (tab) {
                            if (chrome.runtime.lastError) return;
                            if (tab.status === 'complete') {
                                chrome.tabs.sendMessage(tab.id, message);
                                clearInterval(statusCheck);
                            }
                        });
                    } else {
                        return;
                    }
                });
            });
        }, 1000);
    });
}

function awardToken(tabId) {
    // Check if the tab is still open
    chrome.tabs.get(tabId, async function (tab) {
        if (chrome.runtime.lastError) return;
        // Retrieve the user ID from storage
        const { userId } = await chrome.storage.sync.get(['userId']);
        // Send a request to the server to add a token to the user's account
        fetch('http://54.79.93.12/api/addtokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, amount: 1 })
        });
    });
}

function incrementWatchCount(tabId, videoId) {
    // Check if the tab is still open
    chrome.tabs.get(tabId, async function (tab) {
        if (chrome.runtime.lastError) return;
        // Retrieve the user ID from storage
        const { userId } = await chrome.storage.sync.get(['userId']);
        // Send a request to the server to increment the video's watch count
        fetch('http://54.79.93.12/api/addwatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: videoId, amount: 1, userId: userId })
        });
    });
}

function incrementLikeCount(tabId, videoId) {
    // Check if the tab is still open
    chrome.tabs.get(tabId, async function (tab) {
        if (chrome.runtime.lastError) return;
        // Retrieve the user ID from storage
        // Send a request to the server to increment the video's like count
        fetch('http://54.79.93.12/api/addlike', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: videoId, amount: 1 })
        });
    });
}

async function getVideoList() {
    const response = await fetch('http://54.79.93.12/api/videolist', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    // Check if the response has a "videoList" property
    if (data.videoList) {
        let videoIdArr = [];
        for (const item of data.videoList) {
            videoIdArr.push(item.videoId);
        }
        return videoIdArr;
    } else {
        // Return null if the response has no videoList
        return null;
    }
}

let activeWatchTimer;
let watchTimer;
function startWatchTimer() {
    if (activeWatchTimer) return;
    activeWatchTimer = true;
    let upCount = 0;
    watchTimer = setInterval(() => {
        upCount++;
        const date = new Date(upCount * 1000); // convert seconds to milliseconds
        let hours = date.getUTCHours();
        let minutes = date.getUTCMinutes();
        let seconds = date.getUTCSeconds();
        let timeString = '';
        if (hours > 0) {
            timeString += hours.toString().padStart(2, '0') + ':';
        }
        timeString += minutes.toString().padStart(2, '0') + ':';
        timeString += seconds.toString().padStart(2, '0');
        // Check if the window still exists
        chrome.windows.get(initWindowId, { populate: false }, function (window) {
            if (chrome.runtime.lastError || !window) {
                // Window doesn't exist, stop monitoring
                clearInterval(watchTimer);
                activeWatchTimer = false;
                chrome.runtime.sendMessage({ watchTimerStop: true }, function () {
                    if (chrome.runtime.lastError) return;
                });
                return;
            }
        });
        chrome.runtime.sendMessage({ watchTimer: timeString }, function () {
            if (chrome.runtime.lastError) return;
        });
    }, 1000);
}

function createErrorWindow(initWindowId, errorMessage) {
    chrome.windows.remove(initWindowId)
    chrome.windows.create({
        url: `http://54.79.93.12/error?message=${errorMessage}`,
        focused: true,
        type: 'panel',
        width: 600,
        height: 800
    });
}