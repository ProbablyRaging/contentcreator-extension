document.addEventListener('DOMContentLoaded', async () => {
    checkDashboardPage();
});

function checkDashboardPage() {
    let retries = 0;
    // Check if the user is on the dashboard page
    function reCheck() {
        // If the page has not been found yet and the number of retries is less than 30
        if (retries < 30) {
            // Get the page name attribute of the 'page-content' element and check if it's 'dashboard'
            const pageName = document.querySelector('page-content').getAttribute('page');
            if (pageName === 'dashboard') {
                // Call the function that sets up the dashboard page
                setupDashboardPage();
            } else {
                // Try again in 100ms
                setTimeout(reCheck, 100);
                retries++;
            }
        }
    }
    // Start the recursive function
    reCheck();
}

function fetchDataAndPopulatePage(userId) {
    chrome.storage.sync.set({ expireTime: null });
    $.ajax({
        url: 'http://54.79.93.12/api/videolist',
        type: 'GET',
        success: function (res) {
            // Update current video watch counter
            setTimeout(() => {
                updateTotalWatchCount(res);
            }, 600);
            // Update current queue list
            updateCurrentQueueList(res, userId);
            const oneHour = 60 * 60 * 1000;
            chrome.storage.sync.set({ nextPopulateTimestamp: new Date().valueOf() + oneHour });
        },
        error: function () {
            // This function will be called if there is an error fetching the data
            console.log('Error fetching data.');
        }
    });
}

async function startVideoExpireTimer(expires, useCached) {
    if (useCached) {
        const { expireTime } = await chrome.storage.sync.get(['expireTime']);
        if (!expireTime) return;
        const timeRemaining = expireTime - new Date().getTime(); // time remaining in milliseconds
        const hours = Math.floor(timeRemaining / (60 * 60 * 1000)); // calculate hours
        const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000)); // calculate minutes
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000); // calculate seconds
        timeToReset.innerText = `Your video expires in ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        setInterval(() => {
            const timeRemaining = expireTime - new Date().getTime(); // time remaining in milliseconds
            const hours = Math.floor(timeRemaining / (60 * 60 * 1000)); // calculate hours
            const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000)); // calculate minutes
            const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000); // calculate seconds
            timeToReset.innerText = `Your video expires in ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        }, 1000);
    } else {
        chrome.storage.sync.set({ expireTime: expires });
        const timeRemaining = expires - new Date().getTime(); // time remaining in milliseconds
        const hours = Math.floor(timeRemaining / (60 * 60 * 1000)); // calculate hours
        const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000)); // calculate minutes
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000); // calculate seconds
        timeToReset.innerText = `Your video expires in ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        setInterval(() => {
            const timeRemaining = expires - new Date().getTime(); // time remaining in milliseconds
            const hours = Math.floor(timeRemaining / (60 * 60 * 1000)); // calculate hours
            const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000)); // calculate minutes
            const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000); // calculate seconds
            timeToReset.innerText = `Your video expires in ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        }, 1000);
    }
}

async function updateTotalWatchCount(res, useCached) {
    if (useCached) {
        const { cachedWatchCount } = await chrome.storage.sync.get(['cachedWatchCount']);
        const watchCount = document.getElementById('watchCount');
        watchCount.innerHTML = `<p class="wc-number count-up">0</p> ${watchCount.innerText}`;
        setTimeout(() => {
            $({ countNum: 0 }).animate(
                { countNum: cachedWatchCount },
                {
                    duration: 1000,
                    easing: 'linear',
                    step: function () {
                        watchCount.querySelector('.count-up').innerText = numberWithCommas(this.countNum.toFixed(0));
                    },
                    complete: function () {
                        watchCount.querySelector('.count-up').innerText = numberWithCommas(cachedWatchCount);
                    }
                }
            );
        }, 700);
    } else {
        chrome.storage.sync.set({ cachedWatchCount: res.watchCount });
        const watchCount = document.getElementById('watchCount');
        watchCount.innerHTML = `<p class="wc-number count-up">0</p> ${watchCount.innerText}`;
        $({ countNum: 0 }).animate(
            { countNum: res.watchCount },
            {
                duration: 1000,
                easing: 'linear',
                step: function () {
                    watchCount.querySelector('.count-up').innerText = numberWithCommas(this.countNum.toFixed(0));
                },
                complete: function () {
                    watchCount.querySelector('.count-up').innerText = numberWithCommas(res.watchCount);
                }
            }
        );
    }
}

