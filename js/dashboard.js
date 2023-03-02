document.addEventListener('DOMContentLoaded', async () => {
    checkDashboardPage();
});

function checkDashboardPage() {
    let retries = 0;
    // Check if the user is on the dashboard page
    function reCheck() {
        // If the page has not been found yet and the number of retries is less than 30
        if (retries < 30) {
            // Get the page name attribute of the 'page-content' element and check if it's 'dashboard'
            const pageName = document.querySelector('page-content').getAttribute('page');
            if (pageName === 'dashboard') {
                // Call the function that sets up the dashboard page
                setupDashboardPage();
            } else {
                // Try again in 100ms
                setTimeout(reCheck, 100);
                retries++;
            }
        }
    }
    // Start the recursive function
    reCheck();
}

function fetchDataAndPopulatePage(userId) {
    // User data
    $.ajax({
        url: 'http://54.79.93.12/api/getuser',
        type: 'post',
        data: { userId: userId },
        success: function (res) {
            setUserAvatarAndStore(userId, res.avatar);
        }
    });
    // Video data
    $.ajax({
        url: 'http://54.79.93.12/api/videolist',
        type: 'get',
        success: function (res) {
            setVideoAndWatchCount(res.videoList.length, res.watchCount);
            populateVideoListContainer(userId, res.videoList);
        }
    });
}

