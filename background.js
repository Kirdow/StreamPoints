function Timer() {
    this.start_ = new Date()

    this.elapsed = function() {
        return (new Date()) - this.start_
    }

    this.reset = function() {
        this.start_ = new Date()
    }
}

function cookieMatch(c1, c2) {
    return (c1.name == c2.name) && (c1.domain == c2.domain) &&
            (c1.hostOnly == c2.hostOnly) && (c1.path == c2.path) &&
            (c1.secure == c2.secure) && (c1.httpOnly == c2.httpOnly) &&
            (c1.session == c2.session) && (c1.storeId == c2.storeId);
}

function sortedKeys(array) {
    const keys = []
    for (let i in array) {
        keys.push(i)
    }
    keys.sort()
    return keys
}

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

function StateActions(falseCallback, trueCallback) {
    this._onFalse = falseCallback
    this._onTrue = trueCallback
    this._state = false

    this.set = function(state) {
        state = !!state
        const changed = state != this._state
        this._state = state

        if (changed) {
            const cb = (state ? this._onTrue : this._onFalse)
            if (typeof(cb) === "function") {
                cb()
            }
        }

        return this._state
    }

    this.toggle = function() {
        return this.set(!this._state)
    }

    this.get = function() {
        return !!this._state
    }
}


var cache = new CookieCache()

function listener(info) {
    cache.remove(info.cookie)
    if (!info.removed) {
        cache.add(info.cookie)
    }
}

function startListening() {
    chrome.cookies.onChanged.addListener(listener)
}

function stopListening() {
    chrome.cookies.onChanged.removeListener(listener)
}

var listenState = new StateActions(stopListening, startListening)

function loadCookies(cookies) {
    listenState.set(true)
    cookies.forEach(p => cache.add(p))
}

function getUserName() {
    return cache.getCookies(".twitch.tv").filter(p => (p.name === "name" || p.name === "login") && (typeof(p.value) === "string" && p.value.length > 0)).map(p => p.value)[0] || null
}

function onload() {
    chrome.cookies.getAll({}, loadCookies)
    chrome.runtime.onMessage.addListener(messageHandler)
    chrome.tabs.onUpdated.addListener(tabChangeHandler)
    chrome.action.onClicked.addListener(actionClickHandler)
}

function RequestMessage(request, sender, sendResponse) {
    this.label = request.label
    this.request = request
    this.sender = sender
    this.sendResponse = sendResponse
    this.result = undefined
}

function messageHandler(request, sender, sendResponse) {
    console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension")

    if (typeof(messages[request.label]) === "function") {
        const message = new RequestMessage(request, sender, sendResponse)
        messages[request.label](message)
        if (!(typeof(message.result) === 'undefined' || message.result == null)) {
            return message.result
        }
    }
}

function tabChangeHandler(tabId, changeInfo, url) {
    if (changeInfo.url) {
        console.log("Tab changed:",{id:tabId,url:changeInfo.url})
        chrome.tabs.sendMessage(tabId, {
            message: "tab_change",
            url: changeInfo.url
        })
    }
}

function actionClickHandler(tab) {
    console.log("Action pressed from tab:", {id:tab.id, index:tab.index, url:tab.url, title:tab.title})
    chrome.tabs.sendMessage(tab.id, {
        message: "action",
        url: tab.url
    })
}

var messages = {
    getName: function(message) {
        message.sendResponse({data: getUserName()})
    }
}

onload()
