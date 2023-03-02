document.addEventListener('DOMContentLoaded', async () => {
    checkSettingsPage();
});

function checkSettingsPage() {
    let retries = 0;
    function reCheck() {
        if (retries < 30) {
            const pageName = document.querySelector('page-content').getAttribute('page');
            if (pageName === 'settings') {
                setupSettingsPage();
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

async function setupSettingsPage() {
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

    const { notifications } = await chrome.storage.sync.get(['notifications']);
    const { discordNotification } = await chrome.storage.sync.get(['discordNotification']);
    const { browserNotification } = await chrome.storage.sync.get(['browserNotification']);
    const { muteQueue } = await chrome.storage.sync.get(['muteQueue']);
    const { playFull } = await chrome.storage.sync.get(['playFull']);
    const notificationsSwitch = document.getElementById("notificationsSwitch");
    const notificationsAlt = document.getElementById("notificationsAlt");
    const discordSwitch = document.getElementById("discordSwitch");
    const browserSwitch = document.getElementById("browserSwitch");
    const muteQueueSwitch = document.getElementById("muteQueueSwitch");
    const playFullSwitch = document.getElementById("playFullSwitch");

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

    // Settings switches
    if (notifications) {
        notificationsSwitch.checked = true
        notificationsAlt.style.display = 'block';
    } else {
        notificationsSwitch.checked = false;
        notificationsAlt.style.display = 'none';
    }
    notificationsSwitch.addEventListener('click', function () {
        chrome.storage.sync.get(['notifications'], async result => {
            if (result.notifications) {
                await chrome.storage.sync.set({ notifications: false });
                $(notificationsAlt).slideUp(150);
            } else {
                await chrome.storage.sync.set({ notifications: true });
                $(notificationsAlt).slideDown(150);
            }
        });
    });
    discordNotification ? discordSwitch.checked = true : discordSwitch.checked = false;
    discordSwitch.addEventListener('click', function () {
        chrome.storage.sync.get(['discordNotification'], async result => {
            if (result.discordNotification) {
                await chrome.storage.sync.set({ discordNotification: false });
            } else {
                await chrome.storage.sync.set({ discordNotification: true });
            }
        });
    });
    browserNotification ? browserSwitch.checked = true : browserSwitch.checked = false;
    browserSwitch.addEventListener('click', function () {
        chrome.storage.sync.get(['browserNotification'], async result => {
            if (result.browserNotification) {
                await chrome.storage.sync.set({ browserNotification: false });
            } else {
                await chrome.storage.sync.set({ browserNotification: true });
            }
        });
    });
    muteQueue ? muteQueueSwitch.checked = true : muteQueueSwitch.checked = false;
    muteQueueSwitch.addEventListener('click', function () {
        chrome.storage.sync.get(['muteQueue'], async result => {
            if (result.muteQueue) {
                await chrome.storage.sync.set({ muteQueue: false });
            } else {
                await chrome.storage.sync.set({ muteQueue: true });
            }
        });
    });
    playFull ? playFullSwitch.checked = true : playFullSwitch.checked = false;
    playFullSwitch.addEventListener('click', function () {
        chrome.storage.sync.get(['playFull'], async result => {
            if (result.playFull) {
                await chrome.storage.sync.set({ playFull: false });
            } else {
                await chrome.storage.sync.set({ playFull: true });
            }
        });
    });

    // Get OS and extension version
    const extInfo = document.querySelector('#extInfo');
    extInfo.innerHTML = `v${chrome.runtime.getManifest().version} | ${navigator.userAgent}`;

    // Bootstrap tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}