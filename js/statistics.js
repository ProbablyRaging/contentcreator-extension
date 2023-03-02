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

async function setUserAvatar() {
    const userAvatar = document.getElementById('userAvatar');
    const { userAvatarUrl } = await chrome.storage.sync.get(['userAvatarUrl']);
    userAvatar.src = userAvatarUrl;
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

async function setupStatsPage() {
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

    // Set user avatar
    setUserAvatar();
}