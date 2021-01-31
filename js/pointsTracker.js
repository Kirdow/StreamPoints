function startPointTracker() {
    if (window['_ktnse'] !== true) {
        const ktn = {
            getDisplay: function() {
                return this.e.placeholder
            },
            setDisplay: function(data) {
                this.e.placeholder = data
            },
            setPoints: function(data) {
                if (typeof(data) !== "number") {
                    this.clearDisplay()
                    return
                }
                if (typeof(this._timer) === "number" && this._timer > 0) {
                    this.setDisplay(`${window._pname}: ${this._points} | Updates in ${this._timer}s`)
                } else {
                    this._points = data
                    this.setDisplay(`${window._pname}: ${data}`)
                }
            },
            updateTimer: function() {
                if (typeof(window._channel) !== "string" || !window._support) return
                this._timer = (this._timer || 0) - 1
                this._timerup = (this._timerup || -1) + 1
                if (typeof(this._points) !== "number" || this._timer <= 0) {
                    if (this._reqon === true) {
                        return
                    }
                    this._reqon = true
                    this.fetchPoints(() => {
                        this._timer = 600
                        this._timerup = 0
                        window._ktnroot._reqon = false
                    })
                } else {
                    this.setPoints(this._points)
                }
            },
            forceUpdate: function() {
                if (this._reqon === true) {
                    return
                }
                if (typeof(this._timerup) === "number" && this._timerup >= 60) {
                    this._reqon = true
                    this._timer = 0
                    this.fetchPoints(() => {
                        this._timer = 600
                        this._timerup = 0
                        this._reqon = false
                    })
                }
            },
            getPoints: function() {
                return this._points || 0
            },
            clearDisplay: function() {
                this.setDisplay(this._search || "Search")
            },
            showPoints: function(data) { // Not used atm
                this.setPoints(data)
                setTimeout(() => this.clearDisplay(), 5000)
            },
            fetchPoints: function(callback) {
                if (!window._support) return
                fetch(`https://api.streamelements.com/kappa/v2/points/${window._channel}/${window._ktnname}`).then(p => p.json()).then(p => p.points)
                .then(points => {
                    this.setPoints(points)
                    if (typeof(callback) === "function") {
                        callback()
                    }
                })
            },
            isValid: function() {
                return typeof(window._ktnname) === "string" && window._ktnname.length > 0
            },
            channelSupported: function(id, name, pname, callback) {
                window._pname = pname.toUpperCase()[0] + pname.toLowerCase().substr(1)
                window.channelName = name
                window.channelLink = location.href
                window._channel = id
                window._ktnpause = false
                window._support = true
                if (typeof(callback) === "function") {
                    callback()
                }
            },
            channelUnsupported: function(name, reason) {
                if (typeof(name) === "string") {
                    console.log("Unsupported Channel:",name,"\nReason:",reason)
                }
                window.channelName = name
                window.channelLink = location.href
                window._channel = null
                window._ktnpause = false
                window._support = false
                this.clearDisplay()
            },
            fetchChannel: function(channelName, callback) {
                fetch(`https://api.streamelements.com/kappa/v2/channels/${channelName}`)
                .then(p => p.json())
                .then(p => {
                    if (p.statusCode == "404" || p.provider !== "twitch") {
                        this.channelUnsupported(channelName, p.statusCode == "404" ? "404" : "wrong platform")
                    } else {
                        console.log("Supported Channel:",channelName)
                        fetch(`https://api.streamelements.com/kappa/v2/loyalty/${p._id}`)
                        .then(p1 => p1.json())
                        .then(p1 => {
                            if (p1 != null && p1.loyalty != null && p1.loyalty.enabled == true) {
                                this.channelSupported(p._id, channelName, p1.loyalty.name || "points", callback)
                            } else {
                                this.channelUnsupported(channelName, "Channel Points Unsupported")
                            }
                        })
                    }
                })
                .catch(error => {
                    console.log("Channel Points Error",error)
                    this.channelUnsupported()
                })
            },
            updateChannel: function(callback) {
                if (window.channelLink !== location.href) {
                    let cname = location.href
                    cname = cname.substr(cname.lastIndexOf("/")+1)
                    window._ktnpause = true
                    this.fetchChannel(cname, callback)
                }
            },
            getElement: function() {
                if (typeof(this.e) === "object" && this.e != null) {
                    return this.e
                }
                const result = Array.from(document.querySelectorAll("input[type=\"search\"]")).filter(this.filterElement)[0]
                if (typeof(result) === "object" && result != null) {
                    this._search = result.placeholder
                    return this.e = result
                } else {
                    return null
                }
            },
            filterElement: function(el) {
                while (el.parentElement != el && (el = el.parentElement) != null) {
                    if (el.getAttribute("data-a-target") === "nav-search-box") return true
                }
                return false
            }
        }

        waitForSearch(ktn)
    }
}

function waitForSearch(ktn) {
    const elem = ktn.getElement()
    if (typeof(elem) === "object" && elem != null) {
        finalizeTracker(ktn)
        return
    }
    setTimeout(() => waitForSearch(ktn), 1000)
}

function finalizeTracker(ktn) {
    window._support = false
    window['_ktnse'] = true
    window['_ktnroot'] = ktn

    if (!ktn.isValid()) {
        return
    }

    setInterval(() => {
        if (!window._ktnpause) {
            ktn.updateTimer()
        }
    }, 1000)

    channelUpdate()
}

function initTracker() {
    chrome.runtime.sendMessage({label: "getName"}, function(response) {
        if (typeof(response.data) === "string" && response.data.length > 0) {
            window._ktnname = response.data
            setTimeout(startPointTracker, 0)
        } else {
            setTimeout(initTracker, 2000)
        }
    })
}

function channelUpdate() {
    window._ktnroot.updateChannel(() => {
        window._ktnroot._timerup = 61
        window._ktnroot.forceUpdate()
    })
}

function messageHandler(request, sender, sendResponse) {
    if (request.message === "tab_change") {
        console.log("Url Changed:",request.url)
        channelUpdate()
    }
}

function onload() {
    chrome.runtime.onMessage.addListener(messageHandler)
    setTimeout(initTracker, 0)
}

setTimeout(onload, 0)