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
    fadeInNavBar();

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

    const helpLink = document.getElementById('helpLink');
    helpLink.addEventListener('click', function () {
        chrome.tabs.create({ url: chrome.runtime.getURL('../views/help.html') });
    });

    // Get OS and extension version
    const extInfo = document.querySelector('#extInfo');
    extInfo.innerHTML = `v${chrome.runtime.getManifest().version} | ${navigator.userAgent}`;

    // Bootstrap tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}