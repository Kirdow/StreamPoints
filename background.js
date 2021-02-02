// Timer implementation
function Timer() {
    this.start_ = new Date()

    this.elapsed = function() {
        return (new Date()) - this.start_
    }

    this.reset = function() {
        this.start_ = new Date()
    }
}

// Checks two cookies are equal
function cookieMatch(c1, c2) {
    return (c1.name == c2.name) && (c1.domain == c2.domain) &&
            (c1.hostOnly == c2.hostOnly) && (c1.path == c2.path) &&
            (c1.secure == c2.secure) && (c1.httpOnly == c2.httpOnly) &&
            (c1.session == c2.session) && (c1.storeId == c2.storeId);
}

// Sorts an array of keys
function sortedKeys(array) {
    const keys = []
    for (let i in array) {
        keys.push(i)
    }
    keys.sort()
    return keys
}

// Cookie cache class, provided uncommented 'as is'
function CookieCache() {
    this._cookies = {}
    this.reset = function() {
        this._cookies = {}
    }
    this.add = function(cookie) {
        const domain = cookie.domain
        if (!this._cookies[domain]) {
            this._cookies[domain] = []
        }
        this._cookies[domain].push(cookie)
    }
    this.remove = function(cookie) {
        const domain = cookie.domain
        if (this._cookies[domain]) {
            for (let i = 0; i < this._cookies[domain].length; ) {
                if (cookieMatch(this._cookies[domain][i], cookie)) {
                    this._cookies[domain].splice(i, 1)
                } else {
                    i++
                }
            }
            if (this._cookies[domain].length == 0) {
                delete this._cookies[domain]
            }
        }
    }
    this.getDomains = function(filter) {
        const result = []
        sortedKeys(this._cookies).forEach(function(domain) {
            if (!filter || domain.indexOf(filter) != -1) {
                result.push(domain)
            }
        })
        return result
    }
    this.getCookies = function(domain) {
        return this._cookies[domain]
    }
}

// State actions class, calls callbacks for boolean values when the state changes
function StateActions(falseCallback, trueCallback) {
    this._onFalse = falseCallback
    this._onTrue = trueCallback
    this._state = false

    // Set the new state
    this.set = function(state) {
        state = !!state
        const changed = state != this._state
        this._state = state

        // If the state is changed, use the callback
        if (changed) {
            // Pick the callback that represent the new state
            const cb = (state ? this._onTrue : this._onFalse)
            if (typeof(cb) === "function") {
                cb()
            }
        }

        // Return the current state (the new state)
        return this._state
    }

    // Toggles the state
    this.toggle = function() {
        return this.set(!this._state)
    }

    // Gets the current state
    this.get = function() {
        return !!this._state
    }
}

// Instantiate the cache variable
var cache = new CookieCache()

// Listener for new or updated cookies
function listener(info) {
    cache.remove(info.cookie)
    if (!info.removed) {
        cache.add(info.cookie)
    }
}

// Run from StateActions when turned on
function startListening() {
    chrome.cookies.onChanged.addListener(listener)
}

// Run from StateActions when turned off
function stopListening() {
    chrome.cookies.onChanged.removeListener(listener)
}

// Instantiate state actions with the correct callbacks
var listenState = new StateActions(stopListening, startListening)

// Load the initial cookies
function loadCookies(cookies) {
    // Turns the listener on, using StateActions to make sure it's not turned on twice
    listenState.set(true)
    // Add each cookie to the cache
    cookies.forEach(p => cache.add(p))
}

// Looks for the username cookie and returns the username, or null if not found
function getUserName() {
    return cache.getCookies(".twitch.tv").filter(p => (p.name === "name" || p.name === "login") && (typeof(p.value) === "string" && p.value.length > 0)).map(p => p.value)[0] || null
}

// Fetches all initial cookies and registers listeners
function onload() {
    chrome.cookies.getAll({}, loadCookies)
    chrome.runtime.onMessage.addListener(messageHandler)
    chrome.tabs.onUpdated.addListener(tabChangeHandler)
    chrome.action.onClicked.addListener(actionClickHandler)
}

// Class for messages
function RequestMessage(request, sender, sendResponse) {
    this.label = request.label
    this.request = request
    this.sender = sender
    this.sendResponse = sendResponse
    this.result = undefined
}

// The message handler used when messages arrive to service worker
function messageHandler(request, sender, sendResponse) {
    // Log who sent the message
    console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension")

    // Check if the label is for a valid message and that it's a function
    if (typeof(messages[request.label]) === "function") {
        // Create a message object
        const message = new RequestMessage(request, sender, sendResponse)

        // Call the correct specific message handler
        messages[request.label](message)

        // If the message handler stored a result, return it
        if (!(typeof(message.result) === 'undefined' || message.result == null)) {
            return message.result
        }
    }
}

// Handler for when a tab changes, in this case the URL
function tabChangeHandler(tabId, changeInfo, url) {
    if (changeInfo.url) {
        // Log what tab and URL changed and send a tab_change message to the tab's content script
        console.log("Tab changed:",{id:tabId,url:changeInfo.url})
        chrome.tabs.sendMessage(tabId, {
            message: "tab_change",
            url: changeInfo.url
        })
    }
}

// Handler for when a tab uses the action button
function actionClickHandler(tab) {
    // Log what tab (with some info) and send a action message to the tab's content script
    console.log("Action pressed from tab:", {id:tab.id, index:tab.index, url:tab.url, title:tab.title})
    chrome.tabs.sendMessage(tab.id, {
        message: "action",
        url: tab.url
    })
}

// Contains the message handlers the service worker has.
// In this case getName which returns the name of the logged in user.
// This might get called multiple times until it fetches a logged in user
var messages = {
    getName: function(message) {
        message.sendResponse({data: getUserName()})
    }
}

// Call the onload function
onload()
