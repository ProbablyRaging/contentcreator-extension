document.addEventListener('DOMContentLoaded', async () => {
    // Check if user has an active session
    const { userId } = await chrome.storage.sync.get(['userId']);
    setTimeout(() => {
        fetch('http://localhost/api/getuser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        }).then(response => response.json())
            .then(data => {
                const body = document.body;
                console.log(data.result.username);
                if (data.result) {
                    if (new Date().valueOf() < data.result.expires) {
                        $('head').find('link[href="../css/login.css"]').remove();
                        // $('body').find('script[src="../js/login.js"]').remove();
                        $(body).animate({ opacity: 0 }, 300).promise().then(() => {
                            $.ajax({
                                url: '../views/dashboard.html',
                                success: function (res) {
                                    // Extract the content
                                    const parser = new DOMParser();
                                    const responseDoc = parser.parseFromString(res, 'text/html');
                                    let newBody = $(responseDoc).find('body').html();
                                    newBody = newBody.replace('data.result.username', data.result.username);
                                    newBody = newBody.replace('data.result.tokens', data.result.tokens || 0);
                                    // Replace the current page's content
                                    $('page-content').html(newBody);
                                    $('page-content').attr('page', 'dashboard');
                                    $(body).animate({ opacity: 1 }, 300);
                                }
                            });
                        });
                    } else {
                        $('head').find('link[href="../css/dashboard.css"]').remove();
                        // $('body').find('script[src="../js/dashboard.js"]').remove();
                        $(body).animate({ opacity: 0 }, 300).promise().then(() => {
                            $.ajax({
                                url: '../views/login.html',
                                success: function (res) {
                                    // Extract the content
                                    const parser = new DOMParser();
                                    const responseDoc = parser.parseFromString(res, 'text/html');
                                    const newBody = $(responseDoc).find('body').html();

                                    // Replace the current page's content
                                    $('page-content').html(newBody);
                                    $('page-content').attr('page', 'login');
                                    $(body).animate({ opacity: 1 }, 300);
                                }
                            });
                        });
                    }
                } else {
                    $('head').find('link[href="../css/dashboard.css"]').remove();
                    // $('body').find('script[src="../js/dashboard.js"]').remove();
                    $(body).animate({ opacity: 0 }, 300).promise().then(() => {
                        $.ajax({
                            url: '../views/login.html',
                            success: function (res) {
                                // Extract the content
                                const parser = new DOMParser();
                                const responseDoc = parser.parseFromString(res, 'text/html');
                                const newBody = $(responseDoc).find('body').html();

                                // Replace the current page's content
                                $('page-content').html(newBody);
                                $('page-content').attr('page', 'login');
                                $(body).animate({ opacity: 1 }, 300);
                            }
                        });
                    });
                }
            });
    }, 700);
});

