function numberWithCommas(x) {
    const integerPart = Math.floor(x).toString();
    const numCommas = Math.max(0, Math.floor((integerPart.length - 1) / 3));
    let result = '';
    for (let i = 1; i <= numCommas; i++) {
        const commaPos = integerPart.length - i * 3;
        result = ',' + integerPart.substring(commaPos, commaPos + 3) + result;
    }
    result = integerPart.substring(0, integerPart.length - numCommas * 3) + result;
    if (x % 1 !== 0) {
        result += x.toFixed(2).substring(integerPart.length + 1);
    }
    return result;
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const params = urlParams.get('data');

    if (params) {
        setTimeout(() => {
            $('body').css('background-image', 'none')
                .promise().then(() => {
                    $('.body-bg').css('opacity', '1')
                        .promise().then(() => {
                            $('body').animate({ opacity: 1 }, 300)
                        });
                });
        }, 100);
    } else {
        $('body').css('background-image', 'linear-gradient(40deg, #6c43ff, #9364fe)')
        $('body').css('opacity', '1')
    }

    chrome.action.setBadgeText({ text: '' });
    // Check if user has an active session
    const { userId } = await chrome.storage.sync.get(['userId']);
    setTimeout(async () => {
        const response = await fetch('http://54.79.93.12/api/getuser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });

        const data = await response.json();
        const body = document.body;

        if ((!params || params === 'dashboardNavBtn') && data.result && new Date().valueOf() < data.result.expires) {
            cssToRemove = 'link[href="../css/login.css"]';
            viewPage = '../views/dashboard.html';
        } else if (params === 'statisticsNavBtn') {
            cssToRemove = 'link[href="../css/login.css"]';
            viewPage = '../views/statistics.html';
        } else if (params === 'settingsNavBtn') {
            cssToRemove = 'link[href="../css/login.css"]';
            viewPage = '../views/settings.html';
        } else {
            cssToRemove = 'link[href="../css/dashboard.css"]';
            viewPage = '../views/login.html';
        }

        $('head').find(cssToRemove).remove();
        $(body).animate({ opacity: 0 }, 300).promise().then(() => {
            $.ajax({
                url: viewPage,
                success: function (res) {
                    // Extract the content
                    const parser = new DOMParser();
                    const responseDoc = parser.parseFromString(res, 'text/html');
                    let newBody = $(responseDoc).find('body').html();
                    // Replace the current page's content
                    if (viewPage.includes('login')) {
                        $('page-content').html(newBody);
                        $('page-content').attr('page', 'login');
                    }
                    if (viewPage.includes('dashboard')) {
                        newBody = newBody.replace('data.result.userId', data.result.userId);
                        newBody = newBody.replace('data.result.avatar', data.avatar);
                        newBody = newBody.replace('data.result.tokens', data.result.tokens || 0);
                        $('page-content').html(newBody);
                        $('page-content').attr('page', 'dashboard');
                    }
                    if (viewPage.includes('statistics')) {
                        newBody = newBody.replace('data.result.userId', data.result.userId);
                        newBody = newBody.replace('data.result.avatar', data.avatar);
                        newBody = newBody.replace('data.result.tokens', data.result.tokens || 0);
                        newBody = newBody.replace('data.result.submissions', numberWithCommas(data.result.submissions) || 0);
                        newBody = newBody.replace('data.result.views', numberWithCommas(data.result.views) || 0);
                        newBody = newBody.replace('data.result.likes', numberWithCommas(data.result.likes) || 0);
                        newBody = newBody.replace('data.result.watches', numberWithCommas(data.result.watches) || 0);
                        newBody = newBody.replace('data.result.earned', numberWithCommas((data.result.submissions * 5) + data.result.tokens) || 0);
                        $('page-content').html(newBody);
                        $('page-content').attr('page', 'statistics');
                    }
                    if (viewPage.includes('settings')) {
                        newBody = newBody.replace('data.result.userId', data.result.userId);
                        newBody = newBody.replace('data.result.avatar', data.avatar);
                        newBody = newBody.replace('data.result.tokens', data.result.tokens || 0);
                        $('page-content').html(newBody);
                        $('page-content').attr('page', 'settings');
                    }
                    $(body).animate({ opacity: 1 }, 300);
                }
            });
        });
    }, params ? 300 : 700);
});