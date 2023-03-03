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

function fadeInNavBar() {
    $('.body-bg').css('background-image', 'url("../assets/images/nav-panel.svg")')
        .css('background-position-y', '78px')
        .css('background-size', 'cover')
        .css('background-color', '#f7f7f7')
        .css('opacity', '1')
    setTimeout(() => {
        $('.body-bg').animate({ backgroundPositionY: '15px' }, 300)
            .promise().then(() => {
                $('.main-btn').animate({ opacity: 1 }, 300);
                $('.dashboard').animate({ opacity: 1 }, 300);
            });
        $('.sub-buttons').animate({ bottom: '8px' }, 300);
    }, 300);
}

function fetchDataAndPopulatePage(userId) {
    // Video data
    $.ajax({
        url: 'http://54.79.93.12/api/videolist',
        type: 'get',
        success: function (res) {
            chrome.storage.sync.set({ cachedVideoData: res });
            setVideoAndWatchCount(res.videoList.length, res.watchCount);
            populateVideoListContainer(userId, res.videoList);
            const oneHour = 60 * 60 * 1000;
            chrome.storage.sync.set({ nextPopulateTimestamp: new Date().valueOf() + oneHour });
        }
    });
}

async function setVideoAndWatchCount(videoListCount, watchCount, useCached) {
    if (useCached) {
        const { cachedVideoData } = await chrome.storage.sync.get(['cachedVideoData']);
        const videoListCountEl = document.getElementById('videoListCount');
        videoListCountEl.innerHTML = `${cachedVideoData.videoList.length} <i class="bi bi-camera-video-fill"></i>`;
        const watchCountEl = document.getElementById('watchCount');
        watchCountEl.innerHTML = `${cachedVideoData.watchCount} <i class="bi bi bi-eye-fill"></i>`;
    } else {
        const videoListCountEl = document.getElementById('videoListCount');
        videoListCountEl.innerHTML = `${videoListCount} <i class="bi bi-camera-video-fill"></i>`;
        const watchCountEl = document.getElementById('watchCount');
        watchCountEl.innerHTML = `${watchCount} <i class="bi bi bi-eye-fill"></i>`;
    }
}

async function populateVideoListContainer(userId, videoList, useCached) {
    if (useCached) {
        const { cachedVideoData } = await chrome.storage.sync.get(['cachedVideoData']);
        const currentQueue = document.getElementById('currentQueue');
        currentQueue.innerHTML = `Current Queue (${cachedVideoData.videoList.length})`
        const emptyList = $('.video-list');
        $.each(cachedVideoData.videoList, function (index, item) {
            // For each item in the data, we create a new list item and add it to the list
            const listItem = $('<div class="video-item">')
                .html(`<span id="index">${index + 1}</span>
                <span id="videoUrl"><a href="https://youtu.be/${item.videoId}" target="_blank">youtu.be/${item.videoId}</a></span>
                <span id="videoViews" ${userId === item.userId ? 'style="color: #6c43ff;"' : ''}><i class="bi bi bi-eye-fill"></i> ${item.watches}</span>`)
            // `${userId === item.userId ? '<i class="bi bi-caret-right-fill" style="color: #5d93cb;"></i>' : ''} ${index + 1}`
            // Append formatted item to list
            emptyList.append(listItem);
        });
        // Finally, we append the list to a container element in the HTML
        $('.video-list').append(emptyList);
    } else {
        const currentQueue = document.getElementById('currentQueue');
        currentQueue.innerHTML = `Current Queue (${videoList.length})`
        const emptyList = $('.video-list');
        $.each(videoList, function (index, item) {
            // Start video expire countdown timer
            if (userId === item.userId) startVideoExpireTimer(item.expires);
            // For each item in the data, we create a new list item and add it to the list
            const listItem = $('<div class="video-item">')
                .html(`<span id="index">${index + 1}</span>
                <span id="videoUrl"><a href="https://youtu.be/${item.videoId}" target="_blank">youtu.be/${item.videoId}</a></span>
                <span id="videoViews" ${userId === item.userId ? 'style="color: #6c43ff;"' : ''}><i class="bi bi bi-eye-fill"></i> ${item.watches}</span>`)
            // `${userId === item.userId ? '<i class="bi bi-caret-right-fill" style="color: #5d93cb;"></i>' : ''} ${index + 1}`
            // Append formatted item to list
            emptyList.append(listItem);
        });
        // Finally, we append the list to a container element in the HTML
        $('.video-list').append(emptyList);
    }
}

async function startVideoExpireTimer(expires, useCached) {
    if (useCached) {
        const { expireTime } = await chrome.storage.sync.get(['expireTime']);
        if (!expireTime) return;
        const expireCountdown = document.getElementById('expireCountdown');
        const timeRemaining = expireTime - new Date().getTime(); // time remaining in milliseconds
        const hours = Math.floor(timeRemaining / (60 * 60 * 1000)); // calculate hours
        const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000)); // calculate minutes
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000); // calculate seconds
        expireCountdown.innerText = `Your video expires in ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        setInterval(() => {
            const timeRemaining = expireTime - new Date().getTime(); // time remaining in milliseconds
            const hours = Math.floor(timeRemaining / (60 * 60 * 1000)); // calculate hours
            const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000)); // calculate minutes
            const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000); // calculate seconds
            expireCountdown.innerText = `Your video expires in ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        }, 1000);
    } else {
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
}

