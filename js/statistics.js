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

function numberWithCommas(x) {
    if (x >= 1000000) {
        return (x / 1000000).toFixed(1) + 'M';
    } else if (x >= 1000) {
        return (x / 1000).toFixed(1) + 'K';
    } else {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

function setupStatsPage() {
    const dashboard = document.getElementById('dashboardFadeIn');
    $(dashboard).animate({ opacity: 1 }, 300);

    setTimeout(() => {
        $('.title-welcome').animate({ opacity: 1 }, 200);
    }, 470);

    setTimeout(() => {
        $('.stats-box').animate({ opacity: 1 }, 300);
        $('.stats-countdown').animate({ opacity: 1 }, 300);
        $('.footer').animate({ opacity: 1 }, 300);
    }, 770);

    setTimeout(() => {
        $('.stats-number').each(function () {
            const $this = $(this);
            const targetValue = parseInt($this.text());
            $this.text('0');
            $({ countNum: 0 }).animate(
                { countNum: targetValue },
                {
                    duration: 1000,
                    easing: 'linear',
                    step: function () {
                        $this.text(numberWithCommas(this.countNum.toFixed(0)));
                    },
                    complete: function () {
                        $this.text(numberWithCommas(targetValue));
                    },
                }
            );
        });
    }, 600);

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