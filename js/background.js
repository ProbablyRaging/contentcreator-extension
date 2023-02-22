chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'update') chrome.storage.sync.set({ activeQueue: false });
});

let initWindowId;
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
        chrome.windows.create({
            url: 'https://www.youtube.com/',
            focused: true,
            type: 'panel',
            width: 600,
            height: 800,
        }, function (window) {
            initWindowId = window.id;
            // Stop executing if the window is closed
            if (chrome.runtime.lastError) return;
            // Mute the tab
            try {
                setTimeout(() => {
                    chrome.tabs.update(window.tabs[0].id, { muted: true });
                }, 3000);
            } catch (err) {
                console.log('There was a problem : ', err);
            }
            getQueueAndPlay(window.tabs[0].id);
        });
    }

    if (message.signedIn === false) {
        if (initWindowId) chrome.windows.remove(initWindowId);
        const errorMessage = 'You must sign in to YouTube to use this app'
        chrome.windows.create({
            url: `http://54.79.93.12/error?message=${errorMessage}`,
            focused: true,
            type: 'panel',
            width: 600,
            height: 800
        });
    }
});

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

let preventNext;
let monitorCheck;
let activeListener;
let statusChangeCount = 0;
async function getQueueAndPlay(tabId) {
    const videoIds = await getVideoList();
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
    let index = 0;
    function openTab(previousVideoId) {
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
                const urlToOpen = `https://www.youtube.com/watch?v=${videoIds[index]}`;
                chrome.tabs.update(tabId, { url: urlToOpen }, async function (tab) {
                    if (chrome.runtime.lastError) return;
                    if (!monitorCheck) initMonitoring(tab, urlToOpen);
                    // Add a listener to check if a page is refreshed or manually navigated
                    if (!activeListener) listenForTabUpdates(tab);
                    // Send a message to like the video
                    sendTabMessage(tab, { sendLike: true });
                    // Send a message to block page interactions
                    sendTabMessage(tab, { blockTab: true });
                    // Send a message to monitor play state
                    sendTabMessage(tab, { preventPause: true });
                    // Send a message to check if the user is signed in
                    sendTabMessage(tab, { checkSignin: true });
                    index++;
                    // Wait a determined amount of time before skipping to the next video
                    const skipToNext = await getVideoDuration(tab);
                    setTimeout(() => {
                        openTab(videoIds[index - 1]);
                    }, skipToNext);
                });
            } catch (err) {
                console.log('There was a problem : ', err);
            }
        } else {
            // If no more videos are available, navigate to the queue finished page
            try {
                chrome.storage.sync.set({ activeQueue: false });
                clearInterval(monitorCheck);
                const successMessage = 'You have reached the end of the queue';
                chrome.tabs.update(tabId, { url: `http://54.79.93.12/success?message=${successMessage}` });
            } catch (err) {
                console.log('There was a problem : ', err);
            }
        }
    }
    openTab();
}

// Sets up monitoring of the specified tab
function initMonitoring(tab, url) {
    chrome.storage.sync.set({ activeQueue: true });
    // Check the status of the tab every second
    monitorCheck = setInterval(() => {
        // If the user closes the tab early, stop monitoring
        chrome.tabs.get(tab.id, function (tab) {
            if (chrome.runtime.lastError) {
                chrome.storage.sync.set({ activeQueue: false });
                clearInterval(monitorCheck);
                return;
            }
        });
    }, 1000);

    setTimeout(() => {
        chrome.tabs.get(tab.id, function (tab) {
            if (tab.url !== url) {
                chrome.tabs.remove(tab.id);
                clearInterval(monitorCheck);
                return;
            }
        });
    }, 5000);

}

function listenForTabUpdates(tab) {
    function listenerFunc(tabId, changeInfo, thisTab) {
        if (tabId === tab.id) {
            if (changeInfo.status === 'loading' && (!changeInfo.url || !changeInfo.url.includes('success'))) statusChangeCount++
            if (statusChangeCount > 1) {
                try {
                    preventNext = true;
                    chrome.storage.sync.set({ activeQueue: false });
                    chrome.tabs.onUpdated.removeListener(listenerFunc);
                    const errorMessage = 'Block user input was detected. Please do not try to interact with tabs in the queue window'
                    chrome.tabs.update(tabId, { url: `http://54.79.93.12/error?message=${errorMessage}` });
                } catch (err) {
                    console.log('There was a problem : ', err);
                }
            }
        }
    }
    chrome.tabs.onUpdated.addListener(listenerFunc);
    activeListener = true;
}

function sendTabMessage(tab, message) {
    const statusCheck = setInterval(() => {
        chrome.tabs.get(tab.id, function (tab) {
            if (chrome.runtime.lastError) return;
            if (tab.status === 'complete') {
                chrome.tabs.sendMessage(tab.id, message);
                clearInterval(statusCheck);
            }
        });
    }, 1000);
}

async function getVideoDuration(tab) {
    return new Promise((resolve) => {
        // Set up a status check interval that runs every second
        const statusCheck = setInterval(() => {
            // Get the current state of the tab
            chrome.tabs.get(tab.id, async function (tab) {
                // If an error occurred, return without doing anything
                if (chrome.runtime.lastError) return;
                // Check if the tab has finished loading
                if (tab.status === 'complete') {
                    // Send a message to the content script to get the video duration
                    await chrome.tabs.sendMessage(tab.id, { getDuration: true }, function (response) {
                        if (chrome.runtime.lastError) return;
                        // Once a response is received, clear the status check interval and resolve the Promise with the response
                        clearInterval(statusCheck);
                        resolve(response);
                    });
                }
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
        // Send a request to the server to increment the video's watch count
        fetch('http://54.79.93.12/api/addwatch', {
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
        return data.videoList;
    } else {
        // Return null if the response has no videoList
        return null;
    }
}