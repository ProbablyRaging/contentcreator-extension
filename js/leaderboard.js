document.addEventListener('DOMContentLoaded', async () => {
    checkleaderboardPage();
});

function checkleaderboardPage() {
    let retries = 0;
    function reCheck() {
        if (retries < 30) {
            const pageName = document.querySelector('page-content').getAttribute('page');
            if (pageName === 'leaderboard') {
                setupleaderboardPage();
            } else {
                setTimeout(reCheck, 100);
            }
        }
    }
    reCheck();
}

function fetchUserDataAndPopulateLeaderboards(userId) {
    $.ajax({
        url: 'https://creatordiscord.xyz/api/getusers',
        type: 'get',
        success: function (res) {
            chrome.storage.local.set({ cachedUserData: res });
            populateLeaderboard(userId, res.watches, 'watches');
            populateLeaderboard(userId, res.views, 'views');
            populateLeaderboard(userId, res.likes, 'likes');
            const oneHour = 60 * 60 * 1000;
            chrome.storage.sync.set({ nextlbPopulateTimestamp: new Date().valueOf() + oneHour });
        }
    });
}

async function populateLeaderboard(userId, data, className, useCached) {
    if (className === 'watches') bsIcon = 'bi-fire';
    if (className === 'views') bsIcon = 'bi-eye-fill';
    if (className === 'likes') bsIcon = 'bi-hand-thumbs-up-fill';
    let actualIndex = 0;
    if (useCached) {
        const list = $(`.${className}-lb-list`);
        $.each(data.slice(0, 50), function (index, item) {
            if (item.userId === '837447568422076456' || item.userId === '1003256013434134548') return;
            // For each item in the data, we create a new list item and add it to the list
            const listItem = $('<div class="video-item">')
                .html(`<span id="index" ${userId === item.userId ? 'style="color: #6c43ff; font-weight: 700"' : ''}>${actualIndex + 1}</span>
                        <span id="username" ${userId === item.userId ? 'style="color: #6c43ff; font-weight: 700"' : ''}>${item.username}</span>
                        <span id="watches" ${userId === item.userId ? 'style="color: #6c43ff; font-weight: 700"' : ''}><i class="bi ${bsIcon}"></i> ${item[className] || 0}</span>`);
            // Append formatted item to list
            list.append(listItem);
            actualIndex++;
        });
        // Finally, we append the list to a container element in the HTML
        $(`.${className}-lb-list`).append(list);
    } else {
        const list = $(`.${className}-lb-list`);
        $.each(data.slice(0, 50), function (index, item) {
            if (item.userId === '837447568422076456' || item.userId === '1003256013434134548') return;
            // For each item in the data, we create a new list item and add it to the list
            const listItem = $('<div class="video-item">')
                .html(`<span id="index" ${userId === item.userId ? 'style="color: #6c43ff; font-weight: 700"' : ''}>${actualIndex + 1}</span>
                        <span id="username" ${userId === item.userId ? 'style="color: #6c43ff; font-weight: 700"' : ''}>${item.username}</span>
                        <span id="watches" ${userId === item.userId ? 'style="color: #6c43ff; font-weight: 700"' : ''}><i class="bi ${bsIcon}"></i> ${item[className] || 0}</span>`);
            // Append formatted item to list
            list.append(listItem);
            actualIndex++;
        });
        // Finally, we append the list to a container element in the HTML
        $(`.${className}-lb-list`).append(list);
    }
}

async function setupleaderboardPage() {
    // Fade out and replace background
    fadeInNavBar();

    const { userId } = await chrome.storage.sync.get(['userId']);
    const { nextlbPopulateTimestamp } = await chrome.storage.sync.get(['nextlbPopulateTimestamp']);

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

    // Fetch fresh page data or used a cached version 
    if (!nextlbPopulateTimestamp || new Date().valueOf() > nextlbPopulateTimestamp) {
        fetchUserDataAndPopulateLeaderboards(userId);
    } else {
        const { cachedUserData } = await chrome.storage.local.get(['cachedUserData']);
        populateLeaderboard(userId, cachedUserData.watches, 'watches', true);
        populateLeaderboard(userId, cachedUserData.views, 'views', true);
        populateLeaderboard(userId, cachedUserData.likes, 'likes', true);
    }
}