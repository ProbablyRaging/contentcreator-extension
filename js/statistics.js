document.addEventListener('DOMContentLoaded', async () => {
    checkStatsPage();
});

function checkStatsPage() {
    let retries = 0;
    function reCheck() {
        if (retries < 30) {
            const pageName = document.querySelector('page-content').getAttribute('page');
            if (pageName === 'statistics') {
                setupStatsPage();
            } else {
                setTimeout(reCheck, 100);
            }
        }
    }
    reCheck();
}

async function setupStatsPage() {
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

    const leaderboardLink = document.getElementById('leaderboardLink');
    leaderboardLink.addEventListener('click', function () {
        $('.main-btn').animate({ opacity: 0 }, 200);
        $('.dashboard').animate({ opacity: 0 }, 200)
            .promise().then(() => {
                $('.body-bg').animate({ backgroundPositionY: '78px' }, 300);
                $('.sub-buttons').animate({ bottom: '-46px' }, 300)
                    .promise().then(() => {
                        window.location = '../views/loader.html?data=' + encodeURIComponent('leaderboardNavBtn');
                    });
            });
    });
}