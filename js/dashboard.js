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
    const { activeQueue } = await chrome.storage.sync.get(['activeQueue']);
    const { userId } = await chrome.storage.sync.get(['userId']);

    const dashboard = document.getElementById('dashboardFadeIn');
    $(dashboard).animate({ opacity: 1 }, 300);

    setTimeout(() => {
        $('.title-welcome').animate({ opacity: 1 }, 200);
    }, 470);

    setTimeout(() => {
        $('.content-container').animate({ opacity: 1 }, 300);
        $('.play-button').animate({ opacity: 1 }, 300);
        $('#accordian').animate({ opacity: 1 }, 300);
        $('.footer').animate({ opacity: 1 }, 300);
    }, 770);

    const button = document.getElementById('button');
    const createBtn = document.getElementById('createBtn');
    const endCreateBtn = document.getElementById('endCreateBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const statsBtn = document.getElementById('statsBtn');
    const createInput = document.getElementById('createInput');
    const inputError = document.getElementById('input-error');
    const inputField = document.getElementById("createInput");
    const sendCreateBtn = document.getElementById('sendCreateBtn');
    const tokenData = document.getElementById('tokenData');
    const accordian = document.getElementById('list-title');

    // If there is already an active queue window, disable the play queue button
    if (activeQueue) {
        button.disabled = true;
        button.classList.add('complete');
        button.classList.remove('ready');
    }

    const muteQueueBox = document.getElementById("muteQueueBox");
    const { muteQueue } = await chrome.storage.sync.get(['muteQueue']);
    if (muteQueue) muteQueueBox.checked = true;
    if (!muteQueue) muteQueueBox.checked = false;
    // On page load, get the mute queue storage value and update the checkbox value
    // When the mute queue checkbox is clicked, update storage value
    muteQueueBox.addEventListener("change", (event) => {
        if (event.target.checked) {
            chrome.storage.sync.set({ muteQueue: true });
        } else {
            chrome.storage.sync.set({ muteQueue: false });
        }
    });

    // Set the video counter
    $.ajax({
        url: 'http://54.79.93.12/api/videolist',
        type: 'GET',
        success: function (res) {
            setTimeout(() => {
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
            }, 600);
        }
    });

    // Fetch video list and append to a list
    $.ajax({
        url: 'http://54.79.93.12/api/videolist', // replace with your own URL
        type: 'GET',
        success: function (res) {
            const listTitle = document.getElementById('list-title');
            listTitle.innerHTML = `Current Queue (${res.videoList.length}) <i class="bi bi-caret-down-fill accordian-caret"></i>`
            // This function will be called when the data is successfully fetched
            // We can use the data to dynamically generate an unordered list
            const list = $('<ul class="hidden-list">');
            $.each(res.videoList, function (index, item) {
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
        },
        error: function () {
            // This function will be called if there is an error fetching the data
            console.log('Error fetching data.');
        }
    });

    // When the accordiant title is clicked
    accordian.addEventListener('click', function () {
        const openElements = document.querySelectorAll('.slidDown');
        openElements.forEach(openElement => {
            $('body').animate({ 'paddingBottom': '0px' }, 200);
            const caret = openElement.querySelector('i');
            $(caret).animate({ "rotate": "0deg" }, 200);
            $(openElement.nextElementSibling).slideUp(200);
            $(openElement).toggleClass('slidDown');
        });

        $(this).parent().parent().find('ul').slideUp(150);
        if (!$(this).next().is(":visible")) {
            $('body').animate({ 'paddingBottom': '170px' }, 200);
            const caret = this.querySelector('i');
            $(caret).animate({ "rotate": "180deg" }, 200);
            $(this).next().slideDown(0);
            $(this).toggleClass('slidDown');
            $('.hidden-list').slideDown(150);
        }
    });

    // When the create button is clicked, toggle its class and that
    // of the end create button, show the input and the input error message
    createBtn.addEventListener('click', function () {
        $(this).toggleClass('hidden');
        $(endCreateBtn).toggleClass('hidden');
        $(createInput).show(150);
        $(inputError).show(150);
        $(inputField).focus();
        $(refreshBtn).hide(150);
        $(logoutBtn).hide(150);
        $(statsBtn).hide(150);
    });
    // When the end create button is clicked, toggle its class and that of the create button,
    // hide the input and the input error message, and clear the input error message text
    endCreateBtn.addEventListener('click', function () {
        $(this).toggleClass('hidden');
        $(createBtn).toggleClass('hidden');
        $(createInput).hide(150);
        $(inputError).hide(150);
        $(refreshBtn).show(150);
        $(logoutBtn).show(150);
        $(statsBtn).show(150);
        inputError.innerText = '';
    });
    // When the refresh button is clicked, redirect to the loader.html page
    refreshBtn.addEventListener('click', function () {
        $('.title-welcome').animate({ opacity: 0 }, 200);
        setTimeout(() => {
            $('.body-bg').animate({ 'background-position-y': '-90px' }, 300);
            $('body').animate({ opacity: 0 }, 300).promise().then(() => {
                window.location = '../views/loader.html';
            });
        }, 200);
    });
    // When the refresh button is clicked, redirect to the loader.html page
    statsBtn.addEventListener('click', function () {
        $('.title-welcome').animate({ opacity: 0 }, 200);
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
        // Get the value of the input field
        const inputText = inputField.value;
        // Only allow video IDs
        function checkId(input) {
            const regex = /(https:|http:|www\.|\.com\/|\/watch=|youtu\.be\/|&t=)/i;
            if (regex.exec(input)) {
                return false
            } else {
                return true
            }
        }
        if (checkId(inputText) === false) {
            if (!sendCreateBtn.classList.contains('disabled')) {
                $(sendCreateBtn).toggleClass('disabled');
                inputError.innerText = 'Please make sure you only enter video IDs';
                setTimeout(() => {
                    inputError.innerText = ``;
                }, 5000);
            }
        } else {
            if (sendCreateBtn.classList.contains('disabled')) $(sendCreateBtn).toggleClass('disabled');
            inputError.innerText = '';
        }
        // Check if the input field is empty
        if (inputText.length > 0) {
            if (!sendCreateBtn.classList.contains('hidden')) return;
            // Disable the submit button if not valid input
            $(sendCreateBtn).toggleClass('hidden');
            $(endCreateBtn).toggleClass('hidden');
        } else {
            $(sendCreateBtn).toggleClass('hidden');
            $(endCreateBtn).toggleClass('hidden');
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
                    }, 5000);
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
                            if (res.error) {
                                inputError.innerText = res.error;
                                setTimeout(() => {
                                    inputError.innerText = ``;
                                }, 5000);
                                $(inputField).val('');
                                $(sendCreateBtn).toggleClass('hidden');
                                $(endCreateBtn).toggleClass('hidden');
                            } else if (res.message) {
                                inputError.style.color = '#58a75a';
                                inputError.innerText = res.message;
                                setTimeout(() => {
                                    inputError.innerText = ``;
                                }, 5000);
                                $(inputField).val('');
                                $(sendCreateBtn).toggleClass('hidden');
                                $(endCreateBtn).toggleClass('hidden');
                                tokenData.innerHTML = parseInt(tokenData.innerHTML) - 5;
                            }
                        },
                        error: function (err) {
                            inputError.innerText = 'Something went wrong';
                            setTimeout(() => {
                                inputError.innerText = ``;
                            }, 5000);
                            $(inputField).val('');
                            $(sendCreateBtn).toggleClass('hidden');
                            $(endCreateBtn).toggleClass('hidden');
                        }
                    });
                }
            }
        });
    });

    // Create a new Date object
    const now = new Date();
    const utcTime = now.getTime();
    const timezoneOffset = now.getTimezoneOffset();
    const gmtPlus11Time = utcTime + (11 * 60 * 60 * 1000) + (timezoneOffset * 60 * 1000);
    const gmtPlus11Date = new Date(gmtPlus11Time);
    // Create a new Date object for midnight
    const midnight = new Date(gmtPlus11Date.getFullYear(), gmtPlus11Date.getMonth(), gmtPlus11Date.getDate());
    midnight.setHours(24);
    midnight.setMinutes(0);
    midnight.setSeconds(0);
    // Get countdown element
    const timeToReset = document.getElementById("timeToReset");
    // Update the time remaining every second
    const interval = setInterval(() => {
        // Calculate the time difference in milliseconds
        const timeDifference = midnight.getTime() - gmtPlus11Date.getTime();
        // Check if we've reached midnight
        if (timeDifference <= 0) {
            clearInterval(interval);
            return;
        }
        // Convert milliseconds to hours, minutes, and seconds
        const hours = Math.floor(timeDifference / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
        // Format the time remaining as a string
        const timeString = `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        // Display the time remaining
        timeToReset.innerText = `Queue resets in ${timeString}`;
        // Update the current GMT+11 time
        const now = new Date();
        const utcTime = now.getTime();
        const timezoneOffset = now.getTimezoneOffset();
        const gmtPlus11Time = utcTime + (11 * 60 * 60 * 1000) + (timezoneOffset * 60 * 1000);
        gmtPlus11Date.setTime(gmtPlus11Time);
    }, 1000);

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