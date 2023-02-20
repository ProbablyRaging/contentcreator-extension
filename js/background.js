

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.login) {
        // Create a popup window for Discord authentication
        chrome.windows.create({
            url: 'https://discord.com/api/oauth2/authorize?client_id=977292001718464592&redirect_uri=http%3A%2F%2Flocalhost%2Fauth%2Fredirect&response_type=code&scope=guilds%20identify',
            focused: true,
            type: 'popup',
            width: 600,
            height: 800,
            left: 500
        }, function (window) {
            let count = 0;
            // Set up an interval to check if the authentication process is completed
            const int = setInterval(() => {
                // If the count reaches 30, the authentication process is considered timed out
                if (count >= 30) {
                    // Send a message to the popup indicating that authentication was unsuccessful
                    try {
                        chrome.tabs.update(window.tabs[0].id, { url: 'http://localhost/error/noresponse' });
                    } catch (err) {
                        console.log('There was a problem : ', err);
                    }
                    chrome.runtime.sendMessage({ success: false }).then(() => { if (chrome.runtime.lastError) return; });
                    return clearInterval(int);
                }
                // Check if the Discord authentication tab is still open
                chrome.tabs.get(window.tabs[0].id, function (tab) {
                    if (chrome.runtime.lastError) {
                        // If the tab is closed or not accessible, stop the interval and send a message to the popup indicating that authentication was unsuccessful
                        chrome.runtime.sendMessage({ success: false }).then(() => { if (chrome.runtime.lastError) return; });
                        return clearInterval(int);
                    };
                    // If the authentication is completed, get the user ID and fetch the user's data
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
                                    chrome.runtime.sendMessage({ success: true }).then(() => { if (chrome.runtime.lastError) return; });
                                    // chrome.windows.remove(window.id);
                                    chrome.storage.sync.set({ userId: userId });
                                } else {
                                    // Send a message to the popup indicating that authentication was unsuccessful
                                    chrome.runtime.sendMessage({ success: false }).then(() => { if (chrome.runtime.lastError) return; });
                                }
                            });
                        // Stop the interval
                        clearInterval(int);
                    } else if (tab.url.includes('error')) {
                        // If there is an error in the authentication process, stop the interval and send a message to the popup indicating that authentication was unsuccessful
                        chrome.runtime.sendMessage({ success: false }).then(() => { if (chrome.runtime.lastError) return; });
                        clearInterval(int);
                    }
                });
                count++;
            }, 1000);
        });
    }

    if (message.queue) {
        // Create a popup window for watching video queues
        chrome.windows.create({
            url: 'https://www.youtube.com/',
            focused: true,
            type: 'popup',
            width: 600,
            height: 800,
        }, function (window) {
            // Stop executing if the window is closed
            if (chrome.runtime.lastError) return;
            getQueueAndPlay(window.tabs[0].id);
        });
    }
});

let monitorCheck;
async function getQueueAndPlay(tabId) {
    const videoIds = await randomlySelectFiveVideos();
    // If there are no videos in the list
    if (!videoIds) {
        try {
            chrome.tabs.update(tabId, { url: `http://localhost/error/emptyqueue` });
        } catch (err) {
            console.log('There was a problem : ', err);
        }
    }
    let index = 0;
    function openTab() {
        // Award a token on previous video completion
        if (index > 0) awarkToken(tabId);
        // Get the availavble video IDs, navigate to the video watch page and watch
        // the video for 10 minutes before moving on to the next video in the list
        if (index < videoIds.length) {
            chrome.tabs.update(tabId, { url: `https://www.youtube.com/watch?v=${videoIds[index]}` }, function (tab) {
                if (chrome.runtime.lastError) return;
                if (!monitorCheck) initMonitoring(tab);
                likeVideo(tab);
                index++;
                setTimeout(openTab, 10000);
            });
        } else {
            // If no more videos are available, navigate to the queue finished page
            clearInterval(monitorCheck);
            try {
                chrome.tabs.update(tabId, { url: `http://localhost/error/queuefinished` });
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
                console.log('User closed tab');
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

function getVideoDuration(tab) {
    // Set up a status check interval that runs every second
    const statusCheck = setInterval(() => {
        // Get the current state of the tab
        chrome.tabs.get(tab.id, function (tab) {
            // If an error occurred, return without doing anything
            if (chrome.runtime.lastError) return;
            // Check if the tab has finished loading
            if (tab.status === 'complete') {
                // Send a message to the content script to get the video duration
                chrome.tabs.sendMessage(tab.id, { getDuration: true }, function (response) {
                    // Once a response is received, clear the status check interval and return the response
                    clearInterval(statusCheck);
                    return response;
                });
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
        fetch('http://api/addtokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, amount: 1 })
        });
    });
}

async function randomlySelectFiveVideos() {
    const response = await fetch('http://localhost/api/videolist', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    // Check if the response has a "videoList" property
    if (data.videoList) {
        const selectedVideos = [];
        // Determine the number of videos to select
        const listLength = data.videoList.length < 5 ? data.videoList.length : 5;
        // Select 5 random videos
        for (let i = 0; i < listLength; i++) {
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