function presentVideoSubmissionInput(userId, submitVideoBtn) {
    if (submitVideoBtn.classList.contains('active')) {
        $('.input-sub-header').animate({ opacity: 0 }, 300);
        $('.input-container').animate({ opacity: 0 }, 300);
        $('#submitInput').animate({ opacity: 0 }, 300)
            .promise().then(() => {
                $('#videoListContainer').animate({ maxHeight: '200px' }, 200);
            });
        $(submitVideoBtn).animate({ 'rotate': "0deg" }, 200)
            .css('background-color', '#6c43ff')
            .toggleClass('active');
    } else if (!submitVideoBtn.classList.contains('active') && !submitVideoBtn.classList.contains('submit')) {
        $('#videoListContainer').animate({ maxHeight: '122px' }, 200)
            .promise().then(() => {
                $('.input-sub-header').animate({ opacity: 1 }, 300);
                $('.input-container').animate({ opacity: 1 }, 300);
                $('#submitInput').animate({ opacity: 1 }, 300);
                $('#submitInput').focus();
            });
        $(submitVideoBtn).animate({ 'rotate': "135deg" }, 200)
            .css('background-color', '#ff3e3e')
            .toggleClass('active');
    } else if (submitVideoBtn.classList.contains('submit')) {
        const submitInput = document.getElementById('submitInput');
        const inputText = submitInput.value;
        // Get the value of the input field and make post request
        processVideoSubmission(userId, inputText, submitInput);
    }
}

function reactToNavButton(userId, buttonName) {
    if (buttonName === 'logoutNavBtn') {
        console.log('boop');
        $.ajax({
            url: 'http://54.79.93.12/api/logout',
            type: 'POST',
            data: {
                userId: userId,
            }
        });
    }
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

function processVideoSubmission(userId, inputText, submitInput) {
    $.ajax({
        url: 'http://54.79.93.12/api/addvideo',
        type: 'POST',
        data: {
            videoId: inputText,
            userId: userId
        },
        success: function (res) {
            if (res.message) {
                const oneDay = 24 * 60 * 60 * 1000;
                chrome.storage.sync.set({ expireTime: new Date().valueOf() + oneDay });
                const tokenCount = document.getElementById('tokenCount').innerHTML.replace(' <img class="token-img" src="../assets/images/tokens.png">', '');
                tokenCount.innerHTML = (parseInt(this.innerHTML) - 5) + ' <img class="token-img" src="../assets/images/tokens.png">';
                submitInput.classList.add('success');
                submitInput.placeholder = res.message;
                $(submitInput).val('');
                $(submitVideoBtn).animate({ 'rotate': "135deg" }, 200)
                    .css('background-color', '#ff3e3e')
                    .html('<i class="bi bi-plus"></i>')
                    .toggleClass('submit')
                    .toggleClass('active');
                setTimeout(() => {
                    submitInput.classList.remove('error');
                    submitInput.placeholder = 'Enter video URL or ID';
                }, 15000);
                startVideoExpireTimer(null, true);
            } else if (res.error) {
                submitInput.classList.add('error');
                submitInput.placeholder = res.error;
                $(submitInput).val('');
                $(submitVideoBtn).animate({ 'rotate': "135deg" }, 200)
                    .css('background-color', '#ff3e3e')
                    .html('<i class="bi bi-plus"></i>')
                    .toggleClass('submit')
                    .toggleClass('active');
                setTimeout(() => {
                    submitInput.classList.remove('error');
                    submitInput.placeholder = 'Enter video URL or ID';
                }, 15000);
            }
        },
        error: function () {
            submitInput.classList.add('error');
            submitInput.placeholder = 'Something went wrong';
            $(submitInput).val('');
            $(submitVideoBtn).animate({ 'rotate': "135deg" }, 200)
                .css('background-color', '#ff3e3e')
                .html('<i class="bi bi-plus"></i>')
                .toggleClass('submit')
                .toggleClass('active');
            setTimeout(() => {
                submitInput.classList.remove('error');
                submitInput.placeholder = 'Enter video URL or ID';
            }, 15000);
        }
    });
}

async function setupDashboardPage() {
    // Fade out and replace background
    fadeInNavBar();

    const { userId } = await chrome.storage.sync.get(['userId']);
    const { activeWindowId } = await chrome.storage.sync.get(['activeWindowId']);
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

    // Fetch fresh page data or used a cached version 
    if (!nextPopulateTimestamp || new Date().valueOf() > nextPopulateTimestamp) {
        fetchDataAndPopulatePage(userId);
    } else {
        setVideoAndWatchCount(null, null, true);
        populateVideoListContainer(userId, null, true);
        startVideoExpireTimer(null, true);
    }

    // When a user clicks the submit video button
    const submitVideoBtn = document.getElementById('submitVideoBtn');
    submitVideoBtn.addEventListener('click', function () {
        presentVideoSubmissionInput(userId, submitVideoBtn);
    });

    // When the text input state changes
    const submitInput = document.getElementById('submitInput');
    let delayCheck;
    submitInput.addEventListener('input', function () {
        clearTimeout(delayCheck);
        delayCheck = setTimeout(function () {
            if (submitInput.value.length > 0) {
                $(submitVideoBtn).animate({ 'rotate': '0deg' }, 200)
                    .promise().then(() => {
                        $(submitVideoBtn).html('<i class="bi bi-check-lg"></i>')
                            .css('background-color', '#30c974')
                            .html('<i class="bi bi-check"></i>')
                            .toggleClass('active')
                            .toggleClass('submit');
                    });
            } else {
                $(submitVideoBtn).animate({ 'rotate': '135deg' }, 200)
                    .html('<i class="bi bi-plus"></i>')
                    .css('background-color', '#ff3e3e')
                    .toggleClass('active')
                    .toggleClass('submit');
            }
        }, 300);
    });
}