function setUserAvatarAndStore(userId, avatar) {
    const userAvatar = document.getElementById('userAvatar');
    const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatar}.webp?size=256`;
    chrome.storage.sync.set({ userAvatarUrl: avatarUrl });
    userAvatar.src = avatarUrl;
}

function setVideoAndWatchCount(videoListCount, watchCount) {
    const videoListCountEl = document.getElementById('videoListCount');
    videoListCountEl.innerHTML = `${videoListCount} <i class="bi bi-camera-video-fill"></i>`;
    const watchCountEl = document.getElementById('watchCount');
    watchCountEl.innerHTML = `${watchCount} <i class="bi bi bi-eye-fill"></i>`;
}

function populateVideoListContainer(userId, videoList) {
    chrome.storage.sync.set({ cachedVideoList: videoList });
    const currentQueue = document.getElementById('currentQueue');
    currentQueue.innerHTML = `Current Queue (${videoList.length})`

    const emptyList = $('.video-list');
    $.each(videoList, function (index, item) {
        // Start video expire countdown timer
        if (userId === item.userId) startVideoExpireTimer(item.expires);
        // For each item in the data, we create a new list item and add it to the list
        const listItem = $('<div class="video-item">')
            .html(`<span id="index">${index + 1}</span>
            <span id="videoUrl"><a href="https://youtu.be/${item.videoId}">youtu.be/${item.videoId}</a></span>
            <span id="videoViews" ${userId === item.userId ? 'style="color: #6c43ff;"' : ''}><i class="bi bi bi-eye-fill"></i> ${item.watches}</span>`)
        // `${userId === item.userId ? '<i class="bi bi-caret-right-fill" style="color: #5d93cb;"></i>' : ''} ${index + 1}`
        // Append formatted item to list
        emptyList.append(listItem);
    });
    // Finally, we append the list to a container element in the HTML
    $('.video-list').append(emptyList);
}

async function startVideoExpireTimer(expires) {
    chrome.storage.sync.set({ expireTime: expires });
    const expireCountdown = document.getElementById('expireCountdown');
    const timeRemaining = expires - new Date().getTime(); // time remaining in milliseconds
    const hours = Math.floor(timeRemaining / (60 * 60 * 1000)); // calculate hours
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000)); // calculate minutes
    const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000); // calculate seconds
    expireCountdown.innerText = `Your video expires in ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    setInterval(() => {
        const timeRemaining = expires - new Date().getTime(); // time remaining in milliseconds
        const hours = Math.floor(timeRemaining / (60 * 60 * 1000)); // calculate hours
        const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000)); // calculate minutes
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000); // calculate seconds
        expireCountdown.innerText = `Your video expires in ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }, 1000);
}

function reactToNavButton(userId, buttonName) {
    if (buttonName === 'logoutNavBtn') {
        console.log('boop');
        $.ajax({
            url: 'http://54.79.93.12/api/logout',
            type: 'POST',
            data: {
                userId: userId,
            },
            success: function () {
                $('.main-btn').animate({ opacity: 0 }, 200);
                $('.dashboard').animate({ opacity: 0 }, 200)
                    .promise().then(() => {
                        $('.body-bg').animate({ backgroundPositionY: '78px' }, 300);
                        $('.sub-buttons').animate({ bottom: '-46px' }, 300)
                            .promise().then(() => {
                                window.location = '../views/loader.html?data=' + encodeURIComponent(buttonName);
                            });
                    });
            }
        });
    } else {
        $('.main-btn').animate({ opacity: 0 }, 200);
        $('.dashboard').animate({ opacity: 0 }, 200)
            .promise().then(() => {
                $('.body-bg').animate({ backgroundPositionY: '78px' }, 300);
                $('.sub-buttons').animate({ bottom: '-46px' }, 300)
                    .promise().then(() => {
                        window.location = '../views/loader.html?data=' + encodeURIComponent(buttonName);
                    });
            });
    }
}

function numberWithCommas(x) {
    if (x >= 1000000) {
        return (x / 1000000).toFixed(1) + 'M';
    } else if (x >= 1000) {
        return (x / 1000).toFixed(1) + 'K';
    } else {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

async function setupDashboardPage() {
    // Fade out and replace background
    $('.body-bg').css('background-image', 'url("../assets/images/nav-panel.svg")')
        .css('background-position-y', '78px')
        .css('background-size', 'cover')
        .css('background-color', '#f7f7f7')
        .css('opacity', '1')
    setTimeout(() => {
        $('.body-bg').animate({ backgroundPositionY: '0px' }, 300)
            .promise().then(() => {
                $('.main-btn').animate({ opacity: 1 }, 300);
                $('.dashboard').animate({ opacity: 1 }, 300);
            });
        $('.sub-buttons').animate({ bottom: '24px' }, 300);
    }, 300);

    const { activeWindowId } = await chrome.storage.sync.get(['activeWindowId']);
    const { userId } = await chrome.storage.sync.get(['userId']);
    const { nextPopulateTimestamp } = await chrome.storage.sync.get(['nextPopulateTimestamp']);

    const playQueueBtn = document.getElementById('playQueueBtn');
    const queueStatus = document.getElementById('queueStatus');

    // If there is already an active queue window, disable the play queue button
    if (activeWindowId) {
        chrome.windows.get(activeWindowId, function (window) {
            if (chrome.runtime.lastError) return;
            playQueueBtn.disabled = true;
            queueStatus.innerText = 'Queue is playing';
        });
    }

    // Play queue button
    playQueueBtn.addEventListener('click', function () {
        chrome.runtime.sendMessage({ queue: true }, () => {
            if (chrome.runtime.lastError) return;
        });
        playQueueBtn.disabled = true;
        $(queueStatus).animate({ opacity: 0 }, 100)
            .promise().then(() => {
                $(queueStatus).text('Queue is playing')
                $(queueStatus).animate({ opacity: 1 }, 100)
            });
    });

    // Add event listeners to nav buttons
    const navButtons = [
        document.getElementById('dashboardNavBtn'),
        document.getElementById('statisticsNavBtn'),
        document.getElementById('settingsNavBtn'),
        document.getElementById('logoutNavBtn'),
    ];
    navButtons.forEach(button => {
        button.addEventListener('click', function () {
            const buttonName = button.getAttribute('id');
            reactToNavButton(userId, buttonName);
        });
    });

    // Fetch page data
    fetchDataAndPopulatePage(userId);

    // Bootstrap tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}