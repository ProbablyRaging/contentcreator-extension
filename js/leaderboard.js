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

async function setupleaderboardPage() {
    // Fade out and replace background
    fadeInNavBar();

    const { userId } = await chrome.storage.sync.get(['userId']);

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

    // Video data
    $.ajax({
        url: 'http://54.79.93.12/api/getusers',
        type: 'get',
        success: function (res) {
            // Watches leaderboard
            const watchesList = $('.watches-lb-list');
            let actualIndex = 0;
            $.each(res.watches.slice(0, 50), function (index, item) {
                if (item.userId === '837447568422076456' || item.userId === '1003256013434134548') return;
                // For each item in the data, we create a new list item and add it to the list
                const listItem = $('<div class="video-item">')
                    .html(`<span id="index">${actualIndex + 1 }</span>
                    <span id="username">${item.username}</span>
                    <span id="watches" ${userId === item.userId ? 'style="color: #6c43ff;"' : ''}><i class="bi bi bi-eye-fill"></i> ${item.watches || 0}</span>`)
                // Append formatted item to list
                watchesList.append(listItem);
                actualIndex++;
            });
            // Finally, we append the list to a container element in the HTML
            $('.watches-lb-list').append(watchesList);

            // Watches leaderboard
            const viewsList = $('.views-lb-list');
            $.each(res.views.slice(0, 50), function (index, item) {
                // For each item in the data, we create a new list item and add it to the list
                const listItem = $('<div class="video-item">')
                    .html(`<span id="index">${index + 1}</span>
                                <span id="username">${item.username}</span>
                                <span id="watches" ${userId === item.userId ? 'style="color: #6c43ff;"' : ''}><i class="bi bi bi-eye-fill"></i> ${item.views || 0}</span>`)
                // Append formatted item to list
                viewsList.append(listItem);
            });
            // Finally, we append the list to a container element in the HTML
            $('.views-lb-list').append(viewsList);

            // Likes leaderboard
            const likesList = $('.likes-lb-list');
            $.each(res.likes.slice(0, 50), function (index, item) {
                // For each item in the data, we create a new list item and add it to the list
                const listItem = $('<div class="video-item">')
                    .html(`<span id="index">${index + 1}</span>
                                <span id="username">${item.username}</span>
                                <span id="watches" ${userId === item.userId ? 'style="color: #6c43ff;"' : ''}><i class="bi bi bi-eye-fill"></i> ${item.likes || 0}</span>`)
                // Append formatted item to list
                likesList.append(listItem);
            });
            // Finally, we append the list to a container element in the HTML
            $('.likes-lb-list').append(likesList);
        }
    });
}