async function updateCurrentQueueList(res, userId, useCached) {
    if (useCached) {
        const { cachedVideoList } = await chrome.storage.sync.get(['cachedVideoList']);
        const listTitle = document.getElementById('list-title');
        listTitle.innerHTML = `Current Queue (${cachedVideoList.length}) <i class="bi bi-caret-down-fill accordian-caret"></i>`
        // This function will be called when the data is successfully fetched
        // We can use the data to dynamically generate an unordered list
        const list = $('<ul class="hidden-list">');
        $.each(cachedVideoList, function (index, item) {
            // Start video expire countdown timer
            if (userId === item.userId) startVideoExpireTimer(item.expires);
            // For each item in the data, we create a new list item and add it to the list
            const listItem = $('<li>')
                .html(`${userId === item.userId ? '<i class="bi bi-caret-right-fill" style="color: #5d93cb;"></i>' : ''}${index + 1}. `)
                .append(
                    $('<a>')
                        .attr('href', `https://youtube.com/watch?v=${item.videoId}`)
                        .attr('target', '_blank')
                        .text(`youtu.be/${item.videoId}`)
                )
                .append(
                    $('<span>')
                        .text(` - Views: ${item.watches}`)
                );
            // Append formatted item to list
            list.append(listItem);
        });
        // Finally, we append the list to a container element in the HTML
        $('#videoList').append(list);
    } else {
        chrome.storage.sync.set({ cachedVideoList: res.videoList });
        const listTitle = document.getElementById('list-title');
        listTitle.innerHTML = `Current Queue (${res.videoList.length}) <i class="bi bi-caret-down-fill accordian-caret"></i>`
        // This function will be called when the data is successfully fetched
        // We can use the data to dynamically generate an unordered list
        const list = $('<ul class="hidden-list">');
        $.each(res.videoList, function (index, item) {
            // Start video expire countdown timer
            if (userId === item.userId) startVideoExpireTimer(item.expires);
            // For each item in the data, we create a new list item and add it to the list
            const listItem = $('<li>')
                .html(`${userId === item.userId ? '<i class="bi bi-caret-right-fill" style="color: #5d93cb;"></i>' : ''}${index + 1}. `)
                .append(
                    $('<a>')
                        .attr('href', `https://youtube.com/watch?v=${item.videoId}`)
                        .attr('target', '_blank')
                        .text(`youtu.be/${item.videoId}`)
                )
                .append(
                    $('<span>')
                        .text(` - Views: ${item.watches}`)
                );
            // Append formatted item to list
            list.append(listItem);
        });
        // Finally, we append the list to a container element in the HTML
        $('#videoList').append(list);
    }
}

