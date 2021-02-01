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
                    let update = `Updates in ${this._timer}s`
                    if (typeof(this._warn) === "number" && this._warn > 0) {
                        update = `Force available in ${60 - this._timerup}s`
                    }
                    this.setDisplay(`${window._pname}: ${this._points} | ${update}`)
                } else {
                    this._points = data
                    this.setDisplay(`${window._pname}: ${data}`)
                }
            },
            updateTimer: function() {
                if (typeof(window._channel) !== "string" || !window._support) return
                this._timer = (this._timer || 0) - 1
                if (typeof(this._timerup) === "number") {
                    this._timerup += 1
                } else {
                    this._timerup = 1
                }

                if (typeof(this._warn) === "number" && this._warn > 0) {
                    this._warn -= 1
                }

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
                } else {
                    this._warn = 3
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
            handleErrors: function(response) {
                if (!response.ok) {
                    throw Error(response.statusText)
                }

                return response
            },
            fetchPoints: async function(callback) {
                if (!window._support) return
                try {
                    const response = await fetch(`https://api.streamelements.com/kappa/v2/points/${window._channel}/${window._ktnname}`)
                    if (!response.ok) {
                        console.log("Failed to fetch points:", (response.statusText || "").length > 0 ? (`${response.status} - ${response.statusText}`) : (response.status))
                        this.setPoints(0)
                        if (typeof(callback) === "function") {
                            callback()
                        }
                        return false
                    } else {
                        const json = await response.json()
                        const points = json.points

                        this.setPoints(points)
                        if (typeof(callback) === "function") {
                            callback()
                        }
                    }
                } catch (error) {
                    console.error("Points Fetch Failed:\n",error)
                    this.setPoints(0)
                    if (typeof(callback) === "function") {
                        callback()
                    }
                }
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
                    if (reason != null) {
                        console.log("Unsupported Channel:",name,"\nReason:",reason)
                    } else {
                        console.log("Unsupported Channel:",name)
                    }
                }
                window.channelName = name
                window.channelLink = location.href
                window._channel = null
                window._ktnpause = false
                window._support = false
                this.clearDisplay()
            },
            fetchChannel: async function(channelName, callback) {
                try {
                    let response = await fetch(`https://api.streamelements.com/kappa/v2/channels/${channelName}`)
                    if (!response.ok) {
                        let reason = undefined
                        if (response.status != "404") {
                            console.log("Channel Points Error", `${response.status}${(response.statusText || "").length > 0 ? (` - ${response.statusText}`) : ""}`)
                        } else {
                            reason = "Channel not using StreamElements"
                        }
                        this.channelUnsupported(channelName, reason)
                    } else {
                        const json = await response.json()
                        if (json.statusCode == "404" || json.provider !== "twitch") {
                            this.channelUnsupported(channelName, json.statusCode == "404" ? "StreamElements profile not found" : "wrong platform")
                        } else {
                            console.log("Supported Channel:",channelName)
                            response = await fetch(`https://api.streamelements.com/kappa/v2/loyalty/${json._id}`)
                            if (!response.ok) {
                                console.log("Channel Points Error", `${response.status}${(response.statusText || "").length > 0 ? (` - ${response.statusText}`) : ""}`)
                                this.channelUnsupported(channelName)
                            } else {
                                const loyaltyJson = await response.json()
                                if (loyaltyJson != null && loyaltyJson.loyalty != null && loyaltyJson.loyalty.enabled == true) {
                                    this.channelSupported(json._id, channelName, loyaltyJson.loyalty.name || "points", callback)
                                } else {
                                    this.channelUnsupported(channelName, "Channel Points Disabled")
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.log("Channel Points Error",error)
                    this.channelUnsupported(channelName)
                }
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
    } else if (request.message === "action") {
        console.log("Force Update:",request.url)
        if (window._ktnroot != null) {
            window._ktnroot.forceUpdate()
        }
    }
}

function onload() {
    chrome.runtime.onMessage.addListener(messageHandler)
    setTimeout(initTracker, 0)
}

setTimeout(onload, 0)