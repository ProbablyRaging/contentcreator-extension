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

function setupStatsPage() {
    const dashboard = document.getElementById('dashboardFadeIn');
    $(dashboard).animate({ opacity: 1 }, 300);

    setTimeout(() => {
        $('.title-welcome').animate({ opacity: 1 }, 200);
    }, 470);

    setTimeout(() => {
        $('.content-container').animate({ opacity: 1 }, 300);
        $('.play-button').animate({ opacity: 1 }, 300);
        $('.footer').animate({ opacity: 1 }, 300);
    }, 770);

    const returnBtn = document.getElementById('returnBtn');

    // When the refresh button is clicked, redirect to the loader.html page
    returnBtn.addEventListener('click', function () {
        $('.title-welcome').animate({ opacity: 0 }, 200);
        setTimeout(() => {
            $('.body-bg').animate({ 'background-position-y': '-90px' }, 300);
            $('body').animate({ opacity: 0 }, 300).promise().then(() => {
                window.location = '../views/loader.html';
            });
        }, 200);
    });
}