async function updateUserTokensCount(userId, element) {
    $.ajax({
        url: 'http://54.79.93.12/api/usertokens',
        type: 'POST',
        data: {
            userId: userId,
        },
        success: function (res) {
            // Update current user tokens
            element.innerText = res.tokens;
        },
        error: function () {
            // This function will be called if there is an error fetching the data
            console.log('Error fetching data.');
        }
    });
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

async function setupDashboardPage() {
    const { activeWindowId } = await chrome.storage.sync.get(['activeWindowId']);
    const { userId } = await chrome.storage.sync.get(['userId']);
    const { nextPopulateTimestamp } = await chrome.storage.sync.get(['nextPopulateTimestamp']);
    const { notifications } = await chrome.storage.sync.get(['notifications']);
    const { discordNotification } = await chrome.storage.sync.get(['discordNotification']);
    const { browserNotification } = await chrome.storage.sync.get(['browserNotification']);
    const { muteQueue } = await chrome.storage.sync.get(['muteQueue']);
    const { playFull } = await chrome.storage.sync.get(['playFull']);

    const dashboard = document.getElementById('dashboardFadeIn');
    $(dashboard).animate({ opacity: 1 }, 300);

    setTimeout(() => {
        $('.title-welcome').animate({ opacity: 1 }, 200);
        $('.settings-btn').animate({ opacity: 1 }, 300);
    }, 470);

    setTimeout(() => {
        $('.queue-countdown').animate({ opacity: 1 }, 300);
        $('.content-container').animate({ opacity: 1 }, 300);
        $('.play-button').animate({ opacity: 1 }, 300);
        $('#accordian').animate({ opacity: 1 }, 300);
        $('.footer').animate({ opacity: 1 }, 300);
    }, 770);

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const button = document.getElementById('button');
    const createBtn = document.getElementById('createBtn');
    const endCreateBtn = document.getElementById('endCreateBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const statsBtn = document.getElementById('statsBtn');
    const createInput = document.getElementById('createInput');
    const inputError = document.getElementById('input-error');
    const inputField = document.getElementById("createInput");
    const sendCreateBtn = document.getElementById('sendCreateBtn');
    const tokenData = document.getElementById('tokenData');
    const accordian = document.getElementById('list-title');
    const notificationsSwitch = document.getElementById("notificationsSwitch");
    const notificationsAlt = document.getElementById("notificationsAlt");
    const discordSwitch = document.getElementById("discordSwitch");
    const browserSwitch = document.getElementById("browserSwitch");
    const muteQueueSwitch = document.getElementById("muteQueueSwitch");
    const playFullSwitch = document.getElementById("playFullSwitch");

    // Fetch video list, update count, and update current queue list
    if (!nextPopulateTimestamp || new Date().valueOf() > nextPopulateTimestamp) {
        fetchDataAndPopulatePage(userId);
    } else {
        updateTotalWatchCount(null, true);
        startVideoExpireTimer(null, true);
        updateCurrentQueueList(null, userId, true);
        updateUserTokensCount(userId, tokenData);
    }

    // If there is already an active queue window, disable the play queue button
    if (activeWindowId) {
        chrome.windows.get(activeWindowId, function (window) {
            if (chrome.runtime.lastError) return;
            button.disabled = true;
            button.classList.add('complete');
            button.classList.remove('ready');
        });
    }

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
                notificationsAlt.style.display = 'none';
            } else {
                await chrome.storage.sync.set({ notifications: true });
                notificationsAlt.style.display = 'block';
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

    // When the accordiant title is clicked
    accordian.addEventListener('click', function () {
        const openElements = document.querySelectorAll('.slidDown');
        openElements.forEach(openElement => {
            const caret = openElement.querySelector('i');
            $(caret).animate({ 'rotate': "0deg" }, 200);
            $(openElement.nextElementSibling).slideUp(200);
            $(openElement).toggleClass('slidDown');
        });

        $(this).parent().parent().find('ul').slideUp(150);
        if (!$(this).next().is(":visible")) {
            const caret = this.querySelector('i');
            $(caret).animate({ 'rotate': "180deg" }, 200);
            $(this).next().slideDown(0);
            $(this).toggleClass('slidDown');
            $('.hidden-list').slideDown(150);
        }
    });

    // When the settings button is clicked
    settingsBtn.addEventListener('click', async function () {
        if (!settingsMenu.classList.contains('shown')) {
            $(dashboard).find(settingsBtn).siblings().not(settingsBtn).css('filter', 'blur(2px)');
            const bodyBlur = document.createElement("div");
            bodyBlur.id = 'bodyBlur';
            bodyBlur.style.position = 'absolute';
            bodyBlur.style.top = '0';
            bodyBlur.style.left = '0';
            bodyBlur.style.width = '100%';
            bodyBlur.style.height = '100%';
            bodyBlur.style.backgroundColor = '#00000029';
            bodyBlur.style.backdropFilter = 'blur(3px)';
            bodyBlur.style.zIndex = '2';
            // Get OS and extension version
            const extInfo = document.querySelector('#extInfo');
            extInfo.innerHTML = `v${chrome.runtime.getManifest().version} | ${navigator.userAgent}`
            // Aloow the settings menu to be closed by clicking outside of it
            bodyBlur.onclick = function () {
                $(dashboard).find(settingsBtn).siblings().not(settingsBtn).css('filter', 'blur(0px)');
                document.querySelector('#bodyBlur').remove();
                $(settingsBtn).css('background-color', '#00000040')
                    .css('z-index', '0')
                    .animate({ 'rotate': '0deg' }, 250).promise().then(() => {
                        $(settingsBtn).addClass('bi-gear-fill')
                            .removeClass('bi-x-lg');
                    });
                $(settingsMenu).animate({ top: '568' }, 250).toggleClass('shown');
            }
            document.body.insertBefore(bodyBlur, document.body.firstChild);
            $(settingsBtn).css('background-color', '#0000005f')
                .css('z-index', '999')
                .animate({ 'rotate': '180deg' }, 250)
                .removeClass('bi-gear-fill')
                .addClass('bi-x-lg');
            $(settingsMenu).animate({ top: '70' }, 250).toggleClass('shown')
        } else {
            $(dashboard).find(settingsBtn).siblings().not(settingsBtn).css('filter', 'blur(0px)');
            document.querySelector('#bodyBlur').remove();
            $(settingsBtn).css('background-color', '#00000040')
                .css('z-index', '0')
                .animate({ 'rotate': '0deg' }, 250).promise().then(() => {
                    $(settingsBtn).addClass('bi-gear-fill')
                        .removeClass('bi-x-lg');
                });
            $(settingsMenu).animate({ top: '568' }, 250).toggleClass('shown');
        }
    });

    // When the create button is clicked, toggle its class and that
    // of the end create button, show the input and the input error message
    createBtn.addEventListener('click', function () {
        try {
            $(this).hide(150).toggleClass('hidden');
            $(endCreateBtn).css({ display: 'flex' });
            $(logoutBtn).hide(150);
            $(createInput).show(150);
            $(inputField).focus();
            $(statsBtn).hide(150);
        } catch (err) {
            console.log('There was a problem : ', err);
        }
    });
    // When the end create button is clicked, toggle its class and that of the create button,
    // hide the input and the input error message, and clear the input error message text
    endCreateBtn.addEventListener('click', function () {
        try {
            $(this).hide(0).toggleClass('hidden');
            $(createBtn).css({ display: 'flex' });
            $(createInput).hide(150);
            $(logoutBtn).show(150);
            $(statsBtn).show(150);
            inputError.innerText = '';
        } catch (err) {
            console.log('There was a problem : ', err);
        }
    });
    // When the refresh button is clicked, redirect to the loader.html page
    statsBtn.addEventListener('click', function () {
        $('.title-welcome').animate({ opacity: 0 }, 200);
        $('.settings-btn').animate({ opacity: 0 }, 200);
        setTimeout(() => {
            $('.body-bg').animate({ 'background-position-y': '-90px' }, 300);
            $('body').animate({ opacity: 0 }, 300).promise().then(() => {
                const someData = 'statistics';
                window.location = '../views/loader.html?data=' + encodeURIComponent(someData);
            });
        }, 200);

    });
    // When the logout button is clicked
    logoutBtn.addEventListener('click', async function () {
        $.ajax({
            url: 'http://54.79.93.12/api/logout',
            type: 'POST',
            data: {
                userId: userId,
            },
            success: function (res) {
                if (res.message) {
                    $('.title-welcome').animate({ opacity: 0 }, 200);
                    setTimeout(() => {
                        $('.body-bg').animate({ 'background-position-y': '-90px' }, 300);
                        $('body').animate({ opacity: 0 }, 300).promise().then(() => {
                            window.location = '../views/loader.html';
                        });
                    }, 200);
                }
                if (res.error) {
                    inputError.innerText = res.error;
                }
            }
        });
    });

    // When the text input state changes
    inputField.addEventListener("input", function () {
        // Check if the input field is empty or not
        if (inputField.value.length > 0) {
            if (!sendCreateBtn.classList.contains('hidden')) return;
            // Disable the submit button if not valid input
            $(sendCreateBtn).css({ display: 'flex' }).toggleClass('hidden');
            $(endCreateBtn).hide(0);
        } else {
            $(sendCreateBtn).hide(0).toggleClass('hidden');
            $(endCreateBtn).css({ display: 'flex' });
        }
    });

    // When the submit button is clicked
    sendCreateBtn.addEventListener('click', async function () {
        if (sendCreateBtn.classList.contains('disabled')) return;
        const inputText = inputField.value;
        // Check the user's tokens
        $.ajax({
            url: 'http://54.79.93.12/api/getuser',
            type: 'POST',
            data: {
                userId: userId,
            },
            success: function (res) {
                if (!res.result.tokens || res.result.tokens < 5) {
                    inputError.innerText = `You don't have enough tokens`;
                    setTimeout(() => {
                        inputError.innerText = ``;
                    }, 7000);
                    $(inputField).val('');
                    $(sendCreateBtn).toggleClass('hidden');
                    $(endCreateBtn).toggleClass('hidden');
                } else {
                    // Get the value of the input field and make post request
                    $.ajax({
                        url: 'http://54.79.93.12/api/addvideo',
                        type: 'POST',
                        data: {
                            videoId: inputText,
                            userId: userId
                        },
                        success: function (res) {
                            if (res.message) {
                                const oneDay = 24 * 60 * 60 * 1000;
                                chrome.storage.sync.set({ expireTime: new Date().valueOf() + oneDay });
                                inputError.style.color = '#58a75a';
                                inputError.innerText = res.message;
                                setTimeout(() => {
                                    inputError.innerText = ``;
                                }, 7000);
                                $(inputField).val('');
                                $(sendCreateBtn).hide(0).toggleClass('hidden');
                                $(endCreateBtn).css({ display: 'flex' });
                                tokenData.innerHTML = parseInt(tokenData.innerHTML) - 5;
                            } else if (res.error) {
                                inputError.style.color = '#d96c6e';
                                inputError.innerText = res.error;
                                setTimeout(() => {
                                    inputError.innerText = ``;
                                }, 7000);
                                $(inputField).val('');
                                $(sendCreateBtn).hide(0).toggleClass('hidden');
                                $(endCreateBtn).css({ display: 'flex' });
                            }
                        },
                        error: function (err) {
                            inputError.innerText = 'Something went wrong';
                            setTimeout(() => {
                                inputError.innerText = ``;
                            }, 7000);
                            $(inputField).val('');
                            $(sendCreateBtn).hide(0).toggleClass('hidden');
                            $(endCreateBtn).css({ display: 'flex' });
                        }
                    });
                }
            }
        });
    });

    // Play queue button animation
    var disabled = false;
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let cx = ctx.canvas.width / 2;
    let cy = ctx.canvas.height / 2;
    // Add Confetti/Sequince objects to arrays to draw them
    let confetti = [];
    let sequins = [];
    // Ammount to add on each button press
    const confettiCount = 20;
    const sequinCount = 10;
    // "physics" variables
    const gravityConfetti = 0.3;
    const gravitySequins = 0.55;
    const dragConfetti = 0.075;
    const dragSequins = 0.02;
    const terminalVelocity = 3;
    // Colors, back side is darker for confetti flipping
    const colors = [
        { front: '#FA7268', back: '#398ac7' },
        { front: '#B1356A', back: '#FA7268' },
        { front: '#C62368', back: '#398ac7' }
    ];
    // Helper function to pick a random number within a range
    randomRange = (min, max) => Math.random() * (max - min) + min;
    // Helper function to get initial velocities for confetti
    // This weighted spread helps the confetti look more realistic
    initConfettoVelocity = (xRange, yRange) => {
        const x = randomRange(xRange[0], xRange[1]);
        const range = yRange[1] - yRange[0] + 1;
        let y = yRange[1] - Math.abs(randomRange(0, range) + randomRange(0, range) - range);
        if (y >= yRange[1] - 1) {
            // Occasional confetto goes higher than the max
            y += (Math.random() < .25) ? randomRange(1, 3) : 0;
        }
        return { x: x, y: -y };
    }
    // Confetto Class
    function Confetto() {
        this.randomModifier = randomRange(0, 99);
        this.color = colors[Math.floor(randomRange(0, colors.length))];
        this.dimensions = {
            x: randomRange(5, 9),
            y: randomRange(8, 15),
        };
        this.position = {
            x: randomRange(canvas.width / 2 - button.offsetWidth / 4, canvas.width / 2 + button.offsetWidth / 4),
            y: randomRange(canvas.height / 2 + button.offsetHeight / 2 + 8, canvas.height / 2 + (1.5 * button.offsetHeight) - 8),
        };
        this.rotation = randomRange(0, 2 * Math.PI);
        this.scale = {
            x: 1,
            y: 1,
        };
        this.velocity = initConfettoVelocity([-9, 9], [6, 11]);
    }
    Confetto.prototype.update = function () {
        // Apply forces to velocity
        this.velocity.x -= this.velocity.x * dragConfetti;
        this.velocity.y = Math.min(this.velocity.y + gravityConfetti, terminalVelocity);
        this.velocity.x += Math.random() > 0.5 ? Math.random() : -Math.random();
        // Set position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        // Spin confetto by scaling y and set the color, .09 just slows cosine frequency
        this.scale.y = Math.cos((this.position.y + this.randomModifier) * 0.09);
    }
    // Sequin Class
    function Sequin() {
        this.color = colors[Math.floor(randomRange(0, colors.length))].back,
            this.radius = randomRange(1, 2),
            this.position = {
                x: randomRange(canvas.width / 2 - button.offsetWidth / 3, canvas.width / 2 + button.offsetWidth / 3),
                y: randomRange(canvas.height / 2 + button.offsetHeight / 2 + 8, canvas.height / 2 + (1.5 * button.offsetHeight) - 8),
            },
            this.velocity = {
                x: randomRange(-6, 6),
                y: randomRange(-8, -12)
            }
    }
    Sequin.prototype.update = function () {
        // Apply forces to velocity
        this.velocity.x -= this.velocity.x * dragSequins;
        this.velocity.y = this.velocity.y + gravitySequins;

        // Set position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
    // Add elements to arrays to be drawn
    initBurst = () => {
        for (let i = 0; i < confettiCount; i++) {
            confetti.push(new Confetto());
        }
        for (let i = 0; i < sequinCount; i++) {
            sequins.push(new Sequin());
        }
    }
    // Draws the elements on the canvas
    render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confetti.forEach((confetto, index) => {
            let width = (confetto.dimensions.x * confetto.scale.x);
            let height = (confetto.dimensions.y * confetto.scale.y);
            // Move canvas to position and rotate
            ctx.translate(confetto.position.x, confetto.position.y);
            ctx.rotate(confetto.rotation);
            // Update confetto "physics" values
            confetto.update();
            // Get front or back fill color
            ctx.fillStyle = confetto.scale.y > 0 ? confetto.color.front : confetto.color.back;
            // Draw confetto
            ctx.fillRect(-width / 2, -height / 2, width, height);
            // Reset transform matrix
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            // Clear rectangle where button cuts off
            if (confetto.velocity.y < 0) {
                ctx.clearRect(canvas.width / 2 - button.offsetWidth / 2, canvas.height / 2 + button.offsetHeight / 2, button.offsetWidth, button.offsetHeight);
            }
        })
        sequins.forEach((sequin, index) => {
            // Move canvas to position
            ctx.translate(sequin.position.x, sequin.position.y);
            // Update sequin "physics" values
            sequin.update();
            // Set the color
            ctx.fillStyle = sequin.color;
            // Draw sequin
            ctx.beginPath();
            ctx.arc(0, 0, sequin.radius, 0, 2 * Math.PI);
            ctx.fill();
            // Reset transform matrix
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            // Clear rectangle where button cuts off
            if (sequin.velocity.y < 0) {
                ctx.clearRect(canvas.width / 2 - button.offsetWidth / 2, canvas.height / 2 + button.offsetHeight / 2, button.offsetWidth, button.offsetHeight);
            }
        })
        // Remove confetti and sequins that fall off the screen
        // Must be done in seperate loops to avoid noticeable flickering
        confetti.forEach((confetto, index) => {
            if (confetto.position.y >= canvas.height) confetti.splice(index, 1);
        });
        sequins.forEach((sequin, index) => {
            if (sequin.position.y >= canvas.height) sequins.splice(index, 1);
        });
        window.requestAnimationFrame(render);
    }
    // Cycle through button states when clicked
    button.addEventListener('click', function () {
        if (!disabled) {
            chrome.runtime.sendMessage({ queue: true }, () => { if (chrome.runtime.lastError) return; });
            disabled = true;
            // Loading stage
            button.classList.add('loading');
            button.classList.remove('ready');
            setTimeout(() => {
                // Completed stage
                button.classList.add('complete');
                button.classList.remove('loading');
                setTimeout(() => {
                    window.initBurst();
                }, 320);
            }, 1800);
        }
    });
    // Set up button text transition timings on page load
    textElements = button.querySelectorAll('.button-text');
    textElements.forEach((element) => {
        characters = element.innerText.split('');
        let characterHTML = '';
        characters.forEach((letter, index) => {
            characterHTML += `<span class="char${index}" style="--d:${index * 30}ms; --dr:${(characters.length - index - 1) * 30}ms;">${letter}</span>`;
        })
        element.innerHTML = characterHTML;
    });
    // Kick off the render loop
    render();

    // Bootstrap tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}