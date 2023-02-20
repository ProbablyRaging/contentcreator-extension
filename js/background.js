

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Login attempt
    if (message.login) {
        // Create a popup window for Discord authentication
        chrome.windows.create({
            url: 'https://discord.com/api/oauth2/authorize?client_id=977292001718464592&redirect_uri=http://54.252.72.200/auth/redirect&response_type=code&scope=guilds%20identify',
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
            fetch('http://54.252.72.200/api/getuser', {
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

let monitorCheck;
async function getQueueAndPlay(tabId) {
    const videoIds = await randomlySelectVideos();
    // If there are no videos in the list
    if (!videoIds || videoIds.length < 1) {
        try {
            chrome.tabs.update(tabId, { url: `http://54.252.72.200/error/emptyqueue` });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
        return;
    }
    let index = 0;
    function openTab() {
        // Award a token on previous video completion
        if (index > 0) awarkToken(tabId);
        // Get the availavble video IDs, navigate to the video watch page and watch
        // the video for 10 minutes before moving on to the next video in the list
        if (index < videoIds.length) {
            chrome.tabs.update(tabId, { url: `https://www.youtube.com/watch?v=${videoIds[index]}` }, async function (tab) {
                if (chrome.runtime.lastError) return;
                if (!monitorCheck) initMonitoring(tab);
                likeVideo(tab);
                blockTabInteractions(tab);
                index++;
                const skipToNext = await getVideoDuration(tab);
                setTimeout(openTab, skipToNext);
            });
        } else {
            // If no more videos are available, navigate to the queue finished page
            clearInterval(monitorCheck);
            try {
                chrome.tabs.update(tabId, { url: `http://54.252.72.200/success/queuefinished` });
            } catch (err) {
                console.log('There was a problem : ', err);
            }
        }
    }
    openTab();
}

// Sets up monitoring of the specified tab
function initMonitoring(tab) {
    // Check the status of the tab every second
    monitorCheck = setInterval(() => {
        // If the user closes the tab early, stop monitoring
        chrome.tabs.get(tab.id, function (tab) {
            if (chrome.runtime.lastError) {
                return clearInterval(monitorCheck);
            }
        });
    }, 1000);
}

function likeVideo(tab) {
    // Set up an interval to check if the tab is still open
    const statusCheck = setInterval(() => {
        // If the user closes the tab early, exit the function
        chrome.tabs.get(tab.id, function (tab) {
            if (chrome.runtime.lastError) return;
            // If the tab has finished loading
            if (tab.status === 'complete') {
                // Send a message to the content script to like the video
                chrome.tabs.sendMessage(tab.id, { sendLike: true });
                // Clear the interval to stop checking if the tab is still open
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

function blockTabInteractions(tab) {
    // Set up an interval to check if the tab is still open
    const statusCheck = setInterval(() => {
        // If the user closes the tab early, exit the function
        chrome.tabs.get(tab.id, function (tab) {
            if (chrome.runtime.lastError) return;
            // If the tab has finished loading
            if (tab.status === 'complete') {
                // Send a message to the content script to like the video
                chrome.tabs.sendMessage(tab.id, { blockTab: true });
                // Clear the interval to stop checking if the tab is still open
                clearInterval(statusCheck);
            }
        });
    }, 1000);
}

function awarkToken(tabId) {
    // Check if the tab is still open
    chrome.tabs.get(tabId, async function (tab) {
        if (chrome.runtime.lastError) return;
        // Retrieve the user ID from storage
        const { userId } = await chrome.storage.sync.get(['userId']);
        // Send a request to the server to add a token to the user's account
        fetch('http://54.252.72.200/api/addtokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, amount: 1 })
        });
    });
}

async function randomlySelectVideos() {
    const response = await fetch('http://54.252.72.200/api/videolist', {
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