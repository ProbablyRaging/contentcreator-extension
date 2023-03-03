document.addEventListener('DOMContentLoaded', async () => {
    checkLoginPage();
});

function checkLoginPage() {
    let retries = 0;
    function reCheck() {
        if (retries < 30) {
            const pageName = document.querySelector('page-content').getAttribute('page');
            if (pageName === 'login') {
                setupLoginPage();
            } else {
                setTimeout(reCheck, 100);
            }
        }
    }
    reCheck();
}

function setupLoginPage() {
    setTimeout(() => {
        $('.content').animate({ opacity: 1 }, 300);
        $('.footer').animate({ opacity: 1 }, 300);
    }, 100);

    const authButton = document.getElementById('discordAuth');
    authButton.addEventListener('click', function () {
        chrome.runtime.sendMessage({ login: true }, () => { if (chrome.runtime.lastError) return; });
        authButton.innerHTML = 'Authenticating..';
        authButton.disabled = true;
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.success) {
            const body = document.body;
            setTimeout(() => {
                $(body).animate({ opacity: 0 }, 300).promise().then(() => {
                    window.location = '../views/loader.html';
                    $(body).animate({ opacity: 1 }, 300);
                });
            }, 300);
        } else {
            authButton.innerHTML = 'Login via Discord';
            authButton.disabled = false;
        }
    });

    const discordJoin = document.getElementById('discordJoin');
    discordJoin.addEventListener('click', function () {
        chrome.tabs.create({ url: 'https://discord.gg/forthecontent' });
    });
}