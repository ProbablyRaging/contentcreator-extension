

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Login attempt
    if (message.login) {
        // Create a popup window for Discord authentication
        chrome.windows.create({
            url: 'https://discord.com/api/oauth2/authorize?client_id=977292001718464592&redirect_uri=http://localhost/auth/redirect&response_type=code&scope=guilds%20identify',
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
            // Stop executing if the window is closed
            if (chrome.runtime.lastError) return;
            // Mute the tab
            try {
                chrome.tabs.update(window.tabs[0].id, { muted: true });
            } catch (err) {
                console.log('There was a problem : ', err);
            }
            getQueueAndPlay(window.tabs[0].id);
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
            fetch('http://localhost/api/getuser', {
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
    const videoIds = await randomlySelectVideos();
    // If there are no videos in the list
    if (!videoIds || videoIds.length < 1) {
        try {
            chrome.tabs.update(tabId, { url: `http://localhost/error/emptyqueue` });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
        return;
    }
    let index = 0;
    function openTab() {
        // Used to determine if the function should continue, can be flagged
        // by multiple different functions
        if (preventNext) return;
        // Award a token on previous video completion
        if (index > 0) awarkToken(tabId);
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
                    index++;
                    const skipToNext = await getVideoDuration(tab);
                    setTimeout(openTab, skipToNext);
                });
            } catch (err) {
                console.log('There was a problem : ', err);
            }
        } else {
            // If no more videos are available, navigate to the queue finished page
            clearInterval(monitorCheck);
            try {
                chrome.tabs.update(tabId, { url: `http://localhost/success/queuefinished` });
            } catch (err) {
                console.log('There was a problem : ', err);
            }
        }
    }
    openTab();
}

let intervalIds = [];

// Sets up monitoring of the specified tab
function initMonitoring(tab, url) {
    // Check the status of the tab every second
    monitorCheck = setInterval(() => {
        // If the user closes the tab early, stop monitoring
        chrome.tabs.get(tab.id, function (tab) {
            if (chrome.runtime.lastError) {
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
                    console.log('beep');
                    preventNext = true;
                    chrome.tabs.onUpdated.removeListener(listenerFunc);
                    chrome.tabs.update(tabId, { url: `http://localhost/error/inputdetected` });
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

function awarkToken(tabId) {
    // Check if the tab is still open
    chrome.tabs.get(tabId, async function (tab) {
        if (chrome.runtime.lastError) return;
        // Retrieve the user ID from storage
        const { userId } = await chrome.storage.sync.get(['userId']);
        // Send a request to the server to add a token to the user's account
        fetch('http://localhost/api/addtokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, amount: 1 })
        });
    });
}

async function randomlySelectVideos() {
    const response = await fetch('http://localhost/api/videolist', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    // Check if the response has a "videoList" property
    if (data.videoList) {
        const selectedVideos = [];
        // Select 5 random videos
        for (let i = 0; i < data.videoList.length; i++) {
            const randomIndex = Math.floor(Math.random() * data.videoList.length);
            const randomVideoId = data.videoList[randomIndex];
            // Check that the video hasn't already been selected
            if (!selectedVideos.includes(randomVideoId)) {
                selectedVideos.push(randomVideoId);
            }
        }
        return selectedVideos;
    } else {
        // Return null if the response has no videoList
        return null;
    }
}