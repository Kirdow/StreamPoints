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

function onload() {
    const timer = new Timer()
    chrome.cookies.getAll({}, function(cookies) {
        startListening()
        for (let i in cookies) {
            cache.add(cookies[i])
        }
    })
}
function getUserName() {
    return cache.getCookies(".twitch.tv").filter(p => (p.name === "name" || p.name === "login") && (typeof(p.value) === "string" && p.value.length > 0))[0]?.value || null
}

onload()
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension")
        if (request.label === "getName")
            sendResponse({data: getUserName()})
        else if (request.label === "getDomains")
            sendResponse({data: cache.getDomains()})
    }
)

