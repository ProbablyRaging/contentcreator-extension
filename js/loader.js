document.addEventListener('DOMContentLoaded', async () => {
    // Check if user has an active session
    const { userId } = await chrome.storage.sync.get(['userId']);
    setTimeout(async () => {
        const response = await fetch('http://localhost/api/getuser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });

        const data = await response.json();
        const body = document.body;

        if (data.result && new Date().valueOf() < data.result.expires) {
            cssToRemove = 'link[href="../css/login.css"]';
            viewPage = '../views/dashboard.html';
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
                    if (viewPage.includes('dashboard')) {
                        newBody = newBody.replace('data.result.username', data.result.username);
                        newBody = newBody.replace('data.result.tokens', data.result.tokens || 0);
                        $('page-content').html(newBody);
                        $('page-content').attr('page', 'dashboard');
                    }
                    if (viewPage.includes('login')) {
                        $('page-content').html(newBody);
                        $('page-content').attr('page', 'login');
                    }
                    $(body).animate({ opacity: 1 }, 300);
                }
            });
        });
    }, 700);
});