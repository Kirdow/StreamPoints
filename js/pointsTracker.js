function VariableWrapper(_default, _type) {
    this._default = _default
    this._value = _default
    this._type = _type

    this.get = function() {
        if (typeof(this._type) === "string" && typeof(this._value) !== this._type) {
            this._value = this._default
        }

        return this._value
    }

    this.set = function(value) {
        this._value = value
    }

    this.modify = function(value) {
        this.set(value)
        return this.get()
    }
}

function PointTracker() {
    // Variables
    this._points = new VariableWrapper(0, "number")
    this.e = new VariableWrapper(null)
    this._timer = new VariableWrapper(0, "number")
    this._timerup = new VariableWrapper(0, "number")
    this._warn = new VariableWrapper(0, "number")
    this.reqon = new VariableWrapper(false, "boolean")
    this._search = new VariableWrapper("Search", "string")

    this.getPoints = function() {
        return this._points.get()
    }

    this.setPoints = function(value) {
        return this._points.modify(value)
    }

    this.getTimer = function() {
        return this._timer.get()
    }

    this.getTimerUp = function() {
        return this._timerup.get()
    }

    this.getWarn = function() {
        return this._warn.get()
    }

    this.isReqon = function() {
        return this.reqon.get()
    }

    this.getSearch = function() {
        return this._search.get()
    }

    this.setTimer = function(value) {
        return this._timer.modify(value)
    }

    this.setTimerUp = function(value) {
        return this._timerup.modify(value)
    }

    this.setWarn = function(value) {
        return this._warn.modify(value)
    }

    this.tickTimer = function() {
        return this._timer.modify(this._timer.get() - 1)
    }

    this.tickTimerUp = function() {
        return this._timerup.modify(this._timerup.get() + 1)
    }

    this.tickWarn = function() {
        return this._warn.modify(this._warn.get() - 1)
    }

    this.setReqon = function(value) {
        return this.reqon.modify(value)
    }

    this.setSearch = function(value) {
        return this._search.modify(value)
    }

    this.getDisplay = function() {
        return this.e.get().placeholder
    }

    this.setDisplay = function(data) {
        this.e.get().placeholder = data
    }

    this.setPoints = function(data) {
        if (typeof(data) !== "number") {
            this.clearDisplay()
            return
        }

        if (this.getTimer() > 0) {
            let update = `Updates in ${this.getTimer()}s`
            if (this.getWarn() > 0) {
                update = `Force available in ${60 - this.getTimerUp()}s`
            }
            this.setDisplay(`${window._pname}: ${this._points.get()} | ${update}`)
        } else {
            this._points.set(data)
            this.setDisplay(`${window._pname}: ${data}`)
        }
    }

    this.updateTimer = function() {
        if (typeof(window._channel) !== "string" || !window._support) return

        this.tickTimer()
        this.tickTimerUp()
        if (this.getWarn() > 0)
            this.tickWarn()

        if (this.getTimer() <= 0) {
            if (this.isReqon()) {
                return
            }

            this.setReqon(true)
            this.fetchPoints(() => {
                this.setTimer(600)
                this.setTimerUp(0)
                this.setReqon(false)
            })
        } else {
            this.setPoints(this._points.get())
        }
    }

    this.forceUpdate = function() {
        if (this.isReqon()) {
            return
        }

        if (this.getTimerUp() >= 60) {
            this.setReqon(true)
            this.setTimer(0)
            this.fetchPoints(() => {
                this.setTimer(600)
                this.setTimerUp(0)
                this.setReqon(false)
            })
        } else {
            this.setWarn(3)
        }
    }

    this.clearDisplay = function() {
        this.setDisplay(this.getSearch())
    }

    // Not used atm
    this.showPoints = function(data) {
        this.setTimeout(() => this.clearDisplay(), 5000)
    }

    this.fetchPoints = async function(callback) {
        if (!window._support) return

        try {
            const response = await fetch(`https://api.streamelements.com/kappa/v2/points/${window._channel}/${window._ktnname}`)
            if (!response.ok) {
                console.log("Failed to fetch points:", (response.statusText || "").length > 0 ? (`${response.status} - ${response.statusText}`) : (response.status))
                this.setPoints(0)
                if (typeof(callback) === "function") {
                    callback()
                }
            } else {
                const json = await response.json()
                const points = json.points

                this.setPoints(points)
                if (typeof(callback) === "function") {
                    callback()
                }
            }
        } catch (error) {
            console.error("Points Fetch Failed:\n", error)
            this.setPoints(0)
            if (typeof(callback) === "function") {
                callback()
            }
        }
    }

    this.isValid = function() {
        return typeof(window._ktnname) === "string" && window._ktnname.length > 0
    }

    this.channelSupported = function(id, name, pname, callback) {
        window._pname = pname.toUpperCase()[0] + pname.toLowerCase().substr(1)
        window.channelName = name
        window.channelLink = location.href
        window._channel = id
        window._ktnpause = false
        window._support = true
        if (typeof(callback) === "function") {
            callback()
        }
    }

    this.channelUnsupported = function(name, reason) {
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
    }

    this.fetchChannel = async function(channelName, callback) {
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
    }

    this.updateChannel = function(callback) {
        if (window.channelLink !== location.href) {
            let cname = location.href
            cname = cname.substr(cname.lastIndexOf("/") + 1)
            window._ktnpause = true
            this.fetchChannel(cname, callback)
        }
    }

    this.channelUpdate = function() {
        this.updateChannel(() => {
            this.setTimerUp(61)
            this.forceUpdate()
        })
    }

    this.getElement = function() {
        if (typeof(this.e.get()) === "object" && this.e.get() != null) {
            return this.e.get()
        }

        const result = Array.from(document.querySelectorAll("input[type=\"search\"]")).filter(this.filterElement)[0]
        if (typeof(result) === "object" && result != null) {
            this._search.set(result.placeholder)
            return this.e.modify(result)
        } else {
            return null
        }
    }

    this.filterElement = function(el) {
        const _el = el
        while(el.parentElement != el && (el = el.parentElement) != null) {
            if (el.getAttribute("data-a-target") === "nav-search-box") {
                if (!(_el.id || "").endsWith("hidden")) return true
            }
        }
        return false
    }

    this.preInit = function() {
        chrome.runtime.sendMessage({ label: "getName" }, response => {
            if (typeof(response.data) === "string" && response.data.length > 0) {
                window._ktnname = response.data
                setTimeout(() => this.waitForSearch(), 0)
            } else {
                setTimeout(() => this.preInit(), 2000)
            }
        })
    }

    this.waitForSearch = function() {
        const elem = this.getElement()
        if (typeof(elem) === "object" && elem != null) {
            console.log("Found search")
            this.postInit()
            return
        }
        setTimeout(() => this.waitForSearch(), 1000)
    }

    this.postInit = function() {
        window._support = false

        if (!this.isValid()) {
            return
        }

        setInterval(() => {
            if (!window._ktnpause) {
                this.updateTimer()
            }
        }, 1000)

        this.channelUpdate()
    }
}

var tracker = new PointTracker()

function messageHandler(request, sender, sendResponse) {
    if (request.message === "tab_change") {
        console.log("Url Changed:",request.url)
        tracker.channelUpdate()
    } else if (request.message === "action") {
        console.log("Force Update:",request.url)
        tracker.forceUpdate()
    }
}

function onload() {
    chrome.runtime.onMessage.addListener(messageHandler)
    setTimeout(() => tracker.preInit(), 0)
}

setTimeout(onload, 0)