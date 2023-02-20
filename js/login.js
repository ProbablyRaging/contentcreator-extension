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
    const authButton = document.getElementById('discordAuth');
    authButton.addEventListener('click', function () {
        chrome.runtime.sendMessage({ login: true });
        authButton.innerHTML = 'Please keep this window open';
        authButton.disabled = true;
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.success) {
            const body = document.body;
            $(body).animate({ opacity: 0 }, 300).promise().then(() => {
                window.location = '../views/loader.html';
                $(body).animate({ opacity: 1 }, 300);
            });
        } else {
            authButton.innerHTML = 'Login via Discord';
            authButton.disabled = false;
        }
    });
}